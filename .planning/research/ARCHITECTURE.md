# Architecture Patterns: UTM Tracking and Marketing Attribution

**Domain:** Marketing attribution for a React/Express/Postgres service business app
**Researched:** 2026-04-25
**Confidence:** HIGH (based on direct codebase inspection + verified patterns)

---

## Recommended Architecture

The attribution system is purely additive — it touches existing flows only at two injection points (form lead upsert, conversation creation) and otherwise owns its own tables, routes, and admin section. No existing lead/booking behavior changes.

```
Browser (every page load)
  └─ useAttribution hook
       ├─ reads URL ?utm_* params
       ├─ reads document.referrer → classifies source
       ├─ generates/reads visitorId from localStorage
       └─ POST /api/attribution/session  (fire-and-forget, never blocks UI)

Server
  └─ /api/attribution/session
       ├─ upserts visitor_sessions row (first-touch preserved, last-touch updated)
       └─ returns { sessionId, visitorId }

Conversion events (injected into existing flows)
  ├─ form submit → POST /api/attribution/conversion { type: 'lead_form', leadId }
  ├─ phone CTA click → POST /api/attribution/conversion { type: 'phone_click' }
  └─ chat lead captured → POST /api/attribution/conversion { type: 'chat_lead', leadId }

Admin: GET /api/admin/marketing/overview|campaigns|sources|conversions|journey
  └─ MarketingSection.tsx  (new admin component, follows existing section pattern)
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `useAttribution` hook (client) | Capture UTM params + referrer on mount, generate/persist visitorId, fire session ping | `/api/attribution/session` |
| `visitorId` (localStorage) | Anonymous cross-session identity before login | Read by hook on every page load |
| `visitor_sessions` table | One row per visitorId+page visit; first-touch fields immutable after insert | Written by session endpoint |
| `attribution_conversions` table | One row per conversion event; FK to visitor_sessions and optionally form_leads | Written by conversion endpoint |
| `server/routes/attribution.ts` | Session upsert, conversion record, admin dashboard queries | `storage.ts` attribution methods |
| `MarketingSection.tsx` | Admin UI: overview/campaigns/sources/conversions/journey views with filters | `/api/admin/marketing/*` |

---

## New Database Tables

All tables belong in `shared/schema.ts` following the Drizzle convention. Use `npm run db:push` to apply.

### `visitor_sessions`

```typescript
export const visitorSessions = pgTable("visitor_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: text("visitor_id").notNull(),          // from localStorage, persists across visits
  sessionCreatedAt: timestamp("session_created_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),

  // Landing page for this visit
  landingPage: text("landing_page"),
  landingPageTitle: text("landing_page_title"),

  // First-touch UTM (set once, never overwritten — use INSERT ... ON CONFLICT DO NOTHING or check in upsert)
  ftSource: text("ft_source"),        // utm_source or classified source
  ftMedium: text("ft_medium"),        // utm_medium or classified medium
  ftCampaign: text("ft_campaign"),    // utm_campaign
  ftTerm: text("ft_term"),            // utm_term
  ftContent: text("ft_content"),      // utm_content
  ftCampaignId: text("ft_campaign_id"), // utm_id

  // Last-touch UTM (updated on every new visit from same visitorId)
  ltSource: text("lt_source"),
  ltMedium: text("lt_medium"),
  ltCampaign: text("lt_campaign"),
  ltTerm: text("lt_term"),
  ltContent: text("lt_content"),
  ltCampaignId: text("lt_campaign_id"),

  // Referrer context
  referrer: text("referrer"),
  referrerDomain: text("referrer_domain"),

  // Device/browser
  userAgent: text("user_agent"),
  deviceType: text("device_type"),    // 'mobile' | 'tablet' | 'desktop'

  // Linked identity (set when visitor converts)
  leadId: integer("lead_id").references(() => formLeads.id, { onDelete: "set null" }),
}, (table) => ({
  visitorIdIdx: index("visitor_sessions_visitor_id_idx").on(table.visitorId),
  createdAtIdx: index("visitor_sessions_created_at_idx").on(table.sessionCreatedAt),
  ftSourceIdx: index("visitor_sessions_ft_source_idx").on(table.ftSource),
  ltSourceIdx: index("visitor_sessions_lt_source_idx").on(table.ltSource),
  leadIdIdx: index("visitor_sessions_lead_id_idx").on(table.leadId),
}));
```

**First-touch preservation strategy:** The upsert logic operates on `visitorId` as the key.

- If no row exists for this `visitorId`: insert with ft* = current UTM/source AND lt* = current UTM/source.
- If a row exists: update lt* fields and `lastSeenAt`, but leave ft* untouched.
- `landingPage` records the URL of the current visit (updated on each visit, so it represents the current entry point).

This means `ftSource`/`ftMedium`/`ftCampaign` always reflect the original acquisition channel.

### `attribution_conversions`

```typescript
export const attributionConversions = pgTable("attribution_conversions", {
  id: serial("id").primaryKey(),
  visitorId: text("visitor_id").notNull(),
  sessionId: uuid("session_id").references(() => visitorSessions.id, { onDelete: "set null" }),
  leadId: integer("lead_id").references(() => formLeads.id, { onDelete: "set null" }),

  conversionType: text("conversion_type").notNull(),
  // Values: 'lead_form' | 'phone_click' | 'chat_lead' | 'booking' | 'quote_request'

  // Attribution snapshot at time of conversion (denormalized for query performance)
  ftSource: text("ft_source"),
  ftMedium: text("ft_medium"),
  ftCampaign: text("ft_campaign"),
  ltSource: text("lt_source"),
  ltMedium: text("lt_medium"),
  ltCampaign: text("lt_campaign"),

  landingPage: text("landing_page"),
  deviceType: text("device_type"),

  convertedAt: timestamp("converted_at").defaultNow().notNull(),
  metadata: jsonb("metadata"),
}, (table) => ({
  visitorIdIdx: index("attr_conv_visitor_id_idx").on(table.visitorId),
  leadIdIdx: index("attr_conv_lead_id_idx").on(table.leadId),
  conversionTypeIdx: index("attr_conv_type_idx").on(table.conversionType),
  convertedAtIdx: index("attr_conv_converted_at_idx").on(table.convertedAt),
  ftSourceIdx: index("attr_conv_ft_source_idx").on(table.ftSource),
  ltSourceIdx: index("attr_conv_lt_source_idx").on(table.ltSource),
}));
```

**Why denormalize attribution into conversions:** Dashboard queries are reads, and joining `attribution_conversions` to `visitor_sessions` on every filter combination is expensive. Snapshotting ft*/lt* fields at conversion time makes aggregation queries fast and protects against retroactive session updates.

