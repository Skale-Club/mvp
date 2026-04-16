---
phase: 01-lead-notification-log
plan: 04
type: execute
wave: 1
depends_on: ["01-01", "01-02", "01-03"]
files_modified:
  - client/src/components/admin/shared/types.ts
  - client/src/components/admin/shared/routes.ts
  - client/src/components/admin/NotificationLogSection.tsx
  - client/src/components/admin/LeadsSection.tsx
  - client/src/pages/Admin.tsx
autonomous: false
---

<objective>
## Goal
Surface the notification log to admins in two places: (1) a new global admin section "Notification Log" with a filterable table and preview dialog, (2) an inline panel inside the existing lead detail modal showing all notifications for that single lead. Both consume the endpoints built in plan 01-03.

## Purpose
This is the final plan of Phase 1 — the feature the user originally requested ("log das notificacoes que foram enviadas, com um preview delas e pra quais telefones e emails"). After this plan, operators can audit every notification from the admin UI, per-lead and globally.

## Output
- `NotificationLog` added to the admin route/sidebar registry and the `AdminSection` type union
- New component `client/src/components/admin/NotificationLogSection.tsx` with filters (channel/status/trigger/search/date-range) + table + preview dialog
- `LeadsSection.tsx` lead detail modal gets a new "Notifications" panel — fetched on demand when a lead is opened
- `Admin.tsx` switch renders `<NotificationLogSection />` when `activeSection === 'notificationLog'`
- Typecheck clean; browser verified end-to-end
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/STATE.md
@.paul/phases/01-lead-notification-log/01-01-SUMMARY.md
@.paul/phases/01-lead-notification-log/01-02-SUMMARY.md
@.paul/phases/01-lead-notification-log/01-03-SUMMARY.md

## Source Files
@client/src/components/admin/LeadsSection.tsx
@client/src/components/admin/shared/routes.ts
@client/src/components/admin/shared/types.ts
@client/src/components/admin/shared/constants.ts
@client/src/pages/Admin.tsx
@client/src/lib/queryClient.ts
@shared/routes.ts
</context>

<acceptance_criteria>

## AC-1: New admin section appears in sidebar and routes
```gherkin
Given an admin logs in at /admin
When the sidebar menu renders
Then a "Notification Log" item is present with an appropriate icon
  And clicking it navigates to /admin/notification-log
  And Admin.tsx renders <NotificationLogSection /> for that route
  And resolveAdminLocation("/admin/notification-log") returns section="notificationLog"
```

## AC-2: Global Notification Log page
```gherkin
Given an admin is on /admin/notification-log
When the page first loads
Then a table shows the most recent 100 rows from GET /api/admin/notification-logs, newest first
  And each row displays: sent time, channel (badge), trigger, recipient (phone/email), status (badge), preview snippet
  And a "View" action opens a preview dialog showing the full `preview` content
  And email previews render HTML inside a sandboxed iframe (sandbox="" srcDoc=html) — no scripts execute
  And SMS / ghl_sync previews render as plain text / formatted JSON

Given filters are present
When the admin changes channel/status/trigger/search/from/to
Then the query re-fires via React Query with a queryKey including the filters
  And results update without a full page reload
  And invalid filter combinations produce a toast with the Zod error message
```

## AC-3: Per-lead notifications panel
```gherkin
Given an admin opens a lead from LeadsSection
When the lead detail modal mounts
Then a new section "Notifications" is visible inside the modal (after the detail grid, before form answers)
  And it fetches GET /api/form-leads/:id/notifications on open (not eagerly for all leads)
  And it displays a compact list: time, channel icon, recipient, status, preview snippet, "View" button
  And clicking "View" opens the same preview dialog used by the global page
  And an empty state ("No notifications sent yet for this lead") shows when the array is empty
  And a loading state shows while fetching
```

## AC-4: Sidebar navigation and page state
```gherkin
Given the user is on /admin/notification-log and applies filters
When they navigate to another section and back
Then filters are NOT preserved across navigation (they reset to defaults — simpler for v1.1)
  And returning to the page fetches fresh data
```

## AC-5: No regressions
```gherkin
Given the current codebase
When `npm run check` runs
Then TypeScript compiles with 0 errors
  And existing admin sections still render
  And LeadsSection's existing modal behavior is unchanged except for the new panel
  And `npm run dev` starts without runtime error
```

