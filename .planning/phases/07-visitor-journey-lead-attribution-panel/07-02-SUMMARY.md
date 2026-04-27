---
phase: 07-visitor-journey-lead-attribution-panel
plan: "02"
subsystem: admin-marketing-dashboard
tags: [journey-tab, controlled-tabs, visitor-timeline, attribution, react-query]
dependency_graph:
  requires:
    - "07-01: visitorUuid enrichment on getMarketingConversions"
    - "06-04: MarketingConversionsTab base implementation"
    - "04-03: GET /api/admin/marketing/journey endpoint"
  provides:
    - "MarketingJourneyTab component with session card + vertical timeline"
    - "Controlled tabs in MarketingSection with activeTab + selectedVisitorUuid state"
    - "Clickable rows in MarketingConversionsTab navigating to Journey tab"
  affects:
    - "07-03: Lead attribution panel (uses channelLabel from utils.ts — already in place)"
tech_stack:
  added: []
  patterns:
    - "Controlled Tabs with value/onValueChange for programmatic tab switching"
    - "Callback prop pattern (onSelectVisitor) for cross-component navigation"
    - "Type widening via Omit+intersection for DB plain-text 'page_view' conversionType"
    - "enabled: !!uuid guard to prevent React Query from firing on null dependency"
key_files:
  created:
    - client/src/components/admin/marketing/MarketingJourneyTab.tsx
  modified:
    - client/src/components/admin/MarketingSection.tsx
    - client/src/components/admin/marketing/MarketingConversionsTab.tsx
decisions:
  - "Globe icon chosen for page_view rows (muted); Zap icon for real conversions (accent) — matches D-06"
  - "Empty state uses TrendingUp icon with exact message from D-04: 'Select a visitor from the Conversions tab to view their journey'"
  - "Session card uses 2-column (mobile) / 4-column (md+) grid — consistent with existing admin card layouts"
  - "Keyboard support added to clickable rows (Enter/Space) for accessibility beyond plan spec"
metrics:
  duration: "4.5 min"
  completed_date: "2026-04-27"
  tasks_completed: 3
  files_modified: 3
---

# Phase 07 Plan 02: Journey Tab UI Summary

Journey tab UI components wired together: new `MarketingJourneyTab` component with session summary card + vertical event timeline, controlled tabs migration in `MarketingSection`, and clickable Conversions rows that navigate to the Journey tab loaded with the selected visitor.

## What Was Built

**Task 1 — MarketingJourneyTab.tsx (new, 178 lines)**

New tab component with four states:
- Empty: TrendingUp icon + "Select a visitor from the Conversions tab to view their journey" (D-04)
- Loading: 6 Skeleton rows (matches ConversionsTab pattern)
- Error: "Could not load marketing data" Card with Retry button
- Loaded: Session summary Card + vertical timeline

Session summary Card renders four cells above the timeline: First Source (via `channelLabel(session.ftSourceChannel)`), Campaign, Entry Page, Total Events.

Vertical timeline renders one `<li>` per event:
- `page_view` rows: muted Globe icon, shows `pagePath` or "/"
- Real conversions: accent Zap icon, shows business label from `CONVERSION_LABELS`
- Each row: relative time via `formatDistanceToNow` + raw ISO in `title` attribute

No `utm_*` strings anywhere in the rendered output (DASH-07 ban confirmed).

**Import block in MarketingJourneyTab.tsx:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, Globe, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { channelLabel } from '@/components/admin/marketing/utils';
import type { VisitorJourney } from '@shared/marketing-types';
import type { AttributionConversion } from '@shared/schema';
```

Icon choice: `Globe` for page_view rows (muted style), `Zap` for real conversions (accent/primary style).

**Task 2 — MarketingSection.tsx (modified, 223 → 238 lines)**

- `defaultValue="overview"` removed, replaced with `value={activeTab} onValueChange={setActiveTab}` (controlled tabs)
- Two new state pieces: `activeTab` (initial: `'overview'`) and `selectedVisitorUuid` (initial: `null`)
- 5th `TabsTrigger` and `TabsContent` added for "Journey"
- `onSelectVisitor` callback wired into `<MarketingConversionsTab>` — sets UUID and switches tab

**Task 3 — MarketingConversionsTab.tsx (modified, 170 → 193 lines)**

- Props interface extended with `onSelectVisitor?: (visitorUuid: string) => void`
- `useQuery` generic widened to `Array<AttributionConversion & { visitorUuid: string | null }>` matching 07-01 server enrichment
- `allConversionsWidened` cast updated to include `visitorUuid: string | null`
- Row-level clickability: `const clickable = !!onSelectVisitor && row.visitorUuid != null`
- Clickable rows get `cursor-pointer`, `role="button"`, `tabIndex=0`, `onClick`, and `onKeyDown` (Enter/Space)
- Rows without `visitorUuid` (deleted sessions — Pitfall 3) remain inert

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 986d099 | feat(07-02): create MarketingJourneyTab with empty state, session card, and vertical timeline |
| 2 | 0752757 | feat(07-02): migrate MarketingSection to controlled Tabs and add Journey as 5th tab |
| 3 | a62d46b | feat(07-02): add onSelectVisitor prop and clickable rows to MarketingConversionsTab |

## Deviations from Plan

### Auto-added

**1. [Rule 2 - Missing Critical Functionality] Added keyboard support to clickable Conversions rows**
- **Found during:** Task 3
- **Issue:** Plan specified `onClick` but accessibility requires keyboard users to also trigger the navigation
- **Fix:** Added `onKeyDown` handler for Enter/Space keys alongside `tabIndex=0`
- **Files modified:** `client/src/components/admin/marketing/MarketingConversionsTab.tsx`
- **Commit:** a62d46b

All other tasks executed exactly as written in the plan.

## Known Stubs

None — all components have real data sources wired:
- `MarketingJourneyTab` queries `/api/admin/marketing/journey?visitorId=<uuid>` (implemented in Phase 04-03)
- `selectedVisitorUuid` flows from Conversions row click through `onSelectVisitor` callback
- `channelLabel()` utility is fully implemented in utils.ts (Phase 07-01)

## Manual Smoke

Not executed (no dev server available in agent environment). Based on code review:
- Clicking a Conversions row with non-null `visitorUuid` will call `setSelectedVisitorUuid(uuid)` + `setActiveTab('journey')` → Journey tab opens with session card + timeline
- Clicking Journey tab directly with no prior Conversions selection shows TrendingUp empty state
- Controlled tabs migration removes `defaultValue` — no React controlled/uncontrolled warnings expected

## Self-Check: PASSED

- `client/src/components/admin/marketing/MarketingJourneyTab.tsx` — FOUND (178 lines)
- `client/src/components/admin/MarketingSection.tsx` — FOUND (238 lines)
- `client/src/components/admin/marketing/MarketingConversionsTab.tsx` — FOUND (193 lines)
- Commit 986d099 — FOUND
- Commit 0752757 — FOUND
- Commit a62d46b — FOUND
- `npm run check` — PASS (0 TypeScript errors)
