---
phase: 04-server-routes-lead-flow-integration
plan: 03
subsystem: api
tags: [attribution, marketing, analytics, lead-flow, postgres, drizzle]

requires:
  - phase: 04-01
    provides: linkLeadToVisitor returns Promise<number|null>; formLeadProgressSchema.visitorId added
  - phase: 04-02
    provides: registerAttributionRoutes wired; /api/attribution/session and /api/attribution/conversion endpoints live

provides:
  - Attribution IIFE in POST /api/form-leads/progress that stamps ft/lt columns on form_leads and creates lead_created conversion row
  - Five real SQL implementations replacing DatabaseStorage marketing query stubs
  - server/routes/marketing.ts with five admin GET endpoints (overview, sources, campaigns, conversions, journey)
  - registerMarketingRoutes(app, requireAdmin) wired into server/routes.ts

affects: [05-client-utm-hook, DASH-02, DASH-03, DASH-04, DASH-06]

tech-stack:
  added: []
  patterns:
    - "Fire-and-forget attribution IIFE: guarded by lead.formCompleto && parsed.visitorId; failure logs to console.error and never blocks 200"
    - "30-day default date window enforced at both route layer (buildFilters) and storage layer (method defaults) — defense in depth"
    - "English enum values for classificacao: HOT/WARM/COLD (schema uses English, not Portuguese)"

key-files:
  created:
    - server/routes/marketing.ts
  modified:
    - server/routes/leads.ts
    - server/storage.ts
    - server/routes.ts

key-decisions:
  - "English enum values used for classificacao (HOT/WARM/COLD) — plan research said Portuguese but schema was implemented with English in Phase 3"
  - "updateFormLead Pick type extended to include attribution fields (firstTouchSource etc.) — required for IIFE to stamp ft/lt columns"
  - "VisitorJourney implemented as { session, conversions } — matches the actual shared/marketing-types.ts interface, not the plan's alternative description"

patterns-established:
  - "Pattern: attribution IIFE always checks lead.formCompleto before firing (ATTR-03 — only fire-and-forget on form-complete leads)"

requirements-completed: [ATTR-03, ATTR-04, CONV-01]

duration: 15min
completed: 2026-04-25
---

# Phase 04 Plan 03: Lead Flow Attribution IIFE + Marketing Endpoints Summary

**Fire-and-forget attribution IIFE wired into lead progress endpoint; five DatabaseStorage marketing stubs replaced with real GROUP BY SQL; five admin marketing endpoints live behind requireAdmin.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-25T21:04:00Z
- **Completed:** 2026-04-25T21:17:00Z
- **Tasks:** 3 completed
- **Files modified:** 4

## Accomplishments

- Lead submit path now stamps `firstTouchSource`, `firstTouchMedium`, `firstTouchCampaign`, `lastTouchSource`, `lastTouchMedium`, `lastTouchCampaign`, `sourceChannel`, `utmContent`, `utmTerm` on form_leads and creates a `lead_created` attribution_conversions row — all in a fire-and-forget IIFE that never blocks the 200 response
- All five `DatabaseStorage` marketing query methods replaced with real Drizzle/SQL aggregations including date-range defaults, GROUP BY, and FILTER clauses
- `server/routes/marketing.ts` created with five admin-only GET endpoints that parse query filters via Zod and enforce the 30-day default window

## Task Commits

1. **Task 1: Attribution IIFE in lead progress handler** - `36d0eae` (feat)
2. **Task 2: Real SQL for five marketing query stubs** - `ed773d0` (feat)
3. **Task 3: Marketing route module + wiring** - `cba3ae5` (feat)

## Files Created/Modified

