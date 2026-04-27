# Phase 06: Marketing Admin Dashboard - Research

**Researched:** 2026-04-25
**Domain:** React admin UI — read-only data dashboard with tabs, filter bar, Recharts time-series, and shadcn component composition
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Admin Section Registration**
- D-01: Add `'marketing'` to the `AdminSection` type union in `client/src/components/admin/shared/types.ts`.
- D-02: Add marketing entry to `ADMIN_ROUTES` in `client/src/components/admin/shared/routes.ts`: `{ id: 'marketing', slug: 'marketing', title: 'Marketing', icon: TrendingUp }` — import `TrendingUp` from `lucide-react`, place after `'leads'`.
- D-03: In `Admin.tsx`, render `<MarketingSection />` for the `'marketing'` section case — follow the exact same pattern as `NotificationsSection` and `LeadsSection`.
- D-04: Create `client/src/components/admin/MarketingSection.tsx` — owns filter state, passes filtered data down.

**Filter Bar**
- D-05: Always-visible horizontal filter bar inside `MarketingSection.tsx`, not collapsible, follows `LeadsSection` filter row pattern.
- D-06: Filter state lives in `MarketingSection.tsx` via `useState`. Shape: `{ datePreset, dateFrom?, dateTo?, source?, campaign?, conversionType? }`. Default: `{ datePreset: '30d' }`.
- D-07: Date preset UI: shadcn `<Button variant="outline">` buttons. Active preset gets `variant="default"`. Custom opens `react-day-picker` calendar popover.
- D-08: Source and campaign filters: shadcn `<Select>` dropdowns populated from the API response data.
- D-09: Conversion type filter: `<Select>` with hardcoded business-label options (All / Lead Created / Phone Call / Form Submitted / Booking Started).
- D-10: Filters immediately trigger React Query refetch via `queryKey` that includes filter state. No "Apply" button.

**Tab Structure**
- D-11: Use shadcn `<Tabs>`. Four tabs in order: Overview / Sources / Campaigns / Conversions. Default tab: Overview.
- D-12: Each tab is a separate component in `client/src/components/admin/marketing/`.
- D-13: All four tabs use `useQuery` with filter object in the `queryKey`.

**Overview Tab (DASH-02)**
- D-14: Two rows of KPI cards + AreaChart below.
- D-15: Recharts `<AreaChart>` with two series — Visits (blue `#1C53A3`) and Conversions (gold `#FFD700`). `ResponsiveContainer` for full width.
- D-16: API: `GET /api/admin/marketing/overview` with filter params.
- D-17: KPI labels: "Total Visits", "Leads Generated", "Conversion Rate", "Top Traffic Source", "Best Campaign", "Best Landing Page".

**Sources Tab (DASH-03)**
- D-18 to D-22: Table with columns Source / Visits / Leads / HOT / WARM / COLD / Conv. Rate. HOT/WARM/COLD as colored badges. Sorted server-side.

**Campaigns Tab (DASH-04)**
- D-23 to D-25: Table with columns Campaign / Source / Channel / Visits / Leads / Conv. Rate / Top Landing Page. Empty campaign name shown as "Direct / Untagged" in italics.

**Conversions Tab (DASH-05)**
- D-26 to D-29: Table listing 25 most recent conversions. Columns: When / Type / Source / Campaign / Landing Page. Business labels for type. "When" uses `date-fns` `formatDistanceToNow`.

**Empty States (DASH-08)**
- D-30 to D-31: Each tab has a centered `<Card>` empty state with `TrendingUp`/`BarChart2` icon, heading, and coach tip.

**Business Language (DASH-07)**
- D-32: Zero utm_* terms visible anywhere. Vocabulary mapping enforced.

### Claude's Discretion

- Loading skeleton design for tabs while data fetches (use shadcn Skeleton or simple spinner)
- Exact responsive breakpoints for KPI card grid (2-col on mobile, 3-col on desktop)
- Whether to show a "Last updated" timestamp on the Overview tab
- Exact padding/spacing values — follow existing admin section conventions

### Deferred Ideas (OUT OF SCOPE)

