---
phase: 07-visitor-journey-lead-attribution-panel
verified: 2026-04-27T00:00:00Z
status: passed
score: 10/10 must-haves verified
---

# Phase 7: Visitor Journey + Lead Attribution Panel Verification Report

**Phase Goal:** Admins can trace a single visitor's complete page-by-page journey and view attribution context directly on any lead detail — connecting marketing data to revenue outcomes in plain business language
**Verified:** 2026-04-27
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| T1 | GET /api/admin/marketing/conversions rows include a `visitorUuid` field | VERIFIED | `storage.ts:1864` — LEFT JOIN to `visitor_sessions`, `visitorSessions.visitorId` aliased to `visitorUuid`; IStorage interface widened at line 517 |
| T2 | GET /api/form-leads rows include `ftLandingPage` and `visitCount` fields | VERIFIED | `routes/leads.ts:350-412` — post-`listFormLeads` enrichment via two batch DB queries; `IStorage.listFormLeads` signature unchanged |
| T3 | `channelLabel(source)` exists in `marketing/utils.ts` and maps all 6 canonical sources to business labels | VERIFIED | `utils.ts:97-107` — all six mappings present; case-insensitive; null/undefined/empty handled |
| T4 | Journey tab shows — for a selected visitor — the ordered event timeline, first source, and conversion events | VERIFIED | `MarketingJourneyTab.tsx` renders session card with `channelLabel(session.ftSourceChannel)` + vertical timeline ordered by server-provided `convertedAt asc` |
| T5 | Empty state shows correct message when no visitor selected | VERIFIED | Line 51: exact text "Select a visitor from the Conversions tab to view their journey." present in `<p>` element; `enabled: !!selectedVisitorUuid` guards query |
| T6 | Conversions tab rows are clickable and navigate to Journey tab | VERIFIED | `MarketingConversionsTab.tsx:139-160` — `const clickable = !!onSelectVisitor && row.visitorUuid != null`; `onClick`, `role="button"`, keyboard support present |
| T7 | `MarketingSection.tsx` uses controlled tabs and lifts `selectedVisitorUuid` + `activeTab` state | VERIFIED | Line 46-47 — `useState<string>('overview')` and `useState<string | null>(null)`; line 195 — `value={activeTab} onValueChange={setActiveTab}` |
| T8 | Lead dialog shows Marketing Attribution panel below Form Answers for post-v1.2 leads | VERIFIED | `LeadsSection.tsx:754-804` — Collapsible `defaultOpen`, gated by `{selectedLead.firstTouchSource && ...}`, six DetailItem cells present |
| T9 | Attribution panel uses channelLabel for source fields — no raw source values visible | VERIFIED | Lines 775 and 783 — `channelLabel(selectedLead.firstTouchSource)` and `channelLabel(selectedLead.lastTouchSource)`; no `utm_*` strings in panel block |
| T10 | Attribution panel omitted for legacy leads (firstTouchSource === null) | VERIFIED | Line 756 — `{selectedLead.firstTouchSource && ...}` guard; no panel renders when value is null |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `server/storage.ts` | `getMarketingConversions` with LEFT JOIN + `visitorUuid`; IStorage interface updated | VERIFIED | Lines 1864-1883 — `getTableColumns` spread, `leftJoin(visitorSessions, ...)`, `visitorUuid: visitorSessions.visitorId`; IStorage line 517 widened |
| `server/routes/leads.ts` | GET /api/form-leads enriches with `ftLandingPage` + `visitCount` | VERIFIED | Lines 350-412 — two batch queries (`inArray` for sessions, `count(*)::int` group-by for page views); `enriched` array returned |
| `client/src/components/admin/marketing/utils.ts` | `channelLabel()` named export | VERIFIED | Lines 97-107 — 6 source mappings, 3 `return 'Unknown'` paths, case-insensitive |
| `client/src/components/admin/marketing/MarketingJourneyTab.tsx` | New component (min 120 lines) — empty state + session card + vertical timeline | VERIFIED | 178 lines; exports `MarketingJourneyTab` and `MarketingJourneyTabProps`; all 4 states implemented |
| `client/src/components/admin/MarketingSection.tsx` | Controlled tabs, 5th Journey tab, `selectedVisitorUuid` state, `onSelectVisitor` wired | VERIFIED | 238 lines; `value={activeTab}`, 5 TabsTriggers, 5 TabsContents, `onSelectVisitor` callback at line 226 |
| `client/src/components/admin/marketing/MarketingConversionsTab.tsx` | `onSelectVisitor` prop, `visitorUuid` type widening, clickable rows | VERIFIED | Lines 34-57 — props interface extended, useQuery generic widened, `allConversionsWidened` cast includes `visitorUuid: string \| null` |
| `client/src/components/admin/LeadsSection.tsx` | `FormLeadWithAttribution` type, widened query + state, Marketing Attribution panel | VERIFIED | Lines 183-188 type alias; line 193 state; line 215 query; lines 754-804 panel |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `storage.ts getMarketingConversions` | `visitor_sessions` table | `leftJoin(visitorSessions, eq(attributionConversions.visitorId, visitorSessions.id))` | WIRED | Line 1874 confirmed |
| `routes/leads.ts GET /api/form-leads` | `visitor_sessions` + `attribution_conversions` | post-`listFormLeads` enrichment loop using `db.select` | WIRED | Lines 374-396 confirmed |
| `channelLabel` | D-16 channel mapping rules | switch/if-chain on lowercased source | WIRED | Lines 101-106 — `organic_search`, `paid_search`/`paid_ads`, `social`, `referral`, `direct` all mapped |
| `MarketingConversionsTab row onClick` | `MarketingSection setSelectedVisitorUuid + setActiveTab('journey')` | `onSelectVisitor` prop callback | WIRED | `MarketingSection.tsx:226-229` — `setSelectedVisitorUuid(uuid); setActiveTab('journey')` |
| `MarketingJourneyTab useQuery` | GET /api/admin/marketing/journey?visitorId={uuid} | TanStack Query with `enabled: !!selectedVisitorUuid` | WIRED | Lines 30-37 — queryKey includes uuid, queryFn hits `/api/admin/marketing/journey?visitorId=${selectedVisitorUuid}` |
| `MarketingJourneyTab session card` | `channelLabel` utility | `import { channelLabel } from '@/components/admin/marketing/utils'` | WIRED | Line 8 (import), line 98 — `channelLabel(session.ftSourceChannel)` |
| `Lead Dialog after Form Answers` | AttributionPanel inline component | conditional render guarded by `selectedLead.firstTouchSource` | WIRED | Lines 756-804 confirmed |
| `AttributionPanel` | `channelLabel` utility | `import { channelLabel } from '@/components/admin/marketing/utils'` | WIRED | Line 41 (import), lines 775, 783 (usage) |
| `useQuery for /api/form-leads` | extended `FormLeadWithAttribution` type | `type FormLeadWithAttribution = FormLead & { ftLandingPage?: string \| null; visitCount?: number }` | WIRED | Lines 183-188 type alias, line 215 query generic, line 193 state generic |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `MarketingJourneyTab.tsx` | `data` (VisitorJourney) | `useQuery` → GET `/api/admin/marketing/journey` → `storage.getVisitorJourney` → DB `visitorSessions` + `attributionConversions` | Yes — real DB queries (Phase 4 implementation) | FLOWING |
| `MarketingConversionsTab.tsx` | `allConversions` | `useQuery` → GET `/api/admin/marketing/conversions` → `storage.getMarketingConversions` → LEFT JOIN query with real 500-row limit | Yes | FLOWING |
| `LeadsSection.tsx` attribution panel | `selectedLead.ftLandingPage`, `selectedLead.visitCount` | `useQuery<FormLeadWithAttribution[]>` → GET `/api/form-leads` → enrichment queries in route handler | Yes — `visitor_sessions.ftLandingPage` + `count(*)` from `attribution_conversions` | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points verifiable without starting a server. TypeScript compilation is the primary automated check available in this environment.

