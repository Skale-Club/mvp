# Roadmap: mvp

## Milestones

- ✅ **v1.0 Initial Production Release** - Phases 1-N (shipped 2026-Q1, pre-GSD)
- ✅ **v1.1 Notification Log + Docs Alignment** - Phases 1-2 (shipped 2026-04-16)
- 🚧 **v1.2 Marketing Attribution** - Phases 3-7 (in progress)

---

<details>
<summary>✅ v1.0 + v1.1 (Phases 1-2) — SHIPPED</summary>

### Phase 1: Notification Infrastructure (v1.1)
**Goal**: Every outbound notification is logged with recipient, preview, status, and trigger
**Plans**: Complete

### Phase 2: Notification Admin UI + Docs (v1.1)
**Goal**: Admin can view and filter notification logs; project docs reflect dual nature
**Plans**: Complete

</details>

---

## 🚧 v1.2 Marketing Attribution (In Progress)

**Milestone Goal:** Add a Marketing Intelligence section to the admin panel — UTM capture, traffic auto-classification, first/last-touch attribution, and conversion tracking — so the business owner can understand which campaigns and sources are generating real leads.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Phases execute in numeric order: 3 → 4 → 5 → 6 → 7

- [x] **Phase 3: Attribution Schema + Storage** - New DB tables, IStorage methods, and RLS policies that form the attribution foundation (completed 2026-04-25)
- [x] **Phase 4: Server Routes + Lead Flow Integration** - Attribution API endpoints and non-blocking injection into the existing lead submit path (completed 2026-04-25)
- [ ] **Phase 5: Client UTM Capture Hook** - useAttribution hook at App root, visitorId persistence, page view events, and form payload enrichment
- [ ] **Phase 6: Marketing Admin Dashboard** - MarketingSection.tsx with Overview, Sources, Campaigns, and Conversions tabs plus global filters
- [ ] **Phase 7: Visitor Journey + Lead Attribution Panel** - Journey tab for per-visitor page sequences and attribution panel in the existing Lead detail drawer

## Phase Details

### Phase 3: Attribution Schema + Storage
**Goal**: The attribution data model exists in the database with correct first-touch preservation semantics, indexes, and RLS policies applied
**Depends on**: Phase 2 (v1.1 complete)
**Requirements**: SESSION-04, SESSION-05, ATTR-01, ATTR-02
**Success Criteria** (what must be TRUE):
  1. `visitor_sessions` and `attribution_conversions` tables exist in Postgres with all defined columns and indexes (verifiable via Supabase table inspector)
  2. `visitor_sessions` has a UNIQUE constraint on `visitor_id` so upserts never duplicate rows under concurrent Vercel instances
  3. `form_leads` has a new `visitor_id` column and the full set of attribution columns defined in ATTR-04 (checked via `\d form_leads` or schema diff)
  4. RLS policies are applied manually after `db:push` — public INSERT allowed, authenticated SELECT/UPDATE for admin (verified in Supabase Authentication > Policies)
  5. IStorage attribution methods are defined and implemented: `upsertVisitorSession`, `createAttributionConversion`, `linkLeadToVisitor`, and the five marketing query methods
**Plans**: 2 plans
- [x] 03-01-PLAN.md — Schema additions: visitor_sessions table, attribution_conversions table, form_leads attribution columns, db:push, manual RLS
- [x] 03-02-PLAN.md — IStorage interface methods + DatabaseStorage implementations (upsertVisitorSession with first-touch preservation, createAttributionConversion, linkLeadToVisitor, 5 marketing query stubs) + shared/marketing-types.ts

### Phase 4: Server Routes + Lead Flow Integration
**Goal**: Attribution data begins accumulating in the database — session upserts, conversion records, and lead-visitor linking work end-to-end via API, with zero risk to the existing lead submit path
**Depends on**: Phase 3
**Requirements**: ATTR-03, ATTR-04, CONV-01, CONV-02, CONV-03, CONV-04, CONV-05
**Success Criteria** (what must be TRUE):
  1. `POST /api/attribution/session` accepts a session payload and upserts a `visitor_sessions` row without blocking any user-facing request
  2. `POST /api/attribution/conversion` records a conversion event (lead, phone click, form submit, booking, page view) linked to a visitor session
  3. When a lead is created via the existing `POST /api/form-leads/progress` endpoint, the lead's `visitor_id` is stamped and an attribution conversion row is written — and a failure in this attribution block never causes the lead submit to return an error
  4. All five admin marketing query endpoints exist and return structured data (verifiable with curl or Postman against a running dev server)
  5. `shared/routes.ts` and `shared/schema.ts` define the new attribution types consumed by both server and client with no TypeScript errors (`npm run check` passes)
