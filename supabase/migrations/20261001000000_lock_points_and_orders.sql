-- Security hardening:
--   1. Customers can no longer change their own loyalty points (or card
--      number / email) — only full_name and phone are client-editable.
--   2. Orders are read-only once placed: no client UPDATE or DELETE.
--   3. place_order() runs as its owner so it can still award points, and
--      scopes every statement to auth.uid() explicitly.

-- 1) users ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users own data" ON users;
DROP POLICY IF EXISTS "users can view their own profile" ON users;
DROP POLICY IF EXISTS "users can insert their own profile" ON users;
DROP POLICY IF EXISTS "users can update their own profile" ON users;

CREATE POLICY "Users read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile only" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS limits which rows; column privileges limit which fields. Without this,
-- the UPDATE policy above would still allow editing loyalty_points.
REVOKE INSERT, UPDATE, DELETE ON users FROM anon, authenticated;
GRANT UPDATE (full_name, phone) ON users TO authenticated;
-- Profiles are created by the handle_new_user() trigger, not the client.

-- 2) orders --------------------------------------------------------------
DROP POLICY IF EXISTS "Users own orders" ON orders;
DROP POLICY IF EXISTS "users can view their own orders" ON orders;
DROP POLICY IF EXISTS "users can create their own orders" ON orders;

CREATE POLICY "Users insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- No UPDATE/DELETE policies: placed orders can't be altered by the client.
REVOKE UPDATE, DELETE ON orders FROM anon, authenticated;
REVOKE UPDATE, DELETE ON order_items FROM anon, authenticated;

-- 3) place_order runs as owner so it can update loyalty_points -----------
ALTER FUNCTION place_order(TEXT, TEXT, JSONB) SECURITY DEFINER;
ALTER FUNCTION place_order(TEXT, TEXT, JSONB) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION place_order(TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION place_order(TEXT, TEXT, JSONB) TO authenticated;
