# Requirements: mvp v1.2 Marketing Attribution

**Defined:** 2026-04-25
**Core Value:** Production service-business site for MVP + forkable base template for other clients.
**Milestone:** v1.2 — Marketing Attribution

---

## v1.2 Requirements

### Session (Visitor Session Capture)

- [ ] **SESSION-01**: System captures UTM parameters (source, medium, campaign, term, content, id) on every page load, normalizes them (lowercase + trim), and stores them server-side per visitor session
- [ ] **SESSION-02**: System auto-classifies non-UTM traffic from `document.referrer` into: Organic Search (Google, Bing, Yahoo, DuckDuckGo), Social (Facebook, Instagram, YouTube, TikTok, LinkedIn, X/Twitter), Referral (any other external domain), Direct (no referrer), or Unknown
- [ ] **SESSION-03**: Anonymous visitor ID (`mvp_vid`) persists in localStorage across page navigations and browser restarts — distinct from the existing per-form `sessionId`
- [ ] **SESSION-04**: Visitor session records: landing page pathname, device type (mobile/tablet/desktop), and first/last seen timestamps
- [ ] **SESSION-05**: Visitor session creation uses DB upsert — first-touch columns (ft_source, ft_medium, ft_campaign, ft_landing_page) are set once and never modified on subsequent visits

### Attribution (First-Touch / Last-Touch)

- [ ] **ATTR-01**: First-touch attribution (source, medium, campaign, landing page) is captured on the visitor's very first page load and preserved immutably
- [ ] **ATTR-02**: Last-touch attribution (source, medium, campaign, landing page) is updated on every subsequent visit so the most recent meaningful source is always current
- [ ] **ATTR-03**: When a lead is created, the system links the visitor session to the `form_leads` record via `sessionId` and stamps first-touch and last-touch fields on the lead
- [ ] **ATTR-04**: `form_leads` is extended with: `utmContent`, `utmTerm`, `sourceChannel`, `firstTouchSource`, `firstTouchMedium`, `firstTouchCampaign`, `lastTouchSource`, `lastTouchMedium`, `lastTouchCampaign`

### Conversion Events

- [ ] **CONV-01**: "Lead created" is recorded as a conversion event linked to the visitor session with denormalized first-touch and last-touch attribution at the moment of conversion
- [ ] **CONV-02**: "Phone number clicked" is recorded as a conversion event with attribution snapshot
- [ ] **CONV-03**: "Form submitted" is recorded as a conversion event with attribution snapshot
- [ ] **CONV-04**: "Booking started" is recorded as a conversion event with attribution snapshot
- [ ] **CONV-05**: Page view events are emitted on every client-side Wouter navigation and stored in `analytics_event_hits` with session_id and page_path (required for visitor journey view)

### Marketing Dashboard

- [ ] **DASH-01**: Admin panel has a "Marketing" section in the existing admin navigation, built as a per-section component following the `NotificationsSection`/`LeadsSection` pattern
- [ ] **DASH-02**: Overview tab shows: total visits, leads generated, overall conversion rate, top traffic source, top campaign, top landing page, and a time-series chart (visits + conversions over the selected date range)
- [ ] **DASH-03**: Sources tab groups traffic by channel (Organic Search, Paid Ads, Social Media, Referral, Direct, Unknown) with: visits, leads, HOT/WARM/COLD lead quality breakdown, and conversion rate per channel
- [ ] **DASH-04**: Campaigns tab shows each unique campaign with: source, channel, visits, leads, conversion rate, and the top landing pages used by that campaign
- [ ] **DASH-05**: Conversions tab shows recent conversion events with: event type (in business language), timestamp, first source, last source, campaign, landing page — date-filterable
- [ ] **DASH-06**: Journey tab shows the page-by-page visit sequence for a selected visitor session: first source, pages visited in order, and conversion event that closed the journey
- [ ] **DASH-07**: All labels throughout the Marketing section use business-first language — "Traffic Source" not "utm_source", "Campaign Name" not "utm_campaign", "How they found you" not "first-touch"
- [ ] **DASH-08**: Every tab with no data shows a coach-mark empty state explaining how to generate data (e.g., "Add UTM parameters to your ad links to see campaign data here")

