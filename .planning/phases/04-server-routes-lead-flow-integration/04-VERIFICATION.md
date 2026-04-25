---
phase: 04-server-routes-lead-flow-integration
verified: 2026-04-25T00:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: null
gaps: []
human_verification:
  - test: "Submit a lead with visitorId after seeding a visitor_sessions row — confirm form_leads.firstTouchSource populated and a lead_created row appears in attribution_conversions"
    expected: "Visitor linked, ft/lt columns stamped, lead_created row present"
    why_human: "Requires a running dev server + seeded visitor_sessions row; cannot verify cross-table write outcome from static analysis"
  - test: "Submit a lead WITHOUT visitorId — confirm lead returns 200 normally and no attribution_conversions row is written"
    expected: "Lead saved normally; zero attribution_conversions rows for that lead"
    why_human: "Requires running server to observe DB side-effects of fire-and-forget IIFE absence"
  - test: "Trigger phone_click / form_submitted / booking_started from the client and confirm POST /api/attribution/conversion returns 200 and inserts an attribution_conversions row"
    expected: "Row in attribution_conversions with correct conversionType and denormalized ft/lt snapshot"
    why_human: "Client-side trigger not yet wired (Phase 5); server endpoint exists but cannot be exercised end-to-end without client hook"
---

# Phase 4: Server Routes & Lead-Flow Integration — Verification Report

