-- Sample catalog data. Run in Supabase SQL Editor, or via `supabase db reset`
-- if using the CLI (seed.sql is applied automatically after migrations).

INSERT INTO categories (name) VALUES
  ('Health & Wellness'),
  ('Beauty & Skincare'),
  ('Baby & Parenting');

-- Health & Wellness
INSERT INTO products (name, description, price, category_id, stock_quantity)
SELECT 'Vitamin C 1000mg', 'Immune support supplement', 8.99, id, 100
FROM categories WHERE name = 'Health & Wellness';

INSERT INTO products (name, description, price, category_id, stock_quantity)
SELECT 'Omega 3 Fish Oil', 'Heart health supplement', 12.49, id, 80
FROM categories WHERE name = 'Health & Wellness';

-- Beauty & Skincare
INSERT INTO products (name, description, price, category_id, stock_quantity)
SELECT 'No7 Radiance Serum', 'Anti-aging face serum', 24.99, id, 50
FROM categories WHERE name = 'Beauty & Skincare';

INSERT INTO products (name, description, price, category_id, stock_quantity)
SELECT 'Soap & Glory Body Lotion', 'Moisturising body lotion', 9.99, id, 120
FROM categories WHERE name = 'Beauty & Skincare';

-- Baby & Parenting
INSERT INTO products (name, description, price, category_id, stock_quantity)
SELECT 'Boots Baby Shampoo', 'Gentle baby shampoo', 4.99, id, 200
FROM categories WHERE name = 'Baby & Parenting';

INSERT INTO products (name, description, price, category_id, stock_quantity)
SELECT 'Pampers Nappies Size 3', 'Soft and dry nappies', 14.99, id, 150
FROM categories WHERE name = 'Baby & Parenting';