## AC-6: Human verification
```gherkin
Given all automated steps complete
When the developer opens the app in a browser with an admin session
Then they can verify end-to-end:
  - Sidebar shows "Notification Log"
  - The page loads rows and a preview dialog works for all three channels
  - Opening a lead shows its per-lead notifications
  - No console errors, no 500s, no layout regressions
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Register notificationLog section in routes + types + sidebar</name>
  <files>client/src/components/admin/shared/types.ts, client/src/components/admin/shared/routes.ts</files>
  <action>
    ### client/src/components/admin/shared/types.ts

    Append `'notificationLog'` to the `AdminSection` union type (around lines 3-16). Keep alphabetical / existing order preserved; the test Explore reported the union lists ~14 sections. Add the new key in a sensible place — near 'leads' makes semantic sense, so insert between 'leads' and the next one.

    ### client/src/components/admin/shared/routes.ts

    Append a new entry to `ADMIN_ROUTES`:
    ```ts
    { id: 'notificationLog', slug: 'notification-log', title: 'Notification Log', icon: Bell },
    ```
    Place it immediately after the `leads` entry so it sits next to its semantically related section in the sidebar.

    If the `Bell` icon isn't already imported at the top of that file, add it to the `lucide-react` import. If `Bell` isn't available, fall back to `Activity` or `History` — pick whichever is already present before adding a new import.

    Avoid:
    - Do NOT reshape the ADMIN_ROUTES array into a different structure — strict append.
    - Do NOT edit `client/src/components/admin/shared/constants.ts` — SIDEBAR_MENU_ITEMS is derived from ADMIN_ROUTES automatically.
    - Do NOT add `hiddenInSidebar: true` — this section must be visible in the sidebar.
  </action>
  <verify>`npm run check` passes; `grep -n "notificationLog" client/src/components/admin/shared/types.ts client/src/components/admin/shared/routes.ts` shows both additions</verify>
  <done>AC-1 partial (section registered) — render wiring happens in Task 4</done>
</task>

<task type="auto">
  <name>Task 2: Build global NotificationLogSection component</name>
  <files>client/src/components/admin/NotificationLogSection.tsx</files>
  <action>
    Create `client/src/components/admin/NotificationLogSection.tsx` mirroring the style and structure of `LeadsSection.tsx`. Required elements:

    1. **Imports**: React, `useQuery` from `@tanstack/react-query`, `apiRequest` from `@/lib/queryClient`, shadcn primitives (`Input`, `Select`, `Button`, `Table`, `Badge`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`), lucide icons (`Mail`, `MessageSquare`, `RefreshCw`, `Eye`), `type NotificationLog` from `#shared/schema`, `api` from `#shared/routes`.

    2. **Filter state** (use the same shape + useState pattern as LeadsSection):
       ```ts
       const [filters, setFilters] = useState<{
         search: string;
         channel: "all" | "sms" | "email" | "ghl_sync";
         status: "all" | "sent" | "failed" | "skipped";
         trigger: "all" | "lead_completed" | "lead_abandoned" | "new_chat" | "low_performance" | "contact_form";
         from: string; // empty string or ISO date
         to: string;
       }>({
         search: "",
         channel: "all",
         status: "all",
         trigger: "all",
         from: "",
         to: "",
       });
       ```
       The trigger whitelist is the current set known to the integration layer (per the 01-02 decisions). Changing it requires a code change — acceptable per the 01-03 decision.

    3. **Query**: `useQuery<NotificationLog[]>({ queryKey: ["/api/admin/notification-logs", filters], queryFn })` where queryFn builds a URLSearchParams from non-"all" / non-empty filters, `apiRequest('GET', ...)`, `.json()`.

    4. **Layout**:
       - Page header: `<h2>` title + subtitle + Refresh button (invalidates the query).
       - Filter row (flex/grid): search Input, channel Select, status Select, trigger Select, `<Input type="date">` for from + to. On change → setFilters.
       - Table: columns (Time, Channel, Trigger, Recipient, Status, Preview, Action). Use shadcn `Table` / `TableHeader` / `TableRow` / `TableCell`. Render at most the first 120 chars of `preview` with `…` truncation.
       - Row action: "View" button opens a `Dialog` showing the full preview. The Dialog receives the currently selected row from local component state (`selectedLog`).
       - Empty state (no rows), loading state (spinner or "Loading…"), error state (toast or inline message).

    5. **Preview dialog**:
       - For `channel === "email"`: render `<iframe srcDoc={log.preview} sandbox="" className="w-full min-h-[400px] border rounded" />` (sandboxed — blocks scripts, forms, same-origin). Also show subject above the iframe.
       - For `channel === "sms"`: render `<pre className="whitespace-pre-wrap text-sm">{log.preview}</pre>`.
       - For `channel === "ghl_sync"`: attempt `JSON.parse(log.preview)` inside a try/catch; if valid JSON, pretty-print with `JSON.stringify(parsed, null, 2)` in a `<pre>`; if not, render raw text.
       - Also show: sentAt (human-formatted), recipient (+ recipientName if present), status badge, providerMessageId (if set), errorMessage (if status === "failed", in red).

    6. **Badge colors**:
       - Channel: sms → blue, email → purple, ghl_sync → amber (Tailwind/shadcn variants).
       - Status: sent → green, failed → red, skipped → gray.

    7. **Typing for filter Select components**: use `useMemo` or simple array literals for the option list, mapping enum label to value.

    8. **data-testid attributes** on key elements (table, filter inputs, preview dialog, view buttons) following the `admin-` prefix convention used in LeadsSection where present.

    Avoid:
    - Do NOT fetch more than 100 rows initially (the storage default) — no auto-scroll pagination in v1.1.
    - Do NOT render email HTML directly in the DOM (XSS) — always iframe sandboxed.
    - Do NOT attempt React Query deduping tricks — queryKey with filters object is enough.
    - Do NOT add "Resend" / "Mark as read" buttons (deferred).
    - Do NOT memoize aggressively — React Query handles caching.
  </action>
  <verify>`npm run check` passes; file exists and default-exports a React component `NotificationLogSection`</verify>
  <done>AC-2 satisfied (structural + feature requirements); AC-5 partially (typecheck clean)</done>
