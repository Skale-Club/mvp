# Phase 3: Attribution Schema + Storage - Research

**Researched:** 2026-04-25
**Domain:** Drizzle ORM schema extension, PostgreSQL upsert semantics, IStorage interface patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Add attribution columns to `form_leads` inline as nullable columns via `db:push`. Do NOT create a separate lookup table.
- **D-02:** New columns to add: `visitorId` (uuid, nullable, FK to visitor_sessions), `utmContent` (text, nullable), `utmTerm` (text, nullable), `sourceChannel` (text, nullable), `firstTouchSource` (text, nullable), `firstTouchMedium` (text, nullable), `firstTouchCampaign` (text, nullable), `lastTouchSource` (text, nullable), `lastTouchMedium` (text, nullable), `lastTouchCampaign` (text, nullable).
- **D-03:** Add `visitorId` index on `form_leads` (non-unique — visitor is nullable and can match at most one lead, but UNIQUE is wrong because nulls).
- **D-04:** Keep existing `utmSource`, `utmMedium`, `utmCampaign` columns as-is — they represent form-time UTMs, not attribution-system values. No deduplication.
- **D-05:** Do NOT modify `formLeadProgressSchema` in Phase 3. Attribution enrichment is additive.
- **D-06:** Create a new `attribution_conversions` table — do NOT extend `analytics_event_hits`.
- **D-07:** `attribution_conversions` columns: `id` (serial PK), `visitorId` (uuid, FK to visitor_sessions ON DELETE SET NULL), `leadId` (integer, FK to form_leads ON DELETE SET NULL, nullable), `conversionType` (text — 'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started'), `ftSource`, `ftMedium`, `ftCampaign`, `ftLandingPage`, `ltSource`, `ltMedium`, `ltCampaign`, `ltLandingPage` (all text), `pagePath` (text, nullable), `convertedAt` (timestamp, defaultNow, not null).
- **D-08:** FK pattern: `ON DELETE SET NULL` — conversion records survive lead/session deletion.
- **D-09:** `visitor_sessions.visitorId` is uuid type with UNIQUE constraint (required for ON CONFLICT upsert).
- **D-10:** Use `serial` PK (`id`) — `visitor_id` is the UNIQUE natural key, not the PK.
- **D-11:** `visitor_sessions` columns: `id` (serial PK), `visitorId` (uuid, unique, not null), `ftSource`, `ftMedium`, `ftCampaign`, `ftTerm`, `ftContent`, `ftId`, `ftLandingPage`, `ftReferrer`, `ftSourceChannel` (all text, nullable), `ltSource`, `ltMedium`, `ltCampaign`, `ltTerm`, `ltContent`, `ltId`, `ltLandingPage`, `ltReferrer`, `ltSourceChannel` (all text, nullable), `deviceType` (text, nullable), `converted` (boolean, default false), `firstSeenAt` (timestamp, defaultNow), `lastSeenAt` (timestamp, defaultNow).
- **D-12:** Indexes on `visitor_sessions`: `visitorId` (unique), `ftSourceChannel` (non-unique), `converted` (non-unique), `firstSeenAt` (non-unique), `lastSeenAt` (non-unique).
- **D-13:** Upsert logic: `ON CONFLICT (visitor_id) DO UPDATE SET` — update ONLY `lt_*` columns, `device_type`, `last_seen_at`, and `converted`. NEVER touch `ft_*` or `first_seen_at`. This is the first-touch preservation invariant.
- **D-14:** IStorage methods: `upsertVisitorSession`, `createAttributionConversion`, `linkLeadToVisitor`, plus five marketing query stubs.
- **D-15:** Marketing query stubs return typed empty results in Phase 3 — full SQL in Phase 4.
- **D-16:** After `db:push`, apply RLS manually: `visitor_sessions` (anon INSERT, authenticated SELECT/UPDATE); `attribution_conversions` (anon INSERT, authenticated SELECT); `form_leads` new columns covered by existing RLS.
- **D-17:** PLAN.md success criteria must remind: RLS must be applied manually after `db:push`.

### Claude's Discretion

- Column varchar lengths vs text: use `text` for all UTM/source fields (consistent with existing schema).
- Drizzle `$type<>()` annotations: Claude's discretion for TypeScript union types on `conversionType` and `sourceChannel`.
- Whether to create Zod insert schemas for new tables: follow existing pattern (yes, create them).

