---
phase: 01-lead-notification-log
plan: 01
subsystem: database
tags: [drizzle, postgres, supabase, schema, storage-layer, zod]

requires:
  - phase: none
    provides: initial schema baseline

provides:
  - notificationLogs table in Postgres
  - NotificationLog / InsertNotificationLog types + insertNotificationLogSchema (Zod)
  - IStorage.createNotificationLog / getNotificationLogsByLead / listNotificationLogs

affects: [01-02-logging-helper, 01-03-api-endpoints, 01-04-admin-ui]

tech-stack:
  added: []
  patterns:
    - "Additive SQL migration stored under migrations/ as handwritten .sql (project convention — drizzle-kit has no journal here)"
    - "Dynamic filter builder for list queries with conditions array + Math.min/Math.max limit clamp"

key-files:
  created:
    - migrations/add_notification_logs.sql
  modified:
    - shared/schema.ts
    - server/storage.ts

key-decisions:
  - "FK notification_logs.lead_id ON DELETE SET NULL — preserve logs when leads are deleted for audit integrity"
  - "Legacy form_leads flags (notificacaoEnviada, notificacaoAbandonoEnviada) kept — log is complementary, not a replacement"
  - "Migration applied via handwritten SQL + one-shot Node/pg runner instead of drizzle-kit push (TTY-blocked)"

patterns-established:
  - "Schema changes: add table in shared/schema.ts → add handwritten migrations/*.sql with IF NOT EXISTS guards → apply via a one-shot runner, then delete runner"
  - "listX filters: conditions[] with and(...), optional search via OR ilike over text columns, clamped limit/offset"

duration: ~30min
started: 2026-04-15T20:30:00Z
completed: 2026-04-16T04:40:00Z
---

# Phase 1 Plan 01: Lead Notification Log — Schema & Storage

**Added `notification_logs` table + Drizzle types + Zod schema + three storage methods (create / getByLead / list) ready for integration instrumentation in plan 01-02.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Tasks | 3 of 3 completed |
| Files modified | 2 (+1 created) |
| Qualify results | 3 PASS, 0 GAP, 0 DRIFT |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Table and types exist | PASS | 13 columns + 4 custom indexes + pkey; `NotificationLog`, `InsertNotificationLog`, `insertNotificationLogSchema` exported |
| AC-2: Migration applied | PASS | Table live in Supabase; re-running the apply script is idempotent (`IF NOT EXISTS` + FK constraint existence check) |
| AC-3: Storage methods work | PASS | Typecheck validates method signatures; direct SQL round-trip probe (insert → list → delete) returned 1 row at each step |
| AC-4: No regressions | PASS | `npm run check` → 0 errors; no existing import of `shared/schema.ts` or `server/storage.ts` broken |

## Accomplishments

- `notification_logs` table live in Supabase with FK to `form_leads(id)` ON DELETE SET NULL and 4 targeted indexes (lead_id, sent_at, channel, status)
- Storage contract exposed on `IStorage` + `DatabaseStorage` — plan 01-02 can now call `storage.createNotificationLog()` directly without further schema work
- Permanent SQL migration file committed-ready at `migrations/add_notification_logs.sql` with IF NOT EXISTS guards and FK idempotency check

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `shared/schema.ts` | Modified | Added `notificationLogs` table, `insertNotificationLogSchema`, `NotificationLog`, `InsertNotificationLog`; added `varchar` to pg-core imports |
| `server/storage.ts` | Modified | Added `notificationLogs`, `NotificationLog`, `InsertNotificationLog` imports; added 3 methods on `IStorage` interface and 3 implementations on `DatabaseStorage` |
| `migrations/add_notification_logs.sql` | Created | Permanent, idempotent SQL migration — create table + FK + 4 indexes, all guarded by IF NOT EXISTS / DO block |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Handwritten SQL migration + one-shot runner (not `drizzle-kit push`) | drizzle-kit push requires a TTY prompt ("create or rename?") that stdin piping can't answer; `drizzle-kit generate` produces a full baseline for all 19 tables because this repo has no drizzle journal | Future additive schema changes should follow the same pattern until the project adopts a proper drizzle journal; documented in patterns-established |
| FK `ON DELETE SET NULL` (not CASCADE) | Delete a lead, keep its notification history for audit / compliance | Queries that fetch logs must handle `leadId = null` (orphaned-but-preserved rows) |
| Legacy `notificacaoEnviada` / `notificacaoAbandonoEnviada` flags preserved | Those flags are used for dedup in `abandonedNotifications.ts` and lead-completion handler; removing would risk double-sending | Log is complementary; plan 01-02 writes to the log without touching the flags |
| `search` in `listNotificationLogs` does OR across recipient / preview / subject with ILIKE | Covers the common admin use-case "find that SMS I sent to +55..." or "find the email with subject X" without multiple filter params | No full-text index added — fine for current volume; revisit if table grows past ~500k rows |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Approach change | 1 | Essential — plan's migration command was TTY-blocked |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** One essential pivot around the migration tool; no functional scope change.

### Approach Changes

**1. [migration] drizzle-kit push replaced by handwritten SQL + one-shot Node runner**
- **Found during:** Task 3 (Apply migration)
- **Issue:** `drizzle-kit push` uses the `prompts` library in raw-TTY mode for the "created or renamed from another table?" disambiguation. Piping stdin or the `--force` flag does not answer it. `drizzle-kit generate` falls back to producing a full baseline for all 19 existing tables because this repo has no drizzle journal (`migrations/meta/`).
- **Fix:** Wrote `migrations/add_notification_logs.sql` with `IF NOT EXISTS` + FK existence guard, and applied via a one-shot `scripts/apply-notification-logs-migration.mjs` runner using the project's existing `pg` dependency. Verified idempotency by running twice; verified behavior with an insert/list/delete probe. Runner scripts were removed after verification — the SQL file is the permanent record.
- **Files:** `migrations/add_notification_logs.sql` (kept); `scripts/apply-notification-logs-migration.mjs`, `scripts/probe-notification-logs.mjs` (deleted after run).
- **Verification:** Table exists in Supabase with 13 cols + 5 indexes (4 custom + pkey); re-apply is a no-op; insert/list/delete round-trip succeeded.

### Deferred Items

None — plan executed as specified apart from the migration-tool substitution above.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `npm run check` failed with "'tsc' is not recognized" initially | `node_modules/` was absent in the fresh worktree; ran `npm install` (802 packages) before retrying |
| `drizzle-kit push` blocked on interactive TTY prompt | See Approach Change above — switched to handwritten SQL + Node runner |
| Ambiguity: is `DATABASE_URL` in `.env` prod or dev? | Paused Task 3 and asked user explicitly before applying migration; user authorized |

## Next Phase Readiness

**Ready:**
- Plan 01-02 can `import { storage } from "./storage"` and call `storage.createNotificationLog({ channel, trigger, recipient, preview, status, ... })` directly
- Types and Zod validator available for API handlers in plan 01-03
- Table indexed on the exact columns 01-03/01-04 will filter on (channel, status, leadId, sentAt)

**Concerns:**
- Migration pattern (handwritten SQL + one-shot runner) is now the project convention for additive changes. Future phases should either follow this or introduce a proper drizzle journal as a dedicated phase
- No runtime validation that `channel` / `status` / `trigger` strings match their allowed sets yet — deferred to the logging helper in 01-02 where the call site is typed

**Blockers:** None

---
*Phase: 01-lead-notification-log, Plan: 01*
*Completed: 2026-04-16*