---

## Modified Existing Tables

### `form_leads` — add `visitorId` column

```typescript
// Add to formLeads table definition:
visitorId: text("visitor_id"),  // links to visitor_sessions.visitorId
```

This enables the lead detail view to show the visitor's attribution journey. The existing `sessionId` (uuid) is the form session, different from `visitorId` (attribution identity). Both coexist.

**Migration:** `ALTER TABLE form_leads ADD COLUMN IF NOT EXISTS visitor_id text;`  
Add index: `CREATE INDEX IF NOT EXISTS form_leads_visitor_id_idx ON form_leads (visitor_id);`

---

## Data Flow

### Flow 1 — Visitor arrives, UTM captured

```
1. Browser loads any page
2. useAttribution() runs on mount
3. Reads localStorage for existing visitorId; generates uuid if absent; writes back
4. Reads window.location.search for utm_* params
5. Reads document.referrer, classifies if no UTM params (see Classification below)
6. Calls POST /api/attribution/session with { visitorId, utms, source, medium, referrer, landingPage, userAgent }
7. Server upserts visitor_sessions (first-touch preserved, last-touch updated)
8. Fire-and-forget: hook does not await, never blocks render
```

### Flow 2 — Visitor submits lead form (existing lead flow, minimally modified)

```
1. Form progress POST /api/form-leads/progress (unchanged)
2. Server upserts form_leads row (unchanged)
3. ADDED: server reads req.body.visitorId (passed by client)
4. ADDED: server calls storage.linkLeadToVisitor(leadId, visitorId)
   - updates form_leads.visitor_id = visitorId
   - updates visitor_sessions.lead_id = leadId (sets conversion link)
5. ADDED: server calls storage.createAttributionConversion({ type: 'lead_form', leadId, visitorId })
   - reads visitor_sessions to snapshot current ft*/lt* fields
   - inserts attribution_conversions row
```

