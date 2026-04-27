# Phase 7: Visitor Journey + Lead Attribution Panel - Research

**Researched:** 2026-04-27
**Domain:** React admin UI extension — vertical timeline component, lead detail dialog enrichment, server-side conversions enrichment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Journey is the 5th tab in `MarketingSection.tsx`. Tab label: "Journey". Tab value: `"journey"`.
- **D-02:** Entry via Conversions tab row click — sets `selectedVisitorId` state in `MarketingSection.tsx` and switches active tab to `"journey"`. No standalone session browser, no new "list sessions" endpoint.
- **D-03:** `selectedVisitorId` is an integer (`visitorSessions.id` FK). Journey API takes a UUID. Resolution: enrich `/api/admin/marketing/conversions` response with `visitorUuid` (see D-05).
- **D-04:** Journey tab shows empty state with TrendingUp icon when `selectedVisitorId` is null.
- **D-05:** Enrich `/api/admin/marketing/conversions` response to include `visitorUuid: string` on each row. Journey tab calls `GET /api/admin/marketing/journey?visitorId={row.visitorUuid}`.
- **D-06:** Vertical timeline layout. Two event types: `page_view` → globe/browser icon (muted); real conversions → lightning/star icon (accent). Shows `landingPage` path and relative time.
- **D-07:** Session summary card **above** timeline: first source (business label), first campaign, entry page, total events count. Reads from `session` object of `VisitorJourney`.
- **D-08:** `page_view` rows with null/empty `landingPage` show "/" as path. Relative time via `formatDistanceToNow`.
- **D-09:** No pagination — show all events (API already limits to 500; practical journeys < 50).
- **D-10:** New component: `client/src/components/admin/marketing/MarketingJourneyTab.tsx`.
- **D-11:** Attribution panel appended at bottom of existing Lead detail Dialog in `LeadsSection.tsx`, after "Form Answers". Label: "Marketing Attribution". Exact collapsed vs open: Claude's discretion.
- **D-12:** Attribution panel reads directly from `selectedLead` fields. No extra API call.
  - First source → `selectedLead.firstTouchSource` as business-language label
  - First campaign → `selectedLead.firstTouchCampaign` (or "—")
  - Last source → `selectedLead.lastTouchSource` as business-language label
  - Last campaign → `selectedLead.lastTouchCampaign` (or "—")
  - Landing page → `selectedLead.ftLandingPage` (from visitor_sessions enrichment — see D-13)
- **D-13:** `visitCount` and `ftLandingPage` enriched server-side in the leads list query via join to `visitor_sessions`. If join cost is a concern, `visitCount` can be deferred to a separate endpoint.
- **D-14:** Attribution panel only rendered when `selectedLead.firstTouchSource` is non-null.
- **D-15:** `channelLabel(source: string) → string` extracted to `client/src/components/admin/marketing/utils.ts`. Shared by Journey session card and attribution panel.
- **D-16:** Channel mapping:
  - `"organic_search"` → "Organic Search"
  - `"paid_search"` / `"paid_ads"` → "Paid Ads"
  - `"social"` → "Social Media"
  - `"referral"` → "Referral"
  - `"direct"` → "Direct"
  - `null` / `"unknown"` / else → "Unknown"
  No `utm_` field names visible anywhere.

### Claude's Discretion

- Exact visual styling of attribution panel (Card vs bordered section vs simple grid of DetailItems)
- Whether attribution panel is collapsed by default or open
- Timeline row spacing and icon choice (globe vs browser icon for page_view)
- Whether `visitCount` server enrichment is attempted or deferred if join is complex

### Deferred Ideas (OUT OF SCOPE)

- Standalone session browser in Journey tab (requires new "list all sessions" API endpoint)
- Source/Campaign Select options populated dynamically from live data (v1.3 polish)
- Visit count server enrichment if the join adds meaningful latency to leads list query — may defer to a separate `GET /api/admin/leads/:id/attribution` endpoint
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-06 | Journey tab shows page-by-page visit sequence for a selected visitor session: first source, pages visited in order, and conversion event that closed the journey | `getVisitorJourney` already returns `{ session, conversions[] }` ordered by `convertedAt asc`; `page_view` rows included in `attributionConversions` (plain text column, not filtered by type union); Journey tab reads `conversions[]` from the API response directly |
| LEADATTR-01 | Lead detail drawer shows attribution summary panel: first source, last source, campaign name, landing page, number of visits before conversion | All attribution fields (`firstTouchSource`, `firstTouchCampaign`, `lastTouchSource`, `lastTouchCampaign`) already exist on `formLeads` schema; `ftLandingPage` and `visitCount` require a server-side `listFormLeads` enrichment join to `visitor_sessions` + count from `attributionConversions` |
| LEADATTR-02 | Attribution panel uses business-language channel labels — no utm_ field names visible | `channelLabel()` utility function in `utils.ts` provides the mapping; this function does not yet exist and must be created as part of this phase |
</phase_requirements>

