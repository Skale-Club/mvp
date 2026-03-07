# Project Technical Documentation

> **Last Updated:** 2026-03-07
> **Maintained by:** Development Team

---

## Table of Contents

1. [SEO Injection System](#seo-injection-system)
2. [Analytics System](#analytics-system)
3. [Project Architecture](#project-architecture)
4. [Database Schema](#database-schema)
5. [API Routes](#api-routes)
6. [Environment Variables](#environment-variables)
7. [Deployment](#deployment)

---

# SEO Injection System - Eliminating FODC

## Original Problem

The application displayed a **FODC (Flash of Default Content)** for ~2 seconds after loading:

- **Browser tab**: "[companyname] | Your 5-Star Marketing Company" → then changed to the correct title
- **Cause**: Hardcoded values in `index.html` while React Query fetched real data

## Implemented Solution

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│ 1. npm run build                                        │
│    ├─ Vite build (client)                              │
│    ├─ 🔧 Inject SEO (scripts/inject-seo-build.ts)      │
│    │   ├─ Fetch data from database                     │
│    │   ├─ Inject into dist/public/index.html           │
│    │   └─ Add meta tags, title, OG, Twitter Cards      │
│    └─ esbuild (server)                                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 2. Production (server running)                          │
│    ├─ User visits site                                 │
│    ├─ Browser loads index.html (already with SEO!)     │
│    ├─ React hydrates                                   │
│    └─ No flash, SEO data already present ✅            │
└─────────────────────────────────────────────────────────┘
```

### Modified Files

| File | Purpose |
|------|---------|
| [`client/index.html`](../client/index.html) | Placeholder title/meta that get replaced at build time |
| [`scripts/inject-seo-build.ts`](../scripts/inject-seo-build.ts) | Build-time SEO injection script |
| [`script/build.ts`](../script/build.ts) | Orchestrates build + SEO injection |
| [`client/src/hooks/use-seo.ts`](../client/src/hooks/use-seo.ts) | Runtime SEO updates (disabled refetch on mount) |

## How to Use

### Development
```bash
npm run dev
```
- **Behavior**: Title shows "Loading..." for ~1-2s until React loads
- **Acceptable**: Only happens in dev, doesn't affect production

### Production
```bash
npm run build
npm start
```
- **Behavior**: Title comes correct from the server ✅
- **Result**: Zero flash, perfect SEO

### Update SEO in Admin

1. Access `/admin` → Settings → SEO
2. Update title, description, images, etc.
3. **IMPORTANT**: Run `npm run build` again
4. Restart the server: `npm start`

> **Note**: In production, SEO changes in admin require rebuild. This is intentional for maximum performance (zero loading delay).

---

# Analytics System

## Overview

The project uses a centralized analytics system located at [`client/src/lib/analytics.ts`](../client/src/lib/analytics.ts).

### Supported Providers

| Provider | Setting | ID Format |
|----------|---------|-----------|
| Google Tag Manager | `gtmContainerId` | GTM-XXXXXXX |
| Google Analytics 4 | `ga4MeasurementId` | G-XXXXXXXXXX |
| Facebook Pixel | `facebookPixelId` | Numeric ID |

### Configuration Storage

Analytics settings are stored in the `company_settings` table:

```typescript
// shared/schema.ts
gtmContainerId: text("gtm_container_id").default(''),
ga4MeasurementId: text("ga4_measurement_id").default(''),
facebookPixelId: text("facebook_pixel_id").default(''),
gtmEnabled: boolean("gtm_enabled").default(false),
ga4Enabled: boolean("ga4_enabled").default(false),
facebookPixelEnabled: boolean("facebook_pixel_enabled").default(false),
```

### Event Types

#### Conversion Events (Most Important)
These should be marked as conversions in GA4 and Facebook Ads:

| Event | Description | Trigger Location |
|-------|-------------|------------------|
| `generate_lead` | Lead form submitted | [`LeadThankYou.tsx`](../client/src/pages/LeadThankYou.tsx) |
| `contact_click` | Phone number clicked | [`Navbar.tsx`](../client/src/components/layout/Navbar.tsx) |
| `form_completed` | Lead form completed | Maps to `generate_lead` |

#### Engagement Events

| Event | Description | Trigger Location |
|-------|-------------|------------------|
| `page_view` | Page navigation | [`App.tsx`](../client/src/App.tsx) |
| `cta_click` | CTA button clicks | [`Home.tsx`](../client/src/pages/Home.tsx), [`Footer.tsx`](../client/src/components/layout/Footer.tsx) |
| `view_item_list` | Services page viewed | [`Services.tsx`](../client/src/pages/Services.tsx) |
| `form_open` | Lead form opened | [`LeadFormModal.tsx`](../client/src/components/LeadFormModal.tsx) |
| `form_step_completed` | Form step completed | [`LeadFormModal.tsx`](../client/src/components/LeadFormModal.tsx) |
| `form_abandoned` | Form abandoned midway | [`LeadFormModal.tsx`](../client/src/components/LeadFormModal.tsx) |
| `chat_open` | Chat widget opened | [`ChatWidget.tsx`](../client/src/components/chat/ChatWidget.tsx) |
| `chat_close` | Chat widget closed | [`ChatWidget.tsx`](../client/src/components/chat/ChatWidget.tsx) |
| `chat_message_sent` | Message sent to chat | [`ChatWidget.tsx`](../client/src/components/chat/ChatWidget.tsx) |
| `chat_message_received` | AI response received | [`ChatWidget.tsx`](../client/src/components/chat/ChatWidget.tsx) |
| `chat_new_conversation` | New chat started | [`ChatWidget.tsx`](../client/src/components/chat/ChatWidget.tsx) |
| `chat_lead_captured` | Lead captured via chat | [`ChatWidget.tsx`](../client/src/components/chat/ChatWidget.tsx) |

### Facebook Event Mapping

```typescript
// client/src/lib/analytics.ts
const fbEventMap = {
  'begin_checkout': 'InitiateCheckout',
  'purchase': 'Purchase',
  'generate_lead': 'Lead',
  'view_item': 'ViewContent',
  'view_item_list': 'ViewContent',
  'contact_click': 'Contact',
  'form_completed': 'Lead',
};
```

### Initialization Flow

1. [`App.tsx`](../client/src/App.tsx) calls `initAnalytics()` with settings from `/api/company-settings`
2. Scripts are dynamically injected into `<head>`:
   - GTM: Inserts at beginning of `<head>` + noscript iframe
   - GA4: Loads gtag.js with config
   - Facebook Pixel: Loads fbevents.js with PageView
3. `trackEvent()` sends to all enabled providers simultaneously

### Usage Example

```typescript
import { trackEvent, trackCTAClick } from '@/lib/analytics';

// Track a custom event
trackEvent('generate_lead', {
  location: '/thankyou',
  label: 'Lead Form Submission',
  value: 100
});

// Track CTA click
trackCTAClick('hero', 'Get Your Free Quote');
```

---

# Project Architecture

## Directory Structure

```
├── client/                 # Frontend (React + Vite)
│   ├── index.html         # Entry HTML (SEO injected at build)
│   └── src/
│       ├── App.tsx        # Main app component + routing
│       ├── main.tsx       # React entry point
│       ├── index.css      # Global styles + Tailwind
│       ├── components/
│       │   ├── admin/     # Admin dashboard sections
│       │   ├── chat/      # Chat widget
│       │   ├── layout/    # Navbar, Footer, StickyBar
│       │   └── ui/        # shadcn/ui components
│       ├── hooks/         # Custom hooks (useSEO, useAuth, etc.)
│       ├── lib/           # Utilities (analytics, utils)
│       └── pages/         # Route pages (Home, Services, Admin)
│
├── server/                # Backend (Express)
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # Main API routes
│   ├── routes/           # Modular route files
│   │   ├── leads.ts      # Lead management
│   │   ├── chat.ts       # Chat API
│   │   └── integrations.ts
│   ├── storage.ts        # Database storage layer
│   ├── seo.ts            # SEO utilities
│   └── integrations/     # Third-party integrations
│       └── ghl.ts        # GoHighLevel integration
│
├── shared/               # Shared types/schemas
│   ├── schema.ts         # Drizzle tables + Zod schemas
│   └── form.ts           # Form configuration
│
├── scripts/              # Build scripts
│   └── inject-seo-build.ts
│
├── api/                  # Vercel serverless entry
│   └── index.ts
│
└── dist/                 # Production build output
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack Query (React Query) |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL (Neon/Supabase) |
| ORM | Drizzle ORM |
| Deployment | Vercel (serverless) |

---

# Database Schema

## Core Tables

### `company_settings`
Singleton table for site configuration:
- Business info (name, phone, email, address)
- Branding (colors, logos, CTAs)
- SEO settings (title, description, OG tags)
- Analytics IDs (GTM, GA4, Facebook Pixel)
- Chat configuration (welcome message, objectives)

### `leads`
Customer leads from forms:
- Contact info (name, email, phone)
- Lead scoring (classification, score)
- Service interest
- GHL sync status

### `conversations` / `conversation_messages`
Chat history:
- Session-based conversations
- Message history with roles (user/assistant)
- Lead capture flag

### `service_posts`
Service listings:
- Title, description, pricing
- Category association
- Active/inactive status

### `blog_posts`
Blog content:
- Title, content, excerpt
- SEO fields
- Related services

### `reviews`
Customer testimonials:
- Rating, name, content
- Active/inactive status

### `faqs`
Frequently asked questions:
- Question, answer
- Order position

---

# API Routes

## Public Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/company-settings` | Get site settings |
| GET | `/api/services` | List active services |
| GET | `/api/services/:slug` | Get service by slug |
| GET | `/api/reviews` | List active reviews |
| GET | `/api/faqs` | List FAQs |
| GET | `/api/blog` | List blog posts |
| GET | `/sitemap.xml` | XML sitemap |
| GET | `/robots.txt` | Robots file |

## Lead Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/leads` | Submit new lead |
| GET | `/api/leads` | List leads (admin) |
| PATCH | `/api/leads/:id` | Update lead (admin) |

## Chat Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send chat message |
| GET | `/api/chat/:sessionId` | Get conversation history |

## Admin Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/company-settings` | Update settings |
| POST | `/api/services` | Create service |
| PATCH | `/api/services/:id` | Update service |
| DELETE | `/api/services/:id` | Delete service |
| ... | ... | (CRUD for all entities) |

---

# Environment Variables

## Required

```env
DATABASE_URL=postgresql://...    # PostgreSQL connection string
SESSION_SECRET=...               # Express session secret
ADMIN_EMAIL=...                  # Admin login email
ADMIN_PASSWORD_HASH=...          # bcrypt hash of admin password
```

## Optional

```env
OPENAI_API_KEY=...              # AI chat functionality
TWILIO_ACCOUNT_SID=...          # SMS notifications
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
GHL_API_KEY=...                 # GoHighLevel integration
GHL_LOCATION_ID=...
```

---

# Deployment

## Vercel (Recommended)

The project is configured for Vercel deployment:

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to `main`

### Build Command
```bash
npm run build
```

### Output Directory
```
dist/
```

### API Routes
Serverless functions in `api/index.ts` handle all `/api/*` routes.

## Manual Deployment

```bash
# Build the project
npm run build

# Start production server
npm start
```

---

## Troubleshooting

### "No company settings found in database"
**Cause**: Empty database or not connected during build
**Solution**:
```bash
echo $DATABASE_URL  # Verify connection string
npm run db:push     # Run migrations
```

### "index.html not found"
**Cause**: Vite build failed before injection
**Solution**: Check Vite build logs above the error

### Title still shows "Loading..."
**Cause**: Injection script didn't run or failed silently
**Solution**:
```bash
tsx scripts/inject-seo-build.ts  # Run manually
```

### Analytics not tracking
**Cause**: IDs not configured or providers not enabled
**Solution**: Check Admin → Integrations → enable GTM/GA4/Facebook Pixel

---

## References

- [Preventing FODC in SPAs](https://web.dev/avoid-invisible-text/)
- [SEO for React Apps](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Build-time Pre-rendering](https://vitejs.dev/guide/ssr.html)
- [GA4 Event Tracking](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [Facebook Pixel Standard Events](https://developers.facebook.com/docs/meta-pixel/reference)
