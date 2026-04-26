// client/src/components/admin/marketing/utils.ts
// Shared helpers for the Marketing admin section (Phase 6).
// Consumed by MarketingSection.tsx and all four tab components.

export type DatePreset = 'today' | '7d' | '30d' | 'month' | 'custom';

export interface MarketingFilters {
  datePreset: DatePreset;
  dateFrom?: string; // ISO datetime string, only when datePreset === 'custom'
  dateTo?: string;   // ISO datetime string, only when datePreset === 'custom'
  source?: string;
  campaign?: string;
  conversionType?: string;
}

/**
 * Resolves a DatePreset (and optional custom dates) into concrete from/to Date objects.
 * - today  -> midnight today through now
 * - 7d     -> 7 days ago through now
 * - 30d    -> 30 days ago through now (default; matches server-side default)
 * - month  -> first of this month through now
 * - custom -> uses customFrom / customTo (falls back to last 30 days if either is missing)
 */
export function resolveDateRange(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };
    }
    case '7d':
      return { from: new Date(now.getTime() - 7 * 86_400_000), to: now };
    case '30d':
      return { from: new Date(now.getTime() - 30 * 86_400_000), to: now };
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };
    }
    case 'custom':
      return {
        from: customFrom ? new Date(customFrom) : new Date(now.getTime() - 30 * 86_400_000),
        to: customTo ? new Date(customTo) : now,
      };
  }
}

/**
 * Converts MarketingFilters to a query string starting with '?'.
 * Always sets dateFrom + dateTo. Only sets source/campaign/conversionType when truthy.
 * Note: conversionType is sent to the server but is currently ignored by storage.ts —
 *       MarketingConversionsTab applies a client-side filter as a fallback.
 */
export function buildMarketingQueryParams(filters: MarketingFilters): string {
  const params = new URLSearchParams();
  const { from, to } = resolveDateRange(filters.datePreset, filters.dateFrom, filters.dateTo);
  params.set('dateFrom', from.toISOString());
  params.set('dateTo', to.toISOString());
  if (filters.source) params.set('source', filters.source);
  if (filters.campaign) params.set('campaign', filters.campaign);
  if (filters.conversionType) params.set('conversionType', filters.conversionType);
  return `?${params.toString()}`;
}
