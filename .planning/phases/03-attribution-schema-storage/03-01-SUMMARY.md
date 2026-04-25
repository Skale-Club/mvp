---
phase: 03-attribution-schema-storage
plan: "01"
subsystem: schema
tags: [schema, drizzle, attribution, visitor-sessions, postgres, rls]
dependency_graph:
  requires: []
  provides:
    - visitorSessions table definition (shared/schema.ts)
    - attributionConversions table definition (shared/schema.ts)
    - formLeads 10 attribution columns
    - VisitorSession, InsertVisitorSession type exports
    - AttributionConversion, InsertAttributionConversion type exports
    - insertVisitorSessionSchema, insertAttributionConversionSchema Zod schemas
  affects:
    - server/storage.ts (Plan 02 imports these types)
    - server/routes (Phase 4 wires API against these tables)
tech_stack:
  added: []
  patterns:
    - Drizzle pgTable with serial PK + uuid natural key + uniqueIndex (visitor_sessions)
    - integer FK to serial PK with ON DELETE SET NULL (attribution_conversions, form_leads)
    - createInsertSchema().omit() pattern for Zod schemas
    - $type<union>() annotation for TypeScript-typed text columns without DB enum
key_files:
  created: []
  modified:
    - shared/schema.ts
decisions:
  - "FK column type for form_leads.visitorId and attributionConversions.visitorId: integer (not uuid) — references the serial PK visitorSessions.id, matches notificationLogs.leadId convention, avoids PostgreSQL type mismatch"
  - "conversionType uses text with $type<union>() annotation rather than pgEnum — drizzle-zod cannot infer $type<>() annotations; server-side enum validation deferred to Phase 4 route layer"
  - "db:push deferred to developer environment — DATABASE_URL not available in parallel agent context"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-25"
  tasks_completed: 3
  tasks_total: 4
  files_modified: 1
---

# Phase 3 Plan 01: Attribution Schema — Visitor Sessions + Conversions Tables Summary

**One-liner:** Drizzle schema additions for marketing attribution — `visitor_sessions` (23 cols, uuid UNIQUE), `attribution_conversions` (14 cols, denormalized ft/lt), and 10 nullable columns on `form_leads`, with Zod insert schemas and TypeScript type exports.

## What Was Built

### Tables Added

**`visitor_sessions`** — 23 columns:
- `id` (serial PK), `visitor_id` (uuid, NOT NULL, UNIQUE via `visitor_sessions_visitor_id_unique`)
- 9 first-touch columns: `ft_source`, `ft_medium`, `ft_campaign`, `ft_term`, `ft_content`, `ft_id`, `ft_landing_page`, `ft_referrer`, `ft_source_channel`
- 9 last-touch columns: `lt_source`, `lt_medium`, `lt_campaign`, `lt_term`, `lt_content`, `lt_id`, `lt_landing_page`, `lt_referrer`, `lt_source_channel`
- `device_type`, `converted` (bool, default false), `first_seen_at`, `last_seen_at`
- 5 indexes: unique visitor_id, ft_source_channel, converted, first_seen_at, last_seen_at

**`attribution_conversions`** — 14 columns:
- `id` (serial PK)
- `visitor_id` (integer FK → `visitor_sessions.id`, ON DELETE SET NULL)
- `lead_id` (integer FK → `form_leads.id`, ON DELETE SET NULL)
- `conversion_type` (text, NOT NULL, typed as `'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started'`)
- `ft_source`, `ft_medium`, `ft_campaign`, `ft_landing_page` (denormalized first-touch)
- `lt_source`, `lt_medium`, `lt_campaign`, `lt_landing_page` (denormalized last-touch)
- `page_path`, `converted_at` (timestamp, NOT NULL, defaultNow)
- 4 indexes: visitor_id, lead_id, conversion_type, converted_at

### form_leads Columns Added (10 new nullable columns)

| Column | Type | Purpose |
|--------|------|---------|
| `visitor_id` | integer FK → `visitor_sessions.id` | Links lead to visitor session |
| `utm_content` | text | Extended UTM tracking |
| `utm_term` | text | Extended UTM tracking |
| `source_channel` | text | Classified channel label at form time |
| `first_touch_source` | text | Attribution system first-touch source |
| `first_touch_medium` | text | Attribution system first-touch medium |
| `first_touch_campaign` | text | Attribution system first-touch campaign |
| `last_touch_source` | text | Attribution system last-touch source |
| `last_touch_medium` | text | Attribution system last-touch medium |
| `last_touch_campaign` | text | Attribution system last-touch campaign |