- Visitor journey tab (Phase 7)
- Row click drill-down to see specific leads from a source/campaign (v1.3)
- Export to CSV (out of scope per requirements)
- Sorting by column click (v1.3)
- "Compare to previous period" % change on KPI cards (v1.3)
- Sparkline mini-charts in Sources/Campaigns rows (v1.3)
- Device type filter (FILTER-04 partial — conversionType filter included, device type excluded)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Admin panel has a "Marketing" section in existing admin navigation, built as a per-section component following NotificationsSection/LeadsSection pattern | D-01/D-02/D-03: exact file mutations identified; existing types.ts and routes.ts inspected directly |
| DASH-02 | Overview tab: total visits, leads generated, conversion rate, top source/campaign/landing page, time-series chart | API endpoint confirmed (`/api/admin/marketing/overview`), `MarketingOverview` type verified in shared/marketing-types.ts |
| DASH-03 | Sources tab: channel groups with visits/leads/HOT/WARM/COLD/conversion rate | API `/api/admin/marketing/sources` confirmed; `MarketingBySource` type verified; HOT/WARM/COLD values are English strings ('HOT'/'WARM'/'COLD') |
| DASH-04 | Campaigns tab: campaign rows with source/channel/visits/leads/conv rate/top landing pages | API `/api/admin/marketing/campaigns` confirmed; `MarketingByCampaign` type verified |
| DASH-05 | Conversions tab: recent events with business-language labels, timestamp, attribution | API `/api/admin/marketing/conversions` returns `AttributionConversion[]` — full schema verified |
| DASH-07 | Business-first language throughout — no utm_* terms anywhere in visible UI | D-32 vocabulary map confirmed; enforced in all tab components |
| DASH-08 | Every tab shows a coach-mark empty state when no data matches current filters | Empty state spec from 06-UI-SPEC.md verified; pattern documented |
| FILTER-01 | Date range filter with presets (Today/Last 7/Last 30/This month/Custom) | Date preset button pattern confirmed; `react-day-picker` v8.10.1 installed; `Calendar` from `@/components/ui/calendar` available |
| FILTER-02 | Filter by traffic source (channel) | Source `<Select>` populated from API response; `source` query param accepted by server |
| FILTER-03 | Filter by campaign name | Campaign `<Select>` populated from API response; `campaign` query param accepted by server |
| FILTER-04 | Filter by conversion type | `<Select>` with 4 hardcoded business-label options; **conversionType is client-side filtered** (see Critical Finding below) |
</phase_requirements>

---

## Summary

Phase 6 is a pure frontend build — no new server code. All four API endpoints already exist in `server/routes/marketing.ts`, implemented in `server/storage.ts`, and have been operational since Phase 4. The `shared/marketing-types.ts` file defines the exact TypeScript return types (`MarketingOverview`, `MarketingBySource[]`, `MarketingByCampaign[]`, `AttributionConversion[]`).

The implementation pattern is straightforward: add `'marketing'` to the `AdminSection` union, add a route entry, render the component in `Admin.tsx`, then build `MarketingSection.tsx` as the filter-state owner and five new tab component files. Every UI building block is already installed — shadcn Tabs/Card/Select/Button/Skeleton/Badge/Popover/Calendar, Recharts 2.15.2, date-fns 3.6.0, and lucide-react.

The primary planning consideration is one critical finding: **`getMarketingConversions` does not server-side filter by `conversionType`** — the storage method only applies the date range. The route layer accepts the param but the storage ignores it. FILTER-04 must be implemented as client-side array filtering on the returned `AttributionConversion[]`. This is explicitly in scope — the plan must account for it.

**Primary recommendation:** Build MarketingSection + 4 tab subcomponents exactly following the `LeadsSection.tsx` filter-state + `useQuery` pattern. No new dependencies. No server changes.

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Confirmed |
|---------|---------|---------|-----------|
| `recharts` | 2.15.2 | AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Area | `package.json` line 97 |
| `date-fns` | ^3.6.0 | `formatDistanceToNow`, `format` | `package.json` line 70 |
| `react-day-picker` | ^8.10.1 | Custom date range calendar via `<Calendar>` from `@/components/ui/calendar` | `package.json` line 92 |
| `@tanstack/react-query` | (existing) | `useQuery` for all tab data fetching | Used throughout admin |
| `lucide-react` | (existing) | `TrendingUp`, `BarChart2`, `CalendarDays` icons | Used in all admin sections |

### shadcn Components (already available at `@/components/ui/`)