---

## Summary

Phase 7 is a pure UI and minimal server enrichment phase. All the foundational data (visitor sessions, attribution conversions, first/last touch fields on leads) already exists from Phases 3–6. The work is: (1) adding a 5th Journey tab to `MarketingSection.tsx` with a click-to-navigate UX from the Conversions tab, (2) adding a Marketing Attribution panel to the existing Lead detail Dialog, and (3) two small server-side enrichments: adding `visitorUuid` to the conversions API response, and optionally adding `ftLandingPage` + `visitCount` to the leads API response.

The most important architectural insight is the **page_view data path**: page view events are stored in `attribution_conversions` with `conversionType = 'page_view'` (plain text) and the `pagePath` column. They reach this table through `POST /api/attribution/conversion` (Phase 4). The `getVisitorJourney` storage method already returns them alongside real conversion events, ordered by `convertedAt asc`. The Journey tab timeline must therefore render two event-type variants from the same `conversions[]` array.

The second key insight is the **selectedVisitorId state lifting**: `MarketingConversionsTab` is currently a self-contained query component with no callbacks. Clicking a row to navigate to Journey requires: (a) lifting a `selectedVisitorUuid` string state to `MarketingSection.tsx`, (b) converting the existing `<Tabs>` from an uncontrolled (`defaultValue`) component to a controlled one (`value` + `onValueChange`), and (c) adding `onSelectVisitor` prop to `MarketingConversionsTab`. This is the only structural change to existing Phase 6 components.

**Primary recommendation:** Implement in two plans. Plan 07-01: server enrichment + `channelLabel` utility + `MarketingJourneyTab` component + `MarketingSection.tsx` controlled tabs + `MarketingConversionsTab` click handler. Plan 07-02: lead attribution panel in `LeadsSection.tsx` + leads server enrichment.

---

## Standard Stack

### Core (all already in the project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | Component rendering | Project standard |
| TanStack React Query | ^5 | `useQuery` for journey API call | Phase 6 pattern — `staleTime: 30_000` |
| shadcn/ui Tabs | current | Controlled tab navigation | Already used in MarketingSection |
| shadcn/ui Collapsible | current | Attribution panel expand/collapse | Already imported in LeadsSection.tsx (line 36) |
| lucide-react | current | TrendingUp, Globe, Zap icons | Phase 6 pattern |
| date-fns `formatDistanceToNow` | ^3 | Relative timestamps | Already used in MarketingConversionsTab |
| Drizzle ORM | current | SQL joins for server enrichment | Project standard |
| Zod | ^3 | Request validation on new route fields | Project standard |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new folders needed. New and modified files:

```
client/src/components/admin/marketing/
├── MarketingJourneyTab.tsx          ← NEW (D-10)
├── MarketingConversionsTab.tsx      ← MODIFY (add onSelectVisitor prop)
├── utils.ts                         ← MODIFY (add channelLabel function)

client/src/components/admin/
├── MarketingSection.tsx             ← MODIFY (controlled tabs + selectedVisitorUuid state)
├── LeadsSection.tsx                 ← MODIFY (attribution panel in Dialog)

server/routes/marketing.ts           ← MODIFY (enrich conversions response with visitorUuid)
server/storage.ts                    ← MODIFY (getMarketingConversions join + listFormLeads enrichment)
```

### Pattern 1: Controlled Tabs with Navigation State

`MarketingSection.tsx` must switch from uncontrolled to controlled tabs to support programmatic tab switching when a Conversions row is clicked.

**What:** Add `activeTab` state + `selectedVisitorUuid` state. Pass callbacks down to `MarketingConversionsTab`.

