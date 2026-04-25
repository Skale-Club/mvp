---
phase: 03-attribution-schema-storage
plan: 02
subsystem: storage
tags: [attribution, storage, marketing, typescript]
requires:
  - 03-01
provides:
  - attribution-storage-contract
affects:
  - server/storage.ts
  - shared/marketing-types.ts
tech_stack:
  added: []
  patterns:
    - drizzle-onConflictDoUpdate-first-touch-preservation
    - marketing-query-typed-stubs
    - monotonic-boolean-GREATEST-pattern
key_files:
  created:
    - shared/marketing-types.ts
  modified:
    - server/storage.ts
decisions:
  - linkLeadToVisitor looks up visitor_sessions.id by UUID before updating formLeads; formLeads.visitorId is an integer FK not a UUID text field
  - conversionType requires explicit type assertion in createAttributionConversion because drizzle-zod cannot infer $type<> union — cast is intentional and safe, server validation deferred to Phase 4 routes
metrics:
  duration_minutes: 5
  completed_date: "2026-04-25"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 3 Plan 02: Attribution Storage Layer Summary

**One-liner:** IStorage extended with 8 attribution method signatures, 3 real Drizzle implementations (first-touch-preserving upsert, conversion insert, lead-visitor link), and 5 typed empty stubs for marketing query methods.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create shared/marketing-types.ts | 3a52f39 | shared/marketing-types.ts |
| 2 | Add IStorage + DatabaseStorage attribution methods | f858621 | server/storage.ts |

## What Was Built

### shared/marketing-types.ts (new)

5 TypeScript interfaces for marketing query aggregation results:

- `MarketingFilters` — optional `from`, `to`, `channel`, `campaign` filter parameters accepted by all marketing query methods
- `MarketingOverview` — `totalVisits`, `totalLeads`, `conversionRate`, `topSource`, `topCampaign`, `topLandingPage`, `timeSeries` array
- `MarketingBySource` — per-channel breakdown with `hotLeads`, `warmLeads`, `coldLeads` counts from `form_leads.classificacao`
- `MarketingByCampaign` — per-campaign breakdown with `topLandingPages: string[]`
- `VisitorJourney` — `session: VisitorSession` + `conversions: AttributionConversion[]` for single-visitor detail view

These are NOT Drizzle-derived types — they are aggregation result shapes used by marketing dashboard queries.

### server/storage.ts (extended)

**Imports added:**
- Table objects: `visitorSessions`, `attributionConversions`
- Types: `VisitorSession`, `InsertVisitorSession`, `AttributionConversion`, `InsertAttributionConversion`
- Marketing types: all 5 from `#shared/marketing-types.js`

**IStorage interface — 8 new signatures:**
```typescript
upsertVisitorSession(session: InsertVisitorSession): Promise<VisitorSession>;
createAttributionConversion(conversion: InsertAttributionConversion): Promise<AttributionConversion>;
linkLeadToVisitor(leadId: number, visitorId: string): Promise<void>;
getMarketingOverview(filters?: MarketingFilters): Promise<MarketingOverview>;
getMarketingBySource(filters?: MarketingFilters): Promise<MarketingBySource[]>;
getMarketingByCampaign(filters?: MarketingFilters): Promise<MarketingByCampaign[]>;
getMarketingConversions(filters?: MarketingFilters): Promise<AttributionConversion[]>;
getVisitorJourney(visitorId: string): Promise<VisitorJourney | undefined>;
```

**DatabaseStorage — 3 real implementations:**

1. **`upsertVisitorSession`** — `db.insert(visitorSessions).values(session).onConflictDoUpdate({ target: visitorSessions.visitorId, set: { lt_*, deviceType, lastSeenAt, converted } })`. The set clause explicitly names only last-touch columns. First-touch columns (`ft_*`, `firstSeenAt`) are intentionally omitted — they remain as written by the initial INSERT. The `converted` flag uses `GREATEST(visitor_sessions.converted::int, excluded.converted::int)::boolean` for monotonic behavior.

