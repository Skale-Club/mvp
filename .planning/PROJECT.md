# mvp

## What This Is

A full-stack platform (public website + admin dashboard) with a dual nature: (1) the production website for MVP — a real service business — and (2) a reusable, forkable base template for building websites for other service businesses (e.g. remodeling, on-demand services). Stack: React 18 + Express + Postgres/Drizzle + Supabase Auth, deployed on Vercel.

## Core Value

Delivers a complete service-business website (service catalog, booking, leads, admin, CRM integrations) that runs in production for MVP and serves as a forkable base for new clients.

## Current Milestone: v1.2 Marketing Attribution

**Goal:** Add a Marketing Intelligence section to the admin panel so the business owner can understand which sources, campaigns, and landing pages are generating real leads and conversions — without needing any technical knowledge.

**Target features:**
- UTM parameter capture (source, medium, campaign, term, content, id) on every visitor session
- Auto-classification for non-UTM traffic: organic search, social, referral, direct, unknown
- First-touch + last-touch attribution stored per visitor/lead
- Conversion event tracking (lead, form, phone click, booking, quote)
- Admin "Marketing" section: overview, campaign view, source view, conversions view, visitor journey
- Global filters: date range, source, medium, campaign, landing page, conversion type, device
- Business-first labels throughout — no developer jargon

## Requirements

### Validated (Shipped)

- ✓ Service catalog and booking flow — v1.0
- ✓ Lead system with scoring and classification — v1.0
- ✓ Admin dashboard (website, company, SEO, leads, FAQs, chat, integrations, blog, gallery, services, reviews, users) — v1.0
- ✓ Twilio + Resend + GoHighLevel integrations — v1.0
- ✓ Supabase Auth with RLS — v1.0
- ✓ Batch upload with controlled concurrency (gallery) — v1.0
- ✓ Sitemap + robots + SEO injection — v1.0
- ✓ Notification log per lead (SMS/Email/GHL) with preview and recipient — v1.1
- ✓ Global notification log admin section with filters — v1.1
- ✓ Docs alignment (CLAUDE.md, README.md, AGENTS.md) — v1.1

### Active (v1.2)

- ✓ Attribution data model in DB — `visitor_sessions` + `attribution_conversions` tables, 10 new columns on `form_leads`, RLS applied, IStorage methods implemented — Phase 3
- ✓ Attribution API endpoints live — `POST /api/attribution/session`, `POST /api/attribution/conversion`, lead-flow IIFE (ATTR-03/CONV-01), 5 admin marketing query endpoints — Phase 4
- ✓ Client attribution pipeline live — `use-attribution` hook (two-useEffect, mvp_vid, UTM capture, referrer classifier), form visitorId injection, phone_click + booking_started conversion events — Phase 5
- ✓ Admin Marketing section with overview, sources, campaigns, and conversions tabs; global date/source/campaign/conversion-type filters; business-first labels throughout — Phase 6
- [ ] Visitor Journey tab (per-visitor page sequence) + Lead attribution panel in existing Lead detail drawer
- [ ] Source/Campaign filter Select options populated dynamically from live data (deferred from Phase 6)

### Out of Scope

- Multi-tenant SaaS (multiple businesses on the same deploy) — not this project
- Automatic retry of failed notifications — deferred to a future milestone
- Separate analytics product or external analytics integration — this is embedded in admin
- Real-time traffic tracking / WebSocket dashboards — batch/on-load is sufficient
- Custom attribution models beyond first-touch and last-touch — future milestone if needed

## Context

**Business Context:**
Real production website for MVP (a service business). Also used as a base template for delivering sites to other clients in the same segment. The business owner needs to understand marketing ROI without technical knowledge.

**Technical Context:**
Monorepo with `client/`, `server/`, `shared/` (source of truth for schemas/types via Drizzle + Zod). Deployed on Vercel (Fluid Compute, Node.js). DB hosted on Supabase (Postgres + Auth + Storage + RLS). Integrations are fire-and-forget; notification logging added in v1.1.

**Admin Architecture:**
Admin.tsx was monolithic in v1.0; partially refactored. Each section (Leads, Notifications, Marketing, etc.) now lives in `client/src/components/admin/`. Phase 6 added `MarketingSection.tsx` + `admin/marketing/` sub-directory (4 tab components + shared utils). Pattern established for future sections.

## Constraints

- **Deployment:** Vercel Fluid Compute — no long-running processes, no WebSockets for real-time tracking
- **Database:** Supabase Postgres with RLS — new tables require RLS policies
- **Schema source of truth:** Drizzle + `shared/schema.ts` — no raw SQL DDL bypassing Drizzle
- **No automated test runner:** Verification is manual
- **Production site:** Changes to booking/lead flows require care; attribution is additive, not replacing anything
- **Reusable template:** Avoid MVP-specific coupling; attribution system should work for any fork

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth + RLS | Real production demands robust auth | ✓ Good |
| Drizzle + Zod via drizzle-zod as single source of types | Eliminates drift between DB, server, and client | ✓ Good |
| Notification log in separate table (not in formLeads) | Multiple logs per lead; log survives lead deletion | ✓ Good |
| Fire-and-forget integrations → now logged in notification_logs | Gap identified and closed in v1.1 | ✓ Good |
| Per-section admin components (replacing monolithic Admin.tsx) | Cleaner dead-code analysis and maintainability | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:next`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-25 after Phase 5 complete (client UTM capture hook)*
