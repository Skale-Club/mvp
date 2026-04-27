---
phase: 07-visitor-journey-lead-attribution-panel
plan: "01"
subsystem: marketing-attribution
tags: [server-enrichment, drizzle-orm, left-join, route-handler, utility]
dependency_graph:
  requires: []
  provides:
    - "getMarketingConversions returns visitorUuid per row (Plan 07-02 consumes)"
    - "GET /api/form-leads returns ftLandingPage + visitCount per row (Plan 07-03 consumes)"
    - "channelLabel() shared utility in marketing/utils.ts (Plans 07-02 and 07-03 consume)"
  affects:
    - "server/storage.ts IStorage interface (getMarketingConversions return type widened)"
    - "server/routes/leads.ts GET /api/form-leads response shape extended"
tech_stack:
  added: []
  patterns:
    - "getTableColumns() from drizzle-orm 0.39.x for spreading all columns in a custom select"
    - "leftJoin in Drizzle ORM to preserve rows with deleted visitor sessions (visitorUuid = null)"
    - "Route-layer batch enrichment pattern (2 queries post-listFormLeads, not IStorage change)"
    - "'page_view' as any cast to bypass TS-only $type<> union on attributionConversions.conversionType"
key_files:
  modified:
    - path: "server/storage.ts"
      change: "getTableColumns import, getMarketingConversions LEFT JOIN + visitorUuid, IStorage interface widened"
    - path: "server/routes/leads.ts"
      change: "attributionConversions import, drizzle-orm imports extended, GET /api/form-leads enrichment block added"
    - path: "client/src/components/admin/marketing/utils.ts"
      change: "channelLabel() function appended as named export"
decisions:
  - "getTableColumns from drizzle-orm 0.39.x works correctly — confirmed at pinned version ^0.39.3"
  - "listFormLeads enrichment kept in route handler (not storage) per Pitfall 5 — avoids widening IStorage return type and forcing every caller to handle the wider type"
  - "'page_view' as any cast required — same pattern as Phase 06-04 (conversionType is TS union but DB stores plain text 'page_view')"
  - "leftJoin used (not inner join) per Pitfall 3 — attributionConversions.visitorId is nullable with onDelete: set null; inner join would silently drop rows whose session was deleted"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-27"
  tasks_completed: 3
  files_modified: 3
---

# Phase 7 Plan 01: Data Foundation — visitorUuid, ftLandingPage, visitCount, channelLabel Summary

Server-side LEFT JOIN adds `visitorUuid` to conversions API, route-layer batch enrichment adds `ftLandingPage`+`visitCount` to leads API, and `channelLabel()` utility maps raw source values to business-language labels per D-15/D-16.

## What Was Built

Three independent enrichments that Wave 2 UI plans (07-02 Journey tab and 07-03 lead attribution panel) consume directly:

### Task 1 — getMarketingConversions LEFT JOIN (server/storage.ts)

- Added `getTableColumns` to the drizzle-orm import line
- Replaced `db.select()` with `db.select({ ...getTableColumns(attributionConversions), visitorUuid: visitorSessions.visitorId })`
- Added `.leftJoin(visitorSessions, eq(attributionConversions.visitorId, visitorSessions.id))`
- Updated both the `IStorage` interface (line 517) and the `DatabaseStorage` implementation (line 1864) to return `Array<AttributionConversion & { visitorUuid: string | null }>`

**Commit:** `245d705`

### Task 2 — GET /api/form-leads Enrichment (server/routes/leads.ts)

- Extended schema import to include `attributionConversions`
- Extended drizzle-orm import to include `inArray`, `sql`, `and` (alongside existing `eq`)
- Added post-`listFormLeads` enrichment block to GET /api/form-leads handler (lines 363–406)
- Two-query batch pattern: one `inArray` select for `ftLandingPage` from `visitor_sessions`, one grouped `count(*)::int` for `page_view` rows from `attribution_conversions`
- Leads with `visitorId = null` get `ftLandingPage: null` and `visitCount: 0`
- `IStorage.listFormLeads` signature untouched (still `Promise<FormLead[]>`)

**New handler line range:** ~350–414 (original 350–369 expanded to 350–414)

**Commit:** `112cc31`

### Task 3 — channelLabel() Utility (client/src/components/admin/marketing/utils.ts)

- Appended `channelLabel(source: string | null | undefined): string` as a named export after `buildMarketingQueryParams`
- Maps: `organic_search` → `"Organic Search"`, `paid_search`/`paid_ads` → `"Paid Ads"`, `social` → `"Social Media"`, `referral` → `"Referral"`, `direct` → `"Direct"`, everything else → `"Unknown"`
- Case-insensitive (`.toLowerCase().trim()`), null/undefined/empty handled with early returns

**Commit:** `037ca32`

## Key Technical Notes

**getTableColumns() worked correctly at ^0.39.3.** No issues. The spread syntax `...getTableColumns(attributionConversions)` produces all columns of the table without naming them individually, and Drizzle's type inference correctly augments the result with `{ visitorUuid: string | null }`.

**`'page_view' as any` was required.** The `conversionType` column is declared as `text("conversion_type").$type<'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started'>()` in the schema. The `$type<>` annotation is TypeScript-only — the DB column stores plain `page_view` strings. The `as any` cast is the same pattern used in Plan 06-04 (`"Widen allConversions conversionType to string via Omit+intersection cast"` decision in STATE.md).

**LEFT JOIN rationale:** `attributionConversions.visitorId` is nullable with `onDelete: 'set null'`. An INNER JOIN would drop conversion rows whose visitor_sessions row was subsequently deleted. LEFT JOIN preserves all conversion rows with `visitorUuid = null` for deleted sessions.

**Route-handler enrichment rationale:** Keeping the enrichment in `server/routes/leads.ts` (not `server/storage.ts` `listFormLeads`) avoids widening the `IStorage.listFormLeads` return type. If storage returned `Array<FormLead & { ftLandingPage: string | null; visitCount: number }>`, every caller of `listFormLeads` would need to handle the wider type. The route-layer approach isolates the change to the single HTTP handler that needs it.

## Deviations from Plan

None — plan executed exactly as written.

Note: The worktree required a `git merge main` at execution start to bring in Phase 6 changes (marketing directory with utils.ts). This is normal worktree setup, not a deviation from the plan.

## Self-Check: PASSED

Files exist:
- `server/storage.ts` — FOUND (modified in place)
- `server/routes/leads.ts` — FOUND (modified in place)
- `client/src/components/admin/marketing/utils.ts` — FOUND (modified in place)

Commits exist:
- `245d705` feat(07-01): add visitorUuid to getMarketingConversions via LEFT JOIN to visitor_sessions — FOUND
- `112cc31` feat(07-01): enrich GET /api/form-leads with ftLandingPage + visitCount per lead — FOUND
- `037ca32` feat(07-01): add channelLabel() shared utility to marketing/utils.ts — FOUND

`npm run check` exits 0 — CONFIRMED