2. **`createAttributionConversion`** — `db.insert(attributionConversions).values({...conversion, conversionType: cast}).returning()`. Append-only insert. The explicit `conversionType` cast is required because `drizzle-zod` cannot infer `$type<>` union type annotations — the runtime value is correct, only the TypeScript inference needed a nudge.

3. **`linkLeadToVisitor`** — Looks up `visitor_sessions` by UUID to obtain the integer PK, then `db.update(formLeads).set({ visitorId: session.id }).where(eq(formLeads.id, leadId))`. Returns early if session not found (fire-and-forget safe).

**DatabaseStorage — 5 typed stubs (Phase 4 will replace bodies with SQL):**
- `getMarketingOverview` → returns `{ totalVisits: 0, totalLeads: 0, conversionRate: 0, topSource: null, topCampaign: null, topLandingPage: null, timeSeries: [] }`
- `getMarketingBySource` → returns `[]`
- `getMarketingByCampaign` → returns `[]`
- `getMarketingConversions` → returns `[]`
- `getVisitorJourney` → returns `undefined`

## Invariant Verification

- `grep "excluded\.ft_" server/storage.ts` → **0 matches** (first-touch invariant preserved)
- `grep "excluded\.first_seen_at" server/storage.ts` → **0 matches**
- All 9 `excluded.lt_*` references present in upsert set clause
- `GREATEST(visitor_sessions.converted::int, excluded.converted::int)::boolean` monotonic flag confirmed present

## Build Verification

- `npm run check` exits 0 (TypeScript strict mode satisfied)
- `npm run build` exits 0 (Vite client + esbuild server both succeed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] linkLeadToVisitor implementation adapted for integer FK**
- **Found during:** Task 2
- **Issue:** The plan's example implementation for `linkLeadToVisitor` did `db.update(formLeads).set({ visitorId })` treating `visitorId` as a direct value. However, `formLeads.visitorId` is an integer FK referencing `visitorSessions.id` (the serial PK), not a text UUID field. The plan's example had a type mismatch.
- **Fix:** Added a preliminary SELECT of `visitor_sessions.id` by UUID before the UPDATE. If the session is not found (orphaned UUID), the method returns early without updating — safe for fire-and-forget callers.
- **Files modified:** server/storage.ts
- **Commit:** f858621

**2. [Rule 1 - Bug] createAttributionConversion explicit conversionType cast**
- **Found during:** Task 2 (TypeScript error TS2769)
- **Issue:** `InsertAttributionConversion.conversionType` is typed as `string` by drizzle-zod (cannot infer `$type<>` union), but Drizzle's `values()` expects the specific union `'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started'`. TypeScript compilation failed.
- **Fix:** Added explicit `conversionType` cast in the spread: `{ ...conversion, conversionType: conversion.conversionType as 'lead_created' | ... }`. Runtime value is always correct — this is purely a TypeScript inference workaround. Server-side enum validation deferred to Phase 4 route handlers per Plan 01 decision.
- **Files modified:** server/storage.ts
- **Commit:** f858621

## Phase 4 Pointer

Storage methods are now callable from route handlers:

```typescript
// Route handlers can now call:
await storage.upsertVisitorSession({ visitorId: uuid, ftSource: 'google', ... });
await storage.createAttributionConversion({ conversionType: 'lead_created', ... });
await storage.linkLeadToVisitor(leadId, visitorUuid);

// Marketing stubs are safe to call — they return empty data, never throw:
await storage.getMarketingOverview({ from: new Date('2026-01-01') });
await storage.getMarketingBySource();
await storage.getVisitorJourney(visitorUuid); // returns undefined
```

Phase 4 will:
1. Replace marketing stub bodies with `GROUP BY` SQL aggregations
2. Add API routes wiring `storage.upsertVisitorSession` / `storage.createAttributionConversion` / `storage.linkLeadToVisitor` to the lead flow
3. Apply server-side enum validation for `conversionType` at the route layer

## Known Stubs

The 5 marketing query methods return typed zero-state. This is intentional — Phase 4 implements the SQL. None of these stubs prevent Plan 02's goal (storage contract established); they are documented stubs, not accidental gaps.

## Self-Check: PASSED
