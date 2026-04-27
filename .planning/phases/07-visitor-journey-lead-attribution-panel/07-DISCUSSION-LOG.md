# Phase 7: Visitor Journey + Lead Attribution Panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 07-visitor-journey-lead-attribution-panel
**Areas discussed:** Auto-selected (user passed through with "next")

---

## Visitor Selection for Journey Tab

| Option | Description | Selected |
|--------|-------------|----------|
| Linked navigation | Click row in Conversions tab → opens Journey pre-loaded | ✓ |
| Recent sessions browser | Journey tab has own sessions list (needs new API) | |
| Entry only from Lead panel | Journey only accessible via lead detail | |

**User's choice:** Auto-selected (advancement phrase "next")
**Notes:** Linked navigation avoids needing a new "list all sessions" API endpoint. Most natural flow — user already looking at a conversion event wants to see the full journey.

---

## Lead Attribution Panel — Data Source

| Option | Description | Selected |
|--------|-------------|----------|
| Enrich leads API with visitorUuid | Small server join, enables full visit count | ✓ |
| New endpoint /api/admin/leads/:id/attribution | Encapsulated but extra round trip | |
| Panel shows only FormLead fields | No visit count, simplest | |

**User's choice:** Auto-selected
**Notes:** Enriching the existing leads API with visitorUuid (join to visitor_sessions) is a minimal server change that unlocks the journey API call for visit count, satisfying LEADATTR-01 fully.

---

## Journey Timeline Visual Format

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical timeline with icons | page_view (globe) vs conversion (lightning), relative time | ✓ |
| Two-section layout | Session summary card + events table | |
| Claude's discretion | Let Claude decide the visual | |

**User's choice:** Auto-selected
**Notes:** Vertical timeline is the most scannable format for the mixed event array (page_view + real conversions). Consistent with common analytics journey views.

---

## Claude's Discretion

- Exact visual styling of attribution panel (Card vs bordered section vs simple DetailItem grid)
- Whether attribution panel is collapsed vs open by default
- Timeline row spacing and icon selection
- Whether visitCount server enrichment is attempted or deferred

## Deferred Ideas

- Standalone session browser in Journey tab — deferred; linked navigation from Conversions is sufficient
- Source/Campaign Select dynamic population — carried from Phase 6 deferred list
