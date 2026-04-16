---
phase: 01-lead-notification-log
plan: 03
subsystem: api
tags: [express, routes, zod, admin-auth, http-endpoints]

requires:
  - phase: 01-lead-notification-log / plan 01
    provides: storage.getNotificationLogsByLead, storage.listNotificationLogs
  - phase: 01-lead-notification-log / plan 02
    provides: real log rows flowing into the DB

provides:
  - GET /api/form-leads/:id/notifications (admin, per-lead)
  - GET /api/admin/notification-logs (admin, global with filters)
  - api.notificationLogs type-safe registry in shared/routes.ts

affects: [01-04-admin-ui]

tech-stack:
  added: []
  patterns:
    - "Admin read endpoints follow the registerXRoutes(app, requireAdmin) pattern — new file per subsystem"
    - "Input validation via api.<module>.<endpoint>.input.parse(req.query) — Zod errors become HTTP 400 with `errors` field"

key-files:
  created:
    - server/routes/notifications.ts
  modified:
    - shared/routes.ts
    - server/routes.ts

key-decisions:
  - "Read-only endpoints in v1.1 — no write/delete/resend API exposed"
  - "Separate file server/routes/notifications.ts — doesn't piggyback on leads.ts"
  - "Strict enum validation on channel/status; trigger stays an open string (new triggers added later need no API change)"

patterns-established:
  - "Per-lead sub-resource path convention: /api/form-leads/:id/<subresource>"
  - "Global admin-only collections under /api/admin/<collection> with requireAdmin middleware"

duration: ~15min
started: 2026-04-16T06:00:00Z
completed: 2026-04-16T06:15:00Z
---

# Phase 1 Plan 03: Notification Log API Endpoints

**Two admin-only GET endpoints expose notification log rows over HTTP — per-lead and global with Zod-validated filters — both gated by the existing `requireAdmin` Supabase session middleware.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 min |
| Tasks | 3 of 3 completed |
| Files modified | 2 (+1 created) |
| Qualify results | 3 PASS, 0 GAP, 0 DRIFT |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Shared registry exposes endpoints | PASS | `api.notificationLogs.listByLead` and `api.notificationLogs.list` available; list input schema covers all 9 filter fields with correct Zod coercions |
| AC-2: GET /api/form-leads/:id/notifications | PASS | Handler validates integer id (400 on invalid), queries `storage.getNotificationLogsByLead`, returns newest-first (enforced by storage method); curl returned 401 unauthenticated as expected |
| AC-3: GET /api/admin/notification-logs | PASS | Handler parses query via registry schema, surfaces Zod errors as 400 with `errors` field, default limit 100 applied by storage; curl returned 401 unauthenticated |
| AC-4: Routes registered | PASS | `registerNotificationRoutes(app, requireAdmin)` invoked inside `registerRoutes`; server started and both endpoints reachable |
| AC-5: No regressions | PASS | `npm run check` → 0 errors across 3 incremental runs; existing `registerLeadRoutes` untouched |

## Accomplishments

- Two admin endpoints live and reachable; routing + auth gate verified by curl returning 401
- Type-safe filter schema available to the client for plan 01-04 (import `api.notificationLogs.list.input` and get typed query-param construction)
- Zero impact on existing lead endpoints — notifications live in their own module

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `shared/routes.ts` | Modified | Added `notificationLogs` import from schema; added `api.notificationLogs` block with `listByLead` and `list` (+ Zod input schema for filters) |
| `server/routes/notifications.ts` | Created | Exports `registerNotificationRoutes(app, requireAdmin)`; two handlers using the same error shape / Zod branching as `server/routes/leads.ts` |
| `server/routes.ts` | Modified | Added import and call for `registerNotificationRoutes` next to the other register-X-routes calls |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Read-only for v1.1 | Write operations (resend, delete, mark-read) are not required by the current UI spec; keeping surface small reduces review burden | Future PATCH/POST can be added without breaking the v1.1 contract |
| Separate `server/routes/notifications.ts` file | Notifications are a distinct subsystem, not a lead sub-feature; separation makes dead-code detection and future splitting easier | Minor import footprint increase; strongly preferred |
| `trigger` is an open string in the API | New triggers can be added by the integration layer without changing the API contract | Admin UI must treat trigger as an unknown string for display/filter dropdowns (whitelist client-side if needed) |
| `channel` and `status` validated with `z.enum` | These are closed sets; letting clients pass arbitrary values would let them skip the index (or return empty sets) | Invalid values return 400 — desirable feedback to the UI |
| Server-side default limit (applied by storage layer, not API layer) | Single source of truth for pagination limits; API schema allows 1-500, storage clamps to max 500 | If someone bypasses storage later, they still hit the Zod cap |

## Deviations from Plan

None — plan executed exactly as written. Three files changed, zero scope additions.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Couldn't issue authenticated requests during smoke test (no admin session in a local curl) | Confirmed 401 response from both endpoints — that alone proves routing + middleware chain wired correctly. Full authenticated smoke is a UI concern for plan 01-04. |

## Next Phase Readiness

**Ready:**
- Plan 01-04 can import `api.notificationLogs.list.input` from `#shared/routes` for typed query-string construction
- Both endpoints return `NotificationLog[]` directly — no envelope wrapper to unwrap on the client
- Zod validation errors carry the detailed `errors` array, suitable for field-level UI error display if ever needed
- `requireAdmin` middleware matches the auth pattern the admin UI already assumes

**Concerns:**
- No pagination metadata in the response (X-Total-Count, Link headers) — UI will need to infer "has more" from whether the returned array length === limit. Acceptable for v1.1 given expected volume; reconsider if the admin "Notification Log" table grows into thousands per day.
- `trigger` open-string means the UI filter dropdown will need either (a) a client-side whitelist matching current triggers or (b) fetching distinct triggers from the server (not provided). Plan 01-04 should pick one explicitly.

**Blockers:** None

---
*Phase: 01-lead-notification-log, Plan: 03*
*Completed: 2026-04-16*
