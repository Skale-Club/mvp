# Technology Stack

**Project:** MVP — v1.2 Marketing Attribution
**Researched:** 2026-04-25
**Scope:** Additions and changes needed for UTM session capture, attribution storage, conversion event tracking, and the Marketing Intelligence admin section.

---

## Executive Verdict

No new runtime dependencies are required. Everything needed for v1.2 is already installed:
Recharts (charts), date-fns (date math), react-day-picker (date range input), wouter `useSearch` (URL param reading), Drizzle ORM (schema + queries), Zod (validation), shadcn/ui (UI primitives). The work is schema design, server routes, and a new admin section component — not library procurement.

The one upgrade worth considering is Recharts 2.x → 3.x, but it is not required for v1.2 and carries breaking changes; defer.

---

## What Is Already Installed and Used for Each Feature

### UTM Parameter Capture (client-side)

**Library:** `wouter` ^3.3.5 — already installed
**How:** `useSearch()` hook returns the raw query string on the initial page load. Parse with the native `URLSearchParams` API. No external library needed.

```ts
// client/src/hooks/useUtmCapture.ts (new file, no new dependency)
import { useSearch } from 'wouter';

export function useUtmCapture() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  return {
    utmSource:   params.get('utm_source')   ?? undefined,
    utmMedium:   params.get('utm_medium')   ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
    utmTerm:     params.get('utm_term')     ?? undefined,
    utmContent:  params.get('utm_content')  ?? undefined,
    utmId:       params.get('utm_id')       ?? undefined,
  };
}
```

Store in `sessionStorage` on first-load so UTMs survive SPA navigation. Send to the server via `navigator.sendBeacon('/api/attribution/session', ...)` (same pattern as existing `reportEventHit` in `client/src/lib/analytics.ts`).

**Confidence:** HIGH — wouter `useSearch` is documented and the project already uses it for routing.

---

### Traffic Source Auto-Classification (server-side)

**Library:** None — pure logic, ~60 lines of TypeScript.
**How:** Classify using the HTTP `Referer` header on the session-creation request.

Classification priority order (matches GA4 logic):
1. UTM parameters present → use `utm_source` + `utm_medium` as-is
2. No UTMs, `Referer` matches known search engines (google, bing, duckduckgo, yahoo, baidu) → `organic / google` (etc.)
3. Referer matches known social domains (facebook.com, instagram.com, twitter.com/x.com, linkedin.com, tiktok.com, youtube.com, pinterest.com) → `social / <platform>`
4. Referer present, not search/social → `referral / <domain>`
5. No Referer, no UTMs → `direct / (none)`

Implement as `server/lib/classifyTrafficSource.ts`. No external dependency. This is the approach used by GA4, PostHog, Snowplow, and every serious analytics platform.

**Confidence:** HIGH — standard approach, well-documented in PostHog and Snowplow tutorials.

---

### Attribution Storage (new Drizzle tables)

**Library:** `drizzle-orm` ^0.39.3 + `drizzle-zod` ^0.7.0 — already installed
**Schema source of truth:** `shared/schema.ts` — as per existing project pattern.

Two new tables:

**`visitor_sessions`** — one row per anonymous visitor session.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| visitorId | text | anonymous ID persisted to `localStorage` (survives tab close, not browser reinstall) |
| sessionId | uuid | ephemeral session ID from `sessionStorage` |
| createdAt | timestamp | |
| landingPage | text | URL of first page in session |
| referrer | text | raw HTTP Referer |
| userAgent | text | |
| device | text | `desktop \| mobile \| tablet` (derived from UA) |
| trafficSource | text | `organic \| social \| referral \| direct \| paid \| unknown` |
| trafficMedium | text | `cpc \| email \| organic \| (none)` etc. |
| trafficSourceDetail | text | e.g. `google`, `facebook.com` |
| utmSource | text | raw utm_source |
| utmMedium | text | raw utm_medium |
| utmCampaign | text | raw utm_campaign |
| utmTerm | text | raw utm_term |
| utmContent | text | raw utm_content |
| utmId | text | raw utm_id |
| firstTouchAt | timestamp | set once, never updated |
| lastTouchAt | timestamp | updated on each new session for same visitorId |
| lastTouchSource | text | source from most recent session |
| lastTouchMedium | text | medium from most recent session |
| lastTouchCampaign | text | campaign from most recent session |
| convertedAt | timestamp | set when any conversion event logged |
| leadId | integer FK → form_leads.id | linked when visitor submits lead form |