</task>

<task type="auto">
  <name>Task 3: Add Notifications panel to lead detail modal in LeadsSection</name>
  <files>client/src/components/admin/LeadsSection.tsx</files>
  <action>
    Edit `client/src/components/admin/LeadsSection.tsx`:

    1. **Add imports** if not already present:
       ```ts
       import type { NotificationLog } from "#shared/schema";
       ```

    2. **Inside the component**, add a `useQuery` that fetches per-lead notifications — **gated on the modal being open and a lead being selected** (use the `enabled` option):
       ```ts
       const { data: leadNotifications = [], isLoading: isLoadingNotifications } = useQuery<NotificationLog[]>({
         queryKey: ["/api/form-leads", selectedLead?.id, "notifications"],
         queryFn: async () => {
           const res = await apiRequest("GET", `/api/form-leads/${selectedLead!.id}/notifications`);
           return res.json();
         },
         enabled: Boolean(isLeadDialogOpen && selectedLead?.id),
       });
       ```
       Name variables to match existing LeadsSection conventions — check the existing `selectedLead` / `isLeadDialogOpen` names and match them exactly.

    3. **Inside the Dialog content** (around line 626-715 per the Explore report), insert a new section between the form-answers section and the end (or wherever is most natural, between the detail grid and the notes/form answers). Structure:
       ```tsx
       <div className="space-y-2">
         <h4 className="text-sm font-semibold">Notifications ({leadNotifications.length})</h4>
         {isLoadingNotifications ? (
           <p className="text-sm text-muted-foreground">Loading…</p>
         ) : leadNotifications.length === 0 ? (
           <p className="text-sm text-muted-foreground">No notifications sent yet for this lead.</p>
         ) : (
           <ul className="space-y-2" data-testid="lead-notifications-list">
             {leadNotifications.map((n) => (
               <li key={n.id} className="border rounded p-3 text-sm flex items-start justify-between gap-3">
                 <div className="min-w-0 flex-1">
                   <div className="flex items-center gap-2 flex-wrap">
                     {/* channel badge */}
                     {/* status badge */}
                     <span className="text-xs text-muted-foreground">{formatDateTime(n.sentAt)}</span>
                   </div>
                   <div className="mt-1 text-xs text-muted-foreground">
                     {n.trigger} · {n.recipient}
                   </div>
                   <div className="mt-1 line-clamp-2 break-words">
                     {truncate(n.preview, 140)}
                   </div>
                 </div>
                 <Button size="sm" variant="outline" onClick={() => setPreviewingLog(n)}>View</Button>
               </li>
             ))}
           </ul>
         )}
       </div>
       ```

    4. **Add a preview Dialog** (second Dialog inside this component, triggered by `previewingLog` state) — duplicate the preview rendering logic from Task 2 (email iframe / sms pre / ghl JSON). If the same logic is needed in both Task 2 and Task 3, it's acceptable to duplicate for v1.1 — factor into a shared component only if a third consumer appears. Alternatively, lift the preview rendering to a small helper in `NotificationLogSection.tsx` and export it, then import here. Pick one approach; document which in the SUMMARY.

    5. **State additions**:
       ```ts
       const [previewingLog, setPreviewingLog] = useState<NotificationLog | null>(null);
       ```

    Avoid:
    - Do NOT fire the notifications query eagerly on LeadsSection mount — always gated on `isLeadDialogOpen && selectedLead`.
    - Do NOT break the existing modal's scrolling or layout — new section must fit inside the existing `max-h-[80vh] overflow-y-auto` container.
    - Do NOT edit the existing detail grid or form-answers renderer.
    - Do NOT add pagination in this panel — per-lead lists are expected to be small (<20 rows).
  </action>
  <verify>`npm run check` passes; grep for `leadNotifications` in `LeadsSection.tsx` returns ≥3 hits</verify>
  <done>AC-3 satisfied: panel fetches on open, renders list, preview dialog opens</done>
