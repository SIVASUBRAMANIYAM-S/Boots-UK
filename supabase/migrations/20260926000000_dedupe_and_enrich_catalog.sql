-- Cleans up duplicate categories/products created by re-running seed.sql,
-- backfills image_url on the catalog, and adds a few more products per
-- category so the Shop tab isn't only two items deep.
-- Run in the Supabase SQL Editor (categories/products are read-only to the
-- client, so this can't be applied from the app itself).

-- 1) Categories: keep the earliest row per name, repoint any products that
-- pointed at a duplicate, then remove the duplicates.
UPDATE products p
SET category_id = ranked.canonical_id
FROM (
  SELECT
    id,
    FIRST_VALUE(id) OVER (PARTITION BY name ORDER BY created_at, id) AS canonical_id
  FROM categories
) ranked
WHERE p.category_id = ranked.id
  AND ranked.id <> ranked.canonical_id;

DELETE FROM categories c
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at, id) AS rn
  FROM categories
) ranked
WHERE c.id = ranked.id AND ranked.rn > 1;

-- 2) Products: same idea, keyed on name + price. Repoint cart/order_items
-- rows before deleting the duplicate product rows.
UPDATE cart ca
SET product_id = ranked.canonical_id
FROM (
  SELECT
    id,
    FIRST_VALUE(id) OVER (PARTITION BY name, price ORDER BY created_at, id) AS canonical_id
  FROM products
) ranked
WHERE ca.product_id = ranked.id
  AND ranked.id <> ranked.canonical_id;

UPDATE order_items oi
SET product_id = ranked.canonical_id
FROM (
  SELECT
    id,
    FIRST_VALUE(id) OVER (PARTITION BY name, price ORDER BY created_at, id) AS canonical_id
  FROM products
) ranked
WHERE oi.product_id = ranked.id
  AND ranked.id <> ranked.canonical_id;

DELETE FROM products p
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY name, price ORDER BY created_at, id) AS rn
  FROM products
) ranked
WHERE p.id = ranked.id AND ranked.rn > 1;

-- 3) Backfill category images.
UPDATE categories SET image_url = 'https://placehold.co/800x400/e8f4fd/005eb8.png?text=Health+%26+Wellness' WHERE name = 'Health & Wellness';
UPDATE categories SET image_url = 'https://placehold.co/800x400/e8f4fd/005eb8.png?text=Beauty+%26+Skincare' WHERE name = 'Beauty & Skincare';
UPDATE categories SET image_url = 'https://placehold.co/800x400/e8f4fd/005eb8.png?text=Baby+%26+Parenting' WHERE name = 'Baby & Parenting';

-- 4) Backfill images for the original 6 products.
UPDATE products SET image_url = 'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Vitamin+C+1000mg' WHERE name = 'Vitamin C 1000mg';
UPDATE products SET image_url = 'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Omega+3+Fish+Oil' WHERE name = 'Omega 3 Fish Oil';
UPDATE products SET image_url = 'https://placehold.co/400x400/e8f4fd/005eb8.png?text=No7+Radiance+Serum' WHERE name = 'No7 Radiance Serum';
UPDATE products SET image_url = 'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Soap+%26+Glory+Lotion' WHERE name = 'Soap & Glory Body Lotion';
UPDATE products SET image_url = 'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Boots+Baby+Shampoo' WHERE name = 'Boots Baby Shampoo';
UPDATE products SET image_url = 'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Pampers+Nappies' WHERE name = 'Pampers Nappies Size 3';

-- 5) A few more products per category (with images) so the Shop tab has a
-- realistic amount of stock. Guarded with NOT EXISTS so this migration can
-- be re-run safely.
INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Multivitamin Gummies', 'Daily multivitamin gummies for adults', 9.99, id, 90,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Multivitamin+Gummies'
FROM categories WHERE name = 'Health & Wellness'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Multivitamin Gummies');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Paracetamol 500mg (24 Tablets)', 'Pain and fever relief', 2.49, id, 300,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Paracetamol+500mg'
FROM categories WHERE name = 'Health & Wellness'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Paracetamol 500mg (24 Tablets)');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Electrolyte Rehydration Sachets', 'Fast rehydration, orange flavour', 5.99, id, 60,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Rehydration+Sachets'
FROM categories WHERE name = 'Health & Wellness'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Electrolyte Rehydration Sachets');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'No7 Hydrating Day Cream', 'Lightweight daily moisturiser with SPF15', 18.99, id, 70,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=No7+Day+Cream'
FROM categories WHERE name = 'Beauty & Skincare'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'No7 Hydrating Day Cream');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Nivea Micellar Water', 'Gentle makeup remover, all skin types', 6.49, id, 110,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Micellar+Water'
FROM categories WHERE name = 'Beauty & Skincare'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Nivea Micellar Water');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Maybelline Lash Sensational Mascara', 'Volumising and lengthening mascara', 8.99, id, 85,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Mascara'
FROM categories WHERE name = 'Beauty & Skincare'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Maybelline Lash Sensational Mascara');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Johnson''s Baby Wipes (Pack of 4)', '4 x 56 gentle cleansing wipes', 7.49, id, 200,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Baby+Wipes'
FROM categories WHERE name = 'Baby & Parenting'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Johnson''s Baby Wipes (Pack of 4)');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Tommee Tippee Baby Bottle 260ml', 'Anti-colic baby feeding bottle', 11.99, id, 140,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Baby+Bottle'
FROM categories WHERE name = 'Baby & Parenting'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Tommee Tippee Baby Bottle 260ml');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'SMA Pro First Infant Milk 800g', 'From birth infant formula milk', 13.49, id, 65,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Infant+Milk'
FROM categories WHERE name = 'Baby & Parenting'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'SMA Pro First Infant Milk 800g');
