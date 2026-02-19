import { db, pool } from "./db.js";
import { DEFAULT_FORM_CONFIG, calculateFormScoresWithConfig, classifyLead } from "#shared/form.js";
import {
  formLeads,
  chatSettings,
  chatIntegrations,
  twilioSettings,
  conversations,
  conversationMessages,
  companySettings,
  faqs,
  integrationSettings,
  blogPosts,
  servicePosts,
  galleryImages,
  reviewsSettings,
  reviewItems,
  type CompanySettings,
  type ChatSettings,
  type ChatIntegrations,
  type TwilioSettings,
  type Conversation,
  type ConversationMessage,
  type FormLead,
  type FormConfig,
  type LeadStatus,
  type LeadClassification,
  type Faq,
  type IntegrationSettings,
  type BlogPost,
  type ServicePost,
  type GalleryImage,
  type InsertChatSettings,
  type InsertChatIntegrations,
  type InsertTwilioSettings,
  type InsertConversation,
  type InsertConversationMessage,
  type FormLeadProgressInput,
  type InsertFaq,
  type InsertIntegrationSettings,
  type InsertBlogPost,
  type InsertServicePost,
  type InsertGalleryImage,
  type ReviewsSettings,
  type ReviewItem,
  type InsertReviewsSettings,
  type InsertReviewItem,
} from "#shared/schema.js";
import { eq, and, or, ilike, gte, lte, lt, inArray, desc, asc, sql, ne } from "drizzle-orm";

// Ensure optional GHL columns exist even if migration hasn't been applied yet
let ensureGhlColumnsPromise: Promise<void> | null = null;
async function ensureFormLeadGhlColumns() {
  if (ensureGhlColumnsPromise) return ensureGhlColumnsPromise;
  ensureGhlColumnsPromise = pool
    .query(`
      ALTER TABLE form_leads ADD COLUMN IF NOT EXISTS ghl_contact_id text;
      ALTER TABLE form_leads ADD COLUMN IF NOT EXISTS ghl_sync_status text DEFAULT 'pending';
      DROP INDEX IF EXISTS form_leads_email_unique;
      DROP INDEX IF EXISTS quiz_leads_email_unique;
      CREATE INDEX IF NOT EXISTS form_leads_email_idx ON form_leads (email);
    `)
    .then(() => undefined)
    .catch((err) => {
      ensureGhlColumnsPromise = null;
      throw err;
    });
  return ensureGhlColumnsPromise;
}

// Ensure Twilio multi-recipient column exists to avoid runtime errors
let ensureTwilioColumnsPromise: Promise<void> | null = null;
async function ensureTwilioSchema() {
  if (ensureTwilioColumnsPromise) return ensureTwilioColumnsPromise;
  ensureTwilioColumnsPromise = pool
    .query(`
      ALTER TABLE twilio_settings ADD COLUMN IF NOT EXISTS to_phone_numbers jsonb DEFAULT '[]';
      UPDATE twilio_settings
      SET to_phone_numbers = CASE
        WHEN to_phone_number IS NOT NULL AND to_phone_number <> '' THEN jsonb_build_array(to_phone_number)
        ELSE '[]'::jsonb
      END
      WHERE to_phone_numbers IS NULL OR jsonb_typeof(to_phone_numbers) IS NULL;
    `)
    .then(() => undefined)
    .catch((err) => {
      ensureTwilioColumnsPromise = null;
      throw err;
    });
  return ensureTwilioColumnsPromise;
}

// Ensure gallery table exists to avoid runtime failures in fresh environments
let ensureGallerySchemaPromise: Promise<void> | null = null;
async function ensureGallerySchema() {
  if (ensureGallerySchemaPromise) return ensureGallerySchemaPromise;
  ensureGallerySchemaPromise = pool
    .query(`
      CREATE TABLE IF NOT EXISTS gallery_images (
        id serial PRIMARY KEY,
        sort_order integer NOT NULL DEFAULT 0,
        title text NOT NULL DEFAULT '',
        alt_text text NOT NULL DEFAULT '',
        description text,
        image_url text NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
      CREATE INDEX IF NOT EXISTS gallery_images_created_at_idx ON gallery_images (created_at DESC);
      CREATE INDEX IF NOT EXISTS gallery_images_sort_order_idx ON gallery_images (sort_order ASC, created_at DESC);
    `)
    .then(() => undefined)
    .catch((err) => {
      ensureGallerySchemaPromise = null;
      throw err;
    });
  return ensureGallerySchemaPromise;
}

