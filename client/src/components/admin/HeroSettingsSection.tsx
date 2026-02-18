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
  Palette,
  ChevronDown,
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

function normalizeColorInputValue(value: string | null | undefined, fallback: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(value || '') ? (value as string) : fallback;
}

export function HeroSettingsSection() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<CompanySettingsData>({
    queryKey: ['/api/company-settings']
  });
  const heroMenuTitle = menuItems.find((item) => item.id === 'hero')?.title ?? 'Hero Section';

  const HERO_DEFAULTS = {
    title: '',
    subtitle: '',
    ctaText: '',
    image: '',
  };
  const WEBSITE_COLOR_DEFAULTS = {
    websitePrimaryColor: '#1C53A3',
    websiteSecondaryColor: '#FFFF01',
    websiteAccentColor: '#FFFF01',
    websiteBackgroundColor: '#FFFFFF',
    websiteForegroundColor: '#1D1D1D',
    websiteNavBackgroundColor: '#1C1E24',
    websiteFooterBackgroundColor: '#18191F',
    websiteCtaBackgroundColor: '#406EF1',
    websiteCtaHoverColor: '#355CD0',
  };

  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroBackgroundImageUrl, setHeroBackgroundImageUrl] = useState('');
  const [aboutImageUrl, setAboutImageUrl] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [websitePrimaryColor, setWebsitePrimaryColor] = useState(WEBSITE_COLOR_DEFAULTS.websitePrimaryColor);
  const [websiteSecondaryColor, setWebsiteSecondaryColor] = useState(WEBSITE_COLOR_DEFAULTS.websiteSecondaryColor);
  const [websiteAccentColor, setWebsiteAccentColor] = useState(WEBSITE_COLOR_DEFAULTS.websiteAccentColor);
  const [websiteBackgroundColor, setWebsiteBackgroundColor] = useState(WEBSITE_COLOR_DEFAULTS.websiteBackgroundColor);
  const [websiteForegroundColor, setWebsiteForegroundColor] = useState(WEBSITE_COLOR_DEFAULTS.websiteForegroundColor);
  const [websiteNavBackgroundColor, setWebsiteNavBackgroundColor] = useState(WEBSITE_COLOR_DEFAULTS.websiteNavBackgroundColor);
  const [websiteFooterBackgroundColor, setWebsiteFooterBackgroundColor] = useState(WEBSITE_COLOR_DEFAULTS.websiteFooterBackgroundColor);
  const [websiteCtaBackgroundColor, setWebsiteCtaBackgroundColor] = useState(WEBSITE_COLOR_DEFAULTS.websiteCtaBackgroundColor);
  const [websiteCtaHoverColor, setWebsiteCtaHoverColor] = useState(WEBSITE_COLOR_DEFAULTS.websiteCtaHoverColor);
  const [homepageContent, setHomepageContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFieldTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});
  const SavedIndicator = ({ field }: { field: string }) => (
    savedFields[field] ? (
      <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 w-4 h-4" />
    ) : null
  );

  useEffect(() => {
    if (settings) {
      console.log('Loading settings, heroImageUrl from DB:', settings.heroImageUrl);
      setHeroTitle(settings.heroTitle || HERO_DEFAULTS.title);
      setHeroSubtitle(settings.heroSubtitle || HERO_DEFAULTS.subtitle);
      setHeroImageUrl(settings.heroImageUrl || HERO_DEFAULTS.image);
      setHeroBackgroundImageUrl(settings.heroBackgroundImageUrl || '');
      setAboutImageUrl(settings.aboutImageUrl || '');
      setCtaText(settings.ctaText || HERO_DEFAULTS.ctaText);
      setWebsitePrimaryColor(normalizeColorInputValue(settings.websitePrimaryColor, WEBSITE_COLOR_DEFAULTS.websitePrimaryColor));
      setWebsiteSecondaryColor(normalizeColorInputValue(settings.websiteSecondaryColor, WEBSITE_COLOR_DEFAULTS.websiteSecondaryColor));
      setWebsiteAccentColor(normalizeColorInputValue(settings.websiteAccentColor, WEBSITE_COLOR_DEFAULTS.websiteAccentColor));
      setWebsiteBackgroundColor(normalizeColorInputValue(settings.websiteBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteBackgroundColor));
      setWebsiteForegroundColor(normalizeColorInputValue(settings.websiteForegroundColor, WEBSITE_COLOR_DEFAULTS.websiteForegroundColor));
      setWebsiteNavBackgroundColor(normalizeColorInputValue(settings.websiteNavBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteNavBackgroundColor));
      setWebsiteFooterBackgroundColor(normalizeColorInputValue(settings.websiteFooterBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteFooterBackgroundColor));
      setWebsiteCtaBackgroundColor(normalizeColorInputValue(settings.websiteCtaBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteCtaBackgroundColor));
      setWebsiteCtaHoverColor(normalizeColorInputValue(settings.websiteCtaHoverColor, WEBSITE_COLOR_DEFAULTS.websiteCtaHoverColor));
      setHomepageContent({
        ...DEFAULT_HOMEPAGE_CONTENT,
        ...(settings.homepageContent || {}),
        trustBadges: settings.homepageContent?.trustBadges?.length
          ? settings.homepageContent.trustBadges
          : DEFAULT_HOMEPAGE_CONTENT.trustBadges,
        categoriesSection: {
          ...DEFAULT_HOMEPAGE_CONTENT.categoriesSection,
          ...(settings.homepageContent?.categoriesSection || {}),
        },
        blogSection: {
          ...DEFAULT_HOMEPAGE_CONTENT.blogSection,
          ...(settings.homepageContent?.blogSection || {}),
        },
        aboutSection: {
          ...DEFAULT_HOMEPAGE_CONTENT.aboutSection,
          ...(settings.homepageContent?.aboutSection || {}),
        },
        areasServedSection: {
          ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection,
          ...(settings.homepageContent?.areasServedSection || {}),
        },
      });
    }
  }, [settings]);

  useEffect(() => {
    if (!isLoading && !settings) {
      setHeroTitle(HERO_DEFAULTS.title);
      setHeroSubtitle(HERO_DEFAULTS.subtitle);
      setHeroImageUrl(HERO_DEFAULTS.image);
      setHeroBackgroundImageUrl('');
      setAboutImageUrl('');
      setCtaText(HERO_DEFAULTS.ctaText);
      setWebsitePrimaryColor(WEBSITE_COLOR_DEFAULTS.websitePrimaryColor);
      setWebsiteSecondaryColor(WEBSITE_COLOR_DEFAULTS.websiteSecondaryColor);
      setWebsiteAccentColor(WEBSITE_COLOR_DEFAULTS.websiteAccentColor);
      setWebsiteBackgroundColor(WEBSITE_COLOR_DEFAULTS.websiteBackgroundColor);
      setWebsiteForegroundColor(WEBSITE_COLOR_DEFAULTS.websiteForegroundColor);
      setWebsiteNavBackgroundColor(WEBSITE_COLOR_DEFAULTS.websiteNavBackgroundColor);
      setWebsiteFooterBackgroundColor(WEBSITE_COLOR_DEFAULTS.websiteFooterBackgroundColor);
      setWebsiteCtaBackgroundColor(WEBSITE_COLOR_DEFAULTS.websiteCtaBackgroundColor);
      setWebsiteCtaHoverColor(WEBSITE_COLOR_DEFAULTS.websiteCtaHoverColor);
      setHomepageContent(DEFAULT_HOMEPAGE_CONTENT);
    }
  }, [isLoading, settings]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      Object.values(savedFieldTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  const trustBadges = homepageContent.trustBadges || [];
  const badgeIconOptions = [
    { label: 'Star', value: 'star', icon: Star },
    { label: 'Shield', value: 'shield', icon: Shield },
    { label: 'Clock', value: 'clock', icon: Clock },
    { label: 'Sparkles', value: 'sparkles', icon: Sparkles },
    { label: 'Heart', value: 'heart', icon: Heart },
    { label: 'Badge Check', value: 'badgeCheck', icon: BadgeCheck },
    { label: 'Thumbs Up', value: 'thumbsUp', icon: ThumbsUp },
    { label: 'Trophy', value: 'trophy', icon: Trophy },
  ];
  const categoriesSection = {
    ...DEFAULT_HOMEPAGE_CONTENT.categoriesSection,
    ...(homepageContent.categoriesSection || {}),
  };
  const blogSection = {
    ...DEFAULT_HOMEPAGE_CONTENT.blogSection,
    ...(homepageContent.blogSection || {}),
  };
  const aboutSection = {
    ...DEFAULT_HOMEPAGE_CONTENT.aboutSection,
    ...(homepageContent.aboutSection || {}),
  };
  const areasServedSection = {
    ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection,
    ...(homepageContent.areasServedSection || {}),
  };

  const markFieldsSaved = useCallback((fields: string[]) => {
    fields.forEach(field => {
      setSavedFields(prev => ({ ...prev, [field]: true }));
      if (savedFieldTimers.current[field]) {
        clearTimeout(savedFieldTimers.current[field]);
      }
      savedFieldTimers.current[field] = setTimeout(() => {
        setSavedFields(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }, 3000);
    });
  }, []);

  const saveHeroSettings = useCallback(async (updates: Partial<CompanySettingsData>, fieldKeys?: string[]) => {
    setIsSaving(true);
    console.log('saveHeroSettings called with:', updates);
    try {
      const response = await apiRequest('PUT', '/api/company-settings', updates);
      const savedData = await response.json();
      console.log('Saved data from server:', savedData);
      queryClient.invalidateQueries({ queryKey: ['/api/company-settings'] });
      const keysToMark = fieldKeys && fieldKeys.length > 0 ? fieldKeys : Object.keys(updates);
      if (keysToMark.length > 0) {
        markFieldsSaved(keysToMark);
      }
    } catch (error: any) {
      toast({ 
        title: 'Error saving hero settings', 
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  const triggerAutoSave = useCallback((updates: Partial<CompanySettingsData>, fieldKeys?: string[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveHeroSettings(updates, fieldKeys);
    }, 800);
  }, [saveHeroSettings]);

  const updateHomepageContent = useCallback((updater: (prev: HomepageContent) => HomepageContent, fieldKey?: string) => {
    setHomepageContent(prev => {
      const updated = updater(prev);
      triggerAutoSave({ homepageContent: updated }, fieldKey ? [fieldKey] : ['homepageContent']);
      return updated;
    });
  }, [triggerAutoSave]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imagePath = await uploadFileToServer(file);
      console.log('Saving hero image URL:', imagePath);
      setHeroImageUrl(imagePath);
      await saveHeroSettings({ heroImageUrl: imagePath }, ['heroImageUrl']);
      toast({ title: 'Hero image uploaded and saved' });
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
          <h1 className="text-2xl font-bold">{heroMenuTitle}</h1>
          <p className="text-muted-foreground">Customize hero and homepage content</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>
      </div>
      <div className="bg-muted p-6 rounded-lg transition-all space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            Hero Section
          </h2>
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Hero Title</Label>
              <div className="relative">
                <Input 
                  id="heroTitle" 
                  value={heroTitle} 
                  onChange={(e) => {
                    setHeroTitle(e.target.value);
                    triggerAutoSave({ heroTitle: e.target.value }, ['heroTitle']);
                  }}
                  placeholder="Enter hero title"
                  data-testid="input-hero-title"
                />
                <SavedIndicator field="heroTitle" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
              <div className="relative">
                <Textarea 
                  id="heroSubtitle" 
                  value={heroSubtitle} 
                  onChange={(e) => {
                    setHeroSubtitle(e.target.value);
                    triggerAutoSave({ heroSubtitle: e.target.value }, ['heroSubtitle']);
                  }}
                  placeholder="Enter hero subtitle"
                  data-testid="input-hero-subtitle"
                  className="min-h-[120px]"
                />
                <SavedIndicator field="heroSubtitle" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ctaText">Call to Action Button Text</Label>
              <div className="relative">
                <Input 
                  id="ctaText" 
                  value={ctaText} 
                  onChange={(e) => {
                    setCtaText(e.target.value);
                    triggerAutoSave({ ctaText: e.target.value }, ['ctaText']);
                  }}
                  placeholder="Book Now"
                  data-testid="input-cta-text"
                />
                <SavedIndicator field="ctaText" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Foreground Image</Label>
                <div className="aspect-[4/3] w-full rounded-lg border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden relative group">
                  {heroImageUrl ? (
                    <img src={heroImageUrl} alt="Foreground preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center p-4">
                      <User className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Foreground</p>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-lg">
                    <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                    <Plus className="w-8 h-8 text-white" />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Background Image</Label>
                <div className="aspect-[4/3] w-full rounded-lg border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden relative group">
                  {heroBackgroundImageUrl ? (
                    <img src={heroBackgroundImageUrl} alt="Background preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Image className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Background</p>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-lg">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const imagePath = await uploadFileToServer(file);
                          setHeroBackgroundImageUrl(imagePath);
                          await saveHeroSettings({ heroBackgroundImageUrl: imagePath }, ['heroBackgroundImageUrl']);
                          toast({ title: 'Background image uploaded and saved' });
                        } catch (error: any) {
                          toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                        }
                      }}
                    />
                    <Plus className="w-8 h-8 text-white" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-5 space-y-3 max-w-5xl">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Website Colors
          </h3>
          <p className="text-xs text-muted-foreground">
            Customize the public website palette (navbar, footer and CTA buttons).
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="websitePrimaryColor">Primary</Label>
              <div className="relative flex items-center gap-1.5">
                <Input
                  id="websitePrimaryColor"
                  type="color"
                  value={normalizeColorInputValue(websitePrimaryColor, WEBSITE_COLOR_DEFAULTS.websitePrimaryColor)}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsitePrimaryColor(value);
                    triggerAutoSave({ websitePrimaryColor: value }, ['websitePrimaryColor']);
                  }}
                  className="h-9 w-12 p-1"
                />
                <Input
                  value={websitePrimaryColor}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsitePrimaryColor(value);
                    triggerAutoSave({ websitePrimaryColor: value }, ['websitePrimaryColor']);
                  }}
                  placeholder="#1C53A3"
                  className="h-9 pr-9 text-sm"
                />
                <SavedIndicator field="websitePrimaryColor" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteSecondaryColor">Secondary</Label>
              <div className="relative flex items-center gap-1.5">
                <Input
                  id="websiteSecondaryColor"
                  type="color"
                  value={normalizeColorInputValue(websiteSecondaryColor, WEBSITE_COLOR_DEFAULTS.websiteSecondaryColor)}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteSecondaryColor(value);
                    triggerAutoSave({ websiteSecondaryColor: value }, ['websiteSecondaryColor']);
                  }}
                  className="h-9 w-12 p-1"
                />
                <Input
                  value={websiteSecondaryColor}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteSecondaryColor(value);
                    triggerAutoSave({ websiteSecondaryColor: value }, ['websiteSecondaryColor']);
                  }}
                  placeholder="#FFFF01"
                  className="h-9 pr-9 text-sm"
                />
                <SavedIndicator field="websiteSecondaryColor" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteAccentColor">Accent</Label>
              <div className="relative flex items-center gap-1.5">
                <Input
                  id="websiteAccentColor"
                  type="color"
                  value={normalizeColorInputValue(websiteAccentColor, WEBSITE_COLOR_DEFAULTS.websiteAccentColor)}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteAccentColor(value);
                    triggerAutoSave({ websiteAccentColor: value }, ['websiteAccentColor']);
                  }}
                  className="h-9 w-12 p-1"
                />
                <Input
                  value={websiteAccentColor}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteAccentColor(value);
                    triggerAutoSave({ websiteAccentColor: value }, ['websiteAccentColor']);
                  }}
                  placeholder="#FFFF01"
                  className="h-9 pr-9 text-sm"
                />
                <SavedIndicator field="websiteAccentColor" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteBackgroundColor">Background</Label>
              <div className="relative flex items-center gap-1.5">
                <Input
                  id="websiteBackgroundColor"
                  type="color"
                  value={normalizeColorInputValue(websiteBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteBackgroundColor)}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteBackgroundColor(value);
                    triggerAutoSave({ websiteBackgroundColor: value }, ['websiteBackgroundColor']);
                  }}
                  className="h-9 w-12 p-1"
                />
                <Input
                  value={websiteBackgroundColor}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteBackgroundColor(value);
                    triggerAutoSave({ websiteBackgroundColor: value }, ['websiteBackgroundColor']);
                  }}
                  placeholder="#FFFFFF"
                  className="h-9 pr-9 text-sm"
                />
                <SavedIndicator field="websiteBackgroundColor" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteForegroundColor">Text</Label>
              <div className="relative flex items-center gap-1.5">
                <Input
                  id="websiteForegroundColor"
                  type="color"
                  value={normalizeColorInputValue(websiteForegroundColor, WEBSITE_COLOR_DEFAULTS.websiteForegroundColor)}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteForegroundColor(value);
                    triggerAutoSave({ websiteForegroundColor: value }, ['websiteForegroundColor']);
                  }}
                  className="h-9 w-12 p-1"
                />
                <Input
                  value={websiteForegroundColor}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteForegroundColor(value);
                    triggerAutoSave({ websiteForegroundColor: value }, ['websiteForegroundColor']);
                  }}
                  placeholder="#1D1D1D"
                  className="h-9 pr-9 text-sm"
                />
                <SavedIndicator field="websiteForegroundColor" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteNavBackgroundColor">Navbar Background</Label>
              <div className="relative flex items-center gap-1.5">
                <Input
                  id="websiteNavBackgroundColor"
                  type="color"
                  value={normalizeColorInputValue(websiteNavBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteNavBackgroundColor)}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteNavBackgroundColor(value);
                    triggerAutoSave({ websiteNavBackgroundColor: value }, ['websiteNavBackgroundColor']);
                  }}
                  className="h-9 w-12 p-1"
                />
                <Input
                  value={websiteNavBackgroundColor}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteNavBackgroundColor(value);
                    triggerAutoSave({ websiteNavBackgroundColor: value }, ['websiteNavBackgroundColor']);
                  }}
                  placeholder="#1C1E24"
                  className="h-9 pr-9 text-sm"
                />
                <SavedIndicator field="websiteNavBackgroundColor" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteFooterBackgroundColor">Footer Background</Label>
              <div className="relative flex items-center gap-1.5">
                <Input
                  id="websiteFooterBackgroundColor"
                  type="color"
                  value={normalizeColorInputValue(websiteFooterBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteFooterBackgroundColor)}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteFooterBackgroundColor(value);
                    triggerAutoSave({ websiteFooterBackgroundColor: value }, ['websiteFooterBackgroundColor']);
                  }}
                  className="h-9 w-12 p-1"
                />
                <Input
                  value={websiteFooterBackgroundColor}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteFooterBackgroundColor(value);
                    triggerAutoSave({ websiteFooterBackgroundColor: value }, ['websiteFooterBackgroundColor']);
                  }}
                  placeholder="#18191F"
                  className="h-9 pr-9 text-sm"
                />
                <SavedIndicator field="websiteFooterBackgroundColor" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteCtaBackgroundColor">CTA Background</Label>
              <div className="relative flex items-center gap-1.5">
                <Input
                  id="websiteCtaBackgroundColor"
                  type="color"
                  value={normalizeColorInputValue(websiteCtaBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteCtaBackgroundColor)}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteCtaBackgroundColor(value);
                    triggerAutoSave({ websiteCtaBackgroundColor: value }, ['websiteCtaBackgroundColor']);
                  }}
                  className="h-9 w-12 p-1"
                />
                <Input
                  value={websiteCtaBackgroundColor}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteCtaBackgroundColor(value);
                    triggerAutoSave({ websiteCtaBackgroundColor: value }, ['websiteCtaBackgroundColor']);
                  }}
                  placeholder="#406EF1"
                  className="h-9 pr-9 text-sm"
                />
                <SavedIndicator field="websiteCtaBackgroundColor" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteCtaHoverColor">CTA Hover</Label>
              <div className="relative flex items-center gap-1.5">
                <Input
                  id="websiteCtaHoverColor"
                  type="color"
                  value={normalizeColorInputValue(websiteCtaHoverColor, WEBSITE_COLOR_DEFAULTS.websiteCtaHoverColor)}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteCtaHoverColor(value);
                    triggerAutoSave({ websiteCtaHoverColor: value }, ['websiteCtaHoverColor']);
                  }}
                  className="h-9 w-12 p-1"
                />
                <Input
                  value={websiteCtaHoverColor}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setWebsiteCtaHoverColor(value);
                    triggerAutoSave({ websiteCtaHoverColor: value }, ['websiteCtaHoverColor']);
                  }}
                  placeholder="#355CD0"
                  className="h-9 pr-9 text-sm"
                />
                <SavedIndicator field="websiteCtaHoverColor" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-primary" />
            Hero Badge
          </h3>
          <div className="flex gap-6 items-start">
            <div className="shrink-0 space-y-2">
              <Label>Image</Label>
              <div className="w-[100px] h-[100px] rounded-lg border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden relative group">
                {homepageContent.heroBadgeImageUrl ? (
                  <img src={homepageContent.heroBadgeImageUrl} alt={homepageContent.heroBadgeAlt || 'Badge preview'} className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="text-center p-2">
                    <BadgeCheck className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground">Upload</p>
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-lg">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const imagePath = await uploadFileToServer(file);
                        updateHomepageContent(prev => ({ ...prev, heroBadgeImageUrl: imagePath }), 'homepageContent.heroBadgeImageUrl');
                        toast({ title: 'Badge uploaded and saved' });
                      } catch (error: any) {
                        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                      } finally {
                        if (e.target) {
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <Plus className="w-6 h-6 text-white" />
                </label>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label>Badge Alt Text</Label>
                <div className="relative">
                  <Input
                    value={homepageContent.heroBadgeAlt || ''}
                    onChange={(e) =>
                      updateHomepageContent(prev => ({ ...prev, heroBadgeAlt: e.target.value }), 'homepageContent.heroBadgeAlt')
                    }
                    placeholder="Trusted Experts"
                  />
                  <SavedIndicator field="homepageContent.heroBadgeAlt" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Badge Icon</Label>
                <Select
                  value={homepageContent.trustBadges?.[0]?.icon || 'star'}
                  onValueChange={(value) => {
                    updateHomepageContent(prev => {
                      const badges = [...(prev.trustBadges || DEFAULT_HOMEPAGE_CONTENT.trustBadges || [])];
                      badges[0] = { ...(badges[0] || {}), icon: value };
                      return { ...prev, trustBadges: badges };
                    }, 'homepageContent.trustBadges.0.icon');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {badgeIconOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="w-4 h-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-muted p-6 rounded-lg transition-all space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BadgeCheck className="w-5 h-5 text-primary" />
            Trust Badges
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="border-dashed"
            onClick={() =>
              updateHomepageContent(prev => ({
                ...prev,
                trustBadges: [...(prev.trustBadges || []), { title: 'New Badge', description: '' }],
              }))
            }
          >
            <Plus className="w-4 h-4 mr-2" /> Add badge
          </Button>
        </div>
        <div className="space-y-4">
          {trustBadges.map((badge, index) => (
            <div
              key={index}
              className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] items-start bg-card p-3 rounded-lg border border-border"
            >
              <div className="space-y-2">
                <Label>Title</Label>
                <div className="relative">
                  <Input
                    value={badge.title}
                    onChange={(e) =>
                      updateHomepageContent(prev => {
                        const updatedBadges = [...(prev.trustBadges || [])];
                        updatedBadges[index] = {
                          ...(updatedBadges[index] || { title: '', description: '' }),
                          title: e.target.value,
                        };
                        return { ...prev, trustBadges: updatedBadges };
                      }, `homepageContent.trustBadges.${index}.title`)
                    }
                  />
                  <SavedIndicator field={`homepageContent.trustBadges.${index}.title`} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <div className="relative">
                  <Input
                    value={badge.description}
                    onChange={(e) =>
                      updateHomepageContent(prev => {
                        const updatedBadges = [...(prev.trustBadges || [])];
                        updatedBadges[index] = {
                          ...(updatedBadges[index] || { title: '', description: '' }),
                          description: e.target.value,
                        };
                        return { ...prev, trustBadges: updatedBadges };
                      }, `homepageContent.trustBadges.${index}.description`)
                    }
                  />
                  <SavedIndicator field={`homepageContent.trustBadges.${index}.description`} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={badge.icon || badgeIconOptions[index % badgeIconOptions.length].value}
                  onValueChange={(value) =>
                    updateHomepageContent(prev => {
                      const updatedBadges = [...(prev.trustBadges || [])];
                      updatedBadges[index] = {
                        ...(updatedBadges[index] || { title: '', description: '' }),
                        icon: value,
                      };
                      return { ...prev, trustBadges: updatedBadges };
                    }, `homepageContent.trustBadges.${index}.icon`)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {badgeIconOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="w-4 h-4" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end items-start pt-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    updateHomepageContent(prev => {
                      const updatedBadges = (prev.trustBadges || []).filter((_, i) => i !== index);
                      return { ...prev, trustBadges: updatedBadges };
                    })
                  }
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {trustBadges.length === 0 && (
            <p className="text-sm text-muted-foreground">No badges added yet.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-muted p-6 rounded-lg transition-all space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Categories Section
          </h2>
          <div className="space-y-2">
            <Label>Title</Label>
            <div className="relative">
              <Input
                value={categoriesSection.title || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    categoriesSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.categoriesSection,
                      ...(prev.categoriesSection || {}),
                      title: e.target.value,
                    },
                  }), 'homepageContent.categoriesSection.title')
                }
              />
              <SavedIndicator field="homepageContent.categoriesSection.title" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <div className="relative">
              <Textarea
                value={categoriesSection.subtitle || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    categoriesSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.categoriesSection,
                      ...(prev.categoriesSection || {}),
                      subtitle: e.target.value,
                    },
                  }), 'homepageContent.categoriesSection.subtitle')
                }
                className="min-h-[100px]"
              />
              <SavedIndicator field="homepageContent.categoriesSection.subtitle" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>CTA Text</Label>
            <div className="relative">
              <Input
                value={categoriesSection.ctaText || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    categoriesSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.categoriesSection,
                      ...(prev.categoriesSection || {}),
                      ctaText: e.target.value,
                    },
                  }), 'homepageContent.categoriesSection.ctaText')
                }
              />
              <SavedIndicator field="homepageContent.categoriesSection.ctaText" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-muted p-6 rounded-lg transition-all space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Blog Section
          </h2>
          <div className="space-y-2">
            <Label>Title</Label>
            <div className="relative">
              <Input
                value={blogSection.title || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    blogSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.blogSection,
                      ...(prev.blogSection || {}),
                      title: e.target.value,
                    },
                  }), 'homepageContent.blogSection.title')
                }
              />
              <SavedIndicator field="homepageContent.blogSection.title" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <div className="relative">
              <Textarea
                value={blogSection.subtitle || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    blogSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.blogSection,
                      ...(prev.blogSection || {}),
                      subtitle: e.target.value,
                    },
                  }), 'homepageContent.blogSection.subtitle')
                }
                className="min-h-[100px]"
              />
              <SavedIndicator field="homepageContent.blogSection.subtitle" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>View All Text</Label>
            <div className="relative">
              <Input
                value={blogSection.viewAllText || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    blogSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.blogSection,
                      ...(prev.blogSection || {}),
                      viewAllText: e.target.value,
                    },
                  }), 'homepageContent.blogSection.viewAllText')
                }
              />
              <SavedIndicator field="homepageContent.blogSection.viewAllText" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Card CTA Text</Label>
            <div className="relative">
              <Input
                value={blogSection.readMoreText || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    blogSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.blogSection,
                      ...(prev.blogSection || {}),
                      readMoreText: e.target.value,
                    },
                  }), 'homepageContent.blogSection.readMoreText')
                }
              />
              <SavedIndicator field="homepageContent.blogSection.readMoreText" />
            </div>
          </div>
        </div>

        <div className="bg-muted p-6 rounded-lg transition-all space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            About Us Section
          </h2>
          <div className="space-y-2">
            <Label>Label</Label>
            <div className="relative">
              <Input
                value={aboutSection.label || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    aboutSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.aboutSection,
                      ...(prev.aboutSection || {}),
                      label: e.target.value,
                    },
                  }), 'homepageContent.aboutSection.label')
                }
              />
              <SavedIndicator field="homepageContent.aboutSection.label" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <div className="relative">
              <Input
                value={aboutSection.heading || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    aboutSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.aboutSection,
                      ...(prev.aboutSection || {}),
                      heading: e.target.value,
                    },
                  }), 'homepageContent.aboutSection.heading')
                }
              />
              <SavedIndicator field="homepageContent.aboutSection.heading" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <div className="relative">
              <Textarea
                value={aboutSection.description || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    aboutSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.aboutSection,
                      ...(prev.aboutSection || {}),
                      description: e.target.value,
                    },
                  }), 'homepageContent.aboutSection.description')
                }
                className="min-h-[120px]"
              />
              <SavedIndicator field="homepageContent.aboutSection.description" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>About Us Image</Label>
            <div className="flex flex-col gap-3">
              <div className="aspect-video w-full max-w-md rounded-lg border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden relative group">
                {aboutImageUrl ? (
                  <img src={aboutImageUrl} alt="About preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Image className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Section Image</p>
                  </div>
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const imagePath = await uploadFileToServer(file);
                        setAboutImageUrl(imagePath);
                        triggerAutoSave({ aboutImageUrl: imagePath }, ['aboutImageUrl']);
                        toast({ title: 'Success', description: 'Image uploaded successfully!' });
                      } catch (error: any) {
                        toast({
                          title: 'Upload Error',
                          description: error.message,
                          variant: 'destructive'
                        });
                      }
                    }} 
                    accept="image/*" 
                  />
                  <Plus className="w-8 h-8 text-white" />
                </label>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-muted p-6 rounded-lg transition-all space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Areas Served Section
          </h2>
          <div className="space-y-2">
            <Label>Label</Label>
            <div className="relative">
              <Input
                value={areasServedSection.label || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    areasServedSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection,
                      ...(prev.areasServedSection || {}),
                      label: e.target.value,
                    },
                  }), 'homepageContent.areasServedSection.label')
                }
              />
              <SavedIndicator field="homepageContent.areasServedSection.label" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Heading</Label>
            <div className="relative">
              <Input
                value={areasServedSection.heading || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    areasServedSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection,
                      ...(prev.areasServedSection || {}),
                      heading: e.target.value,
                    },
                  }), 'homepageContent.areasServedSection.heading')
                }
              />
              <SavedIndicator field="homepageContent.areasServedSection.heading" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <div className="relative">
              <Textarea
                value={areasServedSection.description || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    areasServedSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection,
                      ...(prev.areasServedSection || {}),
                      description: e.target.value,
                    },
                  }), 'homepageContent.areasServedSection.description')
                }
                className="min-h-[120px]"
              />
              <SavedIndicator field="homepageContent.areasServedSection.description" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>CTA Text</Label>
            <div className="relative">
              <Input
                value={areasServedSection.ctaText || ''}
                onChange={(e) =>
                  updateHomepageContent(prev => ({
                    ...prev,
                    areasServedSection: {
                      ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection,
                      ...(prev.areasServedSection || {}),
                      ctaText: e.target.value,
                    },
                  }), 'homepageContent.areasServedSection.ctaText')
                }
              />
              <SavedIndicator field="homepageContent.areasServedSection.ctaText" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

