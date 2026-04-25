---
phase: 05-client-utm-capture-hook
plan: "03"
subsystem: client-attribution
tags: [attribution, conversion-events, phone-click, booking-started, utm]
dependency_graph:
  requires: ["05-01"]
  provides: ["client-side phone_click trigger", "client-side booking_started trigger"]
  affects: ["attribution_conversions table accumulation", "Phase 06 Conversions dashboard tab"]
tech_stack:
  added: []
  patterns:
    - "fireConversionEvent imported directly in component files (no hook, no prop drilling)"
    - "fire-and-forget sendBeacon calls alongside existing trackEvent calls"
    - "booking_started fires before setIsFormOpen(true) in every callsite"
key_files:
  created: []
  modified:
    - client/src/components/layout/Navbar.tsx
    - client/src/components/layout/StickyBottomBar.tsx
    - client/src/pages/Home.tsx
    - client/src/pages/ServiceDetails.tsx
    - client/src/pages/BlogPost.tsx
decisions:
  - "Inline arrow body expansion chosen over extracting a helper — plan specified 5-line edits, no refactor"
  - "fireConversionEvent called before setIsFormOpen(true) in all callsites — conversion recorded even if future bug prevents modal from opening"
  - "trackEvent('contact_click') preserved in Navbar alongside new fireConversionEvent — two systems coexist per D-17"
  - "Home.tsx delegated handler (data-form-trigger pattern) treated as legitimate booking_started signal per plan instructions"
metrics:
  duration: "10 min"
  completed_date: "2026-04-25"
  tasks_completed: 2
  files_modified: 5
---

# Phase 05 Plan 03: Wire Client-Side Conversion Events Summary

Wired `fireConversionEvent` for `phone_click` and `booking_started` conversion types across 5 files, enabling `attribution_conversions` rows to accumulate from all CTA touchpoints.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Wire phone_click conversion in Navbar.tsx | 8add968 | Navbar.tsx |
| 2 | Wire booking_started at all setIsFormOpen callsites | 326b3f1 | StickyBottomBar.tsx, Home.tsx, ServiceDetails.tsx, BlogPost.tsx |

## Phone Link Callsites Found in Navbar.tsx

Final inventory after reading the whole file:

| Location | Line | Label |
|----------|------|-------|
| Desktop nav (hidden md:flex) | ~99 | phone number button pill |

No mobile-menu phone link was found. The mobile nav section (md:hidden) contains only nav links, user profile, and logout — no phone link. The single desktop phone link is the only `tel:` href in the file.

## setIsFormOpen(true) Callsites Wired

All 5 expected callsites found and wired:

| File | Callsite description | Line (approx) |
|------|---------------------|---------------|
| StickyBottomBar.tsx | "Get a Free Quote" sticky button | 67 |
| Home.tsx | delegated click handler (`data-form-trigger="lead-form"`) | 85 |
| Home.tsx | `onCtaClick` prop on `HeroSection` | 116 |
| ServiceDetails.tsx | Hero section "Get a Free Quote" button | 271 |
| ServiceDetails.tsx | CTA section "Contact Us Now" button | 338 |
| BlogPost.tsx | Sidebar "Get a Free Quote" button | 274 |

No additional `setIsFormOpen(true)` callsites were discovered beyond the 5 expected. No `setIsFormOpen(false)` callsite fires a conversion event.

## Code Shape Decisions

- **Inline arrow body expansion** was used throughout, matching the plan's direction to avoid extracting helpers or refactoring components.
- **Import placement**: grouped with existing `@/lib/...` imports in each file.
- **Call order**: `fireConversionEvent("booking_started")` before `setIsFormOpen(true)` — conversion recorded before modal opens.
- **Phone link**: `trackEvent("contact_click", ...)` called first (preserving existing logging order), then `fireConversionEvent("phone_click")`.

## Manual Smoke Test

Deferred to user verification (dev DB not available in agent shell). Expected behavior:

- Click phone link in desktop nav: POST to `/api/attribution/conversion` with `conversionType: 'phone_click'`
- Click "Get a Free Quote" (sticky bar, hero, service detail, blog sidebar): POST with `conversionType: 'booking_started'`
- With `mvp_vid` cleared from localStorage: no POST fired (silent no-op per `fireConversionEvent` implementation)

## Deviations from Plan

None — plan executed exactly as written. The one contingency (a possible second mobile phone link) did not apply; the mobile nav has no phone link.

## Known Stubs

None — this plan wires existing UI elements to existing API endpoints. No stub data or placeholder values.

## Self-Check: PASSED

- All 5 modified files committed in 2 commits: 8add968, 326b3f1
- `npm run check` passes (TypeScript exit 0)
- Acceptance criteria verified via grep before each commit