// Ensure service posts table exists to avoid runtime failures in fresh environments
let ensureServicePostsSchemaPromise: Promise<void> | null = null;
async function ensureServicePostsSchema() {
  if (ensureServicePostsSchemaPromise) return ensureServicePostsSchemaPromise;
  ensureServicePostsSchemaPromise = pool
    .query(`
      CREATE TABLE IF NOT EXISTS service_posts (
        id serial PRIMARY KEY,
        title text NOT NULL,
        slug text NOT NULL UNIQUE,
        content text NOT NULL DEFAULT '',
        excerpt text,
        meta_description text,
        focus_keyword text,
        feature_image_url text,
        status text NOT NULL DEFAULT 'published',
        "order" integer NOT NULL DEFAULT 0,
        published_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';
      ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS excerpt text;
      ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS meta_description text;
      ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS focus_keyword text;
      ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS feature_image_url text;
      ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
      ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS "order" integer NOT NULL DEFAULT 0;
      ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS published_at timestamp;
      ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
      ALTER TABLE service_posts ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
      ALTER TABLE service_posts ALTER COLUMN content SET DEFAULT '';
      ALTER TABLE service_posts ALTER COLUMN status SET DEFAULT 'published';
      ALTER TABLE service_posts ALTER COLUMN "order" SET DEFAULT 0;
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'service_posts'
            AND column_name = 'service_id'
        ) THEN
          ALTER TABLE service_posts ALTER COLUMN service_id DROP NOT NULL;
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS service_posts_status_idx ON service_posts (status);
      CREATE INDEX IF NOT EXISTS service_posts_published_at_idx ON service_posts (published_at DESC);
    `)
    .then(() => undefined)
    .catch((err) => {
      ensureServicePostsSchemaPromise = null;
      throw err;
    });
  return ensureServicePostsSchemaPromise;
}

// Ensure company settings color columns exist for older databases
let ensureCompanySettingsSchemaPromise: Promise<void> | null = null;
async function ensureCompanySettingsSchema() {
  if (ensureCompanySettingsSchemaPromise) return ensureCompanySettingsSchemaPromise;
  ensureCompanySettingsSchemaPromise = pool
    .query(`
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website_primary_color text DEFAULT '#1C53A3';
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website_secondary_color text DEFAULT '#FFFF01';
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website_accent_color text DEFAULT '#FFFF01';
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website_background_color text DEFAULT '#FFFFFF';
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website_foreground_color text DEFAULT '#1D1D1D';
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website_nav_background_color text DEFAULT '#1C1E24';
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website_footer_background_color text DEFAULT '#18191F';
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website_cta_background_color text DEFAULT '#406EF1';
      ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS website_cta_hover_color text DEFAULT '#355CD0';
    `)
    .then(() => undefined)
    .catch((err) => {
      ensureCompanySettingsSchemaPromise = null;
      throw err;
    });
  return ensureCompanySettingsSchemaPromise;
}

// Ensure reviews module tables exist for environments without full migrations
let ensureReviewsSchemaPromise: Promise<void> | null = null;
async function ensureReviewsSchema() {
  if (ensureReviewsSchemaPromise) return ensureReviewsSchemaPromise;
  ensureReviewsSchemaPromise = pool
    .query(`
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
      ALTER TABLE reviews_settings ADD COLUMN IF NOT EXISTS section_title text NOT NULL DEFAULT '';
      ALTER TABLE reviews_settings ADD COLUMN IF NOT EXISTS section_subtitle text NOT NULL DEFAULT '';
      ALTER TABLE reviews_settings ADD COLUMN IF NOT EXISTS display_mode text NOT NULL DEFAULT 'auto';
      ALTER TABLE reviews_settings ADD COLUMN IF NOT EXISTS widget_enabled boolean NOT NULL DEFAULT false;
      ALTER TABLE reviews_settings ADD COLUMN IF NOT EXISTS widget_embed_url text NOT NULL DEFAULT '';
      ALTER TABLE reviews_settings ADD COLUMN IF NOT EXISTS fallback_enabled boolean NOT NULL DEFAULT true;
      ALTER TABLE reviews_settings ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
      ALTER TABLE review_items ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
      ALTER TABLE review_items ADD COLUMN IF NOT EXISTS author_name text NOT NULL DEFAULT '';
      ALTER TABLE review_items ADD COLUMN IF NOT EXISTS author_meta text NOT NULL DEFAULT '';
      ALTER TABLE review_items ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';
      ALTER TABLE review_items ADD COLUMN IF NOT EXISTS rating integer NOT NULL DEFAULT 5;
      ALTER TABLE review_items ADD COLUMN IF NOT EXISTS source_label text NOT NULL DEFAULT '';
      ALTER TABLE review_items ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
      ALTER TABLE review_items ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
      ALTER TABLE review_items ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();
      ALTER TABLE reviews_settings ALTER COLUMN section_title SET DEFAULT '';
      ALTER TABLE reviews_settings ALTER COLUMN section_subtitle SET DEFAULT '';
      ALTER TABLE review_items ALTER COLUMN source_label SET DEFAULT '';
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'review_items_rating_range'
        ) THEN
          ALTER TABLE review_items
            ADD CONSTRAINT review_items_rating_range CHECK (rating >= 1 AND rating <= 5);
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS review_items_sort_order_idx ON review_items (sort_order ASC, created_at DESC);
    `)
    .then(() => undefined)
    .catch((err) => {
      ensureReviewsSchemaPromise = null;
      throw err;
    });
  return ensureReviewsSchemaPromise;
}

export interface IStorage {
  // Company Settings
  getCompanySettings(): Promise<CompanySettings>;
  updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings>;
  
  // FAQs
  getFaqs(): Promise<Faq[]>;
  createFaq(faq: InsertFaq): Promise<Faq>;
  updateFaq(id: number, faq: Partial<InsertFaq>): Promise<Faq>;
  deleteFaq(id: number): Promise<void>;
  
  // Integration Settings
  getIntegrationSettings(provider: string): Promise<IntegrationSettings | undefined>;
  upsertIntegrationSettings(settings: InsertIntegrationSettings): Promise<IntegrationSettings>;
  