**Example:**
```typescript
// MarketingSection.tsx — controlled tabs
const [activeTab, setActiveTab] = useState<string>('overview');
const [selectedVisitorUuid, setSelectedVisitorUuid] = useState<string | null>(null);

// callback passed to MarketingConversionsTab
const handleSelectVisitor = (uuid: string) => {
  setSelectedVisitorUuid(uuid);
  setActiveTab('journey');
};

// Tabs switch from defaultValue to controlled:
<Tabs value={activeTab} onValueChange={setActiveTab}>
  ...
  <TabsTrigger value="journey">Journey</TabsTrigger>
  ...
  <TabsContent value="journey">
    <MarketingJourneyTab selectedVisitorUuid={selectedVisitorUuid} />
  </TabsContent>
</Tabs>
```

### Pattern 2: MarketingConversionsTab Click Handler

Add `onSelectVisitor?: (visitorUuid: string) => void` prop. Rows become clickable when the prop is present. The `visitorUuid` field comes from the enriched server response (D-05).

**Critical:** The `AttributionConversion` type in `shared/schema.ts` does not include `visitorUuid`. The conversions API response will need a local augmented type, OR the planner casts the response to include `visitorUuid?: string`. The safe approach is a local interface extension in `MarketingConversionsTab.tsx`:

```typescript
type ConversionWithUuid = AttributionConversion & { visitorUuid?: string };
```

The query return type changes from `AttributionConversion[]` to `ConversionWithUuid[]`.

### Pattern 3: Journey Timeline Component

`MarketingJourneyTab.tsx` follows the Phase 6 tab component pattern:

```typescript
// Source: Phase 6 pattern from MarketingConversionsTab.tsx
export interface MarketingJourneyTabProps {
  selectedVisitorUuid: string | null;
}

export function MarketingJourneyTab({ selectedVisitorUuid }: MarketingJourneyTabProps) {
  const { data, isLoading, isError } = useQuery<VisitorJourney>({
    queryKey: ['/api/admin/marketing/journey', selectedVisitorUuid],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/marketing/journey?visitorId=${selectedVisitorUuid}`);
      return res.json();
    },
    enabled: !!selectedVisitorUuid,   // do not fire when null
    staleTime: 30_000,
  });

  if (!selectedVisitorUuid) return <EmptyState ... />;
  // ...
}
```

The `enabled: !!selectedVisitorUuid` guard prevents an API call when no visitor is selected (empty state path, D-04).

### Pattern 4: Attribution Panel in LeadsSection

The attribution panel appends AFTER the "Form Answers" section inside the existing `<Dialog>`. The `<Collapsible>` component is already imported in `LeadsSection.tsx` (line 36) — use it for the "Marketing Attribution" section.

**Rendering guard (D-14):** Only render the panel when `selectedLead.firstTouchSource` is non-null.

```typescript
// Inside the Dialog scroll area, after questionsForDisplay map
{selectedLead.firstTouchSource && (
  <AttributionPanel lead={selectedLead} />
)}
```

The `AttributionPanel` is either a local component in `LeadsSection.tsx` or a named export in `marketing/`. Given it reads from `FormLead` type fields, inline in `LeadsSection.tsx` avoids a cross-folder type import.

### Pattern 5: channelLabel Shared Utility

Add to `client/src/components/admin/marketing/utils.ts` as a named export:

```typescript
// D-16 canonical channel label mapping
export function channelLabel(source: string | null | undefined): string {
  if (!source) return 'Unknown';
  const s = source.toLowerCase();
  if (s === 'organic_search') return 'Organic Search';
  if (s === 'paid_search' || s === 'paid_ads') return 'Paid Ads';
  if (s === 'social') return 'Social Media';
  if (s === 'referral') return 'Referral';
  if (s === 'direct') return 'Direct';
  return 'Unknown';
}
```

### Pattern 6: Server Conversions Enrichment

`getMarketingConversions` in `storage.ts` currently does `db.select().from(attributionConversions)` with no joins. To add `visitorUuid`, a left join to `visitorSessions` is needed. The Drizzle pattern:

```typescript
// storage.ts — getMarketingConversions enrichment
const rows = await db
  .select({
    ...getTableColumns(attributionConversions),
    visitorUuid: visitorSessions.visitorId,   // UUID string
  })
  .from(attributionConversions)
  .leftJoin(visitorSessions, eq(attributionConversions.visitorId, visitorSessions.id))
  .where(and(
    gte(attributionConversions.convertedAt, from),
    lte(attributionConversions.convertedAt, to),
  ))
  .orderBy(desc(attributionConversions.convertedAt))
  .limit(500);