| Component | Import | Usage |
|-----------|--------|-------|
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `@/components/ui/tabs` | Four-tab navigation |
| `Card`, `CardContent`, `CardHeader`, `CardTitle` | `@/components/ui/card` | KPI cards, table wrapper, empty states, chart |
| `Button` | `@/components/ui/button` | Date preset buttons |
| `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` | `@/components/ui/select` | Source / Campaign / Conversion Type filters |
| `Skeleton` | `@/components/ui/skeleton` | Loading states per tab |
| `Badge` | `@/components/ui/badge` | HOT/WARM/COLD quality badges, conversion event type pills |
| `Popover`, `PopoverContent`, `PopoverTrigger` | `@/components/ui/popover` | Custom date range picker wrapper |
| `Calendar` | `@/components/ui/calendar` | Date picker inside custom range popover |

**Installation:** None required. All packages are already in `package.json`.

---

## Architecture Patterns

### File Map (complete — all new files)

```
client/src/
├── components/admin/
│   ├── MarketingSection.tsx              # NEW — section root, owns filter state
│   └── marketing/
│       ├── MarketingOverviewTab.tsx      # NEW — Overview tab
│       ├── MarketingSourcesTab.tsx       # NEW — Sources tab
│       ├── MarketingCampaignsTab.tsx     # NEW — Campaigns tab
│       └── MarketingConversionsTab.tsx   # NEW — Conversions tab
└── [mutations to existing files]
    ├── components/admin/shared/types.ts  # Add 'marketing' to AdminSection union
    ├── components/admin/shared/routes.ts # Add marketing entry to ADMIN_ROUTES
    └── pages/Admin.tsx                   # Add case for activeSection === 'marketing'
```

### Pattern 1: Admin Section Registration (D-01, D-02, D-03)

Three surgical edits to existing files:

**types.ts** — add `'marketing'` to the union (currently ends at `'blog'`):
```typescript
// client/src/components/admin/shared/types.ts
export type AdminSection =
  | 'dashboard'
  | 'leads'
  | 'marketing'    // ADD after 'leads'
  | 'hero'
  // ... rest unchanged
```

**routes.ts** — add after the `leads` entry in `ADMIN_ROUTES`:
```typescript
// After: { id: 'leads', slug: 'leads', title: 'Leads', icon: Sparkles },
{ id: 'marketing', slug: 'marketing', title: 'Marketing', icon: TrendingUp },
```
Also add `TrendingUp` to the lucide-react import at the top.

**Admin.tsx** — add the render case. Pattern from existing cases at lines 149-170:
```typescript
{activeSection === 'marketing' && <MarketingSection />}
```
Also add the import: `import { MarketingSection } from '@/components/admin/MarketingSection';`

### Pattern 2: Filter State in Section Component (D-06, D-10)

The `LeadsSection.tsx` pattern (lines 186-197) is the canonical model. Filter state lives in the section component via `useState`. The filter object is included in the `queryKey` array of each tab's `useQuery`. When the filter changes, React Query automatically re-fetches because the key changes.

```typescript
// MarketingSection.tsx — filter state owner
type DatePreset = 'today' | '7d' | '30d' | 'month' | 'custom';
interface MarketingFilters {
  datePreset: DatePreset;
  dateFrom?: string;   // ISO date string, only when datePreset === 'custom'
  dateTo?: string;
  source?: string;
  campaign?: string;
  conversionType?: string;
}

const [filters, setFilters] = useState<MarketingFilters>({ datePreset: '30d' });
```

### Pattern 3: Tab Component Query with Filter in Key (D-13)

Each tab component receives `filters` as a prop and includes it in the query key:

```typescript
// MarketingOverviewTab.tsx — query pattern
const { data, isLoading, isError } = useQuery<MarketingOverview>({
  queryKey: ['/api/admin/marketing/overview', filters],
  queryFn: async () => {
    const params = buildQueryParams(filters);
    const res = await apiRequest('GET', `/api/admin/marketing/overview${params}`);
    return res.json();
  },
  staleTime: 30_000,
});
```

### Pattern 4: Building Query Params from Filter State

The server route (`marketing.ts`) accepts: `dateFrom` (ISO datetime), `dateTo` (ISO datetime), `source`, `campaign`, `conversionType`.

The filter state uses `datePreset` to compute `dateFrom`/`dateTo`. This translation happens in a shared helper:

