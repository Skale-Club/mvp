-- Add hero_background_image_url column to company_settings table
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS hero_background_image_url TEXT DEFAULT '';

-- Add comment to the column
COMMENT ON COLUMN company_settings.hero_background_image_url IS 'URL for the hero section background image';
