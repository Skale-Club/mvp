---
phase: 01-lead-notification-log
plan: 02
subsystem: integrations
tags: [twilio, resend, gohighlevel, notifications, logging, observability]

requires:
  - phase: 01-lead-notification-log / plan 01
    provides: notificationLogs table, storage.createNotificationLog(), InsertNotificationLog type

provides:
  - server/notifications/logger.ts — safe logNotification() + NotificationLogContext type
  - Instrumented Twilio (4 send functions, per-recipient logging)
  - Instrumented Resend (2 send functions + shared sendEmail helper, per-recipient logging)
  - Instrumented GHL getOrCreateGHLContact with success/failure logging
  - 9 call sites across 5 files passing { leadId, trigger }

affects: [01-03-api-endpoints, 01-04-admin-ui]

tech-stack:
  added: []
  patterns:
    - "Integration functions accept optional logContext?: NotificationLogContext as last param (backwards-compatible)"
    - "Per-recipient logging inside shared internal helpers (sendSms, sendEmail) — success and failure each produce exactly one row"
    - "Best-effort logger: try/catch in logNotification never re-throws, never breaks user-facing flow"

key-files:
  created:
    - server/notifications/logger.ts
  modified:
    - server/integrations/twilio.ts
    - server/integrations/resend.ts
    - server/integrations/ghl.ts
    - server/routes/leads.ts
    - server/routes/chat.ts
    - server/routes/chat/tools.ts
    - server/routes/integrations.ts
    - server/leads/abandonedNotifications.ts

key-decisions:
  - "Backwards-compatible instrumentation: all integration signatures gained a new OPTIONAL last param (logContext). No caller breaks. Legacy routes.old.ts still compiles."
  - "Pre-flight skips (disabled/incomplete settings) are NOT logged — only actual send attempts produce rows"
  - "sendTestEmail intentionally NOT instrumented — operator noise"
  - "Resend sendEmail continues to all recipients after a per-recipient failure (logs each) but returns the first failure message — mirrors existing aggregate-result contract"

patterns-established:
  - "Integration public functions pass logContext through to internal helpers via a local {trigger, leadId, recipientName?, metadata?} shape"
  - "Default triggers live at the public function layer (fallback) — callers override when they know the semantic trigger"
  - "JSON-stringified payload in preview for channel=ghl_sync (email/phone/customFieldsCount) since there's no human-readable message for CRM sync"

duration: ~45min
started: 2026-04-16T05:00:00Z
completed: 2026-04-16T05:45:00Z
---

# Phase 1 Plan 02: Notification Logging Helper + Integration Instrumentation

**Every outbound SMS, email, and GHL sync now writes one row per recipient into `notification_logs` — with leadId (when a lead is in scope), trigger, preview, status, and provider messageId — without changing any caller's return-shape contract.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 min |
| Tasks | 3 of 3 completed |
| Files modified | 7 (+1 created) |
| Qualify results | 3 PASS, 0 GAP, 0 DRIFT |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: logNotification helper is safe | PASS | try/catch wraps the insert, preview truncated at 5000 chars, always returns void |
| AC-2: One log row per recipient | PASS | sendSms loops and logs each; sendEmail loops and logs each; GHL logs once per call (one contact = one sync) |
| AC-3: Failures are logged | PASS | sendSms rethrows after writing failed row; sendEmail tracks `firstFailureMessage` and writes failed rows; GHL catches and logs failures |
| AC-4: Triggers correct per call site | PASS | grep confirms: 3 `lead_completed` (leads.ts), 2 `lead_completed` (chat/tools.ts), 1 `lead_abandoned`, 1 `low_performance`, 1 `new_chat`, 1 `contact_form` — 9 total |
| AC-5: No regressions | PASS | `npm run check` → 0 errors; all return shapes `{success, message?}` and `{success, contactId?, message?}` unchanged; legacy `routes.old.ts` still compiles |

## Accomplishments

