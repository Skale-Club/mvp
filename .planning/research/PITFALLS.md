# Domain Pitfalls: UTM Attribution Added to Existing Production System

**Domain:** Marketing attribution layer added to a live service-business web app
**Researched:** 2026-04-25
**Stack context:** React 18 SPA + Wouter + Express + Drizzle/Postgres (Supabase) + Vercel Fluid Compute
**Confidence:** HIGH (official docs + multiple verified sources for browser privacy claims; MEDIUM for DB-specific patterns)

---

## Critical Pitfalls

Mistakes in this category cause silent data corruption, rewriting the attribution model mid-project, or regressions in the live lead/booking flows.

---

### Pitfall 1: Visitor ID Survives Tab Forks — Splits One Real Visitor Into Many

**What goes wrong:** If the visitor UUID is stored in `localStorage` and a user opens a second tab before submitting a form, both tabs share the same localStorage and the same `visitorId`. All events from both tabs merge into one visitor correctly. However, if the visitor ID is stored in `sessionStorage`, each tab gets its own UUID — the same human generates two visitor records, and the attribution counts them as two unique visitors with zero events cross-pollinated.

**Why it happens:** `sessionStorage` is per-tab by design. `localStorage` is shared across all tabs on the same origin. Teams pick `sessionStorage` thinking it is "session-scoped" like a server session, not realizing it breaks multi-tab flows.

**Consequences:** Inflated unique-visitor counts. First-touch attribution assigned to two different records that will never be linked to the same lead. Admin dashboard visitor counts become unreliable. The lead that comes in has one `visitorId`; the other tab's visitor record becomes a ghost row.

**Prevention:** Store `visitorId` in `localStorage`, not `sessionStorage`. Use `crypto.randomUUID()` with a `|| existingId` guard so the key is written once and reused on every subsequent page load from any tab. Generate UUID client-side on first load, persist immediately.

**Detection:** Two visitor rows in the attribution table where one has zero conversion events and both share the same IP + user agent within the same time window.

**Build phase:** Phase 1 (visitor capture foundation). Getting this wrong here forces a data migration to fix visitor de-duplication later.

---

### Pitfall 2: UTM Parameters Lost When Wouter Performs Client-Side Navigation

**What goes wrong:** This is an SPA with Wouter routing. When a visitor lands on `/?utm_source=google&utm_medium=cpc`, the browser URL contains the UTMs. If the user then clicks a nav link and Wouter pushes `/services`, the original URL params are gone. If attribution capture reads `window.location.search` at conversion time (not at initial load), it finds nothing.