```typescript
function buildMarketingQueryParams(filters: MarketingFilters): string {
  const params = new URLSearchParams();
  const { from, to } = resolveDateRange(filters.datePreset, filters.dateFrom, filters.dateTo);
  params.set('dateFrom', from.toISOString());
  params.set('dateTo', to.toISOString());
  if (filters.source) params.set('source', filters.source);
  if (filters.campaign) params.set('campaign', filters.campaign);
  if (filters.conversionType) params.set('conversionType', filters.conversionType);
  return `?${params.toString()}`;
}

function resolveDateRange(preset: DatePreset, customFrom?: string, customTo?: string) {
  const now = new Date();
  switch (preset) {
    case 'today': {
      const start = new Date(now); start.setHours(0,0,0,0);
      return { from: start, to: now };
    }
    case '7d':    return { from: new Date(now.getTime() - 7 * 86400_000), to: now };
    case '30d':   return { from: new Date(now.getTime() - 30 * 86400_000), to: now };
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start, to: now };
    }
    case 'custom':
      return {
        from: customFrom ? new Date(customFrom) : new Date(now.getTime() - 30 * 86400_000),
        to: customTo ? new Date(customTo) : now,
      };
  }
}
```

This helper can live in `MarketingSection.tsx` or in a small `client/src/components/admin/marketing/utils.ts` file shared by all tab components.

### Pattern 5: KPI Card (D-14, D-17)

The existing KPI card pattern from `DashboardSection.tsx` and the UI spec:

```typescript
// Inline div pattern (no Card wrapper) — matches LeadsSection/DashboardSection
<div className="rounded-xl border border-border bg-card p-5">
  <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
  <p className="mt-2 text-2xl font-bold">{value}</p>
  <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
</div>
```

Grid layout: `<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">` for row 1; `<div className="grid gap-4 sm:grid-cols-3">` for row 2.

### Pattern 6: Recharts AreaChart (D-15)

The codebase has a `ChartContainer` wrapper in `@/components/ui/chart.tsx` but the decision is to use Recharts directly (as specified in 06-UI-SPEC.md Registry Safety section). There is NO existing AreaChart usage in the codebase — this is the first use.

```typescript
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={260}>
  <AreaChart data={timeSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
    <YAxis tick={{ fontSize: 12 }} />
    <Tooltip
      contentStyle={{
        background: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '6px',
        fontSize: '13px',
      }}
    />
    <Legend />
    <Area type="monotone" dataKey="visits" name="Visits"
      stroke="#1C53A3" fill="#1C53A3" fillOpacity={0.15} />
    <Area type="monotone" dataKey="conversions" name="Conversions"
      stroke="#FFD700" fill="#FFD700" fillOpacity={0.20} />
  </AreaChart>
</ResponsiveContainer>
```

Note: Brand yellow `#FFFF01` is used as chart fill but `#FFD700` (gold) for the stroke because `#FFFF01` is near-invisible on white backgrounds. This is documented in D-15 and 06-UI-SPEC.md.

### Pattern 7: Data Tables (D-18, D-23, D-26)

All three table tabs use the same HTML table structure inside a `<Card>`:

```typescript
<Card className="mt-4">
  <CardContent className="p-0">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {columnLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-border hover:bg-muted/40 transition-colors">
              <td className="px-4 py-3">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </CardContent>
</Card>
```

### Pattern 8: HOT/WARM/COLD Badges (D-20)

```typescript
// Badge color classes per classification
const qualityBadgeClass = (type: 'HOT' | 'WARM' | 'COLD') => ({
  HOT:  'bg-green-100 text-green-800',
  WARM: 'bg-amber-100 text-amber-800',
  COLD: 'bg-gray-100 text-gray-700',
}[type]);

<Badge className={qualityBadgeClass('HOT')}>HOT</Badge>
```

Note: The server returns `hotLeads`, `warmLeads`, `coldLeads` as numbers — these are counts, not the badge label. The badge label is always the static string.

### Pattern 9: Conversion Type Pills (D-27)

```typescript
const CONVERSION_LABELS: Record<string, string> = {
  lead_created:    'Lead Created',
  phone_click:     'Phone Call',
  form_submitted:  'Form Submitted',
  booking_started: 'Booking Started',
  page_view:       'Page View',
};

const CONVERSION_PILL_CLASS: Record<string, string> = {
  lead_created:    'bg-green-100 text-green-800',
  phone_click:     'bg-blue-100 text-blue-800',
  form_submitted:  'bg-purple-100 text-purple-800',
  booking_started: 'bg-orange-100 text-orange-800',
  page_view:       'bg-gray-100 text-gray-700',
};

<Badge className={CONVERSION_PILL_CLASS[row.conversionType] ?? 'bg-gray-100 text-gray-700'}>
  {CONVERSION_LABELS[row.conversionType] ?? row.conversionType}
</Badge>
```

