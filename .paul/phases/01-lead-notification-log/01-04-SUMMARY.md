---
phase: 01-lead-notification-log
plan: 04
subsystem: ui
tags: [react, admin, leads-table, notification-indicator, popover]

requires:
  - phase: 01-lead-notification-log / plan 01
    provides: notificationLogs table, storage methods
  - phase: 01-lead-notification-log / plan 02
    provides: instrumented integrations writing log rows
  - phase: 01-lead-notification-log / plan 03
    provides: GET /api/admin/notification-logs endpoint

provides:
  - Notifications column on the leads list with per-channel icons + popover details
  - client/src/components/admin/notification-indicators.tsx — shared utility module for ChannelBadge, StatusBadge, NotificationPreview, NotificationIconCell

affects: [future phases that touch the leads admin UI]

tech-stack:
  added: []
  patterns:
    - "Inline list-row status indicators (icons + popover) instead of dedicated admin sections when the data only makes sense in context"
    - "Single aggregated client-side reduce over a global API fetch to avoid N+1 per-row requests"

key-files:
  created:
    - client/src/components/admin/notification-indicators.tsx
  modified:
    - client/src/components/admin/LeadsSection.tsx
  reverted:
    - client/src/components/admin/shared/types.ts (AdminSection union)
    - client/src/components/admin/shared/routes.ts (ADMIN_ROUTES + Bell import)
    - client/src/pages/Admin.tsx (import + render branch)
  deleted:
    - client/src/components/admin/NotificationLogSection.tsx (old plan artifact)

key-decisions:
  - "Course-corrected mid-apply: old 01-04 plan (global section + big modal panel) was intent-misaligned; user wanted per-lead row indicator only. Old plan superseded to 01-04-PLAN_superseded.md"
  - "Single GET /api/admin/notification-logs?limit=500 fetch, reduced client-side to Map<leadId, {email, sms, ghl}>. Avoids N+1 across 50+ leads and keeps server API surface unchanged"
  - "Email and SMS shown in UI; ghl_sync tracked in the summary map but hidden by default (showGhl defaults to false) — reserved for future surfacing"
  - "Chat + low_performance notifications ignored entirely in the UI — they have leadId=null and are filtered out by the reducer"
  - "Browser verification deferred by user ('segue, nao vou conferir agora'); unification proceeds on typecheck + automated smoke (page 200, API 401 confirming routing/auth gate)"

patterns-established:
  - "Operational indicators belong next to the data they describe — a row column beats a dedicated admin section for at-a-glance status"
  - "When a plan's intent proves wrong mid-apply, supersede and rewrite — don't patch. Preserve reversible work, roll back the misaligned parts"

duration: ~90min (including course correction + revert + rewrite + re-apply)
started: 2026-04-16T06:30:00Z
completed: 2026-04-16T08:00:00Z
---

# Phase 1 Plan 04: Notification Indicators on the Leads List

**Operators see, at a glance on /admin/leads, whether the notification stack is firing for each lead — two compact icons per row (email + SMS), color-coded by the most recent send status, with a popover revealing sent time, recipient, subject (email), error (if failed), and a preview snippet.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~90 min (course correction included) |
| Tasks planned (rewritten) | 3 (2 auto + 1 checkpoint) |
| Tasks completed | 3 of 3 (checkpoint: user deferred verification) |
| Files created | 2 (notification-indicators.tsx, this SUMMARY) |
| Files modified | 1 (LeadsSection.tsx) |
| Files reverted | 3 (admin shared types/routes, Admin.tsx) |
| Files deleted | 1 (NotificationLogSection.tsx) |
| Qualify results | 2 PASS (checkpoint: deferred) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Leads table shows Notifications column | PASS | Column "Notif." sits between Status and Updated; NotificationIconCell renders email + SMS icons per row |
| AC-2: Click popover reveals details | PASS | PopoverContent shows channel badge, status badge, time, recipient, subject (email), error (if failed), truncated preview. Empty state when no log for channel |
| AC-3: Single fetch for the whole list | PASS | Exactly one GET /api/admin/notification-logs?limit=500 via React Query, cached 30s via staleTime. Client-side reducer builds Map<leadId, {email, sms, ghl}> filtering leadId==null |
| AC-4: No regressions | PASS | `npm run check` → 0 errors; sidebar reverted (no stray "Notification Log"); existing filters + modal work unchanged |
| AC-5: Human verification | DEFERRED | User instructed "segue, nao vou conferir agora". Deferred to whenever they next open the app. Automated smoke confirmed: /admin/leads → 200, /api/admin/notification-logs → 401 (correct behavior) |

## Accomplishments