**`conversion_events`** — one row per conversion action.

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| sessionId | uuid FK → visitor_sessions.id | |
| visitorId | text | denormalized for fast filtering |
| leadId | integer FK → form_leads.id | null if not a lead conversion |
| eventType | text | `lead_form \| phone_click \| chat_lead \| cta_click` |
| eventLabel | text | e.g. page path, button label |
| pagePath | text | |
| firstTouchSource | text | snapshot from visitor_sessions.trafficSource at first-touch |
| firstTouchCampaign | text | snapshot |
| lastTouchSource | text | snapshot from last-touch at time of conversion |
| lastTouchCampaign | text | snapshot |
| createdAt | timestamp | |

Both tables follow the existing pattern: define in `shared/schema.ts`, export `insertXSchema` via `drizzle-zod`, export types via `$inferSelect`. Add RLS policies in Supabase (SELECT/INSERT for anon role on `visitor_sessions`; INSERT for anon on `conversion_events`; all for authenticated admin role).

**Index recommendations:**
- `visitor_sessions`: composite on `(visitorId, createdAt)`, single on `trafficSource`, single on `utmCampaign`, single on `leadId`
- `conversion_events`: single on `sessionId`, single on `visitorId`, single on `leadId`, single on `createdAt`, single on `eventType`

**Confidence:** HIGH — mirrors existing `formLeads` + `notificationLogs` pattern already proven in this codebase.

---

### Visitor Identity (client-side)

**Library:** None — `localStorage` + `crypto.randomUUID()`.

Generate a `visitorId` UUID on first visit, persist in `localStorage` (survives tab close; not in `sessionStorage` which dies with the tab). Generate a `sessionId` UUID on each new session, persist in `sessionStorage`. Both are random identifiers — no fingerprinting, no PII, GDPR-safe.

This is identical to how Vercel Analytics and PostHog cookieless mode work.

**Confidence:** HIGH — confirmed pattern in Vercel Analytics docs and PostHog.

---

### Server-Side Attribution Routes

**Library:** `express` ^4.21.2 — already installed

New route module: `server/routes/attribution.ts` (follows existing `registerNotificationRoutes` pattern).

Public endpoints (no `requireAdmin`):
- `POST /api/attribution/session` — create or update `visitor_sessions` row
- `POST /api/attribution/conversion` — log a `conversion_events` row

Admin endpoints (behind `requireAdmin`):
- `GET /api/admin/attribution/overview` — aggregate stats (sessions, conversions, top sources)
- `GET /api/admin/attribution/campaigns` — group-by `utmCampaign`
- `GET /api/admin/attribution/sources` — group-by `trafficSource`
- `GET /api/admin/attribution/conversions` — paginated conversion events with attribution
- `GET /api/admin/attribution/journey/:visitorId` — visitor timeline

All admin query endpoints accept `from`, `to`, `source`, `medium`, `campaign`, `landingPage`, `conversionType`, `device` as query params (Zod-validated, same pattern as `api.notificationLogs.list.input` in `shared/routes.ts`).

**Aggregation queries:** Use Drizzle's `count()`, `sql`` template` for `DATE_TRUNC('day', created_at)` grouping. Queries are read-only on indexed columns, so execution time is well within Vercel's function timeout (60 seconds on Pro). Date-range queries with indexes complete in milliseconds for typical small-business session volumes (< 1 million rows).

**Confidence:** HIGH — pattern directly mirrors existing notification and lead routes in this codebase.

---

### Analytics Dashboard UI

**Library:** `recharts` ^2.15.2 — already installed

Recharts 2.x is sufficient for all required chart types:
- `AreaChart` / `LineChart` — session/conversion trend over time
- `BarChart` — top sources, campaigns ranked by conversions
- `PieChart` + `Cell` — traffic source share

**Do not upgrade to Recharts 3.x for v1.2.** Version 3.0 shipped June 2025 (latest 3.8.1 as of March 2026) and requires removing `activeIndex` prop, changing state management patterns, and rewriting any `Customized` wrappers. This is unnecessary migration cost with no functional benefit for these chart types.

**UI components:** `shadcn/ui` (Radix) + Tailwind — already installed. Use existing `Card`, `Tabs`, `Select`, `Badge`, `Table` components. The admin section follows the `client/src/components/admin/NotificationSection.tsx` pattern (new file, registered in `AdminSection` type in `client/src/components/admin/shared/types.ts`).