### Deferred Ideas (OUT OF SCOPE)

- Runtime guard for new `form_leads` columns — only needed if `db:push` is not run before deploy; optional.
- Adding `utm_id` to `formLeads` form-time capture — not in Phase 3 scope.
- Data retention / TTL policy for `visitor_sessions` — deferred to a future milestone.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SESSION-04 | Visitor session records: landing page pathname, device type (mobile/tablet/desktop), first/last seen timestamps | `visitor_sessions` table columns `ftLandingPage`, `deviceType`, `firstSeenAt`, `lastSeenAt` implement this directly |
| SESSION-05 | Visitor session creation uses DB upsert — first-touch columns set once, never modified on subsequent visits | Drizzle `db.insert().onConflictDoUpdate()` with explicit column list in `set:{}` implements this; first-touch preservation is the core semantic of the upsert |
| ATTR-01 | First-touch attribution captured on visitor's first page load and preserved immutably | Implemented by writing `ft_*` columns on INSERT only, never including them in the `onConflictDoUpdate` set clause |
| ATTR-02 | Last-touch attribution updated on every subsequent visit | Implemented by writing `lt_*`, `device_type`, `last_seen_at`, `converted` in the `onConflictDoUpdate` set clause |
</phase_requirements>

---

## Summary

Phase 3 is a pure schema and storage layer change — no API routes, no client code. It delivers the three data structures (two new tables, one extended table) and the IStorage interface methods that subsequent phases wire into the actual attribution capture and reporting flows.

The existing codebase is highly consistent in its patterns. Every table in `shared/schema.ts` uses `serial("id").primaryKey()`, `drizzle-zod` `createInsertSchema`, and `$inferSelect`/`_input` type exports. All FK relationships with survivability requirements use `{ onDelete: "set null" }`. The new tables must follow these patterns exactly — there are no exceptions in the existing codebase.

The critical design invariant is the first-touch preservation upsert in `upsertVisitorSession`. Drizzle's `db.insert(visitorSessions).values(session).onConflictDoUpdate({ target: visitorSessions.visitorId, set: { ltSource: sql\`excluded.lt_source\`, ... } })` is the correct pattern. The `set` object must explicitly enumerate ONLY last-touch columns — Drizzle does not have a "DO UPDATE SET all except" syntax, so there is zero risk of accidentally overwriting first-touch data if the set clause is written correctly.

**Primary recommendation:** Write the two new table definitions in `shared/schema.ts` following the `notificationLogs` FK pattern exactly, extend `formLeads` with nullable columns, run `db:push`, add IStorage methods (real upserts + stubs), then apply RLS manually in Supabase dashboard.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.39.3 (installed) | Table definitions, query builder, upsert | Already in use; `onConflictDoUpdate` supports the upsert pattern |
| drizzle-zod | ^0.7.0 (installed) | Generate Zod insert schemas from table definitions | Already in use on every table |
| drizzle-kit | ^0.31.8 (installed) | `db:push` — introspects schema.ts, diffs against live DB, applies DDL | Already in use; `npm run db:push` is the migration command |
| zod | ^3.24.2 (installed) | Type-safe schema validation | Already in use |
| pg (node-postgres) | ^8.16.3 (installed) | PostgreSQL connection | Already in use via `pool` in `server/db.ts` |

### No new dependencies required

All libraries needed for Phase 3 are already installed. No `npm install` step is needed.

---

## Architecture Patterns

### Recommended File Touch List

```
shared/
└── schema.ts          # Add visitorSessions table, attributionConversions table,
                       # extend formLeads with 10 nullable columns,
                       # add Zod insert schemas and type exports

server/
└── storage.ts         # Add imports for new tables/types,
                       # add 8 new methods to IStorage interface,
                       # implement 3 real methods + 5 stubs in DatabaseStorage
```

No other files change in Phase 3.

### Pattern 1: New Table Definition (follows notificationLogs exactly)

The `notificationLogs` table is the canonical reference for FK-with-SET-NULL and named indexes:

```typescript
// Source: shared/schema.ts lines 217-236
export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => formLeads.id, { onDelete: "set null" }),
  // ...columns...
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (table) => ({
  leadIdx: index("notification_logs_lead_idx").on(table.leadId),
  sentAtIdx: index("notification_logs_sent_at_idx").on(table.sentAt),
  // ...
}));
```