- `server/routes/leads.ts` — Added db/eq/visitorSessions imports; attribution IIFE block starting at `if (lead.formCompleto && parsed.visitorId)` calls linkLeadToVisitor → stamps form_leads → createAttributionConversion
- `server/storage.ts` — Extended `updateFormLead` Pick type to include attribution fields; replaced five marketing stub methods with real SQL (getMarketingOverview, getMarketingBySource, getMarketingByCampaign, getMarketingConversions, getVisitorJourney)
- `server/routes/marketing.ts` — New file: 89 lines, exports `registerMarketingRoutes(app, requireAdmin)`, 5 endpoints: GET /api/admin/marketing/{overview,sources,campaigns,conversions,journey}
- `server/routes.ts` — Added import + `registerMarketingRoutes(app, requireAdmin)` call after registerAttributionRoutes

## DatabaseStorage Marketing Method SQL Summary

| Method | SQL Shape |
|--------|-----------|
| `getMarketingOverview` | count(*) visits + leads; top source/campaign/landing page with DESC; time series per day with date_trunc |
| `getMarketingBySource` | GROUP BY ftSourceChannel; left join form_leads for HOT/WARM/COLD counts via FILTER clause |
| `getMarketingByCampaign` | GROUP BY ftCampaign + ftSource + ftSourceChannel; array_agg for top landing pages (slice to 3) |
| `getMarketingConversions` | SELECT * FROM attribution_conversions ORDER BY convertedAt DESC LIMIT 500 |
| `getVisitorJourney` | SELECT visitor_sessions by UUID; SELECT attribution_conversions by integer PK; return { session, conversions } |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] English enum values for classificacao instead of Portuguese**

- **Found during:** Task 2
- **Issue:** Plan's Pitfall 2 specified Portuguese enum values `'quente'`/`'morno'`/`'frio'`, but Phase 3 implementation used English `'HOT'`/`'WARM'`/`'COLD'` in the pgEnum definition
- **Fix:** Used `'HOT'`/`'WARM'`/`'COLD'` in all FILTER clauses to match the actual schema
- **Files modified:** server/storage.ts

**2. [Rule 2 - Missing functionality] Extended updateFormLead type to include attribution fields**

- **Found during:** Task 1
- **Issue:** `updateFormLead` Partial Pick type only accepted 6 fields (`status`, `observacoes`, `notificacaoEnviada`, `notificacaoAbandonoEnviada`, `ghlContactId`, `ghlSyncStatus`); attribution stamping needed `firstTouchSource` etc.
- **Fix:** Extended both the IStorage interface signature and DatabaseStorage implementation to include all 9 attribution fields
- **Files modified:** server/storage.ts

**3. [Rule 1 - Bug] VisitorJourney shape matches actual interface, not plan's alternative description**

- **Found during:** Task 2
- **Issue:** Plan described VisitorJourney as `{ visitorId, firstSource, pagesVisited, closingConversion }` but the actual `shared/marketing-types.ts` (created in Phase 3) defines it as `{ session: VisitorSession; conversions: AttributionConversion[] }`
- **Fix:** Implemented getVisitorJourney to return `{ session, conversions }` matching the actual interface
- **Files modified:** server/storage.ts

## Phase 4 Closeout Note

All Phase 4 (04-server-routes-lead-flow-integration) requirements are now wired:
- **04-01**: Schema extensions + linkLeadToVisitor signature change
- **04-02**: Attribution public endpoints (/api/attribution/session, /api/attribution/conversion, /api/analytics/hit visitorId extension)
- **04-03**: Lead flow IIFE + marketing admin endpoints + real SQL

Requirements ATTR-03, ATTR-04, CONV-01 fulfilled by this plan. CONV-02 through CONV-05 fulfilled by Plans 01 and 02.

Phase 5 (client UTM hook + mvp_vid localStorage) can now begin.

## Self-Check: PASSED

- server/routes/marketing.ts exists: YES (created by Task 3)
- server/routes/leads.ts has attribution IIFE: YES (36d0eae)
- server/storage.ts has real SQL methods: YES (ed773d0)
- server/routes.ts has registerMarketingRoutes call: YES (cba3ae5)
- npm run check exits 0: VERIFIED
- npm run build exits 0: VERIFIED