Human verification items cover behavioral confirmation (see section below).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DASH-06 | 07-02 | Journey tab shows page-by-page visit sequence for a selected visitor session: first source, pages visited in order, and conversion event | SATISFIED | `MarketingJourneyTab.tsx` — session card shows `channelLabel(session.ftSourceChannel)` (first source), timeline shows all events including `page_view` rows with `pagePath`, conversion events distinguished by Zap icon |
| LEADATTR-01 | 07-03 | Lead detail drawer includes attribution summary panel: first source, last source, campaign name, landing page, visits before conversion | SATISFIED | `LeadsSection.tsx:754-804` — six DetailItem cells covering all five specified data points |
| LEADATTR-02 | 07-01 + 07-03 | Attribution panel uses business-language channel labels; no utm_ field names visible | SATISFIED | `channelLabel()` applied to both `firstTouchSource` and `lastTouchSource`; no `utm_*` strings anywhere in the panel JSX block |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `MarketingConversionsTab.tsx:172` | 172 | `row.ftSource ?? '—'` — raw source value displayed in Conversions tab Source column without `channelLabel()` | Info | Pre-existing Phase 6 behavior (DASH-05 scope); not in Phase 7 plan scope; value may show raw strings like `"organic_search"` to users in the Conversions table |

No blocker or warning anti-patterns found in Phase 7 scope files.

