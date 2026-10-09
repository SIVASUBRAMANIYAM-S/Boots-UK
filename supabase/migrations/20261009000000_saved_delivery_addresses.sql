-- Apply through the normal approved deployment process; no existing orders change.
BEGIN;

CREATE TABLE public.delivery_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipping_address JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT delivery_address_shape CHECK (COALESCE(
    jsonb_typeof(shipping_address) = 'object'
    AND shipping_address - ARRAY['fullName', 'line1', 'line2', 'city', 'postcode', 'phone']::TEXT[] = '{}'::JSONB
    AND jsonb_typeof(shipping_address->'fullName') = 'string'
    AND jsonb_typeof(shipping_address->'line1') = 'string'
    AND jsonb_typeof(shipping_address->'line2') = 'string'
    AND jsonb_typeof(shipping_address->'city') = 'string'
    AND jsonb_typeof(shipping_address->'postcode') = 'string'
    AND jsonb_typeof(shipping_address->'phone') = 'string'
    AND length(btrim(shipping_address->>'fullName')) BETWEEN 1 AND 120
    AND length(btrim(shipping_address->>'line1')) BETWEEN 1 AND 160
    AND length(shipping_address->>'line2') <= 160
    AND length(btrim(shipping_address->>'city')) BETWEEN 1 AND 100
    AND length(shipping_address->>'postcode') <= 8
    AND shipping_address->>'postcode' ~ '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$'
    AND length(shipping_address->>'phone') <= 16
    AND shipping_address->>'phone' ~ '^(\+44|0)[0-9]{9,10}$',
    false
  )),
  CONSTRAINT delivery_addresses_owner_address_key UNIQUE (user_id, shipping_address)
);

CREATE UNIQUE INDEX delivery_addresses_one_default_per_owner
  ON public.delivery_addresses(user_id) WHERE is_default;
CREATE INDEX delivery_addresses_owner_created
  ON public.delivery_addresses(user_id, created_at, id);

ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read saved delivery addresses" ON public.delivery_addresses
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
-- Writes are exclusively through narrowly scoped RPCs, never arbitrary table updates.
REVOKE ALL ON TABLE public.delivery_addresses FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.delivery_addresses TO authenticated;

CREATE FUNCTION public.save_delivery_address(
  p_shipping_address JSONB,
  p_make_default BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_address JSONB;
  v_postcode TEXT;
  v_row public.delivery_addresses;
  v_first BOOLEAN;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to save delivery addresses' USING ERRCODE = '42501';
  END IF;
  IF p_shipping_address IS NULL
    OR jsonb_typeof(p_shipping_address) IS DISTINCT FROM 'object'
    OR EXISTS (
      SELECT 1 FROM unnest(ARRAY['fullName', 'line1', 'line2', 'city', 'postcode', 'phone']) AS fields(name)
      WHERE jsonb_typeof(p_shipping_address->fields.name) IS DISTINCT FROM 'string'
    ) THEN
    RAISE EXCEPTION 'Invalid delivery address' USING ERRCODE = '22023';
  END IF;

  v_postcode := upper(regexp_replace(btrim(p_shipping_address->>'postcode'), '\s', '', 'g'));
  v_postcode := left(v_postcode, greatest(length(v_postcode) - 3, 0)) || ' ' || right(v_postcode, 3);
  v_address := jsonb_build_object(
    'fullName', btrim(p_shipping_address->>'fullName'),
    'line1', btrim(p_shipping_address->>'line1'),
    'line2', btrim(p_shipping_address->>'line2'),
    'city', btrim(p_shipping_address->>'city'),
    'postcode', v_postcode,
    'phone', regexp_replace(p_shipping_address->>'phone', '[\s()\-]', '', 'g')
  );

  -- The same per-account transaction lock is used by both write RPCs.
  -- This serializes first saves and default changes, including concurrent devices.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::TEXT, 0));
  SELECT NOT EXISTS (SELECT 1 FROM public.delivery_addresses WHERE user_id = v_user) INTO v_first;
  INSERT INTO public.delivery_addresses(user_id, shipping_address)
    VALUES (v_user, v_address)
    ON CONFLICT (user_id, shipping_address) DO NOTHING;
  SELECT * INTO STRICT v_row FROM public.delivery_addresses
    WHERE user_id = v_user AND shipping_address = v_address;

  IF COALESCE(p_make_default, false) OR v_first THEN
    UPDATE public.delivery_addresses SET is_default = false
      WHERE user_id = v_user AND is_default AND id <> v_row.id;
    UPDATE public.delivery_addresses SET is_default = true
      WHERE user_id = v_user AND id = v_row.id
      RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE FUNCTION public.set_default_delivery_address(p_address_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_row public.delivery_addresses;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to update delivery addresses' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::TEXT, 0));
  SELECT * INTO v_row FROM public.delivery_addresses
    WHERE id = p_address_id AND user_id = v_user;
  IF NOT FOUND THEN
    -- Identical response for absent and another account's IDs.
    RAISE EXCEPTION 'Delivery address not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.delivery_addresses SET is_default = false
    WHERE user_id = v_user AND is_default AND id <> p_address_id;
  UPDATE public.delivery_addresses SET is_default = true
    WHERE user_id = v_user AND id = p_address_id
    RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.save_delivery_address(JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_default_delivery_address(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_delivery_address(JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_default_delivery_address(UUID) TO authenticated;

COMMIT;