Plus non-unique index `form_leads_visitor_id_idx` on `visitor_id`.

### Zod Schemas and Type Exports

```typescript
// Schemas
insertVisitorSessionSchema  — omits id, firstSeenAt, lastSeenAt
insertAttributionConversionSchema  — omits id, convertedAt

// Type exports (available for import in server/storage.ts - Plan 02)
export type VisitorSession = typeof visitorSessions.$inferSelect;
export type InsertVisitorSession = typeof insertVisitorSessionSchema._input;
export type AttributionConversion = typeof attributionConversions.$inferSelect;
export type InsertAttributionConversion = typeof insertAttributionConversionSchema._input;
```

## Deviations from Plan

### Auto-fixed Issues

None.

### Documented Deviations (from CONTEXT.md Claude's Discretion)

**1. FK column type: integer not uuid (expected deviation)**
- **Applies to:** `form_leads.visitor_id` and `attribution_conversions.visitor_id`
- **Issue:** CONTEXT.md D-02 and D-07 originally specified `uuid` for these FK columns. PostgreSQL cannot create a FK from a `uuid` column to an `integer` (serial PK) column — type mismatch would crash `db:push`.
- **Fix:** Both FK columns are declared as `integer`, referencing `visitorSessions.id` (the serial PK). This matches the `notificationLogs.leadId` convention already in the schema.
- **Documented in:** CONTEXT.md Claude's Discretion section

**2. db:push not executed in agent context**
- **Issue:** `DATABASE_URL` is not available in the parallel agent worktree environment.
- **Impact:** The DDL has NOT been applied to the live Postgres database yet. The schema TypeScript is complete and type-checks successfully.
- **Required action:** Developer must run `npm run db:push` from their local environment (or CI) where `DATABASE_URL` is set before Task 4 RLS policies can be applied.

## Task 4 — AWAITING CHECKPOINT

Task 4 is `type="checkpoint:human-verify"` — requires manual Supabase steps:

1. Run `npm run db:push` from the developer environment (with DATABASE_URL set) to apply DDL.
2. Verify tables in Supabase Table Editor.
3. Apply RLS SQL block in Supabase SQL Editor (6 CREATE POLICY + 2 ALTER TABLE statements).
4. Confirm policies via `pg_policies` query.
5. (Optional) Run smoke-test upsert to confirm first-touch preservation.

See Task 4 `<how-to-verify>` in the PLAN.md for the exact SQL blocks.

## RLS Policies to Apply (post db:push)

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

Expected: 5 policies total (3 on visitor_sessions, 2 on attribution_conversions).

## FK Targets — Both Use Serial PK

Both FK columns that reference visitor_sessions use the serial integer PK (`visitorSessions.id`), not the uuid natural key (`visitorSessions.visitorId`):
- `form_leads.visitor_id` → `visitor_sessions.id` (integer)
- `attribution_conversions.visitor_id` → `visitor_sessions.id` (integer)

The ON CONFLICT upsert in Plan 02 targets the natural key `visitor_sessions.visitor_id` (uuid) via the UNIQUE index.

## Pointer for Plan 02

The following type exports are now available for import in `server/storage.ts`:
- `VisitorSession`, `InsertVisitorSession` — from `shared/schema.ts`
- `AttributionConversion`, `InsertAttributionConversion` — from `shared/schema.ts`
- `visitorSessions`, `attributionConversions` — Drizzle table references for queries

## Known Stubs

None — this plan is schema-only, no data sources or UI components.

## Self-Check: PASSED

- [x] `shared/schema.ts` contains `export const visitorSessions = pgTable("visitor_sessions"`
- [x] `shared/schema.ts` contains `export const attributionConversions = pgTable("attribution_conversions"`
- [x] `shared/schema.ts` contains `uniqueIndex("visitor_sessions_visitor_id_unique")`
- [x] `shared/schema.ts` contains `visitorId: integer("visitor_id").references(() => visitorSessions.id, { onDelete: "set null" })` in attributionConversions
- [x] `shared/schema.ts` contains all 10 formLeads attribution columns
- [x] `shared/schema.ts` contains all 4 type exports
- [x] `npm run check` exits 0
- [x] Commits fb64693, 97d0542, 3eb1291 verified in git log
- [ ] `npm run db:push` — PENDING (requires DATABASE_URL in developer environment)
- [ ] Task 4 RLS policies — PENDING checkpoint human-verify
