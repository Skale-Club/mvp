---
phase: 05-client-utm-capture-hook
verified: 2026-04-25T00:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 5: Client UTM Capture Hook — Verification Report

**Phase Goal:** The full attribution pipeline is live in the browser — every visitor's UTM parameters and traffic source are captured on first load, persisted across navigations, and sent to the server before any form submission
**Verified:** 2026-04-25
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | On any page load with `?utm_source=X`, a `visitor_sessions` row is created — even after Wouter navigation (params captured at App root mount) | VERIFIED | `useAttribution` Effect A reads `window.location.search` in `[]` deps, before any navigation. Called in `AnalyticsProvider` at App root (App.tsx:136). `postSessionPing` fires with full ft_* payload. |
| 2 | When no UTM params are present, `document.referrer` is classified into Organic Search, Social, Referral, Direct, or Unknown — stored in `visitor_sessions.ft_source` | VERIFIED | `classifyReferrer` in attribution.ts (lines 91–125) implements all 5 branches. 6 SEARCH_HOSTS, 8 SOCIAL_HOSTS. Called in Effect A when `utmSource` is falsy. |
| 3 | `localStorage` key `mvp_vid` persists across page reloads, is distinct from `formLeads.sessionId`, and the same visitorId is sent with every session ping | VERIFIED | `MVP_VID_KEY = 'mvp_vid'` declared once in attribution.ts:25. `ensureVisitorId` reads/writes it. The literal `'mvp_vid'` appears ONLY ONCE in all of client/src (in attribution.ts as the constant value). No re-use in any other file. |
| 4 | Submitting the lead form passes `visitorId` in the payload so the server can link the lead record to the visitor session | VERIFIED | `getStoredVisitorId()` called at LeadFormModal.tsx:483; `payload.visitorId = storedVisitorId` at line 485; fetch to `/api/form-leads/progress` at line 494. Ordering confirmed correct. |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/src/lib/attribution.ts` | getStoredVisitorId, ensureVisitorId, fireConversionEvent, reportAttributionPageView, classifyReferrer, channelFromUtmMedium, detectDeviceType, postSessionPing, MVP_VID_KEY | VERIFIED | All 8 named exports + MVP_VID_KEY + SourceChannel type confirmed. 224 lines, substantive. SEARCH_HOSTS (6 entries), SOCIAL_HOSTS (8 entries) present. |
| `client/src/hooks/use-attribution.ts` | useAttribution() returning { visitorId } with two-useEffect pattern | VERIFIED | 160 lines. Exports `useAttribution`. Effect A deps=`[]`, Effect B deps=`[location, visitorId]`. Returns `{ visitorId }`. |
| `client/src/App.tsx` | useAttribution() called once; reportAttributionPageView in [location, visitorId] effect | VERIFIED | `useAttribution()` at line 136 (single call). `reportAttributionPageView(location, visitorId)` at line 154 alongside `trackPageView(location)`. Deps `[location, visitorId]` at line 155. |
| `client/src/components/LeadFormModal.tsx` | getStoredVisitorId imported, visitorId injected before fetch | VERIFIED | Import at line 8. `getStoredVisitorId()` at line 483. `payload.visitorId` at line 485. Fetch at line 494 (injection precedes POST). |
| `client/src/components/layout/Navbar.tsx` | fireConversionEvent('phone_click') on tel: link onClick | VERIFIED | Import at line 18. One `tel:` href in file (desktop only, line 99). `fireConversionEvent("phone_click")` at line 102, alongside preserved `trackEvent("contact_click", ...)` at line 101. |
| `client/src/components/layout/StickyBottomBar.tsx` | fireConversionEvent('booking_started') on CTA button | VERIFIED | Import at line 3. `fireConversionEvent("booking_started")` at line 69, immediately before `setIsFormOpen(true)` at line 70. |
| `client/src/pages/Home.tsx` | fireConversionEvent('booking_started') on 2 setIsFormOpen(true) callsites | VERIFIED | Import at line 8. Callsite 1: delegated click handler at line 86. Callsite 2: onCtaClick prop at line 119. Both precede setIsFormOpen(true). |
| `client/src/pages/ServiceDetails.tsx` | fireConversionEvent('booking_started') on 2 setIsFormOpen(true) callsites | VERIFIED | Import at line 11. Lines 273 and 343 fire the conversion before lines 274 and 344 open the modal. |
| `client/src/pages/BlogPost.tsx` | fireConversionEvent('booking_started') on setIsFormOpen(true) callsite | VERIFIED | Import at line 9. `fireConversionEvent("booking_started")` at line 276, `setIsFormOpen(true)` at line 277. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| use-attribution.ts | attribution.ts | `import { ensureVisitorId, classifyReferrer, channelFromUtmMedium, detectDeviceType, postSessionPing, reportAttributionPageView } from '@/lib/attribution'` | WIRED | Lines 17–25 of use-attribution.ts. All 6 required helpers imported. |
| use-attribution.ts | /api/attribution/session | `postSessionPing(payload)` → `postBeacon('/api/attribution/session', payload)` | WIRED | Effect A line 119, Effect B line 155 in use-attribution.ts. postBeacon routes to the endpoint in attribution.ts:191. |
| attribution.ts | /api/attribution/conversion | `fireConversionEvent` → `postBeacon('/api/attribution/conversion', ...)` | WIRED | attribution.ts line 212. |
| attribution.ts | /api/analytics/hit | `reportAttributionPageView` → `postBeacon('/api/analytics/hit', ...)` | WIRED | attribution.ts line 222. |
| App.tsx | use-attribution.ts | `import { useAttribution } from '@/hooks/use-attribution'` | WIRED | App.tsx line 12. |
| App.tsx | attribution.ts | `import { reportAttributionPageView } from '@/lib/attribution'` | WIRED | App.tsx line 13. |
| LeadFormModal.tsx | attribution.ts | `import { getStoredVisitorId } from '@/lib/attribution'` | WIRED | LeadFormModal.tsx line 8. |
| Navbar.tsx | attribution.ts | `import { fireConversionEvent } from '@/lib/attribution'` | WIRED | Navbar.tsx line 18. |
| StickyBottomBar.tsx | attribution.ts | `import { fireConversionEvent } from '@/lib/attribution'` | WIRED | StickyBottomBar.tsx line 3. |
| Home.tsx | attribution.ts | `import { fireConversionEvent } from '@/lib/attribution'` | WIRED | Home.tsx line 8. |
| ServiceDetails.tsx | attribution.ts | `import { fireConversionEvent } from '@/lib/attribution'` | WIRED | ServiceDetails.tsx line 11. |
| BlogPost.tsx | attribution.ts | `import { fireConversionEvent } from '@/lib/attribution'` | WIRED | BlogPost.tsx line 9. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| use-attribution.ts Effect A | `id` (visitorId) | `ensureVisitorId()` → `crypto.randomUUID()` / `localStorage.getItem(MVP_VID_KEY)` | Yes — UUID generated or retrieved from localStorage | FLOWING |
| use-attribution.ts Effect A | UTM params | `new URLSearchParams(window.location.search)` at mount | Yes — live URL params read synchronously | FLOWING |
| use-attribution.ts Effect A | `referrer` | `document.referrer` | Yes — real browser referrer | FLOWING |
| LeadFormModal.tsx | `storedVisitorId` | `getStoredVisitorId()` → `localStorage.getItem('mvp_vid')` | Yes — reads real localStorage value | FLOWING |
| Navbar.tsx | `visitorId` in fireConversionEvent | `getStoredVisitorId()` called inside `fireConversionEvent` | Yes — reads real localStorage | FLOWING |
| attribution.ts `postBeacon` | network | `navigator.sendBeacon` + `fetch keepalive` fallback | Yes — real HTTP calls to 3 server endpoints | FLOWING |

---

### Critical Invariant Check

**`mvp_vid` literal appears exactly once in client/src:**

- `client/src/lib/attribution.ts:25` — `export const MVP_VID_KEY = 'mvp_vid';` (the constant definition)
- `client/src/hooks/use-attribution.ts:6` — appears in a JSDoc comment (`"Generates/retrieves mvp_vid from localStorage"`) — NOT a string literal assigned or passed anywhere

Result: The literal `'mvp_vid'` as a string value exists ONLY in attribution.ts. All other references go through `MVP_VID_KEY`, `getStoredVisitorId()`, or `ensureVisitorId()`. INVARIANT HOLDS.

---

### Requirements Coverage

| Requirement | Phase Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SESSION-01 | 05-01, 05-02 | UTM parameters captured, normalized, stored server-side per visitor session | SATISFIED | `useAttribution` Effect A reads all 6 UTM params, normalizes (lowercase+trim), posts via `postSessionPing`. App.tsx mounts hook at root. |
| SESSION-02 | 05-01 | Auto-classifies non-UTM traffic from `document.referrer` into 5 channels | SATISFIED (code complete; REQUIREMENTS.md status field stale) | `classifyReferrer` in attribution.ts lines 91-125 implements all 5 branches (Direct, Organic Search via 6 hosts, Social Media via 8 hosts, Referral, fallback). Called in Effect A when no utm_source. Note: REQUIREMENTS.md traceability table marks SESSION-02 as "Pending" — this is a documentation artifact from stale status tracking; the code fully implements the requirement. |
| SESSION-03 | 05-01, 05-02, 05-03 | `mvp_vid` persists in localStorage, distinct from `sessionId` | SATISFIED | `MVP_VID_KEY = 'mvp_vid'` in attribution.ts. `ensureVisitorId()` reads or generates+writes. The key is distinct from `sessionId` (different name, different purpose). |

**Note on REQUIREMENTS.md discrepancy:** The traceability table marks SESSION-02 as "Pending" at Phase 5. The code in `classifyReferrer` (attribution.ts:91–125) fully satisfies SESSION-02's requirements — all 5 traffic channels are classified including all specified search engines and social networks. The "Pending" status appears to be a stale tracking entry not updated after plan completion. This is a documentation issue, not an implementation gap.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | — |

No TODOs, FIXMEs, placeholder returns, hardcoded empty arrays, or stub API responses found in any of the 7 modified files. All functions have substantive implementations. `postBeacon` is internal (not exported) as required.

One notable pattern in `use-attribution.ts:47`: `// eslint-disable-next-line react-hooks/exhaustive-deps` — this is the intentional two-effect pattern suppression (documented in D-03 and PLAN comments). Not a stub; it is architecturally required.