```

The return type changes from `AttributionConversion[]` to `Array<AttributionConversion & { visitorUuid: string | null }>`. The route layer serializes this to JSON unchanged.

**Note on `getTableColumns`:** Drizzle exports `getTableColumns` from `drizzle-orm` — this is the canonical way to spread all columns of a table when adding extra selects. Alternatively, explicit column selection works but is verbose. Confirm import: `import { getTableColumns } from 'drizzle-orm'`.

### Pattern 7: Leads Server Enrichment (D-13)

`listFormLeads` currently returns `FormLead[]` from a simple `db.select().from(formLeads)`. To add `ftLandingPage` and `visitCount`, two options:

**Option A — Join in listFormLeads (preferred if simple):**
```typescript
// One left join to visitor_sessions for ftLandingPage
// visitCount requires a correlated subquery or a separate aggregation
```

**Option B — Deferred separate endpoint** (per CONTEXT.md deferred ideas):
```typescript
// GET /api/admin/leads/:id/attribution → returns { ftLandingPage, visitCount }
// Client calls it only when lead dialog opens and firstTouchSource is non-null
```

**Recommendation:** Attempt Option A for `ftLandingPage` (single left join, low cost). For `visitCount`, use a correlated subquery `(SELECT COUNT(*) FROM attribution_conversions WHERE visitor_id = $id AND conversion_type = 'page_view')` selected as an additional column. If the planner finds this adds complexity, defer visitCount via Option B — the CONTEXT.md explicitly marks this as Claude's discretion.

**Return type implication:** `listFormLeads` would return `Array<FormLead & { ftLandingPage?: string | null; visitCount?: number }>`. The route serializes as-is. The client receives enriched rows. The `FormLead` type from `shared/schema.ts` does NOT include these fields, so `LeadsSection.tsx` must use an extended type locally.

### Anti-Patterns to Avoid

- **Don't add a new React Query state for attribution in LeadsSection.tsx** — D-12 is explicit: reads from `selectedLead` fields directly. No extra API call for basic attribution.
- **Don't mutate the `Tabs` component's tab order** — Journey is 5th, after Conversions. Changing order breaks the existing tab UX.
- **Don't show `utm_` field names** — any display of raw `ftSource`, `ftMedium`, `ftCampaign` values must pass through `channelLabel()` for source, or be directly shown as campaign text (campaign names are already human-readable).
- **Don't use `defaultValue` after adding controlled `value` prop** — shadcn Tabs is uncontrolled with `defaultValue`, controlled with `value`. Mixing them causes the tab to ignore programmatic switches. The migration to `value` + `onValueChange` is mandatory.
- **Don't re-fetch journey on every render** — use `staleTime: 30_000` and `enabled: !!selectedVisitorUuid` (same as other Phase 6 queries).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vertical timeline layout | Custom flex+grid CSS | Tailwind utility classes with `border-l` vertical line | Standard pattern; CSS-only, no new component |
| Relative timestamps | Custom date formatter | `formatDistanceToNow` from `date-fns` | Already imported in MarketingConversionsTab |
| Expand/collapse panel | Custom accordion logic | shadcn `<Collapsible>` | Already imported in LeadsSection.tsx line 36 |
| Label/value display | Custom HTML | `DetailItem` component | Already used throughout LeadsSection Dialog |
| Table column spread in Drizzle | Manual column list | `getTableColumns()` from `drizzle-orm` | Standard Drizzle pattern for join select expansion |

**Key insight:** This phase is 95% composition of existing infrastructure. The Tabs, Dialog, Collapsible, DetailItem, formatDistanceToNow, useQuery patterns are all established and present. The main value add is wiring them together with the new data flow.

---

## Common Pitfalls

### Pitfall 1: page_view rows have `conversionType` as plain text

**What goes wrong:** TypeScript's `AttributionConversion` type has `conversionType` typed as `'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started'` (drizzle-zod infers from the `$type<>` annotation). But the DB column is plain text and stores `'page_view'` rows too. The Journey tab must render `page_view` rows — it cannot filter them out.

**Why it happens:** Phase 3 decision (STATE.md): "conversionType uses text + `$type<>` annotation, not pgEnum". The `$type<>` annotation is TypeScript-only; the DB has no constraint.

**How to avoid:** Cast the `conversions` array to `Array<Omit<AttributionConversion, 'conversionType'> & { conversionType: string }>` inside the Journey tab (same pattern used in `MarketingConversionsTab.tsx` line 56). Switch on `conversionType === 'page_view'` for visual branching.

**Warning signs:** If the timeline renders no page_view rows in test data, the type narrowing is filtering them out.

### Pitfall 2: Tabs controlled vs uncontrolled mismatch

**What goes wrong:** The existing `<Tabs>` in `MarketingSection.tsx` uses `defaultValue="overview"` (uncontrolled). If you add `value={activeTab}` without removing `defaultValue`, React warns about mixing controlled/uncontrolled and tab switching breaks.

**Why it happens:** shadcn's `<Tabs>` wraps Radix UI Tabs, which follows React's controlled/uncontrolled contract strictly.

**How to avoid:** Replace `defaultValue="overview"` with `value={activeTab}` and add `onValueChange={setActiveTab}`. Initialize `activeTab` state as `'overview'`.

### Pitfall 3: visitorUuid missing from conversions rows for old data

**What goes wrong:** `attributionConversions.visitorId` is nullable (integer FK with `onDelete: set null`). If a conversion's visitor session was deleted or is null, the left join returns `visitorUuid: null`. Clicking that row would attempt `GET /api/admin/marketing/journey?visitorId=null`.

**Why it happens:** Schema allows null visitorId on conversions; sessions can be deleted.

**How to avoid:** In `MarketingConversionsTab`, only show the click cursor / handle the click when `row.visitorUuid != null`. The row is still displayed, but clicking does nothing (or shows a toast: "Journey data not available for this visitor").

### Pitfall 4: Lead attribution panel renders for every lead opening

**What goes wrong:** The attribution panel renders even for leads captured before the v1.2 attribution system was deployed (pre-Phase 3 leads), showing an empty or "—" panel for every field.

**Why it happens:** `selectedLead.firstTouchSource` is null for pre-attribution leads.

**How to avoid:** D-14 guard — only render the panel when `selectedLead.firstTouchSource != null`. This hides the panel entirely for legacy leads, giving a clean experience.

### Pitfall 5: listFormLeads return type widens breaks TypeScript

**What goes wrong:** If `listFormLeads` return type changes from `Promise<FormLead[]>` to `Promise<Array<FormLead & { ftLandingPage?: string | null; visitCount?: number }>>`, every caller of `listFormLeads` sees a wider type. Assignments to `FormLead[]` variables will error.

**Why it happens:** TypeScript structural typing — extra fields are assignable to narrower types, but explicit `Promise<FormLead[]>` annotation in the IStorage interface will reject a wider return.

**How to avoid:** Either (a) update the `IStorage` interface signature to match the wider return, or (b) keep `listFormLeads` returning `Promise<FormLead[]>` and compute the enriched fields in the route layer (inline join in the route, not in the storage method). Option (b) avoids touching the IStorage interface.

### Pitfall 6: Journey tab `useQuery` fires on mount with null UUID

**What goes wrong:** `useQuery` with `queryKey: ['journey', null]` fires immediately if `enabled` is not set, sending `GET /api/admin/marketing/journey?visitorId=null` which the server rejects with 400 (Zod UUID validation).

**How to avoid:** Always set `enabled: !!selectedVisitorUuid` so the query only fires when a UUID is present.

---

## Code Examples

### Vertical Timeline Row (page_view)
```typescript
// Timeline row — page_view variant
// TailwindCSS vertical timeline using border-l
<div className="flex gap-3 items-start">
  <div className="flex flex-col items-center">
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
      <Globe className="h-4 w-4 text-muted-foreground" />
    </div>
    {/* vertical connector — omit on last row */}
    <div className="w-px flex-1 bg-border mt-1" />
  </div>
  <div className="pb-4">
    <p className="text-sm font-medium">{event.pagePath ?? '/'}</p>
    <p className="text-xs text-muted-foreground">
      {formatDistanceToNow(new Date(convertedAtStr), { addSuffix: true })}
    </p>
  </div>