Apply exactly the same structure to `visitorSessions` and `attributionConversions`.

### Pattern 2: UNIQUE constraint for upsert target

`formLeads` demonstrates the exact uniqueIndex syntax used as an ON CONFLICT target:

```typescript
// Source: shared/schema.ts line 213
sessionIdx: uniqueIndex("form_leads_session_idx").on(table.sessionId),
```

`visitorSessions` needs the same on `visitorId`:

```typescript
visitorIdIdx: uniqueIndex("visitor_sessions_visitor_id_unique").on(table.visitorId),
```

### Pattern 3: Drizzle upsert with explicit column set

This is the most critical pattern — only last-touch columns in the `set` clause:

```typescript
// Pattern for upsertVisitorSession — first-touch preservation
const result = await db
  .insert(visitorSessions)
  .values(session)
  .onConflictDoUpdate({
    target: visitorSessions.visitorId,
    set: {
      // ONLY update last-touch and metadata — never ft_* or firstSeenAt
      ltSource: sql`excluded.lt_source`,
      ltMedium: sql`excluded.lt_medium`,
      ltCampaign: sql`excluded.lt_campaign`,
      ltTerm: sql`excluded.lt_term`,
      ltContent: sql`excluded.lt_content`,
      ltId: sql`excluded.lt_id`,
      ltLandingPage: sql`excluded.lt_landing_page`,
      ltReferrer: sql`excluded.lt_referrer`,
      ltSourceChannel: sql`excluded.lt_source_channel`,
      deviceType: sql`excluded.device_type`,
      lastSeenAt: sql`excluded.last_seen_at`,
      converted: sql`excluded.converted`,
    },
  })
  .returning();
return result[0];
```

The `sql\`excluded.column_name\`` references the row that was proposed for insert — this is standard PostgreSQL `ON CONFLICT` syntax and Drizzle passes it through correctly.

### Pattern 4: IStorage interface method signature style

Follow the method signatures in the existing interface (lines 385-490 of `server/storage.ts`):

```typescript
// Real methods (Phase 3 implements)
upsertVisitorSession(session: InsertVisitorSession): Promise<VisitorSession>;
createAttributionConversion(conversion: InsertAttributionConversion): Promise<AttributionConversion>;
linkLeadToVisitor(leadId: number, visitorId: string): Promise<void>;

// Stubs (Phase 4 implements full SQL)
getMarketingOverview(filters?: MarketingFilters): Promise<MarketingOverview>;
getMarketingBySource(filters?: MarketingFilters): Promise<MarketingBySource[]>;
getMarketingByCampaign(filters?: MarketingFilters): Promise<MarketingByCampaign[]>;
getMarketingConversions(filters?: MarketingFilters): Promise<AttributionConversion[]>;
getVisitorJourney(visitorId: string): Promise<VisitorJourney | undefined>;
```

Stubs in `DatabaseStorage` return typed empty results:

```typescript
async getMarketingOverview(_filters?: MarketingFilters): Promise<MarketingOverview> {
  // Phase 4: implement aggregation queries
  return { totalVisits: 0, totalLeads: 0, conversionRate: 0, topSource: null, topCampaign: null, topLandingPage: null, timeSeries: [] };
}
```

### Pattern 5: Zod insert schema and type export

Every table follows this exact sequence after the table definition:

```typescript
// Source: shared/schema.ts lines 289-292
export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({
  id: true,
  sentAt: true,  // auto-generated timestamp fields are omitted
});
```

For the new tables:

```typescript
export const insertVisitorSessionSchema = createInsertSchema(visitorSessions).omit({
  id: true,
  firstSeenAt: true,
  lastSeenAt: true,
});
export type VisitorSession = typeof visitorSessions.$inferSelect;
export type InsertVisitorSession = typeof insertVisitorSessionSchema._input;

export const insertAttributionConversionSchema = createInsertSchema(attributionConversions).omit({
  id: true,
  convertedAt: true,
});
export type AttributionConversion = typeof attributionConversions.$inferSelect;
export type InsertAttributionConversion = typeof insertAttributionConversionSchema._input;
```

### Pattern 6: `linkLeadToVisitor` implementation

This is a targeted UPDATE on `formLeads`, not an upsert. It sets only the attribution fields on a specific lead row:

```typescript
async linkLeadToVisitor(leadId: number, visitorId: string): Promise<void> {
  // Phase 4 calls this after fetching the session's ft/lt data
  // For Phase 3, the method signature and a minimal implementation:
  await db
    .update(formLeads)
    .set({ visitorId })
    .where(eq(formLeads.id, leadId));
}
```

Phase 4 will extend this to also stamp the attribution columns (`firstTouchSource`, etc.) by joining with `visitor_sessions`.

### Anti-Patterns to Avoid

- **Spreading the full session object into `onConflictDoUpdate.set`:** Drizzle does not filter out `ft_*` columns automatically. Every field in `set` will be written on conflict. Only enumerate the `lt_*` columns and metadata.
- **Using `uuid` as the PK:** The codebase universally uses `serial` integer PKs. `uuid` is used as a UNIQUE natural key column, not the PK.
- **Adding UNIQUE constraint to `form_leads.visitor_id`:** The column is nullable — PostgreSQL UNIQUE constraints allow multiple NULLs (each NULL is distinct), so UNIQUE is not wrong per se, but the CONTEXT.md decision is non-unique index. Follow D-03.
- **Modifying `formLeadProgressSchema`:** This Zod schema drives the existing form progress endpoint. Do not touch it in Phase 3 (D-05).
- **Creating pg enums for `conversionType`:** The decision (D-07) uses `text` to avoid enum migration complexity. Do not use `pgEnum`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upsert with partial update | Manual SELECT + INSERT/UPDATE | `db.insert().onConflictDoUpdate()` | Drizzle's upsert is atomic; manual two-step is not safe under concurrent Vercel instances |
| Schema diffing and DDL | Raw `ALTER TABLE` SQL | `npm run db:push` | Drizzle Kit introspects schema.ts and generates correct DDL; manual SQL misses index creation |
| Insert schema validation | Hand-written Zod schema | `createInsertSchema(table).omit({...})` | drizzle-zod derives types from the table — single source of truth, no drift |
| TypeScript types for table rows | Manual interface | `typeof table.$inferSelect` | Drizzle infers exact column types including nullability from the table definition |

**Key insight:** The schema file is the single source of truth — Drizzle Kit derives DDL from it, drizzle-zod derives Zod schemas from it, and TypeScript infers types from it. Any hand-rolled duplication creates drift.

---

## Common Pitfalls

### Pitfall 1: `$type<>()` annotations lost by drizzle-zod

**What goes wrong:** When a column uses `.$type<SomeUnion>()` (e.g., for `conversionType`), drizzle-zod's `createInsertSchema` does not automatically produce a `z.enum()` for the typed column — it generates `z.string()`. The `$type<>()` annotation is TypeScript-only and invisible to Zod at runtime.

**Why it happens:** `$type<>()` only affects the TypeScript inferred type. Drizzle-zod uses the Drizzle column metadata, which does not include `$type` constraints.

**How to avoid:** If you want Zod validation on `conversionType` values, use `.extend({ conversionType: z.enum(['lead_created', 'phone_click', 'form_submitted', 'booking_started']) })` on the generated schema. This is Claude's discretion per CONTEXT.md.

**Warning signs:** Accepting an invalid `conversionType` string at insert time without a Zod error.

---

### Pitfall 2: `db:push` on Supabase does not create or modify RLS policies

**What goes wrong:** After `db:push` creates the new tables, the tables have no RLS — by default Supabase tables are created with RLS disabled. Any anon or authenticated request will hit the table unguarded (or blocked entirely depending on Supabase project settings).

**Why it happens:** Drizzle Kit does not know about Supabase's RLS system. `db:push` generates standard PostgreSQL DDL — `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`. RLS policy SQL (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`) is outside Drizzle's scope.

**How to avoid:** Apply RLS manually after `db:push` in the Supabase SQL editor. This is explicitly captured in D-16 and D-17 (success criteria reminder in PLAN.md).

**Warning signs:** Anon users receiving 403 or 200 with no data when attribution writes are attempted in Phase 5.

---

### Pitfall 3: Column name casing — TypeScript camelCase vs SQL snake_case

**What goes wrong:** Drizzle generates SQL column names from the string passed to the column constructor (e.g., `text("ft_source")`), but TypeScript accesses columns via the camelCase property name (`table.ftSource`). When writing raw `sql\`excluded.ft_source\`` in `onConflictDoUpdate`, you must use the snake_case SQL column name, not the TypeScript property name.

