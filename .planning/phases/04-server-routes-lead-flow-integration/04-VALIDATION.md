---
phase: 4
slug: server-routes-lead-flow-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript type-checker (`npm run check`) + curl/manual API testing |
| **Config file** | tsconfig.json (already exists) |
| **Quick run command** | `npm run check` |
| **Full suite command** | `npm run check && npm run build` |
| **Estimated runtime** | ~15–20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check`
- **After every plan wave:** Run `npm run check && npm run build`
- **Before `/gsd:verify-work`:** Full suite green + manual curl verification of endpoints
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 4-01-01 | 01 | 1 | ATTR-04, CONV-05 | type-check | `npm run check` | ⬜ pending |
| 4-01-02 | 01 | 1 | ATTR-03 | type-check | `npm run check` | ⬜ pending |
| 4-02-01 | 02 | 2 | CONV-01–04 | type-check | `npm run check` | ⬜ pending |
| 4-02-02 | 02 | 2 | ATTR-03, CONV-01 | type-check | `npm run check` | ⬜ pending |
| 4-03-01 | 03 | 3 | DASH backends | type-check + build | `npm run check && npm run build` | ⬜ pending |

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements (type-check only — no test framework).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `POST /api/attribution/session` upserts visitor_sessions | SESSION-01 (backend) | Requires running server + DB | `curl -X POST http://localhost:7000/api/attribution/session -H "Content-Type: application/json" -d '{"visitorId":"<uuid>","ftSource":"google","ftSourceChannel":"Organic Search","landingPage":"/","deviceType":"desktop"}'` — expect `{}` 200 |
| Attribution injection in lead submit never errors | ATTR-03 | Requires form submission flow | Submit a test lead with `visitorId` in payload; check server logs show no attribution errors; lead returns 200 |
| Marketing endpoints return structured data | DASH backends | Requires running server | `curl http://localhost:7000/api/admin/marketing/overview` with admin session cookie |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or are manual-only
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
