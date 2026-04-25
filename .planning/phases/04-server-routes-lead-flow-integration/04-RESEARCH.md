# Phase 4: Server Routes + Lead Flow Integration - Research

**Researched:** 2026-04-25
**Domain:** Express.js route wiring, Drizzle ORM aggregation SQL, fire-and-forget async patterns, Zod request validation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Lead Flow Injection (ATTR-03)**
- D-01: Add optional `visitorId` field (string, uuid-format) to `formLeadProgressSchema` in `shared/schema.ts`. Keep it optional so existing callers continue working.
- D-02: In `POST /api/form-leads/progress`, after `storage.upsertFormLeadProgress()` returns the lead, inject attribution in a fire-and-forget async IIFE — exactly the same pattern as the existing notification and GHL sync blocks. A failure MUST NOT cause the endpoint to return 4xx or 5xx.
- D-03: The injection block calls `storage.linkLeadToVisitor(lead.id, parsed.visitorId)` AND `storage.createAttributionConversion({ conversionType: 'lead_created', ... })` together in the same IIFE. Only fires when `parsed.visitorId` is present.
- D-04: Pass `visitorId` as string (UUID text) into `linkLeadToVisitor`. The storage method resolves the integer FK internally.

**Conversion Endpoint (CONV-01 through CONV-04)**
- D-05: Create a new `POST /api/attribution/conversion` endpoint — do NOT extend `/api/analytics/hit`.
- D-06: Request body: `{ visitorId: string (uuid), conversionType: 'lead_created' | 'phone_click' | 'form_submitted' | 'booking_started', pagePath?: string, leadId?: number }`. Validate with Zod. Return `200 {}` on success, `400` on validation failure — never `500` for missing visitor.
- D-07: The endpoint is public (no auth). Client fires via `navigator.sendBeacon` (or fetch with `keepalive: true`) for phone clicks and booking starts.
- D-08: `lead_created` fired server-side only; `phone_click`, `form_submitted`, `booking_started` fired client-side.

**Session Upsert Endpoint**
- D-09: Create `POST /api/attribution/session` — public, no auth. Accepts full visitor session payload. Calls `storage.upsertVisitorSession()`. Returns `200 {}` or silently discards on error.
- D-10: Both endpoints live in `server/routes/attribution.ts`, registered via `registerAttributionRoutes(app, storage)` from `server/routes.ts`.

**Marketing Admin Query Endpoints (DASH-01 through DASH-05 backends)**
- D-11: Route prefix `/api/admin/marketing/`. All authenticated (admin only) — same middleware as existing `/api/admin/*` routes.
- D-12: Five routes: GET overview, sources, campaigns, conversions, journey.
- D-13: All accept filter query params `dateFrom`, `dateTo`, `source`, `campaign`, `conversionType`. Server enforces **30-day default** window when `dateFrom`/`dateTo` absent. No unbounded queries.
- D-14: Implement real SQL for all 5 `DatabaseStorage` stub methods.

**CONV-05: Page Views in analytics_event_hits**
- D-15: Extend existing `/api/analytics/hit` to also accept and store optional `visitorId` field in `analytics_event_hits`.
- D-16 (deferred to planner): Whether to add `visitor_id` column to `analytics_event_hits` in this phase or correlate via `session_id` at query time.

### Claude's Discretion

- Zod schema for `POST /api/attribution/session` body: define in `shared/schema.ts` or inline in the route file — follow existing patterns
- Error response format for attribution endpoints: `{ error: string }` JSON, consistent with existing routes
- Whether to add `visitor_id` to `analytics_event_hits` table (D-16 deferred to planner)
- SQL implementation details for the 5 marketing aggregation methods

### Deferred Ideas (OUT OF SCOPE)

