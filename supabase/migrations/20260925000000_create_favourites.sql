-- Favourite products per user.
-- Run in Supabase SQL Editor, or via `supabase db push` if using the CLI.

CREATE TABLE favourites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage their own favourites"
  ON favourites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
