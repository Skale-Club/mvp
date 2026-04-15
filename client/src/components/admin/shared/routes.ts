import {
  Building2,
  FileText,
  HelpCircle,
  Image,
  Images,
  LayoutDashboard,
  MessageSquare,
  Puzzle,
  Search,
  Star,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminSection } from './types';

export type WebsiteAdminTab = 'hero' | 'badges' | 'sections' | 'colors';
export type IntegrationsAdminTab = 'openai' | 'crm' | 'notifications' | 'analytics';
export type AdminTabId = WebsiteAdminTab | IntegrationsAdminTab;

export interface AdminTabDefinition<TTabId extends string = AdminTabId> {
  id: TTabId;
  slug: string;
  title: string;
}

export interface AdminRouteDefinition {
  id: AdminSection;
  slug: string;
  title: string;
  icon: LucideIcon;
  hiddenInSidebar?: boolean;
  tabs?: readonly AdminTabDefinition[];
  defaultTabId?: AdminTabId;
}

export const WEBSITE_ADMIN_TABS: readonly AdminTabDefinition<WebsiteAdminTab>[] = [
  { id: 'hero', slug: 'hero', title: 'Hero' },
  { id: 'badges', slug: 'badges', title: 'Badges' },
  { id: 'sections', slug: 'sections', title: 'Sections' },
  { id: 'colors', slug: 'colors', title: 'Colors' },
];

export const INTEGRATIONS_ADMIN_TABS: readonly AdminTabDefinition<IntegrationsAdminTab>[] = [
  { id: 'openai', slug: 'openai', title: 'OpenAI' },
  { id: 'crm', slug: 'crm', title: 'CRM' },
  { id: 'notifications', slug: 'notifications', title: 'Notifications' },
  { id: 'analytics', slug: 'analytics', title: 'Analytics' },
];

export const ADMIN_ROUTES: readonly AdminRouteDefinition[] = [
  { id: 'dashboard', slug: 'dashboard', title: 'Dashboard', icon: LayoutDashboard },
  { id: 'company', slug: 'company', title: 'Company Infos', icon: Building2 },
  {
    id: 'hero',
    slug: 'website',
    title: 'Website',
    icon: Image,
    tabs: WEBSITE_ADMIN_TABS,
    defaultTabId: 'hero',
  },
  { id: 'reviews', slug: 'reviews', title: 'Reviews', icon: Star },
  { id: 'gallery', slug: 'gallery', title: 'Gallery', icon: Images },
  { id: 'servicePosts', slug: 'services', title: 'Services', icon: FileText },
  { id: 'leads', slug: 'leads', title: 'Leads', icon: Sparkles },
  { id: 'faqs', slug: 'faqs', title: 'FAQs', icon: HelpCircle },
  { id: 'users', slug: 'users', title: 'Users', icon: Users },
  { id: 'blog', slug: 'blog', title: 'Blog', icon: FileText },
  { id: 'seo', slug: 'seo', title: 'SEO', icon: Search },
  {
    id: 'chat',
    slug: 'chat',
    title: 'Chat',
    icon: MessageSquare,
    hiddenInSidebar: true,
  },
  {
    id: 'integrations',
    slug: 'integrations',
    title: 'Integrations',
    icon: Puzzle,
    tabs: INTEGRATIONS_ADMIN_TABS,
    defaultTabId: 'openai',
  },
] as const;

export const DEFAULT_ADMIN_SECTION: AdminSection = 'dashboard';
export const DEFAULT_ADMIN_PATH = '/admin/dashboard';

const adminRoutesById = new Map(ADMIN_ROUTES.map((route) => [route.id, route]));
const adminRoutesBySlug = new Map(ADMIN_ROUTES.map((route) => [route.slug, route]));

function normalizePathname(pathname: string): string {
  const withoutHash = pathname.split('#')[0] || '';
  const [base] = withoutHash.split('?');
  if (!base) return '/';
  return base.replace(/\/+$/, '') || '/';
}

function getTabDefinition(
  route: AdminRouteDefinition,
  tabId?: AdminTabId | null,
  tabSlug?: string | null,
): AdminTabDefinition | null {
  if (!route.tabs?.length) return null;

  if (tabId) {
    const byId = route.tabs.find((tab) => tab.id === tabId);
    if (byId) return byId;
  }

  if (tabSlug) {
    const bySlug = route.tabs.find((tab) => tab.slug === tabSlug);
    if (bySlug) return bySlug;
  }

  if (route.defaultTabId) {
    const defaultTab = route.tabs.find((tab) => tab.id === route.defaultTabId);
    if (defaultTab) return defaultTab;
  }

  return route.tabs[0] ?? null;
}

export function getAdminRouteById(section: AdminSection): AdminRouteDefinition | undefined {
  return adminRoutesById.get(section);
}

export function getAdminRouteBySlug(slug: string): AdminRouteDefinition | undefined {
  return adminRoutesBySlug.get(slug);
}

export function getAdminPath(section: AdminSection, tabId?: AdminTabId): string {
  const route = getAdminRouteById(section);
  if (!route) {
    return DEFAULT_ADMIN_PATH;
  }

  const basePath = `/admin/${route.slug}`;
  const tab = getTabDefinition(route, tabId);

  if (!tab) {
    return basePath;
  }

  return `${basePath}/${tab.slug}`;
}

export interface ResolvedAdminLocation {
  section: AdminSection;
  sectionSlug: string;
  sectionTitle: string;
  tab: AdminTabDefinition | null;
  canonicalPath: string;
  redirectTo: string | null;
}

export function resolveAdminLocation(pathname: string): ResolvedAdminLocation {
  const normalizedPath = normalizePathname(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);
  const sectionSlug = segments[1];

  if (!sectionSlug) {
    const fallback = getAdminRouteById(DEFAULT_ADMIN_SECTION)!;
    return {
      section: fallback.id,
      sectionSlug: fallback.slug,
      sectionTitle: fallback.title,
      tab: getTabDefinition(fallback),
      canonicalPath: DEFAULT_ADMIN_PATH,
      redirectTo: DEFAULT_ADMIN_PATH,
    };
  }

  const route = getAdminRouteBySlug(sectionSlug);
  if (!route) {
    const fallback = getAdminRouteById(DEFAULT_ADMIN_SECTION)!;
    return {
      section: fallback.id,
      sectionSlug: fallback.slug,
      sectionTitle: fallback.title,
      tab: getTabDefinition(fallback),
      canonicalPath: DEFAULT_ADMIN_PATH,
      redirectTo: DEFAULT_ADMIN_PATH,
    };
  }

  const tabSlug = segments[2];
  const tab = getTabDefinition(route, undefined, tabSlug);
  const canonicalPath = getAdminPath(route.id, tab?.id);
  const hasUnexpectedSegments = segments.length > (tab ? 3 : 2);
  const shouldRedirect =
    normalizedPath !== canonicalPath ||
    (!!route.tabs?.length && !tabSlug) ||
    hasUnexpectedSegments;

  return {
    section: route.id,
    sectionSlug: route.slug,
    sectionTitle: route.title,
    tab,
    canonicalPath,
    redirectTo: shouldRedirect ? canonicalPath : null,
  };
}