</task>

<task type="auto">
  <name>Task 4: Wire render in Admin.tsx</name>
  <files>client/src/pages/Admin.tsx</files>
  <action>
    In `client/src/pages/Admin.tsx` (around the switch/rendering block at lines 141-170):

    1. Import the new section at the top of the file:
       ```ts
       import { NotificationLogSection } from "@/components/admin/NotificationLogSection";
       ```
       (or `default` import — match the export style used in Task 2.)

    2. Add a new branch in the conditional rendering:
       ```tsx
       {activeSection === "notificationLog" && <NotificationLogSection />}
       ```
       Place it next to the `leads` branch for locality.

    Avoid:
    - Do NOT alter any other `activeSection` branch.
    - Do NOT introduce lazy loading (React.lazy) unless other sections already use it — current sections are eager-imported, match.
  </action>
  <verify>`npm run check` passes; `grep -n NotificationLogSection client/src/pages/Admin.tsx` shows import + render</verify>
  <done>AC-1 fully satisfied (section renders when route active); AC-5 final typecheck</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    New admin section "Notification Log" (left sidebar) with a filterable table and preview dialog;
    per-lead "Notifications" panel inside the lead detail modal in LeadsSection.
  </what-built>
  <how-to-verify>
    1. Start the dev server: `npm run dev` (port 7000 per .env).
    2. Visit http://localhost:7000/admin and log in with your admin credentials.
    3. Sidebar: confirm "Notification Log" entry is visible with an icon.
    4. Click it → URL changes to /admin/notification-log → table loads (may be empty if no sends yet).
    5. If the table is empty, trigger a notification first:
       - Submit a test lead via the public form OR
       - Use the "Test Email" button in Integrations → Resend OR
       - (Optional) insert a row manually via psql for quick validation
    6. Confirm filters work: pick channel=sms, status=sent → table re-queries.
    7. Click "View" on any row → preview dialog opens:
       - For email rows: HTML preview renders inside the sandboxed iframe; no console errors about blocked scripts.
       - For SMS rows: plain text shown.
       - For ghl_sync rows: JSON pretty-printed.
    8. Go to Leads section → open any existing lead's detail modal.
    9. Scroll inside the modal → "Notifications" section appears with either an empty state or a list.
    10. If there are notifications, click "View" on one → same preview dialog works.
    11. Check browser console: no errors, no warnings about iframe sandbox CSP.
    12. Check Network tab: /api/admin/notification-logs and /api/form-leads/:id/notifications return 200; re-queries fire on filter change.
  </how-to-verify>
  <resume-signal>Type "approved" after verifying, or describe any issues found (with screenshots if UI-related)</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `shared/schema.ts`, `server/storage.ts`, `server/integrations/*`, `server/notifications/logger.ts`, `server/routes/notifications.ts`, `server/routes.ts` — backend is frozen at this point in the phase
- `client/src/components/admin/shared/constants.ts` — SIDEBAR_MENU_ITEMS is auto-derived; don't edit
- Existing admin sections (Dashboard, Website, Company, SEO, FAQs, Chat, Integrations, Blog, Gallery, Services, Reviews, Users, Leads) — don't refactor opportunistically
- The existing lead modal layout (grid, form answers, notes) — only append the new Notifications section

## SCOPE LIMITS
- UI only — no backend edits, no schema/storage/API changes
- No pagination UI beyond what the 100-row default provides
- No CSV/JSON export button
- No "Resend" action button (deferred)
- No "Mark as read" or per-row state mutations (deferred)
- No real-time updates (no polling, no websockets)
- No filter persistence across navigation (filters reset on page re-entry)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run check` → 0 errors
- [ ] `npm run dev` starts without runtime error
- [ ] Sidebar "Notification Log" item visible
- [ ] /admin/notification-log renders the section; empty state OR real rows show
- [ ] Filters re-fire the query with the expected queryKey
- [ ] Preview dialog handles all 3 channels (email sandboxed iframe, SMS pre, GHL JSON)
- [ ] Lead detail modal shows Notifications panel
- [ ] Browser console has no errors
- [ ] All acceptance criteria (AC-1 through AC-6) met
</verification>

<success_criteria>
- All tasks completed, checkpoint approved
- Typecheck clean
- Both UI surfaces (global page + lead modal panel) functional in browser
- Phase 1 closes cleanly; transition-phase can run to commit and route to Phase 2 (docs alignment)
</success_criteria>

<output>
After completion, create `.paul/phases/01-lead-notification-log/01-04-SUMMARY.md`
</output>
