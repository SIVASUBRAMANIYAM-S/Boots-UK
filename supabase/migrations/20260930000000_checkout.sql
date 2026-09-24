-- Checkout: richer order records plus a single place_order() function so an
-- order is created atomically (order + items + loyalty points + cart clear
-- either all happen or none do) and prices/points are computed server-side
-- from the products table rather than trusted from the client.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_method TEXT,
  ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_earned INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Keep these rules in sync with src/constants/checkout.ts.
CREATE OR REPLACE FUNCTION place_order(
  p_delivery_method TEXT,
  p_promo_code TEXT,
  p_shipping_address JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_subtotal NUMERIC;
  v_item_count INT;
  v_discount NUMERIC := 0;
  v_delivery_fee NUMERIC;
  v_total NUMERIC;
  v_points INT;
  v_new_points INT;
  v_order_id UUID;
  v_order_number TEXT;
  v_promo TEXT := UPPER(TRIM(COALESCE(p_promo_code, '')));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF p_delivery_method NOT IN ('standard', 'express') THEN
    RAISE EXCEPTION 'Invalid delivery method';
  END IF;

  SELECT COALESCE(SUM(p.price * c.quantity), 0), COALESCE(SUM(c.quantity), 0)
  INTO v_subtotal, v_item_count
  FROM cart c
  JOIN products p ON p.id = c.product_id
  WHERE c.user_id = v_user_id AND p.is_active AND c.quantity > 0;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Your basket is empty';
  END IF;

  IF v_promo = 'BOOTS10' THEN
    v_discount := ROUND(v_subtotal * 0.10, 2);
  ELSIF v_promo <> '' THEN
    RAISE EXCEPTION 'Invalid promo code';
  END IF;

  v_delivery_fee := CASE
    WHEN p_delivery_method = 'express' THEN 4.99
    WHEN v_subtotal >= 25 THEN 0
    ELSE 2.99
  END;

  v_total := v_subtotal - v_discount + v_delivery_fee;
  -- Points are earned on goods spend, not on delivery.
  v_points := FLOOR((v_subtotal - v_discount) * 4);

  -- RLS hides other users' orders, so retry on a (rare) order-number clash.
  LOOP
    v_order_number := 'BOOTS' || LPAD(FLOOR(RANDOM() * 1000000)::INT::TEXT, 6, '0');
    BEGIN
      INSERT INTO orders (
        user_id, total_amount, status, order_number, subtotal, discount_amount,
        delivery_method, delivery_fee, points_earned, shipping_address
      )
      VALUES (
        v_user_id, v_total, 'confirmed', v_order_number, v_subtotal, v_discount,
        p_delivery_method, v_delivery_fee, v_points, p_shipping_address
      )
      RETURNING id INTO v_order_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- try another number
    END;
  END LOOP;

  INSERT INTO order_items (order_id, product_id, quantity, price)
  SELECT v_order_id, c.product_id, c.quantity, p.price
  FROM cart c
  JOIN products p ON p.id = c.product_id
  WHERE c.user_id = v_user_id AND p.is_active AND c.quantity > 0;

  UPDATE users
  SET loyalty_points = COALESCE(loyalty_points, 0) + v_points
  WHERE id = v_user_id
  RETURNING loyalty_points INTO v_new_points;

  DELETE FROM cart WHERE user_id = v_user_id;

  RETURN json_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'delivery_fee', v_delivery_fee,
    'total', v_total,
    'item_count', v_item_count,
    'points_earned', v_points,
    'loyalty_points', COALESCE(v_new_points, v_points)
  );
END;
$$;

REVOKE ALL ON FUNCTION place_order(TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION place_order(TEXT, TEXT, JSONB) TO authenticated;
