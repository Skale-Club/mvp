# Phase 5: Client UTM Capture Hook - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-25
**Phase:** 05-client-utm-capture-hook
**Areas discussed:** Session ping frequency, Form visitorId injection, Phone + booking conversion wiring

---

## Session Ping Frequency

| Option | Description | Selected |
|--------|-------------|----------|
| Once on mount only | Captures UTMs at landing; lt_* never updated between pages | |
| First mount + every navigation | ft_* captured once (empty deps), lt_* updated on each route change | ✓ |

**User's choice:** Recommended
**Notes:** Auto-selected. Two separate useEffect calls — one with `[]` for UTM capture, one with `[location]` for lt_* updates. Server upsert never overwrites ft_*.

---

## Form visitorId Injection

| Option | Description | Selected |
|--------|-------------|----------|
| Read localStorage directly in component | Simple but scatters localStorage.getItem('mvp_vid') | |
| Hook exposes visitorId from state | Centralized; components call useAttribution() or use utility | ✓ |

**User's choice:** Recommended
**Notes:** Auto-selected. `useAttribution()` returns `{ visitorId }`. LeadFormModal imports and uses it. Utility `client/src/lib/attribution.ts` handles simpler cases (Navbar, booking CTA).

---

## Phone + Booking Conversion Wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to later | Server endpoints exist but no client calls | |
| Wire in Phase 5 | Add fireConversionEvent() to Navbar onClick and booking CTA | ✓ |

**User's choice:** Recommended
**Notes:** Auto-selected. Completes CONV-02/04 end-to-end. Uses sendBeacon so no blocking. Utility function approach avoids prop-drilling.

---

## Claude's Discretion

- Exact location of booking start CTA in client
- Whether to memoize traffic classification function
- Error handling granularity for failed pings

## Deferred Ideas

- form_submitted client event (server already fires lead_created — redundant)
- Safari ITP server-set cookie
- GDPR consent banner integration