### Filters

- [ ] **FILTER-01**: Admin can filter all Marketing views by date range with presets: Today, Yesterday, Last 7 days, Last 30 days, This month, Last month, and a custom date picker
- [ ] **FILTER-02**: Admin can filter by traffic source (channel)
- [ ] **FILTER-03**: Admin can filter by campaign name
- [ ] **FILTER-04**: Admin can filter by conversion type (lead, phone click, form submit, booking)

### Lead-Level Attribution

- [ ] **LEADATTR-01**: Lead detail drawer in the existing Leads section shows an attribution summary panel: first source, last source, campaign name, landing page, and number of visits before conversion
- [ ] **LEADATTR-02**: Attribution summary panel on the lead detail identifies clearly whether the lead came via paid, organic, social, referral, or direct traffic — in business language

---

## Future Requirements (v1.3+)

### Visitor Journey (Enhanced)
- **JOUR-01**: Visitor journey view includes pages visited across multiple sessions (cross-session stitching by visitorId)
- **JOUR-02**: Admin can search for a specific lead and view its full pre-conversion journey

### Advanced Attribution
- **ADV-01**: Form completion rate per traffic source (ratio of form_open to form_completed events per channel)
- **ADV-02**: Device type breakdown chart in Sources view
- **ADV-03**: Server-set HTTP cookie for `visitorId` to mitigate Safari ITP 7-day localStorage purge

### Admin Usability
- **UX-01**: Export Marketing section data as CSV
- **UX-02**: Scheduled weekly marketing summary email to admin

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-touch attribution (linear, time-decay, position-based) | Requires statistical volume not available at this traffic scale; confuses non-technical users |
| Real-time live visitor counter | Vercel Fluid Compute has no persistent connections; explicitly out of scope in PROJECT.md |
| Revenue / LTV attribution per channel | Booking payment confirmation not reliably captured server-side yet |
| Cross-device identity resolution | Requires login-based identity; fingerprinting introduces privacy/GDPR risk |
| Bot filtering / fraud detection | Requires IP databases + behavioral heuristics; service business traffic volumes don't justify it |
| A/B test attribution | Separate infrastructure; not in scope |
| Cohort / retention analysis | B2C SaaS concept; not meaningful for service business purchase cycles |
| Export to PDF | Deferred to v1.3; browser print covers most use cases |
| Competitor benchmarking | Requires external data sources |
| Custom attribution lookback windows | Hard-coded 90-day max with 30-day default; configuration adds complexity without value |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SESSION-04 | Phase 3 | Pending |
| SESSION-05 | Phase 3 | Pending |
| ATTR-01 | Phase 3 | Pending |
| ATTR-02 | Phase 3 | Pending |
| ATTR-03 | Phase 4 | Pending |
| ATTR-04 | Phase 3 | Pending |
| CONV-01 | Phase 4 | Pending |
| CONV-02 | Phase 4 | Pending |
| CONV-03 | Phase 4 | Pending |
| CONV-04 | Phase 4 | Pending |
| CONV-05 | Phase 4 | Pending |
| SESSION-01 | Phase 5 | Pending |
| SESSION-02 | Phase 5 | Pending |
| SESSION-03 | Phase 5 | Pending |
| DASH-01 | Phase 6 | Pending |
| DASH-02 | Phase 6 | Pending |
| DASH-03 | Phase 6 | Pending |
| DASH-04 | Phase 6 | Pending |
| DASH-05 | Phase 6 | Pending |
| DASH-07 | Phase 6 | Pending |
| DASH-08 | Phase 6 | Pending |
| FILTER-01 | Phase 6 | Pending |
| FILTER-02 | Phase 6 | Pending |
| FILTER-03 | Phase 6 | Pending |
| FILTER-04 | Phase 6 | Pending |
| DASH-06 | Phase 7 | Pending |
| LEADATTR-01 | Phase 7 | Pending |
| LEADATTR-02 | Phase 7 | Pending |

**Coverage:**
- v1.2 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-25*
*Last updated: 2026-04-25 after roadmap creation (phases 3-7 assigned)*
