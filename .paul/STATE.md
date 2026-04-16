# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-16)

**Core value:** Production service-business site for MVP + forkable base template for other clients.
**Current focus:** v1.1 — Phase 2 (Docs Alignment)

## Current Position

Milestone: v1.1 Notification Log + Docs Alignment
Phase: 2 of 2 (Docs Alignment) — Applying
Plan: 02-01 applied; awaiting UNIFY
Status: APPLY complete, ready for UNIFY
Last activity: 2026-04-16 — Applied plan 02-01 (README + CLAUDE.md + AGENTS.md rewritten)

Progress:
- Milestone: [████████░░] 90%
- Phase 1: [██████████] 100% ✓
- Phase 2: [██████████] 100% (applied, pending unify)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [Ready for UNIFY]
```

## Accumulated Context

### Decisions

| Decision | Phase | Impact |
|----------|-------|--------|
| Notification log in a new table (not in `formLeads`) | Phase 1 | Multiple logs per lead and per recipient |
| Keep legacy flags (`notificacaoEnviada`, `notificacaoAbandonoEnviada`) | Phase 1 | Used for deduplication; log is complementary |
| FK `notification_logs.lead_id` ON DELETE SET NULL | 01-01 | Logs survive lead deletion — query sites must handle `leadId = null` |
| Handwritten SQL migration + one-shot Node/pg runner | 01-01 | Project convention until drizzle journal introduced |
| `search` filter = OR over recipient/preview/subject via ILIKE | 01-01 | No FTS index yet; revisit past ~500k rows |
| Optional `logContext` param (not required) on integration functions | 01-02 | Legacy `routes.old.ts` stays compileable; untouched callers log without leadId |
| Pre-flight skips (disabled settings) not logged | 01-02 | Only actual send attempts produce rows |
| `sendTestEmail` not instrumented | 01-02 | Operator noise exclusion |
| Resend `sendEmail` continues across recipient failures, returns first error | 01-02 | Matches prior semantics, complete audit even on partial failure |
| Read-only notification API in v1.1 | 01-03 | No POST/PATCH/DELETE for logs — resend/delete deferred |
| Separate `server/routes/notifications.ts` file | 01-03 | Distinct subsystem — cleaner dead-code analysis |
| `trigger` is an open string in API | 01-03 | New triggers added without API change; UI uses whitelist |
| No pagination metadata in response headers | 01-03 | UI infers "has more" from length == limit |
| Old 01-04 (global section + modal panel) superseded for intent mismatch | 01-04 | Old plan archived; rebuilt smaller |
| Per-lead row indicator instead of global section | 01-04 | Delivers exactly what user asked for (at-a-glance status) |
| Single global fetch (limit 500) + client-side reduce | 01-04 | 1 request vs N+1; scales to ~500 logs |
| Hide `ghl_sync` icon by default | 01-04 | User asked for email+SMS; GHL tracked-but-hidden |
| Chat + low_performance notifications excluded from UI | 01-04 | Per user: "pode dar bypass no chat" |
| No retry/resend in v1.1 | Phase 1 | Keeps scope tight; revisit in v1.2 |
| Current docs (CLAUDE.md/README/AGENTS) describe the wrong business | Phase 2 | Must be rewritten with "template + MVP production" tone |

### Deferred Issues

| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Refactor of monolithic `Admin.tsx` | docs/ADMIN_REFACTOR_PLAN.md | L | After v1.1 — consider for v1.2 |
| Resend failed notifications via UI | Phase 1 | M | v1.2 if recurring failures appear |
| Retention/TTL for notification logs | Phase 1 | S | When the table grows |
| Drizzle journal / standard migration workflow | 01-01 | M | Dedicated phase before frequent schema changes |
| Dead-code check on `server/routes.old.ts` | 01-02 | S | Check if still imported; delete if not |
| 01-04 browser verification (deferred by user) | 01-04 | S | User will check next time they open the app |
| Server-side aggregation endpoint for per-lead last-by-channel | 01-04 | M | When log volume exceeds ~500/day |

### Blockers/Concerns

None.

## Boundaries (Active)

From plan 02-01 (docs only):
- All code files — no `.ts`/`.tsx`/`.sql`/`.json` edits
- `.paul/**` — planning artifacts untouched
- `docs/**` — other docs untouched
- Only README.md, CLAUDE.md, AGENTS.md modified

## Session Continuity

Last session: 2026-04-16
Stopped at: Phase 1 complete — all 4 plans unified; TRANSITION pending (ROADMAP/PROJECT/git commit)
Next action: Run transition-phase updates (this session), then /paul:plan for Phase 2 (Docs Alignment)
Resume file: .paul/phases/01-lead-notification-log/01-04-SUMMARY.md

---
*STATE.md — Updated after every significant action*