- Complete audit trail for every notification send — SMS, email, and CRM sync — with zero loss of signal for partial multi-recipient failures
- Fully backwards-compatible API: adding `logContext?` as the last param means nothing existing had to change, including `server/routes.old.ts` (legacy) which still uses the old call shapes
- End-to-end probe validated: insert, query-by-channel, cleanup round-trip works against real Supabase DB

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `server/notifications/logger.ts` | Created | `logNotification()` safe helper + `NotificationLogContext` type |
| `server/integrations/twilio.ts` | Modified | Per-recipient logging in `sendSms`; added optional `logContext` to 4 exports |
| `server/integrations/resend.ts` | Modified | Per-recipient logging in `sendEmail`; added optional `logContext` to 2 exports; `sendTestEmail` left untouched |
| `server/integrations/ghl.ts` | Modified | `getOrCreateGHLContact` accepts `logContext`; logs once per call (success or failure) |
| `server/routes/leads.ts` | Modified | 3 call sites: hot-lead SMS, new-lead email, GHL sync — all passing `{ leadId: lead.id, trigger: "lead_completed" }` |
| `server/routes/chat.ts` | Modified | 2 call sites: low-performance alert, new-chat notification — leadId null |
| `server/routes/chat/tools.ts` | Modified | 2 call sites (chat-driven lead completion) — passing leadId |
| `server/routes/integrations.ts` | Modified | Contact form email — leadId null, trigger "contact_form" |
| `server/leads/abandonedNotifications.ts` | Modified | Abandonment sweep SMS — leadId from sweeping lead, trigger "lead_abandoned" |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Optional `logContext` at public function layer (not required) | Legacy code (routes.old.ts, future ad-hoc callers) stays compileable; only actively maintained code needs to pass context | Logs without leadId are possible (and acceptable) — UI will render "no lead" for those rows |
| Resend `sendEmail` continues across recipient failures instead of short-circuiting | Matches original semantics (the legacy code also iterated all recipients); gives complete audit rows even when one recipient fails | Aggregate return shape unchanged; partial success is still "success: false" with first error message |
| No retry, no resend, no backoff | Out of scope for v1.1 (deferred) | Future work can read logs + status="failed" to build retry flows |
| GHL logs once per sync attempt (not per phone/email lookup) | A sync is conceptually one atomic operation — breaking it into "email lookup log" + "phone lookup log" + "create log" would pollute the trail | Single row captures `providerMessageId` (GHL contactId) cleanly |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Scope additions | 2 | Essential — plan undercounted active call sites |
| Approach changes | 1 | Cleaner than the original design |

**Total impact:** Plan was directionally correct; execution found two call sites not listed and simplified the resend error-handling pattern.

### Scope Additions

**1. `server/routes/chat/tools.ts` — 2 call sites not listed in plan**
- **Found during:** Task 3 (grep for all active call sites)
- **Issue:** Plan enumerated leads.ts / chat.ts / abandonedNotifications.ts but missed chat/tools.ts which has its own hot-lead SMS + GHL sync path (triggered when a lead completes the form via the chat flow rather than the website form)
- **Fix:** Wired both sites with `{ leadId: lead.id, trigger: "lead_completed" }` matching the leads.ts pattern
- **Rationale:** Leaving these without logContext would have left leadId=null on logs for chat-completed leads — a silent gap in the audit trail

**2. `server/routes/integrations.ts` — contact form site not in plan**
- **Found during:** Task 3 grep
- **Issue:** `sendContactFormNotification` is called from the integrations route when users submit the public contact form
- **Fix:** Wired with `{ leadId: null, trigger: "contact_form" }` — no lead entity exists for contact form submitters

### Approach Changes

**1. resend.ts sendEmail error handling simplified**
- **Found during:** Task 2 (implementing sendEmail instrumentation)
- **Original plan:** Try/throw per recipient; outer catch logs + rethrows
- **Why changed:** The original pattern created a double-logging race (log inside the try, rethrow, then log again in the catch) that I tried to guard with a `__logged` flag — ugly and fragile
- **Cleaner approach:** Track status per-recipient in local variables (status, errorMessage, providerMessageId), log once at the end of the iteration, and use `firstFailureMessage: string | null` to aggregate the return shape. Same external behavior, clearer code.

### Deferred Items

None beyond what was already deferred at plan creation (retry, resend UI, TTL).

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Plan undercounted call sites (3 listed, 5 active) | Extended Task 3 scope; documented as scope addition |
| Initial resend.ts implementation used a hacky double-log guard | Rewrote with explicit per-recipient status tracking before landing |
| Had to distinguish "pre-flight skip" (settings invalid) from "send attempt failure" to avoid logging config-off states | Handled by only logging inside `sendSms` / `sendEmail` — validateConfig bails before those helpers run |

## Next Phase Readiness

**Ready:**
- `notification_logs` now accumulates real data as soon as the app runs in any environment where Twilio/Resend/GHL are enabled
- Plan 01-03 can hit `storage.listNotificationLogs({ leadId?, channel?, status?, trigger?, from?, to?, search? })` against a populated dataset
- All indexes required by expected filter queries already exist (from 01-01)

**Concerns:**
- `routes.old.ts` still exists and still calls the old (4-arg) signatures. It compiles because logContext is optional, but any notifications it triggers will have leadId=null. If this file is still active (not just archived), 01-04's admin UI should note those rows. Quick check: if the app no longer imports routes.old.ts, it's dead code and can be removed as a cleanup task in a later phase.
- `sendTestEmail` in resend.ts is intentionally excluded from logging — if operators complain about "why don't my test emails show up in logs?", this is the reason and it was a deliberate choice.

**Blockers:** None

---
*Phase: 01-lead-notification-log, Plan: 02*
*Completed: 2026-04-16*
