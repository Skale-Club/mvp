# Phase 4: Server Routes + Lead Flow Integration - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire up the server-side attribution pipeline: public POST endpoints for session upserts and conversion events, non-blocking injection into the existing lead submit path, and real SQL implementations for the 5 marketing admin query stubs. Done when attribution data accumulates on every lead form submission and phone click — entirely without touching critical path error handling.

No client code, no UI, no admin section. Phase 5 (client hook) wires the client side; Phase 6 (dashboard) builds the UI.

</domain>

<decisions>
## Implementation Decisions

### Lead Flow Injection (ATTR-03)

- **D-01:** Add optional `visitorId` field (string, uuid-format) to the existing `formLeadProgressSchema` in `shared/schema.ts`. Keep it optional so existing callers (tests, legacy clients) continue working without changes.
- **D-02:** In `POST /api/form-leads/progress` (`server/routes/leads.ts`), after `storage.upsertFormLeadProgress()` returns the lead, inject attribution in a fire-and-forget async IIFE — exactly the same pattern as the existing notification and GHL sync blocks. A failure in the attribution block MUST NOT cause the endpoint to return 4xx or 5xx.
- **D-03:** The injection block calls `storage.linkLeadToVisitor(lead.id, parsed.visitorId)` AND `storage.createAttributionConversion({ conversionType: 'lead_created', visitorId: ..., leadId: lead.id, ... })` together in the same IIFE. Only fires when `parsed.visitorId` is present.
- **D-04:** Pass `visitorId` as string (UUID text) into `linkLeadToVisitor`. The storage method resolves the integer FK internally via a `SELECT id FROM visitor_sessions WHERE visitor_id = $1` lookup — the API surface stays UUID-based to match what the client sends from localStorage.

### Conversion Endpoint (CONV-01 through CONV-04)

- **D-05:** Create a new `POST /api/attribution/conversion` endpoint — do NOT extend `/api/analytics/hit`. Attribution conversion tracking has different semantics (denormalized ft/lt snapshot, leadId linkage) and must not risk breaking the existing analytics pipeline.
- **D-06:** Request body: `{ visitorId: string (uuid), conversionType: 'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started', pagePath?: string, leadId?: number }`. Validate with Zod. Return `200 {}` on success, `400` on validation failure — never `500` for missing visitor.
- **D-07:** The endpoint is public (no auth required) — same as `/api/analytics/hit`. The client fires it via `navigator.sendBeacon` (or fetch with `keepalive: true`) for phone clicks and booking starts.
- **D-08:** CONV-01 (lead_created) is fired server-side (in the lead route IIFE, not by the client) — the server has all the data at that point. CONV-02/03/04 (phone_click, form_submitted, booking_started) are fired client-side via this endpoint.

### Session Upsert Endpoint

- **D-09:** Create `POST /api/attribution/session` — public, no auth. Accepts the full visitor session payload (UTM params, referrer, landing page, device type, visitorId). Calls `storage.upsertVisitorSession()`. Returns `200 {}` or silently discards on error.
- **D-10:** Both `/api/attribution/session` and `/api/attribution/conversion` live in a new `server/routes/attribution.ts` file, registered via `registerAttributionRoutes(app, storage)` called from `server/routes.ts`.

### Marketing Admin Query Endpoints (DASH-01 through DASH-05 backends)

- **D-11:** Route prefix: `/api/admin/marketing/`. All routes are authenticated (admin only) — same auth middleware as existing `/api/admin/*` routes.
- **D-12:** Five routes:
  - `GET /api/admin/marketing/overview` → `storage.getMarketingOverview(filters)`
  - `GET /api/admin/marketing/sources` → `storage.getMarketingBySource(filters)`
  - `GET /api/admin/marketing/campaigns` → `storage.getMarketingByCampaign(filters)`
  - `GET /api/admin/marketing/conversions` → `storage.getMarketingConversions(filters)`
  - `GET /api/admin/marketing/journey` → `storage.getVisitorJourney(visitorId)` (query param `?visitorId=`)
- **D-13:** All query endpoints accept filter query params: `dateFrom`, `dateTo`, `source`, `campaign`, `conversionType`. Server enforces a **30-day default** window when `dateFrom`/`dateTo` are absent — no unbounded queries.
- **D-14:** Implement real SQL for all 5 `DatabaseStorage` stub methods in this phase. The stubs currently return empty results; Phase 4 fills them with actual aggregation queries using `GROUP BY`, `COUNT`, `LEFT JOIN` patterns.

### CONV-05: Page Views in analytics_event_hits

