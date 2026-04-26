---
phase: 6
slug: marketing-admin-dashboard
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-26
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — project has no unit test framework installed (no jest/vitest/playwright config in repo root or `client/`) |
| **Config file** | None |
| **Quick run command** | `npm run check` (TypeScript type-check via `tsc --noEmit`) |
| **Full suite command** | `npm run check && npm run build` (type-check + production build) |
| **Estimated runtime** | ~10–25 seconds for `npm run check`; ~45–90 seconds for `npm run build` |

Source: 06-RESEARCH.md "Validation Architecture" section confirmed no test files exist (`*.test.ts`, `*.spec.ts`, `jest.config.*`, `vitest.config.*` all absent). The codebase's automated quality gate is TypeScript strict-mode compilation; visual/functional verification is manual.

---

## Sampling Rate

- **After every task commit:** Run `npm run check` (exit 0 required)
- **After every plan wave:** Run `npm run check && npm run build` (both must succeed) + manual smoke test of `/admin/marketing` in dev (`npm run dev`)
- **Before `/gsd:verify-work`:** `npm run check` green, `npm run build` green, all four tabs reachable in dev with proper loading / empty / error states verified visually
- **Max feedback latency:** 25 seconds for `npm run check`; 90 seconds for full validation

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DASH-01 | TS compile | `npm run check 2>&1 \| grep -E "error TS\|Cannot find module" \| grep -v "MarketingSection" \| wc -l` (expect 0 — only the missing-module error before Task 2 runs is allowed) | n/a — type-check uses tsconfig.json | ⬜ pending |
| 06-01-02 | 01 | 1 | DASH-01, FILTER-01 | TS compile + grep | `npx tsc --noEmit -p . 2>&1 \| grep "marketing/utils" \| wc -l` (expect 0) | ✅ existing (`tsconfig.json`) | ⬜ pending |
| 06-01-03 | 01 | 1 | DASH-01, DASH-07, FILTER-01–04 | TS compile + grep checks | `npm run check && grep -ic "utm_\|sessions" client/src/components/admin/MarketingSection.tsx` (TS exit 0; grep returns 0) | ✅ existing | ⬜ pending |
| 06-02-01 | 02 | 2 | DASH-02, DASH-07, DASH-08 | TS compile + grep checks | `npm run check && grep "stroke=\"#FFFF01\"" client/src/components/admin/marketing/MarketingOverviewTab.tsx \| wc -l` (TS exit 0; grep returns 0) | ✅ existing | ⬜ pending |
| 06-02-02 | 02 | 2 | DASH-02 | TS compile | `npm run check` | ✅ existing | ⬜ pending |
| 06-03-01 | 03 | 2 | DASH-03, DASH-07, DASH-08 | TS compile + grep checks | `npm run check && grep -c "bg-green-100 text-green-800" client/src/components/admin/marketing/MarketingSourcesTab.tsx` (TS exit 0; grep returns ≥ 1) | ✅ existing | ⬜ pending |
| 06-03-02 | 03 | 2 | DASH-04, DASH-07, DASH-08 | TS compile + grep checks | `npm run check && grep -c "Direct / Untagged" client/src/components/admin/marketing/MarketingCampaignsTab.tsx` (TS exit 0; grep returns ≥ 1) | ✅ existing | ⬜ pending |
| 06-03-03 | 03 | 2 | DASH-03, DASH-04 | TS compile | `npm run check` | ✅ existing | ⬜ pending |
| 06-04-01 | 04 | 2 | DASH-05, DASH-07, DASH-08, FILTER-04 | TS compile + grep checks | `npm run check && grep -c "c.conversionType !== 'page_view'" client/src/components/admin/marketing/MarketingConversionsTab.tsx` (TS exit 0; grep returns ≥ 1) | ✅ existing | ⬜ pending |
| 06-04-02 | 04 | 2 | DASH-05 | TS compile + dead-code grep | `npm run check && grep "MarketingTabPlaceholder" client/src/components/admin/MarketingSection.tsx \| wc -l` (TS exit 0; grep returns 0) | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Sampling continuity check: every plan has at least one `npm run check` automated gate per task, so there is never more than 1 task without an automated verify (well within the "no 3 consecutive tasks without automated verify" rule).

---

## Wave 0 Requirements

No Wave 0 needed for Phase 6:

- [x] No new test framework to install — project remains intentionally test-framework-free
- [x] No test scaffolding files needed — `npm run check` covers all type-level guarantees
- [x] No test fixture files needed — all data comes from live API endpoints (already exist from Phase 4)