</div>
```

### Session Summary Card
```typescript
// Above the timeline — reads from VisitorJourney.session
<Card className="mb-4">
  <CardContent className="pt-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
    <DetailItem label="First Source" value={channelLabel(data.session.ftSourceChannel)} />
    <DetailItem label="Campaign" value={data.session.ftCampaign ?? '—'} />
    <DetailItem label="Entry Page" value={data.session.ftLandingPage ?? '/'} />
    <DetailItem label="Total Events" value={String(data.conversions.length)} />
  </CardContent>
</Card>
```

### channelLabel Utility
```typescript
// utils.ts — add after buildMarketingQueryParams
export function channelLabel(source: string | null | undefined): string {
  if (!source) return 'Unknown';
  const s = source.toLowerCase().trim();
  if (s === 'organic_search') return 'Organic Search';
  if (s === 'paid_search' || s === 'paid_ads') return 'Paid Ads';
  if (s === 'social') return 'Social Media';
  if (s === 'referral') return 'Referral';
  if (s === 'direct') return 'Direct';
  return 'Unknown';
}
```

### Drizzle Join for visitorUuid Enrichment
```typescript
// storage.ts — getMarketingConversions with visitorUuid
import { getTableColumns } from 'drizzle-orm';

const rows = await db
  .select({
    ...getTableColumns(attributionConversions),
    visitorUuid: visitorSessions.visitorId,
  })
  .from(attributionConversions)
  .leftJoin(visitorSessions, eq(attributionConversions.visitorId, visitorSessions.id))
  .where(and(
    gte(attributionConversions.convertedAt, from),
    lte(attributionConversions.convertedAt, to),
  ))
  .orderBy(desc(attributionConversions.convertedAt))
  .limit(500);
