-- Migration: Remove booking services and merge with service_posts
-- Run this SQL to migrate the database

-- 1. Add order column to service_posts if it doesn't exist
ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

-- 2. Copy order from services to service_posts (if services table exists)
UPDATE service_posts sp
SET "order" = COALESCE(s."order", 0)
FROM services s
WHERE sp.service_id = s.id;

-- 3. Drop the service_id foreign key constraint and column from service_posts
ALTER TABLE service_posts DROP CONSTRAINT IF EXISTS service_posts_service_id_fkey;
ALTER TABLE service_posts DROP COLUMN IF EXISTS service_id;

-- 4. Drop the blog_post_services table (junction table)
DROP TABLE IF EXISTS blog_post_services;

-- 5. Drop the services table
DROP TABLE IF EXISTS services;

-- 6. Drop the categories table
DROP TABLE IF EXISTS categories;

-- 7. Drop the subcategories table if it exists
DROP TABLE IF EXISTS subcategories;