# Server Routes Organization

This directory contains the reorganized route handlers for the application.

## Structure

```
server/routes/
├── constants.ts         # Shared constants and configuration
├── helpers.ts           # Utility functions (slugify, phone parsing, URL validation)
├── rateLimit.ts         # Rate limiting utilities
├── chat.ts              # Chat widget routes and message handling
├── chat/
│   └── tools.ts         # OpenAI chat tools (lead qualification, FAQs)
├── integrations.ts      # Third-party integrations (OpenAI, GHL, Twilio)
├── content.ts           # Blog posts and FAQs
├── users.ts             # User management (Supabase Auth + local DB)
├── leads.ts             # Form configuration and lead management
└── services.ts          # Service posts, gallery, company settings, SEO
```

## Route Modules

### `chat.ts` - Chat & Conversations
- `GET /api/chat/config` - Public chat widget configuration
- `GET /api/chat/settings` - Admin chat settings
- `PUT /api/chat/settings` - Update chat settings
- `GET /api/chat/response-time` - Calculate average response time
- `GET /api/chat/conversations` - List all conversations (admin)
- `GET /api/chat/conversations/:id` - Get conversation with messages
- `POST /api/chat/conversations/:id/status` - Update conversation status
- `DELETE /api/chat/conversations/:id` - Delete conversation
- `GET /api/chat/conversations/:id/messages` - Public conversation history
- `POST /api/chat/message` - Send chat message (main chat endpoint)

### `integrations.ts` - Third-party Services
**OpenAI:**
- `GET /api/integrations/openai` - Get OpenAI settings
- `PUT /api/integrations/openai` - Update OpenAI settings
- `POST /api/integrations/openai/test` - Test OpenAI connection

**GoHighLevel:**
- `GET /api/integrations/ghl` - Get GHL settings
- `PUT /api/integrations/ghl` - Update GHL settings
- `POST /api/integrations/ghl/test` - Test GHL connection
- `GET /api/integrations/ghl/status` - Public GHL status
- `GET /api/integrations/ghl/custom-fields` - Get GHL custom fields

**Twilio:**
- `GET /api/integrations/twilio` - Get Twilio settings
- `PUT /api/integrations/twilio` - Update Twilio settings
- `POST /api/integrations/twilio/test` - Test Twilio SMS

### `content.ts` - Blog & FAQs
**Blog Posts:**
- `GET /api/blog` - List blog posts (with filters)
- `GET /api/blog/count` - Count published posts
- `GET /api/blog/:idOrSlug` - Get single post
- `GET /api/blog/:id/related` - Get related posts
- `POST /api/blog` - Create post (admin)
- `PUT /api/blog/:id` - Update post (admin)
- `DELETE /api/blog/:id` - Delete post (admin)
- `DELETE /api/blog/tags/:tag` - Delete tag from all posts
- `PUT /api/blog/tags/:tag` - Rename tag across all posts

**FAQs:**
- `GET /api/faqs` - List FAQs
- `POST /api/faqs` - Create FAQ (admin)
- `PUT /api/faqs/:id` - Update FAQ (admin)
- `DELETE /api/faqs/:id` - Delete FAQ (admin)

### `users.ts` - User Management
- `GET /api/users` - List all users (Supabase + local DB)
- `PATCH /api/users/:id` - Update user (role, profile)
- `DELETE /api/users/:id` - Delete user

### `leads.ts` - Forms & Lead Qualification
**Form Configuration:**
- `GET /api/form-config` - Get form configuration
- `PUT /api/form-config` - Update form configuration (admin)

**Leads:**
- `GET /api/form-leads/:sessionId` - Get lead by session
- `POST /api/form-leads/progress` - Submit/update lead progress
- `GET /api/form-leads` - List leads with filters (admin)
- `PATCH /api/form-leads/:id` - Update lead (admin)
- `DELETE /api/form-leads/:id` - Delete lead (admin)

### `services.ts` - Services, Gallery, Settings, SEO
**Service Posts:**
- `GET /api/service-posts` - List service posts
- `GET /api/service-posts/:idOrSlug` - Get service post
- `POST /api/service-posts` - Create service post (admin)
- `PUT /api/service-posts/:id` - Update service post (admin)
- `DELETE /api/service-posts/:id` - Delete service post (admin)

**Gallery:**
- `GET /api/gallery` - List gallery images
- `GET /api/gallery/:id` - Get single image
- `POST /api/gallery` - Upload image (admin)
- `POST /api/gallery/reorder` - Reorder images (admin)
- `PUT /api/gallery/:id` - Update image (admin)
- `DELETE /api/gallery/:id` - Delete image (admin)
- `DELETE /api/gallery` - Delete all images (admin)

**Company Settings:**
- `GET /api/company-settings` - Get company settings
- `PUT /api/company-settings` - Update company settings (admin)

**SEO:**
- `GET /robots.txt` - Robots.txt file
- `GET /sitemap.xml` - XML sitemap

## Utilities

### `constants.ts`
- `DEFAULT_CHAT_MODEL` - OpenAI model for chat
- `DEFAULT_GHL_CALENDAR_ID` - GoHighLevel calendar ID
- `CHAT_MESSAGE_LIMIT_PER_CONVERSATION` - Message limit per chat
- `RATE_LIMIT_REQUESTS` - Rate limit threshold
- `DEFAULT_INTAKE_OBJECTIVES` - Default chat intake objectives

### `helpers.ts`
- `slugify(text)` - Convert text to URL-friendly slug
- `cleanPhone(phone)` - Clean and format phone numbers
- `parseRecipients(numbers, fallback)` - Parse and deduplicate phone lists
- `isUrlExcluded(url, rules)` - Check if URL matches exclusion rules
- `urlRuleSchema` - Zod schema for URL rules
- `chatMessageSchema` - Zod schema for chat messages

### `rateLimit.ts`
- `isRateLimited(key, limit?, window?)` - Check rate limit status
- `updateLastLowPerformanceAlert(timestamp)` - Update alert timestamp

## Changes from Previous Version

1. **Removed dead code**: Removed the unused `update_contact` tool tracking (lines 1629-1634 in old file)
2. **Extracted constants**: Moved hardcoded values to `constants.ts` (e.g., `DEFAULT_GHL_CALENDAR_ID`)
3. **Modular organization**: Split 2456 lines into 8 focused modules
4. **Better maintainability**: Each module has a single responsibility
5. **Type safety**: All utilities are properly typed
6. **Documentation**: Added JSDoc comments to key functions

## Migration Notes

- The main `routes.ts` file is now just 45 lines (vs 2456 lines before)
- All existing endpoints remain unchanged - this is a refactoring only
- Old files backed up as `routes.old.ts` and `routes.ts.backup`
- TypeScript compilation verified with `npm run check`
