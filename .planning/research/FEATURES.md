# Feature Landscape: UTM Tracking and Marketing Attribution

**Domain:** Marketing intelligence for a service business admin panel
**Researched:** 2026-04-25
**Milestone:** v1.2 Marketing Attribution

---

## Context: What the Business Owner Needs to Answer

These are the concrete questions a non-technical service business owner must be able to answer from the Marketing section — ordered by how frequently the question arises in practice:

1. **"Which ads or campaigns are sending me real leads?"** — not just traffic, leads
2. **"Is my Google/Facebook/SEO spend actually working?"** — connecting channel to outcome
3. **"Where did my best leads come from this month?"** — HOT-only filter matters here
4. **"Which landing page is converting the most visitors into leads?"** — informs content decisions
5. **"How are people finding me when they don't click an ad?"** — organic vs direct vs referral
6. **"Which campaign should I put more money into?"** — budget allocation
7. **"What did the typical lead do before submitting the form?"** — journey awareness
8. **"Is my phone CTA getting clicks, or is everyone using the form?"** — micro-conversion audit

These questions must be answerable without a developer present. Every label and metric in the UI must use business English, not analytics jargon.

---

## Table Stakes

Features users expect. Missing = the Marketing section feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Depends On |
|---------|-------------|------------|-----------|
| UTM parameter capture (source, medium, campaign, term, content, id) | Standard since GA's beginning; any paid campaign link has them | Low — read URL params on load | `formLeads.sessionId` to tie back later |
| First-touch attribution per lead | The foundational "how did this lead find us?" answer | Medium — store on first visitor touch, join to lead at form submit | Visitor session table (new) |
| Last-touch attribution per lead | "What pushed them to finally convert?" — equally expected | Medium — update on every page load, join to lead | Same visitor session table |
| Traffic source auto-classification (organic, social, paid, referral, direct, unknown) | Without this, all non-UTM traffic shows as a blank, making 60-80% of traffic invisible | Medium — `document.referrer` + known social/search domains list | No new table needed, computed at capture |
| Overview dashboard tab | Single first screen a business owner sees; must show "what's working" in 5 seconds | Medium — aggregate queries across visitor_sessions + formLeads | Both tables populated |
| Campaign performance view | "Is this campaign working?" broken down by campaign name | Low — GROUP BY utm_campaign | Visitor sessions with UTM data |
| Source/channel performance view | "Which channel works best?" | Low — GROUP BY source/medium | Same |
| Date range filter | All analytics tools have this; without it numbers feel frozen | Low — WHERE created_at BETWEEN | Applied to all queries |
| Lead conversion metrics per source | Clicks alone are vanity; the ratio of sessions-to-leads per source is actionable | Medium — join sessions to form_leads | Both tables |
| Conversion event tracking (lead submitted, form started, phone click) | Without events, the only story told is final submissions; partial journeys invisible | Medium — event table or reuse analytics_event_hits | `analytics_event_hits` already exists |

**Confidence: HIGH** — these match what HubSpot, GA4, and any service-business marketing tool ships as their baseline. Verified across multiple sources.

---

## Differentiators

Features that set this apart from generic analytics. Not expected, but meaningfully valuable for a service business context.

| Feature | Value Proposition | Complexity | Depends On |
|---------|------------------|------------|-----------|
| Lead quality by source (HOT/WARM/COLD per channel) | Generic analytics shows volume; this shows *quality*. Knowing Google Ads sends WARM leads but organic search sends HOT leads is worth real money | Medium — join `formLeads.classificacao` to sessions | Existing `classificacao` enum |
| Visitor journey view (page sequence before conversion) | Shows the owner that most leads touch the Services page then the About page before submitting — content strategy insight | High — page event sequence per session | Populated `analytics_event_hits` with page_view events |
| Form completion rate by traffic source | "Visitors from Instagram start the form but don't finish it" — differentiates quality traffic from quantity traffic | Medium — ratio of form_open to form_completed per source | Existing form events in `analytics_event_hits` |
| Business-first label system throughout | "Google Ads" not "utm_medium=cpc / utm_source=google". No admin should have to decode raw UTM values | Low — display transformation layer | Applied to source/medium display values |
| Conversion event breakdown by type (lead, phone click, form start, chat) | Shows micro-conversions, not just final conversions. Useful when leads are low volume | Medium — event type breakdown in conversion view | `analytics_event_hits` event names already typed |
| "No data yet" coach-marks on empty state | Non-technical owner doesn't know why a chart is empty; a note explaining "run a campaign with UTM links to see data here" prevents confusion | Low — conditional empty state UI | None |

