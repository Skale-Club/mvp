# Milestones: mvp

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

## v1.2 — Marketing Attribution

**Status:** In Progress
**Started:** 2026-04-25
**Phases:** TBD (see ROADMAP.md)

**Goal:** Add a Marketing Intelligence section to the admin panel — UTM capture, traffic auto-classification, first/last-touch attribution, and conversion tracking — so the business owner can understand which campaigns and sources are generating real leads.

---
*MILESTONES.md — Updated at each milestone boundary*
