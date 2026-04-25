---
phase: 05-client-utm-capture-hook
plan: 02
subsystem: client-attribution
tags: [attribution, utm, analytics, react, lead-form]
dependency_graph:
  requires: ["05-01"]
  provides: ["SESSION-01", "SESSION-03"]
  affects: ["client/src/App.tsx", "client/src/components/LeadFormModal.tsx"]
tech_stack:
  added: []
  patterns:
    - "useAttribution called once at App root (AnalyticsProvider) per D-02"
    - "getStoredVisitorId used in form component instead of hook per D-13/D-18"
key_files:
  created: []
  modified:
    - client/src/App.tsx
    - client/src/components/LeadFormModal.tsx
decisions:
  - "reportAttributionPageView added to [location, visitorId] effect — not a new separate effect — keeping hook count minimal"
  - "payload typed as 'any' in LeadFormModal so payload.visitorId assignment required no type widening"
  - "Cherry-picked Plan 01 attribution artifacts (attribution.ts, use-attribution.ts) into this worktree as prerequisite — they were committed on a parallel agent branch"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-25T22:30:18Z"
  tasks: 2
  files_modified: 2
---

# Phase 05 Plan 02: Client Attribution Wiring Summary

Wire the Plan 01 attribution utilities into the React tree: `useAttribution()` at App root and `getStoredVisitorId()` in the LeadFormModal payload.

## What Was Done

### Task 1 — Wire useAttribution into App.tsx (commit fa69b3c)

Two surgical edits to `client/src/App.tsx` inside `AnalyticsProvider`:

**Imports added (lines 12-13):**
```typescript
import { useAttribution } from "@/hooks/use-attribution";
import { reportAttributionPageView } from "@/lib/attribution";
```

**Hook call added (line 136)** — immediately after `const [location] = useLocation()` and before `const { resolvedTheme } = useTheme()`:
```typescript
const { visitorId } = useAttribution();
```

**Page-view effect updated (lines 152-155)** — `trackPageView` preserved, `reportAttributionPageView` added alongside it, `visitorId` added to deps array:
```typescript
useEffect(() => {
  trackPageView(location);
  reportAttributionPageView(location, visitorId);
}, [location, visitorId]);
```

Hook order in AnalyticsProvider after edit:
1. `useQuery<CompanySettings>` (settings)
2. `useLocation()` (location)
3. `useAttribution()` (visitorId) — NEW at line 136
4. `useTheme()` (resolvedTheme)
5. `useEffect(initAnalytics, [settings])`
6. `useEffect(trackPageView + reportAttributionPageView, [location, visitorId])` — UPDATED at lines 152-155
7. `useEffect(color token plumbing, [location, settings, resolvedTheme])`

### Task 2 — Inject visitorId into LeadFormModal payload (commit 3b38fa2)

Two surgical edits to `client/src/components/LeadFormModal.tsx`:

**Import added (line 8):**
```typescript
import { getStoredVisitorId } from "@/lib/attribution";
```

**Visitor ID injection (lines 481-485)** — inserted immediately before the `if (!effectiveAnswers.nome?.trim())` guard and the `try {` block:
```typescript
// Attach the persisted visitor ID so the server can link this lead to its visitor_sessions row.
// Per D-13/D-14: visitorId is optional; ...
const storedVisitorId = getStoredVisitorId();
if (storedVisitorId) {
  payload.visitorId = storedVisitorId;
}
```

`payload.visitorId` is assigned at line 485, before the `fetch("/api/form-leads/progress", ...)` call at line 494.

`payload` is typed as `any` — no type widening needed; `visitorId` field is already accepted by the server schema (Phase 4 Plan 01 added it to `formLeadProgressSchema`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 01 attribution files missing from worktree**
- **Found during:** Task 1 pre-flight
- **Issue:** `client/src/hooks/use-attribution.ts` and `client/src/lib/attribution.ts` were committed on the parallel Plan 01 agent's branch (`worktree-agent-a72f0205a2cf0f9a2`), not on the current Plan 02 branch. The files were absent from the worktree file system.
- **Fix:** Cherry-picked commits `0d44e64` and `d408404` from the Plan 01 branch with `--no-commit`, then committed them as a prerequisite commit (`3b051b8`) before proceeding with Task 1 and Task 2.
- **Files modified:** `client/src/hooks/use-attribution.ts` (created), `client/src/lib/attribution.ts` (created)
- **Commit:** 3b051b8

## Acceptance Criteria Verification

### Task 1

| Check | Result |
|-------|--------|
| `grep "from '@/hooks/use-attribution'"` — exactly 1 match | PASS (line 12) |
| `grep "from '@/lib/attribution'"` in App.tsx — exactly 1 match | PASS (line 13) |
| `grep "useAttribution()"` in App.tsx — exactly 1 match | PASS (line 136) |
| `grep "reportAttributionPageView(location, visitorId)"` — exactly 1 match | PASS (line 154) |
| `grep "[location, visitorId]"` deps array | PASS (line 155) |
| `grep "trackPageView(location)"` still present | PASS (line 153) |
| `useAttribution` in pages/components = 0 (except LeadFormModal comment) | PASS |
| `page_view` NOT added to `SERVER_REPORTED_EVENTS` in analytics.ts | PASS |
| `npm run check` passes | PASS |

### Task 2

| Check | Result |
|-------|--------|
| `grep "from '@/lib/attribution'"` in LeadFormModal — exactly 1 match | PASS (line 8) |
| `grep "getStoredVisitorId"` — exactly 2 matches (import + call) | PASS (lines 8, 483) |
| `grep "payload.visitorId"` — at least 1 match | PASS (line 485) |
| `getStoredVisitorId` (483) before fetch (494) | PASS |
| `grep "useAttribution()"` in LeadFormModal — 0 matches | PASS |
| `grep "mvp_vid"` direct localStorage access — 0 matches | PASS |
| `npm run check` passes | PASS |

## Commits

| Hash | Message | Files |
|------|---------|-------|
| 3b051b8 | feat(05-01): add attribution.ts utility module and useAttribution hook | client/src/lib/attribution.ts, client/src/hooks/use-attribution.ts |
| fa69b3c | feat(05-02): wire useAttribution into App.tsx AnalyticsProvider | client/src/App.tsx |
| 3b38fa2 | feat(05-02): inject visitorId into LeadFormModal form-leads payload | client/src/components/LeadFormModal.tsx |

## Known Stubs

None. Both wires use real data:
- `visitorId` is resolved from localStorage via `ensureVisitorId()` (not a mock UUID)
- `reportAttributionPageView` posts to `/api/analytics/hit` (real endpoint from Phase 4 Plan 02)
- `payload.visitorId` flows to `/api/form-leads/progress` which writes to `form_leads.visitor_id` (Phase 4 Plan 01)

## Self-Check: PASSED