---

### Behavioral Spot-Checks

| Behavior | Check | Status |
|----------|-------|--------|
| attribution.ts exports MVP_VID_KEY = 'mvp_vid' | `grep "export const MVP_VID_KEY = 'mvp_vid'" attribution.ts` → match at line 25 | PASS |
| 8 named functions exported | All 8 present: getStoredVisitorId, ensureVisitorId, fireConversionEvent, reportAttributionPageView, classifyReferrer, channelFromUtmMedium, detectDeviceType, postSessionPing | PASS |
| sendBeacon + keepalive fallback in postBeacon | Lines 172-183 of attribution.ts — sendBeacon primary, fetch keepalive fallback | PASS |
| No React imports in attribution.ts | No `from "react"` in file | PASS |
| mvp_vid literal appears exactly once as a value | Only at attribution.ts:25 | PASS |
| useAttribution called exactly once in client/src | Only App.tsx:136 (excluding comments) | PASS |
| No `fireConversionEvent` near `setIsFormOpen(false)` | No matches across client/src | PASS |
| `tel:` links in Navbar = `fireConversionEvent("phone_click")` call count | 1 tel: href = 1 fireConversionEvent call (both excluding import line) | PASS |

---

### Human Verification Required

#### 1. End-to-End UTM Capture Smoke Test

