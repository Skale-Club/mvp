import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { renderMarkdown } from '@/lib/markdown';
import { DEFAULT_HOMEPAGE_CONTENT } from '@/lib/homepageDefaults';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Package,
  Calendar,
  Clock,
  DollarSign,
  User,
  MapPin,
  Image,
  Images,
  LayoutDashboard,
  Building2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Check,
  Eye,
  Users,
  Puzzle,
  Globe,
  Search,
  ChevronDown,
  LayoutGrid,
  List,
  MessageSquare,
  Archive,
  RotateCcw,
  Tag,
  Star,
  Shield,
  Sparkles,
  Heart,
  BadgeCheck,
  ThumbsUp,
  Trophy,
  Target,
  PhoneCall,
  LineChart,
  HelpCircle,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import type {
  BlogPost,
  HomepageContent,
  FormLead,
  LeadClassification,
  LeadStatus,
  FormConfig,
  FormQuestion,
  FormOption,
  ConsultingStep,
  TwilioSettings,
} from '@shared/schema';
import { DEFAULT_FORM_CONFIG, calculateMaxScore, getSortedQuestions } from '@shared/form';
import ghlLogo from '@assets/ghl-logo.webp';
import { SiFacebook, SiGoogleanalytics, SiGoogletagmanager, SiOpenai, SiTwilio } from 'react-icons/si';
import { DEFAULT_BUSINESS_HOURS, DEFAULT_CHAT_OBJECTIVES, SIDEBAR_MENU_ITEMS } from '@/components/admin/shared/constants';
import {
  type AdminSection,
  type AnalyticsSettings,
  type ChatSettingsData,
  type CompanySettingsData,
  type ConversationMessage,
  type ConversationSummary,
  type GHLSettings,
  type IntakeObjective,
  type OpenAISettings,
  type SEOSettingsData,
  type TwilioSettingsForm,
  type UrlRule,
} from '@/components/admin/shared/types';
import { ensureArray, uploadFileToServer } from '@/components/admin/shared/utils';

