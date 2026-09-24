-- Replaces the plain placehold.co text-box images with real, attractive
-- product photography (free-to-use Unsplash License photos, one per
-- category, cropped differently for banners vs. product cards).

-- Category banners (800x400).
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1631980838568-8859e153f037?w=800&h=400&fit=crop&q=80' WHERE name = 'Health & Wellness';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1697273245326-1a3736f6f428?w=800&h=400&fit=crop&q=80' WHERE name = 'Vitamins & Supplements';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1760862652442-e8ff7ebdd2f8?w=800&h=400&fit=crop&q=80' WHERE name = 'Skincare';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1625093742435-6fa192b6fb10?w=800&h=400&fit=crop&q=80' WHERE name = 'Makeup';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1716972065448-e08a46809530?w=800&h=400&fit=crop&q=80' WHERE name = 'Baby & Child';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1603990103103-baf3ada7af1c?w=800&h=400&fit=crop&q=80' WHERE name = 'Toiletries';
UPDATE categories SET image_url = 'https://images.unsplash.com/photo-1564644411635-5ec7c9aca726?w=800&h=400&fit=crop&q=80' WHERE name = 'Fragrance';

-- Product cards (400x400) — matched to the product's category photo.
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1631980838568-8859e153f037?w=400&h=400&fit=crop&q=80'
WHERE category_id = (SELECT id FROM categories WHERE name = 'Health & Wellness');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1697273245326-1a3736f6f428?w=400&h=400&fit=crop&q=80'
WHERE category_id = (SELECT id FROM categories WHERE name = 'Vitamins & Supplements');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1760862652442-e8ff7ebdd2f8?w=400&h=400&fit=crop&q=80'
WHERE category_id = (SELECT id FROM categories WHERE name = 'Skincare');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1625093742435-6fa192b6fb10?w=400&h=400&fit=crop&q=80'
WHERE category_id = (SELECT id FROM categories WHERE name = 'Makeup');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1716972065448-e08a46809530?w=400&h=400&fit=crop&q=80'
WHERE category_id = (SELECT id FROM categories WHERE name = 'Baby & Child');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1603990103103-baf3ada7af1c?w=400&h=400&fit=crop&q=80'
WHERE category_id = (SELECT id FROM categories WHERE name = 'Toiletries');

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1564644411635-5ec7c9aca726?w=400&h=400&fit=crop&q=80'
WHERE category_id = (SELECT id FROM categories WHERE name = 'Fragrance');
