# Roadmap: mvp

## Overview

Production website for MVP (a service business) that also serves as a forkable template for other clients. v1.0 is live. v1.1 focuses on notification observability and documentation alignment; future milestones cover fork-readiness and admin improvements.

## Current Milestone

**v1.1 Notification Log + Docs Alignment** (v1.1.0)
Status: Complete
Phases: 2 of 2 complete

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with [INSERTED])

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Lead Notification Log | 4 | ✅ Complete | 2026-04-16 |
| 2 | Docs Alignment (dual nature) | 1 | ✅ Complete | 2026-04-16 |

## Phase Details

### Phase 1: Lead Notification Log

**Goal:** Every notification send (Twilio SMS, Resend email, GoHighLevel sync) is recorded in a new `notification_logs` table with recipient, preview and status — visible in the admin both per-lead and in a global view.
**Depends on:** Nothing (base already exists)
**Research:** Unlikely (internal patterns; integrations already mapped)

**Scope:**
- New `notificationLogs` table in `shared/schema.ts` (+ migration via `npm run db:push`)
- `logNotification()` helper in `server/notifications/logger.ts` + storage method
- Instrument `server/integrations/twilio.ts`, `resend.ts`, `ghl.ts` to log each send
- Endpoints: `GET /api/form-leads/:id/notifications` and `GET /api/admin/notification-logs` (with filters)
- "Notifications" tab in the lead detail modal in `client/src/components/admin/LeadsSection.tsx`
- New admin section "Notification Log" with global table + filters + preview modal

**Plans:**
- [x] 01-01: Schema + migration + storage method
- [x] 01-02: Logging helper + instrument Twilio/Resend/GHL
- [x] 01-03: API endpoints + Zod validation
- [x] 01-04: UI — per-lead row indicator with popover (original "tab + global section" scope was superseded)

### Phase 2: Docs Alignment (dual nature)

**Goal:** `CLAUDE.md`, `README.md` and `AGENTS.md` correctly describe the project as **MVP's production site + forkable template for service businesses** (not as a remodeling or marketing company site).
**Depends on:** Nothing (docs-only edits)
**Research:** Unlikely

**Scope:**
- Update `README.md` (name, description, generic brand guidelines with per-business override)
- Update `CLAUDE.md` (project overview + brand as a variable)
- Update `AGENTS.md` (add note about dual nature / forkability)

**Plans:**
- [x] 02-01: Rewrite the three files with a "template + production" tone

---
*Roadmap created: 2026-04-15*
*Last updated: 2026-04-15*