The `visitorId` is passed by the client in the form progress payload. Update `formLeadProgressSchema` in `shared/schema.ts` to add `visitorId: z.string().optional()`.

### Flow 3 — Phone click conversion

```
1. Client: PhoneLink onClick → POST /api/attribution/conversion { type: 'phone_click', visitorId }
2. Server: inserts attribution_conversions row (no leadId, pure interaction event)
```

### Flow 4 — Chat lead captured (existing chat flow, minimally modified)

```
1. Chat lead complete → existing GHL/Resend/Twilio fire
2. ADDED: same pattern as Flow 2 — pass visitorId from chat widget
3. Server calls storage.createAttributionConversion({ type: 'chat_lead', leadId, visitorId })
```

### Flow 5 — Admin views dashboard

```
GET /api/admin/marketing/overview?from=&to=&source=&medium=&campaign=
  → storage.getMarketingOverview(filters)
  → SQL: aggregate from attribution_conversions grouped by ft_source/lt_source
  → Returns: { sessions, uniqueVisitors, conversions, conversionRate, topSources }
```

---

## Traffic Source Auto-Classification

When no UTM params are present, classify from `document.referrer`. This runs client-side before the session ping:

```typescript
const SOCIAL_DOMAINS = ['facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com', 'youtube.com', 'pinterest.com'];
const SEARCH_DOMAINS = ['google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com', 'baidu.com', 'yandex.com'];

function classifySource(referrer: string): { source: string; medium: string } {
  if (!referrer) return { source: '(direct)', medium: '(none)' };
  try {
    const domain = new URL(referrer).hostname.replace('www.', '');
    if (SEARCH_DOMAINS.some(d => domain.endsWith(d))) return { source: domain, medium: 'organic' };
    if (SOCIAL_DOMAINS.some(d => domain.endsWith(d))) return { source: domain, medium: 'social' };
    return { source: domain, medium: 'referral' };
  } catch {
    return { source: '(direct)', medium: '(none)' };
  }
}
```

UTM params always take precedence over referrer classification. Referrer classification only applies when `utm_source` is absent.

---

## New API Routes

All added to `server/routes/attribution.ts`, registered in `server/routes.ts` as `registerAttributionRoutes(app, requireAdmin)`.

### Public endpoints (no auth required)

```
POST /api/attribution/session
  Body: { visitorId, landingPage, utmSource?, utmMedium?, utmCampaign?, utmTerm?, utmContent?, utmId?, source, medium, referrer?, referrerDomain?, userAgent?, deviceType? }
  Response: { ok: true }
  Rate limit: apply existing rateLimit pattern (server/routes/rateLimit.ts)

POST /api/attribution/conversion
  Body: { visitorId, conversionType, leadId? }
  Response: { ok: true }
```

Both are fire-and-forget from the client perspective (best-effort). Errors are logged but never surfaced to the user.

### Admin endpoints (requireAdmin)

```
GET /api/admin/marketing/overview
  Query: { from?, to?, source?, medium?, campaign?, landingPage?, conversionType?, deviceType? }
  Response: MarketingOverview

GET /api/admin/marketing/campaigns
  Query: (same filters)
  Response: CampaignRow[]

GET /api/admin/marketing/sources
  Query: (same filters)
  Response: SourceRow[]

GET /api/admin/marketing/conversions
  Query: (same filters + pagination: limit, offset)
  Response: ConversionRow[]

GET /api/admin/marketing/journey/:visitorId
  Response: VisitorJourney (sessions + conversions for one visitor)
```

Add these to `shared/routes.ts` following the existing `api` object pattern for type safety.

---

## New Client Components

### `useAttribution` hook — `client/src/hooks/useAttribution.ts`