**Why it happens:** Drizzle uses a camelCase-to-snake_case mapper for JavaScript/TypeScript ergonomics, but excluded references in ON CONFLICT clauses use the raw SQL column name.

**How to avoid:** Always check the string passed to the column type constructor (e.g., `text("ft_source_channel")`) to get the correct SQL column name for `excluded.*` references.

**Warning signs:** PostgreSQL error `column "ftSourceChannel" does not exist` in the upsert — this means you used the TypeScript name instead of the SQL column name.

---

### Pitfall 4: `form_leads.visitorId` must be nullable and non-unique

**What goes wrong:** Declaring `visitorId` as `not null` would break all existing lead creation calls that don't supply a `visitorId` (which is all of them until Phase 4). Declaring it `uniqueIndex` would correctly allow multiple NULLs in PostgreSQL, but the CONTEXT.md decision (D-03) specifies a non-unique index.

**Why it happens:** Confusion between the `visitor_sessions.visitorId` (UNIQUE NOT NULL) and the `form_leads.visitorId` FK column (nullable, non-unique index).

**How to avoid:** In `formLeads`, declare as `visitorId: uuid("visitor_id").references(() => visitorSessions.id, { onDelete: "set null" })` — no `.notNull()`, no `uniqueIndex`. Use `index("form_leads_visitor_id_idx")`.

**Warning signs:** TypeScript type error at insert time when `visitorId` is undefined.

---

### Pitfall 5: Marketing query stub return types need explicit TypeScript interfaces

**What goes wrong:** If stub methods return `{}` or `any`, the IStorage interface type constraint is violated or the TypeScript compiler cannot catch mismatches in Phase 4 implementations.

**Why it happens:** Stubs are placeholders, but the IStorage interface is typed — the return type must be fully defined even before the implementation exists.

**How to avoid:** Define TypeScript interfaces (`MarketingOverview`, `MarketingBySource`, etc.) in `shared/schema.ts` or a new `shared/marketing-types.ts` file before writing the stubs. The stubs return a valid zero-state instance of those types.

---

## Code Examples

### Defining `visitorSessions` table

```typescript
// shared/schema.ts — follows notificationLogs pattern
export const visitorSessions = pgTable("visitor_sessions", {
  id: serial("id").primaryKey(),
  visitorId: uuid("visitor_id").notNull(),
  // First-touch (written once, never updated)
  ftSource: text("ft_source"),
  ftMedium: text("ft_medium"),
  ftCampaign: text("ft_campaign"),
  ftTerm: text("ft_term"),
  ftContent: text("ft_content"),
  ftId: text("ft_id"),
  ftLandingPage: text("ft_landing_page"),
  ftReferrer: text("ft_referrer"),
  ftSourceChannel: text("ft_source_channel"),
  // Last-touch (updated on every visit)
  ltSource: text("lt_source"),
  ltMedium: text("lt_medium"),
  ltCampaign: text("lt_campaign"),
  ltTerm: text("lt_term"),
  ltContent: text("lt_content"),
  ltId: text("lt_id"),
  ltLandingPage: text("lt_landing_page"),
  ltReferrer: text("lt_referrer"),
  ltSourceChannel: text("lt_source_channel"),
  // Metadata
  deviceType: text("device_type"),
  converted: boolean("converted").default(false),
  firstSeenAt: timestamp("first_seen_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
}, (table) => ({
  visitorIdIdx: uniqueIndex("visitor_sessions_visitor_id_unique").on(table.visitorId),
  ftSourceChannelIdx: index("visitor_sessions_ft_source_channel_idx").on(table.ftSourceChannel),
  convertedIdx: index("visitor_sessions_converted_idx").on(table.converted),
  firstSeenAtIdx: index("visitor_sessions_first_seen_at_idx").on(table.firstSeenAt),
  lastSeenAtIdx: index("visitor_sessions_last_seen_at_idx").on(table.lastSeenAt),
}));
```

### Defining `attributionConversions` table