- Adding `visitor_id` column to `analytics_event_hits` table (D-16) — planner decides
- Rate limiting on `/api/attribution/session` and `/api/attribution/conversion`
- Batch conversion events (multiple events in one request) — deferred to v1.3
- Server-side page_view emission (instead of client-side) — out of scope for this phase
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ATTR-03 | When a lead is created, link visitor session to form_leads via sessionId and stamp first/last-touch on the lead | D-03 + fire-and-forget IIFE pattern in leads.ts; `linkLeadToVisitor` + `createAttributionConversion` storage methods are implemented |
| ATTR-04 | `form_leads` extended with utmContent, utmTerm, sourceChannel, firstTouchSource/Medium/Campaign, lastTouchSource/Medium/Campaign | Already added in Phase 3 schema (columns confirmed at lines 208-216 of schema.ts) |
| CONV-01 | "Lead created" recorded as conversion event with denormalized ft/lt attribution | Server-side IIFE in leads.ts route, `createAttributionConversion` storage method ready |
| CONV-02 | "Phone number clicked" recorded as conversion event | `POST /api/attribution/conversion` public endpoint; client fires `phone_click` |
| CONV-03 | "Form submitted" recorded as conversion event | `POST /api/attribution/conversion` public endpoint; client fires `form_submitted` |
| CONV-04 | "Booking started" recorded as conversion event | `POST /api/attribution/conversion` public endpoint; client fires `booking_started` |
| CONV-05 | Page view events emitted on every client-side Wouter navigation stored in analytics_event_hits with session_id and page_path | Extend existing `/api/analytics/hit` endpoint to accept optional `visitorId`; resolve D-16 column-vs-join decision |
</phase_requirements>

---

## Summary

Phase 4 is a pure server-side wiring phase: no client code changes, no admin UI. The phase has three distinct work streams: (1) attribution injection into the existing lead route, (2) new public `POST /api/attribution/*` endpoints, and (3) real SQL replacing the 5 marketing query stubs.

The existing codebase provides every building block. The fire-and-forget IIFE pattern is already live in `server/routes/leads.ts` (three instances: Twilio, Resend, GHL sync). The `requireAdmin` middleware is defined in `server/routes.ts` and passed to all route modules. The storage methods `upsertVisitorSession`, `createAttributionConversion`, and `linkLeadToVisitor` are fully implemented. The 5 marketing query stubs have SQL comments in their bodies that describe exactly what needs to be written.

The one open architectural decision is D-16: whether to add a `visitor_id` text column to `analytics_event_hits` or correlate via `session_id` at query time. The current `analytics_event_hits` table has a `session_id text` column (the per-form sessionId, NOT the mvp_vid visitor UUID). These are two different identity spaces — `session_id` in analytics hits is the form session UUID from `formLeads.sessionId`, while `visitor_id` is the localStorage mvp_vid UUID from `visitor_sessions.visitorId`. They cannot be joined without an explicit mapping column. The planner should add a `visitor_id` text column to `analytics_event_hits`.

**Primary recommendation:** Add `visitor_id` column to `analytics_event_hits` now (D-16 resolved: column approach). The `session_id` in that table is the form sessionId, not the visitor UUID — join-time correlation is not possible without the column.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express.js | (existing) | HTTP routing | Project standard; all routes follow `registerXxxRoutes(app, requireAdmin)` pattern |
| Drizzle ORM | (existing) | SQL queries | Project standard; `db.select().from(table).where(...)` pattern throughout |
| Zod | (existing) | Request body validation | Project standard; `.parse()` in try/catch returning 400 on ZodError |
| `node-pg` / pool | (existing) | Raw SQL for complex aggregation | Used in existing runtime schema guard queries; acceptable for GROUP BY aggregations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-orm/pg-core` `sql` template tag | (existing) | Inline SQL fragments in Drizzle updates | Already used in `upsertVisitorSession` for `excluded.*` references |
| `eq`, `and`, `gte`, `lte`, `desc` from `drizzle-orm` | (existing) | Query predicates | Filtering visitor_sessions and attribution_conversions by date range |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle `.select()` for GROUP BY aggregations | Raw `pool.query()` | Drizzle's query builder handles simple aggregates fine; raw SQL gives more control for complex GROUP BY with CASE expressions; either is acceptable given both are already in the codebase |

**Installation:** No new packages required. All dependencies are already in the project.

---

## Architecture Patterns

### Recommended Project Structure
```
server/
├── routes/
│   ├── leads.ts          # MODIFY: add visitorId to formLeadProgressSchema consumer + IIFE block
│   ├── attribution.ts    # CREATE: registerAttributionRoutes — POST /session, POST /conversion
│   ├── marketing.ts      # CREATE: registerMarketingRoutes — GET /api/admin/marketing/*
│   └── integrations.ts   # MODIFY: extend /api/analytics/hit to accept visitorId
├── routes.ts             # MODIFY: add registerAttributionRoutes + registerMarketingRoutes calls
└── storage.ts            # MODIFY: replace 5 stub methods with real SQL