**Confidence:** HIGH — Recharts 2.x fully covers all needed chart types; confirmed by existing usage in the codebase.

---

### Date Range Filter (admin dashboard)

**Library:** `react-day-picker` ^8.10.1 + `date-fns` ^3.6.0 — both already installed

`react-day-picker` v8 with `mode="range"` provides a calendar date range picker. `date-fns` handles date arithmetic (subtract 30 days, format for API queries, etc.). Both are already in `package.json`.

The admin dashboard needs preset ranges (Last 7 days, Last 30 days, Last 90 days, Custom) — implement as a dropdown + calendar popover using the existing `Popover` + `Select` shadcn components.

**Confidence:** HIGH — both libraries are installed and `react-day-picker` is already used in the booking flow.

---

## Alternatives Explicitly Rejected

| Category | Rejected Option | Why Rejected |
|----------|----------------|--------------|
| Analytics library | Mixpanel, Amplitude, PostHog SDK | Overkill — external SaaS, adds cost, sends data to third parties. The entire goal is an embedded admin view. |
| Charts | Chart.js, Victory, Nivo | Not in the stack; Recharts already installed and sufficient. |
| Charts | Recharts 3.x upgrade | Breaking changes, no v1.2 benefit. Defer to a future milestone. |
| Session ID | express-session or cookie-based visitor ID | Admin session (express-session) is for auth only; visitor ID uses localStorage to be stateless and serverless-safe. |
| Date parsing | dayjs, luxon | date-fns already installed; switching has no benefit. |
| Attribution | First-party cookie storage for UTMs | sessionStorage is sufficient for SPA sessions; cookies add complexity and may require GDPR consent banner depending on jurisdiction. |
| Traffic classification | Third-party referrer-classification lib (e.g. `detect-browser`) | A simple 60-line function covers 95% of cases without adding a dependency. |
| Real-time tracking | WebSockets, SSE | Explicitly out of scope per PROJECT.md; not compatible with Vercel Fluid Compute's stateless model. |
| Attribution model | Multi-touch (linear, time-decay) | Out of scope per PROJECT.md — only first-touch and last-touch for v1.2. |

---

## New Files to Create (no new npm installs)

```
shared/
  schema.ts                    — add visitor_sessions, conversion_events tables + schemas

server/
  routes/attribution.ts        — public session/conversion endpoints + admin query endpoints

client/src/
  hooks/useUtmCapture.ts       — UTM + visitorId/sessionId capture hook
  hooks/useAttributionTracker.ts — fires session beacon on mount, conversion beacons on events
  components/admin/
    MarketingSection.tsx        — top-level Marketing admin section (tabs: Overview, Campaigns, Sources, Conversions, Journey)
    marketing/
      OverviewTab.tsx
      CampaignsTab.tsx
      SourcesTab.tsx
      ConversionsTab.tsx
      JourneyTab.tsx
      DateRangePicker.tsx       — reusable preset + calendar range picker
      AttributionFilters.tsx    — source/medium/campaign/device filter bar
```

---

## Installation

No new packages needed. All dependencies are present.

```bash
# Nothing to install. Run after schema changes:
npm run db:push
```

---

## Sources

- Wouter `useSearch` / `useSearchParams` hooks: https://deepwiki.com/molefrog/wouter/3.4-usesearch-and-usesearchparams-hooks
- Recharts 3.0 migration guide (breaking changes): https://github.com/recharts/recharts/wiki/3.0-migration-guide
- Recharts 3.0.0 release (June 2025): https://newreleases.io/project/npm/recharts/release/3.0.0
- First/last touch attribution SQL patterns: https://snowplow.io/blog/first-and-last-touch-attribution-models-in-sql-a-comprehensive-tutorial
- Traffic source classification (PostHog tutorial): https://posthog.com/tutorials/first-last-touch-attribution
- Drizzle ORM aggregation / groupBy: https://orm.drizzle.team/docs/select
- Vercel Fluid Compute timeout limits: https://vercel.com/docs/functions/configuring-functions/duration
- UTM parameter best practices 2026: https://www.trackingplan.com/blog/utm-parameter-best-practices
- Privacy-safe visitor identification (Vercel Analytics approach): https://vercel.com/docs/analytics/privacy-policy