  // Chat
  getChatSettings(): Promise<ChatSettings>;
  updateChatSettings(settings: Partial<InsertChatSettings>): Promise<ChatSettings>;
  getChatIntegration(provider: string): Promise<ChatIntegrations | undefined>;
  upsertChatIntegration(settings: InsertChatIntegrations): Promise<ChatIntegrations>;

  // Twilio Integration
  getTwilioSettings(): Promise<TwilioSettings | undefined>;
  saveTwilioSettings(settings: InsertTwilioSettings): Promise<TwilioSettings>;

  listConversations(): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<void>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  addConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage>;
  getConversationMessages(conversationId: string): Promise<ConversationMessage[]>;
  
  // Leads
  upsertFormLeadProgress(progress: FormLeadProgressInput, metadata?: { userAgent?: string; conversationId?: string; source?: string }, formConfig?: FormConfig): Promise<FormLead>;
  getFormLeadBySession(sessionId: string): Promise<FormLead | undefined>;
  getFormLeadByConversationId(conversationId: string): Promise<FormLead | undefined>;
  listFormLeads(filters?: { status?: LeadStatus; classificacao?: LeadClassification; formCompleto?: boolean; completionStatus?: 'completo' | 'em_progresso' | 'abandonado'; search?: string }): Promise<FormLead[]>;
  updateFormLead(id: number, updates: Partial<Pick<FormLead, "status" | "observacoes" | "notificacaoEnviada" | "ghlContactId" | "ghlSyncStatus">>): Promise<FormLead | undefined>;
  getFormLeadByEmail(email: string): Promise<FormLead | undefined>;
  deleteFormLead(id: number): Promise<boolean>;
  
  // Blog Posts
  getBlogPosts(status?: string): Promise<BlogPost[]>;
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  getPublishedBlogPosts(limit?: number, offset?: number): Promise<BlogPost[]>;
  getRelatedBlogPosts(postId: number, limit?: number): Promise<BlogPost[]>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: number): Promise<void>;
  countPublishedBlogPosts(): Promise<number>;

  // Service Posts
  getServicePosts(status?: string): Promise<ServicePost[]>;
  getServicePost(id: number): Promise<ServicePost | undefined>;
  getServicePostBySlug(slug: string): Promise<ServicePost | undefined>;
  getPublishedServicePosts(limit?: number, offset?: number): Promise<ServicePost[]>;
  createServicePost(post: InsertServicePost): Promise<ServicePost>;
  updateServicePost(id: number, post: Partial<InsertServicePost>): Promise<ServicePost>;
  reorderServicePosts(postIds: number[]): Promise<void>;
  deleteServicePost(id: number): Promise<void>;

  // Gallery
  getGalleryImages(limit?: number): Promise<GalleryImage[]>;
  getGalleryImage(id: number): Promise<GalleryImage | undefined>;
  createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage>;
  updateGalleryImage(id: number, image: Partial<InsertGalleryImage>): Promise<GalleryImage>;
  reorderGalleryImages(imageIds: number[]): Promise<void>;
  deleteGalleryImage(id: number): Promise<void>;
  deleteAllGalleryImages(): Promise<number>;

  // Reviews
  getReviewsSettings(): Promise<ReviewsSettings>;
  upsertReviewsSettings(settings: Partial<InsertReviewsSettings>): Promise<ReviewsSettings>;
  getReviewItems(onlyActive?: boolean): Promise<ReviewItem[]>;
  createReviewItem(item: InsertReviewItem): Promise<ReviewItem>;
  updateReviewItem(id: number, item: Partial<InsertReviewItem>): Promise<ReviewItem>;
  reorderReviewItems(itemIds: number[]): Promise<void>;
  deleteReviewItem(id: number): Promise<void>;

}

export class DatabaseStorage implements IStorage {
  private chatSchemaEnsured = false;

