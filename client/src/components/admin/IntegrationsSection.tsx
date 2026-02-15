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
import { TwilioSection } from '@/components/admin/TwilioSection';

const menuItems = SIDEBAR_MENU_ITEMS;
export function IntegrationsSection() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GHLSettings>({
    provider: 'gohighlevel',
    apiKey: '',
    locationId: '',
    calendarId: '2irhr47AR6K0AQkFqEQl',
    isEnabled: false
  });
  const [openAISettings, setOpenAISettings] = useState<OpenAISettings>({
    provider: 'openai',
    enabled: false,
    model: 'gpt-4o-mini',
    hasKey: false
  });
  const [openAIApiKey, setOpenAIApiKey] = useState('');
  const [isTestingOpenAI, setIsTestingOpenAI] = useState(false);
  const [isSavingOpenAI, setIsSavingOpenAI] = useState(false);
  const [openAITestResult, setOpenAITestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [openAITestMessage, setOpenAITestMessage] = useState<string | null>(null);
  const [analyticsSettings, setAnalyticsSettings] = useState<AnalyticsSettings>({
    gtmContainerId: '',
    ga4MeasurementId: '',
    facebookPixelId: '',
    gtmEnabled: false,
    ga4Enabled: false,
    facebookPixelEnabled: false
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAnalytics, setIsSavingAnalytics] = useState(false);
  const [lastSavedAnalytics, setLastSavedAnalytics] = useState<Date | null>(null);
  const saveAnalyticsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ghlTestResult, setGhlTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const integrationsMenuTitle = menuItems.find((item) => item.id === 'integrations')?.title ?? 'Integrations';

  const { data: ghlSettings, isLoading } = useQuery<GHLSettings>({
    queryKey: ['/api/integrations/ghl']
  });

  const { data: openaiSettingsData } = useQuery<OpenAISettings>({
    queryKey: ['/api/integrations/openai']
  });

  const { data: companySettings } = useQuery<any>({
    queryKey: ['/api/company-settings']
  });

  useEffect(() => {
    if (ghlSettings) {
      setSettings(ghlSettings);
    }
  }, [ghlSettings]);

  useEffect(() => {
    if (openaiSettingsData) {
      setOpenAISettings(openaiSettingsData);
      if (openaiSettingsData.hasKey) {
        setOpenAITestResult('success');
        setOpenAITestMessage(openaiSettingsData.enabled ? 'OpenAI is enabled.' : 'Key saved. Run test to verify connection.');
      } else {
        setOpenAITestResult('idle');
        setOpenAITestMessage(null);
      }
    }
  }, [openaiSettingsData]);

  useEffect(() => {
    if (companySettings) {
      setAnalyticsSettings({
        gtmContainerId: companySettings.gtmContainerId || '',
        ga4MeasurementId: companySettings.ga4MeasurementId || '',
        facebookPixelId: companySettings.facebookPixelId || '',
        gtmEnabled: companySettings.gtmEnabled || false,
        ga4Enabled: companySettings.ga4Enabled || false,
        facebookPixelEnabled: companySettings.facebookPixelEnabled || false
      });
    }
  }, [companySettings]);

  useEffect(() => {
    return () => {
      if (saveAnalyticsTimeoutRef.current) {
        clearTimeout(saveAnalyticsTimeoutRef.current);
      }
    };
  }, []);

  const saveAnalyticsSettings = useCallback(async (newSettings: Partial<AnalyticsSettings>) => {
    setIsSavingAnalytics(true);
    try {
      await apiRequest('PUT', '/api/company-settings', newSettings);
      queryClient.invalidateQueries({ queryKey: ['/api/company-settings'] });
      setLastSavedAnalytics(new Date());
    } catch (error: any) {
      toast({ 
        title: 'Error saving analytics settings', 
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSavingAnalytics(false);
    }
  }, [toast]);

  const updateAnalyticsField = useCallback(<K extends keyof AnalyticsSettings>(field: K, value: AnalyticsSettings[K]) => {
    setAnalyticsSettings(prev => ({ ...prev, [field]: value }));
    
    if (saveAnalyticsTimeoutRef.current) {
      clearTimeout(saveAnalyticsTimeoutRef.current);
    }
    
    saveAnalyticsTimeoutRef.current = setTimeout(() => {
      saveAnalyticsSettings({ [field]: value });
    }, 800);
  }, [saveAnalyticsSettings]);

  const saveOpenAISettings = async (settingsToSave?: Partial<OpenAISettings> & { apiKey?: string }) => {
    setIsSavingOpenAI(true);
    try {
      await apiRequest('PUT', '/api/integrations/openai', {
        enabled: settingsToSave?.enabled ?? openAISettings.enabled,
        model: settingsToSave?.model || openAISettings.model,
        apiKey: settingsToSave?.apiKey || openAIApiKey || undefined
      });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/openai'] });
      setOpenAIApiKey('');
      toast({ title: 'OpenAI settings saved' });
    } catch (error: any) {
      toast({
        title: 'Failed to save OpenAI settings',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSavingOpenAI(false);
    }
  };

  const handleToggleOpenAI = async (checked: boolean) => {
    if (checked && !(openAITestResult === 'success' || openAISettings.hasKey)) {
      toast({
        title: 'Please run Test Connection',
        description: 'You must have a successful test before enabling OpenAI.',
        variant: 'destructive'
      });
      return;
    }
    const next = { ...openAISettings, enabled: checked };
    setOpenAISettings(next);
    if (checked) {
      setOpenAITestResult('success');
      setOpenAITestMessage('OpenAI is enabled.');
    } else {
      setOpenAITestResult('idle');
      setOpenAITestMessage(null);
    }
    await saveOpenAISettings(next);
  };

  const testOpenAIConnection = async () => {
    setIsTestingOpenAI(true);
    setOpenAITestResult('idle');
    setOpenAITestMessage(null);
    try {
      const response = await fetch('/api/integrations/openai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: openAIApiKey || undefined,
          model: openAISettings.model
        }),
        credentials: 'include'
      });
      const text = await response.text();
      const contentType = response.headers.get('content-type') || '';
      let result: any = {};
      if (contentType.includes('application/json')) {
        try {
          result = text ? JSON.parse(text) : {};
        } catch {
          result = { success: false, message: text || 'Unexpected response from server' };
        }
      } else {
        const snippet = (text || '').replace(/\s+/g, ' ').slice(0, 140);
        result = {
          success: false,
          message: `Unexpected response (status ${response.status}, content-type: ${contentType || 'unknown'}). The API route may not be running. Try restarting the server and testing again. Snippet: ${snippet}`
        };
      }
      if (result.success) {
        setOpenAITestResult('success');
        setOpenAITestMessage('Connection successful. You can now enable OpenAI.');
        setOpenAISettings(prev => ({ ...prev, hasKey: true }));
        setOpenAIApiKey('');
        queryClient.invalidateQueries({ queryKey: ['/api/integrations/openai'] });
        toast({ title: 'OpenAI connected', description: 'API key saved. You can now enable the integration.' });
      } else {
        setOpenAITestResult('error');
        setOpenAITestMessage(result.message || 'Could not reach OpenAI.');
        toast({
          title: 'OpenAI test failed',
          description: result.message || 'Could not reach OpenAI',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'OpenAI test failed',
        description: error.message,
        variant: 'destructive'
      });
      setOpenAITestResult('error');
      setOpenAITestMessage(error.message || 'Connection failed.');
    } finally {
      setIsTestingOpenAI(false);
    }
  };

  const ghlTestButtonClass =
    ghlTestResult === 'success'
      ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
      : ghlTestResult === 'error'
      ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
      : '';

  const openAITestButtonClass =
    openAITestResult === 'success'
      ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
      : openAITestResult === 'error'
      ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
      : '';

  const hasGtmId = analyticsSettings.gtmContainerId.trim().length > 0;
  const hasGa4Id = analyticsSettings.ga4MeasurementId.trim().length > 0;
  const hasFacebookPixelId = analyticsSettings.facebookPixelId.trim().length > 0;

  const saveSettings = async (settingsToSave?: GHLSettings) => {
    setIsSaving(true);
    try {
      await apiRequest('PUT', '/api/integrations/ghl', settingsToSave || settings);
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/ghl'] });
      toast({ title: 'Settings saved successfully' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to save settings', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (checked: boolean) => {
    if (checked && ghlTestResult !== 'success') {
      toast({
        title: 'Please run Test Connection',
        description: 'You must have a successful test before enabling GoHighLevel.',
        variant: 'destructive'
      });
      return;
    }
    const newSettings = { ...settings, isEnabled: checked };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const testConnection = async () => {
    setIsTesting(true);
    setGhlTestResult('idle');
    try {
      const response = await fetch('/api/integrations/ghl/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          locationId: settings.locationId
        }),
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setGhlTestResult('success');
        await saveSettings(settings);
        toast({ title: 'Connection successful', description: 'Settings saved. You can now enable the integration.' });
      } else {
        setGhlTestResult('error');
        toast({ 
          title: 'Connection failed', 
          description: result.message || 'Could not connect to GoHighLevel',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      setGhlTestResult('error');
      toast({ 
        title: 'Connection failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{integrationsMenuTitle}</h1>
        <p className="text-muted-foreground">Connect your lead capture system with external services</p>
      </div>

      <div className="space-y-4">
        <Card className="border-0 bg-muted">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <SiOpenai className="w-5 h-5 text-black dark:text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">OpenAI</CardTitle>
                  <p className="text-sm text-muted-foreground">Power the chat assistant with OpenAI responses</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSavingOpenAI && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <Label className="text-sm">
                  {openAISettings.enabled ? 'Enabled' : 'Disabled'}
                </Label>
                <Switch
                  checked={openAISettings.enabled}
                  onCheckedChange={handleToggleOpenAI}
                  disabled={isSavingOpenAI}
                  data-testid="switch-openai-enabled"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="openai-api-key">API Key</Label>
                <Input
                  id="openai-api-key"
                  type="password"
                  value={openAIApiKey}
                  onChange={(e) => setOpenAIApiKey(e.target.value)}
                  placeholder={openAISettings.hasKey ? '••••••••••••' : 'sk-...'}
                  data-testid="input-openai-api-key"
                />
                <p className="text-xs text-muted-foreground">
                  Stored securely on the server. Not returned after saving.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="openai-model">Model</Label>
                <Select
                  value={openAISettings.model}
                  onValueChange={(val) => setOpenAISettings(prev => ({ ...prev, model: val }))}
                >
                  <SelectTrigger id="openai-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                    <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className={openAITestButtonClass}
                onClick={testOpenAIConnection}
                disabled={isTestingOpenAI || (!openAIApiKey && !openAISettings.hasKey)}
                data-testid="button-test-openai"
              >
                {isTestingOpenAI && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {openAITestResult === 'success' ? 'Test OK' : openAITestResult === 'error' ? 'Test Failed' : 'Test Connection'}
              </Button>
            </div>

            {openAISettings.enabled && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="font-medium text-sm">OpenAI is enabled.</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  The chat assistant will use OpenAI to respond to visitors
                </p>
              </div>
            )}

            {!openAISettings.hasKey && !openAISettings.enabled && (
              <div className="text-xs text-muted-foreground">
                Add a key and test the connection to enable OpenAI responses.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="border-0 bg-muted">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center overflow-hidden">
                  <img src={ghlLogo} alt="GoHighLevel" className="w-9 h-9 rounded-md object-contain" />
                </div>
                <div>
                  <CardTitle className="text-lg">GoHighLevel</CardTitle>
                  <p className="text-sm text-muted-foreground">Sync calendars, contacts, and appointments</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <Label htmlFor="ghl-enabled" className="text-sm">
                  {settings.isEnabled ? 'Enabled' : 'Disabled'}
                </Label>
                <Switch
                  id="ghl-enabled"
                  checked={settings.isEnabled}
                  onCheckedChange={handleToggleEnabled}
                  disabled={isSaving}
                  data-testid="switch-ghl-enabled"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ghl-api-key">API Key</Label>
                <Input
                  id="ghl-api-key"
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Enter your GoHighLevel API key"
                  data-testid="input-ghl-api-key"
                />
                <p className="text-xs text-muted-foreground">
                  Find this in your GHL account under Settings {'->'} Private Integrations
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ghl-location-id">Location ID</Label>
                <Input
                  id="ghl-location-id"
                  value={settings.locationId}
                  onChange={(e) => setSettings(prev => ({ ...prev, locationId: e.target.value }))}
                  placeholder="Enter your Location ID"
                  data-testid="input-ghl-location-id"
                />
                <p className="text-xs text-muted-foreground">
                  Your GHL sub-account/location identifier
                </p>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ghl-calendar-id">Calendar ID</Label>
                <Input
                  id="ghl-calendar-id"
                  value={settings.calendarId}
                  onChange={(e) => setSettings(prev => ({ ...prev, calendarId: e.target.value }))}
                  placeholder="Enter your Calendar ID"
                  data-testid="input-ghl-calendar-id"
                />
                <p className="text-xs text-muted-foreground">ID of the GHL calendar to sync appointments with</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className={ghlTestButtonClass}
                onClick={testConnection}
                disabled={isTesting || !settings.apiKey || !settings.locationId}
                data-testid="button-test-ghl"
              >
                {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {ghlTestResult === 'success' ? 'Test OK' : ghlTestResult === 'error' ? 'Test Failed' : 'Test Connection'}
              </Button>
            </div>

            {settings.isEnabled && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="font-medium text-sm">Integration Active</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  New leads will be synced to GoHighLevel automatically
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TwilioSection />

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-0 bg-muted">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <SiGoogletagmanager className="w-4 h-4 text-[#1A73E8] dark:text-[#8AB4F8]" />
                  </div>
                  <CardTitle className="text-base">Google Tag Manager</CardTitle>
                </div>
                <Switch
                  checked={analyticsSettings.gtmEnabled}
                  onCheckedChange={(checked) => updateAnalyticsField('gtmEnabled', checked)}
                  data-testid="switch-gtm-enabled"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="gtm-id" className="text-sm">Container ID</Label>
                <Input
                  id="gtm-id"
                  value={analyticsSettings.gtmContainerId}
                  onChange={(e) => updateAnalyticsField('gtmContainerId', e.target.value)}
                  placeholder="GTM-XXXXXXX"
                  className="text-sm"
                  data-testid="input-gtm-id"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Find this in GTM under Admin {'->'} Container Settings
              </p>
              {analyticsSettings.gtmEnabled && hasGtmId && (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-2.5 py-2 text-xs text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-medium">Integration Active</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-muted">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <SiGoogleanalytics className="w-4 h-4 text-[#E37400] dark:text-[#FFB74D]" />
                  </div>
                  <CardTitle className="text-base">Google Analytics 4</CardTitle>
                </div>
                <Switch
                  checked={analyticsSettings.ga4Enabled}
                  onCheckedChange={(checked) => updateAnalyticsField('ga4Enabled', checked)}
                  data-testid="switch-ga4-enabled"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ga4-id" className="text-sm">Measurement ID</Label>
                <Input
                  id="ga4-id"
                  value={analyticsSettings.ga4MeasurementId}
                  onChange={(e) => updateAnalyticsField('ga4MeasurementId', e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  className="text-sm"
                  data-testid="input-ga4-id"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Find this in GA4 Admin {'->'} Data Streams
              </p>
              {analyticsSettings.ga4Enabled && hasGa4Id && (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-2.5 py-2 text-xs text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-medium">Integration Active</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-muted">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <SiFacebook className="w-4 h-4 text-[#1877F2] dark:text-[#5AA2FF]" />
                  </div>
                  <CardTitle className="text-base">Facebook Pixel</CardTitle>
                </div>
                <Switch
                  checked={analyticsSettings.facebookPixelEnabled}
                  onCheckedChange={(checked) => updateAnalyticsField('facebookPixelEnabled', checked)}
                  data-testid="switch-fb-pixel-enabled"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="fb-pixel-id" className="text-sm">Pixel ID</Label>
                <Input
                  id="fb-pixel-id"
                  value={analyticsSettings.facebookPixelId}
                  onChange={(e) => updateAnalyticsField('facebookPixelId', e.target.value)}
                  placeholder="123456789012345"
                  className="text-sm"
                  data-testid="input-fb-pixel-id"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Find this in Meta Events Manager
              </p>
              {analyticsSettings.facebookPixelEnabled && hasFacebookPixelId && (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-2.5 py-2 text-xs text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" />
                  <span className="font-medium">Integration Active</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="bg-muted p-6 rounded-lg space-y-4 transition-all">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          Tracked Events
        </h2>
        <div className="p-4 bg-card/60 rounded-lg">
          <p className="text-xs text-muted-foreground mb-3">
            When enabled, the following events are automatically tracked:
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { event: 'cta_click', desc: 'Button clicks (contact/lead actions)' },
              { event: 'view_item_list', desc: 'Services page viewed' },
              { event: 'form_open', desc: 'Lead form opened' },
              { event: 'form_completed', desc: 'Lead form submitted' },
              { event: 'chat_lead_captured', desc: 'Lead captured via chat' },
            ].map(({ event, desc }) => (
              <div key={event} className="text-xs bg-muted/40 p-2 rounded">
                <code className="text-primary font-mono">{event}</code>
                <p className="text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