**Note on the Info item:** The Conversions tab Source column was implemented in Phase 6 (Plan 06-04). DASH-07 was marked complete in Phase 6. The Phase 7 plans explicitly scoped the channelLabel utility to Journey tab session card and lead attribution panel only. This is a pre-existing cosmetic issue, not a Phase 7 regression.

---

### Human Verification Required

#### 1. Journey tab navigation from Conversions row

**Test:** Log in to admin, navigate to Marketing > Conversions tab. Click any row with a non-null visitor session.
**Expected:** Active tab switches to "Journey". Session summary card shows business-language first source (e.g., "Organic Search"), campaign, entry page, and total event count. Below, a vertical timeline renders page_view rows (muted globe icon, path) and conversion rows (accent zap icon, event label) in chronological order.
**Why human:** Data depends on actual records in the DB; UI rendering and tab-switch animation requires visual confirmation.

#### 2. Conversions rows with deleted visitor sessions remain inert

**Test:** If any conversion rows exist whose visitor session was deleted (visitorId is null), confirm those rows are NOT clickable (no cursor-pointer, no onClick fires).
**Expected:** Row renders normally but clicking does nothing; no navigating to Journey tab.
**Why human:** Requires DB state with deleted visitor sessions to verify the null-guard behavior at runtime.

#### 3. Lead dialog attribution panel for post-v1.2 lead

**Test:** Navigate to admin > Leads. Click the eye icon on any lead that has `firstTouchSource` set. Scroll to the bottom of the dialog.
**Expected:** "Marketing Attribution" Collapsible section is visible and open by default, showing six fields: First Source (business label), First Campaign, Last Source (business label), Last Campaign, Landing Page (path), Visits Before Conversion (number).
**Why human:** Requires real lead data with attribution populated.

#### 4. Lead dialog attribution panel absent for legacy lead

**Test:** Click the eye icon on a lead created before v1.2 attribution tracking (firstTouchSource is null).
**Expected:** No "Marketing Attribution" section visible. Dialog ends after Form Answers.
**Why human:** Requires a pre-attribution lead in the DB to confirm the D-14 guard works at runtime.

#### 5. channelLabel values in attribution panel

**Test:** For a lead known to have `firstTouchSource = "paid_search"`, open the dialog.
**Expected:** "First Source" shows "Paid Ads", not "paid_search".
**Why human:** Requires knowledge of specific DB record values to verify the mapping end-to-end.

---

### Gaps Summary

No gaps. All 10 observable truths verified. All 7 artifacts exist, are substantive (not stubs), and are wired. All 3 requirements satisfied. Data flows from DB through server through client for all three Phase 7 data paths.

The only Info-level anti-pattern (raw `ftSource` in Conversions tab Source column) is a pre-existing Phase 6 behavior outside Phase 7 scope.

---

_Verified: 2026-04-27_
_Verifier: Claude (gsd-verifier)_
