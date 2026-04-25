---
phase: "04"
plan: "01"
subsystem: schema-storage
tags: [attribution, schema, storage, visitor-sessions]
dependency_graph:
  requires: [03-02]
  provides: [04-02, 04-03]
  affects: [shared/schema.ts, server/storage.ts]
tech_stack:
  added: []
  patterns: [drizzle-zod auto-derivation, nullable text column, Promise<number|null> return pattern]
key_files:
  created: []
  modified:
    - shared/schema.ts
    - server/storage.ts
decisions:
  - "visitorId on analyticsEventHits is nullable text (no .notNull()) — client supplies mvp_vid UUID as text, stored as-is"
  - "formLeadProgressSchema.visitorId is optional so existing callers (tests, legacy clients) keep working without changes"
  - "linkLeadToVisitor returns number|null so the lead-flow IIFE (Plan 03) can pass the resolved integer directly to createAttributionConversion without a second DB round-trip"
metrics:
  duration: "~15 min"
  completed: "2026-04-25T20:54:51Z"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 2
---

# Phase 04 Plan 01: Schema + Storage Signature Prerequisites — Summary

**One-liner:** Added `visitorId` nullable column to `analyticsEventHits` and optional UUID field to `formLeadProgressSchema`; updated `linkLeadToVisitor` to return `Promise<number | null>` — all TypeScript clean.

## Tasks Executed

### Task 1 — Extend shared/schema.ts (COMPLETED, commit `27658d3`)

Two surgical edits to `shared/schema.ts`:

**1. New column on `analyticsEventHits` table:**
```diff
  sessionId: text("session_id"),
+ visitorId: text("visitor_id"),
  createdAt: timestamp("created_at").defaultNow(),
```
Column is nullable (no `.notNull()`). `InsertAnalyticsEventHit` type auto-extended by drizzle-zod with `visitorId?: string | null`.

**2. New optional field on `formLeadProgressSchema`:**
```diff
  customAnswers: z.record(z.string()).optional(),
+ visitorId: z.string().uuid().optional(),
});
```
Field is optional — existing callers that omit it continue to parse without errors.

Verification: `npm run check` exits 0. Diff shows exactly 2 added lines.

### Task 2 — Update IStorage + DatabaseStorage linkLeadToVisitor (COMPLETED, commit `1342c96`)

**IStorage interface** (line 511):
```diff
- linkLeadToVisitor(leadId: number, visitorId: string): Promise<void>;
+ linkLeadToVisitor(leadId: number, visitorId: string): Promise<number | null>;
```

**DatabaseStorage implementation** (lines ~1665–1685): Updated signature, JSDoc, and body:
- `if (!session) return null;` — early return when no visitor session matches the UUID
- `return session.id;` — returns the integer PK on success
- Update recorded: existing callers (none at this point) would see a type change; future callers in Plan 02 use the returned integer directly.

Verification: `npm run check` exits 0. Two matches for `Promise<number | null>` (interface + impl), zero matches for old `Promise<void>` on linkLeadToVisitor lines.

### Task 3 — Apply db:push (DEFERRED — auth gate)

`npm run db:push` requires `DATABASE_URL`, `SUPABASE_DATABASE_URL`, or `POSTGRES_URL` to be set in the shell environment. These credentials are not available in the current CI/agent shell — no `.env` file exists in the repository root or worktree.

**Action required:** The user must run `npm run db:push` manually (or set the environment variable and re-run) to apply the `analytics_event_hits.visitor_id` column to Postgres.

Command: `npm run db:push`
Expected output: Drizzle Kit applies `ALTER TABLE analytics_event_hits ADD COLUMN visitor_id text;` (or equivalent additive change)

**Note for Plan 02/03:** The column is defined in schema.ts and TypeScript compiles. Plans 02 and 03 can proceed for all code-level work. The column must exist in Postgres before the attribution endpoints go live in production.

## Verification Results

```
grep "visitorId: z.string().uuid().optional()" shared/schema.ts
  → line 423: match found (formLeadProgressSchema)

grep 'visitorId: text("visitor_id")' shared/schema.ts
  → line 53: match found (analyticsEventHits table)

grep "linkLeadToVisitor.*Promise<number | null>" server/storage.ts
  → line 511: IStorage interface
  → line 1675: DatabaseStorage implementation

grep "linkLeadToVisitor.*Promise<void>" server/storage.ts
  → 0 matches (old signature gone)

npm run check → exits 0
```

## Deviations from Plan

### Auth Gate (Task 3 — db:push blocked)

- **Found during:** Task 3 execution
- **Issue:** No database environment variables available in agent shell. `npm run db:push` exits 1 with "SUPABASE_DATABASE_URL, DATABASE_URL, or POSTGRES_URL is missing".
- **Fix:** Task 3 documented as an auth gate. User must run `npm run db:push` manually before attribution endpoints can write to `analytics_event_hits.visitor_id`.
- **Impact:** Minimal — Tasks 1 and 2 are complete. Plans 02 and 03 can proceed code-authoring. Column must be applied before deployment.

None — Tasks 1 and 2 executed exactly as written with no deviations.

## Note for Plan 03

`linkLeadToVisitor` now returns `number | null`. The lead-flow attribution IIFE in Plan 03 can do:
```typescript
const sessionId = await storage.linkLeadToVisitor(lead.id, parsed.visitorId);
if (sessionId) {
  await storage.createAttributionConversion({
    visitorId: sessionId,  // integer PK — no second DB round-trip needed
    leadId: lead.id,
    conversionType: 'lead_created',
    // ...
  });
}
```

## Known Stubs

None. This plan adds no UI components or data-rendering paths. The schema column and storage signature are purely infrastructure prep with no user-visible output.

## Self-Check

- [x] `shared/schema.ts` modified with 2 added lines — verified via grep
- [x] `server/storage.ts` modified (interface + implementation) — verified via grep
- [x] `npm run check` passes — verified (exit 0)
- [x] Commits exist: `27658d3` (schema), `1342c96` (storage)
- [ ] `npm run db:push` — blocked (auth gate, requires DATABASE_URL in shell)