### Pattern 10: Loading Skeleton (Claude's Discretion)

Each tab renders `<Skeleton>` elements while `isLoading` is true (first fetch only):

```typescript
// Overview tab skeleton
if (isLoading) {
  return (
    <div className="space-y-6 pt-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

// Sources/Campaigns/Conversions tab skeleton
if (isLoading) {
  return (
    <div className="space-y-2 pt-4">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
    </div>
  );
}
```

### Pattern 11: Empty State (D-30, D-31)

```typescript
// Render when: !isLoading && !isError && data?.length === 0 (or no timeSeries for overview)
<div className="flex items-center justify-center py-16">
  <Card className="max-w-sm w-full text-center">
    <CardContent className="pt-8 pb-8 px-6">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <TrendingUp className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-bold mb-2">{heading}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </CardContent>
  </Card>
</div>
```

### Pattern 12: Error State

```typescript
if (isError) {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-sm w-full text-center">
        <CardContent className="pt-8 pb-8 px-6">
          <h3 className="text-base font-bold mb-2">Could not load marketing data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Check your connection and try refreshing.
          </p>
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Putting filter state in tab components**: Filter state MUST live in `MarketingSection.tsx`. Tabs receive filters as props and include them in `queryKey`.
- **Calling `apiRequest` without `queryFn`**: The default `queryFn` in `queryClient.ts` joins the `queryKey` array with `/` — it cannot handle filter objects. Always provide an explicit `queryFn`.
- **Using `staleTime: Infinity` for marketing data**: The default `queryClient` uses `staleTime: Infinity`. Marketing data should use a shorter stale time (30 seconds) since it may change as new visits happen.
- **Hardcoding `#FFFF01` for chart stroke**: Use `#FFD700` for chart stroke/line on white backgrounds — the brand yellow is invisible on white. Fill uses `#FFFF01` with low `fillOpacity`.
- **Using `page_view` as a "conversion"**: The `attribution_conversions` table stores `page_view` but it is not a meaningful conversion event for the dashboard. The Conversions tab should only show the 4 real conversion types — filter out `page_view` rows in the tab component.

---

## Critical Finding: conversionType Server-Side Filter Not Implemented

**What:** `server/storage.ts::getMarketingConversions()` (line 1864) applies only date range filters. It does NOT apply `conversionType` filtering, even though the route layer (`marketing.ts` line 11) accepts and parses the `conversionType` query param.

**Impact on FILTER-04:** The `conversionType` filter for the Conversions tab MUST be implemented client-side. The tab component receives `AttributionConversion[]` (up to 500 rows, ordered by `convertedAt` desc) and filters it client-side before rendering.

**Implementation approach:**
```typescript
// MarketingConversionsTab.tsx
const { data: allConversions = [], isLoading, isError, refetch } =
  useQuery<AttributionConversion[]>({
    queryKey: ['/api/admin/marketing/conversions', filters],
    queryFn: async () => {
      const params = buildMarketingQueryParams(filters);
      const res = await apiRequest('GET', `/api/admin/marketing/conversions${params}`);
      return res.json();
    },
  });

// Client-side filter for conversionType + exclude page_view
const visibleConversions = useMemo(() => {
  return allConversions
    .filter(c => c.conversionType !== 'page_view')
    .filter(c => !filters.conversionType || c.conversionType === filters.conversionType)
    .slice(0, 25); // D-29: show 25 most recent
}, [allConversions, filters.conversionType]);
```

**Note:** This does NOT require any server changes. The behavior is correct at scale because `getMarketingConversions` already limits to 500 rows, and client-side filtering of 500 rows is instantaneous.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time-series area chart | Custom SVG/Canvas chart | Recharts `AreaChart` + `Area` | Tooltip, legend, responsive container, axis formatting all included |
| Date formatting | Custom date diff logic | `date-fns` `formatDistanceToNow` | Handles locale, pluralization, edge cases |
| Calendar date picker | Custom input-based date fields | `react-day-picker` via `@/components/ui/calendar` + `<Popover>` | Range selection, keyboard nav, accessibility |
| Percentage formatting | Custom division with rounding | `(value * 100).toFixed(1) + '%'` inline — one line | No library needed; keep it inline in the render |
| Query param serialization | URLSearchParams from scratch | Reuse the `buildMarketingQueryParams` helper across all 4 tabs | Avoids 4 copies of the same date-to-string conversion |

