# Retrospective: mvp

> Living document — one section per milestone. Append new sections at the top.

---

## Milestone: v1.2 — Marketing Attribution

**Shipped:** 2026-04-27
**Phases:** 5 (Phases 3–7) | **Plans:** 15 | **Tasks:** 22
**Timeline:** 3 days (2026-04-25 → 2026-04-27)

### What Was Built

- Attribution DB schema — `visitor_sessions`, `attribution_conversions`, form_leads enrichment, RLS
- Attribution API — session upsert, conversion recording, lead-flow IIFE (non-blocking)
- Client `useAttribution` hook — UTM capture, referrer classification, `mvp_vid`, conversion events
- Admin Marketing section — 5 tabs (Overview KPI+chart, Sources, Campaigns, Conversions, Journey), 7-preset date filter
- Journey tab — Conversions→Journey navigation, vertical event timeline
- Lead attribution panel — Marketing Attribution collapsible, `channelLabel()` shared utility

### What Worked

- **Wave-based parallel execution** in Phase 6 (3 parallel agents for tabs 02/03/04) and Phase 7 (2 parallel agents for Journey + Attribution panel) dramatically reduced elapsed time with zero logical conflicts
- **Detailed CONTEXT.md with exact code specs** — plans could be executed with minimal codebase exploration because decisions were pre-answered with concrete implementation guidance
- **Fire-and-forget constraint enforced upfront** — defining in Phase 3 context that attribution writes never block the lead submit path prevented rework in Phase 4
- **`channelLabel()` as shared utility** — extracting into `utils.ts` in Phase 7 Wave 1 before both Wave 2 agents ran prevented label drift between Journey tab and Lead panel

### What Was Inefficient

- **Worktree merge conflicts on planning docs** — STATE.md and ROADMAP.md conflicted on every parallel wave merge because agents both updated them. Resolved by keeping HEAD (more current) and manually applying ROADMAP plan markers. Could be avoided by having agents skip STATE/ROADMAP updates and having the orchestrator own those.
- **`MarketingTabPlaceholder` removal timing** — Phase 6 Plan 04 (Conversions tab) ran in isolation and had to inline-replace Overview/Sources/Campaigns placeholders that 02/03 hadn't touched yet in the worktree. Resulted in extra orchestrator work reconciling the Conversions TabsContent after merge.
- **Stale requirements traceability** — Several Phase 4/5 requirements stayed "Pending" in REQUIREMENTS.md because agents focused on code commits and didn't reliably update the traceability table. Required manual cleanup at milestone close.

### Patterns Established

- `admin/marketing/` sub-directory with per-tab component files + shared `utils.ts` — use for any future admin section with multiple data views
- Controlled Tabs (`value` + `onValueChange`) when programmatic navigation is needed; uncontrolled (`defaultValue`) otherwise — the migration in Phase 7 was a small but necessary change
- Route-layer enrichment (not IStorage widening) for single-consumer query joins — keeps IStorage interface stable

### Key Lessons

- Plan CONTEXT.md decisions at the code-specification level (exact function signatures, exact string literals) rather than at the intention level — executor agents produce higher-quality output with less exploration overhead
- Parallel agents should NOT update shared planning docs (STATE.md, ROADMAP.md) — orchestrator should own those after agents return
- The "business-first labels, no utm_* visible" constraint is easy to verify programmatically — include it as an acceptance criterion on every marketing UI task, not just a design note

### Cost Observations

- Model mix: planner on Opus 4, executor/verifier on Sonnet 4.6
- 3 parallel execution waves across 2 phases saved estimated 40% of serial execution time
- Verification on first pass: 6/7 Phase 6 (1 gap: missing date presets), 10/10 Phase 7 — gap caught by verifier before archiving

---

## Cross-Milestone Trends

| Metric | v1.1 | v1.2 |
|--------|------|------|
| Phases | 2 | 5 |
| Plans | ~8 | 15 |
| Days elapsed | ~2 | 3 |
| Verification pass rate | — | 93% first-pass |
| Parallel waves used | 0 | 2 |
| Post-ship gaps | 0 | 1 (date presets, caught by verifier) |