**Phase Goal:** Attribution data begins accumulating in the database — session upserts, conversion records, and lead-visitor linking work end-to-end via API, with zero risk to the existing lead submit path
**Verified:** 2026-04-25
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `formLeadProgressSchema` accepts optional `visitorId` UUID without breaking existing payloads | VERIFIED | `shared/schema.ts` line 423: `visitorId: z.string().uuid().optional()` |
| 2 | `analyticsEventHits` table has nullable `visitor_id text` column | VERIFIED | `shared/schema.ts` line 53: `visitorId: text("visitor_id")` |
| 3 | `IStorage.linkLeadToVisitor` returns `Promise<number \| null>` | VERIFIED | `server/storage.ts` line 511 (interface) and line 1675 (impl) both declare `Promise<number \| null>` |
| 4 | `DatabaseStorage.linkLeadToVisitor` returns the integer session id or null; writes `form_leads.visitor_id` | VERIFIED | Lines 1675-1686: selects session PK, returns `null` on miss, returns `session.id` on hit after UPDATE |
| 5 | POST /api/attribution/session and POST /api/attribution/conversion exist, validate with Zod, never return 500, require no auth | VERIFIED | `server/routes/attribution.ts`: both handlers present, ZodError→400, all other failures→200{}, no `requireAdmin`, no `res.status(500)` |
| 6 | POST /api/analytics/hit accepts optional `visitorId`, stores it, bypasses destination guard when present | VERIFIED | `server/routes/integrations.ts` lines 29, 651-661: `visitorId` on eventHitSchema, `forceStore = !!payload.visitorId`, passed to `recordAnalyticsEventHit` |
| 7 | Attribution IIFE in leads.ts fires after `upsertFormLeadProgress`, is NOT awaited, only when `formCompleto && visitorId`, errors logged but never bubble | VERIFIED | Lines 288-330: guarded by `if (lead.formCompleto && parsed.visitorId)`, invoked as `(async()=>{...})()` with no preceding `await`, `res.json(lead)` called unconditionally at line 332 |
| 8 | IIFE stamps ft/lt columns on `form_leads` and inserts `lead_created` conversion row | VERIFIED | Lines 302-325: `storage.updateFormLead` with all 9 attribution fields, then `storage.createAttributionConversion` with `conversionType: 'lead_created'` |
| 9 | Five `GET /api/admin/marketing/*` endpoints exist, enforce `requireAdmin`, default to 30-day window | VERIFIED | `server/routes/marketing.ts`: 5 routes (overview, sources, campaigns, conversions, journey), each wrapped with `requireAdmin`, `buildFilters` applies 30-day default |
| 10 | Five DatabaseStorage marketing methods have real SQL (GROUP BY aggregations, no stubs) | VERIFIED | `server/storage.ts` lines 1690-1895: `getMarketingOverview` (7 queries, timeSeries), `getMarketingBySource` (GROUP BY ftSourceChannel), `getMarketingByCampaign` (GROUP BY ftCampaign + array_agg), `getMarketingConversions` (ORDER BY+LIMIT 500), `getVisitorJourney` (session + conversions lookup) |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `shared/schema.ts` | `visitorId` optional UUID on `formLeadProgressSchema`; `visitorId` column on `analyticsEventHits` | VERIFIED | Line 423 and line 53 respectively |
| `server/storage.ts` | `linkLeadToVisitor` returns `Promise<number \| null>`; 5 marketing methods with real SQL | VERIFIED | Interface line 511; impl lines 1675-1895 |
| `server/routes/attribution.ts` | `registerAttributionRoutes(app)` — POST /session and POST /conversion | VERIFIED | 119 lines, exports `registerAttributionRoutes`, both handlers present |
| `server/routes/marketing.ts` | `registerMarketingRoutes(app, requireAdmin)` — 5 admin GET endpoints | VERIFIED | 87 lines, exports `registerMarketingRoutes`, 5 routes with auth |
| `server/routes/leads.ts` | Attribution IIFE after `upsertFormLeadProgress` | VERIFIED | Lines 288-330: fire-and-forget IIFE with full attribution chain |
| `server/routes.ts` | Both route modules registered | VERIFIED | Lines 15-16 (imports), lines 59-60 (`registerAttributionRoutes(app)` + `registerMarketingRoutes(app, requireAdmin)`) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `attribution.ts` POST /session | `storage.upsertVisitorSession` | Zod-validated body | WIRED | Line 54: `storage.upsertVisitorSession(payload as any)` |
| `attribution.ts` POST /conversion | `storage.createAttributionConversion` | UUID→integer lookup then insert | WIRED | Lines 76-106: db select visitorSessions by UUID, then `storage.createAttributionConversion` |
| `integrations.ts` /api/analytics/hit | `storage.recordAnalyticsEventHit({visitorId})` | extended eventHitSchema + forceStore bypass | WIRED | Lines 29, 651, 661 |
| `routes.ts` | `registerAttributionRoutes(app)` | direct call | WIRED | Line 59 |
| `routes.ts` | `registerMarketingRoutes(app, requireAdmin)` | direct call | WIRED | Line 60 |
| `leads.ts` IIFE | `storage.linkLeadToVisitor` | `if (lead.formCompleto && parsed.visitorId)` | WIRED | Line 291 |
| `leads.ts` IIFE | `storage.updateFormLead` (attribution fields) | integer sessionId → visitor_sessions select → updateFormLead | WIRED | Lines 302-312 |
| `leads.ts` IIFE | `storage.createAttributionConversion` | integer sessionId from linkLeadToVisitor | WIRED | Lines 314-325 |
| `marketing.ts` routes | `storage.getMarketingOverview/BySource/ByCampaign/Conversions/Journey` | `buildFilters` + auth | WIRED | Lines 30, 43, 54, 65, 78 |
| `DatabaseStorage.getMarketingBySource` | `visitor_sessions` + `form_leads` | LEFT JOIN + GROUP BY `ftSourceChannel` | WIRED | Lines 1800-1812 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `getMarketingOverview` | `totalVisits`, `timeSeries` | `COUNT(*)` on `visitor_sessions` + `attribution_conversions` | Yes — Drizzle queries, no static returns | FLOWING |
| `getMarketingBySource` | `hotLeads/warmLeads/coldLeads` | `COUNT(distinct form_leads.id) FILTER (WHERE classificacao = 'HOT'/'WARM'/'COLD')` | Yes — DB enum values match actual schema | FLOWING |
| `getMarketingByCampaign` | `topLandingPages` | `array_agg(distinct visitorSessions.ftLandingPage)` | Yes | FLOWING |
| `getMarketingConversions` | rows | `SELECT * FROM attribution_conversions ORDER BY convertedAt DESC LIMIT 500` | Yes | FLOWING |
| `getVisitorJourney` | `session`, `conversions` | `visitor_sessions` WHERE + `attribution_conversions` WHERE | Yes | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — requires a running server with seeded database. Core wiring verified statically. Human verification items cover the key runtime behaviors.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ATTR-03 | 04-03 | Lead creation links visitor session and stamps ft/lt fields on `form_leads` | SATISFIED | IIFE in `leads.ts` lines 288-330: `linkLeadToVisitor` + `updateFormLead` with all 9 attribution columns |
| ATTR-04 | 04-01 | `form_leads` extended with attribution columns | SATISFIED | `updateFormLead` signature (storage.ts line 445) includes all 9 columns; IIFE stamps them |
| CONV-01 | 04-03 | `lead_created` conversion event recorded with visitor session link | SATISFIED | IIFE line 314: `createAttributionConversion({conversionType:'lead_created', visitorId:sessionId, ...})` |
| CONV-02 | 04-02 | `phone_click` conversion endpoint available | SATISFIED | `attribution.ts` conversionSchema accepts `'phone_click'`; POST /api/attribution/conversion exists. Note: client-side trigger not yet wired (Phase 5) |
| CONV-03 | 04-02 | `form_submitted` conversion endpoint available | SATISFIED | Same as CONV-02 — `'form_submitted'` in enum; endpoint exists |
| CONV-04 | 04-02 | `booking_started` conversion endpoint available | SATISFIED | Same as CONV-02 — `'booking_started'` in enum; endpoint exists |
| CONV-05 | 04-02 | Page views stored in `analytics_event_hits` with `visitor_id` | SATISFIED | `integrations.ts` lines 29/651/661: `visitorId` on schema, `forceStore` bypass, persisted to DB |