**Key insight:** Every visual element is already covered by installed libraries. The only custom logic is: (1) translating date presets to from/to dates, (2) mapping raw `conversionType` strings to business labels, and (3) client-side filtering for FILTER-04.

---

## API Contract (verified from server code)

### `GET /api/admin/marketing/overview`

Query params: `dateFrom` (ISO datetime), `dateTo` (ISO datetime), `source` (channel string), `campaign` (string).

Returns `MarketingOverview`:
```typescript
{
  totalVisits: number;
  totalLeads: number;
  conversionRate: number;  // 0..1 — multiply by 100 for display
  topSource: string | null;
  topCampaign: string | null;
  topLandingPage: string | null;
  timeSeries: Array<{ date: string; visits: number; conversions: number; }>;
}
```

Zero-state handling: `conversionRate` is `0` when `totalVisits === 0`. Display as `"—"` (em dash), not `"0%"`.

### `GET /api/admin/marketing/sources`

Returns `MarketingBySource[]`:
```typescript
{
  channel: string;       // "Organic Search" | "Paid Ads" | ... | "Unknown"
  visits: number;
  leads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  conversionRate: number;  // 0..1
}
```

### `GET /api/admin/marketing/campaigns`

Returns `MarketingByCampaign[]`:
```typescript
{
  campaign: string;   // Raw campaign name or 'Unknown' if no utm_campaign
  source: string;
  channel: string;
  visits: number;
  leads: number;
  conversionRate: number;
  topLandingPages: string[];  // up to 3 entries
}
```

Note: `campaign === 'Unknown'` means no utm_campaign was set. Display as `<span className="italic text-muted-foreground">Direct / Untagged</span>` per D-24.

### `GET /api/admin/marketing/conversions`

Returns `AttributionConversion[]` (raw Drizzle select from `attribution_conversions` table):
```typescript
{
  id: number;
  visitorId: number | null;
  leadId: number | null;
  conversionType: 'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started';
  ftSource: string | null;
  ftMedium: string | null;
  ftCampaign: string | null;
  ftLandingPage: string | null;
  ltSource: string | null;
  ltMedium: string | null;
  ltCampaign: string | null;
  ltLandingPage: string | null;
  pagePath: string | null;
  convertedAt: string;  // ISO timestamp
}
```

Columns to display in Conversions tab: `convertedAt` → "When", `conversionType` → "Type" (with business label), `ftSource` → "Source", `ftCampaign` → "Campaign", `ftLandingPage` → "Landing Page".

---

## Common Pitfalls

### Pitfall 1: Default QueryFn Joins Key Array with "/"

**What goes wrong:** The `queryClient.ts` sets a default `queryFn` that joins the query key with `/` to form a URL: `queryKey.join("/")`. If a tab uses `queryKey: ['/api/admin/marketing/overview', filters]` without an explicit `queryFn`, the key becomes `/api/admin/marketing/overview/[object Object]` — a 404.

**Why it happens:** Most simpler admin queries use a string key only; marketing queries need params.

**How to avoid:** Always provide an explicit `queryFn` in marketing tab queries (see Pattern 3 above).

**Warning signs:** Network tab shows requests to `/api/admin/marketing/overview/%5Bobject%20Object%5D`.

### Pitfall 2: staleTime: Infinity Means Filters Never Refetch

**What goes wrong:** The `queryClient.ts` sets `staleTime: Infinity` as the default. When the user changes a filter, the `queryKey` changes and React Query triggers a new fetch — this part works correctly. But if the user re-applies the same filter, React Query considers the data fresh (stale = never) and will NOT refetch.

**Why it happens:** `staleTime: Infinity` combined with unchanged `queryKey`.

**How to avoid:** Set `staleTime: 30_000` (30 seconds) on marketing queries so data can be refreshed when the component re-mounts or when the user stays on the same filter for a while.

### Pitfall 3: ADMIN_ROUTES as const Requires TypeScript Type Widening

**What goes wrong:** `ADMIN_ROUTES` in `routes.ts` is declared `as const`. Adding a new entry requires that `'marketing'` also exists in the `AdminSection` union in `types.ts`. The TypeScript compiler will error on the `id: 'marketing'` property if the union is not extended first.

