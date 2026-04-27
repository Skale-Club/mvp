---
phase: 06
plan: 04
subsystem: marketing-admin-dashboard
tags: [react, tanstack-query, date-fns, shadcn, conversions-tab]
dependency_graph:
  requires:
    - "06-01 (MarketingSection.tsx shell, utils.ts with MarketingFilters)"
    - "shared/schema.ts (AttributionConversion type)"
    - "/api/admin/marketing/conversions (server route from Phase 04)"
  provides:
    - "MarketingConversionsTab component (Conversions tab rendering)"
    - "Complete MarketingSection.tsx with MarketingTabPlaceholder removed"
  affects:
    - "client/src/components/admin/MarketingSection.tsx"
    - "client/src/components/admin/marketing/MarketingConversionsTab.tsx"
tech_stack:
  added: []
  patterns:
    - "useQuery with explicit queryFn (avoids key-join pitfall)"
    - "useMemo for client-side FILTER-04 (conversionType) with widened cast for page_view"
    - "formatDistanceToNow from date-fns root package (Pitfall 4 avoidance)"
    - "Badge with Tailwind color utility classes for conversion type pills"
key_files:
  created:
    - client/src/components/admin/marketing/MarketingConversionsTab.tsx
  modified:
    - client/src/components/admin/MarketingSection.tsx
decisions:
  - "Widen allConversions to string-typed conversionType via Omit+intersection cast to allow page_view comparison without TypeScript error (schema union omits page_view; DB column is plain text)"
  - "Replace remaining Overview/Sources/Campaigns MarketingTabPlaceholder calls with inline minimal divs so the helper can be fully removed in this parallel worktree"
metrics:
  duration: "15 min"
  completed: "2026-04-27"
  tasks_completed: 2
  files_changed: 2
---

# Phase 6 Plan 4: MarketingConversionsTab + MarketingSection Cleanup Summary

**One-liner:** Conversions tab with formatDistanceToNow relative time, colored business-label badges, FILTER-04 client-side conversionType filter, and full removal of MarketingTabPlaceholder dead code.

---

## What Was Built

### File Created: MarketingConversionsTab.tsx (170 lines)

**Path:** `client/src/components/admin/marketing/MarketingConversionsTab.tsx`

**Exports:** `MarketingConversionsTab`, `MarketingConversionsTabProps`

**Behavior:**
- Fetches `GET /api/admin/marketing/conversions` with `buildMarketingQueryParams(filters)` query string
- `staleTime: 30_000` prevents stale filter data
- Three UI states:
  - **Loading:** 6 row `<Skeleton>` placeholders
  - **Error:** Card with "Could not load marketing data" + Retry button
  - **Empty:** Card with TrendingUp icon + "No conversions tracked yet" + coach tip text
- **Loaded:** `<Card>` wrapping an HTML table with 5 columns: When / Type / Source / Campaign / Landing Page
- **FILTER-04 client-side:** `useMemo` over `allConversions` excludes `page_view` rows and filters by `filters.conversionType` (server storage ignores this param — Critical Finding)
- **D-29 25-row cap:** `.slice(0, 25)` after filter
- **When column:** `formatDistanceToNow(new Date(convertedAt), { addSuffix: true })` with raw ISO tooltip
- **Type column:** Colored `<Badge>` with business labels (Lead Created / Phone Call / Form Submitted / Booking Started)
- **Campaign column:** Shows `ftCampaign` or `<span className="italic text-muted-foreground">Direct / Untagged</span>`
- Zero `utm_*` strings in any rendered text

**Pill color classes:**
| Type | Classes |
|------|---------|
| lead_created | `bg-green-100 text-green-800` |
| phone_click | `bg-blue-100 text-blue-800` |
| form_submitted | `bg-purple-100 text-purple-800` |
| booking_started | `bg-orange-100 text-orange-800` |

### File Modified: MarketingSection.tsx

**Changes made:**
1. Added import: `import { MarketingConversionsTab } from '@/components/admin/marketing/MarketingConversionsTab';`
2. Replaced `<MarketingTabPlaceholder name="Conversions" />` with `<MarketingConversionsTab filters={filters} />`
3. Deleted entire `MarketingTabPlaceholder` function definition (15 lines)
4. Removed `TrendingUp` from lucide-react import (was only used inside the deleted helper)
5. Replaced Overview/Sources/Campaigns `MarketingTabPlaceholder` calls with inline minimal divs (for this parallel worktree — Plans 02/03 replace with real components on merge)

**Confirmation:** `grep "MarketingTabPlaceholder" client/src/components/admin/MarketingSection.tsx | wc -l` returns `0`.

---

## Phase 6 Dashboard Status

| Tab | Status |
|-----|--------|
| Overview | Inline placeholder (Plan 02 worktree has real component) |
| Sources | Inline placeholder (Plan 03 worktree has real component) |
| Campaigns | Inline placeholder (Plan 03 worktree has real component) |
| Conversions | **COMPLETE — wired with real data** |

Phase 6 Conversions tab is functionally complete and ready for `/gsd:verify-work` on the merged result.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error: page_view comparison with union type**
- **Found during:** Task 1 — first `npm run check` run
- **Issue:** `AttributionConversion.conversionType` TypeScript union is `'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started'` — TypeScript errors TS2367 on direct comparison with `'page_view'` ("comparison appears unintentional because types have no overlap")
- **Fix:** Widened `allConversions` to `Array<Omit<AttributionConversion, 'conversionType'> & { conversionType: string }>` before filtering, which satisfies the acceptance criteria literal `c.conversionType !== 'page_view'` while remaining TypeScript-clean
- **Files modified:** `client/src/components/admin/marketing/MarketingConversionsTab.tsx`
- **Commit:** c76ed00

**2. [Rule 3 - Blocking] Remaining MarketingTabPlaceholder callers caused TypeScript errors after helper removal**
- **Found during:** Task 2 — TypeScript errors at lines 206, 209, 212 after deleting the helper
- **Context:** This is a parallel execution worktree. Plans 02 and 03 replace Overview/Sources/Campaigns placeholders in their own worktrees. Plan 04's plan says "after the swap, `MarketingTabPlaceholder` has zero callers" — assuming Plans 02/03 are already applied.
- **Fix:** Replaced the three remaining `<MarketingTabPlaceholder>` calls with inline minimal text divs, eliminating the dependency and allowing complete removal
- **Files modified:** `client/src/components/admin/MarketingSection.tsx`
- **Commit:** 61b0f29

---

## Known Stubs

None. The Conversions tab fetches real data from a live server endpoint. The only "placeholder" behavior in this worktree is the Overview/Sources/Campaigns inline text — those are addressed by Plans 02 and 03 which run in parallel worktrees.

---

## Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Server-side `conversionType` filter in `getMarketingConversions` (storage.ts ignores the param) | FILTER-04 Critical Finding | S | v1.3 — client-side workaround is sufficient for 25-row cap |

---

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Create MarketingConversionsTab.tsx | c76ed00 | `client/src/components/admin/marketing/MarketingConversionsTab.tsx` |
| Task 2: Wire tab + remove dead code | 61b0f29 | `client/src/components/admin/MarketingSection.tsx` |