**Confidence: MEDIUM** — quality-by-source and business-labeling are validated by Cometly, HockeyStack examples. Journey view complexity is HIGH (requires populated event sequence data).

---

## Anti-Features

Features to explicitly NOT build in v1.2. These appear obvious at first glance but create disproportionate complexity or mislead the business owner.

| Anti-Feature | Why Avoid | What to Do Instead |
|-------------|-----------|-------------------|
| Multi-touch attribution (linear, time-decay, position-based) | Requires many more sessions to be statistically meaningful; confuses non-technical users who must choose a model | First-touch and last-touch cover 95% of service business decision-making. Defer multi-touch to v1.3 if requested |
| Real-time / live visitor counter | Vercel Fluid Compute has no persistent WebSocket connections; implementing polling is fragile and not in project constraints | Batch-on-load is sufficient; stated explicitly as out of scope in PROJECT.md |
| Bot filtering / fraud detection | Requires IP databases, behavioral heuristics, significant ongoing maintenance | Document that bot traffic may appear; a service business with low traffic volumes won't see meaningful bot distortion |
| Per-visitor user identification across devices | Requires fingerprinting or login, introduces privacy/GDPR risk | Anonymous session ID from localStorage is sufficient |
| A/B test attribution | Entirely separate feature with its own infrastructure | Not in scope for v1.2 |
| Cohort / retention analysis | B2C SaaS concept; service business has one-time or annual repurchase cycles | Not meaningful at this traffic volume |
| Revenue attribution / LTV per channel | Requires booking system integration and revenue data that isn't reliably captured today | Deferred; add when booking conversion is confirmed server-side |
| Competitor benchmarking | Requires external data sources | Out of scope entirely |
| Exporting reports as PDF/CSV | Common ask but adds UI complexity and download infrastructure | Deferred; admin can screenshot or use browser print |
| Custom attribution lookback window configuration | Confuses non-technical users; standard 90-day window is fine | Hard-code 90-day window with a "last 30 days" default filter |

---

## Feature Dependencies

```
UTM capture (client-side read) 
  → visitor_sessions table (new DB table, stores UTM + referrer + device + landing page)
  → first-touch stored on first visit (session creation)
  → last-touch updated on each return visit or page load

visitor_sessions table
  → linked to formLeads via sessionId (formLeads.sessionId already exists)
  → linked to analytics_event_hits via sessionId (analytics_event_hits.session_id already exists)

Traffic source auto-classification
  → computed at capture time from document.referrer + utm_medium
  → stored as `source_channel` on visitor_sessions (not re-derived at query time)

Conversion event tracking
  → reuses analytics_event_hits (already has eventName, sessionId, pagePath)
  → no new table needed if existing event names cover the required events
  → generates_lead, form_completed, contact_click already defined in analytics-events.ts

Overview dashboard
  → requires visitor_sessions populated (sessions with and without conversion)
  → requires analytics_event_hits populated (event counts)
  → can be built once visitor_sessions has 1 week of data

Campaign / Source views
  → require visitor_sessions with utm_* columns populated
  → simple GROUP BY aggregations; no new tables needed

Visitor journey view (most complex)
  → requires analytics_event_hits with page_view events per session in sequence
  → requires page_view event emission on every client navigation (currently tracked per analytics-events.ts)
  → requires time-ordered event retrieval per session
```

**Critical path:** `visitor_sessions` table is the single blocker for all Marketing section views. Everything else flows from it.

---

## MVP Recommendation

**Build in this order:**

1. **Visitor session capture** — client-side script that reads UTM params + referrer on every page load, posts to `/api/visitor-sessions` (upsert by sessionId). Store: utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_id, referrer, landing_page, device_type, source_channel (classified), first_seen_at, last_seen_at, converted (bool).

2. **Lead linkage** — when a lead is created/updated, join its `sessionId` to `visitor_sessions` to stamp first-touch and last-touch attribution fields on the lead row. The schema already has `utmSource`, `utmMedium`, `utmCampaign` on `formLeads` — extend to include `utmContent`, `utmTerm`, `sourceChannel`, `firstTouchSource`, `lastTouchSource`.

3. **Overview dashboard tab** — KPIs: total sessions, sessions-to-lead rate, top source this period, top campaign this period. No charts needed in the first iteration; plain numbers pass the "5 seconds to understand" test.

4. **Source view** — table: channel, sessions, leads, HOT leads, conversion rate. Sortable. This directly answers "which channel works best?"

5. **Campaign view** — table: campaign name, source, sessions, leads, conversion rate. Answers paid campaign questions.

6. **Conversions view** — table of recent conversion events by type (lead, phone click, form start). Date-filterable.