**Why it happens:** The `AdminRouteDefinition` type constrains `id` to `AdminSection`. Both files must be updated in the same plan step.

**How to avoid:** D-01 (types.ts) must happen before D-02 (routes.ts). In a plan, these should be a single task: "Update types.ts then routes.ts".

### Pitfall 4: date-fns v3 Named Export Changes

**What goes wrong:** `date-fns` v3 (installed at ^3.6.0) changed some import paths vs v2. `formatDistanceToNow` is still a named export from the root package, but some utilities moved.

**How to avoid:** Only use `formatDistanceToNow` and `format` from the root package: `import { formatDistanceToNow, format } from 'date-fns'`. Do not import from sub-paths (e.g., `date-fns/formatDistanceToNow`). The existing `IntegrationsSection.tsx` uses `import { format, formatDistanceToNowStrict } from 'date-fns'` — follow this exact pattern.

### Pitfall 5: conversionType Filter Not Applied Server-Side

**What goes wrong:** A developer passes `conversionType` in the query params expecting the server to filter. The server route parses and validates the param but the storage method ignores it. The returned array always has unfiltered data.

**How to avoid:** The `MarketingConversionsTab` must apply conversionType filtering client-side via `useMemo` after the query resolves (see Critical Finding section above). Do not wait for a server fix — this is the correct architecture given the 25-row display cap.

### Pitfall 6: react-day-picker v8 API (not v9)

**What goes wrong:** react-day-picker v9 changed the range selection API. The installed version is v8.10.1.

**How to avoid:** The `<Calendar>` shadcn component wraps react-day-picker and normalizes the API. Always use `<Calendar mode="range" selected={range} onSelect={setRange} />` via the shadcn wrapper at `@/components/ui/calendar` — do not import from `react-day-picker` directly.

---

## Code Examples

### Filter Bar Date Preset Buttons

```typescript
// MarketingSection.tsx — date preset button row
const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today',  label: 'Today' },
  { id: '7d',     label: 'Last 7 days' },
  { id: '30d',    label: 'Last 30 days' },
  { id: 'month',  label: 'This month' },
];

<div className="flex items-center gap-1">
  {DATE_PRESETS.map(preset => (
    <Button
      key={preset.id}
      size="sm"
      variant={filters.datePreset === preset.id ? 'default' : 'outline'}
      onClick={() => setFilters(prev => ({ ...prev, datePreset: preset.id, dateFrom: undefined, dateTo: undefined }))}
    >
      {preset.label}
    </Button>
  ))}
  {/* Custom date picker button — active when datePreset === 'custom' AND both dates set */}
  <Popover>
    <PopoverTrigger asChild>
      <Button
        size="sm"
        variant={filters.datePreset === 'custom' && filters.dateFrom && filters.dateTo ? 'default' : 'outline'}
      >
        <CalendarDays className="h-4 w-4 mr-1" />
        {filters.dateFrom && filters.dateTo
          ? `${format(new Date(filters.dateFrom), 'MMM d')} – ${format(new Date(filters.dateTo), 'MMM d')}`
          : 'Custom'}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="range"
        selected={{ from: filters.dateFrom ? new Date(filters.dateFrom) : undefined, to: filters.dateTo ? new Date(filters.dateTo) : undefined }}
        onSelect={(range) => {
          if (range?.from && range?.to) {
            setFilters(prev => ({
              ...prev,
              datePreset: 'custom',
              dateFrom: range.from!.toISOString(),
              dateTo: range.to!.toISOString(),
            }));
          }
        }}
      />
    </PopoverContent>
  </Popover>
</div>
```

### Conversion Rate Formatting

```typescript
// Use inline — no helper needed
const formatRate = (rate: number, visits: number) =>
  visits === 0 ? '—' : `${(rate * 100).toFixed(1)}%`;

// KPI card helper text
const formatRateHelper = (leads: number, visits: number) =>
  visits === 0 ? 'No visits yet' : `${leads} leads / ${visits} visits`;
```

### formatDistanceToNow for Conversions Tab

```typescript
import { formatDistanceToNow } from 'date-fns';

// "When" column cell
<td className="px-4 py-3 text-sm text-muted-foreground" title={row.convertedAt}>
  {formatDistanceToNow(new Date(row.convertedAt), { addSuffix: true })}
</td>
```

---

