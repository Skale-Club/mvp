# Phase 6: Marketing Admin Dashboard - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a fully functional "Marketing" section to the admin panel with four data tabs (Overview, Sources, Campaigns, Conversions), a persistent global filter bar, business-first language throughout, and coach-mark empty states. All data comes from the Phase 4 admin marketing API endpoints (`/api/admin/marketing/*`). No new server code.

Done when a non-technical business owner can navigate to the Marketing section and answer: "Which source sends me the most leads?" and "Which campaign is working best?" without any dev assistance.

</domain>

<decisions>
## Implementation Decisions

### Admin Section Registration

- **D-01:** Add `'marketing'` to the `AdminSection` type union in `client/src/components/admin/shared/types.ts`.
- **D-02:** Add marketing entry to `ADMIN_ROUTES` in `client/src/components/admin/shared/routes.ts`:
  ```ts
  { id: 'marketing', slug: 'marketing', title: 'Marketing', icon: TrendingUp }
  ```
  Import `TrendingUp` from `lucide-react`. Place it after `'leads'` in the route list (leads → marketing is a logical admin flow).
- **D-03:** In `Admin.tsx`, render `<MarketingSection />` for the `'marketing'` section case — follow the exact same pattern as `NotificationsSection` and `LeadsSection`.
- **D-04:** Create `client/src/components/admin/MarketingSection.tsx` — the main section component. It owns the filter state and passes filtered data down to tab components via props.

### Filter Bar

