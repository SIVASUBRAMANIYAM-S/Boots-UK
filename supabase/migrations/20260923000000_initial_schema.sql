-- Initial schema: categories, products, users, orders, order_items, cart
-- Run in Supabase SQL Editor, or via `supabase db push` if using the CLI.

CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  image_url TEXT,
  category_id UUID REFERENCES categories(id),
  stock_quantity INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  advantage_card_number TEXT UNIQUE,
  loyalty_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'GBP',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INT,
  price DECIMAL(10,2)
);

CREATE TABLE cart (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
-- The app uses the public anon key (EXPO_PUBLIC_SUPABASE_ANON_KEY), so every
-- table must have RLS enabled with explicit policies — there is no other
-- access boundary between the client and the database.

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

-- categories: public catalog data, readable by anyone, writable by no one
-- from the client (manage via Supabase dashboard / service role instead).
CREATE POLICY "categories are publicly readable"
  ON categories FOR SELECT
  USING (true);

-- products: public catalog data, readable by anyone, writable by no one
-- from the client.
CREATE POLICY "products are publicly readable"
  ON products FOR SELECT
  USING (true);

-- users: a user may only see and edit their own profile row.
CREATE POLICY "users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- orders: a user may only see and create their own orders.
CREATE POLICY "users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can create their own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- order_items: visible/insertable only through an order the user owns.
CREATE POLICY "users can view items of their own orders"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "users can add items to their own orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- cart: a user may fully manage only their own cart rows.
CREATE POLICY "users can view their own cart"
  ON cart FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can add to their own cart"
  ON cart FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update their own cart"
  ON cart FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can delete from their own cart"
  ON cart FOR DELETE
  USING (auth.uid() = user_id);
