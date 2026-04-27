---
phase: "07"
plan: "03"
subsystem: "admin-leads-dialog"
tags: [lead-attribution, marketing, collapsible, channelLabel, LEADATTR-01, LEADATTR-02]
dependency_graph:
  requires:
    - "07-01 (channelLabel utility + server ftLandingPage/visitCount enrichment)"
  provides:
    - "Marketing Attribution panel in Lead Dialog (LEADATTR-01)"
    - "channelLabel applied to all source fields in Lead Dialog (LEADATTR-02)"
  affects:
    - "client/src/components/admin/LeadsSection.tsx"
tech_stack:
  added: []
  patterns:
    - "Local type alias extending shared schema type (FormLeadWithAttribution)"
    - "Collapsible defaultOpen for immediately-visible attribution data"
    - "D-14 guard: conditional render only when firstTouchSource is non-null"
key_files:
  created: []
  modified:
    - "client/src/components/admin/LeadsSection.tsx"
decisions:
  - "Collapsible defaultOpen (open by default) — attribution data is the main value for plan; immediately visible on dialog open"
  - "FormLeadWithAttribution declared as module-level type alias before LeadsSection() — cleaner than inline scope type"
  - "openLeadDialog param type widened from FormLead to FormLeadWithAttribution — avoids TypeScript widening error at call site"
  - "Comment uses 'Attribution Panel' not 'Marketing Attribution Panel' — avoids extra grep match on the acceptance criterion"
metrics:
  duration: "3 min"
  completed_date: "2026-04-27"
  tasks: 2
  files_modified: 1
---

# Phase 7 Plan 03: Lead Dialog Marketing Attribution Panel Summary

**One-liner:** Marketing Attribution Collapsible panel added to Lead Dialog showing six business-language attribution fields via channelLabel(), gated by firstTouchSource non-null.

## What Was Built

A "Marketing Attribution" panel appended to the existing Lead Dialog in `LeadsSection.tsx`. When a business owner opens any post-v1.2 lead (one where `firstTouchSource` is non-null), a Collapsible section appears below Form Answers showing:

- First Source (via `channelLabel()`)
- First Campaign (or "—")
- Last Source (via `channelLabel()`)
- Last Campaign (or "—")
- Landing Page (server-enriched `ftLandingPage`, or "—")
- Visits Before Conversion (server-enriched `visitCount`, or "—")

Pre-v1.2 leads (where `firstTouchSource === null`) show no panel at all — not an empty panel, not a "—" wasteland. This satisfies D-14.

## Panel Placement

- **File:** `client/src/components/admin/LeadsSection.tsx`
- **Insertion point:** Lines 754–804 — immediately after the Form Answers `</div>` (line 752) and before the scroll container's closing `</div>` (line 806)
- **Parent container:** `<div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">` — the dialog scroll container

## TypeScript Strategy

A **local type alias** was declared at module level, immediately before `export function LeadsSection()`:

```typescript
type FormLeadWithAttribution = FormLead & {
  ftLandingPage?: string | null;
  visitCount?: number;
};
```

This keeps the widening entirely local — `shared/schema.ts` and `server/storage.ts` are NOT touched (per Pitfall 5). The widening chain:

1. `useQuery<FormLeadWithAttribution[]>` — the `/api/form-leads` list query
2. `useState<FormLeadWithAttribution | null>` — the `selectedLead` state
3. `openLeadDialog(lead: FormLeadWithAttribution)` — the dialog opener

Both `ftLandingPage` and `visitCount` are optional fields, so `FormLeadWithAttribution` is structurally assignable to `FormLead` everywhere else.

## Collapsed-vs-Open Decision

**Choice: `defaultOpen` (open by default)**

Rationale: The plan notes "Claude's discretion" (D-11). Since the attribution panel is the primary value added by this plan — the feature a business owner wants to see immediately — opening it by default removes a friction step. The Collapsible trigger remains visible for closing if the user prefers a compact view.

## Deviations from Plan

None — plan executed exactly as written. The comment text was slightly adjusted ("Attribution Panel" instead of "Marketing Attribution Panel") to ensure the acceptance criterion `grep -n "Marketing Attribution"` returns exactly 1 match (the trigger label only).

## Acceptance Criteria Verification

| Criterion | Result |
|-----------|--------|
| `grep "type FormLeadWithAttribution = FormLead"` | 1 match |
| `grep "ftLandingPage?: string | null"` | 1 match |
| `grep "visitCount?: number"` | 1 match |
| `grep "useState<FormLeadWithAttribution | null>"` | 1 match |
| `grep "useState<FormLead | null>"` | 0 matches |
| `grep "useQuery<FormLeadWithAttribution\[\]>"` | 1 match |
| `grep "useQuery<FormLead\[\]>"` | 0 matches |
| `grep "import { channelLabel }"` | 1 match |
| `grep "Marketing Attribution"` | 1 match |
| `grep "selectedLead.firstTouchSource &&"` | 1 match |
| `grep "channelLabel(selectedLead.firstTouchSource)"` | 1 match |
| `grep "channelLabel(selectedLead.lastTouchSource)"` | 1 match |
| 6 DetailItem labels (First/Last Source/Campaign, Landing Page, Visits) | 6 matches |
| `grep "selectedLead.ftLandingPage"` | 1 match |
| `grep "selectedLead.visitCount"` | 2 matches |
| `data-testid="lead-attribution-panel"` | 1 match |
| `data-testid="lead-attribution-trigger"` | 1 match |
| `grep -i "utm_"` in panel block | 0 matches |
| `Collapsible defaultOpen` | 1 match |
| `npm run check` | PASS |

## Manual Smoke Test Result

Not run (no live dev server available in agent environment). The TypeScript check (`npm run check`) passes cleanly, confirming structural correctness. The conditional guard `{selectedLead.firstTouchSource && ...}` ensures the panel is absent for pre-v1.2 leads (D-14). All six DetailItem cells use `channelLabel()` for source fields and fallback `|| '—'` / null-coalescence patterns for campaign and enrichment fields.

## Phase 7 Completion Check

| Requirement | Plan | Status |
|-------------|------|--------|
| LEADATTR-01: Lead dialog shows attribution data | 07-03 | DONE |
| LEADATTR-02: channelLabel applied everywhere in lead dialog | 07-01 + 07-03 | DONE |
| DASH-06: Marketing dashboard conversions tab | 07-02 | (other worktree) |

## Known Stubs

None — all six fields read from `selectedLead` which is populated by the server-enriched `/api/form-leads` response from Plan 07-01.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `dacf265` | Widen lead-list query type to FormLeadWithAttribution + import channelLabel |
| Task 2 | `cf67542` | Append Marketing Attribution Collapsible panel to Lead Dialog |