```typescript
// shared/schema.ts
export const attributionConversions = pgTable("attribution_conversions", {
  id: serial("id").primaryKey(),
  visitorId: uuid("visitor_id").references(() => visitorSessions.visitorId, { onDelete: "set null" }),
  leadId: integer("lead_id").references(() => formLeads.id, { onDelete: "set null" }),
  conversionType: text("conversion_type").$type<'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started'>().notNull(),
  ftSource: text("ft_source"),
  ftMedium: text("ft_medium"),
  ftCampaign: text("ft_campaign"),
  ftLandingPage: text("ft_landing_page"),
  ltSource: text("lt_source"),
  ltMedium: text("lt_medium"),
  ltCampaign: text("lt_campaign"),
  ltLandingPage: text("lt_landing_page"),
  pagePath: text("page_path"),
  convertedAt: timestamp("converted_at").defaultNow().notNull(),
}, (table) => ({
  visitorIdIdx: index("attribution_conversions_visitor_id_idx").on(table.visitorId),
  leadIdIdx: index("attribution_conversions_lead_id_idx").on(table.leadId),
  conversionTypeIdx: index("attribution_conversions_conversion_type_idx").on(table.conversionType),
  convertedAtIdx: index("attribution_conversions_converted_at_idx").on(table.convertedAt),
}));
```

### Extending `formLeads` with attribution columns

```typescript
// shared/schema.ts — added to the formLeads pgTable column definition
// (after existing ghlSyncStatus, source, conversationId columns)
visitorId: uuid("visitor_id").references(() => visitorSessions.id, { onDelete: "set null" }),
utmContent: text("utm_content"),
utmTerm: text("utm_term"),
sourceChannel: text("source_channel"),
firstTouchSource: text("first_touch_source"),
firstTouchMedium: text("first_touch_medium"),
firstTouchCampaign: text("first_touch_campaign"),
lastTouchSource: text("last_touch_source"),
lastTouchMedium: text("last_touch_medium"),
lastTouchCampaign: text("last_touch_campaign"),
```

And in the `(table) => ({...})` index block:

```typescript
visitorIdIdx: index("form_leads_visitor_id_idx").on(table.visitorId),
```

### FK reference note: `visitorId` on `form_leads`

The FK on `form_leads.visitorId` should reference `visitorSessions.id` (the serial PK), not `visitorSessions.visitorId` (the uuid natural key). This follows PostgreSQL FK convention — reference the PK of the parent table. The CONTEXT.md specifies `FK to visitor_sessions`, meaning the PK. Double-check this in implementation: `references(() => visitorSessions.id, { onDelete: "set null" })`.

### IStorage stubs — return type interfaces

```typescript
// shared/schema.ts (or shared/marketing-types.ts)
export interface MarketingFilters {
  from?: Date;
  to?: Date;
  channel?: string;
  campaign?: string;
}

export interface MarketingOverview {
  totalVisits: number;
  totalLeads: number;
  conversionRate: number;
  topSource: string | null;
  topCampaign: string | null;
  topLandingPage: string | null;
  timeSeries: Array<{ date: string; visits: number; conversions: number }>;
}

export interface MarketingBySource {
  channel: string;
  visits: number;
  leads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  conversionRate: number;
}

export interface MarketingByCampaign {
  campaign: string;
  source: string;
  channel: string;
  visits: number;
  leads: number;
  conversionRate: number;
  topLandingPages: string[];
}

export interface VisitorJourney {
  session: VisitorSession;
  conversions: AttributionConversion[];
}
```

### RLS SQL to apply manually after `db:push`

```sql
-- visitor_sessions
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon can insert sessions" ON visitor_sessions
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "authenticated can select sessions" ON visitor_sessions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated can update sessions" ON visitor_sessions
  FOR UPDATE TO authenticated USING (true);

-- attribution_conversions
ALTER TABLE attribution_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon can insert conversions" ON attribution_conversions
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "authenticated can select conversions" ON attribution_conversions
  FOR SELECT TO authenticated USING (true);
```

---

## Environment Availability

Step 2.6: SKIPPED (no external tool dependencies — this phase adds schema definitions and storage methods to existing files; `npm run db:push` uses `drizzle-kit` which is already installed at ^0.31.8).

---

## Validation Architecture