```

### Attribution Panel (inline in LeadsSection Dialog)
```typescript
// After the Form Answers section in LeadsSection Dialog
{selectedLead.firstTouchSource && (
  <Collapsible defaultOpen>
    <CollapsibleTrigger asChild>
      <button className="flex w-full items-center justify-between rounded-lg border p-3 text-sm font-semibold hover:bg-muted/40">
        Marketing Attribution
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border border-t-0 rounded-b-lg">
        <DetailItem label="First Source" value={channelLabel(selectedLead.firstTouchSource)} />
        <DetailItem label="First Campaign" value={selectedLead.firstTouchCampaign ?? '—'} />
        <DetailItem label="Last Source" value={channelLabel(selectedLead.lastTouchSource)} />
        <DetailItem label="Last Campaign" value={selectedLead.lastTouchCampaign ?? '—'} />
        <DetailItem label="Landing Page" value={(selectedLead as any).ftLandingPage ?? '—'} />
        <DetailItem label="Visits Before Conversion" value={String((selectedLead as any).visitCount ?? '—')} />
      </div>
    </CollapsibleContent>
  </Collapsible>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Uncontrolled Tabs (`defaultValue`) | Controlled Tabs (`value` + `onValueChange`) | Phase 7 (this phase) | Enables programmatic tab switching from Conversions → Journey |
| MarketingConversionsTab is self-contained | MarketingConversionsTab receives `onSelectVisitor` prop | Phase 7 | Enables parent-orchestrated navigation |
| `getMarketingConversions` returns `AttributionConversion[]` | Returns `AttributionConversion & { visitorUuid }[]` | Phase 7 | Journey tab can call journey API without a second round-trip |

---

## Open Questions

1. **Does `getTableColumns` from drizzle-orm work with the project's Drizzle version?**
   - What we know: `getTableColumns` is available in Drizzle ORM since v0.28. The project uses Drizzle ORM (exact version not checked).
   - What's unclear: version pinned in `package.json`.
   - Recommendation: Check `package.json`. If `getTableColumns` is unavailable, use explicit column selection: `ftSource: attributionConversions.ftSource, ...` — verbose but safe.

2. **Will the `listFormLeads` return type widening cause IStorage interface errors?**
   - What we know: `IStorage.listFormLeads` is typed as returning `Promise<FormLead[]>`. Adding join fields widens the return type.
   - What's unclear: Whether the planner prefers touching IStorage or keeping enrichment in the route handler.
   - Recommendation: If enrichment is in storage, update the IStorage interface. If enrichment is in the route handler (join inline in the GET /api/form-leads route), IStorage stays unchanged. The route handler approach is lower risk.

3. **Does `ftLandingPage` on the lead come from `visitor_sessions.ft_landing_page` or from `form_leads.firstTouchSource` area?**
   - What we know: `formLeads` schema (schema.ts lines 208-217) has `firstTouchSource`, `firstTouchMedium`, `firstTouchCampaign`, `lastTouchSource`, `lastTouchMedium`, `lastTouchCampaign` — but no `ftLandingPage` column directly. `visitorSessions.ftLandingPage` exists.
   - What's unclear: Whether `linkLeadToVisitor` (Phase 4) copies `ftLandingPage` onto `formLeads` or leaves it in `visitorSessions` only.
   - Recommendation: The planner should join `visitor_sessions` to get `ftLandingPage`. The plan must include this join to satisfy LEADATTR-01's "landing page" field.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 7 is purely client/server code changes with no new external dependencies. All tools (Node, npm, TypeScript, Drizzle, PostgreSQL) are already operational from Phases 3–6.

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (no pytest.ini, jest.config.*, vitest.config.*, or __tests__ directory found) |
| Config file | None |
| Quick run command | `npm run check` (TypeScript type check — proxy for structural correctness) |
| Full suite command | `npm run build` (full build — catches type + bundle errors) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| DASH-06 | Journey tab renders ordered event list for selected visitor | Manual smoke | `npm run dev` → click Conversions row | No automated test; UI-only |
| DASH-06 | Journey empty state shows when no visitor selected | Manual smoke | `npm run dev` → click Journey tab directly | UI-only |
| LEADATTR-01 | Lead dialog shows attribution panel for leads with firstTouchSource | Manual smoke | `npm run dev` → open lead with attribution data | UI-only |
| LEADATTR-02 | Channel labels show "Paid Ads" not "paid_ads" | `npm run check` | TypeScript confirms `channelLabel()` function exists | Partial automation |
| DASH-06 + LEADATTR-02 | `channelLabel()` utility maps all 6 source values correctly | Manual unit review | Inspect `utils.ts` after implementation | No automated test framework |

### Sampling Rate
- **Per task commit:** `npm run check` — TypeScript passes
- **Per wave merge:** `npm run build` — full build passes
- **Phase gate:** Manual smoke test of Journey navigation + lead attribution panel in dev server before `/gsd:verify-work`

### Wave 0 Gaps
- No test infrastructure gaps — there is no test framework in this project; TypeScript + manual smoke tests are the validation strategy throughout v1.2.

---

## Sources

### Primary (HIGH confidence)
- `client/src/components/admin/MarketingSection.tsx` — existing 4-tab structure, filter state, tab pattern
- `client/src/components/admin/marketing/MarketingConversionsTab.tsx` — query pattern, type casting approach, CONVERSION_LABELS
- `client/src/components/admin/marketing/utils.ts` — existing DatePreset, MarketingFilters, buildMarketingQueryParams
- `client/src/components/admin/LeadsSection.tsx` — Dialog structure, selectedLead state, DetailItem usage, Collapsible import
- `server/routes/marketing.ts` — journey route (line 75), conversions route structure
- `server/storage.ts` lines 1864-1896 — `getMarketingConversions` (no join, returns `AttributionConversion[]`), `getVisitorJourney` (joins visitorSessions + attributionConversions, returns `{ session, conversions[] }`)
- `shared/schema.ts` lines 195-312 — formLeads attribution columns, visitorSessions schema, attributionConversions schema
- `shared/marketing-types.ts` — `VisitorJourney` type definition
- `.planning/phases/07-visitor-journey-lead-attribution-panel/07-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- `server/storage.ts` `listFormLeads` (line 1159) — current implementation, no join; confirmed no `ftLandingPage` on return
- `server/routes/leads.ts` line 350 — GET /api/form-leads delegates to `storage.listFormLeads`; enrichment options identified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in project, no new installs
- Architecture: HIGH — all patterns verified against live codebase files
- Pitfalls: HIGH — identified from actual type annotations in existing code (conversionType cast, controlled tabs migration)
- Server enrichment approach: MEDIUM — `getTableColumns` availability depends on Drizzle version not checked; explicit column fallback documented

**Research date:** 2026-04-27
**Valid until:** 2026-05-27 (stable codebase; no fast-moving external dependencies)
