---
phase: "04"
plan: "02"
subsystem: server-routes
tags: [attribution, routes, visitor-sessions, analytics, public-endpoints]
dependency_graph:
  requires: [04-01]
  provides: [04-03]
  affects: [server/routes/attribution.ts, server/routes.ts, server/routes/integrations.ts]
tech_stack:
  added: []
  patterns: [public Express route module, Zod validation, UUID-to-integer FK lookup, forceStore bypass pattern]
key_files:
  created:
    - server/routes/attribution.ts
  modified:
    - server/routes.ts
    - server/routes/integrations.ts
decisions:
  - "attribution.ts silences all non-Zod errors with 200 {} — attribution never blocks the client (D-06/D-09)"
  - "registerAttributionRoutes(app) called with app only — no requireAdmin argument (public endpoints per D-07/D-09)"
  - "forceStore bypass in /api/analytics/hit: visitor-correlated hits stored even when no GA4/Facebook/GHL destination active"
  - "conversion endpoint denormalizes ft_*/lt_* from visitor_sessions at insert time — dashboard queries GROUP BY without a join"
metrics:
  duration: "~10 min"
  completed: "2026-04-25T21:03:56Z"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 3
---

# Phase 04 Plan 02: Server Routes + Lead Flow Integration — Summary

**One-liner:** Two public attribution endpoints (POST /api/attribution/session and POST /api/attribution/conversion) created and wired; /api/analytics/hit extended to accept and persist mvp_vid visitorId with destination-guard bypass.

## Tasks Executed

### Task 1 — Create server/routes/attribution.ts (COMPLETED, commit `b386c40`)

Created `server/routes/attribution.ts` (118 lines) following the project's route-module convention.

**Exports:** `registerAttributionRoutes(app: Express): void` — public, no `requireAdmin`.

**POST /api/attribution/session:**
- `sessionUpsertSchema` validates visitorId (UUID), all ft_*/lt_* UTM fields (max 120 chars), ltLandingPage/ftLandingPage (max 600 chars), referrer fields, deviceType, converted
- Calls `storage.upsertVisitorSession(payload)` — first-touch immutability enforced by storage layer's ON CONFLICT logic
- ZodError → 400 `{ error: string }`; any other error → 200 `{}` (D-09: never blocks client)

**POST /api/attribution/conversion:**
- `conversionSchema` validates visitorId (UUID), conversionType enum (lead_created | phone_click | form_submitted | booking_started), optional pagePath and leadId
- Resolves UUID → integer FK via direct DB query on `visitor_sessions.visitor_id`
- If session not found: returns 200 `{}` silently (D-06: never 500 for missing visitor)
- Denormalizes `ftSource/ftMedium/ftCampaign/ftLandingPage` + `ltSource/ltMedium/ltCampaign/ltLandingPage` from visitor_sessions row at insert time
- Calls `storage.createAttributionConversion(...)` with integer FK + full ft/lt snapshot
- ZodError → 400 `{ error: string }`; any other error → 200 `{}` (D-06: attribution never 500)

**No endpoints in this file can return 500.** Zero matches for `res.status(500)` confirmed.

**No `requireAdmin` in this file.** Zero matches confirmed.

### Task 2 — Wire registerAttributionRoutes into server/routes.ts (COMPLETED, commit `150e103`)

Two surgical edits to `server/routes.ts`:

1. Import added at line 15:
   ```typescript
   import { registerAttributionRoutes } from "./routes/attribution.js";
   ```

2. Registration added after `registerUserRoutes(app, requireAdmin)` at line 58:
   ```typescript
   registerAttributionRoutes(app);
   ```

No `requireAdmin` argument — public endpoints per D-07/D-09. All existing route registrations untouched. `npm run check` and `npm run build` both pass.

### Task 3 — Extend /api/analytics/hit to accept visitorId (COMPLETED, commit `fdd79a7`)

Two coordinated edits to `server/routes/integrations.ts`:

