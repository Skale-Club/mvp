---
phase: 07
slug: visitor-journey-lead-attribution-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (tsc) — no automated test runner in project |
| **Config file** | tsconfig.json |
| **Quick run command** | `npm run check` |
| **Full suite command** | `npm run check` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check`
- **After each plan:** Verify grep acceptance criteria in plan

---

## Validation Architecture

Derived from RESEARCH.md findings. Key verification checkpoints:

1. **Controlled Tabs migration** — `MarketingSection.tsx` must use `value` + `onValueChange` (not `defaultValue`). Verify: `grep "value={activeTab}" client/src/components/admin/MarketingSection.tsx` returns 1 match.

2. **`visitorUuid` enrichment on conversions** — Server must join `visitor_sessions` in `getMarketingConversions`. Verify: `grep "visitorUuid\|visitor_uuid" server/storage.ts` returns ≥1 match.

3. **Journey tab renders** — `MarketingJourneyTab.tsx` exists and is wired in `MarketingSection.tsx`. Verify: `grep "MarketingJourneyTab" client/src/components/admin/MarketingSection.tsx` returns ≥2 matches (import + render).

4. **`channelLabel` shared utility** — Exists in `utils.ts` and imported by attribution panel. Verify: `grep "channelLabel" client/src/components/admin/marketing/utils.ts` returns ≥1 match.

5. **Lead attribution panel renders** — Exists in `LeadsSection.tsx` and conditional on `firstTouchSource`. Verify: `grep "firstTouchSource" client/src/components/admin/LeadsSection.tsx` returns ≥1 match.

6. **No utm_ visible strings** — Verify: `grep -i "utm_" client/src/components/admin/marketing/MarketingJourneyTab.tsx client/src/components/admin/LeadsSection.tsx` returns 0 matches in attribution panel code.
