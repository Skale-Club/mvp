---
phase: 06-marketing-admin-dashboard
plan: "03"
subsystem: client-admin-marketing
tags: [react, tanstack-query, shadcn, marketing-dashboard, sources-tab, campaigns-tab]
dependency_graph:
  requires: [06-01]
  provides: [MarketingSourcesTab, MarketingCampaignsTab]
  affects: [client/src/components/admin/MarketingSection.tsx]
tech_stack:
  added: []
  patterns:
    - useQuery with explicit queryFn + staleTime 30_000 (avoids default Infinity + object-key pitfall)
    - shadcn Badge with custom bg-* classes for HOT/WARM/COLD quality indicators
    - Composite row key (campaign-source-idx) for campaigns with duplicate names from different sources
key_files:
  created:
    - client/src/components/admin/marketing/MarketingSourcesTab.tsx
    - client/src/components/admin/marketing/MarketingCampaignsTab.tsx
  modified:
    - client/src/components/admin/MarketingSection.tsx
decisions:
  - "renderCampaignCell helper placed as module-level function (not inline JSX) for readability and testability"
  - "formatRate and renderTopLanding are module-level helpers shared within each file"
  - "Overview and Conversions TabsContent left as MarketingTabPlaceholder (Plans 02 and 04 own those)"
metrics:
  duration: ~10 min
  completed_date: "2026-04-27"
  tasks_completed: 3
  files_changed: 3
---

# Phase 6 Plan 03: Sources + Campaigns Tabs Summary

**One-liner:** Sources tab (7-column channel table with HOT/WARM/COLD quality badges) and Campaigns tab (7-column campaign table with italic "Direct / Untagged" for unknown campaigns) consuming `/api/admin/marketing/sources` and `/api/admin/marketing/campaigns`.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create MarketingSourcesTab.tsx | 99bd0d3 | client/src/components/admin/marketing/MarketingSourcesTab.tsx |
| 2 | Create MarketingCampaignsTab.tsx | 5aed13d | client/src/components/admin/marketing/MarketingCampaignsTab.tsx |
| 3 | Wire tabs into MarketingSection.tsx | ff55ba1 | client/src/components/admin/MarketingSection.tsx |

## Files Created

### MarketingSourcesTab.tsx (116 lines)

Exports: `MarketingSourcesTab`, `MarketingSourcesTabProps`

- Fetches `GET /api/admin/marketing/sources` with `buildMarketingQueryParams(filters)`
- `queryKey: ['/api/admin/marketing/sources', filters]` with `staleTime: 30_000`
- 7 columns: Source / Visits / Leads / HOT / WARM / COLD / Conv. Rate
- HOT badge: `bg-green-100 text-green-800`; WARM: `bg-amber-100 text-amber-800`; COLD: `bg-gray-100 text-gray-700`
- `formatRate`: shows `—` when visits === 0, else `X.X%` with 1 decimal
- Loading: 6 `<Skeleton>` rows; Error: retry card "Could not load marketing data"; Empty: BarChart2 icon + "No traffic sources tracked yet"
- Zero `utm_*` strings

### MarketingCampaignsTab.tsx (125 lines)

Exports: `MarketingCampaignsTab`, `MarketingCampaignsTabProps`

- Fetches `GET /api/admin/marketing/campaigns` with `buildMarketingQueryParams(filters)`
- `queryKey: ['/api/admin/marketing/campaigns', filters]` with `staleTime: 30_000`
- 7 columns: Campaign / Source / Channel / Visits / Leads / Conv. Rate / Top Landing Page
- `renderCampaignCell`: empty/null/`'unknown'` (case-insensitive) → `<span className="italic text-muted-foreground">Direct / Untagged</span>`
- `renderTopLanding`: shows first entry of `topLandingPages` array, or `—` when empty
- Composite row key: `campaign-source-idx` (handles duplicate campaign names across sources)
- Loading: 6 `<Skeleton>` rows; Error: retry card "Could not load marketing data"; Empty: TrendingUp icon + "No campaign data yet"
- Zero `utm_*` strings

## Files Modified

### MarketingSection.tsx

Two lines added (imports) and two lines replaced (Sources + Campaigns TabsContent):

```tsx
// Added imports
import { MarketingCampaignsTab } from '@/components/admin/marketing/MarketingCampaignsTab';
import { MarketingSourcesTab } from '@/components/admin/marketing/MarketingSourcesTab';

// Replaced (Sources tab)
// Before: <MarketingTabPlaceholder name="Sources" />
// After:  <MarketingSourcesTab filters={filters} />

// Replaced (Campaigns tab)
// Before: <MarketingTabPlaceholder name="Campaigns" />
// After:  <MarketingCampaignsTab filters={filters} />
```

Overview tab: still `<MarketingTabPlaceholder name="Overview" />` — Plan 02 owns this.
Conversions tab: still `<MarketingTabPlaceholder name="Conversions" />` — Plan 04 owns this.

## Plan 04 Readiness

Plan 04 (Conversions tab) can proceed without touching either of these files:
- `MarketingSourcesTab.tsx` — complete, self-contained
- `MarketingCampaignsTab.tsx` — complete, self-contained
- `MarketingSection.tsx` only needs the Conversions TabsContent replaced (line 216)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `client/src/components/admin/marketing/MarketingSourcesTab.tsx` exists (116 lines)
- [x] `client/src/components/admin/marketing/MarketingCampaignsTab.tsx` exists (125 lines)
- [x] Both files export their named components
- [x] Both files contain `staleTime: 30_000` and explicit `queryFn`
- [x] Zero `utm_*` substrings in either tab
- [x] All 3 commits exist: 99bd0d3, 5aed13d, ff55ba1
- [x] `npm run check` exits 0
