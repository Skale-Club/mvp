CREATE TABLE IF NOT EXISTS "service_posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "service_id" integer NOT NULL UNIQUE REFERENCES "services"("id"),
  "title" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "content" text DEFAULT '' NOT NULL,
  "excerpt" text,
  "meta_description" text,
  "focus_keyword" text,
  "feature_image_url" text,
  "status" text DEFAULT 'published' NOT NULL,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "service_posts_status_idx" ON "service_posts" ("status");
CREATE INDEX IF NOT EXISTS "service_posts_published_at_idx" ON "service_posts" ("published_at" DESC);
