# Phase 4: Server Routes + Lead Flow Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-25
**Phase:** 04-server-routes-lead-flow-integration
**Areas discussed:** Lead flow injection, Conversion endpoint design, Marketing query endpoints

---

## Lead Flow Injection

| Option | Description | Selected |
|--------|-------------|----------|
| Add visitorId to existing endpoint | Optional field on formLeadProgressSchema; fire-and-forget IIFE in lead route | ✓ |
| Separate link endpoint | POST /api/attribution/link called after lead creation by client | |

**User's choice:** Recommended
**Notes:** Auto-selected. Keeps integration to one endpoint, backward-compatible, follows existing notification IIFE pattern.

---

## Conversion Endpoint Design

| Option | Description | Selected |
|--------|-------------|----------|
| Unified POST /api/attribution/conversion | New endpoint, clean separation from analytics | ✓ |
| Extend /api/analytics/hit | Add attribution writes to existing endpoint | |

**User's choice:** Recommended
**Notes:** Auto-selected. Avoids touching existing analytics pipeline. Clean surface for Phase 5 client hook.

---

## Marketing Query Endpoints

| Option | Description | Selected |
|--------|-------------|----------|
| /api/admin/marketing/* with 30-day default | Separate routes per view, server-enforced date window | ✓ |
| Single /api/admin/marketing endpoint with type param | One endpoint with ?type= filter | |

**User's choice:** Recommended
**Notes:** Auto-selected. Follows existing admin route pattern. 30-day default prevents unbounded queries.

---

## Claude's Discretion

- Zod schema placement for attribution endpoints
- Whether to add visitor_id column to analytics_event_hits (D-16)
- SQL implementation details for aggregation methods

## Deferred Ideas

- Rate limiting on public attribution endpoints
- Batch conversion events
- Server-side page_view emission
