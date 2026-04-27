# Phase 7: Visitor Journey + Lead Attribution Panel - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Two deliverables in one phase:

1. **Journey tab** — a 5th tab in the existing `MarketingSection.tsx` that shows a selected visitor's complete event timeline (page views + conversions in chronological order). Entry point: clicking a visitor row in the Conversions tab navigates to Journey pre-loaded for that visitor.

2. **Lead attribution panel** — a new section appended at the bottom of the existing Lead detail `<Dialog>` in `LeadsSection.tsx`, showing first/last source, campaign, landing page, and visits before conversion in business-language labels.

No new server routes unless one is needed for the `visitorUuid` enrichment (see D-04). No new DB tables.

Done when a business owner can: (a) click a Conversions row → see that visitor's full page journey, and (b) open any lead → see where that lead came from in plain language.

</domain>

<decisions>
## Implementation Decisions

### Journey Tab — Location & Navigation

- **D-01:** Add Journey as the **5th tab** in `MarketingSection.tsx` after Conversions. Tab label: "Journey". Tab value: `"journey"`. Follows the existing `<TabsTrigger>` / `<TabsContent>` pattern established in Phase 6.
- **D-02:** **Entry via Conversions tab** — clicking a row in `MarketingConversionsTab.tsx` sets a `selectedVisitorId` state in `MarketingSection.tsx` and switches the active tab to `"journey"`. No standalone visitor browser needed; no new "list sessions" API endpoint required.
- **D-03:** `selectedVisitorId` is an integer (the `visitorSessions.id` integer FK, available on conversion rows as `conversion.visitorId`). The journey API takes a UUID; to resolve the UUID, the journey API response includes the `session` object which has `session.visitorId` (UUID). The client calls `GET /api/admin/marketing/journey?visitorId=<UUID>` — but since we need the UUID to call the API and we only have the integer, the Journey tab component calls a route that accepts the **integer** session ID. See D-05 for resolution approach.
- **D-04:** Journey tab shows an empty state with TrendingUp icon and "Select a visitor from the Conversions tab to view their journey" when `selectedVisitorId` is null.

### Journey API Resolution (visitor integer → UUID)

- **D-05:** The existing `GET /api/admin/marketing/journey` takes `?visitorId=<UUID>`. Since `MarketingConversionsTab` has `conversion.visitorId` (integer FK), two paths exist:
  - **Preferred:** Add a parallel route `GET /api/admin/marketing/journey/:sessionId` that accepts the integer `sessionId` and does the UUID lookup internally — no client-side UUID exposure.
  - **Alternative:** Enrich the conversions API response to include `visitorUuid` alongside `visitorId` (integer) — one server change, cleaner client.
  
  **Decision: Use alternative** — enrich the `/api/admin/marketing/conversions` response to include `visitorUuid: string` on each row. This is a small server-side addition to the existing `getMarketingConversions` storage method (add a join to `visitor_sessions` to pull the UUID). The Journey tab then calls `GET /api/admin/marketing/journey?visitorId={row.visitorUuid}` directly. No new route needed.

### Journey Timeline Presentation

- **D-06:** **Vertical timeline layout** — each event in `conversions[]` (ordered by `convertedAt` ascending) rendered as a timeline row. Two event types with distinct visual treatment:
  - `page_view` → browser/globe icon (muted), shows `landingPage` path and relative time
  - Real conversions (`lead_created`, `phone_click`, `form_submitted`, `booking_started`) → lightning/star icon (accent color), shows business-label (same labels as Conversions tab)
- **D-07:** Session summary card displayed **above** the timeline: first source (business label), first campaign, entry page, total events count. Read from `session` object of `VisitorJourney`.
- **D-08:** `page_view` rows where `landingPage` is null/empty are still shown — display "/" as the path. Relative time via `formatDistanceToNow` (same import as `MarketingConversionsTab`).
- **D-09:** No pagination — show all events (the journey API already limits to 500 conversions per session; practical journeys are <50 events).
- **D-10:** Timeline component lives in `client/src/components/admin/marketing/MarketingJourneyTab.tsx`. Follows Phase 6 tab component naming convention.

### Lead Attribution Panel

- **D-11:** Appended as a new collapsible section at the **bottom** of the existing Lead detail Dialog in `LeadsSection.tsx`, after "Form Answers". Label: "Marketing Attribution". Uses a shadcn `<Collapsible>` or simply a bordered section — **Claude's discretion** on collapsed-vs-open-by-default.
- **D-12:** Panel reads directly from `selectedLead` fields — no extra API call for basic attribution:
  - First source → `selectedLead.firstTouchSource` formatted as business-language channel label
  - First campaign → `selectedLead.firstTouchCampaign` (or "—" if null)
  - Last source → `selectedLead.lastTouchSource` formatted as business-language channel label  
  - Last campaign → `selectedLead.lastTouchCampaign` (or "—" if null)
  - Landing page → `selectedLead.ftLandingPage` from `visitor_sessions` (see D-13)
- **D-13:** **Visit count ("visits before conversion")** requires a `page_view` count. To avoid an extra client-side journey API call, enrich the existing leads API response by adding `visitorUuid` (from a join to `visitor_sessions`) and `visitCount` (count of `page_view` rows in `attribution_conversions` for that session). This join is added in the leads list query server-side. If the join cost is a concern, `visitCount` can be omitted and marked as "Claude's discretion" — but the planner should attempt it.
- **D-14:** Attribution panel is **only rendered** when `selectedLead.firstTouchSource` is non-null. If a lead has no attribution data (pre-v1.2 leads, or leads from direct bookings), the panel is omitted entirely — no empty attribution section in the dialog.
- **D-15:** Channel label mapping function (`channelLabel(source: string) → string`) to be extracted as a shared utility in `client/src/components/admin/marketing/utils.ts` (or a new `channelLabel.ts`) so both the attribution panel and the Journey tab session card use identical labels. Avoids duplicating the mapping logic.

