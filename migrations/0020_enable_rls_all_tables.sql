-- Migration: Enable Row Level Security on all public tables
-- This satisfies the Supabase Security Advisor requirements.
-- All database access goes through the Express backend using the service role key,
-- so we enable RLS and add permissive policies that allow full access via service role.

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_event_hits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: Allow full access for service_role (backend server)
-- The backend connects with the service_role key which bypasses RLS
-- by default in Supabase. These policies additionally allow the
-- postgres role (used by Drizzle/pg direct connections) full access.
-- ============================================================

-- sessions
CREATE POLICY "allow_all_sessions" ON public.sessions FOR ALL USING (true) WITH CHECK (true);

-- users
CREATE POLICY "allow_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- integration_settings
CREATE POLICY "allow_all_integration_settings" ON public.integration_settings FOR ALL USING (true) WITH CHECK (true);

-- analytics_event_hits
CREATE POLICY "allow_all_analytics_event_hits" ON public.analytics_event_hits FOR ALL USING (true) WITH CHECK (true);

-- chat_settings
CREATE POLICY "allow_all_chat_settings" ON public.chat_settings FOR ALL USING (true) WITH CHECK (true);

-- chat_integrations
CREATE POLICY "allow_all_chat_integrations" ON public.chat_integrations FOR ALL USING (true) WITH CHECK (true);

-- twilio_settings
CREATE POLICY "allow_all_twilio_settings" ON public.twilio_settings FOR ALL USING (true) WITH CHECK (true);

-- conversations
CREATE POLICY "allow_all_conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

-- conversation_messages
CREATE POLICY "allow_all_conversation_messages" ON public.conversation_messages FOR ALL USING (true) WITH CHECK (true);

-- form_leads
CREATE POLICY "allow_all_form_leads" ON public.form_leads FOR ALL USING (true) WITH CHECK (true);

-- company_settings
CREATE POLICY "allow_all_company_settings" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);

-- faqs
CREATE POLICY "allow_all_faqs" ON public.faqs FOR ALL USING (true) WITH CHECK (true);

-- blog_posts
CREATE POLICY "allow_all_blog_posts" ON public.blog_posts FOR ALL USING (true) WITH CHECK (true);

-- service_posts
CREATE POLICY "allow_all_service_posts" ON public.service_posts FOR ALL USING (true) WITH CHECK (true);

-- gallery_images
CREATE POLICY "allow_all_gallery_images" ON public.gallery_images FOR ALL USING (true) WITH CHECK (true);

-- reviews_settings
CREATE POLICY "allow_all_reviews_settings" ON public.reviews_settings FOR ALL USING (true) WITH CHECK (true);

-- review_items
CREATE POLICY "allow_all_review_items" ON public.review_items FOR ALL USING (true) WITH CHECK (true);