shared/
└── schema.ts             # MODIFY: add visitorId to formLeadProgressSchema; add visitor_id to analyticsEventHits (D-16)
```

### Pattern 1: Fire-and-Forget IIFE (Attribution Injection)

**What:** Wrap async operations in a self-invoking async function with try/catch. Do NOT await the IIFE. Store the result in a throwaway variable to avoid floating promise lint warnings if needed.

**When to use:** Any side-effect that must not block the HTTP response or alter its status code.

**Example (verbatim from leads.ts lines 185-219):**
```typescript
// Source: server/routes/leads.ts lines 185-219 (observed pattern)
(async () => {
  try {
    const twilioSettings = await storage.getTwilioSettings();
    if (twilioSettings) {
      const notifyResult = await sendHotLeadNotification(
        twilioSettings,
        lead,
        companyName,
        { leadId: lead.id, trigger: "lead_completed" },
      );
      if (notifyResult.success) {
        await storage.updateFormLead(lead.id, { notificacaoEnviada: true });
      }
    }
  } catch (notificationError) {
    console.error('Lead notification error:', notificationError);
  }
})();
```

The attribution injection block follows the same structure:
```typescript
// New block to add after the GHL IIFE in leads.ts
if (parsed.visitorId) {
  (async () => {
    try {
      await storage.linkLeadToVisitor(lead.id, parsed.visitorId!);
      await storage.createAttributionConversion({
        conversionType: 'lead_created' as const,
        visitorId: /* resolved inside linkLeadToVisitor — need integer */ ...,
        leadId: lead.id,
        pagePath: parsed.urlOrigem ?? undefined,
        // ft/lt fields: resolve from visitor_sessions after linkLeadToVisitor
      });
    } catch (attrError) {
      console.error('Attribution injection error (non-blocking):', attrError);
    }
  })();
}
```

**Critical nuance for CONV-01:** `createAttributionConversion` requires `visitorId` as an integer FK (the `id` from `visitor_sessions`). But `linkLeadToVisitor` does the UUID→integer lookup internally and does NOT return the integer id. The IIFE must either: (a) do its own `SELECT id FROM visitor_sessions WHERE visitor_id = $uuid` lookup before calling `createAttributionConversion`, OR (b) call a combined storage method. The cleanest approach is a single `attributeLead(leadId, visitorUuid, pagePath)` storage method that does the lookup once, writes `form_leads.visitor_id`, and inserts the conversion row — but this may conflict with D-03 which specifies calling the two existing methods separately. **Planner should address:** resolve how to get the integer visitorSession.id for the `createAttributionConversion` call without a second DB round-trip. Options:
  - Extend `linkLeadToVisitor` to return `{ sessionId: number } | null` so the IIFE can pass it to `createAttributionConversion`
  - Add a new combined storage method (simpler, fewer round-trips)
  - Do a separate `upsertVisitorSession`-style lookup inline in the IIFE

### Pattern 2: Route Module Registration

**What:** Each subsystem has its own `server/routes/xxx.ts` with a `registerXxxRoutes(app, requireAdmin)` named export. `server/routes.ts` imports and calls them in sequence.

**Example (from server/routes.ts lines 48-57):**
```typescript
// Source: server/routes.ts (observed pattern)
registerServiceRoutes(app, requireAdmin);
registerLeadRoutes(app, requireAdmin);
registerNotificationRoutes(app, requireAdmin);
// ... etc
```

New additions:
```typescript
import { registerAttributionRoutes } from "./routes/attribution.js";
import { registerMarketingRoutes } from "./routes/marketing.js";
// ...
registerAttributionRoutes(app, storage);          // public — no requireAdmin
registerMarketingRoutes(app, storage, requireAdmin); // admin routes need it
```

Note: attribution routes are public (no auth) — signature differs from the others which pass `requireAdmin` as second param. The marketing routes file needs `requireAdmin` for its protected endpoints.

### Pattern 3: Admin Route with Query Filters

**What:** Admin GET endpoints accept query params, parse with Zod, pass as filter object to storage method. 30-day default enforced at route layer.

**Example:**
```typescript
// server/routes/marketing.ts
const marketingFiltersSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  source: z.string().max(100).optional(),
  campaign: z.string().max(100).optional(),
  conversionType: z.enum(['lead_created', 'phone_click', 'form_submitted', 'booking_started']).optional(),
});

