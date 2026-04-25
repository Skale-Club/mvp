# Phase 3: Attribution Schema + Storage - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the attribution data model in the database: two new tables (`visitor_sessions`, `attribution_conversions`), new nullable columns on `form_leads`, IStorage interface methods and implementations, and RLS policies applied manually after `db:push`.

This phase is purely schema + storage — no API endpoints, no client code, no UI. Done when attribution data *can* flow but hasn't been wired up yet.

</domain>

<decisions>
## Implementation Decisions

### form_leads Extension

- **D-01:** Add attribution columns to `form_leads` inline as nullable columns via `db:push`. Do NOT create a separate lookup table. Follows the existing pattern (the `ghlContactId`/`ghlSyncStatus` columns were added the same way).
- **D-02:** New columns to add: `visitorId` (integer, nullable, FK to visitor_sessions.id serial PK), `utmContent` (text, nullable), `utmTerm` (text, nullable), `sourceChannel` (text, nullable), `firstTouchSource` (text, nullable), `firstTouchMedium` (text, nullable), `firstTouchCampaign` (text, nullable), `lastTouchSource` (text, nullable), `lastTouchMedium` (text, nullable), `lastTouchCampaign` (text, nullable).
- **D-03:** Add `visitorId` index on `form_leads` (non-unique, a visitor can have at most one lead but the column is nullable so UNIQUE is wrong).

### Existing UTM Fields on form_leads

- **D-04:** Keep existing `utmSource`, `utmMedium`, `utmCampaign` columns as-is — they represent "form-time UTMs" (whatever the URL had when the user submitted the form). The new `firstTouch*` / `lastTouch*` columns are the attribution system's view and may differ (e.g., first touch was organic, last touch was a paid campaign). No deduplication or renaming.
- **D-05:** The `formLeadProgressSchema` Zod schema already accepts `utmSource`/`utmMedium`/`utmCampaign` — do not modify this existing flow. Attribution enrichment is additive.

### Conversion Events Table

- **D-06:** Create a new `attribution_conversions` table — do NOT extend `analytics_event_hits`. Reason: `attribution_conversions` stores denormalized first-touch and last-touch attribution at the moment of conversion, optimized for `GROUP BY source/campaign` aggregation queries without joins. `analytics_event_hits` continues to receive all client-side events (including non-conversion ones) unchanged.
- **D-07:** `attribution_conversions` columns: `id` (serial PK), `visitorId` (integer, FK to visitor_sessions.id, ON DELETE SET NULL), `leadId` (integer, FK to form_leads ON DELETE SET NULL, nullable), `conversionType` (text — 'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started'), `ftSource` (text), `ftMedium` (text), `ftCampaign` (text), `ftLandingPage` (text), `ltSource` (text), `ltMedium` (text), `ltCampaign` (text), `ltLandingPage` (text), `pagePath` (text, nullable — page where conversion happened), `convertedAt` (timestamp, defaultNow, not null).
- **D-08:** FK pattern follows `notification_logs.leadId` — `ON DELETE SET NULL` so conversion records survive lead deletion.

### visitor_sessions Table

- **D-09:** Use `uuid` type for `visitor_id` column — consistent with `formLeads.sessionId` (uuid), since `crypto.randomUUID()` output is UUID-formatted. Apply `UNIQUE` constraint (required for upsert ON CONFLICT).
- **D-10:** Use `serial` primary key (`id`) — consistent with all other tables in the schema. `visitor_id` is a UNIQUE natural key, not the PK.
- **D-11:** Columns: `id` (serial PK), `visitorId` (uuid, unique, not null), `ftSource` (text), `ftMedium` (text), `ftCampaign` (text), `ftTerm` (text), `ftContent` (text), `ftId` (text), `ftLandingPage` (text), `ftReferrer` (text), `ftSourceChannel` (text — classified channel label), `ltSource` (text), `ltMedium` (text), `ltCampaign` (text), `ltTerm` (text), `ltContent` (text), `ltId` (text), `ltLandingPage` (text), `ltReferrer` (text), `ltSourceChannel` (text), `deviceType` (text), `converted` (boolean, default false), `firstSeenAt` (timestamp, defaultNow), `lastSeenAt` (timestamp, defaultNow).
- **D-12:** Indexes: `visitor_id` (unique), `ft_source_channel` (non-unique, for GROUP BY queries), `converted` (non-unique, for filtering sessions with/without conversions), `first_seen_at` (for date range filtering), `last_seen_at`.
- **D-13:** Upsert logic: `ON CONFLICT (visitor_id) DO UPDATE SET` — update ONLY `lt_*` columns, `device_type`, `last_seen_at`, and `converted`. NEVER include `ft_*` or `first_seen_at` in the update clause. This is the critical invariant for first-touch preservation.

### IStorage Methods

- **D-14:** Add to IStorage interface and DatabaseStorage implementation:
  - `upsertVisitorSession(session: InsertVisitorSession): Promise<VisitorSession>` — upserts by visitorId
  - `createAttributionConversion(conversion: InsertAttributionConversion): Promise<AttributionConversion>` — inserts conversion event
  - `linkLeadToVisitor(leadId: number, visitorId: string): Promise<void>` — stamps visitor attribution on form_leads
  - Marketing query methods (stubs for Phase 4 to implement): `getMarketingOverview()`, `getMarketingBySource()`, `getMarketingByCampaign()`, `getMarketingConversions()`, `getVisitorJourney(visitorId)`
