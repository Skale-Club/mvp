# mvp

## What This Is

A full-stack platform (public website + admin dashboard) with a dual nature: (1) the production website for MVP — a real service business — and (2) a reusable, forkable base template for building websites for other service businesses (e.g. remodeling, on-demand services, marketing). Stack: React 18 + Express + Postgres/Drizzle + Supabase Auth, deployed on Vercel.

## Core Value

Delivers a complete service-business website (service catalog, booking, leads, admin, CRM integrations) that runs in production for MVP and serves as a forkable base for new clients.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application (full-stack web) |
| Version | 1.0.x (production) |
| Status | Production |
| Last Updated | 2026-04-15 |

## Requirements

### Core Features

- Public service catalog by category/subcategory with cart and time-slot booking
- Lead capture with scoring, classification (HOT/WARM/COLD) and abandonment sweep
- Admin dashboard for content management (services, blog, gallery, FAQs, reviews, team)
- AI chat (OpenAI) and multi-channel notification integrations (Twilio SMS, Resend email, GoHighLevel CRM)
- SEO, branding and integration configuration via admin (no redeploy required)
- Reusable template — forkable and customizable for other service businesses

### Validated (Shipped)

- [x] Service catalog and booking flow — v1.0
- [x] Lead system with scoring and classification — v1.0
- [x] Admin dashboard (website, company, SEO, leads, FAQs, chat, integrations, blog, gallery, services, reviews, users) — v1.0
- [x] Twilio + Resend + GoHighLevel integrations — v1.0
- [x] Supabase Auth with RLS — v1.0
- [x] Batch upload with controlled concurrency (gallery) — commit cbdc300
- [x] Sitemap + robots + SEO injection — v1.0

### Active (In Progress)

- [ ] Refactor of monolithic `client/src/pages/Admin.tsx` into per-section components (partial — see docs/ADMIN_REFACTOR_PLAN.md)
- [ ] Docs alignment (CLAUDE.md, README.md, AGENTS.md) to reflect the dual nature — v1.1 Phase 2

### Validated (Shipped — v1.1 Phase 1)

- [x] Notification log per lead (SMS/Email/GHL) with preview and recipient — v1.1.0

### Out of Scope (v1.1)

- Multi-tenant SaaS (multiple businesses on the same deploy) — not this project
- Automatic retry of failed notifications — deferred to a future milestone

## Target Users

**Primary:** End customers of MVP (service consumers) browsing the public site, booking and completing leads.

**Secondary:** MVP admins (daily operations via dashboard) and developers forking the repo to build sites for new service businesses.

## Context

**Business Context:**
Real production website for MVP (a service business). Also used as a base template for delivering sites to other clients in the same segment.

**Technical Context:**
Monorepo with `client/`, `server/`, `shared/` (source of truth for schemas/types via Drizzle + Zod). Deployed on Vercel (Fluid Compute, Node.js). DB hosted on Supabase (Postgres + Auth + Storage + RLS). Integrations are fire-and-forget today (no logging or retry).

## Constraints

### Technical Constraints

- Vercel deployment target (serverless / Fluid Compute functions)
- Supabase as auth and storage provider (RLS required on public tables)
- Drizzle ORM + `shared/schema.ts` is the type source of truth
- No automated test runner — verification is manual

### Business Constraints

- MVP production site — changes to critical features (booking, leads) require care and easy rollback
- Reusable template — avoid MVP-specific coupling that would hurt forkability

### Compliance Constraints

- RLS enabled on all public Supabase tables
- No committed secrets — `.env` locally and Vercel env for production

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Supabase Auth + RLS instead of Replit Auth | Real production demands robust auth and integrated storage | 2026-Q1 | Active |
| Drizzle + Zod via `drizzle-zod` as single source of types | Eliminates drift between DB, server, and client | 2026-Q1 | Active |
| Fire-and-forget integrations (no log) | Initial choice; gap identified for v1.1 | 2026-Q1 | Superseded (v1.1 adds logging) |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Notifications with auditable log | 100% of sends (SMS/Email/GHL) | 100% (Phase 1 shipped) | Achieved |
| Regressions in critical flows (booking/lead) | 0 per release | — | On track |
| Forkability (time to customize for a new client) | <1 day | — | Not measured |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 18 + TypeScript + Vite | SPA served by the server |
| Client routing | Wouter | Lightweight, low overhead |
| Server state | TanStack React Query | Cache + invalidation |
| UI | Tailwind CSS + shadcn/ui (Radix) | Accessible primitives |
| Backend | Express + TypeScript | Modular `server/routes/` |
| ORM | Drizzle | `shared/schema.ts` single source |
| Database | Postgres (Supabase) | RLS enabled |
| Auth | Supabase Auth | Session + admin gating |
| Storage | Supabase Storage | Gallery, uploads |
| CRM | GoHighLevel | Lead sync |
| SMS | Twilio | Admin notifications |
| Email | Resend | Admin notifications |
| AI | OpenAI | Site chat |
| Deploy | Vercel | Fluid Compute |

## Links

| Resource | URL |
|----------|-----|
| Repository | (local) c:\Users\Vanildo\Dev\mvp |
| Production | TBD |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-04-15*