### Business Language (LEADATTR-02)

- **D-16:** Channel mapping follows the same classification used throughout Phase 5-6:
  - `"organic_search"` → "Organic Search"
  - `"paid_search"` / `"paid_ads"` → "Paid Ads"
  - `"social"` → "Social Media"
  - `"referral"` → "Referral"
  - `"direct"` → "Direct"
  - `null` / `"unknown"` / anything else → "Unknown"
  No `utm_` field names visible anywhere in either the Journey tab or the attribution panel (DASH-07 vocabulary ban carries forward).

### Claude's Discretion

- Exact visual styling of the attribution panel (Card vs bordered section vs simple grid of DetailItems)
- Whether attribution panel is collapsed by default or open
- Timeline row spacing and icon choice (globe vs browser icon for page_view)
- Whether `visitCount` server enrichment is attempted or deferred if the join is complex

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Phase 7 infrastructure (server — already built)
- `server/routes/marketing.ts` §journey — `GET /api/admin/marketing/journey?visitorId=<UUID>` route (lines ~75-85)
- `server/storage.ts` §getVisitorJourney — implementation that joins visitor_sessions + attribution_conversions
- `shared/marketing-types.ts` §VisitorJourney — `{ session: VisitorSession; conversions: AttributionConversion[] }`

### Lead detail dialog (client — must modify)
- `client/src/components/admin/LeadsSection.tsx` — lead Dialog at ~line 661; `selectedLead: FormLead | null` state at ~line 185; `openLeadDialog` at ~line 288

### Marketing section (client — must extend)
- `client/src/components/admin/MarketingSection.tsx` — existing 4-tab structure; Journey tab and `selectedVisitorId` state added here
- `client/src/components/admin/marketing/MarketingConversionsTab.tsx` — must add click handler that sets `selectedVisitorId` in parent + switches tab to "journey"
- `client/src/components/admin/marketing/utils.ts` — shared helpers; channel label function to be added here

### Attribution fields on FormLead
- `shared/schema.ts` lines 208-217 — `formLeads.visitorId` (integer FK), `firstTouchSource`, `firstTouchMedium`, `firstTouchCampaign`, `lastTouchSource`, `lastTouchMedium`, `lastTouchCampaign`
- `shared/schema.ts` line 255 — `visitorSessions.visitorId` (UUID — needed for journey API call)

### Phase 6 patterns to follow
- `client/src/components/admin/marketing/MarketingConversionsTab.tsx` — business label mapping, relative time pattern
- `.planning/phases/06-marketing-admin-dashboard/06-CONTEXT.md` — D-17 vocabulary, D-20 badge colors

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `formatDistanceToNow` from `date-fns` — already used in `MarketingConversionsTab.tsx` for relative time
- shadcn `<Dialog>` — already wrapping lead detail in `LeadsSection.tsx`; attribution panel appends inside existing dialog content
- `DetailItem` component — already used in lead dialog grid for consistent label/value pairs; attribution panel can reuse it
- shadcn `<Tabs>` — Journey tab follows exact same pattern as existing 4 tabs in `MarketingSection.tsx`
- `buildMarketingQueryParams` / `MarketingFilters` from `utils.ts` — Journey tab receives `filters` prop but may not use date filters (journey is per-visitor, not date-filtered)

### Established Patterns
- Tab components as named exports in `admin/marketing/` subfolder (Phase 6)
- `useQuery` with explicit `queryFn` + `staleTime: 30_000` (Phase 6 pattern from `MarketingOverviewTab`)
- Business-label badge colors: HOT=green, WARM=amber, COLD=gray (Phase 6 D-20)
- `ALL_VALUE = '__all__'` sentinel for Radix Select (Phase 6)

### Integration Points
- `MarketingSection.tsx`: add `selectedVisitorId` state + Journey as 5th tab + pass `setSelectedVisitorId` + `setActiveTab` down to `MarketingConversionsTab`
- `MarketingConversionsTab.tsx`: add `onSelectVisitor` prop (called on row click with integer `sessionId` or `visitorUuid`)
- `LeadsSection.tsx`: append attribution panel inside existing `<Dialog>` scroll content (~line 720+), reads from `selectedLead` without new state
- `server/routes/marketing.ts`: enrich conversions response with `visitorUuid` (join to `visitor_sessions`)
- `server/storage.ts` / `getMarketingConversions`: add `visitorSessions.visitorId` to SELECT

</code_context>

<specifics>
## Specific Ideas

- The Journey tab's empty state should guide the user: "Select a visitor from the Conversions tab to view their journey" — makes the navigation flow obvious without documentation.
- Business owner mental model: "I want to know HOW this lead found me" — the attribution panel answers that question the moment you open a lead. It should be immediately visible, not buried.
- The channel label mapping should be a single shared function to prevent the Conversions tab, Journey session card, and attribution panel from drifting apart over time.

</specifics>

<deferred>
## Deferred Ideas

- Standalone session browser in Journey tab (requires new "list all sessions" API endpoint) — deferred; linked navigation from Conversions tab is sufficient for v1.2
- Source/Campaign Select options populated dynamically from live data — carried from Phase 6 deferred list; belongs in a v1.3 polish phase
- Visit count server enrichment if the join adds meaningful latency to the leads list query — planner may defer to a separate `GET /api/admin/leads/:id/attribution` endpoint

</deferred>

---

*Phase: 07-visitor-journey-lead-attribution-panel*
*Context gathered: 2026-04-27*
