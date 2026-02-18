BEGIN;

CREATE TABLE IF NOT EXISTS reviews_settings (
  id serial PRIMARY KEY,
  section_title text NOT NULL DEFAULT '',
  section_subtitle text NOT NULL DEFAULT '',
  display_mode text NOT NULL DEFAULT 'auto',
  widget_enabled boolean NOT NULL DEFAULT false,
  widget_embed_url text NOT NULL DEFAULT '',
  fallback_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_items (
  id serial PRIMARY KEY,
  sort_order integer NOT NULL DEFAULT 0,
  author_name text NOT NULL,
  author_meta text NOT NULL DEFAULT '',
  content text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  source_label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

ALTER TABLE review_items
  DROP CONSTRAINT IF EXISTS review_items_rating_range;
ALTER TABLE review_items
  ADD CONSTRAINT review_items_rating_range CHECK (rating >= 1 AND rating <= 5);

CREATE INDEX IF NOT EXISTS review_items_sort_order_idx
  ON review_items (sort_order ASC, created_at DESC);

INSERT INTO reviews_settings (
  section_title,
  section_subtitle,
  display_mode,
  widget_enabled,
  widget_embed_url,
  fallback_enabled,
  updated_at
)
SELECT
  COALESCE(NULLIF(TRIM(company_settings.homepage_content->'reviewsSection'->>'title'), ''), '') AS section_title,
  COALESCE(NULLIF(TRIM(company_settings.homepage_content->'reviewsSection'->>'subtitle'), ''), '') AS section_subtitle,
  'auto' AS display_mode,
  CASE
    WHEN COALESCE(TRIM(company_settings.homepage_content->'reviewsSection'->>'embedUrl'), '') <> '' THEN true
    ELSE false
  END AS widget_enabled,
  COALESCE(TRIM(company_settings.homepage_content->'reviewsSection'->>'embedUrl'), '') AS widget_embed_url,
  true AS fallback_enabled,
  now() AS updated_at
FROM company_settings
WHERE NOT EXISTS (SELECT 1 FROM reviews_settings)
ORDER BY company_settings.id
LIMIT 1;

INSERT INTO reviews_settings (section_title, section_subtitle, display_mode, widget_enabled, widget_embed_url, fallback_enabled, updated_at)
SELECT '', '', 'auto', false, '', true, now()
WHERE NOT EXISTS (SELECT 1 FROM reviews_settings);

COMMIT;