**Test:** Open dev server at `http://localhost:7000/?utm_source=google&utm_medium=cpc&utm_campaign=test`. Open DevTools Network tab. Expect a POST to `/api/attribution/session` with body containing `ftSource: 'google'`, `ftMedium: 'cpc'`, `ftSourceChannel: 'Paid Ads'`. Navigate to another route — expect a second session POST (lt_* update) and a page_view hit.
**Expected:** Session row in Supabase `visitor_sessions` with `ft_source = 'google'`, `ft_medium = 'cpc'`, `ft_source_channel = 'Paid Ads'`, `ft_landing_page = '/'`.
**Why human:** Requires running dev server + real network calls + Supabase DB inspection.

#### 2. Referrer Classification

**Test:** Navigate to the site with an HTTP Referrer from google.com (e.g., using a browser extension or curl with Referer header). Check `visitor_sessions.ft_source_channel` = 'Organic Search'.
**Expected:** `classifyReferrer` path in Effect A fires; no UTM params, referrer contains "google".
**Why human:** Requires real browser referrer header + DB inspection.

#### 3. localStorage Persistence Across Reloads

**Test:** Visit the site, check DevTools Application > Local Storage > `mvp_vid`. Hard-refresh the page. Confirm the same UUID value persists.
**Why human:** localStorage persistence requires a real browser session.

#### 4. Lead Form Visitor ID Injection

**Test:** Submit the lead form. Check `form_leads.visitor_id` in Supabase for the test lead row. Confirm it matches the `mvp_vid` value in localStorage.
**Why human:** Requires real form submission + DB inspection.

#### 5. Conversion Event Network Calls

**Test:** Click the phone number in the desktop Navbar — confirm POST to `/api/attribution/conversion` with `conversionType: 'phone_click'` appears in Network tab. Click "Get a Free Quote" — confirm POST with `conversionType: 'booking_started'`.
**Why human:** Requires interactive browser session + DevTools.

---

### Gaps Summary

No gaps found. All 4 observable truths are verified. All 9 required artifacts exist and are substantively implemented. All 12 key links are confirmed wired. Data flows from real sources (localStorage, URL, document.referrer) through the utility layer to real server endpoints. No stubs, no placeholder implementations, no orphaned code.

The only documentation discrepancy is that REQUIREMENTS.md marks SESSION-02 as "Pending" while the implementation is complete — this is a stale status field, not a code gap.

---

_Verified: 2026-04-25_
_Verifier: Claude (gsd-verifier)_
