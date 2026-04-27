# mvp

## What This Is

A full-stack platform (public website + admin dashboard) with a dual nature: (1) the production website for MVP — a real service business — and (2) a reusable, forkable base template for building websites for other service businesses (e.g. remodeling, on-demand services). Stack: React 18 + Express + Postgres/Drizzle + Supabase Auth, deployed on Vercel.

## Core Value

Delivers a complete service-business website (service catalog, booking, leads, admin, CRM integrations, and marketing attribution) that runs in production for MVP and serves as a forkable base for new clients.

## Current State (v1.2 shipped 2026-04-27)

v1.2 Marketing Attribution is complete. The admin panel now includes a full Marketing Intelligence section — UTM capture, auto-classification, first/last-touch attribution, conversion tracking, 5-tab dashboard, and per-lead attribution context — all in business-language with no developer jargon. The system accumulates attribution data from the moment of deployment without any user configuration.

**Next:** Define v1.3 via `/gsd:new-milestone`

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
- ✓ Attribution data model — `visitor_sessions` + `attribution_conversions` tables, RLS, IStorage methods — v1.2
- ✓ Attribution API — session upsert, conversion recording, lead-flow IIFE, 5 admin marketing query endpoints — v1.2
- ✓ Client attribution pipeline — `useAttribution` hook, UTM capture, referrer classification, `mvp_vid`, conversion events — v1.2
- ✓ Admin Marketing section — 5-tab dashboard (Overview/Sources/Campaigns/Conversions/Journey), 7-preset date filter, business-first labels — v1.2
- ✓ Visitor Journey tab + Lead attribution panel — Conversions→Journey navigation, `channelLabel()`, `ftLandingPage`+`visitCount` enrichment — v1.2

### Active (v1.3 — TBD)

- [ ] Source/Campaign filter Select options populated dynamically from live data (deferred from v1.2)
- [ ] *(to be defined via `/gsd:new-milestone`)*

### Out of Scope

- Multi-tenant SaaS (multiple businesses on the same deploy) — not this project
- Automatic retry of failed notifications — deferred to a future milestone
- Separate analytics product or external analytics integration — this is embedded in admin
- Real-time traffic tracking / WebSocket dashboards — Vercel Fluid Compute has no persistent connections
- Custom attribution models beyond first-touch and last-touch — future milestone if needed
- Admin.tsx full refactor — deferred; per-section components pattern is established, monolithic core acceptable for now

## Context

**Business Context:**
Real production website for MVP (a service business). Also used as a base template for delivering sites to other clients in the same segment. The business owner needs to understand marketing ROI without technical knowledge.

**Technical Context:**
Monorepo with `client/`, `server/`, `shared/` (source of truth for schemas/types via Drizzle + Zod). Deployed on Vercel (Fluid Compute, Node.js). DB hosted on Supabase (Postgres + Auth + Storage + RLS). v1.2 added `visitor_sessions` + `attribution_conversions` tables and the `admin/marketing/` component tree (5 tab components + shared `utils.ts` with `channelLabel`, `DatePreset`, `MarketingFilters`, `resolveDateRange`, `buildMarketingQueryParams`).

**Admin Architecture:**
Each section lives in `client/src/components/admin/`. Phase 6–7 established the `admin/marketing/` sub-directory pattern — tab components as named exports, shared utilities in `utils.ts`, filter state owned by parent section component. Future admin sections should follow this pattern.

## Constraints

- **Deployment:** Vercel Fluid Compute — no long-running processes, no WebSockets for real-time tracking
- **Database:** Supabase Postgres with RLS — new tables require RLS policies applied manually after `db:push`
- **Schema source of truth:** Drizzle + `shared/schema.ts` — no raw SQL DDL bypassing Drizzle
- **No automated test runner:** Verification is manual + TypeScript compiler
- **Production site:** Changes to booking/lead flows require care; attribution is additive, never replacing existing paths
- **Reusable template:** Avoid MVP-specific coupling; attribution system works for any fork

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth + RLS | Real production demands robust auth | ✓ Good |
| Drizzle + Zod via drizzle-zod as single source of types | Eliminates drift between DB, server, and client | ✓ Good |
| Notification log in separate table (not in formLeads) | Multiple logs per lead; log survives lead deletion | ✓ Good |
| Fire-and-forget integrations → now logged in notification_logs | Gap identified and closed in v1.1 | ✓ Good |
| Per-section admin components (replacing monolithic Admin.tsx) | Cleaner dead-code analysis and maintainability | ✓ Good (v1.2 added Marketing section; pattern proven) |
| `mvp_vid` (localStorage) as visitor identity key | Separate from `formLeads.sessionId`; survives navigation | ✓ Good |
| Attribution writes are fire-and-forget in the lead flow | Attribution failure never blocks lead submission | ✓ Good |
| `visitor_sessions.visitor_id` is UNIQUE (not just indexed) | Required for ON CONFLICT upsert under concurrent Vercel instances | ✓ Good |
| First-touch columns written once (never overwritten) | Preserves original acquisition source even after subsequent visits | ✓ Good |
| `ftLandingPage`/`visitCount` enriched in route handler, not IStorage | Avoids widening IStorage return type for a single consumer | ✓ Good |
| Journey tab entry via Conversions row click (not standalone browser) | No new "list all sessions" API needed; natural discovery flow | ✓ Good |

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
*Last updated: 2026-04-27 after v1.2 Marketing Attribution milestone*
