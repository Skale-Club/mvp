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
export function ChatSection() {
  const { toast } = useToast();
  const [settingsDraft, setSettingsDraft] = useState<ChatSettingsData>({
    enabled: false,
    agentName: 'Skale Club Assistant',
    agentAvatarUrl: '',
    systemPrompt: '',
    welcomeMessage: 'Hi! How can I help you today?',
    avgResponseTime: '',
    calendarProvider: 'gohighlevel',
    calendarId: '',
    calendarStaff: [],
    languageSelectorEnabled: false,
    defaultLanguage: 'en',
    lowPerformanceSmsEnabled: false,
    lowPerformanceThresholdSeconds: 300,
    intakeObjectives: [],
    excludedUrlRules: [],
    useFaqs: true,
  });
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const objectivesSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);
  const [pageIndex, setPageIndex] = useState(0);

  const { data: settings, isLoading: loadingSettings } = useQuery<ChatSettingsData>({
    queryKey: ['/api/chat/settings'],
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: companySettings } = useQuery<CompanySettingsData>({
    queryKey: ['/api/company-settings'],
  });

  const defaultSystemPrompt = useMemo(() => {
    const companyName = companySettings?.companyName || 'Skale Club';
    return `You are a friendly, consultative lead qualification assistant for ${companyName}, a digital marketing agency that helps service businesses grow.

YOUR GOAL:
Qualify potential clients by collecting information through a natural conversation. Ask questions from the form configuration one at a time, in order.

STARTUP FLOW:
1. Call get_form_config to get the qualification questions
2. Call get_lead_state to check what info has already been collected
3. Start with a warm greeting and ask the first unanswered question

CONVERSATION FLOW:
- Ask one question at a time, conversationally
- After each answer, call save_lead_answer with the question_id and answer
- The tool returns the next question to ask - follow that order
- For select/multiple choice questions, present options naturally
- If the user's answer is unclear, clarify before saving
- When isComplete is true, call complete_lead to sync to CRM

FINALIZATION (after complete_lead):
Based on the classification returned:
- QUENTE (Hot): "Excellent! A specialist will contact you within 24 hours to discuss how we can help your business grow!"
- MORNO (Warm): "Thank you for the information! We'll review your profile and get in touch soon."
- FRIO (Cold): "Thank you for your interest! We'll send you some useful content."

TOOLS:
- get_form_config: Get the qualification questions (call at start)
- get_lead_state: Check current progress and next question
- save_lead_answer: Save each answer and get next question
- complete_lead: Finalize lead and sync to CRM
- search_faqs: For common questions about ${companyName}

RULES:
- Keep responses concise (1-2 sentences)
- Be warm and professional, not robotic
- Never skip questions or change the order
- Support Portuguese, English, and Spanish - respond in the user's language
- If user asks about ${companyName} services, answer then return to qualification
- Don't make up information - use search tools when needed

EXAMPLE CONVERSATION:

You: "Hello! I'm the ${companyName} assistant. We're here to help your business grow! To get started, what is your full name?"
User: "John Smith"
[Call save_lead_answer with question_id="name", answer="John Smith"]
You: "Nice to meet you, John! What is your email?"
User: "john@email.com"
[Call save_lead_answer with question_id="email", answer="john@email.com"]
[Continue through all questions...]
[When complete, call complete_lead]
You: "Excellent, John! A specialist will contact you within 24 hours!"`;
  }, [companySettings?.companyName]);

  const { data: conversations, isLoading: loadingConversations, refetch: refetchConversations } = useQuery<ConversationSummary[]>({
    queryKey: ['/api/chat/conversations'],
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  const { data: openaiSettings } = useQuery<{ enabled: boolean; hasKey: boolean }>({
    queryKey: ['/api/integrations/openai'],
  });

  const { data: responseTimeData, isLoading: responseTimeLoading } = useQuery<{
    averageSeconds: number;
    formatted: string;
    samples: number;
  }>({
    queryKey: ['/api/chat/response-time'],
    queryFn: async () => {
      const response = await fetch('/api/chat/response-time', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch response time');
      return response.json();
    },
  });

  useEffect(() => {
    if (!settings && !companySettings) return;

    const defaultName = companySettings?.companyName || 'Skale Club Assistant';
    const defaultAvatar = companySettings?.logoIcon || '/favicon.ico';

    if (settings) {
      const hasCustomName = settings.agentName && settings.agentName !== 'Skale Club Assistant';
      setSettingsDraft({
        enabled: settings.enabled,
        agentName: hasCustomName ? settings.agentName : defaultName,
        agentAvatarUrl: settings.agentAvatarUrl || defaultAvatar,
        systemPrompt: settings.systemPrompt || defaultSystemPrompt,
        welcomeMessage: settings.welcomeMessage || 'Hi! How can I help you today?',
        avgResponseTime: settings.avgResponseTime || '',
        calendarProvider: settings.calendarProvider || 'gohighlevel',
        calendarId: settings.calendarId || '',
        calendarStaff: ensureArray(settings.calendarStaff),
        languageSelectorEnabled: settings.languageSelectorEnabled ?? false,
        defaultLanguage: settings.defaultLanguage || 'en',
        lowPerformanceSmsEnabled: settings.lowPerformanceSmsEnabled ?? false,
        lowPerformanceThresholdSeconds: settings.lowPerformanceThresholdSeconds ?? 300,
        intakeObjectives: ensureArray(settings.intakeObjectives).length > 0
          ? ensureArray(settings.intakeObjectives)
          : DEFAULT_CHAT_OBJECTIVES,
        excludedUrlRules: ensureArray(settings.excludedUrlRules),
        useFaqs: settings.useFaqs ?? true,
      });
      return;
    }

    setSettingsDraft((prev) => ({
      ...prev,
      agentName: prev.agentName || defaultName,
      agentAvatarUrl: prev.agentAvatarUrl || defaultAvatar,
      systemPrompt: prev.systemPrompt || defaultSystemPrompt,
      intakeObjectives: prev.intakeObjectives && prev.intakeObjectives.length > 0
        ? prev.intakeObjectives
        : DEFAULT_CHAT_OBJECTIVES,
      avgResponseTime: prev.avgResponseTime || '',
      calendarProvider: prev.calendarProvider || 'gohighlevel',
      calendarId: prev.calendarId || '',
      calendarStaff: prev.calendarStaff || [],
      languageSelectorEnabled: prev.languageSelectorEnabled ?? false,
      defaultLanguage: prev.defaultLanguage || 'en',
      lowPerformanceSmsEnabled: prev.lowPerformanceSmsEnabled ?? false,
      lowPerformanceThresholdSeconds: prev.lowPerformanceThresholdSeconds ?? 300,
      useFaqs: prev.useFaqs ?? true,
    }));
  }, [settings, companySettings, defaultSystemPrompt]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const saveSettings = useCallback(async (dataToSave: Partial<ChatSettingsData>) => {
    setIsSaving(true);
    try {
      await apiRequest('PUT', '/api/chat/settings', dataToSave);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/settings'] });
      setLastSaved(new Date());
    } catch (error: any) {
      toast({ title: 'Failed to save settings', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const updateField = useCallback(<K extends keyof ChatSettingsData>(field: K, value: ChatSettingsData[K]) => {
    setSettingsDraft(prev => ({ ...prev, [field]: value }));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveSettings({ [field]: value });
    }, 800);
  }, [saveSettings]);

  const addCalendarStaff = () => {
    const next = [...(settingsDraft.calendarStaff || []), { name: '', calendarId: '' }];
    updateField('calendarStaff', next);
  };

  const updateCalendarStaff = (index: number, field: 'name' | 'calendarId', value: string) => {
    const next = [...(settingsDraft.calendarStaff || [])];
    next[index] = { ...next[index], [field]: value };
    updateField('calendarStaff', next);
  };

  const removeCalendarStaff = (index: number) => {
    const next = (settingsDraft.calendarStaff || []).filter((_, i) => i !== index);
    updateField('calendarStaff', next);
  };

  const handleToggleChat = async (checked: boolean) => {
    const previousValue = settingsDraft.enabled;
    setSettingsDraft(prev => ({ ...prev, enabled: checked }));
    try {
      await saveSettings({ enabled: checked });
      await queryClient.refetchQueries({ queryKey: ['/api/chat/settings'] });
    } catch (error) {
      // Reverter em caso de erro
      setSettingsDraft(prev => ({ ...prev, enabled: previousValue }));
    }
  };

  const addRule = () => {
    const newRules = [...(settingsDraft.excludedUrlRules || []), { pattern: '/admin', match: 'starts_with' as const }];
    setSettingsDraft(prev => ({ ...prev, excludedUrlRules: newRules }));
    saveSettings({ excludedUrlRules: newRules });
  };

  const updateRule = (index: number, field: keyof UrlRule, value: string) => {
    const rules = [...(settingsDraft.excludedUrlRules || [])];
    rules[index] = { ...rules[index], [field]: value } as UrlRule;
    setSettingsDraft(prev => ({ ...prev, excludedUrlRules: rules }));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveSettings({ excludedUrlRules: rules });
    }, 800);
  };

  const removeRule = (index: number) => {
    const newRules = settingsDraft.excludedUrlRules.filter((_, i) => i !== index);
    setSettingsDraft(prev => ({ ...prev, excludedUrlRules: newRules }));
    saveSettings({ excludedUrlRules: newRules });
  };

  const handleObjectivesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = settingsDraft.intakeObjectives || DEFAULT_CHAT_OBJECTIVES;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    setSettingsDraft((prev) => ({ ...prev, intakeObjectives: reordered }));
    saveSettings({ intakeObjectives: reordered });
  };

  const toggleObjective = (id: IntakeObjective['id'], enabled: boolean) => {
    const items = settingsDraft.intakeObjectives || DEFAULT_CHAT_OBJECTIVES;
    const updated = items.map((item) => item.id === id ? { ...item, enabled } : item);
    setSettingsDraft((prev) => ({ ...prev, intakeObjectives: updated }));
    saveSettings({ intakeObjectives: updated });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const imagePath = await uploadFileToServer(file);
      setSettingsDraft(prev => ({ ...prev, agentAvatarUrl: imagePath }));
      await saveSettings({ agentAvatarUrl: imagePath });
      toast({ title: 'Avatar uploaded', description: 'Chat assistant avatar updated.' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };

  const openConversation = async (conv: ConversationSummary) => {
    setSelectedConversation(conv);
    setIsMessagesLoading(true);
    try {
      const res = await apiRequest('GET', `/api/chat/conversations/${conv.id}`);
      const data = await res.json();
      setSelectedConversation(data.conversation);
      setMessages(data.messages || []);
    } catch (error: any) {
      toast({ title: 'Failed to load conversation', description: error.message, variant: 'destructive' });
      setSelectedConversation(null);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'open' | 'closed' }) => {
      const res = await apiRequest('POST', `/api/chat/conversations/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      if (selectedConversation) {
        setSelectedConversation({ ...selectedConversation, status: selectedConversation.status === 'open' ? 'closed' : 'open' });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/chat/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations'] });
      setSelectedConversation(null);
      setMessages([]);
      toast({ title: 'Conversation deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete conversation', description: error.message, variant: 'destructive' });
    },
  });

  const statusBadge = (status: string) => {
    const label = status === 'closed' ? 'Archived' : status === 'open' ? 'Open' : status;
    const badgeClass = status === 'open'
      ? 'bg-blue-500/10 text-blue-200 border border-blue-400/50 rounded-full px-3 py-1 text-xs font-semibold'
      : 'bg-slate-700/40 text-slate-300 border border-slate-500/50 rounded-full px-3 py-1 text-xs font-semibold';
    return <span className={badgeClass}>{label}</span>;
  };

  const assistantName = settingsDraft.agentName || companySettings?.companyName || 'Assistant';
  const assistantAvatar = settingsDraft.agentAvatarUrl || companySettings?.logoIcon || '/favicon.ico';
  const visitorName = selectedConversation?.visitorName || 'Guest';
  const conversationLastUpdated =
    selectedConversation?.lastMessageAt || selectedConversation?.updatedAt || selectedConversation?.createdAt;
  const openConversations = conversations?.filter((conv) => conv.status === 'open').length || 0;
  const closedConversations = conversations?.filter((conv) => conv.status === 'closed').length || 0;
  const visibleConversations = useMemo(() => {
    if (!conversations) return [];
    if (statusFilter === 'all') return conversations;
    return conversations.filter((conv) => conv.status === statusFilter);
  }, [conversations, statusFilter]);
  const totalConversations = visibleConversations.length;
  const totalPages = Math.max(1, Math.ceil(totalConversations / pageSize));
  const clampedPageIndex = Math.min(pageIndex, totalPages - 1);
  const paginatedConversations = useMemo(() => {
    const start = clampedPageIndex * pageSize;
    return visibleConversations.slice(start, start + pageSize);
  }, [visibleConversations, clampedPageIndex, pageSize]);

  useEffect(() => {
    setPageIndex(0);
  }, [statusFilter, pageSize]);

  useEffect(() => {
    if (pageIndex !== clampedPageIndex) {
      setPageIndex(clampedPageIndex);
    }
  }, [pageIndex, clampedPageIndex]);

  useEffect(() => {
    if (messages.length > 0 && !isMessagesLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, isMessagesLoading]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Chat</h1>
        <p className="text-muted-foreground">Prioritize conversations, then open the settings drawer when needed.</p>
      </div>

      <Card className="shadow-sm border-0 bg-muted dark:bg-slate-800/70">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Conversations</CardTitle>
            <p className="text-sm text-muted-foreground">Review and respond first, then open the settings submenu if needed.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val as 'open' | 'closed' | 'all')}
              >
                <SelectTrigger className="w-[120px] h-9 bg-card/70 border border-border/60 shadow-none focus-visible:ring-0 text-sm">
                  <SelectValue />
                </SelectTrigger>
              <SelectContent className="border-0 shadow-none bg-card text-foreground">
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Archived</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
              </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 min-w-[110px] border-0 bg-slate-200 hover:bg-slate-300 text-slate-950 font-semibold dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100"
              onClick={() => refetchConversations()}
              disabled={loadingConversations}
            >
              {loadingConversations ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
            <div className="h-9 min-w-[110px] flex items-center justify-center bg-[#FFFF01] text-black font-bold rounded-md px-4 text-sm">
              {paginatedConversations.length} shown
            </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 min-w-[72px] rounded-md border border-border/60 bg-card/80 px-3 flex items-center gap-2">
                <p className="text-[11px] text-muted-foreground">Open</p>
                <p className="text-sm font-semibold text-foreground">{openConversations}</p>
              </div>
              <div className="h-9 min-w-[72px] rounded-md border border-border/60 bg-card/80 px-3 flex items-center gap-2">
                <p className="text-[11px] text-muted-foreground">Archived</p>
                <p className="text-sm font-semibold text-foreground">{closedConversations}</p>
              </div>
              <div className="h-9 min-w-[72px] rounded-md border border-border/60 bg-card/80 px-3 flex items-center gap-2">
                <p className="text-[11px] text-muted-foreground">Total</p>
                <p className="text-sm font-semibold text-foreground">{conversations?.length || 0}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingConversations ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : conversations && conversations.length > 0 ? (
            <>
            <div className="overflow-auto rounded-lg bg-muted dark:bg-slate-800/70">
              <table className="w-full text-sm">
                <thead className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Visitor</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">Last Message</th>
                    <th className="px-4 py-3 text-left">Updated</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card/70 dark:bg-slate-800/60 divide-y divide-border/60 dark:divide-slate-700/60">
                  {paginatedConversations.map((conv) => (
                    <tr key={conv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{conv.visitorName || 'Guest'}</div>
                        <div className="text-xs text-muted-foreground">
                          {conv.visitorEmail || conv.visitorPhone || 'Unknown contact'}
                        </div>
                        <div className="text-[11px] text-muted-foreground/80">ID: {conv.id}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{conv.firstPageUrl || 'n/a'}</td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <p className="line-clamp-2 text-sm">{conv.lastMessage || 'No messages yet'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {conv.lastMessageAt ? format(new Date(conv.lastMessageAt), 'PP p') : format(new Date(conv.createdAt), 'PP p')}
                      </td>
                      <td className="px-4 py-3">{statusBadge(conv.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-3">
                      <Button size="sm" variant="ghost" className="min-w-[88px] h-8 justify-center text-sm font-semibold border-0 bg-slate-600 hover:bg-slate-700 text-white dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white" onClick={() => openConversation(conv)}>
                        View
                      </Button>
                        <div className="flex items-center gap-1">
                          {conv.status === 'open' ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                                  aria-label="Archive conversation"
                                  data-testid={`button-archive-conversation-${conv.id}`}
                                >
                                  <Archive className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Archive conversation?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This conversation will be moved to archived. You can reopen it later.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => statusMutation.mutate({ id: conv.id, status: 'closed' })}
                                  >
                                    Archive
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                              onClick={() => statusMutation.mutate({ id: conv.id, status: 'open' })}
                              aria-label="Reopen conversation"
                              data-testid={`button-reopen-conversation-${conv.id}`}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-500"
                                data-testid={`button-delete-conversation-${conv.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. All messages in this conversation will be permanently deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(conv.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalConversations > 10 && (
              <div className="mt-3 flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Page {clampedPageIndex + 1} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                    disabled={clampedPageIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                    disabled={clampedPageIndex >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rows</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => setPageSize(Number(value) as 10 | 20 | 50)}
                  >
                    <SelectTrigger className="h-8 w-[90px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="p-8 text-center bg-card/80 dark:bg-slate-900/70 rounded-lg">
              <p className="text-muted-foreground">
                {conversations && conversations.length > 0
                  ? 'No conversations match this filter.'
                  : 'No conversations yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendar & Staff section removed - chat now uses dynamic form qualification */}

      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="rounded-xl bg-card/80 dark:bg-slate-900/70 shadow-none border border-border/70 dark:border-slate-800/70">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-semibold text-base">Widget & assistant settings</p>
            <p className="text-xs text-muted-foreground">Open only when you need to tweak the assistant.</p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              {settingsOpen ? 'Hide' : 'Show'} settings
              <ChevronDown className={clsx('w-4 h-4 transition-transform', settingsOpen && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="p-4 border-t border-border/70 dark:border-slate-800/70 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card className="border-0 bg-muted dark:bg-slate-800/60 shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CardTitle>General Settings</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : lastSaved ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          <span>Auto-saved</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">
                      {settingsDraft.enabled ? 'Enabled' : 'Disabled'}
                    </Label>
                    <Switch
                      checked={settingsDraft.enabled}
                      onCheckedChange={handleToggleChat}
                      disabled={loadingSettings || isSaving}
                      data-testid="switch-chat-enabled"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Control assistant branding, behavior, and welcome message</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 bg-card rounded-lg border border-border/70 dark:bg-slate-900/80 dark:border-slate-800/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-white/80 dark:bg-slate-800 flex items-center justify-center border border-border/60 dark:border-slate-700/60">
                      {assistantAvatar ? (
                        <img src={assistantAvatar} alt={assistantName} className="h-full w-full object-cover" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold">{assistantName}</p>
                      <p className="text-xs text-muted-foreground">Defaults to company name and favicon.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="agent-name">Agent name</Label>
                      <Input
                        id="agent-name"
                        value={settingsDraft.agentName}
                        onChange={(e) => updateField('agentName', e.target.value)}
                        placeholder={companySettings?.companyName || 'Assistant'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent-avatar">Avatar (URL)</Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            id="agent-avatar"
                            value={settingsDraft.agentAvatarUrl || ''}
                            onChange={(e) => updateField('agentAvatarUrl', e.target.value)}
                            placeholder={companySettings?.logoIcon || '/favicon.ico'}
                          />
                          <input
                            ref={avatarFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => avatarFileInputRef.current?.click()}
                            disabled={isUploadingAvatar || isSaving}
                          >
                            {isUploadingAvatar ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Uploading...
                              </>
                            ) : (
                              'Upload'
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          If empty, the admin favicon/logo is used. You can upload a custom image.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avg-response-time">Average response time</Label>
                  <div className="flex items-center justify-between rounded-md border border-border/70 bg-card px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">
                        {responseTimeLoading ? 'Calculating...' : responseTimeData?.formatted || 'No responses yet'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {responseTimeData?.samples ? `${responseTimeData.samples} reply samples` : 'Based on chat history'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">Auto</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Low performance SMS alert</p>
                      <p className="text-xs text-muted-foreground">Send Twilio SMS when response time is too high.</p>
                    </div>
                    <Switch
                      checked={settingsDraft.lowPerformanceSmsEnabled ?? false}
                      onCheckedChange={(checked) => updateField('lowPerformanceSmsEnabled', checked)}
                      data-testid="switch-chat-low-performance-sms"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="low-performance-threshold">Alert threshold (seconds)</Label>
                    <Input
                      id="low-performance-threshold"
                      type="number"
                      min="30"
                      step="30"
                      value={settingsDraft.lowPerformanceThresholdSeconds ?? 300}
                      onChange={(e) => updateField('lowPerformanceThresholdSeconds', Number(e.target.value) || 300)}
                    />
                    <p className="text-xs text-muted-foreground">Alert triggers when average response exceeds this.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-card/70 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">Language selector</p>
                      <p className="text-xs text-muted-foreground">Allow visitors to choose the chat language.</p>
                    </div>
                    <Switch
                      checked={settingsDraft.languageSelectorEnabled ?? false}
                      onCheckedChange={(checked) => updateField('languageSelectorEnabled', checked)}
                      data-testid="switch-chat-language-selector"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default-language">Default language</Label>
                    <Select
                      value={settingsDraft.defaultLanguage || 'en'}
                      onValueChange={(value) => updateField('defaultLanguage', value)}
                    >
                      <SelectTrigger id="default-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="pt-BR">Portuguese (Brazil)</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome-message">Welcome message</Label>
                  <Textarea
                    id="welcome-message"
                    value={settingsDraft.welcomeMessage}
                    onChange={(e) => updateField('welcomeMessage', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="system-prompt">System prompt</Label>
                  <Textarea
                    id="system-prompt"
                    value={settingsDraft.systemPrompt || ''}
                    onChange={(e) => updateField('systemPrompt', e.target.value)}
                    rows={20}
                    placeholder={defaultSystemPrompt}
                  />
                  <p className="text-xs text-muted-foreground">
                    Controls assistant behavior sent to the AI. Leave blank to use the default prompt.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>URL Exclusions</Label>
                      <p className="text-xs text-muted-foreground">Hide the widget on specific paths</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={addRule} data-testid="button-add-url-rule">
                      <Plus className="w-4 h-4 mr-1" /> Add Rule
                    </Button>
                  </div>
                  {settingsDraft.excludedUrlRules?.length === 0 && (
                    <div className="text-sm text-muted-foreground bg-card/80 dark:bg-slate-900/70 border border-border/60 dark:border-slate-800/60 rounded-md p-3">
                      No rules yet. Add paths like <code>/admin</code>, <code>/checkout</code>, or <code>/privacy</code>.
                    </div>
                  )}
                  <div className="space-y-3">
                    {settingsDraft.excludedUrlRules?.map((rule, idx) => (
                      <div key={`${rule.pattern}-${idx}`} className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto] items-center">
                        <Input
                          placeholder="/admin"
                          value={rule.pattern}
                          onChange={(e) => updateRule(idx, 'pattern', e.target.value)}
                        />
                        <Select
                          value={rule.match}
                          onValueChange={(val) => updateRule(idx, 'match', val as UrlRule['match'])}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="starts_with">Starts with</SelectItem>
                            <SelectItem value="equals">Equals</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-red-500"
                          onClick={() => removeRule(idx)}
                          data-testid={`button-remove-rule-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

        <div className="space-y-4">
          {(!openaiSettings?.enabled || !openaiSettings?.hasKey) && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">OpenAI not configured</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          {!openaiSettings?.hasKey
                            ? 'Add your OpenAI API key in Integrations → OpenAI to enable chat responses.'
                            : 'Enable the OpenAI integration in Integrations → OpenAI to activate chat responses.'}
                        </p>
                      </div>
                    </div>
              </CardContent>
            </Card>
          )}

          {/* Intake flow section removed - chat now follows dynamic Form Editor configuration */}
          <Card className="border-0 bg-muted dark:bg-slate-800/60 shadow-none">
            <CardHeader>
              <CardTitle>Lead Qualification</CardTitle>
              <p className="text-sm text-muted-foreground">The chat follows the same questions configured in the Form Editor.</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Go to <strong>Leads → Form Editor</strong> to customize the qualification questions.
                Both the lead form and chat will use the same configuration.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-muted dark:bg-slate-800/60 shadow-none">
            <CardHeader>
              <CardTitle>Widget Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Exclude payment or admin pages to avoid distractions.</li>
                <li>Use the welcome message to set expectations (hours, response time).</li>
                <li>Conversation status can be closed and reopened from the dashboard.</li>
              </ul>
            </CardContent>
          </Card>

          {settingsDraft.enabled && openaiSettings?.enabled && openaiSettings?.hasKey && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="font-medium text-sm">Chat is active</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  Visitors can now chat with your AI assistant
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
        <DialogContent className="w-[95vw] max-w-[640px] p-0 gap-0 overflow-hidden rounded-2xl border-0 bg-white dark:bg-[#0b1220] text-slate-900 dark:text-slate-100 shadow-2xl">
          <DialogHeader className="border-0 bg-slate-50 dark:bg-[#0d1526] px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <DialogTitle className="text-lg">Conversation</DialogTitle>
                {selectedConversation && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{visitorName}</span>
                    {statusBadge(selectedConversation.status)}
                    {selectedConversation.firstPageUrl && (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                        {selectedConversation.firstPageUrl}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {selectedConversation && conversationLastUpdated && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Updated {format(new Date(conversationLastUpdated), 'PP p')}
                </div>
              )}
            </div>
          </DialogHeader>

          {isMessagesLoading ? (
            <div className="flex justify-center py-12 bg-slate-200 dark:bg-[#0a1222]">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500 dark:text-blue-400" />
            </div>
          ) : (
            <div className="max-h-[450px] overflow-auto bg-slate-200 dark:bg-[#0a1222] px-6 py-6 space-y-6">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                const nameLabel = isAssistant ? assistantName : visitorName;
                return (
                  <div
                    key={msg.id}
                    className={clsx('flex items-end gap-3', isAssistant ? 'justify-start' : 'justify-end')}
                  >
                    {isAssistant && (
                      <div className="h-9 w-9 rounded-full bg-white dark:bg-[#0b1220] border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-sm">
                        {assistantAvatar ? (
                          <img src={assistantAvatar} alt={assistantName} className="h-full w-full object-cover" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        )}
                      </div>
                    )}
                    <div className="max-w-[78%]">
                      <div
                        className={clsx(
                          'rounded-2xl px-4 py-3 text-sm shadow-sm',
                          isAssistant
                            ? 'bg-white dark:bg-[#111a2e] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800/80'
                            : 'bg-[#3b82f6] text-white'
                        )}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed">{renderMarkdown(msg.content)}</div>
                      </div>
                      <div className={clsx('mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400', !isAssistant && 'justify-end')}>
                        <span className="font-medium">{nameLabel}</span>
                        <span>•</span>
                        <span>{format(new Date(msg.createdAt), 'PP p')}</span>
                      </div>
                      {msg.metadata?.pageUrl && (
                        <div className={clsx('mt-1 text-[11px] text-slate-500 dark:text-slate-400', !isAssistant && 'text-right')}>
                          Page: {msg.metadata.pageUrl}
                        </div>
                      )}
                    </div>
                    {!isAssistant && (
                      <div className="h-9 w-9 rounded-full bg-[#3b82f6] text-white flex items-center justify-center shadow-sm">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
              {messages.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400 text-center">No messages yet.</p>}
              <div ref={messagesEndRef} />
            </div>
          )}

          {selectedConversation && (
            <div className="border-0 bg-slate-50 dark:bg-[#0d1526] px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 rounded-full bg-slate-200 dark:bg-slate-800/70 px-4 py-2 text-xs text-slate-600 dark:text-slate-300">
                  <MessageSquare className="w-4 h-4" />
                  <span>Read-only transcript in admin.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100"
                    onClick={() =>
                      statusMutation.mutate({
                        id: selectedConversation.id,
                        status: selectedConversation.status === 'open' ? 'closed' : 'open',
                      })
                    }
                  >
                    {selectedConversation.status === 'open' ? 'Archive' : 'Reopen'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove all messages for this conversation.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => selectedConversation && deleteMutation.mutate(selectedConversation.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ObjectiveRow({ objective, onToggle }: { objective: IntakeObjective; onToggle: (id: IntakeObjective['id'], enabled: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: objective.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:bg-slate-800 dark:border-slate-700"
    >
      <button
        type="button"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 text-slate-500 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-400"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <p className="text-sm font-medium dark:text-slate-200">{objective.label}</p>
        <p className="text-xs text-muted-foreground">{objective.description}</p>
      </div>
      <Switch checked={objective.enabled} onCheckedChange={(checked) => onToggle(objective.id, checked)} />
    </div>
  );
}