- **D-15:** Marketing query method stubs return typed empty results in Phase 3 — full SQL aggregation queries are implemented in Phase 4.

### RLS Policies

- **D-16:** After `db:push`, apply RLS in Supabase manually:
  - `visitor_sessions`: Enable RLS, anon INSERT allowed, authenticated SELECT/UPDATE allowed
  - `attribution_conversions`: Enable RLS, anon INSERT allowed, authenticated SELECT allowed
  - `form_leads` new columns: No new policies needed — existing form_leads RLS covers the whole table
- **D-17:** Add a note in PLAN.md success criteria reminding the planner that RLS must be applied manually — Drizzle's `db:push` does not create Supabase RLS policies.

### Claude's Discretion

- Column varchar lengths vs text: Claude can use `text` for all UTM/source fields (consistent with existing schema)
- Drizzle `$type<>()` annotations for typed columns: Claude's discretion whether to use TypeScript union types for `conversionType` and `sourceChannel`
- Whether to create Zod insert schemas for new tables via `createInsertSchema`: Follow existing pattern (yes, create them)
- **FK column type for visitor_sessions references:** Both FK columns referencing visitor_sessions (in form_leads and attribution_conversions) use integer type targeting the serial PK visitorSessions.id — matching the notificationLogs.leadId convention. CONTEXT.md originally specified uuid for these columns, which would cause a PostgreSQL type mismatch. D-02 and D-07 above have been updated to reflect the correct integer type. The natural-key `visitor_sessions.visitor_id` (uuid) remains the upsert conflict target, but FKs from other tables reference the serial `id` PK, not the uuid natural key.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema Source of Truth
- `shared/schema.ts` — All Drizzle table definitions; new tables must follow the same import set and pattern. Pay attention to: serial PK pattern, index/uniqueIndex naming convention (`tablename_column_idx`), drizzle-zod `createInsertSchema` usage.

### Storage Interface Pattern
- `server/storage.ts` lines 385-491 (IStorage interface) — New methods must be added to this interface before implementing in DatabaseStorage. Follow the existing method signature style.

### Existing Form Lead Schema
- `shared/schema.ts` `formLeads` table (lines ~163-215) — The exact columns being extended. `sessionId` is uuid UNIQUE — do NOT confuse with the new `visitorId` FK.

### Existing Migration Pattern (Runtime Guard)
- `server/storage.ts` `ensureFormLeadGhlColumns()` function — Shows the runtime guard pattern used for optional column additions. Use `db:push` as the primary migration approach; add a runtime guard only if the columns may be missing in production at runtime.

### Notification Logs FK Pattern
- `shared/schema.ts` `notificationLogs` table (lines ~217-236) — Reference for FK with ON DELETE SET NULL and named indexes pattern.

### Requirements for This Phase
- `.planning/REQUIREMENTS.md` §SESSION-04, SESSION-05, ATTR-01, ATTR-02 — The four requirements this phase delivers.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `drizzle-orm/pg-core` imports already include `uuid`, `uniqueIndex`, `index`, `boolean`, `timestamp`, `text`, `serial`, `integer` — all types needed for new tables
- `createInsertSchema` from `drizzle-zod` — used for all existing tables, use for new tables too
- `eq`, `and`, `gte`, `lte`, `desc`, `sql` from `drizzle-orm` already imported in storage.ts — sufficient for marketing query implementations

### Established Patterns
- **PK**: `serial("id").primaryKey()` — every table uses this
- **Timestamps**: `createdAt: timestamp("created_at").defaultNow()` — standard pattern
- **FK with SET NULL**: `references(() => formLeads.id, { onDelete: "set null" })` — from notificationLogs
- **Index naming**: `tableName_columnName_idx` — enforced by the existing index declarations
- **Unique index**: `uniqueIndex("tableName_column_unique").on(table.column)` — used on formLeads.sessionId
- **Insert schema export**: `export const insertXSchema = createInsertSchema(x).omit({id: true, createdAt: true})`
- **Type exports**: `export type X = typeof x.$inferSelect; export type InsertX = typeof insertXSchema._input;`

### Integration Points
- `shared/schema.ts` — New tables defined here; imported by storage.ts and any route files
- `server/storage.ts` — IStorage interface + DatabaseStorage class; new methods added here
- `shared/schema.ts` `formLeadProgressSchema` — Do NOT modify this Zod schema in Phase 3 (Phase 4 adds visitorId to the progress endpoint's accepted fields)

</code_context>

<specifics>
## Specific Ideas

- Keep `converted: boolean` on `visitor_sessions` as a simple flag updated when a conversion event is created — avoids a join to check if a session ever converted
- The `ftSourceChannel` and `ltSourceChannel` columns store the human-readable classified channel (e.g., "Organic Search", "Paid Ads", "Social Media") computed at capture time — not a DB enum so new channels can be added without schema changes

</specifics>

<deferred>
## Deferred Ideas

- Runtime guard for the new form_leads columns (like `ensureFormLeadGhlColumns`) — only needed if db:push is not run before deploy; Claude can add defensively if desired, but not required
- Adding `utm_id` to `formLeads` existing form-time capture — possible extension, not in Phase 3 scope
- Data retention / TTL policy for visitor_sessions — deferred to a future milestone

None of the reviewed todos from prior phases are relevant to this phase's scope.

</deferred>

---

*Phase: 03-attribution-schema-storage*
*Context gathered: 2026-04-25*
