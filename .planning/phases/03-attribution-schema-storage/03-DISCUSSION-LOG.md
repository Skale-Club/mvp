# Phase 3: Attribution Schema + Storage - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 03-attribution-schema-storage
**Areas discussed:** form_leads extension, Existing UTM field relationship, Conversion events table, visitor_id data type

---

## form_leads Extension

| Option | Description | Selected |
|--------|-------------|----------|
| Inline nullable columns via db:push | Add 10 new columns directly to form_leads table; nullable so no migration risk; follows existing pattern | ✓ |
| Separate lead_attribution lookup table | New table joined by form_leads.id; cleaner normalization but requires JOIN on all attribution queries | |

**User's choice:** Recommended (inline columns)
**Notes:** Auto-selected. Consistent with how ghlContactId/ghlSyncStatus were added. Simpler queries, better template forkability.

---

## Existing UTM Field Relationship

| Option | Description | Selected |
|--------|-------------|----------|
| Keep both; new columns are additive | Existing utmSource/utmMedium/utmCampaign stay as "form-time UTMs"; new firstTouch*/lastTouch* are attribution system's view | ✓ |
| Deduplicate / replace existing | Remove or repurpose existing fields to avoid confusion | |
| Use existing as last-touch | Treat utmSource etc. as the lastTouch values and only add firstTouch columns | |

**User's choice:** Recommended (keep both, additive)
**Notes:** Auto-selected. The existing fields are populated by the client form payload — changing them would break existing behavior. New columns are additive.

---

## Conversion Events Table

| Option | Description | Selected |
|--------|-------------|----------|
| New attribution_conversions table | Denormalized table with ft/lt fields at conversion time; optimized for GROUP BY aggregations | ✓ |
| Extend analytics_event_hits | Add attribution columns to existing event table; less duplication but mixed concerns | |

**User's choice:** Recommended (new table)
**Notes:** Auto-selected. Matches research recommendation. analytics_event_hits is a catch-all event log; attribution_conversions is specifically for marketing aggregation queries.

---

## visitor_id Data Type

| Option | Description | Selected |
|--------|-------------|----------|
| uuid type | Consistent with formLeads.sessionId (uuid); crypto.randomUUID() output is UUID-formatted | ✓ |
| text type | Consistent with analyticsEventHits.sessionId (text); more flexible | |

**User's choice:** Recommended (uuid)
**Notes:** Auto-selected. Type safety benefit: DB rejects malformed visitor IDs. Consistent with the other UUID-typed session identifier in the schema.

---

## Claude's Discretion

- Column types (text vs varchar with limits)
- TypeScript union type annotations for conversionType and sourceChannel
- Whether to add runtime guards for new form_leads columns

## Deferred Ideas

- Data retention / TTL for visitor_sessions
- Runtime guard for new form_leads columns (defensive, optional)
- Adding utm_id to existing form-time UTM capture on formLeads
