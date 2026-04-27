---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Marketing Attribution
status: verifying
last_updated: "2026-04-27T18:29:06.356Z"
last_activity: 2026-04-25
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 12
  completed_plans: 9
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-25)

**Core value:** Production service-business site for MVP + forkable base template for other clients.
**Current focus:** Phase 06 — marketing-admin-dashboard

## Current Position

Phase: 06 (marketing-admin-dashboard) — EXECUTING
Plan: 2 of 4
Status: Executing Phase 06 — Plan 01 complete, Plans 02-04 pending
Last activity: 2026-04-27 -- Phase 06 Plan 01 complete (MarketingSection shell)

Progress: [████████░░] 75% (9/12 plans complete)

## Performance Metrics

**Velocity:**

- Total plans completed (v1.2): 1
- Average duration: 30 min
- Total execution time: 30 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 03 | 1/2 | 30 min | 30 min |

**Recent Trend:** 1 plan completed (03-01 schema + DDL + RLS).

*Updated after each plan completion*
| Phase 03 P02 | 5 | 2 tasks | 2 files |
| Phase 04 P01 | 15 | 2 tasks | 2 files |
| Phase 05 P03 | 10 | 2 tasks | 5 files |
| Phase 05 P02 | 20 min | 2 tasks | 2 files |
| Phase 06 P01 | 25 | 3 tasks | 5 files |

## Accumulated Context

### Decisions (Phase 06 Plan 01)

| Decision | Phase | Impact |
|----------|-------|--------|
| Source/campaign Select options arrays start empty in Plan 01; Plans 02-04 will lift populated options from Overview tab data | 06-01 | Avoids premature data fetching in the scaffold plan; Plan 02 can add lifted state |
| ALL_VALUE = '__all__' sentinel required because Radix Select rejects empty-string values | 06-01 | Documented inline — all Phase 6 tab Selects must use this sentinel |
| Tab placeholders wrap in TabsContent with correct value= attributes | 06-01 | Plans 02-04 only need to swap inner children, not restructure the Tabs tree |

### Decisions (Phase 05 Plan 02)

| Decision | Phase | Impact |
|----------|-------|--------|
| reportAttributionPageView added to [location, visitorId] effect (not a new effect) | 05-02 | Keeps hook count minimal; visitorId dep keeps react-hooks/exhaustive-deps clean |
| getStoredVisitorId used in LeadFormModal instead of useAttribution hook | 05-02 | Per D-13/D-18: avoids re-mounting hook in nested form component; mvp_vid is written synchronously before form opens |

### Decisions (Phase 05 Plan 03)

| Decision | Phase | Impact |
|----------|-------|--------|
| Inline arrow body expansion chosen over extracting a helper | 05-03 | Plan specified surgical 5-line edits; no refactor, no new abstractions |
| fireConversionEvent called before setIsFormOpen(true) in all callsites | 05-03 | Conversion recorded even if a future bug prevents the modal from opening |

### Decisions (Phase 05 Plan 01)

| Decision | Phase | Impact |
|----------|-------|--------|
| SEARCH_HOSTS / SOCIAL_HOSTS exported as module constants | 05-01 | Tests and maintenance can verify the lists without duplicating them |
| MVP_VID_KEY not re-imported into the hook | 05-01 | Literal 'mvp_vid' appears exactly once in the codebase (attribution.ts:25) |
| Effect B dependency array is [location, visitorId] | 05-01 | Effect B re-runs when visitorId becomes non-null so no first navigation is missed |
| stripUndefined inline in hook (not in attribution.ts) | 05-01 | Keeps attribution.ts as pure data-posting utilities; schema filtering is hook glue |

### Decisions (Phase 04 Plan 03)

| Decision | Phase | Impact |
|----------|-------|--------|
| English enum HOT/WARM/COLD used for classificacao — plan research said Portuguese but Phase 3 schema used English | 04-03 | getMarketingBySource FILTER clauses use 'HOT'/'WARM'/'COLD' matching the actual pgEnum values |
| updateFormLead Pick type extended to include attribution fields (firstTouchSource etc.) | 04-03 | IIFE can stamp ft/lt columns on form_leads via existing storage method |
| VisitorJourney returns { session, conversions } matching actual shared/marketing-types.ts interface | 04-03 | getVisitorJourney returns VisitorSession + AttributionConversion[] array (not pagesVisited/closingConversion) |

### Decisions (Phase 04 Plan 02)