**Plans**: 3 plans
- [x] 04-01-PLAN.md — Schema prep: visitorId on formLeadProgressSchema + analytics_event_hits.visitor_id column + linkLeadToVisitor returns Promise<number | null> + db:push
- [x] 04-02-PLAN.md — New POST /api/attribution/session and /api/attribution/conversion (public, in server/routes/attribution.ts) and extend /api/analytics/hit to persist visitorId
- [x] 04-03-PLAN.md — Lead-flow attribution IIFE (ATTR-03/ATTR-04/CONV-01) + replace 5 marketing query stubs with real SQL + new admin /api/admin/marketing/* endpoints
**UI hint**: no

### Phase 5: Client UTM Capture Hook
**Goal**: The full attribution pipeline is live in the browser — every visitor's UTM parameters and traffic source are captured on first load, persisted across navigations, and sent to the server before any form submission
**Depends on**: Phase 4
**Requirements**: SESSION-01, SESSION-02, SESSION-03
**Success Criteria** (what must be TRUE):
  1. On any page load with `?utm_source=X` in the URL, a `visitor_sessions` row is created server-side with the correct UTM values — even after the user navigates to another page via Wouter (params are captured at App root mount, not in route components)
  2. When no UTM params are present, `document.referrer` is classified into Organic Search, Social, Referral, Direct, or Unknown — and the classification is stored in `visitor_sessions.ft_source`
  3. `localStorage` key `mvp_vid` persists across page reloads and browser restarts, is distinct from `formLeads.sessionId`, and the same visitorId is sent with every session ping
  4. Submitting the lead form passes `visitorId` in the payload so the server can link the lead record to the visitor session (verifiable by checking `form_leads.visitor_id` is populated after a test submission)
**Plans**: 3 plans
- [x] 05-01-PLAN.md — Foundation: client/src/lib/attribution.ts utility module + client/src/hooks/use-attribution.ts hook (mvp_vid persistence, UTM capture, referrer classification, sendBeacon helpers)
- [ ] 05-02-PLAN.md — Wire useAttribution into App.tsx (single root call + reportAttributionPageView in [location] effect) and inject visitorId into the LeadFormModal payload before /api/form-leads/progress POST
- [ ] 05-03-PLAN.md — Wire conversion events: fireConversionEvent('phone_click') on every Navbar tel: link and fireConversionEvent('booking_started') on every setIsFormOpen(true) callsite (StickyBottomBar, Home, ServiceDetails, BlogPost)

### Phase 6: Marketing Admin Dashboard
**Goal**: The admin panel has a fully functional "Marketing" section with four data tabs, global filters, business-first language throughout, and useful empty states that coach the user when no data exists
**Depends on**: Phase 5
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-07, DASH-08, FILTER-01, FILTER-02, FILTER-03, FILTER-04
**Success Criteria** (what must be TRUE):
  1. "Marketing" appears in the admin sidebar navigation and clicking it loads the Marketing section component
  2. The Overview tab displays total visits, leads generated, overall conversion rate, top source, top campaign, top landing page, and a time-series chart — all filtered by the selected date range
  3. The Sources tab groups traffic by channel (Organic Search, Paid Ads, Social Media, Referral, Direct, Unknown) with visits, leads, lead quality breakdown (HOT/WARM/COLD), and conversion rate per channel
  4. The Campaigns tab lists each unique campaign with source, channel, visits, leads, conversion rate, and top landing pages — sortable and filtered by the global filter state
  5. The Conversions tab lists recent conversion events with business-language labels ("Lead Created", "Phone Call", "Form Submitted", "Booking Started") — no developer jargon anywhere in the section
  6. Date range filter (Today / Last 7 days / Last 30 days / This month / Custom picker) and source/campaign/conversion-type filters all update all visible tab data without a page reload
  7. Every tab shows a coach-mark empty state with a clear explanation when no data matches the current filters
**Plans**: TBD
**UI hint**: yes

### Phase 7: Visitor Journey + Lead Attribution Panel
**Goal**: Admins can trace a single visitor's complete page-by-page journey and view attribution context directly on any lead detail — connecting marketing data to revenue outcomes in plain business language
**Depends on**: Phase 6
**Requirements**: DASH-06, LEADATTR-01, LEADATTR-02
**Success Criteria** (what must be TRUE):
  1. The Journey tab in the Marketing section shows — for a selected visitor session — the ordered list of pages visited, first traffic source, and the conversion event that closed the journey
  2. The Lead detail drawer in the existing Leads section includes an attribution summary panel showing: first source, last source, campaign name, landing page, and number of visits before conversion
  3. The attribution panel on a lead uses business-language channel labels ("Paid Ads", "Organic Search", "Social Media", "Direct") — no utm_ field names visible
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:** 3 → 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Notification Infrastructure | v1.1 | — | Complete | 2026-04-16 |
| 2. Notification Admin UI + Docs | v1.1 | — | Complete | 2026-04-16 |
| 3. Attribution Schema + Storage | v1.2 | 2/2 | Complete    | 2026-04-25 |
| 4. Server Routes + Lead Flow Integration | v1.2 | 3/3 | Complete    | 2026-04-25 |
| 5. Client UTM Capture Hook | v1.2 | 1/3 | In progress | - |
| 6. Marketing Admin Dashboard | v1.2 | 0/? | Not started | - |
| 7. Visitor Journey + Lead Attribution Panel | v1.2 | 0/? | Not started | - |