- **D-15:** The existing `/api/analytics/hit` endpoint already stores page_path and session_id in `analytics_event_hits`. For Phase 4, extend the endpoint to also accept and store an optional `visitorId` field — stored in a new `visitor_id` text column on `analytics_event_hits` (or correlated at query time via visitor_sessions join if adding a column is deferred). This enables the journey view to correlate page_view events to visitor sessions.
- **D-16:** Decision deferred to planner: whether to add `visitor_id` column to `analytics_event_hits` in this phase (schema change + db:push) or correlate via `session_id` at query time. The planner should check if `analytics_event_hits.session_id` (text) can reliably join to `visitor_sessions` data. If not, add the column.

### Claude's Discretion

- Zod schema for `POST /api/attribution/session` body: define in `shared/schema.ts` or inline in the route file — follow existing patterns
- Error response format for attribution endpoints: `{ error: string }` JSON, consistent with existing routes
- Whether to add `visitor_id` to `analytics_event_hits` table (D-16 deferred to planner)
- SQL implementation details for the 5 marketing aggregation methods

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Lead Route (integration point)
- `server/routes/leads.ts` lines 167–250 — The `POST /api/form-leads/progress` handler. Attribution injection goes here as a new fire-and-forget IIFE block after line 181 (`storage.upsertFormLeadProgress` call). Must NOT modify the existing error handling or response shape.

### Existing Schema (extend here)
- `shared/schema.ts` `formLeadProgressSchema` (~line 297) — Add optional `visitorId: z.string().uuid().optional()` field. Do NOT change existing fields.
- `shared/schema.ts` `visitorSessions` and `attributionConversions` tables — New tables from Phase 3; storage methods are ready.

### Storage Methods (already implemented)
- `server/storage.ts` — `upsertVisitorSession`, `createAttributionConversion`, `linkLeadToVisitor` are implemented. The 5 marketing query stubs need SQL.

### Route Registrar Pattern
- `server/routes.ts` — `registerRoutes` function. New `registerAttributionRoutes` and `registerMarketingRoutes` must be called from here. Read the existing registration pattern.

### Analytics Endpoint (reference pattern)
- `server/routes/` directory — Find the analytics hit endpoint handler to understand the existing session/event storage pattern and reuse it for CONV-05.

### Auth Middleware (admin routes)
- `server/routes.ts` or `server/auth/` — Locate the `isAdmin` / auth middleware used on existing `/api/admin/*` routes and apply it to all `/api/admin/marketing/*` routes.

### Requirements
- `.planning/REQUIREMENTS.md` §ATTR-03, ATTR-04, CONV-01–CONV-05

### Phase 3 Context (decisions carried forward)
- `.planning/phases/03-attribution-schema-storage/03-CONTEXT.md` — FK types, table structure, storage method signatures

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Fire-and-forget IIFE pattern in `server/routes/leads.ts` — copy the `(() => { try { await ...; } catch (e) { console.error(...); } })()` pattern verbatim for attribution injection
- `navigator.sendBeacon` + fallback fetch pattern in `client/src/lib/analytics.ts` — Phase 5 will reuse this for attribution endpoints; no changes to analytics.ts in Phase 4
- Existing admin auth middleware — reuse on all `/api/admin/marketing/*` routes

### Established Patterns
- Route files: each subsystem has its own `server/routes/xxx.ts` file with a `registerXxxRoutes(app, storage)` export — new `server/routes/attribution.ts` follows this
- Zod validation: `req.body` parsed with `.parse()` in a try/catch, returning 400 on failure — standard for all POST endpoints
- Admin query pattern: existing admin GET endpoints use `storage.getXxx()` methods, pass query params as filters

### Integration Points
- `server/routes.ts` → add `registerAttributionRoutes` and `registerMarketingRoutes` calls
- `server/routes/leads.ts` line ~181 → add attribution IIFE block
- `shared/schema.ts` `formLeadProgressSchema` → add `visitorId` optional field

</code_context>

<specifics>
## Specific Ideas

- The `linkLeadToVisitor` method accepts `(leadId: number, visitorId: string)` where `visitorId` is the UUID string — the method does the integer FK lookup internally. The route passes the UUID string from the client directly.
- For `POST /api/attribution/conversion`, the `lead_created` event is fired server-side only (never from the client) — the client fires `phone_click`, `form_submitted`, `booking_started`.
- The 30-day default date window on marketing endpoints prevents unbounded table scans as data grows.

</specifics>

<deferred>
## Deferred Ideas

- Adding `visitor_id` column to `analytics_event_hits` table (D-16) — planner decides based on whether session_id correlation is sufficient
- Rate limiting on `/api/attribution/session` and `/api/attribution/conversion` — deferred; not needed at current traffic volumes
- Batch conversion events (multiple events in one request) — deferred to v1.3
- Server-side page_view emission (instead of client-side) — out of scope for this phase

None of the reviewed todos from prior phases are relevant to this phase's scope.

</deferred>

---

*Phase: 04-server-routes-lead-flow-integration*
*Context gathered: 2026-04-25*