- **D-05:** Always-visible horizontal filter bar rendered inside `MarketingSection.tsx` between the section header and the tab strip — NOT collapsible. Follows the existing `LeadsSection` filter row pattern.
- **D-06:** Filter state lives in `MarketingSection.tsx` via `useState`. Shape:
  ```ts
  type DatePreset = 'today' | '7d' | '30d' | 'month' | 'custom';
  interface MarketingFilters {
    datePreset: DatePreset;
    dateFrom?: string; // ISO date string, only when datePreset === 'custom'
    dateTo?: string;
    source?: string;
    campaign?: string;
    conversionType?: string;
  }
  ```
  Default: `{ datePreset: '30d' }` (matches server's 30-day default).
- **D-07:** Date preset UI: a row of shadcn `<Button variant="outline">` buttons (Today / Last 7 days / Last 30 days / This month / Custom). Active preset gets `variant="default"`. Custom opens a `react-day-picker` calendar popover (already installed — used elsewhere in the admin).
- **D-08:** Source and campaign filters: shadcn `<Select>` dropdowns populated from the API response data (unique sources/campaigns seen in the current period). Default: "All sources" / "All campaigns".
- **D-09:** Conversion type filter: `<Select>` with options: All / Lead Created / Phone Call / Form Submitted / Booking Started (business labels, not raw conversionType values).
- **D-10:** Filters immediately trigger React Query refetch via `queryKey` that includes the filter state. No "Apply" button — changes are instant.

### Tab Structure

- **D-11:** Use shadcn `<Tabs>` component. Four tabs in order: Overview → Sources → Campaigns → Conversions. Default tab: Overview.
- **D-12:** Each tab's content is a separate component: `MarketingOverviewTab.tsx`, `MarketingSourcesTab.tsx`, `MarketingCampaignsTab.tsx`, `MarketingConversionsTab.tsx`. All live in a subfolder `client/src/components/admin/marketing/`.
- **D-13:** All four tabs use `useQuery` from TanStack React Query with the filter object in the `queryKey`. They pass the filter state received as props from `MarketingSection.tsx` into the `queryKey`.

### Overview Tab (DASH-02)

- **D-14:** Layout: two rows of KPI cards (shadcn `<Card>`) + AreaChart below.
  - Row 1: Total Visits | Total Leads | Conversion Rate (%)
  - Row 2: Top Source | Top Campaign | Top Landing Page
- **D-15:** Chart: Recharts `<AreaChart>` with two series — "Visits" (blue, matches brand primary `#1C53A3`) and "Conversions" (yellow `#FFFF01` or brand accent). Use `ResponsiveContainer` for full-width. X-axis: date labels. Y-axis: counts.
- **D-16:** API: `GET /api/admin/marketing/overview` with filter params. React Query key: `['/api/admin/marketing/overview', filters]`.
- **D-17:** KPI card label: "Total Visits" not "Sessions". "Leads Generated" not "Conversions". "Conversion Rate" with "%" suffix. "Top Traffic Source" not "Top Source". "Best Campaign" not "Top Campaign". "Best Landing Page" not "Top Landing Page".

### Sources Tab (DASH-03)

- **D-18:** Table with columns: Source | Visits | Leads | HOT | WARM | COLD | Conv. Rate.
- **D-19:** "Source" column displays business-friendly channel label (same classification as `ftSourceChannel`): Organic Search / Paid Ads / Social Media / Referral / Direct / Unknown. No raw utm_source values unless no channel is set.
- **D-20:** HOT/WARM/COLD lead counts shown as colored badges: HOT = green (`bg-green-100 text-green-800`), WARM = amber (`bg-amber-100 text-amber-800`), COLD = gray (`bg-gray-100 text-gray-700`).
- **D-21:** Conv. Rate displayed as formatted percentage string (e.g., `"12.5%"`). Server returns a number; format client-side with `toFixed(1) + '%'`.
- **D-22:** Sorted server-side by conversion rate descending (per Phase 4 implementation). No client-side re-sorting needed in Phase 6.

### Campaigns Tab (DASH-04)

- **D-23:** Table with columns: Campaign | Source | Channel | Visits | Leads | Conv. Rate | Top Landing Page.
- **D-24:** Empty campaign name (no utm_campaign set) → display "Direct / Untagged" in italics.
- **D-25:** Same sort and formatting rules as Sources tab.

### Conversions Tab (DASH-05)

- **D-26:** Table (not a chart) listing recent conversion events. Columns: When | Type | Source | Campaign | Landing Page.
- **D-27:** "Type" column uses business labels: `lead_created` → "Lead Created", `phone_click` → "Phone Call", `form_submitted` → "Form Submitted", `booking_started` → "Booking Started".
- **D-28:** "When" column: relative time (e.g., "2 hours ago") using `date-fns` `formatDistanceToNow`. Already installed.
- **D-29:** Show 25 most recent conversions. No pagination in Phase 6 (defer to Phase 7 or v1.3).

### Empty States (DASH-08)

- **D-30:** Each tab renders an empty state when the API returns zero rows. Empty state: a centered `<Card>` with icon + heading + explanation + example action.
  - Overview (no visits): "No traffic data yet" + "Add UTM parameters to your ad links to start tracking visitors."
  - Sources (no data): "No traffic sources tracked yet" + same coach tip.
  - Campaigns (no campaigns): "No campaign data yet" + "Tag your ads with utm_campaign=your-campaign-name to track them here."
  - Conversions (no events): "No conversions tracked yet" + "When visitors submit the form, click your phone number, or start booking, they'll appear here."
- **D-31:** Use a `TrendingUp` or `BarChart2` icon in the empty state (consistent with section icon).

### Business Language (DASH-07)

- **D-32:** Vocabulary mapping enforced throughout (zero utm_* terms in visible UI):
  - "Traffic Source" not "utm_source"
  - "Campaign Name" not "utm_campaign"
  - "Channel" not "utm_medium"
  - "Visits" not "Sessions"
  - "Leads Generated" not "Conversions" (use "Conversions" only in the tab name)
  - "Conversion Rate" = leads ÷ visits × 100
  - "How they found you" as subtitle in empty states
  - "Best performing" instead of "highest" where space allows

### Claude's Discretion

- Loading skeleton design for tabs while data fetches (use shadcn Skeleton or simple spinner)
- Exact responsive breakpoints for KPI card grid (2-col on mobile, 3-col on desktop)
- Whether to show a "Last updated" timestamp on the Overview tab
- Exact padding/spacing values — follow existing admin section conventions

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Section Pattern (replicate this)
- `client/src/components/admin/LeadsSection.tsx` — closest analog (tabbed, data-heavy, filters). Read to understand the pattern before writing MarketingSection.
- `client/src/components/admin/NotificationsSection.tsx` — another multi-tab section. Read for tab pattern.

### Admin Type Registration (extend these)
- `client/src/components/admin/shared/types.ts` — add `'marketing'` to `AdminSection` union (D-01)
- `client/src/components/admin/shared/routes.ts` — add marketing to `ADMIN_ROUTES` (D-02)
- `client/src/pages/Admin.tsx` — render MarketingSection for `'marketing'` case (D-03)

### shadcn Components Already Available
- `@/components/ui/tabs` — Tabs, TabsList, TabsTrigger, TabsContent
- `@/components/ui/card` — Card, CardContent, CardHeader, CardTitle
- `@/components/ui/select` — Select, SelectTrigger, SelectContent, SelectItem
- `@/components/ui/button` — Button (for date preset buttons)
- `@/components/ui/skeleton` — for loading states

### Chart Library
- `recharts` — AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend — already installed. Read existing usage in the codebase if any before implementing.

### Date Utility
- `date-fns` `formatDistanceToNow` — already installed; for "2 hours ago" formatting in Conversions tab.

### API Endpoints (from Phase 4)
- `GET /api/admin/marketing/overview` → `MarketingOverview` type
- `GET /api/admin/marketing/sources` → `MarketingBySource[]` type
- `GET /api/admin/marketing/campaigns` → `MarketingByCampaign[]` type
- `GET /api/admin/marketing/conversions` → conversion events array
- All accept query params: `dateFrom`, `dateTo`, `source`, `campaign`, `conversionType`
- Return type interfaces: `shared/marketing-types.ts`

### Brand Colors (for chart)
- Primary Blue: `#1C53A3` (visits series)
- Brand Yellow: `#FFFF01` (conversions series — may need to use a darker variant like `#FFD700` for visibility on white)
- Or use CSS variables: `var(--primary)` and a brand accent

### Requirements
- `.planning/REQUIREMENTS.md` §DASH-01 through DASH-05, DASH-07, DASH-08, FILTER-01 through FILTER-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Shadcn Tabs, Card, Select, Button, Skeleton — all available in `@/components/ui/`
- `useQuery` from `@tanstack/react-query` — established pattern for all admin data fetching
- `apiRequest` utility in `@/lib/queryClient.ts` — used for all API calls in admin
- `date-fns` `formatDistanceToNow` — already installed, used elsewhere
- Recharts — installed (confirmed in Phase 4 stack research)

### Established Patterns
- Admin sections filter state: `useState` in the section component, filter object in `queryKey`
- Data tables in admin: plain HTML table with Tailwind or a `<table>` inside a `<Card>` with overflow-x-auto
- Icons from lucide-react (all other sections already import from there)
- Admin page header: `<AdminPageHeader title="..." description="..." />` component exists

### Integration Points
- `types.ts` → add `'marketing'` to `AdminSection`
- `routes.ts` → add marketing route with `TrendingUp` icon
- `Admin.tsx` → add rendering case for `'marketing'`
- Phase 4 marketing API endpoints → consumed by React Query in tab components

</code_context>

<specifics>
## Specific Ideas

- The filter bar date presets should visually highlight the active preset (variant="default" on active Button, variant="outline" on inactive)
- For the conversion rate on the Overview KPI card, show the % prominently and below it show the raw ratio (e.g., "12.5%" with "25 leads / 200 visits" as subtitle)
- The Conversions tab "Type" column could use a small colored dot or pill badge to visually distinguish event types (Lead Created = green, Phone Call = blue, Form Submitted = purple, Booking Started = orange)

</specifics>

<deferred>
## Deferred Ideas

- Visitor journey tab (Phase 7) — not in Phase 6 scope
- Row click drill-down to see specific leads from a source/campaign — defer to v1.3
- Export to CSV — deferred per requirements out-of-scope list
- Sorting by column click (client-side or server-side) — defer to v1.3
- "Compare to previous period" % change on KPI cards — defer to v1.3
- Sparkline mini-charts in the Sources/Campaigns rows — defer to v1.3
- Device type filter (FILTER-04 partial — include conversion type filter but skip device type for now since Phase 4 doesn't return device breakdown)

</deferred>

---

*Phase: 06-marketing-admin-dashboard*
*Context gathered: 2026-04-25*