app.get('/api/admin/marketing/overview', requireAdmin, async (req, res) => {
  try {
    const rawFilters = marketingFiltersSchema.parse(req.query);
    const now = new Date();
    const filters: MarketingFilters = {
      from: rawFilters.dateFrom ? new Date(rawFilters.dateFrom) : new Date(now.getTime() - 30 * 86400_000),
      to: rawFilters.dateTo ? new Date(rawFilters.dateTo) : now,
      channel: rawFilters.source,
      campaign: rawFilters.campaign,
    };
    const data = await storage.getMarketingOverview(filters);
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0]?.message ?? 'Invalid filters' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Pattern 4: Public Endpoint with sendBeacon Contract

**What:** Public POST endpoints for analytics/attribution return minimal responses so `navigator.sendBeacon` (fire-and-forget) works correctly. Never return 5xx for missing visitor data — the visitor session may not exist yet.

**Example from existing `/api/analytics/hit` (lines 633-668 of integrations.ts):**
```typescript
// Source: server/routes/integrations.ts lines 633-668 (observed)
app.post('/api/analytics/hit', async (req, res) => {
  try {
    const payload = eventHitSchema.parse(req.body);
    // ... business logic ...
    return res.status(204).end();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid analytics hit payload', errors: err.errors });
    }
    return res.status(500).json({ message: (err as Error).message });
  }
});
```

New attribution endpoints return `200 {}` (not 204) per D-06, and never 500 for missing visitor.

### Pattern 5: Drizzle GROUP BY Aggregation SQL

**What:** Marketing query methods use Drizzle's `sql` template tag and `db.execute()` for GROUP BY aggregates, or Drizzle's `.select({ count: sql<number>`count(*)` })` approach.

**Example for `getMarketingBySource` (informed by stub comments):**
```typescript
// Source: guided by stub comments in storage.ts line 1696-1699
async getMarketingBySource(filters?: MarketingFilters): Promise<MarketingBySource[]> {
  const from = filters?.from ?? new Date(Date.now() - 30 * 86400_000);
  const to = filters?.to ?? new Date();
  const rows = await db
    .select({
      channel: visitorSessions.ftSourceChannel,
      visits: sql<number>`count(distinct ${visitorSessions.id})`,
      leads: sql<number>`count(distinct ${formLeads.id})`,
    })
    .from(visitorSessions)
    .leftJoin(formLeads, eq(formLeads.visitorId, visitorSessions.id))
    .where(and(
      gte(visitorSessions.firstSeenAt, from),
      lte(visitorSessions.lastSeenAt, to),
    ))
    .groupBy(visitorSessions.ftSourceChannel);
  // ... map to MarketingBySource[] with hot/warm/cold counts
}
```

Note: hot/warm/cold counts require a CASE expression on `formLeads.classificacao`, which maps to the Portuguese enum values `'quente'`, `'morno'`, `'frio'`.

### Anti-Patterns to Avoid

- **Awaiting the attribution IIFE:** Never `await` the fire-and-forget block. The existing pattern in leads.ts is correct — call the IIFE but do not await.
- **Throwing from attribution blocks:** Always wrap in try/catch with `console.error`. An unhandled rejection inside a non-awaited IIFE will still surface as an unhandled rejection in Node.js.
- **Returning 500 for missing visitor session in attribution endpoints:** If the visitor session row doesn't exist when a conversion fires, return `200 {}` silently — per D-06. The visitor session is best-effort, not a hard dependency.
- **Unbounded marketing queries:** Never run a marketing query without a date filter. Enforce the 30-day default at the route layer before calling storage.
- **Extending `/api/analytics/hit` for conversion tracking:** D-05 explicitly prohibits this. Attribution conversions have different semantics (denormalized ft/lt snapshot, leadId linkage) and a different error contract.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID validation in Zod | Custom regex | `z.string().uuid()` | Built into Zod; matches PostgreSQL uuid format |
| Date default in query filters | Manual if/else | Express-layer default before storage call | Keeps storage methods pure; mirrors D-13 |
| Integer FK resolution for visitorId | Duplicate lookup logic in route | Storage method that does the lookup | Keeps UUID↔integer translation in one place |
| conversionType enum validation | String comparison | `z.enum([...])` in route Zod schema | Server-side enum guard deferred from Phase 3 to Phase 4 per STATE.md |

---

## D-16 Resolution: visitor_id Column vs. Join

This is the most important open decision for Phase 4. Here is the finding:

**`analytics_event_hits.session_id` is NOT the mvp_vid visitor UUID.** It is the form session UUID (`formLeads.sessionId`) — a per-form identifier stored in localStorage under a different key. The two identity spaces:

| Field | Table | Type | Source | Meaning |
|-------|-------|------|--------|---------|
| `sessionId` (text) | `analytics_event_hits` | UUID string | Form localStorage key | Per-form lead session |
| `visitor_id` (uuid) | `visitor_sessions` | UUID string | `mvp_vid` localStorage key | Cross-session visitor identity |

There is no reliable join between `analytics_event_hits.session_id` and `visitor_sessions.visitor_id` without additional mapping. The Phase 7 journey view needs to correlate page_view events to a visitor session.

**Decision for planner (resolved):** Add `visitor_id text` column to `analytics_event_hits` via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. The `eventHitSchema` in `server/routes/integrations.ts` line 25 already parses the `/api/analytics/hit` body — extend it to accept optional `visitorId`. The `recordAnalyticsEventHit` storage method and `InsertAnalyticsEventHit` type will need the new field.

This requires: (1) schema change in `shared/schema.ts`, (2) `db:push` or runtime guard, (3) extend `eventHitSchema` in integrations.ts, (4) extend `recordAnalyticsEventHit` in storage.ts.

---

## Common Pitfalls

### Pitfall 1: linkLeadToVisitor Returns void — No Integer for createAttributionConversion

**What goes wrong:** The IIFE calls `storage.linkLeadToVisitor(lead.id, parsed.visitorId)` which returns `void`. Then `storage.createAttributionConversion()` needs `visitorId: number` (integer FK to visitor_sessions.id). There is no way to get that integer without a second DB query.

**Why it happens:** D-03 specifies calling both methods in the same IIFE but the current `linkLeadToVisitor` signature returns void (per storage.ts line 1665).

**How to avoid:** Either (a) change `linkLeadToVisitor` to return `number | null` (the resolved session id), or (b) add a combined method `linkLeadAndRecordConversion(leadId, visitorUuid, pagePath)` that does both in one transaction. Option (a) is the minimal change; option (b) is cleaner. The planner must resolve this — the current stub does not support D-03 as written.

**Warning signs:** TypeScript error when trying to pass the result of `linkLeadToVisitor` as `visitorId` to `createAttributionConversion`.

### Pitfall 2: formLeads.classificacao Portuguese Enum Values in SQL

**What goes wrong:** `MarketingBySource` requires `hotLeads`, `warmLeads`, `coldLeads` counts. The `formLeads.classificacao` column uses Portuguese values: `'quente'` (hot), `'morno'` (warm), `'frio'` (cold). Writing `classificacao = 'hot'` produces zero counts silently.

**Why it happens:** The lead classification enum in shared/schema.ts uses Portuguese values consistent with the form UI.

**How to avoid:** Use `sql\`FILTER (WHERE ${formLeads.classificacao} = 'quente')\`` or CASE expressions with the correct Portuguese values.

### Pitfall 3: excluded.* Column Names in Drizzle onConflictDoUpdate

**What goes wrong:** `upsertVisitorSession` already uses `sql\`excluded.lt_source\`` (snake_case) rather than camelCase. If any new upsert writes use JavaScript property names (camelCase) in the `sql` template, PostgreSQL silently fails or throws a column-not-found error.

**Why it happens:** Drizzle ORM property names are camelCase but the `excluded.*` pseudo-table references actual SQL column names (snake_case).

**How to avoid:** Always use snake_case column names inside `sql\`excluded.*\`` references. Already solved in `upsertVisitorSession` — do not deviate from that pattern.

### Pitfall 4: /api/analytics/hit Conditional Storage

**What goes wrong:** The existing `/api/analytics/hit` handler (integrations.ts line 650) returns early with `{ accepted: true, stored: false }` when there is no active analytics destination AND `ENABLE_ANALYTICS_EVENT_STORAGE` is not `'true'`. If the client sends `visitorId` for CONV-05 page views, it will not be stored unless at least one analytics destination is active or the env var is set.

**Why it happens:** The endpoint was designed to skip storage when nothing is listening. Page view attribution data needs to be stored regardless of analytics destination state.

**How to avoid:** For CONV-05, consider whether the visitorId-enhanced page_view should bypass the `hasActiveDestination` guard. If page views must always be stored for the journey view, either always store when `visitorId` is present, or store the visitorId correlation in a separate lightweight path. The planner should decide: most defensible approach is to always insert the row when `visitorId` is present, ignoring the destination guard.

### Pitfall 5: Marketing Route File Needs requireAdmin Injected

**What goes wrong:** Attribution routes are public (no auth) but marketing routes are admin-only. If a new `server/routes/marketing.ts` file is created with `registerMarketingRoutes(app, storage)` and no `requireAdmin` param, the admin routes won't be protected.

**Why it happens:** The function signature differs from other route modules — some take `(app, requireAdmin)`, others might take `(app, storage)`. There is no standard for storage injection (all modules currently import `storage` directly from `"../storage.js"` rather than receiving it as a parameter).

**How to avoid:** Looking at existing route files — they all `import { storage } from "../storage.js"` directly (not passed as a param). The `registerAttributionRoutes` and `registerMarketingRoutes` functions should follow the same convention: import storage directly, accept only `(app: Express, requireAdmin: any)` where admin auth is needed. The attribution file needs no `requireAdmin` at all.

---

## Code Examples

Verified patterns from the actual codebase:

### Existing IIFE Pattern (copy this verbatim)
```typescript
// Source: server/routes/leads.ts lines 204-219 (Resend block — simplest instance)
(async () => {
  try {
    const resendSettings = await storage.getResendSettings();
    if (resendSettings?.enabled && resendSettings.notifyOnNewLead) {
      const { sendNewLeadNotification } = await import('../integrations/resend.js');
      await sendNewLeadNotification(
        resendSettings,
        lead,
        companyName,
        { leadId: lead.id, trigger: "lead_completed" },
      );
    }
  } catch (notificationError) {
    console.error('Resend lead notification error:', notificationError);
  }
})();
```

### requireAdmin Middleware (existing, server/routes.ts lines 19-33)
```typescript
// Source: server/routes.ts lines 19-33
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const sess = req.session as any;
  if (!sess?.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const [dbUser] = await db.select().from(users).where(eq(users.id, sess.userId));
    if (!dbUser?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to verify admin status' });
  }
}
```

### Zod Validation Pattern (existing, from integrations.ts)
```typescript
// Source: server/routes/integrations.ts lines 25-29
const eventHitSchema = z.object({
  eventName: z.string().trim().min(1),
  pagePath: z.string().trim().max(600).optional(),
  sessionId: z.string().trim().max(120).optional(),
});
```

### Drizzle upsertVisitorSession with excluded.* (existing, storage.ts lines 1600-1629)
```typescript
// Source: server/storage.ts lines 1600-1629
const [row] = await db
  .insert(visitorSessions)
  .values(session)
  .onConflictDoUpdate({
    target: visitorSessions.visitorId,
    set: {
      ltSource: sql`excluded.lt_source`,
      // ... (snake_case column names in sql template, camelCase Drizzle properties as keys)
      converted: sql`GREATEST(visitor_sessions.converted::int, excluded.converted::int)::boolean`,
    },
  })
  .returning();
```

### formLeadProgressSchema (existing, schema.ts line 387 — ADD visitorId here)
```typescript
// Source: shared/schema.ts lines 387-422
// ADD after line 421 (before closing brace):
//   visitorId: z.string().uuid().optional(),
export const formLeadProgressSchema = z.object({
  sessionId: z.string().uuid(),
  // ... existing fields ...
  customAnswers: z.record(z.string()).optional(),
  // ADD:
  visitorId: z.string().uuid().optional(),
});
```

### analyticsEventHits Table (existing — ADD visitor_id column)
```typescript
// Source: shared/schema.ts lines 47-57
// ADD visitor_id text column for CONV-05:
export const analyticsEventHits = pgTable("analytics_event_hits", {
  id: serial("id").primaryKey(),
  eventName: text("event_name").$type<AnalyticsEventName>().notNull(),
  channels: jsonb("channels").$type<...>().default({}),
  pagePath: text("page_path"),
  sessionId: text("session_id"),
  visitorId: text("visitor_id"),   // ADD — mvp_vid UUID string, nullable
  createdAt: timestamp("created_at").defaultNow(),
  // ...
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Marketing query stubs returning empty results | Real GROUP BY SQL | Phase 4 (this phase) | Dashboard endpoints become functional |
| formLeadProgressSchema has no visitorId | Optional visitorId field | Phase 4 (this phase) | Lead form submissions carry attribution context |
| analytics_event_hits has no visitor_id | Add visitor_id text column | Phase 4 (this phase, D-16) | Page views correlatable to visitor session for journey view |

---

## Open Questions

1. **How does the IIFE get the integer visitor session id for `createAttributionConversion`?**
   - What we know: `linkLeadToVisitor(leadId, visitorUuid)` returns void. `createAttributionConversion` needs `visitorId: number` (integer FK).
   - What's unclear: Whether to modify `linkLeadToVisitor` to return `number | null`, add a combined storage method, or do a separate lookup in the IIFE.
   - Recommendation: Change `linkLeadToVisitor` return type to `Promise<number | null>` — returns the resolved integer `visitor_sessions.id` or null if not found. Minimal change, no new method needed.

2. **Should visitorId be stamped on `form_leads` attribution columns (firstTouchSource etc.) in the IIFE?**
   - What we know: Phase 3 added these columns (`firstTouchSource`, `lastTouchSource`, etc.) to `formLeads`. The `linkLeadToVisitor` method currently only writes `form_leads.visitor_id` (integer FK). The Phase 3 storage comment says "Phase 4 will extend this to also write first/last-touch attribution columns."
   - What's unclear: Whether the IIFE should also call `storage.updateFormLead(lead.id, { firstTouchSource: ..., ... })` after fetching the visitor session row.
   - Recommendation: Yes — the IIFE should stamp all attribution columns on `form_leads` as part of ATTR-04. This requires reading the visitor_sessions row in the IIFE. The planner should include this as a task step.

3. **CONV-05 storage guard — always store when visitorId present?**
   - What we know: `/api/analytics/hit` skips storage when no active analytics destination and env var not set.
   - Recommendation: When `visitorId` is present, always insert — bypass the destination guard. This is the only way to ensure journey data accumulates in development and production regardless of GA4/Facebook/GHL settings.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase adds only server-side route code, storage SQL, and schema changes; all runtime infrastructure is already in place from Phase 3).

---

## Validation Architecture

No `nyquist_validation` key in `.planning/config.json` — treated as enabled. However, this project has no test infrastructure (no test files, no test config, no package.json test script beyond TypeScript check). The effective validation gate is `npm run check` (TypeScript type checking) and `npm run build`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — TypeScript compiler (`tsc`) serves as the only automated check |
| Config file | `tsconfig.json` |
| Quick run command | `npm run check` |
| Full suite command | `npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| ATTR-03 | visitorId field accepted in progress schema | Compile-time | `npm run check` | N/A (schema change) |
| ATTR-04 | form_leads columns present | DB (manual) | `npm run db:push` | N/A (schema already pushed in Phase 3) |
| CONV-01 | lead_created conversion recorded server-side | Manual smoke | POST /api/form-leads/progress with visitorId | N/A |
| CONV-02/03/04 | Client-fired conversions stored | Manual smoke | POST /api/attribution/conversion | N/A |
| CONV-05 | page_view stores visitorId | Compile-time + manual | `npm run check` | N/A |

### Sampling Rate
- **Per task commit:** `npm run check`
- **Per wave merge:** `npm run build`
- **Phase gate:** Build green + `db:push` applied before `/gsd:verify-work`

### Wave 0 Gaps
None — no test infrastructure is expected in this project. TypeScript compilation and build are the validation gates.

---

## Sources

### Primary (HIGH confidence)
- `server/routes/leads.ts` — Actual fire-and-forget IIFE pattern, formLeadProgressSchema usage, lead route structure
- `server/routes.ts` — requireAdmin middleware definition and route registration pattern
- `server/storage.ts` — All 8 attribution storage method implementations and stubs
- `shared/schema.ts` — formLeads table (lines 200-226), visitorSessions (lines 252-286), attributionConversions (lines 291-311), analyticsEventHits (lines 47-57), formLeadProgressSchema (lines 387-422)
- `shared/marketing-types.ts` — MarketingFilters, MarketingOverview, MarketingBySource, MarketingByCampaign, VisitorJourney types
- `server/routes/integrations.ts` — `/api/analytics/hit` handler (lines 633-668), eventHitSchema (lines 25-29)
- `.planning/phases/04-server-routes-lead-flow-integration/04-CONTEXT.md` — All locked decisions D-01 through D-16
- `.planning/STATE.md` — Architectural constraints, linkLeadToVisitor UUID→integer decision

### Secondary (MEDIUM confidence)
- `shared/analytics-events.ts` — ANALYTICS_EVENT_NAMES includes `page_view`; confirms no schema addition needed for the event name itself

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture: HIGH — every pattern directly observed in the codebase
- Pitfalls: HIGH — all derived from actual code inspection, not theory
- SQL aggregation patterns: MEDIUM — stub comments give direction; exact GROUP BY / CASE shapes need careful authoring against the actual enum values

**Research date:** 2026-04-25
**Valid until:** Stable for this milestone (schema established in Phase 3; no fast-moving dependencies)
