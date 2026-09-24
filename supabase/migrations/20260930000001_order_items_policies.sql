-- The live order_items table had RLS enabled but no policies (the initial
-- schema was created outside the migration history), so every insert was
-- denied. Recreate the intended policies idempotently.

DROP POLICY IF EXISTS "users can view items of their own orders" ON order_items;
CREATE POLICY "users can view items of their own orders"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users can add items to their own orders" ON order_items;
CREATE POLICY "users can add items to their own orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