**1. Extended eventHitSchema** (line 29):
```typescript
visitorId: z.string().uuid().optional(),  // mvp_vid UUID
```

**2. Modified /api/analytics/hit handler:**
- Added `const forceStore = !!payload.visitorId;` — bypass condition for journey view
- Modified destination guard: `if (!hasActiveDestination && !forceStore && process.env.ENABLE_ANALYTICS_EVENT_STORAGE !== 'true')`
- Added `visitorId: payload.visitorId` to `storage.recordAnalyticsEventHit({...})` call

Page_view rows now accumulate in `analytics_event_hits.visitor_id` regardless of GA4/Facebook/GHL destination state, as long as the client sends a visitorId. CONV-05 is fully wired end-to-end.

## Verification Results

```
npm run check → exits 0
npm run build → exits 0 (1.7mb server bundle, client built in ~20s)

grep "export function registerAttributionRoutes" server/routes/attribution.ts → 1 match (line 47)
grep 'import { storage } from "../storage.js"' server/routes/attribution.ts → 1 match (line 3)
grep "app.post('/api/attribution/session'" server/routes/attribution.ts → 1 match (line 51)
grep "app.post('/api/attribution/conversion'" server/routes/attribution.ts → 1 match (line 71)
grep "z.enum" server/routes/attribution.ts → 1 match (lead_created | phone_click | form_submitted | booking_started)
grep -c "res.status(400)" server/routes/attribution.ts → 2 (one per ZodError branch)
grep -c "res.status(500)" server/routes/attribution.ts → 0 (confirmed — never 500)
grep -c "requireAdmin" server/routes/attribution.ts → 0 (confirmed — public)

grep "visitorId: z.string().uuid().optional()" server/routes/integrations.ts → 1 match (line 29)
grep "visitorId: payload.visitorId" server/routes/integrations.ts → 1 match (line 661)
grep "const forceStore = !!payload.visitorId" server/routes/integrations.ts → 1 match (line 651)
grep "!hasActiveDestination && !forceStore" server/routes/integrations.ts → 1 match (line 652)
grep "app.post('/api/analytics/hit'" server/routes/integrations.ts → 1 match (line 634)
```

## Deviations from Plan

None — all three tasks executed exactly as written. The plan skeleton was followed precisely. The `as any` casts were used as suggested where drizzle-zod type specificity required it.

## Note for Plan 03

The `createAttributionConversion` call shape established here is the canonical pattern for Plan 03's lead-flow IIFE:

```typescript
// Plan 03 can use linkLeadToVisitor which returns the integer PK:
const sessionIntId = await storage.linkLeadToVisitor(lead.id, parsed.visitorId);
if (sessionIntId) {
  // Fetch ft/lt from visitor_sessions to denormalize, then:
  await storage.createAttributionConversion({
    visitorId: sessionIntId,  // integer PK — no second DB round-trip
    leadId: lead.id,
    conversionType: 'lead_created',
    ftSource: ..., ftMedium: ..., ftCampaign: ..., ftLandingPage: ...,
    ltSource: ..., ltMedium: ..., ltCampaign: ..., ltLandingPage: ...,
    pagePath: ...,
  });
}
```

Alternatively, Plan 03 can mirror the UUID lookup pattern from `attribution/conversion` directly (select visitorSessions row, get integer id + ft/lt fields in one query).

## Known Stubs

None. This plan adds no UI components or user-visible rendering paths. All code is server-side infrastructure.

## Self-Check

- [x] `server/routes/attribution.ts` exists (118 lines) — verified via ls
- [x] `server/routes.ts` imports and calls `registerAttributionRoutes(app)` — verified via grep
- [x] `server/routes/integrations.ts` has visitorId on eventHitSchema + forceStore bypass + storage passthrough — verified via grep
- [x] Commits exist: `b386c40` (attribution.ts), `150e103` (routes.ts), `fdd79a7` (integrations.ts)
- [x] `npm run check` exits 0 — verified
- [x] `npm run build` exits 0 — verified

## Self-Check: PASSED
