# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-25)

**Core value:** Production service-business site for MVP + forkable base template for other clients.
**Current focus:** v1.2 — Marketing Attribution

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-25 — Milestone v1.2 started

## Accumulated Context

### Decisions (Carried from v1.1)

| Decision | Phase | Impact |
|----------|-------|--------|
| Notification log in a new table (not in formLeads) | v1.1 Phase 1 | Multiple logs per lead; log survives lead deletion |
| FK notification_logs.lead_id ON DELETE SET NULL | v1.1 01-01 | Logs survive lead deletion — query sites must handle leadId = null |
| Optional logContext param on integration functions | v1.1 01-02 | Legacy callers compileable; untouched callers log without leadId |
| Pre-flight skips not logged | v1.1 01-02 | Only actual send attempts produce rows |
| Read-only notification API in v1.1 | v1.1 01-03 | No POST/PATCH/DELETE for logs — resend/delete deferred |
| Single global fetch (limit 500) + client-side reduce for per-lead icons | v1.1 01-04 | 1 request vs N+1; revisit when logs exceed ~500/day |

### Deferred Issues (Carried from v1.1)

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Refactor of monolithic Admin.tsx | docs/ADMIN_REFACTOR_PLAN.md | L | Consider for v1.3+ |
| Resend failed notifications via UI | v1.1 Phase 1 | M | v1.3 if recurring failures appear |
| Retention/TTL for notification logs | v1.1 Phase 1 | S | When table grows |
| Drizzle journal / standard migration workflow | v1.1 01-01 | M | Dedicated phase before frequent schema changes |
| Server-side aggregation for per-lead last-by-channel | v1.1 01-04 | M | When log volume exceeds ~500/day |

### Blockers/Concerns

None.

---
*STATE.md — Updated after every significant action*