  private async ensureChatSchema(): Promise<void> {
    if (this.chatSchemaEnsured) return;
    try {
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "agent_avatar_url" text DEFAULT ''`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "system_prompt" text DEFAULT 'You are our helpful chat assistant. Provide concise, friendly answers. Use the provided tools to fetch services and details. Do not guess prices; always use tool data when relevant. Guide visitors to complete the lead form when they are ready.'`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "intake_objectives" jsonb DEFAULT '[]'`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "avg_response_time" text DEFAULT ''`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "calendar_provider" text DEFAULT 'gohighlevel'`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "calendar_id" text DEFAULT ''`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "calendar_staff" jsonb DEFAULT '[]'`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "language_selector_enabled" boolean DEFAULT false`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "default_language" text DEFAULT 'en'`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "low_performance_sms_enabled" boolean DEFAULT false`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "low_performance_threshold_seconds" integer DEFAULT 300`);
      await db.execute(sql`ALTER TABLE "chat_settings" ADD COLUMN IF NOT EXISTS "use_faqs" boolean DEFAULT true`);
      this.chatSchemaEnsured = true;
    } catch (err) {
      console.error("ensureChatSchema error:", err);
      this.chatSchemaEnsured = false;
    }
  }

  async getCompanySettings(): Promise<CompanySettings> {
    await ensureCompanySettingsSchema();
    const [settings] = await db.select().from(companySettings);
    if (settings) return settings;
    
    // Create default settings if none exist
    const [newSettings] = await db.insert(companySettings).values({}).returning();
    return newSettings;
  }

  async updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    await ensureCompanySettingsSchema();
    const existing = await this.getCompanySettings();
    const [updated] = await db.update(companySettings).set(settings).where(eq(companySettings.id, existing.id)).returning();
    return updated;
  }

  async getFaqs(): Promise<Faq[]> {
    return await db.select().from(faqs).orderBy(faqs.order);
  }

  async createFaq(faq: InsertFaq): Promise<Faq> {
    const [newFaq] = await db.insert(faqs).values(faq).returning();
    return newFaq;
  }

  async updateFaq(id: number, faq: Partial<InsertFaq>): Promise<Faq> {
    const [updated] = await db.update(faqs).set(faq).where(eq(faqs.id, id)).returning();
    return updated;
  }

  async deleteFaq(id: number): Promise<void> {
    await db.delete(faqs).where(eq(faqs.id, id));
  }

  async getIntegrationSettings(provider: string): Promise<IntegrationSettings | undefined> {
    const [settings] = await db.select().from(integrationSettings).where(eq(integrationSettings.provider, provider));
    return settings;
  }

  async upsertIntegrationSettings(settings: InsertIntegrationSettings): Promise<IntegrationSettings> {
    const existing = await this.getIntegrationSettings(settings.provider || "gohighlevel");
    
    if (existing) {
      const [updated] = await db
        .update(integrationSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(integrationSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(integrationSettings).values(settings).returning();
      return created;
    }
  }

  async getChatSettings(): Promise<ChatSettings> {
    try {
      await this.ensureChatSchema();
      const [settings] = await db.select().from(chatSettings);
      if (settings) return settings;
    } catch (err) {
      console.error("getChatSettings initial read failed, retrying after ensuring schema:", err);
      this.chatSchemaEnsured = false;
      await this.ensureChatSchema();
    }

    const [created] = await db.insert(chatSettings).values({}).returning();
    return created;
  }

  async updateChatSettings(settings: Partial<InsertChatSettings>): Promise<ChatSettings> {
    try {
      await this.ensureChatSchema();
      const existing = await this.getChatSettings();
      const [updated] = await db
        .update(chatSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(chatSettings.id, existing.id))
        .returning();
      return updated;
    } catch (err) {
      console.error("updateChatSettings failed, retrying after ensuring schema:", err);
      this.chatSchemaEnsured = false;
      await this.ensureChatSchema();
      const existing = await this.getChatSettings();
      const [updated] = await db
        .update(chatSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(chatSettings.id, existing.id))
        .returning();
      return updated;
    }
  }

  async getChatIntegration(provider: string): Promise<ChatIntegrations | undefined> {
    const [integration] = await db.select().from(chatIntegrations).where(eq(chatIntegrations.provider, provider));
    return integration;
  }

  async upsertChatIntegration(settings: InsertChatIntegrations): Promise<ChatIntegrations> {
    const existing = await this.getChatIntegration(settings.provider || "openai");
    if (existing) {
      const payload = {
        ...settings,
        apiKey: settings.apiKey ?? existing.apiKey,
        updatedAt: new Date(),
      };
      const [updated] = await db
        .update(chatIntegrations)
        .set(payload)
        .where(eq(chatIntegrations.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(chatIntegrations).values(settings).returning();
    return created;
  }

  async getTwilioSettings(): Promise<TwilioSettings | undefined> {
    await ensureTwilioSchema();
    const [settings] = await db.select().from(twilioSettings).limit(1);
    return settings;
  }

  async saveTwilioSettings(settings: InsertTwilioSettings): Promise<TwilioSettings> {
    await ensureTwilioSchema();
    const existing = await this.getTwilioSettings();
    const toPhoneNumbers = Array.isArray(settings.toPhoneNumbers)
      ? settings.toPhoneNumbers.map(num => num?.toString() || "").filter(Boolean)
      : Array.isArray(existing?.toPhoneNumbers)
        ? (existing.toPhoneNumbers as string[]).map(num => num?.toString() || "").filter(Boolean)
        : [];

    if (existing) {
      const payload = {
        ...settings,
        toPhoneNumbers,
        authToken: settings.authToken ?? existing.authToken,
        updatedAt: new Date(),
      };
      const [updated] = await db
        .update(twilioSettings)
        .set(payload)
        .where(eq(twilioSettings.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(twilioSettings).values({
      ...settings,
      toPhoneNumbers,
    }).returning();
    return created;
  }

  async listConversations(): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .orderBy(desc(sql`COALESCE(${conversations.lastMessageAt}, ${conversations.createdAt})`));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(conversationMessages).where(eq(conversationMessages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async addConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage> {
    const [created] = await db.insert(conversationMessages).values(message).returning();
    return created;
  }

  async getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
    return await db
      .select()
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(asc(conversationMessages.createdAt));
  }
  
  async getFormLeadBySession(sessionId: string): Promise<FormLead | undefined> {
    await ensureFormLeadGhlColumns();
    const [lead] = await db.select().from(formLeads).where(eq(formLeads.sessionId, sessionId));
    return lead;
  }

  async getFormLeadByConversationId(conversationId: string): Promise<FormLead | undefined> {
    await ensureFormLeadGhlColumns();
    const [lead] = await db.select().from(formLeads).where(eq(formLeads.conversationId, conversationId));
    return lead;
  }

  async getFormLeadByEmail(email: string): Promise<FormLead | undefined> {
    await ensureFormLeadGhlColumns();
    const [lead] = await db.select().from(formLeads).where(eq(formLeads.email, email));
    return lead;
  }

  async upsertFormLeadProgress(progress: FormLeadProgressInput, metadata: { userAgent?: string; conversationId?: string; source?: string } = {}, formConfig?: FormConfig): Promise<FormLead> {
    await ensureFormLeadGhlColumns();

    // For chat source, try to find by conversationId first
    let existing = metadata.conversationId
      ? await this.getFormLeadByConversationId(metadata.conversationId)
      : await this.getFormLeadBySession(progress.sessionId);

    if (!existing) {
      existing = await this.getFormLeadBySession(progress.sessionId);
    }
    if (!existing && !progress.nome) {
      throw new Error("Full name is required to start the form");
    }

    const config = formConfig || (await this.getCompanySettings()).formConfig || DEFAULT_FORM_CONFIG;
    const totalQuestions = config.questions.length || DEFAULT_FORM_CONFIG.questions.length;
    const safeQuestionNumber = Math.max(1, Math.min(progress.questionNumber, totalQuestions));

    const mergedCustomAnswers = Object.fromEntries(
      Object.entries({
        ...(existing?.customAnswers || {}),
        ...(progress.customAnswers || {}),
      }).filter(([_, value]) => typeof value === "string" && value.trim().length > 0)
    );

    const answersForScoring: Record<string, string | undefined> = {
      ...mergedCustomAnswers,
      nome: progress.nome ?? existing?.nome ?? undefined,
      email: progress.email ?? existing?.email ?? undefined,
      telefone: progress.telefone ?? existing?.telefone ?? undefined,
      cidadeEstado: progress.cidadeEstado ?? existing?.cidadeEstado ?? undefined,
      tipoNegocio: progress.tipoNegocio ?? existing?.tipoNegocio ?? undefined,
      tipoNegocioOutro: progress.tipoNegocioOutro ?? existing?.tipoNegocioOutro ?? undefined,
      tempoNegocio: progress.tempoNegocio ?? existing?.tempoNegocio ?? undefined,
      experienciaMarketing: progress.experienciaMarketing ?? existing?.experienciaMarketing ?? undefined,
      orcamentoAnuncios: progress.orcamentoAnuncios ?? existing?.orcamentoAnuncios ?? undefined,
      principalDesafio: progress.principalDesafio ?? existing?.principalDesafio ?? undefined,
      disponibilidade: progress.disponibilidade ?? existing?.disponibilidade ?? undefined,
      expectativaResultado: progress.expectativaResultado ?? existing?.expectativaResultado ?? undefined,
    };

    const scoreResult = calculateFormScoresWithConfig(answersForScoring, config);
    const isComplete = progress.formCompleto || safeQuestionNumber >= totalQuestions;
    const classification: LeadClassification | undefined = isComplete
      ? classifyLead(scoreResult.total, config.thresholds)
      : (existing?.classificacao ?? (progress.classificacao as LeadClassification | undefined));
    const now = new Date();
    const latestQuestion = Math.max(safeQuestionNumber, existing?.ultimaPerguntaRespondida ?? 0);

    const payload: Partial<typeof formLeads.$inferInsert> = {
      sessionId: progress.sessionId,
      nome: progress.nome ?? existing?.nome ?? "",
      email: progress.email ?? existing?.email,
      telefone: progress.telefone ?? existing?.telefone,
      cidadeEstado: progress.cidadeEstado ?? existing?.cidadeEstado,
      tipoNegocio: progress.tipoNegocio ?? existing?.tipoNegocio,
      tipoNegocioOutro: progress.tipoNegocioOutro ?? existing?.tipoNegocioOutro,
      tempoNegocio: progress.tempoNegocio ?? existing?.tempoNegocio,
      experienciaMarketing: progress.experienciaMarketing ?? existing?.experienciaMarketing,
      orcamentoAnuncios: progress.orcamentoAnuncios ?? existing?.orcamentoAnuncios,
      principalDesafio: progress.principalDesafio ?? existing?.principalDesafio,
      disponibilidade: progress.disponibilidade ?? existing?.disponibilidade,
      expectativaResultado: progress.expectativaResultado ?? existing?.expectativaResultado,
      customAnswers: mergedCustomAnswers,
      scoreTotal: scoreResult.total,
      classificacao: classification,
      scoreTipoNegocio: scoreResult.breakdown.scoreTipoNegocio ?? existing?.scoreTipoNegocio ?? 0,
      scoreTempoNegocio: scoreResult.breakdown.scoreTempoNegocio ?? existing?.scoreTempoNegocio ?? 0,
      scoreExperiencia: scoreResult.breakdown.scoreExperiencia ?? existing?.scoreExperiencia ?? 0,
      scoreOrcamento: scoreResult.breakdown.scoreOrcamento ?? existing?.scoreOrcamento ?? 0,
      scoreDesafio: scoreResult.breakdown.scoreDesafio ?? existing?.scoreDesafio ?? 0,
      scoreDisponibilidade: scoreResult.breakdown.scoreDisponibilidade ?? existing?.scoreDisponibilidade ?? 0,
      scoreExpectativa: scoreResult.breakdown.scoreExpectativa ?? existing?.scoreExpectativa ?? 0,
      tempoTotalSegundos: progress.tempoTotalSegundos ?? existing?.tempoTotalSegundos,
      userAgent: metadata.userAgent ?? existing?.userAgent,
      urlOrigem: progress.urlOrigem ?? existing?.urlOrigem,
      utmSource: progress.utmSource ?? existing?.utmSource,
      utmMedium: progress.utmMedium ?? existing?.utmMedium,
      utmCampaign: progress.utmCampaign ?? existing?.utmCampaign,
      status: existing?.status ?? "novo",
      formCompleto: isComplete || existing?.formCompleto || false,
      ultimaPerguntaRespondida: latestQuestion,
      notificacaoEnviada: existing?.notificacaoEnviada ?? false,
      updatedAt: now,
      ghlContactId: existing?.ghlContactId ?? null,
      ghlSyncStatus: existing?.ghlSyncStatus ?? "pending",
      source: metadata.source ?? existing?.source ?? "form",
      conversationId: metadata.conversationId ?? existing?.conversationId ?? null,
    };

    if (!existing) {
      const startedAt = progress.startedAt ? new Date(progress.startedAt) : now;
      const safeStartedAt = isNaN(startedAt.getTime()) ? now : startedAt;
      const insertPayload: typeof formLeads.$inferInsert = {
        sessionId: progress.sessionId,
        nome: progress.nome || "",
        email: payload.email,
        telefone: payload.telefone,
        cidadeEstado: payload.cidadeEstado,
        tipoNegocio: payload.tipoNegocio,
        tipoNegocioOutro: payload.tipoNegocioOutro,
        tempoNegocio: payload.tempoNegocio,
        experienciaMarketing: payload.experienciaMarketing,
        orcamentoAnuncios: payload.orcamentoAnuncios,
        principalDesafio: payload.principalDesafio,
        disponibilidade: payload.disponibilidade,
        expectativaResultado: payload.expectativaResultado,
        customAnswers: mergedCustomAnswers,
        scoreTotal: payload.scoreTotal ?? 0,
        classificacao: payload.classificacao ?? null,
        scoreTipoNegocio: payload.scoreTipoNegocio ?? 0,
        scoreTempoNegocio: payload.scoreTempoNegocio ?? 0,
        scoreExperiencia: payload.scoreExperiencia ?? 0,
        scoreOrcamento: payload.scoreOrcamento ?? 0,
        scoreDesafio: payload.scoreDesafio ?? 0,
        scoreDisponibilidade: payload.scoreDisponibilidade ?? 0,
        scoreExpectativa: payload.scoreExpectativa ?? 0,
        tempoTotalSegundos: payload.tempoTotalSegundos ?? null,
        userAgent: payload.userAgent ?? null,
        urlOrigem: payload.urlOrigem ?? null,
        utmSource: payload.utmSource ?? null,
        utmMedium: payload.utmMedium ?? null,
        utmCampaign: payload.utmCampaign ?? null,
        status: payload.status ?? "novo",
        formCompleto: payload.formCompleto ?? false,
        ultimaPerguntaRespondida: payload.ultimaPerguntaRespondida ?? latestQuestion,
        notificacaoEnviada: payload.notificacaoEnviada ?? false,
        dataContato: null,
        observacoes: payload.observacoes ?? null,
        ghlContactId: null,
        ghlSyncStatus: payload.ghlSyncStatus ?? "pending",
        source: metadata.source ?? "form",
        conversationId: metadata.conversationId ?? null,
        createdAt: safeStartedAt,
        updatedAt: now,
      };
      try {
        const [created] = await db.insert(formLeads).values(insertPayload).returning();
        return created;
      } catch (err: any) {
        if (err?.code === "23505") {
          const existingBySession = await this.getFormLeadBySession(progress.sessionId);
          if (existingBySession) {
            const [updatedExisting] = await db
              .update(formLeads)
              .set(payload)
              .where(eq(formLeads.id, existingBySession.id))
              .returning();
            return updatedExisting;
          }
        }
        throw err;
      }
    }

    const [updated] = await db
      .update(formLeads)
      .set(payload)
      .where(eq(formLeads.id, existing.id))
      .returning();
    return updated;
  }

  async listFormLeads(filters: { status?: LeadStatus; classificacao?: LeadClassification; formCompleto?: boolean; completionStatus?: 'completo' | 'em_progresso' | 'abandonado'; search?: string } = {}): Promise<FormLead[]> {
    await ensureFormLeadGhlColumns();
    const conditions: any[] = [];
    if (filters.status) conditions.push(eq(formLeads.status, filters.status));
    if (filters.classificacao) conditions.push(eq(formLeads.classificacao, filters.classificacao));

    // New 3-stage completion filter
    if (filters.completionStatus) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (filters.completionStatus === 'completo') {
        conditions.push(eq(formLeads.formCompleto, true));
      } else if (filters.completionStatus === 'em_progresso') {
        // Not complete AND updated within last 24 hours
        conditions.push(eq(formLeads.formCompleto, false));
        conditions.push(gte(formLeads.updatedAt, oneDayAgo));
      } else if (filters.completionStatus === 'abandonado') {
        // Not complete AND updated more than 24 hours ago
        conditions.push(eq(formLeads.formCompleto, false));
        conditions.push(lt(formLeads.updatedAt, oneDayAgo));
      }
    } else if (typeof filters.formCompleto === "boolean") {
      // Legacy filter support
      conditions.push(eq(formLeads.formCompleto, filters.formCompleto));
    }

    if (filters.search) {
      const likeValue = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(formLeads.nome, likeValue),
          ilike(formLeads.email, likeValue),
          ilike(formLeads.telefone, likeValue),
        )
      );
    }

    if (conditions.length) {
      return await db.select().from(formLeads).where(and(...conditions)).orderBy(desc(formLeads.createdAt));
    }
    return await db.select().from(formLeads).orderBy(desc(formLeads.createdAt));
  }

  async updateFormLead(id: number, updates: Partial<Pick<FormLead, "status" | "observacoes" | "notificacaoEnviada" | "ghlContactId" | "ghlSyncStatus">>): Promise<FormLead | undefined> {
    await ensureFormLeadGhlColumns();
    const [existing] = await db.select().from(formLeads).where(eq(formLeads.id, id));
    if (!existing) return undefined;

    const [updated] = await db
      .update(formLeads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(formLeads.id, id))
      .returning();
    return updated;
  }

  async deleteFormLead(id: number): Promise<boolean> {
    await ensureFormLeadGhlColumns();
    const [existing] = await db.select().from(formLeads).where(eq(formLeads.id, id));
    if (!existing) return false;
    await db.delete(formLeads).where(eq(formLeads.id, id));
    return true;
  }

  async getBlogPosts(status?: string): Promise<BlogPost[]> {
    if (status) {
      return await db.select().from(blogPosts).where(eq(blogPosts.status, status)).orderBy(desc(blogPosts.createdAt));
    }
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async getPublishedBlogPosts(limit: number = 10, offset: number = 0): Promise<BlogPost[]> {
    return await db.select()
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset);
  }

  async getRelatedBlogPosts(postId: number, limit: number = 4): Promise<BlogPost[]> {
    return await db.select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.status, 'published'),
        ne(blogPosts.id, postId)
      ))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit);
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [newPost] = await db.insert(blogPosts).values(post).returning();
    return newPost;
  }

  async updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost> {
    const [updated] = await db.update(blogPosts)
      .set({ ...post, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return updated;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async countPublishedBlogPosts(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'));
    return Number(result[0]?.count || 0);
  }

  async getServicePosts(status?: string): Promise<ServicePost[]> {
    await ensureServicePostsSchema();
    if (status) {
      return await db
        .select()
        .from(servicePosts)
        .where(eq(servicePosts.status, status))
        .orderBy(asc(servicePosts.order), desc(servicePosts.updatedAt));
    }
    return await db.select().from(servicePosts).orderBy(asc(servicePosts.order), desc(servicePosts.updatedAt));
  }

  async getServicePost(id: number): Promise<ServicePost | undefined> {
    await ensureServicePostsSchema();
    const [post] = await db.select().from(servicePosts).where(eq(servicePosts.id, id));
    return post;
  }

  async getServicePostBySlug(slug: string): Promise<ServicePost | undefined> {
    await ensureServicePostsSchema();
    const [post] = await db.select().from(servicePosts).where(eq(servicePosts.slug, slug));
    return post;
  }

  async getPublishedServicePosts(limit: number = 10, offset: number = 0): Promise<ServicePost[]> {
    await ensureServicePostsSchema();
    return await db
      .select()
      .from(servicePosts)
      .where(eq(servicePosts.status, "published"))
      .orderBy(asc(servicePosts.order), desc(servicePosts.publishedAt), desc(servicePosts.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  async createServicePost(post: InsertServicePost): Promise<ServicePost> {
    await ensureServicePostsSchema();
    const [created] = await db.insert(servicePosts).values(post).returning();
    return created;
  }

  async updateServicePost(id: number, post: Partial<InsertServicePost>): Promise<ServicePost> {
    await ensureServicePostsSchema();
    const [updated] = await db
      .update(servicePosts)
      .set({ ...post, updatedAt: new Date() })
      .where(eq(servicePosts.id, id))
      .returning();
    return updated;
  }

  async reorderServicePosts(postIds: number[]): Promise<void> {
    await ensureServicePostsSchema();
    if (!postIds.length) return;

    await db.transaction(async (tx) => {
      for (let index = 0; index < postIds.length; index += 1) {
        const id = postIds[index];
        await tx
          .update(servicePosts)
          .set({ order: index + 1, updatedAt: new Date() })
          .where(eq(servicePosts.id, id));
      }
    });
  }

  async deleteServicePost(id: number): Promise<void> {
    await ensureServicePostsSchema();
    await db.delete(servicePosts).where(eq(servicePosts.id, id));
  }

  async getGalleryImages(limit?: number): Promise<GalleryImage[]> {
    await ensureGallerySchema();
    if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
      return await db
        .select()
        .from(galleryImages)
        .orderBy(asc(galleryImages.sortOrder), desc(galleryImages.createdAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(galleryImages)
      .orderBy(asc(galleryImages.sortOrder), desc(galleryImages.createdAt));
  }

  async getGalleryImage(id: number): Promise<GalleryImage | undefined> {
    await ensureGallerySchema();
    const [image] = await db.select().from(galleryImages).where(eq(galleryImages.id, id));
    return image;
  }

  async createGalleryImage(image: InsertGalleryImage): Promise<GalleryImage> {
    await ensureGallerySchema();
    let sortOrder = image.sortOrder;
    if (typeof sortOrder !== "number" || Number.isNaN(sortOrder)) {
      const [maxSortOrderRow] = await db
        .select({
          maxSortOrder: sql<number>`coalesce(max(${galleryImages.sortOrder}), -1)::int`,
        })
        .from(galleryImages);
      sortOrder = Number(maxSortOrderRow?.maxSortOrder ?? -1) + 1;
    }

    const [created] = await db
      .insert(galleryImages)
      .values({ ...image, sortOrder })
      .returning();
    return created;
  }

  async updateGalleryImage(id: number, image: Partial<InsertGalleryImage>): Promise<GalleryImage> {
    await ensureGallerySchema();
    const [updated] = await db
      .update(galleryImages)
      .set({ ...image, updatedAt: new Date() })
      .where(eq(galleryImages.id, id))
      .returning();
    return updated;
  }

  async reorderGalleryImages(imageIds: number[]): Promise<void> {
    await ensureGallerySchema();
    if (imageIds.length === 0) return;

    await db.transaction(async (tx) => {
      for (let sortOrder = 0; sortOrder < imageIds.length; sortOrder += 1) {
        const id = imageIds[sortOrder];
        await tx
          .update(galleryImages)
          .set({ sortOrder, updatedAt: new Date() })
          .where(eq(galleryImages.id, id));
      }
    });
  }

  async deleteGalleryImage(id: number): Promise<void> {
    await ensureGallerySchema();
    await db.delete(galleryImages).where(eq(galleryImages.id, id));
  }

  async deleteAllGalleryImages(): Promise<number> {
    await ensureGallerySchema();
    const deletedRows = await db.delete(galleryImages).returning({ id: galleryImages.id });
    return deletedRows.length;
  }

  async getReviewsSettings(): Promise<ReviewsSettings> {
    await ensureReviewsSchema();
    const [settings] = await db.select().from(reviewsSettings).orderBy(asc(reviewsSettings.id)).limit(1);
    if (settings) return settings;

    const company = await this.getCompanySettings();
    const legacyReviews = company.homepageContent?.reviewsSection;
    const widgetEmbedUrl = (legacyReviews?.embedUrl || "").trim();

    const [created] = await db.insert(reviewsSettings).values({
      sectionTitle: (legacyReviews?.title || "").trim(),
      sectionSubtitle: (legacyReviews?.subtitle || "").trim(),
      displayMode: "auto",
      widgetEnabled: widgetEmbedUrl.length > 0,
      widgetEmbedUrl,
      fallbackEnabled: true,
      updatedAt: new Date(),
    }).returning();

    return created;
  }

  async upsertReviewsSettings(settings: Partial<InsertReviewsSettings>): Promise<ReviewsSettings> {
    await ensureReviewsSchema();
    const existing = await this.getReviewsSettings();
    const [updated] = await db
      .update(reviewsSettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(reviewsSettings.id, existing.id))
      .returning();
    return updated;
  }

  async getReviewItems(onlyActive: boolean = false): Promise<ReviewItem[]> {
    await ensureReviewsSchema();

    if (onlyActive) {
      return await db
        .select()
        .from(reviewItems)
        .where(eq(reviewItems.isActive, true))
        .orderBy(asc(reviewItems.sortOrder), desc(reviewItems.createdAt));
    }

    return await db
      .select()
      .from(reviewItems)
      .orderBy(asc(reviewItems.sortOrder), desc(reviewItems.createdAt));
  }

  async createReviewItem(item: InsertReviewItem): Promise<ReviewItem> {
    await ensureReviewsSchema();
    const [maxSortOrderRow] = await db
      .select({
        maxSortOrder: sql<number>`coalesce(max(${reviewItems.sortOrder}), -1)::int`,
      })
      .from(reviewItems);

    const nextSortOrder = Number(maxSortOrderRow?.maxSortOrder ?? -1) + 1;
    const [created] = await db
      .insert(reviewItems)
      .values({
        ...item,
        sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : nextSortOrder,
      })
      .returning();
    return created;
  }

  async updateReviewItem(id: number, item: Partial<InsertReviewItem>): Promise<ReviewItem> {
    await ensureReviewsSchema();
    const [updated] = await db
      .update(reviewItems)
      .set({
        ...item,
        updatedAt: new Date(),
      })
      .where(eq(reviewItems.id, id))
      .returning();
    return updated;
  }

  async reorderReviewItems(itemIds: number[]): Promise<void> {
    await ensureReviewsSchema();
    if (!itemIds.length) return;

    await db.transaction(async (tx) => {
      for (let index = 0; index < itemIds.length; index += 1) {
        await tx
          .update(reviewItems)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(reviewItems.id, itemIds[index]));
      }
    });
  }

  async deleteReviewItem(id: number): Promise<void> {
    await ensureReviewsSchema();
    await db.delete(reviewItems).where(eq(reviewItems.id, id));
  }

}

export const storage = new DatabaseStorage();