**Why it happens:** SPAs update the URL without a real browser navigation. `document.referrer` remains the same across all Wouter transitions. Any code that reads URL params reactively (e.g., inside a route component's render) instead of eagerly on first mount will read an empty search string after navigation.

**Consequences:** Every conversion that happens after a page navigation (which is most of them — user lands on homepage, browses services, then fills the form) will show UTM source as null/direct. First-touch attribution will be blank even when the user demonstrably came from a campaign.

**Prevention:** Capture UTM parameters once, eagerly, at application root mount (e.g., `App.tsx` `useEffect` with `[]` dependency). Read `window.location.search` at that moment and persist to `localStorage` immediately before any routing happens. Do not re-read on route changes.

**Detection:** Internal navigation events show UTM = null while the first pageview event (same visitor ID) shows UTM = google/cpc.

**Build phase:** Phase 1 (client-side capture hook). This is a single-point-of-failure: capture location in App root, never in page components.

---

### Pitfall 3: Safari ITP Deletes localStorage After 7 Days of Inactivity — First-Touch Lost for Long Sales Cycles

**What goes wrong:** Safari (ITP 2.3+, still active in 2025–2026) purges all non-cookie browser storage — `localStorage`, `sessionStorage`, `IndexedDB` — after 7 days of user inactivity on the domain. For a service business where a prospect visits from a Google Ad, goes dark for 10 days, then returns directly to book, Safari will have deleted the `visitorId` and stored UTMs. A new `visitorId` is generated on the return visit. The conversion is attributed to "direct" when it was actually paid search.

**Why it happens:** ITP targets cross-site tracking, but its storage purge is domain-scoped and applies even to first-party localStorage. The 7-day clock resets only if the user actively visits the site during that window.

**Consequences:** Service businesses typically have longer lead cycles than e-commerce. A prospect researching a remodeling or on-demand service may take 2–3 weeks. For Safari users (roughly 20-25% of mobile traffic in 2025), first-touch attribution becomes unreliable for any conversion that happens more than a week after the original visit.

**Prevention:**
1. Send the `visitorId` to the server on first creation and store it in the `visitor_sessions` table. This is the authoritative record.
2. On return visits where localStorage has been cleared, the visitor ID is lost client-side, but the server record persists. Accept that re-identification is impossible without login — this is a known limitation.
3. Server-side HTTP cookies set with `Set-Cookie` response headers (not `document.cookie` JavaScript) bypass ITP's 7-day limit on JavaScript-set cookies. A server-set `HttpOnly` cookie with `SameSite=Lax` and a long `Max-Age` (90 days) will survive ITP. This is the strongest mitigation.
4. Do NOT claim first-touch accuracy beyond 7 days for Safari users in documentation or admin UI. Label the limitation transparently.

**Detection:** Compare conversion attribution by browser. Safari conversions showing abnormally high "direct" percentage relative to Chrome is the fingerprint.

**Build phase:** Phase 1 (visitor session API). Store the visitorId server-side on creation. Cookie-based visitor ID is an enhancement, but the server record is the safety net.

---

### Pitfall 4: The `formLeads.sessionId` Is Not the Same as the Attribution `visitorId`

**What goes wrong:** `formLeads` already has a `sessionId uuid` column (used for upsert-based form progress). This `sessionId` is a per-form-session UUID — it is not a persistent visitor identifier. If the attribution system re-uses this same field as the visitor ID for attribution, or if it conflates the two concepts, the join between attribution data and lead data becomes ambiguous.

**Why it happens:** Both are UUIDs stored in localStorage. Without explicit naming discipline, the same key name (`sessionId`) gets reused for both purposes, or two separate keys exist but the server receives the wrong one.

**Consequences:**
- A visitor can have multiple form sessions (abandoned form + later completion). Each generates a different `formLeads.sessionId`. But it is still one visitor, and both form events should share the same `visitorId` for attribution.
- If `visitorId == sessionId` in the code, the first-touch attribution belongs to the first form session, and the second form session has no attribution at all.
- The admin dashboard shows disconnected data.

**Prevention:** Use a separate, dedicated localStorage key for `visitorId` (`mvp_visitor_id` or similar namespaced key). The `formLeads.sessionId` remains unchanged and retains its existing semantics. Add a `visitorId` FK column to `formLeads` as an optional reference to the attribution `visitor_sessions` table. Never merge or alias these two identifiers.

**Detection:** Code review — any place where `localStorage.getItem('sessionId')` is used for both form upsert and attribution tracking.

**Build phase:** Phase 1 (schema design). Define the two IDs, their storage keys, and their relationship in a decision record before writing any code.

---

### Pitfall 5: Attribution API Writes Block or Slow the Lead Submit Critical Path

**What goes wrong:** If the UTM capture POST to `/api/attribution/session` is called as `await` inside the same flow as `POST /api/form-leads/progress`, a slow or failing attribution write delays or breaks the lead submission. The attribution write is a nice-to-have; the lead submission is revenue-critical.

**Why it happens:** Developers chain async calls because it is the natural pattern. Attribution feels like part of the same "on form submit" action.

**Consequences:** Any DB slowness on the attribution table (cold Vercel instance, Supabase connection pool saturation, index rebuild) causes the lead form to time out or fail. The business loses leads because of analytics infrastructure.

**Prevention:**
- Send attribution data via `navigator.sendBeacon()` (fire-and-forget, survives page unloads) for all non-critical tracking calls.
- For session creation (which happens at page load, not at form submit), call the attribution API fire-and-forget — do not `await` it in any user-facing flow.
- The lead submit route on the server should not call attribution code synchronously. Attribution enrichment (attaching `visitorId` to a completed lead) can be done as a background step or via a separate endpoint.
- Treat attribution API failures as silent — log them server-side but never surface errors to the user.

**Detection:** Any `await` on an attribution API call in the same call stack as the form submit handler or booking creation.

**Build phase:** Phase 1 (API design) and Phase 2 (conversion event wiring). Review all attribution API calls for async isolation before each phase ships.

---

### Pitfall 6: Referrer-Based Auto-Classification Is Unreliable Without a Maintained Domain List

**What goes wrong:** The plan includes auto-classifying non-UTM traffic as "organic," "social," "referral," "direct," or "unknown" by examining `document.referrer`. This classification depends on recognizing social media domains (facebook.com, instagram.com, twitter.com/x.com, linkedin.com, tiktok.com, pinterest.com, youtube.com) and search engine domains. These lists change — X replaced Twitter, Threads emerged, new platforms appear.

**Why it happens:** The classification logic is written once with a hardcoded domain list and never updated. Within 12 months, new traffic sources produce "referral" instead of "social" because their domains are not in the list.

**Consequences:** Admin sees inflated "referral" traffic and understated "social" traffic. Business owner makes ad spend decisions on wrong data.

**Prevention:**
- Keep the classification list in a configurable constant, not buried in business logic — easy to update without schema changes.
- Build in an "unknown referral" category that preserves the raw referrer domain even when no classification matches, so the admin can see unclassified sources.
- Store the raw `referrer` domain alongside the classified `source` channel — classification can be retroactively corrected without losing raw data.

**Detection:** `document.referrer` domain not matching any classification rule produces "unknown" or "referral" when it should be "social."

**Build phase:** Phase 1 (classification logic). Design for easy list updates from day one.

---

## Moderate Pitfalls

### Pitfall 7: Missing Indexes on Attribution Tables Cause Dashboard Queries to Full-Scan

**What goes wrong:** The admin marketing dashboard runs aggregate queries over visitor sessions and conversion events — GROUP BY source/medium/campaign, filtered by date range and conversion type. Without proper indexes on `created_at`, `utm_source`, `utm_medium`, `conversion_type`, and `visitor_id`, these queries do full table scans. At even modest volume (10,000 visitor records), Supabase Postgres will be slow enough for the admin to notice.

**Why it happens:** The schema is written with Drizzle without thinking about query patterns. Indexes are added reactively when slowness is observed, but by then the table may already have rows.

**Consequences:** Admin dashboard loads slowly. If the owner queries large date ranges, Supabase may hit connection timeouts. Supabase free/pro tiers have limits on query execution time.

**Prevention:** Define indexes in `shared/schema.ts` at schema creation time, not after data exists. Required indexes:
- `visitor_sessions`: composite on `(created_at, utm_source, utm_medium)` for campaign queries; index on `visitor_id` for lookup.
- `conversion_events`: index on `visitor_id`, `conversion_type`, `created_at`.
- `attribution_touches`: index on `visitor_id`.
- Run Drizzle `db:push` in development with `EXPLAIN ANALYZE` on the expected dashboard queries before shipping.

**Detection:** Run `EXPLAIN ANALYZE` on dashboard aggregate queries in Supabase's SQL editor before deploying the marketing section.

**Build phase:** Phase 1 (schema). Add indexes at table creation. Phase 3 (dashboard) — verify with EXPLAIN before shipping.

---

### Pitfall 8: gclid and fbclid Stripped by iOS 26 / Safari 2025+ in All Browsing Modes

**What goes wrong:** As of iOS 26 (expected 2025), Safari strips `gclid`, `fbclid`, `msclkid`, and similar click ID parameters from URLs before the page loads — in all browsing modes, not just private. This affects approximately 24% of global browser traffic. UTM parameters (`utm_source`, `utm_medium`, etc.) are NOT stripped, only click IDs.

**Why it happens:** Apple's Link Tracking Protection extended from Private Browsing to standard browsing mode.

**Consequences:** For this project, which is capturing standard UTM parameters rather than raw click IDs, the direct impact is limited. However, if any admin-configured ad campaigns rely on click IDs for attribution (e.g., Google Ads auto-tagging with gclid), those IDs will be invisible. The attribution system should not depend on click ID parameters — it should depend on UTMs only.

**Prevention:**
- Document in the attribution system that click IDs (`gclid`, `fbclid`) are not captured — only UTM params.
- Advise the business owner (via admin UI copy) to always add UTM parameters to ad links. Auto-tagging alone (gclid) is insufficient for this system.
- The raw `landingPage` URL is stored but click IDs should be explicitly excluded from storage (they are PII-adjacent and will frequently be empty or stripped anyway).

**Detection:** A/B comparing attribution accuracy between Chrome and Safari conversions will show the impact.

**Build phase:** Phase 1 (parameter capture logic). Explicitly capture only the five standard UTM parameters plus referrer. Do not capture click IDs.

---

### Pitfall 9: Vercel Fluid Compute Runs Multiple Instances — Visitor Session Deduplication Needs Postgres, Not Memory

**What goes wrong:** The existing codebase correctly notes Vercel Fluid Compute as the deployment target. A visitor may hit different function instances across page loads. If any deduplication or "is this visitor already known?" logic is held in module-level memory (e.g., a `Set<string>` of known visitor IDs), it will be wrong — each Vercel instance has its own memory and will not share state.

**Why it happens:** Developers write in-memory deduplication as an optimization to avoid DB round trips on every page load.

**Consequences:** The same `visitorId` gets inserted multiple times into the visitor sessions table (violating a unique constraint, causing 500 errors for the visitor), or worse, the uniqueness constraint is absent and the table accumulates duplicate rows, breaking aggregate queries.

**Prevention:**
- The `visitor_sessions` table must have a `UNIQUE` constraint on `visitor_id`.
- The insert must use an upsert pattern (`INSERT ... ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`) to be safe under concurrent duplicate requests.
- Never rely on application-layer deduplication for stateful correctness. Let Postgres enforce it via the unique constraint.

**Detection:** Check for `ON CONFLICT` in the Drizzle insert for visitor sessions. Absence = this pitfall is active.

**Build phase:** Phase 1 (session storage API). Enforce at schema level.

---

### Pitfall 10: Last-Touch "Overwrite Everything" Logic Corrupts First-Touch When Both Are Updated in the Same Request

**What goes wrong:** If first-touch and last-touch attribution are stored on the same `visitor_sessions` row and last-touch is updated on every conversion event, a code mistake can cause first-touch columns to be overwritten by the last-touch update (e.g., an ORM `.update()` call that includes all fields instead of only the last-touch fields).

**Why it happens:** Drizzle `.update()` with a spread of all UTM fields sets all attribution fields on every call. If the business logic says "update last touch on new event," but the implementation spreads the full UTM payload onto the row, the original first-touch values are overwritten.

**Consequences:** Every visitor's first-touch becomes identical to their last-touch. The first-touch attribution feature is effectively broken without any error — data looks plausible but is wrong.

**Prevention:**
- Store first-touch and last-touch in separate columns with explicit names (`first_touch_source`, `last_touch_source`, etc.) or in a separate `attribution_touches` table.
- The first-touch columns must only be written once (on visitor session creation) and must never be updated.
- Enforce this in the storage layer: the `updateLastTouch` method must explicitly name only last-touch columns in the Drizzle update — never use `...spread` of a full UTM object.
- Code review checkpoint: any `.update()` on the session or attribution table must list each column explicitly.

**Detection:** Query first-touch and last-touch for any visitor with more than one event — if they are always equal, this pitfall has fired.

**Build phase:** Phase 2 (attribution writes). Write explicit column names in every update, add a code review note in the PR checklist.

---

### Pitfall 11: "Phone Click" and "Quote Request" Conversion Events Fire Multiple Times per Session

**What goes wrong:** A visitor clicks the phone number button 3 times on the same visit. Each click fires a `contact_click` event. If the conversion event table records each one, the conversion count for that channel is inflated. The admin dashboard shows 3 conversions from one visitor, making that campaign's conversion rate look 3× better than it is.

**Why it happens:** Event tracking fires on DOM events (click handlers) without deduplication. The same conversion type should logically count once per visitor session for most metrics.

**Consequences:** Phone-click conversion rate is overstated. Budget allocation toward channels that generate many phone clicks from single visitors looks better than channels that generate fewer but more varied conversion types.

**Prevention:** Choose a deduplication strategy explicitly and implement it:
- Option A: Store last conversion event timestamp per type per visitor. On new event, only insert if more than N minutes have passed since the same type.
- Option B: Insert all raw events but aggregate on read — the dashboard query counts `DISTINCT visitor_id` per conversion type, not raw event count.
- Option B is safer (preserves raw data) and is the recommended approach. Dashboard queries use `COUNT(DISTINCT visitor_id)` not `COUNT(*)` for "converted visitors" metrics.

**Detection:** Any conversion event query in the dashboard that uses `COUNT(*)` instead of `COUNT(DISTINCT visitor_id)` without filtering by deduplication logic.

**Build phase:** Phase 2 (conversion events) and Phase 3 (dashboard queries). Design the aggregate query pattern before writing the frontend.

---

### Pitfall 12: Admin Dashboard Queries Without Date Bounds Scan the Entire Attribution Table

**What goes wrong:** The admin marketing dashboard has global date filters, but if those filters are optional and a user removes them, the underlying queries scan all rows in `visitor_sessions` and `conversion_events`. On a busy site after 12 months of data, an unbounded query could time out in Supabase.

**Why it happens:** Date filters are implemented as optional WHERE clauses. When omitted, the query is `SELECT * FROM visitor_sessions` with aggregates — full scan.

**Prevention:**
- Make date range non-optional in the API layer: always apply a default range (e.g., last 30 days) even if the UI does not send one.
- Enforce this in the Express route handler, not just the frontend — the server should set a default date range before building the Drizzle query.
- Add `created_at` as the first column in every composite index on attribution tables (enables Postgres to use index-only scans for date-filtered aggregates).

**Detection:** API routes for dashboard endpoints that accept date range as optional and do not set a server-side default.

**Build phase:** Phase 3 (dashboard API). Default date range should be set in route handler, not frontend.

---

## Minor Pitfalls

### Pitfall 13: Inconsistent UTM Casing Creates Phantom Duplicate Sources

**What goes wrong:** One campaign link uses `utm_source=Google`, another uses `utm_source=google`. Postgres stores them as-is. Dashboard shows two separate source rows: "Google" and "google", each with half the data.

**Prevention:** Normalize all UTM values to lowercase before storing. Apply `.toLowerCase()` at the point of capture (client side) and again at the server before DB insert. Store lowercase only. This is a two-line fix that prevents permanent data fragmentation.

**Build phase:** Phase 1 (capture and storage). One-time decision, applied everywhere.

---

### Pitfall 14: `document.referrer` Is Empty for Internal Navigation — Wrongly Classified as "Direct"

**What goes wrong:** Wouter client-side navigation sets `document.referrer` to the previous page on the same domain (or empty string on tab restore). If referrer classification checks whether the referrer matches the site's own domain and falls through to "direct" when it does, every page transition within the SPA incorrectly increments the "direct" count.

**Prevention:** When reading `document.referrer`, check if the referrer hostname matches `window.location.hostname`. If it does, ignore the referrer entirely — this is an internal navigation, not an external source. Only capture `document.referrer` on the very first page load (when the referrer is from an external domain), which is already stored at initial visit time.

**Build phase:** Phase 1 (classification logic). Test with `document.referrer` pointing to same-origin URLs.

---

### Pitfall 15: Attribution Schema Added Without RLS Policies — Data Exposed via Supabase Anon Key

**What goes wrong:** This project uses Supabase with RLS. New Drizzle tables pushed to Supabase have RLS disabled by default (accessible to all roles) or have no policies at all. The Supabase anon key, if exposed to the browser (which it is, since it is used for auth), can be used to query attribution data directly via the Supabase REST API, bypassing the Express server.

**Why it happens:** The team uses Drizzle for schema management, not Supabase migrations. `db:push` creates tables but does not create RLS policies. The oversight is easy to miss because the Express API works fine — the RLS gap is in the Supabase direct API path.

**Consequences:** All visitor sessions, conversion events, and UTM data (including any phone numbers or emails attached to conversions) is readable by anyone who knows the project's Supabase URL and anon key (both included in the client bundle).

**Prevention:**
- After each `db:push`, explicitly enable RLS on all new attribution tables via Supabase dashboard or a migration SQL file.
- The policy for attribution tables: allow INSERT from authenticated users (server uses service role key) and SELECT from authenticated admin users only. Deny all from anon role.
- Add RLS verification to the post-phase checklist: check Supabase dashboard "Authentication > Policies" for each new table before shipping.

**Build phase:** Phase 1 (schema). Verify RLS after every `db:push`. This is a production-critical security concern.

---

### Pitfall 16: `sendBeacon` Payload Size Limit Causes Silent Drop of Large Attribution Payloads

**What goes wrong:** `navigator.sendBeacon()` has a browser-enforced payload size limit (typically 64 KB). If the attribution payload includes the full raw UTM parameters, referrer, user agent, landing page URL, and any custom data, it is well within limits. However, if conversion events are batched (sending multiple events in one beacon) or if the payload includes large JSON structures (e.g., full session history), it may be silently dropped.

**Prevention:** Keep beacon payloads minimal — one event per beacon, only the fields needed for that event. Never batch or include session history in the beacon body. Verify individual payload sizes are under 10 KB in testing.

**Build phase:** Phase 2 (conversion event beacons). Review payload construction before deploying.

---

### Pitfall 17: Attribution Data in `formLeads` Columns Is Partial — Three Fields vs. Full Model

**What goes wrong:** The existing `formLeads` table already stores `utmSource`, `utmMedium`, and `utmCampaign` (three of the five standard UTM params). The new attribution system captures all five (`utm_term` and `utm_content` too) plus `utm_id`, referrer, landing page, and device type. There are now two places where attribution data lives for a lead: the partial data in `formLeads` and the full data in the new attribution tables.

**Consequences:** The admin Leads section and the admin Marketing section will disagree on attribution for the same lead. A lead sourced from `utm_campaign=spring-sale&utm_content=video` shows `campaign=spring-sale` in the existing leads view but has full attribution data only in the marketing view.

**Prevention:**
- Do not remove or modify the existing `formLeads` UTM columns — this would require a migration and risks breaking existing lead exports or integrations.
- Treat the existing columns as a legacy fallback. When attaching a `visitorId` FK to a lead, the authoritative attribution always comes from the attribution tables.
- When displaying lead details in the admin, show attribution from the visitor session table if a `visitorId` link exists, falling back to the existing `formLeads` UTM columns if it does not.
- Document this dual-source reality in the admin UI.

**Build phase:** Phase 2 (conversion linking). Explicitly define the precedence rule before writing the leads detail query.

---

## Phase-Specific Warnings

| Build Phase | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Client capture hook | Pitfall 2 (Wouter nav wipes UTMs) | Capture in App root useEffect with [] — one call, never in route components |
| Phase 1: Client capture hook | Pitfall 1 (sessionStorage splits tabs) | Use localStorage for visitorId, not sessionStorage |
| Phase 1: Visitor session API | Pitfall 3 (Safari ITP 7-day purge) | Server stores visitorId on creation; server-set cookie is the strong mitigation |
| Phase 1: Visitor session API | Pitfall 9 (Vercel multi-instance) | Unique constraint + ON CONFLICT upsert in Drizzle insert |
| Phase 1: Schema design | Pitfall 4 (sessionId vs visitorId confusion) | Separate localStorage keys, separate table columns, decision record |
| Phase 1: Schema design | Pitfall 7 (missing indexes) | Add indexes at table creation in shared/schema.ts |
| Phase 1: Schema design | Pitfall 15 (no RLS) | Enable RLS and add policies after db:push |
| Phase 1: Classification logic | Pitfall 6 (stale referrer domain list) | Configurable constant + raw referrer stored alongside classification |
| Phase 1: Classification logic | Pitfall 14 (same-origin referrer = direct) | Ignore referrer if hostname matches own domain |
| Phase 1: UTM normalization | Pitfall 13 (case variants) | Lowercase normalization at capture and at server insert |
| Phase 2: Attribution writes | Pitfall 10 (first-touch overwritten) | First-touch columns written once; explicit column names in every Drizzle update |
| Phase 2: Conversion events | Pitfall 5 (attribution blocks lead submit) | sendBeacon for all tracking; no await in critical path |
| Phase 2: Conversion events | Pitfall 11 (duplicate phone click events) | Aggregate with COUNT(DISTINCT visitor_id) in dashboard queries |
| Phase 2: Conversion events | Pitfall 16 (sendBeacon size) | One event per beacon, payload < 10 KB |
| Phase 2: Lead linking | Pitfall 17 (partial UTMs in formLeads) | Define precedence rule: attribution table wins when visitorId link exists |
| Phase 2: Click ID capture | Pitfall 8 (gclid/fbclid stripped by iOS 26) | Do not capture click IDs; instruct business owner to always use UTMs |
| Phase 3: Dashboard API | Pitfall 12 (unbounded date scan) | Server enforces default date range; created_at in composite index |
| Phase 3: Dashboard queries | Pitfall 11 (duplicate events inflate conversions) | COUNT(DISTINCT visitor_id) not COUNT(*) for conversion metrics |

---

## Sources

- Safari ITP 7-day localStorage purge: [Snowplow Blog (2023, policy still active 2025)](https://snowplow.io/blog/tracking-cookies-length), [Avenga ITP FAQ](https://www.avenga.com/magazine/intelligent-tracking-prevention-faq/)
- iOS 26 / Safari gclid/fbclid stripping: [conversios.io Safari GCLID Removal Guide 2025](https://www.conversios.io/blog/how-to-fix-safari-gclid-removal-2025/), [Affect Group Blog](https://affectgroup.com/blog/safari-s-new-update-click-identifiers-removed-from-urls/)
- SPA attribution problems (Wouter/React navigation, referrer stale): [Markus Baersch on Medium — Attribution Problems in SPAs](https://mbaersch.medium.com/attribution-problems-in-spas-solutions-and-caveats-9362fbe8ac3a)
- Persistent UTM tracking failures and up-to-40% data loss: [FiveNine Strategy Persistent UTM Guide](https://fiveninestrategy.com/persistent-utm-tracking-guide/)
- 10 critical UTM mistakes (technical implementation failures): [Brixon Group UTM Mistakes 2026](https://brixongroup.com/en/the-10-critical-utm-parameter-mistakes-that-sabotage-your-marketing-tracking)
- Universal attribution for service/event businesses: [Codarity — Universal Attribution for Event Businesses](https://codarity.com/universal-attribution-tracking-event-business-data-layer/)
- Supabase RLS with service role key: [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Vercel Fluid Compute cold starts and background task handling: [Vercel — Scale to One: Fluid Compute](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts)
- Cross-tab localStorage race conditions: [Medium — localStorage can break multi-tab sessions](https://medium.com/@tofayelislam/lesson-learned-why-localstorage-can-break-multi-tab-sessions-bfb5164579de)
- UTM tracking in SPAs (client-side routing): [AbleCDP — Tracking in React and SPA Frameworks](https://www.ablecdp.com/integration-guides/tracking-in-react-vue-js-and-other-spa-frameworks)
- Vercel cookies and SameSite config: [Vercel — Understanding the SameSite Cookie Attribute](https://vercel.com/blog/understanding-the-samesite-cookie-attribute)