*Existing infrastructure (`npm run check` + `npm run build`) covers all phase requirements that are mechanically verifiable.*

---

## Manual-Only Verifications

Phase 6 is a UI-heavy phase. Several requirements involve visual / interaction verification that cannot be automated within this codebase's test posture:

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Marketing link appears in admin sidebar between Leads and FAQs with TrendingUp icon | DASH-01 | Sidebar render is determined by `ADMIN_ROUTES` order + `companySettings.sectionsOrder`; visual ordering needs eyes | 1) `npm run dev`. 2) Log in to /admin. 3) Confirm sidebar shows: ... Leads → Marketing → FAQs ... in that order with the TrendingUp icon (chart-line glyph). |
| Filter bar date preset toggling shows correct active state | FILTER-01 | Active button visual is `variant="default"` (blue bg + white text) vs `variant="outline"` (border only). Visual contrast | Click each of Today / 7d / 30d / Month / Custom in turn. Confirm the clicked button is filled blue while the others are outlined. Confirm "Last 30 days" is the default active on first render. |
| Custom date range Popover opens a Calendar that selects a range | FILTER-01 | react-day-picker visual range selection behavior | Click Custom → Popover opens → click a start date → click an end date → confirm the trigger button text updates to `MMM d – MMM d` and the button becomes filled blue. |
| Source / Campaign Selects render and update queryKey on change | FILTER-02, FILTER-03 | DOM Select interaction with TanStack refetch | Open the Source Select → choose a value → confirm the table data re-fetches (Network tab shows new request with `?source=...`). Repeat for Campaign. |
| Conversion Type filter applies client-side filtering on Conversions tab | FILTER-04 | Server ignores conversionType (Critical Finding); client useMemo handles it | On Conversions tab with > 5 events visible: select "Phone Call" in the Conversion Type Select → confirm only Phone Call rows remain in the table. |
| Empty states render with correct copy per tab | DASH-08 | Coach copy is text content — best confirmed visually | With a clean DB or a date range that returns no rows: visit each tab → confirm the heading and body match UI-SPEC "Empty State Copy" table. |
| Recharts AreaChart renders Visits + Conversions with correct colors | DASH-02 | Recharts renders SVG; brand color rendering is visual | Overview tab with data: confirm two Area series are visible — Visits in blue (#1C53A3) below, Conversions in gold (#FFD700) on top, both with low fill opacity. Hover shows tooltip with both values. |
| HOT/WARM/COLD badges show correct colors on Sources tab | DASH-03 | Tailwind class application is visual | Sources tab with data: confirm HOT cell badge is green, WARM is amber, COLD is gray. |
| Conversion Type pill colors on Conversions tab | DASH-05 | Visual color verification | Conversions tab with mixed event types: Lead Created → green pill; Phone Call → blue; Form Submitted → purple; Booking Started → orange. |
| No utm_* term appears in any visible UI text | DASH-07 | Vocabulary ban — partial automation via grep but final check is visual review | Run `grep -ri "utm_" client/src/components/admin/marketing/ client/src/components/admin/MarketingSection.tsx` — count must be ≤ 2 (the educational example in MarketingOverviewTab.tsx empty state). Then visually scan all 4 tabs for any utm_*, "Sessions", "first-touch", "last-touch" leakage. |
| 25-row cap on Conversions tab | DASH-05 | Cap is enforced by `.slice(0, 25)` — visual confirmation that the table never exceeds 25 rows | With a DB containing > 25 conversions: confirm Conversions tab table renders exactly 25 rows. |
| Refetch on filter change happens instantly (no Apply button) | D-10 | Reactivity test | Change date preset, source, campaign, conversion type one at a time → each change triggers a Network refetch within ~100ms. |
| `formatDistanceToNow` renders "N hours ago" / "N minutes ago" / "N days ago" with addSuffix | DASH-05 | date-fns output formatting | Hover over a "When" cell → tooltip shows full ISO timestamp; cell text matches the relative-time format. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (every task gates on `npm run check` minimum) or Wave 0 dependencies (none needed)
- [x] Sampling continuity: every task has automated verify — zero consecutive tasks without one
- [x] Wave 0 covers all MISSING references — no Wave 0 needed; declared explicitly
- [x] No watch-mode flags — all commands one-shot
- [x] Feedback latency < 90s for full validation (well under any reasonable threshold)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-25
