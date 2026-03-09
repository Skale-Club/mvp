-- Migration: Add missing indexes and fix form_leads.conversation_id type
-- This migration adds performance indexes and fixes the conversation_id foreign key

-- 1. Fix form_leads.conversation_id: change from text to uuid with FK reference
-- First, drop existing index on the column
DROP INDEX IF EXISTS "form_leads_conversation_idx";

-- Alter column type from text to uuid (cast existing values)
ALTER TABLE "form_leads" 
  ALTER COLUMN "conversation_id" TYPE uuid USING "conversation_id"::uuid;

-- Add foreign key constraint
ALTER TABLE "form_leads" 
  ADD CONSTRAINT "form_leads_conversation_id_conversations_id_fk" 
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id");

-- Re-create index on conversation_id
CREATE INDEX IF NOT EXISTS "form_leads_conversation_idx" ON "form_leads" ("conversation_id");

-- 2. Add cascade delete to conversation_messages (drop and re-add FK)
ALTER TABLE "conversation_messages" 
  DROP CONSTRAINT IF EXISTS "conversation_messages_conversation_id_conversations_id_fk";
ALTER TABLE "conversation_messages" 
  ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" 
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE;

-- 3. Add missing indexes on conversations
CREATE INDEX IF NOT EXISTS "conversations_status_idx" ON "conversations" ("status");
CREATE INDEX IF NOT EXISTS "conversations_created_at_idx" ON "conversations" ("created_at");

-- 4. Add missing index on conversation_messages (may already exist from migration 0001)
CREATE INDEX IF NOT EXISTS "idx_conversation_messages_conversation_id" ON "conversation_messages" ("conversation_id");

-- 5. Add missing indexes on blog_posts
CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts" ("status");
CREATE INDEX IF NOT EXISTS "blog_posts_published_at_idx" ON "blog_posts" ("published_at");
CREATE INDEX IF NOT EXISTS "blog_posts_slug_idx" ON "blog_posts" ("slug");

-- 6. Add missing indexes on service_posts
CREATE INDEX IF NOT EXISTS "service_posts_status_order_idx" ON "service_posts" ("status", "order");
CREATE INDEX IF NOT EXISTS "service_posts_slug_idx" ON "service_posts" ("slug");

-- 7. Add missing index on faqs
CREATE INDEX IF NOT EXISTS "faqs_order_idx" ON "faqs" ("order");
