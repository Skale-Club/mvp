---
phase: 06-marketing-admin-dashboard
plan: 01
subsystem: ui
tags: [react, admin, marketing, filter, tabs, shadcn]

requires:
  - phase: 05-client-utm-capture-hook
    provides: Attribution hooks + UTM capture pipeline that feeds the marketing data this dashboard will display
  - phase: 04-server-routes-lead-flow-integration
    provides: server/routes/marketing.ts API endpoint that MarketingSection will query in Plans 02-04

provides:
  - "'marketing' added to AdminSection union and ADMIN_ROUTES with TrendingUp icon between Leads and FAQs"
  - "client/src/components/admin/marketing/utils.ts with DatePreset, MarketingFilters, resolveDateRange, buildMarketingQueryParams"
  - "client/src/components/admin/MarketingSection.tsx with filter state, filter bar, and 4-tab navigable shell"

affects:
  - 06-02 (MarketingOverviewTab imports MarketingFilters/DatePreset from utils.ts, replaces placeholder in overview TabsContent)
  - 06-03 (MarketingSourcesTab + MarketingCampaignsTab same pattern)
  - 06-04 (MarketingConversionsTab same pattern)

tech-stack:
  added: []
  patterns:
    - "Filter state pattern: useState<MarketingFilters>({ datePreset: '30d' }) owned by section root, passed as props to tab children"
    - "ALL_VALUE sentinel '__all__' for Radix Select to avoid empty-string value rejection"
    - "Date preset buttons use variant='default' for active state, variant='outline' for inactive — matches existing admin filter pattern"

key-files:
  created:
    - client/src/components/admin/MarketingSection.tsx
    - client/src/components/admin/marketing/utils.ts
  modified:
    - client/src/components/admin/shared/types.ts (added 'marketing' to AdminSection union)
    - client/src/components/admin/shared/routes.ts (added TrendingUp import + marketing route entry)
    - client/src/pages/Admin.tsx (added MarketingSection import + render case)

key-decisions:
  - "Source/campaign Select options arrays start empty in Plan 01; Plans 02-04 will lift populated options up from Overview tab data"
  - "ALL_VALUE = '__all__' sentinel required because Radix Select rejects empty-string values — documented inline"
  - "Tab placeholders wrap in TabsContent with correct value= attributes so Plans 02-04 only need to swap inner children"

patterns-established:
  - "Filter state ownership: MarketingSection owns all filter state; tab components receive filters as props and compute their own queryKey"
  - "DatePreset resolution: resolveDateRange() centralizes all preset-to-date-range logic; tabs never compute dates directly"

requirements-completed: [DASH-01, DASH-07, FILTER-01, FILTER-02, FILTER-03, FILTER-04]

duration: 25min
completed: 2026-04-27
---

# Phase 6 Plan 01: Marketing Admin Dashboard — Shell + Filter Bar + Tab Strip

**Admin Marketing section registered with navigable shell: filter bar (date presets, custom range, 3 Selects) + 4-tab strip with typed filter state and shared utils that all Phase 6 tabs will import.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-27T18:25:00Z
- **Completed:** 2026-04-27T18:50:00Z
- **Tasks:** 3 of 3 (Tasks 1 and 2 completed in prior session; Task 3 completed in this execution)
- **Files modified:** 5

## Accomplishments

- Registered 'marketing' in AdminSection union, ADMIN_ROUTES (with TrendingUp icon, positioned between Leads and FAQs), and Admin.tsx render switch — zero unrelated TS errors
- Created `client/src/components/admin/marketing/utils.ts` with `DatePreset`, `MarketingFilters`, `resolveDateRange`, and `buildMarketingQueryParams` — the shared foundation all Phase 6 tab plans will import
- Created `client/src/components/admin/MarketingSection.tsx` with full filter bar (4 date presets + custom Calendar popover + 3 Selects) and 4-tab navigable shell; `npm run check` exits 0

## Task Commits

1. **Task 1: Register 'marketing' in AdminSection, ADMIN_ROUTES, Admin.tsx** - `d7da60b` (feat)
2. **Task 2: Create marketing/utils.ts shared helpers** - `870548c` (feat)
3. **Task 3: Create MarketingSection.tsx filter bar + tab strip** - `16298ce` (feat)

## Files Created/Modified

- `client/src/components/admin/shared/types.ts` — Added `| 'marketing'` to AdminSection union after 'leads'
- `client/src/components/admin/shared/routes.ts` — Added TrendingUp import + `{ id: 'marketing', slug: 'marketing', title: 'Marketing', icon: TrendingUp }` entry
- `client/src/pages/Admin.tsx` — Added `import { MarketingSection }` + `{activeSection === 'marketing' && <MarketingSection />}` render case
- `client/src/components/admin/marketing/utils.ts` — Exports: `DatePreset`, `MarketingFilters`, `resolveDateRange`, `buildMarketingQueryParams`
- `client/src/components/admin/MarketingSection.tsx` — Section root with filter state, date preset buttons, Calendar popover, 3 Selects, 4-tab strip with placeholders

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `MarketingTabPlaceholder` components in Overview/Sources/Campaigns/Conversions TabsContent — intentional scaffolding per plan design. Plans 02-04 will replace each `<MarketingTabPlaceholder name="..." />` child with the real tab component. The placeholder does not block the plan goal (navigable shell); it IS the plan goal for Plan 01.
- `sourceOptions` and `campaignOptions` arrays are empty in MarketingSection.tsx — Plan 02 (MarketingOverviewTab) will lift populated option arrays into MarketingSection state once the Overview tab has fetched data.

## Self-Check: PASSED

- `client/src/components/admin/MarketingSection.tsx` exists
- `client/src/components/admin/marketing/utils.ts` exists
- Commit `d7da60b` (Task 1), `870548c` (Task 2), `16298ce` (Task 3) all verified in git log
- `npm run check` exits 0 (zero TypeScript errors)
- Zero `utm_*` or `Sessions` strings in MarketingSection.tsx visible UI text
