---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Marketing Attribution
status: completed
last_updated: "2026-04-25T15:39:42.775Z"
last_activity: 2026-04-25
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-25)

**Core value:** Production service-business site for MVP + forkable base template for other clients.
**Current focus:** Phase 03 — attribution-schema-storage

## Current Position

Phase: 4
Plan: Not started
Status: 03-02 COMPLETE — IStorage + DatabaseStorage attribution methods, shared/marketing-types.ts created, build passing
Last activity: 2026-04-25

Progress: [██████████] 100% (phase 03)

## Performance Metrics

**Velocity:**

- Total plans completed (v1.2): 1
- Average duration: 30 min
- Total execution time: 30 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 03 | 1/2 | 30 min | 30 min |

**Recent Trend:** 1 plan completed (03-01 schema + DDL + RLS).

*Updated after each plan completion*
| Phase 03 P02 | 5 | 2 tasks | 2 files |

## Accumulated Context

### Decisions (Phase 03 Plan 02)

| Decision | Phase | Impact |
|----------|-------|--------|
| linkLeadToVisitor does UUID lookup then integer FK update | 03-02 | formLeads.visitorId is integer FK to visitorSessions.id; plan example assumed text UUID but schema uses integer |
| createAttributionConversion uses explicit conversionType cast | 03-02 | drizzle-zod cannot infer $type<> union; cast is TypeScript-only, runtime value is always correct |

### Decisions (Phase 03 Plan 01)

| Decision | Phase | Impact |
|----------|-------|--------|
| FK columns for visitor_sessions references use integer (not uuid) targeting serial PK | 03-01 | Avoids PostgreSQL type mismatch; matches notificationLogs.leadId convention |
| conversionType uses text + $type<> annotation, not pgEnum | 03-01 | drizzle-zod cannot infer $type<>(); server enum validation deferred to Phase 4 routes |

### Decisions (Carried from v1.1)

| Decision | Phase | Impact |
|----------|-------|--------|
| Notification log in a new table (not in formLeads) | v1.1 Phase 1 | Multiple logs per lead; log survives lead deletion |
| FK notification_logs.lead_id ON DELETE SET NULL | v1.1 01-01 | Logs survive lead deletion — query sites must handle leadId = null |
| Optional logContext param on integration functions | v1.1 01-02 | Legacy callers compileable; untouched callers log without leadId |
| Pre-flight skips not logged | v1.1 01-02 | Only actual send attempts produce rows |
| Read-only notification API in v1.1 | v1.1 01-03 | No POST/PATCH/DELETE for logs — resend/delete deferred |
| Single global fetch (limit 500) + client-side reduce for per-lead icons | v1.1 01-04 | 1 request vs N+1; revisit when logs exceed ~500/day |

### Key Architectural Constraints (v1.2)

- `visitor_sessions.visitor_id` must be UNIQUE (not just indexed) — ON CONFLICT upsert requires it
- First-touch columns written once on insert; Drizzle updates must name lt_* columns explicitly, never spread full UTM object
- UTM capture in App root useEffect with `[]` — never in route components (Wouter destroys URL params on navigation)
- `mvp_vid` (localStorage) is the visitor identity key — separate from existing `formLeads.sessionId`
- Attribution writes in the lead flow are fire-and-forget — wrapped in try/catch, never await in critical path
- RLS policies must be applied manually after each `db:push` (not automated by Drizzle)
- Dashboard aggregate queries use `attribution_conversions` (denormalized); reserve `visitor_sessions` joins for journey view only
- Server enforces default date range (30 days) on all marketing queries to prevent unbounded table scans

### Deferred Issues (Carried from v1.1)

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Refactor of monolithic Admin.tsx | v1.1 | L | v1.3+ |
| Resend failed notifications via UI | v1.1 | M | v1.3 if recurring failures |
| Retention/TTL for notification logs | v1.1 | S | When table grows |
| Drizzle journal / standard migration workflow | v1.1 | M | Before frequent schema changes |
| Server-side aggregation for per-lead last-by-channel | v1.1 | M | When log volume > ~500/day |

### Blockers/Concerns

None.

---
*STATE.md — Updated after every significant action*
