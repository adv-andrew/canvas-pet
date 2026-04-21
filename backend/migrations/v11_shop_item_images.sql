-- v11: Set image_url for shop items that have images available
UPDATE shop_items SET image_url = '/shop/halo.png'      WHERE name = 'Halo'      AND image_url IS NULL;
UPDATE shop_items SET image_url = '/shop/mustache.png'  WHERE name = 'Mustache'  AND image_url IS NULL;
