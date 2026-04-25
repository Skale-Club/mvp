---
phase: 05-client-utm-capture-hook
plan: "01"
subsystem: client-attribution
tags: [utm, attribution, visitor-id, analytics, hook, utility]
dependency_graph:
  requires: []
  provides: [useAttribution, attribution-utils]
  affects: [client/src/App.tsx, client/src/components/layout/Navbar.tsx, client/src/components/LeadFormModal.tsx]
tech_stack:
  added: []
  patterns: [sendBeacon-with-fetch-keepalive-fallback, two-useEffect-mount-plus-navigation, fire-and-forget]
key_files:
  created:
    - client/src/lib/attribution.ts
    - client/src/hooks/use-attribution.ts
  modified: []
decisions:
  - SEARCH_HOSTS and SOCIAL_HOSTS exported as module constants (not private) so tests can verify lists
  - MVP_VID_KEY not re-imported in the hook since the hook uses ensureVisitorId (which owns the constant); keeps the literal in exactly one place
  - stripUndefined helper defined inline in the hook (not in attribution.ts) since it is hook-specific glue
  - Effect B dependency array is [location, visitorId] rather than [location] alone, so Effect B re-runs when visitorId becomes non-null after Effect A's setState — ensures the first real navigation gets its page_view if the state flush races the route change
metrics:
  duration: ~15 minutes
  completed: 2026-04-25
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 05 Plan 01: Client UTM Capture Hook — Library + Hook Summary

**One-liner:** Pure browser attribution utilities and a two-effect Wouter hook for UTM capture, visitor ID generation, and fire-and-forget session/page-view pings.

## Public API

### `client/src/lib/attribution.ts`

| Export | Signature | Description |
|---|---|---|
| `MVP_VID_KEY` | `const string` | The literal `'mvp_vid'` — single source of truth for the localStorage key (D-04). |
| `SEARCH_HOSTS` | `readonly string[]` | 6 search-engine host substrings used by `classifyReferrer`. |
| `SOCIAL_HOSTS` | `readonly string[]` | 8 social-network host substrings used by `classifyReferrer`. |
| `SourceChannel` | `type` | Union: `'Direct' | 'Organic Search' | 'Social Media' | 'Paid Ads' | 'Email' | 'Referral' | 'Unknown'`. |
| `getStoredVisitorId()` | `() => string | null` | Reads `localStorage[MVP_VID_KEY]`; returns null on SSR or storage error. |
| `ensureVisitorId()` | `() => string` | Returns existing ID or generates + persists a new `crypto.randomUUID()`. Best-effort write. |
| `classifyReferrer(referrer)` | `(string) => { sourceChannel, ftSource, ftMedium }` | Maps `document.referrer` to a SourceChannel. Skips same-origin. Returns Direct for empty/unparseable. |
| `channelFromUtmMedium(medium)` | `(string?) => SourceChannel` | Maps `utm_medium` to SourceChannel via normalized string matching (D-09). |
| `detectDeviceType(ua?)` | `(string?) => 'mobile' | 'tablet' | 'desktop'` | UA regex match; tablet checked before mobile (iPad fix, D-12). |
| `postSessionPing(payload)` | `(object) => void` | Posts to `/api/attribution/session` via sendBeacon + fetch keepalive fallback. |
| `fireConversionEvent(type, pagePath?)` | `(ConversionType, string?) => void` | Reads `mvp_vid` from localStorage; posts to `/api/attribution/conversion`. Silent if no ID. |
| `reportAttributionPageView(pagePath, visitorId)` | `(string, string | null) => void` | Posts `{ eventName: 'page_view', pagePath, visitorId }` to `/api/analytics/hit`. Silent if no visitorId. |

### `client/src/hooks/use-attribution.ts`

| Export | Signature | Description |
|---|---|---|
| `useAttribution()` | `() => { visitorId: string | null }` | Mount once in `AppContent`. Two-effect pattern: mount captures UTMs, navigation updates lt_*. |

**Return shape:** `{ visitorId: string | null }` — null on initial render until Effect A's `setState` flushes (one React cycle).

**When to call it:** Once, inside `AppContent` in `App.tsx`. Do NOT call in page/route components (D-02).

## Two-Effect Pattern

```
Effect A (deps: [])
  - ensureVisitorId() → setVisitorId(id)
  - Reads window.location.search at mount (before any navigation)
  - Classifies UTMs or document.referrer via classifyReferrer
  - Builds full ft_* + lt_* payload (mirrors on first visit)
  - postSessionPing(payload)
  - reportAttributionPageView(pathname, id)  ← initial landing page hit

Effect B (deps: [location, visitorId])
  - Guards: if (!visitorId) return
  - Re-reads window.location.search for current URL
  - If utm_source present: overrides lt_* only
  - postSessionPing({ visitorId, ltLandingPage: location, ...lt* })
  - reportAttributionPageView(location, visitorId)
```

## Decisions Made

1. **SEARCH_HOSTS / SOCIAL_HOSTS exported** — exported (not private) so callers and tests can import the canonical lists without duplication.
2. **MVP_VID_KEY not imported into the hook** — the hook calls `ensureVisitorId` which owns the constant internally. This keeps the literal string in exactly one place in the entire codebase (success criterion 3 of the plan).
3. **stripUndefined in hook, not in attribution.ts** — hook-specific glue logic; attribution.ts stays pure data-posting utilities.
4. **Effect B dependency is `[location, visitorId]`** — ensures Effect B re-runs once `visitorId` transitions from null to a string, so no navigation during that first cycle is missed.
5. **eslint-disable comment added to Effect A** — the exhaustive-deps rule would incorrectly flag the intentional empty-deps pattern. Comment explains this is deliberate (D-03).

## What Plans 02 and 03 Should Know

- **Plan 02 (wire into App.tsx):** Add `const { visitorId } = useAttribution();` to `AppContent`. Pass `visitorId` or use `reportAttributionPageView` as needed. The hook handles its own page_view firing internally, so the existing `trackPageView(location)` in `AnalyticsProvider` does NOT need to be removed — it serves a different purpose (GTM/GA4/Facebook Pixel). The attribution page_view is additive.
- **Plan 02 (Navbar):** Call `fireConversionEvent('phone_click')` inside the phone `onClick`. Import from `@/lib/attribution` — no hook needed.
- **Plan 03 (LeadFormModal):** Call `useAttribution()` at the top of the modal component to get `visitorId`. Include `visitorId` in the form payload (it is already optional server-side).
- **Plan 03 (booking flow):** Call `fireConversionEvent('booking_started')` at the booking CTA. Import from `@/lib/attribution`.
- The `mvp_vid` literal exists ONLY in `attribution.ts:25`. All other files must use `MVP_VID_KEY` or call `getStoredVisitorId()` / `ensureVisitorId()`.
- The `postBeacon` internal function is NOT exported. Never call `navigator.sendBeacon` or `fetch` with attribution endpoints directly — always go through the named helpers.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `client/src/lib/attribution.ts` — exists, 223 lines, all 8 public functions exported.
- `client/src/hooks/use-attribution.ts` — exists, 160 lines, `useAttribution` exported.
- Commit `0d44e64` — feat(05-01): add attribution.ts utility module.
- Commit `d408404` — feat(05-01): add useAttribution hook with two-effect pattern.
- `npm run check` — passes cleanly.