| Decision | Phase | Impact |
|----------|-------|--------|
| attribution.ts silences all non-Zod errors with 200 {} — attribution never blocks the client | 04-02 | D-06/D-09: public attribution endpoints cannot surface 500 to client |
| forceStore bypass in /api/analytics/hit stores hits regardless of analytics destination config | 04-02 | CONV-05: page_view rows accumulate for journey view even when GA4/Facebook/GHL disabled |
| conversion endpoint denormalizes ft_*/lt_* from visitor_sessions at insert time | 04-02 | Dashboard aggregates on attribution_conversions without needing a visitor_sessions join |

### Decisions (Phase 04 Plan 01)

| Decision | Phase | Impact |
|----------|-------|--------|
| visitorId on analyticsEventHits is nullable text column (not a join) | 04-01 | analytics_event_hits.session_id is form UUID, not mvp_vid — cannot join; column needed |
| linkLeadToVisitor returns number|null (not void) | 04-01 | Lead-flow IIFE passes resolved integer directly to createAttributionConversion — no second DB query |
| db:push requires manual run (DATABASE_URL not in agent shell) | 04-01 | User must run npm run db:push before analytics_event_hits.visitor_id column exists in Postgres |

### Decisions (Phase 03 Plan 02)

| Decision | Phase | Impact |
|----------|-------|--------|
| linkLeadToVisitor does UUID lookup then integer FK update | 03-02 | formLeads.visitorId is integer FK to visitorSessions.id; plan example assumed text UUID but schema uses integer |
| createAttributionConversion uses explicit conversionType cast | 03-02 | drizzle-zod cannot infer $type<> union; cast is TypeScript-only, runtime value is always correct |

### Decisions (Phase 03 Plan 01)

| Decision | Phase | Impact |
|----------|-------|--------|
| FK columns for visitor_sessions references use integer (not uuid) targeting serial PK | 03-01 | Avoids PostgreSQL type mismatch; matches notificationLogs.leadId convention |
| conversionType uses text + $type<> annotation, not pgEnum | 03-01 | drizzle-zod cannot infer $type<>(); server enum validation deferred to Phase 4 routes |

### Decisions (Carried from v1.1)

| Decision | Phase | Impact |
|----------|-------|--------|
| Notification log in a new table (not in formLeads) | v1.1 Phase 1 | Multiple logs per lead; log survives lead deletion |
| FK notification_logs.lead_id ON DELETE SET NULL | v1.1 01-01 | Logs survive lead deletion — query sites must handle leadId = null |
| Optional logContext param on integration functions | v1.1 01-02 | Legacy callers compileable; untouched callers log without leadId |
| Pre-flight skips not logged | v1.1 01-02 | Only actual send attempts produce rows |
| Read-only notification API in v1.1 | v1.1 01-03 | No POST/PATCH/DELETE for logs — resend/delete deferred |
| Single global fetch (limit 500) + client-side reduce for per-lead icons | v1.1 01-04 | 1 request vs N+1; revisit when logs exceed ~500/day |

### Key Architectural Constraints (v1.2)

- `visitor_sessions.visitor_id` must be UNIQUE (not just indexed) — ON CONFLICT upsert requires it
- First-touch columns written once on insert; Drizzle updates must name lt_* columns explicitly, never spread full UTM object
- UTM capture in App root useEffect with `[]` — never in route components (Wouter destroys URL params on navigation)
- `mvp_vid` (localStorage) is the visitor identity key — separate from existing `formLeads.sessionId`
- Attribution writes in the lead flow are fire-and-forget — wrapped in try/catch, never await in critical path
- RLS policies must be applied manually after each `db:push` (not automated by Drizzle)
- Dashboard aggregate queries use `attribution_conversions` (denormalized); reserve `visitor_sessions` joins for journey view only
- Server enforces default date range (30 days) on all marketing queries to prevent unbounded table scans

### Deferred Issues (Carried from v1.1)

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Refactor of monolithic Admin.tsx | v1.1 | L | v1.3+ |
| Resend failed notifications via UI | v1.1 | M | v1.3 if recurring failures |
| Retention/TTL for notification logs | v1.1 | S | When table grows |
| Drizzle journal / standard migration workflow | v1.1 | M | Before frequent schema changes |
| Server-side aggregation for per-lead last-by-channel | v1.1 | M | When log volume > ~500/day |

### Blockers/Concerns

None.

---
*STATE.md — Updated after every significant action*