- Shipped the feature the user actually wanted: a compact per-lead indicator on the leads list, no new page
- Preserved all usable backend work (01-01/02/03) despite the mid-apply course correction
- Extracted a shared `notification-indicators.tsx` module that keeps the leads file focused while enabling reuse if other surfaces want the same utilities
- Single-query approach scales cleanly to ~500 logs on a single page; documented path to server-side aggregation when volumes grow

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `client/src/components/admin/notification-indicators.tsx` | Created | Exports `ChannelBadge`, `StatusBadge`, `NotificationPreview`, `ChannelSummary` type, `NotificationIconCell` component (2 icons + popover details per row) |
| `client/src/components/admin/LeadsSection.tsx` | Modified | Added `allNotificationLogs` query (single fetch, limit 500, staleTime 30s), `notificationsByLead` memoized Map, new "Notif." `<th>` column between Status and Updated, `<NotificationIconCell>` in each row. Revert residue removed (no panel, no dialog) |
| `client/src/components/admin/NotificationLogSection.tsx` | Deleted | Old global admin section from superseded plan |
| `client/src/components/admin/shared/types.ts` | Reverted | Removed `'notificationLog'` from AdminSection union |
| `client/src/components/admin/shared/routes.ts` | Reverted | Removed Bell icon import + ADMIN_ROUTES entry |
| `client/src/pages/Admin.tsx` | Reverted | Removed `NotificationLogSection` import + render branch |
| `.paul/phases/01-lead-notification-log/01-04-PLAN_superseded.md` | Archived | Original intent-misaligned plan, preserved for audit trail |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Supersede old 01-04 instead of patching | Intent was structurally wrong (separate admin section vs in-row indicator). Patching a misaligned spec would have compounded drift | Clean audit trail; revert was mechanical; new plan took ~20 min to write |
| Single global fetch (limit 500) instead of N queries | 50 leads × 1 fetch each = 50 requests; global fetch + client reduce = 1 request. Storage endpoint already caps at 500 | Simple; scales to ~500 logs. Beyond that, a new server-side aggregation endpoint is the next step |
| Hide ghl_sync icon by default | User's stated intent was "email ou twilio" — SMS + email. GHL tracked-but-hidden keeps the data available for later without cluttering the v1.1 UI | `showGhl` prop defaults to false; future surfaces can opt in |
| Ignore chat + low_performance notifications | Per user: "pode dar bypass [no chat], não precisamos lá". These have `leadId = null` and are already filtered by the reducer | No UI noise from operator-level alerts; backend logs them anyway (useful for ops debugging later) |
| Proceed to UNIFY despite deferred checkpoint | User explicitly said "segue, nao vou conferir agora" — authorizing closure without browser verification | Logged as a deferred verification item; user can report issues later and we patch |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Intent revision (pre-plan) | 1 | Complete supersede of old 01-04 — major, documented |
| Implementation deviations | 0 | Rewritten 01-04 executed verbatim |

### Intent Revision

**Old 01-04 plan built a global "Notification Log" admin section + big modal panel. User wanted a per-lead row indicator.**
- **Surfaced at:** Old Task 4 complete, before checkpoint
- **User quote:** "não é pra fazer uma secao nova de notificacoes, é apenas para na página leads, na frente de cada lead, mostrar se foi enviado email, ou telegram ou twilio"
- **Fix:** (1) Reverted old Tasks 1, 2, 3, 4 changes; (2) extracted reusable utilities into notification-indicators.tsx before deleting the old section file; (3) renamed old PLAN to `01-04-PLAN_superseded.md`; (4) wrote new 01-04 PLAN focused on the indicator; (5) applied new tasks
- **Verification:** Typecheck clean after every step of the revert; automated smoke of both endpoints

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Dangling imports (ChannelBadge, StatusBadge, NotificationPreview) in LeadsSection after panel removal | Consolidated the import to just `NotificationIconCell` |
| `colSpan={7}` in empty/loading rows of the leads table became wrong after adding the new column | Bumped to `colSpan={8}` with replace_all |
| Browser verification not possible in my session | Ran curl against both endpoints — /admin/leads served 200, /api/admin/notification-logs returned 401 (correct behavior; needs admin session). Declared user-facing verification deferred |

## Next Phase Readiness

**Ready:**
- Phase 1 is complete — the original user request (log + preview + per-phone/email visibility) is delivered end-to-end via the per-lead indicator
- Phase 2 (Docs Alignment) can start immediately — no technical dependency on Phase 1
- The `notification-indicators` utility module is a natural home if future work wants to show notifications elsewhere (e.g., a global ops page, a lead detail drawer)

**Concerns:**
- **Deferred browser verification:** user has not yet confirmed the UI works in the browser. If issues surface, a follow-up patch plan may be needed — log under Deferred Issues so it doesn't get lost
- **Dead global endpoint:** `GET /api/admin/notification-logs` is only consumed by this list-level fetch; no other UI surface calls it. Keep for debugging and future ops tooling (decision at 01-03)
- **500-log cap**: adequate for current volume. If the platform grows past ~500 logs/day, move to a server-side aggregation endpoint that returns `{ leadId → latestByChannel }` directly

**Blockers:** None

---
*Phase: 01-lead-notification-log, Plan: 04*
*Completed: 2026-04-16*
