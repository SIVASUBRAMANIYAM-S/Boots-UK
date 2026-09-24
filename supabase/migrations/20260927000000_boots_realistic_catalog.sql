-- Replaces the 3 generic placeholder categories with Boots UK's real shop
-- structure (Health & Wellness, Vitamins & Supplements, Skincare, Makeup,
-- Baby & Child, Toiletries, Fragrance), re-homes existing products into the
-- category they actually belong to, and adds real Boots-stocked brands so
-- each category has a realistic range. Guarded with NOT EXISTS throughout so
-- this migration can be re-run safely.

-- 1) Rename Baby & Parenting -> Baby & Child (matches boots.com nav).
UPDATE categories SET name = 'Baby & Child', image_url = 'https://placehold.co/800x400/e8f4fd/005eb8.png?text=Baby+%26+Child'
WHERE name = 'Baby & Parenting';

-- 2) New categories.
INSERT INTO categories (name, image_url)
SELECT 'Vitamins & Supplements', 'https://placehold.co/800x400/e8f4fd/005eb8.png?text=Vitamins+%26+Supplements'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Vitamins & Supplements');

INSERT INTO categories (name, image_url)
SELECT 'Skincare', 'https://placehold.co/800x400/e8f4fd/005eb8.png?text=Skincare'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Skincare');

INSERT INTO categories (name, image_url)
SELECT 'Makeup', 'https://placehold.co/800x400/e8f4fd/005eb8.png?text=Makeup'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Makeup');

INSERT INTO categories (name, image_url)
SELECT 'Toiletries', 'https://placehold.co/800x400/e8f4fd/005eb8.png?text=Toiletries'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Toiletries');

INSERT INTO categories (name, image_url)
SELECT 'Fragrance', 'https://placehold.co/800x400/e8f4fd/005eb8.png?text=Fragrance'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Fragrance');

-- Retire the old "Beauty & Skincare" label now that Skincare/Makeup exist —
-- its products are re-homed below before this rename, so nothing is orphaned.
UPDATE categories SET name = 'Skincare temp-merge-marker' WHERE name = 'Beauty & Skincare';

-- 3) Re-home existing products into their real category.
UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Vitamins & Supplements')
WHERE name IN ('Vitamin C 1000mg', 'Omega 3 Fish Oil', 'Multivitamin Gummies');

UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Skincare')
WHERE name IN ('No7 Radiance Serum', 'No7 Hydrating Day Cream', 'Nivea Micellar Water');

UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Makeup')
WHERE name = 'Maybelline Lash Sensational Mascara';

UPDATE products SET category_id = (SELECT id FROM categories WHERE name = 'Toiletries')
WHERE name = 'Soap & Glory Body Lotion';

-- Now safe to drop the merged-out placeholder category.
DELETE FROM categories WHERE name = 'Skincare temp-merge-marker';

-- 4) Fill out Makeup with more real Boots-stocked brands.
INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'L''Oreal Paris True Match Foundation', 'Liquid foundation, matches skin tone and texture', 11.99, id, 90,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=True+Match+Foundation'
FROM categories WHERE name = 'Makeup'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'L''Oreal Paris True Match Foundation');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Rimmel London Lasting Finish Lipstick', 'Long-lasting matte lipstick', 6.99, id, 130,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Lasting+Finish+Lipstick'
FROM categories WHERE name = 'Makeup'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Rimmel London Lasting Finish Lipstick');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Revolution Pro Eyeshadow Palette', '12-shade everyday eyeshadow palette', 13.00, id, 70,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Eyeshadow+Palette'
FROM categories WHERE name = 'Makeup'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Revolution Pro Eyeshadow Palette');

-- 5) Fill out Toiletries.
INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Original Source Mint & Tea Tree Shower Gel', 'Refreshing shower gel, 250ml', 2.50, id, 200,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Mint+%26+Tea+Tree'
FROM categories WHERE name = 'Toiletries'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Original Source Mint & Tea Tree Shower Gel');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Colgate Total Toothpaste 100ml', 'Whole mouth health toothpaste', 3.29, id, 250,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Colgate+Total'
FROM categories WHERE name = 'Toiletries'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Colgate Total Toothpaste 100ml');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Dove Original Soap Bar (Pack of 6)', 'Moisturising cream soap bars', 4.50, id, 180,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Dove+Soap+Bar'
FROM categories WHERE name = 'Toiletries'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Dove Original Soap Bar (Pack of 6)');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Sure Women 48hr Anti-Perspirant', 'Non-irritant deodorant spray, 150ml', 2.99, id, 220,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Sure+Anti-Perspirant'
FROM categories WHERE name = 'Toiletries'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Sure Women 48hr Anti-Perspirant');

-- 6) Fill out Fragrance.
INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Hugo Boss Bottled EDT 50ml', 'Classic woody aromatic fragrance for him', 42.00, id, 40,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Hugo+Boss+Bottled'
FROM categories WHERE name = 'Fragrance'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Hugo Boss Bottled EDT 50ml');

INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Britney Spears Fantasy EDP 50ml', 'Fruity floral fragrance for her', 24.50, id, 45,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Fantasy+EDP'
FROM categories WHERE name = 'Fragrance'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Britney Spears Fantasy EDP 50ml');

-- 7) Health & Wellness keeps its pharmacy-style essentials; add one more.
INSERT INTO products (name, description, price, category_id, stock_quantity, image_url)
SELECT 'Nurofen Pain Relief Tablets 256mg (16 Caps)', 'Ibuprofen capsules for fast pain relief', 3.99, id, 260,
  'https://placehold.co/400x400/e8f4fd/005eb8.png?text=Nurofen+256mg'
FROM categories WHERE name = 'Health & Wellness'
AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Nurofen Pain Relief Tablets 256mg (16 Caps)');