No `config.json` found — treating `workflow.nyquist_validation` as enabled (absent = enabled).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no test config files (jest.config.*, vitest.config.*, pytest.ini) exist in the repo |
| Config file | None — Wave 0 must add if tests are required |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SESSION-04 | `visitor_sessions` table has `landing_page`, `device_type`, `first_seen_at`, `last_seen_at` columns after `db:push` | Manual smoke test (DB introspection) | Manual — `\d visitor_sessions` in psql | N/A |
| SESSION-05 | Upsert does not overwrite `ft_*` on second call with same `visitor_id` | Integration | N/A — no test infra | ❌ No test infra |
| ATTR-01 | First-touch columns immutable after initial insert | Integration | N/A — no test infra | ❌ No test infra |
| ATTR-02 | Last-touch columns update on second upsert | Integration | N/A — no test infra | ❌ No test infra |

### Sampling Rate

No automated test infra exists. Manual verification is the gate for this phase.

### Wave 0 Gaps

- No test framework is installed. Given the project's structure (no test directory, no test scripts in package.json), integration tests for the upsert semantic are not part of this project's pattern. The upsert correctness is verifiable manually after deployment by:
  1. Inserting a session via `db.insert()` with known `ft_source = 'google'`
  2. Upserting again with `ft_source = 'facebook'`
  3. Confirming the stored row still shows `ft_source = 'google'`

This is a deliberate manual verification step and should be listed in the plan's success criteria.

---

## Open Questions

1. **FK target for `form_leads.visitorId`: `visitorSessions.id` (serial) or `visitorSessions.visitorId` (uuid)?**
   - What we know: CONTEXT.md says "FK to visitor_sessions". PostgreSQL FKs conventionally target the PK (`id`). However, `visitorSessions.visitorId` has a UNIQUE constraint, which also allows FK references in PostgreSQL.
   - What's unclear: CONTEXT.md is ambiguous — "FK to visitor_sessions" could mean either column.
   - Recommendation: Reference `visitorSessions.id` (the serial PK) for consistency with `notification_logs.leadId` referencing `form_leads.id`. This is standard and avoids any ambiguity.

2. **Should marketing type interfaces live in `shared/schema.ts` or a new `shared/marketing-types.ts`?**
   - What we know: All current types in `shared/schema.ts` are table-derived. The marketing query return types are not table-derived (they're aggregation results).
   - Recommendation: Create `shared/marketing-types.ts` to keep `schema.ts` focused on table definitions. Import from it in `storage.ts`. This is Claude's discretion.

3. **`converted` flag on `visitor_sessions`: should the upsert set it to `true` or use `sql\`CASE WHEN excluded.converted THEN true ELSE visitor_sessions.converted END\``?**
   - What we know: The flag should be sticky — once true, it should not revert to false.
   - Recommendation: Use `sql\`GREATEST(visitor_sessions.converted::int, excluded.converted::int)::boolean\`` or the CASE expression to ensure monotonic behavior. The simple `sql\`excluded.converted\`` would revert a converted session to false if the next upsert passes `converted: false`.

---

## Sources

### Primary (HIGH confidence)

- `shared/schema.ts` (read directly) — All existing table definitions, index patterns, FK patterns, Zod schema patterns, type export patterns
- `server/storage.ts` (read directly) — IStorage interface (lines 385-490), DatabaseStorage implementation, runtime guard patterns
- `shared/analytics-events.ts` (read directly) — Confirms `analytics_event_hits` stores event names not conversion attribution; confirms Phase 3 is right NOT to extend it
- `package.json` (read directly) — drizzle-orm ^0.39.3, drizzle-zod ^0.7.0, drizzle-kit ^0.31.8 installed versions confirmed
- `drizzle.config.ts` (read directly) — Confirms `schema: "./shared/schema.ts"` and `dialect: "postgresql"` — `db:push` reads from this file
- `.planning/phases/03-attribution-schema-storage/03-CONTEXT.md` (read directly) — All locked decisions

### Secondary (MEDIUM confidence)

- Drizzle ORM `onConflictDoUpdate` pattern — verified against codebase usage; `sql\`excluded.*\`` syntax is standard PostgreSQL and well-established in Drizzle's implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries read from package.json and confirmed installed
- Architecture patterns: HIGH — derived directly from the existing codebase (no inference required)
- Pitfalls: HIGH — derived from direct code reading and Drizzle/PostgreSQL fundamentals
- IStorage stub return types: MEDIUM — the exact shape of marketing query return types is a design decision (Phase 4 will define final shapes); stubs should define reasonable initial types that Phase 4 can extend

**Research date:** 2026-04-25
**Valid until:** 2026-09-25 (stable stack — Drizzle ORM API is stable in 0.39.x)