7. **Visitor journey view** — DEFER to v1.3. Requires full page_view event stream and is the most complex view. The business value is real but not critical in the first marketing section release.

**Defer:**
- Visitor journey view (complexity High, requires full event stream data)
- Revenue attribution (booking linkage not production-ready)
- Device breakdown filter (implement filter stub but deprioritize the breakout chart)

---

## Existing Code Assets to Leverage

These already exist and reduce scope:

| Asset | Location | How Marketing Uses It |
|-------|----------|----------------------|
| `formLeads.utmSource/utmMedium/utmCampaign` | `shared/schema.ts:192-194` | Already captured; need `utmContent`, `utmTerm`, `sourceChannel` added |
| `formLeads.sessionId` | `shared/schema.ts:165` | The join key between sessions and leads |
| `analytics_event_hits` table | `shared/schema.ts:47-57` | Reuse for conversion event counts; has `session_id`, `event_name`, `page_path` |
| `ANALYTICS_EVENT_NAMES` (typed enum) | `shared/analytics-events.ts:6` | `generate_lead`, `form_completed`, `contact_click`, `form_open`, `form_abandoned` already defined |
| `analyticsEventHits.session_id` | `shared/schema.ts:53` | Enables per-session event lookup without a new table |
| `companySettings.gtm*/ga4*/facebookPixel*` | `shared/schema.ts:527-536` | External analytics already in the settings model; Marketing section should not duplicate these |

**The gap:** There is no `visitor_sessions` table yet. The `formLeads` table captures UTM only when the user actually submits the form. The Marketing section needs session-level data for visitors who never converted — that is the core missing piece.

---

## Business-Owner Vocabulary Map

All UI labels must use the right column, never the left.

| Technical Term | Business-First Label |
|---------------|---------------------|
| utm_source | Traffic Source |
| utm_medium | Channel Type |
| utm_campaign | Campaign Name |
| utm_term | Search Keyword (optional, rarely used) |
| utm_content | Ad Variation |
| organic | Organic Search |
| cpc / paid | Paid Ads |
| social | Social Media |
| referral | External Website |
| direct | Direct / Unknown |
| session | Visit |
| conversion | Lead Generated |
| first-touch | How they first found you |
| last-touch | What brought them back to convert |
| classificacao: HOT | Hot Lead |
| bounce / no conversion | Visited but didn't convert |
| form_completed | Form Submitted |
| contact_click | Phone Number Clicked |
| form_abandoned | Started but didn't finish |

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Visitor session capture | UTM params lost when user navigates to second page (URL changes) — 40% data loss if not persisted | Store to localStorage AND POST to server on first load; sessionId persists in localStorage |
| Traffic source classification | `document.referrer` is empty for direct and app traffic; these incorrectly show as "direct" | Always check UTM first; only fall back to referrer classification when UTMs are absent |
| Internal UTM tagging | If any internal navigation links contain UTM params, every new page becomes a "new campaign" | Document clearly: UTM tags are for external links only; strip them on internal link generation |
| Source/medium normalization | "google" vs "Google" vs "GOOGLE" creates split rows | Lowercase + trim all UTM values at capture time |
| Empty state confusion | Business owner sees empty charts in week 1 and thinks the feature is broken | Build explicit empty states with coach-marks explaining what causes data to appear |
| Lead linkage timing | UTMs may be set on `formLeads` at session creation, but the visitor table is created independently | Visitor session must be created BEFORE the form is ever opened; lead linkage must use the same sessionId |
| Privacy / GDPR for template forks | Some forks may operate in jurisdictions requiring cookie consent for tracking | Document that visitor_sessions uses a localStorage-based anonymous ID; no PII is stored at the session level |

---

## Sources

- PostHog first/last-touch attribution tutorial: https://posthog.com/tutorials/first-last-touch-attribution
- HockeyStack attribution dashboard guide: https://www.hockeystack.com/blog-posts/marketing-attribution-dashboard
- Cometly — questions marketing attribution answers: https://www.cometly.com/post/what-types-of-questions-can-marketing-attribution-answer
- HubSpot traffic source classification: https://knowledge.hubspot.com/reports/understand-hubspots-traffic-sources-in-the-traffic-analytics-tool
- UTM persistence and first-touch patterns: https://voxxycreativelab.com/utm-parameters-to-first-party-cookies/
- Brixon Group — 10 critical UTM mistakes: https://brixongroup.com/en/the-10-critical-utm-parameter-mistakes-that-sabotage-your-marketing-tracking
- Cometly — marketing dashboard examples: https://www.cometly.com/post/marketing-dashboard-examples
- Existing codebase: `shared/schema.ts`, `shared/analytics-events.ts`, `.planning/PROJECT.md`