## State of the Art

| Area | Current Status | Notes |
|------|----------------|-------|
| `ADMIN_ROUTES as const` | Requires both types.ts AND routes.ts update | TypeScript strict mode enforces this |
| Recharts in this codebase | Zero AreaChart usage today | `chart.tsx` wraps Recharts but no consumer of AreaChart exists — this is the first |
| conversionType server filtering | Partial — route parses it, storage ignores it | Client-side filtering is the pragmatic fix within Phase 6 scope |
| Marketing API endpoints | All 4 exist and are wired in `routes.ts` | Ready to consume; no server changes needed |

---

## Environment Availability

Step 2.6: SKIPPED — Phase 6 is purely client-side UI code. No external CLI tools, databases, or services beyond the already-running dev server are required.

---

## Validation Architecture

`workflow.nyquist_validation` is absent from `.planning/config.json` (only `_auto_chain_active: false` present) — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not detected |
| Config file | None found in project root or client/ |
| Quick run command | `npm run check` (TypeScript type checking) |
| Full suite command | `npm run check` |

No test files detected in the codebase (no `*.test.ts`, `*.spec.ts`, `jest.config.*`, `vitest.config.*`, or `test/` directory found). The project's quality gate for this phase is TypeScript type safety (`npm run check`) and visual/functional review.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | 'marketing' in AdminSection union; route registered; renders in Admin.tsx | TypeScript compile | `npm run check` | n/a |
| DASH-02 | Overview tab fetches and renders all 7 KPI cards + chart | Visual / manual | — | ❌ no test file |
| DASH-03 | Sources tab renders table with HOT/WARM/COLD badges | Visual / manual | — | ❌ no test file |
| DASH-04 | Campaigns tab renders table; empty campaign shows "Direct / Untagged" | Visual / manual | — | ❌ no test file |
| DASH-05 | Conversions tab shows business labels, formatDistanceToNow, 25-row cap | Visual / manual | — | ❌ no test file |
| DASH-07 | No utm_* terms in any visible string | Code review / manual | — | ❌ no test file |
| DASH-08 | Empty states render correctly for each tab | Visual / manual | — | ❌ no test file |
| FILTER-01 | Date preset buttons toggle correctly; custom picker sets dateFrom/dateTo | Visual / manual | — | ❌ no test file |
| FILTER-02 | Source filter updates query key and refetches | Visual / manual | — | ❌ no test file |
| FILTER-03 | Campaign filter updates query key and refetches | Visual / manual | — | ❌ no test file |
| FILTER-04 | Conversion type filter client-filters the returned array | Visual / manual | — | ❌ no test file |

### Sampling Rate

- **Per task:** `npm run check` (TypeScript type check)
- **Per wave merge:** `npm run check` + visual review of all 4 tabs in the browser
- **Phase gate:** `npm run check` green + visual review of all 4 tabs with empty/loaded/error states

### Wave 0 Gaps

No test framework is installed. Per the no-test-framework reality of this codebase, all DASH/FILTER requirements are verified manually. The TypeScript compiler (`npm run check`) serves as the automated quality gate for type safety.

---

## Sources

### Primary (HIGH confidence)

- Direct file reads of project source code — types.ts, routes.ts, Admin.tsx, LeadsSection.tsx, AdminPageHeader.tsx, storage.ts, marketing.ts, marketing-types.ts, queryClient.ts, schema.ts, chart.tsx, package.json
- 06-CONTEXT.md — locked decisions from user discussion
- 06-UI-SPEC.md — approved visual contract

### Secondary (MEDIUM confidence)

- date-fns v3 API: confirmed by existing usage in `IntegrationsSection.tsx` (`import { format, formatDistanceToNowStrict } from 'date-fns'`) — HIGH confidence
- Recharts v2 AreaChart API: confirmed by `package.json` version 2.15.2 and `chart.tsx` import patterns — HIGH confidence

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; all shadcn components verified present in @/components/ui/
- Architecture patterns: HIGH — verified against actual source files for Admin.tsx, LeadsSection.tsx, types.ts, routes.ts, storage.ts
- API contract: HIGH — read directly from server/routes/marketing.ts and server/storage.ts
- Pitfalls: HIGH — pitfalls 1–5 identified from reading actual codebase; pitfall 6 from package.json version check

**Research date:** 2026-04-25
**Valid until:** 2026-05-25 (stable codebase; 30-day window appropriate)
