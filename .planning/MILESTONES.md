# Milestones: mvp

## v1.2 Marketing Attribution (Shipped: 2026-04-27)

**Status:** Complete
**Phases:** 5 (Phases 3–7) | **Plans:** 15 | **Tasks:** 22
**Timeline:** 2026-04-25 → 2026-04-27 (3 days)
**Files changed:** ~90 | **Lines added:** 17,700+

**Key accomplishments:**

- `visitor_sessions` + `attribution_conversions` DB tables with UNIQUE constraint on `visitor_id`, RLS policies, 10 new columns on `form_leads`, and full IStorage attribution method suite
- Attribution API live — `POST /api/attribution/session` (upsert), `POST /api/attribution/conversion`, and lead-flow IIFE stamping first/last-touch on every lead without blocking the submit path
- `useAttribution` client hook — UTM capture at App root, `document.referrer` auto-classification (6 channels), `mvp_vid` localStorage persistence, and `phone_click`/`booking_started` conversion events
- Admin Marketing section — 5-tab dashboard (Overview KPIs + Recharts AreaChart, Sources with HOT/WARM/COLD badges, Campaigns with Direct/Untagged rendering, Conversions with business labels, Journey tab) with 7-preset date filter and source/campaign/type selects
- Journey tab — Conversions→Journey row-click navigation, controlled Tabs migration, vertical event timeline distinguishing `page_view` (Globe) from real conversions (Zap)
- Lead attribution panel — Marketing Attribution collapsible in Lead detail Dialog, `channelLabel()` shared utility, `ftLandingPage` + `visitCount` server enrichment, zero `utm_*` visible strings

---

## v1.0 — Initial Production Release

**Status:** Complete
**Completed:** 2026-Q1
**Phases:** Pre-GSD (planned and shipped before GSD adoption)

**Shipped:**

- Public service catalog with category/subcategory browsing, cart, and time-slot booking
- Lead capture with scoring and classification (HOT/WARM/COLD) and abandonment sweep
- Admin dashboard: services, blog, gallery, FAQs, reviews, team, company info, SEO, integrations, users
- Twilio SMS + Resend email + GoHighLevel CRM integrations (fire-and-forget)
- Supabase Auth with RLS on public tables
- Batch upload with controlled concurrency (gallery)
- Sitemap + robots.txt + SEO meta injection
- OpenAI-powered site chat

---

## v1.1 — Notification Log + Docs Alignment

**Status:** Complete
**Completed:** 2026-04-16
**Phases:** 2 (Phase 1 + Phase 2, tracked in .paul/)

**Shipped:**

- `notification_logs` table — every SMS/email/GHL sync recorded with recipient, preview, status, trigger
- `logNotification()` helper in server/notifications/logger.ts
- All three integrations (Twilio, Resend, GHL) instrumented to log each send
- API endpoints: GET /api/form-leads/:id/notifications and GET /api/admin/notification-logs (with filters)
- Per-lead row indicator in admin Leads section (icon badges for SMS/email/GHL) with popover
- CLAUDE.md, README.md, AGENTS.md rewritten to reflect dual nature (MVP production + forkable template)

**Deferred to future milestones:**

- Admin.tsx refactor into per-section components (L effort)
- Resend failed notifications via UI (M)
- Retention/TTL policy for notification_logs (S)
- Drizzle journal / standard migration workflow (M)
- Server-side aggregation for per-lead last-by-channel when log volume exceeds ~500/day (M)

---

*MILESTONES.md — Updated at each milestone boundary*
