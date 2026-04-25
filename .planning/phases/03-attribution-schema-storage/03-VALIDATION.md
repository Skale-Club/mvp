---
phase: 3
slug: attribution-schema-storage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript type-checker (`npm run check`) + manual Supabase inspector |
| **Config file** | tsconfig.json (already exists) |
| **Quick run command** | `npm run check` |
| **Full suite command** | `npm run check && npm run build` |
| **Estimated runtime** | ~10–20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check`
- **After every plan wave:** Run `npm run check && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green + manual Supabase inspector confirms tables/RLS
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Manual Check | Status |
|---------|------|------|-------------|-----------|-------------------|--------------|--------|
| 3-01-01 | 01 | 1 | SESSION-04, SESSION-05, ATTR-01, ATTR-02 | type-check | `npm run check` | Supabase tables visible | ⬜ pending |
| 3-01-02 | 01 | 1 | ATTR-01, ATTR-02 | type-check | `npm run check` | UNIQUE constraint on visitor_id | ⬜ pending |
| 3-01-03 | 01 | 1 | ATTR-01, ATTR-02 | type-check | `npm run check` | IStorage methods compile | ⬜ pending |
| 3-02-01 | 02 | 2 | SESSION-04 | type-check | `npm run check` | RLS INSERT policy active | ⬜ pending |

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements (type-check only — no test framework installed in this project per CLAUDE.md).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RLS anon INSERT on visitor_sessions | SESSION-05 | Supabase RLS policies not created by db:push | Open Supabase > Authentication > Policies; verify INSERT policy exists for anon role on visitor_sessions and attribution_conversions |
| UNIQUE constraint on visitor_sessions.visitor_id | SESSION-05 | Constraint only visible in DB inspector | Open Supabase > Table Editor > visitor_sessions > columns; verify visitor_id has unique constraint |
| form_leads new columns present | ATTR-03, ATTR-04 | Column addition via db:push | Open Supabase > Table Editor > form_leads; verify visitor_id, source_channel, first_touch_source, etc. columns exist |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