Runs on mount in the root `App.tsx` component (or a layout wrapper). Single instance, not per-page. Persists `visitorId` to localStorage under key `mvp_vid`. Sends session ping with a 1s debounce on navigation changes (Wouter's `useLocation`).

```typescript
// Minimal interface
export function useAttribution(): void  // runs side-effects only, no return value needed
```

Dependencies: none beyond Wouter's `useLocation` and the standard `fetch`.

### `MarketingSection.tsx` — `client/src/components/admin/MarketingSection.tsx`

Follows the same structure as `LeadsSection.tsx` and `NotificationsSection.tsx`:

```typescript
export function MarketingSection(): JSX.Element
```

Internal tab structure using the existing `INTEGRATIONS_ADMIN_TABS` pattern:

| Tab | Content |
|-----|---------|
| Overview | KPI cards (sessions, visitors, conversions, rate), top sources bar chart, conversion trend line |
| Campaigns | Table: campaign name, sessions, conversions, rate — sorted by conversions desc |
| Sources | Table: source + medium, sessions, conversions, rate |
| Conversions | Paginated table: visitor, source, type, converted_at, lead link |
| Journey | Visitor lookup by visitorId or lead, timeline of sessions + conversions |

All filter state (date range, source, medium, campaign, conversion type, device) is lifted to the section level and passed to sub-views. Date pickers use shadcn `Calendar` + `Popover` (already in the codebase).

Charts: use `recharts` — it is the standard embedded in many React admin kits and does not require a CDN. Verify it is already in `package.json`; if not, it is a single `npm install recharts` with no build-time config change.

---

## Admin Navigation Integration

Add `'marketing'` to the `AdminSection` union type in `client/src/components/admin/shared/types.ts`:

```typescript
export type AdminSection =
  | 'dashboard'
  | 'leads'
  | /* ... existing ... */
  | 'marketing';   // NEW
```

Add to `ADMIN_ROUTES` in `client/src/components/admin/shared/routes.ts`:

```typescript
{ id: 'marketing', slug: 'marketing', title: 'Marketing', icon: BarChart2 }
```

The sidebar drag-to-reorder already handles new entries because it reads from `sectionsOrder` stored in `company_settings`. For existing deployments, `sectionsOrder` may not include `'marketing'`; the Admin page should fall back to appending unknown-but-valid section IDs when resolving order.

---

## Storage Interface Extensions

Add to `IStorage` in `server/storage.ts`:

```typescript
// Attribution
upsertVisitorSession(data: InsertVisitorSession): Promise<void>;
getVisitorSession(visitorId: string): Promise<VisitorSession | undefined>;
createAttributionConversion(data: InsertAttributionConversion): Promise<void>;
linkLeadToVisitor(leadId: number, visitorId: string): Promise<void>;
getMarketingOverview(filters: AttributionFilters): Promise<MarketingOverview>;
getMarketingCampaigns(filters: AttributionFilters): Promise<CampaignRow[]>;
getMarketingSources(filters: AttributionFilters): Promise<SourceRow[]>;
getMarketingConversions(filters: AttributionFilters & { limit?: number; offset?: number }): Promise<ConversionRow[]>;
getVisitorJourney(visitorId: string): Promise<VisitorJourney>;
```

Define `AttributionFilters` in `shared/schema.ts` or a new `shared/attribution.ts`:

```typescript
export interface AttributionFilters {
  from?: Date;
  to?: Date;
  source?: string;
  medium?: string;
  campaign?: string;
  landingPage?: string;
  conversionType?: string;
  deviceType?: string;
}
```

---

## RLS on New Tables

Both `visitor_sessions` and `attribution_conversions` are written by unauthenticated public visitors and read by the admin. The pattern for public-write / admin-read on Supabase RLS:

```sql
-- visitor_sessions
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public insert visitor sessions"
  ON visitor_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admin read visitor sessions"
  ON visitor_sessions FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin update visitor sessions"
  ON visitor_sessions FOR UPDATE
  TO authenticated
  USING (auth.role() = 'authenticated');

-- attribution_conversions  (same pattern)
ALTER TABLE attribution_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public insert conversions"
  ON attribution_conversions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admin read conversions"
  ON attribution_conversions FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');
```

The server-side routes use the `DATABASE_URL` (service-role connection via `server/db.ts`), so RLS policies for the anon role primarily protect against direct Supabase client calls. The Express layer already enforces `requireAdmin` on all `/api/admin/*` routes.

---

## Vercel Fluid Compute Constraints and Mitigations

| Constraint | Impact | Mitigation |
|------------|--------|-----------|
| No long-running processes | Cannot use background worker to batch-flush session pings | Accept real-time inserts per request; Postgres handles the write volume at this scale |
| No WebSockets | Cannot push live visitor count to dashboard | Dashboard polls on tab focus; no live feed needed per PROJECT.md |
| Cold starts | First request per function instance adds ~200-400ms | Attribution session ping is fire-and-forget; user never waits |
| Stateless | Cannot cache session state in memory between requests | All state in Postgres; `visitorId` in localStorage is the only client-side state |
| Connection pool limits | Many short-lived connections under traffic spikes | Supabase uses PgBouncer in transaction mode; existing `server/db.ts` pool config applies |

No architectural changes to the deployment model are needed. Attribution writes are small, async from the user's perspective, and tolerate occasional failures (missed session pings do not break the product).

---

## Patterns to Follow

### Pattern 1: Fire-and-Forget POST from Hook

Do not block the UI on attribution pings. The `useAttribution` hook uses `fetch(...).catch(() => {})` — a silent no-op on failure. This is consistent with how `analyticsEventHits` are recorded today.

### Pattern 2: Upsert with Conflict Key

Session upsert uses `visitorId` as the conflict target. Insert when no row exists, update lt* fields on conflict. This is the same pattern used by `upsertFormLeadProgress` in `storage.ts`.

```sql
INSERT INTO visitor_sessions (...) VALUES (...)
ON CONFLICT (visitor_id) 
DO UPDATE SET
  lt_source = EXCLUDED.lt_source,
  lt_medium = EXCLUDED.lt_medium,
  lt_campaign = EXCLUDED.lt_campaign,
  last_seen_at = now()
```

Note: `visitor_id` needs a UNIQUE index (not just a regular index) for `ON CONFLICT` to work. Add `uniqueIndex("visitor_sessions_visitor_id_key").on(table.visitorId)` in the Drizzle table definition.

### Pattern 3: Attribution Snapshot on Conversion

When recording a conversion, read the current `visitor_sessions` row and copy ft*/lt* fields into `attribution_conversions`. This prevents retroactive changes to session attribution from altering historical conversion records.

### Pattern 4: Additive Lead Flow Injection

In `server/routes/leads.ts`, after the existing upsert succeeds, add a non-blocking async block (same pattern as the existing Twilio/Resend/GHL fire-and-forget blocks) to link the visitor and record the conversion. If `visitorId` is absent from the payload, skip silently.

```typescript
// After: let lead = await storage.upsertFormLeadProgress(...)
if (parsed.visitorId) {
  (async () => {
    try {
      await storage.linkLeadToVisitor(lead.id, parsed.visitorId!);
      await storage.createAttributionConversion({
        visitorId: parsed.visitorId!,
        conversionType: 'lead_form',
        leadId: lead.id,
      });
    } catch (err) {
      console.error('Attribution link error (non-blocking):', err);
    }
  })();
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Blocking the Lead Form on Attribution Writes

Attribution is observational. A failed session ping or conversion write must never cause a 4xx/5xx on the lead form endpoint. All attribution writes inside lead flow are wrapped in try/catch with console.error only.

### Anti-Pattern 2: Using Browser Cookies for visitorId

Cookies can be blocked by Safari ITP and browser extensions. localStorage is simpler, persists until explicitly cleared, and does not require consent banners in most jurisdictions when used for first-party analytics (non-tracking). Use `localStorage.getItem('mvp_vid')` with a uuid fallback.

### Anti-Pattern 3: Joining visitor_sessions in Every Dashboard Query

Dashboard aggregate queries should only use `attribution_conversions`, which has denormalized source fields. Reserve `visitor_sessions` joins for the journey view (single-visitor lookup). Aggregate queries that join both tables will be slow at scale.

### Anti-Pattern 4: Storing visitorId in formLeads.sessionId

`formLeads.sessionId` is the uuid generated per form session, used for resume-on-refresh. It is not the visitor identity. Add a separate `visitor_id` column to `form_leads` rather than overloading `session_id`.

### Anti-Pattern 5: Attempting Real-Time Dashboard

PROJECT.md explicitly rules out WebSocket real-time tracking. The dashboard is a business intelligence view, not a live ops tool. Poll on tab focus with a 60s stale time in React Query.

---

## Scalability Considerations

| Concern | At current scale (100s/month) | At 10K visitors/month | At 100K visitors/month |
|---------|-------------------------------|----------------------|------------------------|
| `visitor_sessions` writes | Negligible | ~333 writes/day, fine | ~3K/day, add write batching |
| `attribution_conversions` writes | Negligible | Fine | Fine (only on conversion events) |
| Dashboard aggregate queries | Sub-100ms on full table scan | Add `created_at` partitioning | Materialized views |
| `visitorId` localStorage | Stable | Stable | Stable |

For this project's current scale, no partitioning or materialized views are needed. The indexes defined above are sufficient. Adding a `created_at` range filter on all dashboard queries ensures Postgres uses the `created_at` index even as the table grows.

---

## Recommended Build Order

Dependencies flow top to bottom. Each phase can be code-reviewed independently.

### Phase 1 — Schema and Storage (no UI, no behavior change)

1. Add `visitorSessions` and `attributionConversions` to `shared/schema.ts` with Zod insert schemas and TypeScript types
2. Add `visitor_id` column to `formLeads` table definition in `shared/schema.ts`
3. Run `npm run db:push`
4. Apply RLS policies in Supabase SQL editor
5. Add `IStorage` attribution method signatures
6. Implement `DatabaseStorage` attribution methods in `server/storage.ts`

No client code changes. No route changes. Nothing can break.

### Phase 2 — Server Routes (attribution endpoints, no admin UI yet)

1. Create `server/routes/attribution.ts` with session upsert and conversion record endpoints
2. Register in `server/routes.ts`: `registerAttributionRoutes(app, requireAdmin)`
3. Add public attribution routes to `shared/routes.ts`
4. Add `visitorId?: string` to `formLeadProgressSchema` (backward-compatible: optional field)
5. Add non-blocking attribution injection block in `server/routes/leads.ts`

At this point, attribution data starts accumulating even before any UI exists.

### Phase 3 — Client UTM Capture (useAttribution hook)

1. Create `client/src/hooks/useAttribution.ts`
2. Mount in root App component (one call site, no per-page changes)
3. Pass `visitorId` in form progress payload (update form submission code to read from localStorage and include in POST body)

At this point, the pipeline is live end-to-end.

### Phase 4 — Admin Dashboard UI

1. Add `'marketing'` to `AdminSection` type and `ADMIN_ROUTES`
2. Create `MarketingSection.tsx` with tab structure
3. Implement admin API queries in `shared/routes.ts`
4. Build tab components: Overview, Campaigns, Sources, Conversions, Journey
5. Install `recharts` if not already present

### Phase 5 — Lead detail integration

1. In `LeadsSection.tsx` lead detail drawer, add attribution panel showing ft/lt source for the selected lead (query `/api/admin/marketing/journey/:visitorId` using `lead.visitorId`)

---

## Existing Files Modified (Summary)

| File | Change |
|------|--------|
| `shared/schema.ts` | Add `visitorSessions`, `attributionConversions` tables; add `visitor_id` to `formLeads`; add insert schemas and types |
| `shared/routes.ts` | Add attribution public endpoints + admin marketing endpoints |
| `server/storage.ts` | Add `IStorage` attribution methods + `DatabaseStorage` implementations |
| `server/routes.ts` | Import and register `registerAttributionRoutes` |
| `server/routes/leads.ts` | Add `visitorId` field read + non-blocking attribution injection block |
| `client/src/components/admin/shared/types.ts` | Add `'marketing'` to `AdminSection` union |
| `client/src/components/admin/shared/routes.ts` | Add `marketing` entry to `ADMIN_ROUTES` |

## New Files Created (Summary)

| File | Purpose |
|------|---------|
| `server/routes/attribution.ts` | Session upsert + conversion record endpoints + admin dashboard query endpoints |
| `client/src/hooks/useAttribution.ts` | UTM capture, visitorId management, session ping |
| `client/src/components/admin/MarketingSection.tsx` | Full marketing attribution admin UI |

---

## Sources

- PostHog: [First and Last Touch Attribution](https://posthog.com/tutorials/first-last-touch-attribution) — MEDIUM confidence (verified pattern)
- UTM Tracking Best Practices 2025: [checkoutlinks.com](https://checkoutlinks.com/blog/utm-tracking-best-practices) — MEDIUM confidence
- Supabase RLS Docs: [supabase.com/docs](https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers) — HIGH confidence (official docs)
- Vercel + Supabase integration: [vercel.com/marketplace/supabase](https://vercel.com/marketplace/supabase) — HIGH confidence (official)
- Codebase inspection of `shared/schema.ts`, `server/routes/leads.ts`, `server/storage.ts`, `client/src/components/admin/shared/` — HIGH confidence (direct source)