const menuItems = SIDEBAR_MENU_ITEMS;
export function DashboardSection({ onNavigate }: { onNavigate: (section: AdminSection) => void }) {
  const dashboardMenuTitle = menuItems.find((item) => item.id === 'dashboard')?.title ?? 'Dashboard';
  const { data: companySettings } = useQuery<CompanySettingsData>({ queryKey: ['/api/company-settings'] });
  const { data: leads } = useQuery<FormLead[]>({ queryKey: ['/api/form-leads'] });
  const { data: conversations } = useQuery<Array<{ id: string; status: string; messageCount?: number; updatedAt?: string | Date | null }>>({
    queryKey: ['/api/chat/conversations'],
  });
  const { data: publishedPosts } = useQuery<BlogPost[]>({
    queryKey: ['/api/blog', 'published', 'dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/blog?status=published&limit=50&offset=0', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load posts');
      return res.json();
    },
  });
  const { data: chatSettings } = useQuery<{ enabled?: boolean }>({ queryKey: ['/api/chat/settings'] });
  const { data: openaiSettings } = useQuery<{ enabled: boolean; hasKey: boolean }>({ queryKey: ['/api/integrations/openai'] });
  const { data: ghlSettings } = useQuery<{ isEnabled?: boolean; locationId?: string; calendarId?: string }>({ queryKey: ['/api/integrations/ghl'] });
  const { data: twilioSettings } = useQuery<TwilioSettings>({ queryKey: ['/api/integrations/twilio'] });

  const leadList = leads || [];
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 6);
  last7Days.setHours(0, 0, 0, 0);

  const getLeadDate = (lead: FormLead) => {
    if (!lead.createdAt) return null;
    const parsed = new Date(lead.createdAt as unknown as string);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const leadsToday = leadList.filter((lead) => {
    const date = getLeadDate(lead);
    return date ? date >= todayStart : false;
  }).length;
  const leads7d = leadList.filter((lead) => {
    const date = getLeadDate(lead);
    return date ? date >= last7Days : false;
  }).length;
  const convertedLeads = leadList.filter((lead) => lead.status === 'convertido').length;
  const hotLeads = leadList.filter((lead) => lead.classificacao === 'QUENTE').length;
  const completeLeads = leadList.filter((lead) => lead.formCompleto).length;
  const conversionRate = leadList.length > 0 ? (convertedLeads / leadList.length) * 100 : 0;
  const completionRate = leadList.length > 0 ? (completeLeads / leadList.length) * 100 : 0;

  const statusLabels: Record<string, string> = {
    novo: 'New',
    contatado: 'Contacted',
    qualificado: 'Qualified',
    convertido: 'Converted',
    descartado: 'Discarded',
  };

  const statusCounts = ['novo', 'contatado', 'qualificado', 'convertido', 'descartado'].map((status) => ({
    status,
    label: statusLabels[status],
    value: leadList.filter((lead) => lead.status === status).length,
  }));

  const sourceCounts = {
    form: leadList.filter((lead) => (lead.source || 'form') === 'form').length,
    chat: leadList.filter((lead) => lead.source === 'chat').length,
  };

  const sortedRecentLeads = [...leadList]
    .sort((a, b) => {
      const aTime = getLeadDate(a)?.getTime() || 0;
      const bTime = getLeadDate(b)?.getTime() || 0;
      return bTime - aTime;
    })
    .slice(0, 6);

  const openConversations = (conversations || []).filter((conversation) => conversation.status === 'open').length;

  const integrations = [
    {
      label: 'Chat Widget',
      active: !!chatSettings?.enabled,
      detail: chatSettings?.enabled ? 'Enabled on site' : 'Disabled',
    },
    {
      label: 'OpenAI',
      active: !!openaiSettings?.enabled && !!openaiSettings?.hasKey,
      detail:
        openaiSettings?.enabled && openaiSettings?.hasKey
          ? 'Assistant ready'
          : openaiSettings?.enabled
            ? 'Missing API key'
            : 'Disabled',
    },
    {
      label: 'GoHighLevel',
      active: !!ghlSettings?.isEnabled,
      detail: ghlSettings?.isEnabled ? 'Connected' : 'Disconnected',
    },
    {
      label: 'Twilio',
      active: !!twilioSettings?.enabled,
      detail: twilioSettings?.enabled ? 'SMS alerts enabled' : 'Disabled',
    },
  ];

  const brandChecklist = [
    { label: 'Company name', done: !!companySettings?.companyName },
    { label: 'Primary email', done: !!companySettings?.companyEmail },
    { label: 'Phone', done: !!companySettings?.companyPhone },
    { label: 'Address', done: !!companySettings?.companyAddress },
    { label: 'Main logo', done: !!companySettings?.logoMain },
    { label: 'Hero content', done: !!companySettings?.heroTitle && !!companySettings?.heroSubtitle },
  ];
  const brandCompleteCount = brandChecklist.filter((item) => item.done).length;
  const brandCompletion = brandChecklist.length > 0 ? Math.round((brandCompleteCount / brandChecklist.length) * 100) : 0;

  const kpis = [
    { label: 'Total Leads', value: String(leadList.length), helper: `${hotLeads} hot leads`, icon: Users, color: 'text-blue-500' },
    { label: 'Leads (7 days)', value: String(leads7d), helper: `${leadsToday} today`, icon: Sparkles, color: 'text-violet-500' },
    { label: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, helper: `${convertedLeads} converted`, icon: Target, color: 'text-emerald-500' },
    { label: 'Open Chats', value: String(openConversations), helper: `${conversations?.length || 0} total threads`, icon: MessageSquare, color: 'text-amber-500' },
    { label: 'Published Posts', value: String(publishedPosts?.length || 0), helper: 'Public blog content', icon: FileText, color: 'text-fuchsia-500' },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-overview">
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card via-card to-muted/40 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden">
              {companySettings?.logoIcon ? (
                <img src={companySettings.logoIcon} alt={companySettings.companyName || 'Logo'} className="h-full w-full object-contain p-2" />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{dashboardMenuTitle}</h1>
              <p className="text-sm text-muted-foreground">
                {companySettings?.companyName || 'Your business'} performance snapshot for your white-label operation
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Button variant="outline" className="border-0 bg-background" onClick={() => onNavigate('leads')}>
              <Users className="h-4 w-4 mr-2" />
              Leads
            </Button>
            <Button variant="outline" className="border-0 bg-background" onClick={() => onNavigate('chat')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </Button>
            <Button variant="outline" className="border-0 bg-background" onClick={() => onNavigate('integrations')}>
              <Puzzle className="h-4 w-4 mr-2" />
              Integrations
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.helper}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <kpi.icon className={clsx('h-5 w-5', kpi.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Lead Funnel</h2>
            <Badge variant="secondary" className="border-0 bg-muted">
              Completion {completionRate.toFixed(1)}%
            </Badge>
          </div>
          <div className="space-y-3">
            {statusCounts.map((row) => {
              const percentage = leadList.length > 0 ? (row.value / leadList.length) * 100 : 0;
              return (
                <div key={row.status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(percentage, row.value > 0 ? 6 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Lead Sources</p>
              <p className="mt-1 text-sm font-medium">Form: {sourceCounts.form}</p>
              <p className="text-sm font-medium">Chat: {sourceCounts.chat}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Qualification</p>
              <p className="mt-1 text-sm font-medium">Hot: {hotLeads}</p>
              <p className="text-sm font-medium">Complete: {completeLeads}</p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent Leads</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('leads')}>
              View all
            </Button>
          </div>
          {sortedRecentLeads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No leads yet.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedRecentLeads.map((lead) => (
                <div key={lead.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{lead.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">{lead.email || lead.telefone || 'No contact yet'}</p>
                    </div>
                    <Badge variant="secondary" className="border-0 bg-muted text-[10px] uppercase">
                      {(lead.source || 'form') === 'chat' ? 'Chat' : 'Form'}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{statusLabels[lead.status || 'novo'] || 'New'}</span>
                    <span>
                      {lead.createdAt ? format(new Date(lead.createdAt as unknown as string), 'MMM d, HH:mm') : '--'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Brand Profile</h2>
            <Badge variant="secondary" className="border-0 bg-muted">
              {brandCompletion}%
            </Badge>
          </div>
          <div className="mb-4 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${brandCompletion}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {brandChecklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <span className={clsx('inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]', item.done ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-muted text-muted-foreground')}>
                  {item.done ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                </span>
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full" onClick={() => onNavigate('company')}>
            Complete Company Profile
          </Button>
        </div>

        <div className="xl:col-span-4 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Integrations</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('integrations')}>
              Manage
            </Button>
          </div>
          <div className="space-y-2">
            {integrations.map((integration) => (
              <div key={integration.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{integration.label}</p>
                  <p className="text-xs text-muted-foreground">{integration.detail}</p>
                </div>
                <span className={clsx('h-2.5 w-2.5 rounded-full', integration.active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600')} />
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-3 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-semibold">Quick Actions</h2>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start border-0 bg-muted" onClick={() => onNavigate('hero')}>
              <Image className="h-4 w-4 mr-2" />
              Edit Website
            </Button>
            <Button variant="outline" className="w-full justify-start border-0 bg-muted" onClick={() => onNavigate('blog')}>
              <FileText className="h-4 w-4 mr-2" />
              Publish Content
            </Button>
            <Button variant="outline" className="w-full justify-start border-0 bg-muted" onClick={() => onNavigate('chat')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Review Conversations
            </Button>
            <Button variant="outline" className="w-full justify-start border-0 bg-muted" onClick={() => onNavigate('leads')}>
              <Users className="h-4 w-4 mr-2" />
              Qualify Leads
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


