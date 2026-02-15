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
export function CompanySettingsSection() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CompanySettingsData>({
    companyName: 'Company Name',
    companyEmail: 'contact@company.com',    companyPhone: '',
    companyAddress: '',
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    logoMain: '',
    logoDark: '',
    logoIcon: '',
    sectionsOrder: null,
    socialLinks: [],
    mapEmbedUrl: '',
    heroTitle: '',
    heroSubtitle: '',
    heroImageUrl: '',
    aboutImageUrl: '',
    ctaText: '',
    homepageContent: DEFAULT_HOMEPAGE_CONTENT,
    timeFormat: '12h',
    businessHours: DEFAULT_BUSINESS_HOURS,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: fetchedSettings, isLoading } = useQuery<CompanySettingsData>({
    queryKey: ['/api/company-settings']
  });

  useEffect(() => {
    if (fetchedSettings) {
      setSettings({
        ...fetchedSettings,
        socialLinks: ensureArray(fetchedSettings.socialLinks),
      });
    }
  }, [fetchedSettings]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const saveSettings = useCallback(async (newSettings: Partial<CompanySettingsData>) => {
    setIsSaving(true);
    try {
      await apiRequest('PUT', '/api/company-settings', newSettings);
      queryClient.invalidateQueries({ queryKey: ['/api/company-settings'] });
      setLastSaved(new Date());
    } catch (error: any) {
      toast({ 
        title: 'Error saving settings', 
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const updateField = useCallback(<K extends keyof CompanySettingsData>(field: K, value: CompanySettingsData[K]) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveSettings({ [field]: value });
    }, 800);
  }, [saveSettings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'dark' | 'icon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imagePath = await uploadFileToServer(file);

      const fieldMap = { main: 'logoMain', dark: 'logoDark', icon: 'logoIcon' } as const;
      const fieldName = fieldMap[type];

      setSettings(prev => ({ ...prev, [fieldName]: imagePath }));
      await saveSettings({ [fieldName]: imagePath });

      if (type === 'icon') {
        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          await apiRequest('POST', '/api/update-favicon', {
            data: base64Data,
            filename: file.name
          });
        } catch (faviconError) {
          console.error('Failed to update system favicon:', faviconError);
        }
      }

      toast({ title: 'Asset uploaded and saved' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Company Settings</h1>
          <p className="text-muted-foreground">Manage your business information and assets</p>
        </div>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-muted p-6 rounded-lg space-y-6 transition-all">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Business Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input 
                  id="companyName" 
                  value={settings.companyName || ''} 
                  onChange={(e) => updateField('companyName', e.target.value)}
                  data-testid="input-company-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyEmail">Contact Email</Label>
                <Input 
                  id="companyEmail" 
                  type="email"
                  value={settings.companyEmail || ''} 
                  onChange={(e) => updateField('companyEmail', e.target.value)}
                  data-testid="input-company-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyPhone">Phone Number</Label>
                <Input 
                  id="companyPhone" 
                  value={settings.companyPhone || ''} 
                  onChange={(e) => updateField('companyPhone', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  data-testid="input-company-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAddress">Business Address</Label>
                <Input 
                  id="companyAddress" 
                  value={settings.companyAddress || ''} 
                  onChange={(e) => updateField('companyAddress', e.target.value)}
                  placeholder="123 Main St, City, State"
                  data-testid="input-company-address"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mapEmbedUrl">Map Embed URL (Iframe src)</Label>
                <Input 
                  id="mapEmbedUrl" 
                  value={settings.mapEmbedUrl || ''} 
                  onChange={(e) => updateField('mapEmbedUrl', e.target.value)}
                  placeholder="https://www.google.com/maps/embed?..."
                  data-testid="input-map-embed-url"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste the iframe "src" attribute from Google Maps "Share -{'>'} Embed a map" to update the map shown on the home page.
                </p>
              </div>
            </div>
          </div>

        </div>

        <div className="space-y-6">
          <div className="bg-muted p-6 rounded-lg space-y-6 transition-all">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Image className="w-5 h-5 text-primary" />
              Branding Assets
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Main Logo (Light Mode)</Label>
                <div className="flex flex-col gap-3">
                  <div className="h-32 rounded-lg border-2 border-dashed border-border bg-white flex items-center justify-center overflow-hidden relative group">
                    {settings.logoMain ? (
                      <img src={settings.logoMain} alt="Main Logo" className="max-h-full max-w-full object-contain p-2" />
                    ) : (
                      <div className="text-center p-4">
                        <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Main Logo</p>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Input type="file" className="hidden" onChange={(e) => handleLogoUpload(e, 'main')} accept="image/*" />
                      <Plus className="w-8 h-8 text-white" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Dark Logo (Optional)</Label>
                <div className="flex flex-col gap-3">
                  <div className="h-32 rounded-lg border-2 border-dashed border-border bg-slate-900 dark:bg-slate-100 flex items-center justify-center overflow-hidden relative group">
                    {settings.logoDark ? (
                      <img src={settings.logoDark} alt="Dark Logo" className="max-h-full max-w-full object-contain p-2" />
                    ) : (
                      <div className="text-center p-4">
                        <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Dark Logo</p>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Input type="file" className="hidden" onChange={(e) => handleLogoUpload(e, 'dark')} accept="image/*" />
                      <Plus className="w-8 h-8 text-white" />
                    </label>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Favicon / App Icon</Label>
                <div className="flex flex-col gap-3">
                  <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border bg-white flex items-center justify-center overflow-hidden relative group mx-auto">
                    {settings.logoIcon ? (
                      <img src={settings.logoIcon} alt="Icon" className="max-h-full max-w-full object-contain p-2" />
                    ) : (
                      <div className="text-center p-2">
                        <Image className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-[10px] text-muted-foreground">Icon</p>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Input type="file" className="hidden" onChange={(e) => handleLogoUpload(e, 'icon')} accept="image/*" />
                      <Plus className="w-6 h-6 text-white" />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6 mt-2">
                <Label className="text-base font-semibold">Social Media Links (Max 5)</Label>
                <div className="space-y-3">
                  {(settings.socialLinks || []).map((link, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <Select
                          value={link.platform}
                          onValueChange={(value) => {
                            const newLinks = [...(settings.socialLinks || [])];
                            newLinks[index].platform = value;
                            setSettings(prev => ({ ...prev, socialLinks: newLinks }));
                            saveSettings({ socialLinks: newLinks });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="twitter">X (Twitter)</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...(settings.socialLinks || [])];
                            newLinks[index].url = e.target.value;
                            setSettings(prev => ({ ...prev, socialLinks: newLinks }));
                          }}
                          onBlur={() => saveSettings({ socialLinks: settings.socialLinks })}
                          placeholder="https://social-media.com/yourprofile"
                          className="flex-1"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-1"
                        onClick={() => {
                          const newLinks = (settings.socialLinks || []).filter((_, i) => i !== index);
                          setSettings(prev => ({ ...prev, socialLinks: newLinks }));
                          saveSettings({ socialLinks: newLinks });
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  
                  {(settings.socialLinks || []).length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed"
                      onClick={() => {
                        const newLinks = [...(settings.socialLinks || []), { platform: 'facebook', url: '' }];
                        setSettings(prev => ({ ...prev, socialLinks: newLinks }));
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Social Link
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