**Note on CONV-02/03/04:** REQUIREMENTS.md shows these as unchecked (`- [ ]`) because end-to-end client firing is deferred to Phase 5. The Phase 4 contract was to deliver the server endpoints — which are present and verified. The REQUIREMENTS.md status reflects the full-stack end state, not the server milestone.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `server/storage.ts` | 1805-1807 | `classificacao = 'HOT'/'WARM'/'COLD'` | INFO | Plan 03 spec (Pitfall 2) stated to use Portuguese `'quente'/'morno'/'frio'`, but the actual DB enum (`leadClassificationEnum`, `shared/schema.ts` lines 149-154) uses English values. The implementation is **correct** — it matches the real schema. The plan doc contained a false premise. Hot/warm/cold counts will work at runtime. |
| `server/storage.ts` | 1652-1670 | Duplicate JSDoc block on `linkLeadToVisitor` | INFO | Two JSDoc paragraphs with overlapping content (one is the old Phase 3 comment, one is the Phase 4 update). Does not affect runtime behavior. |

No blockers found. No stubs. No fire-and-forget awaited at call site.

---

### Human Verification Required

#### 1. Lead Attribution End-to-End

**Test:** Seed a `visitor_sessions` row via `POST /api/attribution/session` with a test UUID. Then submit a form lead via `POST /api/form-leads/progress` with `formCompleto: true` and the same `visitorId`. After ~100ms, query `form_leads` and `attribution_conversions`.
**Expected:** `form_leads.firstTouchSource` is populated; an `attribution_conversions` row with `conversionType='lead_created'` and matching `leadId` exists.
**Why human:** Requires a live dev server + PostgreSQL connection to verify cross-table side effects of the fire-and-forget IIFE.

#### 2. Lead Without visitorId — Zero Attribution Side Effects

**Test:** Submit a lead via `POST /api/form-leads/progress` with `formCompleto: true` and NO `visitorId` field.
**Expected:** Lead returns 200 with the lead object; `form_leads.firstTouchSource` is null; no `attribution_conversions` row inserted.
**Why human:** Requires live server to confirm the IIFE guard (`if (lead.formCompleto && parsed.visitorId)`) correctly skips attribution.

#### 3. Client-Side Conversion Events (CONV-02/03/04)

**Test:** Once the Phase 5 client hook exists, trigger a phone click and confirm `POST /api/attribution/conversion` is fired with `conversionType:'phone_click'`. Verify the row appears in `attribution_conversions` with denormalized ft/lt snapshot.
**Expected:** Row in `attribution_conversions` with correct `conversionType` and non-null `ftSource`/`ltSource`.
**Why human:** Client-side wiring is Phase 5; server endpoint is ready but cannot be triggered end-to-end yet.

---

### Gaps Summary

No gaps. All 10 must-have truths verified. All artifacts are substantive (real SQL, real implementations, no stubs). All key links are wired. The critical invariant — IIFE is fire-and-forget and never awaited — is confirmed at `server/routes/leads.ts` lines 288-329 with `res.json(lead)` called unconditionally at line 332.

The only notable finding is that the plan documentation (Pitfall 2) incorrectly stated the DB uses Portuguese classification values (`'quente'/'morno'/'frio'`), when the actual schema enum uses English values (`'HOT'/'WARM'/'COLD'`). The implementation correctly uses the English values and will function properly. This is a documentation error in the plan, not an implementation bug.

---

_Verified: 2026-04-25_
_Verifier: Claude (gsd-verifier)_
