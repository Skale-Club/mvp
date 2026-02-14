CREATE TABLE IF NOT EXISTS "gallery_images" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text DEFAULT '' NOT NULL,
  "alt_text" text DEFAULT '' NOT NULL,
  "description" text,
  "image_url" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "gallery_images_created_at_idx" ON "gallery_images" ("created_at" DESC);
