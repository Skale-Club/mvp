# Phase 6: Marketing Admin Dashboard - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-25
**Phase:** 06-marketing-admin-dashboard
**Areas discussed:** Overview tab layout, Filter bar design, Section name + icon, Sources + Campaigns tables

---

## Overview Tab Layout

| Option | Description | Selected |
|--------|-------------|----------|
| 6 KPI cards + AreaChart | 2 rows of 3 cards + smooth time-series chart | ✓ |
| Summary table + BarChart | Single table with all metrics + bar chart | |
| Cards only, no chart | Simple numbers, no visualization | |

**User's choice:** Recommended
**Notes:** Auto-selected. 6 cards: Total Visits / Leads / Conv.Rate (row 1) + Top Source / Best Campaign / Best Landing Page (row 2). AreaChart with Visits + Conversions series.

---

## Filter Bar Design

| Option | Description | Selected |
|--------|-------------|----------|
| Always-visible horizontal bar | Persistent bar between header and tabs, instant refresh | ✓ |
| Collapsible filter panel | Hidden by default, expandable | |

**User's choice:** Recommended
**Notes:** Auto-selected. Date presets as Button group, Select dropdowns for source/campaign/conversion type. Immediate React Query refetch on change.

---

## Section Name + Icon

| Option | Description | Selected |
|--------|-------------|----------|
| "Marketing" + TrendingUp | Clean label, growth icon | ✓ |
| "UTM Tracking" + BarChart2 | More technical label | |
| "Attribution" + Target | Analytics-focused label | |

**User's choice:** Recommended
**Notes:** Auto-selected. "Marketing" is the most business-friendly. TrendingUp is universally understood.

---

## Sources + Campaigns Tables

| Option | Description | Selected |
|--------|-------------|----------|
| Server-sorted, badge colors, % rate | Clean, no interactivity | ✓ |
| Client-sortable, drill-down on click | More complex | |

**User's choice:** Recommended
**Notes:** Auto-selected. HOT=green/WARM=amber/COLD=gray badges. Conv.Rate as %. Sorted server-side by conversion rate desc. No row drill-down in Phase 6.

---

## Claude's Discretion

- Loading skeleton design
- Responsive breakpoints for KPI grid
- Chart colors (using brand primary blue + a visible accent)
- Exact padding/spacing
