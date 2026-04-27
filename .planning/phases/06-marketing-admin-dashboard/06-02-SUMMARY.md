---
phase: 06-marketing-admin-dashboard
plan: 02
subsystem: ui
tags: [react, admin, marketing, recharts, tanstack-query, kpi, overview]

requires:
  - phase: 06-01
    provides: MarketingSection.tsx shell with filter state + MarketingFilters type + buildMarketingQueryParams utility
  - phase: 04-server-routes-lead-flow-integration
    provides: GET /api/admin/marketing/overview endpoint returning MarketingOverview JSON

provides:
  - "client/src/components/admin/marketing/MarketingOverviewTab.tsx — KPI cards row 1 (Total Visits / Leads Generated / Conversion Rate) + row 2 (Top Traffic Source / Best Campaign / Best Landing Page) + Recharts AreaChart (Visits + Conversions time series)"
  - "MarketingSection.tsx Overview TabsContent wired to <MarketingOverviewTab filters={filters} /> — Overview tab is no longer a placeholder"

affects:
  - 06-03 (MarketingSourcesTab follows the same queryFn + staleTime + filters-as-prop pattern)
  - 06-04 (MarketingConversionsTab same pattern)

tech-stack:
  added: []
  patterns:
    - "Explicit queryFn pattern: always pass queryFn to useQuery when filters object is in queryKey — default queryFn joins key array with '/' producing 404"
    - "staleTime: 30_000 override: set per-query to 30 s to allow filter-change refetch; global default is Infinity which freezes data"
    - "Inline KpiCard component: co-located function in the same file for compact reuse; avoids a separate file for 10-line presentational component"
    - "Three-branch render: isLoading → skeleton; isError → error card with refetch(); empty check (totalVisits===0 && timeSeries.length===0) → empty state card; else → real content"

key-files:
  created:
    - client/src/components/admin/marketing/MarketingOverviewTab.tsx
  modified:
    - client/src/components/admin/MarketingSection.tsx

key-decisions:
  - "Inline KpiCard function co-located in MarketingOverviewTab.tsx rather than extracted to a separate shared file — size (10 lines) does not justify new file; Plans 03-04 build their own table-based layouts"
  - "Empty state coach copy uses literal '?utm_source=google&utm_medium=cpc' per UI-SPEC — the only permitted utm_ occurrence in the UI; documented in file with comment per plan spec"
  - "Conversions series color #FFD700 (gold) not #FFFF01 (brand yellow) — brand yellow is invisible on white; documented in 06-UI-SPEC.md Color section and enforced via grep acceptance check"

requirements-completed: [DASH-02, DASH-07, DASH-08]

duration: 15min
completed: 2026-04-27
---

# Phase 6 Plan 02: Marketing Overview Tab — KPI Cards + AreaChart

**Overview tab fully wired: six KPI cards (Total Visits, Leads Generated, Conversion Rate, Top Traffic Source, Best Campaign, Best Landing Page) + Recharts AreaChart (Visits #1C53A3 / Conversions #FFD700), with loading skeleton, empty state, and error retry state.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-27T18:55:00Z
- **Completed:** 2026-04-27T19:10:00Z
- **Tasks:** 2 of 2
- **Files modified:** 2

## Accomplishments

- Created `client/src/components/admin/marketing/MarketingOverviewTab.tsx` (204 lines) — self-contained component with explicit useQuery (staleTime: 30_000, explicit queryFn), 6 KPI cards, Recharts AreaChart, and all three states (loading / empty / error)
- Wired into `client/src/components/admin/MarketingSection.tsx` — Overview TabsContent now renders `<MarketingOverviewTab filters={filters} />` instead of placeholder; Sources/Campaigns/Conversions placeholders untouched

## Task Commits

1. **Task 1: Create MarketingOverviewTab.tsx** — `f9514fb` (feat)
2. **Task 2: Wire into MarketingSection.tsx** — `2583f5d` (feat)

## Files Created/Modified

- `client/src/components/admin/marketing/MarketingOverviewTab.tsx` (created, 204 lines)
  - Exports: `MarketingOverviewTab`, `MarketingOverviewTabProps`
  - Inline: `KpiCard` (private helper)
  - Consumes: `GET /api/admin/marketing/overview`, `buildMarketingQueryParams`, `MarketingFilters`, `MarketingOverview`
- `client/src/components/admin/MarketingSection.tsx` (modified)
  - Added: `import { MarketingOverviewTab } from '@/components/admin/marketing/MarketingOverviewTab'`
  - Replaced: `<MarketingTabPlaceholder name="Overview" />` → `<MarketingOverviewTab filters={filters} />`

## Plan 03 / Plan 04 Isolation Confirmation

Plan 03 (Sources tab) and Plan 04 (Conversions tab) can proceed independently without modifying `MarketingOverviewTab.tsx`:

- The Overview tab component is entirely self-contained (no shared state mutations)
- Plans 03 and 04 only need to create their own tab components and replace the Sources/Campaigns/Conversions `MarketingTabPlaceholder` blocks in `MarketingSection.tsx` — the same minimal pattern used in Task 2 of this plan
- The `MarketingTabPlaceholder` function is still present in `MarketingSection.tsx` for the remaining 3 tabs

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all KPI fields render live data from the API. Null fields display `'—'` or `'None tagged yet'` per spec (not stubs; intentional zero-state copy).

## Self-Check: PASSED

- `client/src/components/admin/marketing/MarketingOverviewTab.tsx` exists (204 lines, min 200 required)
- `client/src/components/admin/MarketingSection.tsx` contains `MarketingOverviewTab`
- Commit `f9514fb` (Task 1) confirmed in git log
- Commit `2583f5d` (Task 2) confirmed in git log
- `npm run check` exits 0 (zero TypeScript errors)
- Zero `#FFFF01` in MarketingOverviewTab.tsx
- utm_ occurrences: exactly 2 (permitted — empty state coach copy only)
- Zero `Sessions` in visible UI text
