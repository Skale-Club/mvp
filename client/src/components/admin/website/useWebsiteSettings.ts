import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { DEFAULT_HOMEPAGE_CONTENT } from '@/lib/homepageDefaults';
import { useToast } from '@/hooks/use-toast';
import type { HomepageContent } from '@shared/schema';
import type { CompanySettingsData } from '@/components/admin/shared/types';

export const WEBSITE_COLOR_DEFAULTS = {
  websitePrimaryColor: '#1C53A3',
  websiteSecondaryColor: '#FFFF01',
  websiteAccentColor: '#FFFF01',
  websiteBackgroundColor: '#FFFFFF',
  websiteForegroundColor: '#1D1D1D',
  websiteNavBackgroundColor: '#1C1E24',
  websiteFooterBackgroundColor: '#18191F',
  websiteCtaBackgroundColor: '#406EF1',
  websiteCtaHoverColor: '#355CD0',
  adminBackgroundColor: '#0F1729',
  adminSidebarColor: '#1D283A',
};

export function normalizeColorInputValue(value: string | null | undefined, fallback: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(value || '') ? (value as string) : fallback;
}

export function useWebsiteSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<CompanySettingsData>({
    queryKey: ['/api/company-settings'],
  });

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
  const [adminBackgroundColor, setAdminBackgroundColor] = useState(WEBSITE_COLOR_DEFAULTS.adminBackgroundColor);
  const [adminSidebarColor, setAdminSidebarColor] = useState(WEBSITE_COLOR_DEFAULTS.adminSidebarColor);
  const [homepageContent, setHomepageContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFieldTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (settings) {
      setHeroTitle(settings.heroTitle || '');
      setHeroSubtitle(settings.heroSubtitle || '');
      setHeroImageUrl(settings.heroImageUrl || '');
      setHeroBackgroundImageUrl(settings.heroBackgroundImageUrl || '');
      setAboutImageUrl(settings.aboutImageUrl || '');
      setCtaText(settings.ctaText || '');
      setWebsitePrimaryColor(normalizeColorInputValue(settings.websitePrimaryColor, WEBSITE_COLOR_DEFAULTS.websitePrimaryColor));
      setWebsiteSecondaryColor(normalizeColorInputValue(settings.websiteSecondaryColor, WEBSITE_COLOR_DEFAULTS.websiteSecondaryColor));
      setWebsiteAccentColor(normalizeColorInputValue(settings.websiteAccentColor, WEBSITE_COLOR_DEFAULTS.websiteAccentColor));
      setWebsiteBackgroundColor(normalizeColorInputValue(settings.websiteBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteBackgroundColor));
      setWebsiteForegroundColor(normalizeColorInputValue(settings.websiteForegroundColor, WEBSITE_COLOR_DEFAULTS.websiteForegroundColor));
      setWebsiteNavBackgroundColor(normalizeColorInputValue(settings.websiteNavBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteNavBackgroundColor));
      setWebsiteFooterBackgroundColor(normalizeColorInputValue(settings.websiteFooterBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteFooterBackgroundColor));
      setWebsiteCtaBackgroundColor(normalizeColorInputValue(settings.websiteCtaBackgroundColor, WEBSITE_COLOR_DEFAULTS.websiteCtaBackgroundColor));
      setWebsiteCtaHoverColor(normalizeColorInputValue(settings.websiteCtaHoverColor, WEBSITE_COLOR_DEFAULTS.websiteCtaHoverColor));
      setAdminBackgroundColor(normalizeColorInputValue(settings.adminBackgroundColor, WEBSITE_COLOR_DEFAULTS.adminBackgroundColor));
      setAdminSidebarColor(normalizeColorInputValue(settings.adminSidebarColor, WEBSITE_COLOR_DEFAULTS.adminSidebarColor));
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
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      Object.values(savedFieldTimers.current).forEach(clearTimeout);
    };
  }, []);

  const markFieldsSaved = useCallback((fields: string[]) => {
    fields.forEach((field) => {
      setSavedFields((prev) => ({ ...prev, [field]: true }));
      if (savedFieldTimers.current[field]) clearTimeout(savedFieldTimers.current[field]);
      savedFieldTimers.current[field] = setTimeout(() => {
        setSavedFields((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }, 3000);
    });
  }, []);

  const saveSettings = useCallback(
    async (updates: Partial<CompanySettingsData>, fieldKeys?: string[]) => {
      setIsSaving(true);
      try {
        const response = await apiRequest('PUT', '/api/company-settings', updates);
        await response.json();
        queryClient.invalidateQueries({ queryKey: ['/api/company-settings'] });
        const keysToMark = fieldKeys && fieldKeys.length > 0 ? fieldKeys : Object.keys(updates);
        if (keysToMark.length > 0) markFieldsSaved(keysToMark);
      } catch (error: any) {
        toast({ title: 'Error saving settings', description: error.message, variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
    },
    [toast, markFieldsSaved],
  );

  const triggerAutoSave = useCallback(
    (updates: Partial<CompanySettingsData>, fieldKeys?: string[]) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveSettings(updates, fieldKeys);
      }, 800);
    },
    [saveSettings],
  );

  const updateHomepageContent = useCallback(
    (updater: (prev: HomepageContent) => HomepageContent, fieldKey?: string) => {
      setHomepageContent((prev) => {
        const updated = updater(prev);
        triggerAutoSave({ homepageContent: updated }, fieldKey ? [fieldKey] : ['homepageContent']);
        return updated;
      });
    },
    [triggerAutoSave],
  );

  return {
    isLoading,
    isSaving,
    savedFields,
    settings,
    // hero
    heroTitle, setHeroTitle,
    heroSubtitle, setHeroSubtitle,
    heroImageUrl, setHeroImageUrl,
    heroBackgroundImageUrl, setHeroBackgroundImageUrl,
    aboutImageUrl, setAboutImageUrl,
    ctaText, setCtaText,
    // colors
    websitePrimaryColor, setWebsitePrimaryColor,
    websiteSecondaryColor, setWebsiteSecondaryColor,
    websiteAccentColor, setWebsiteAccentColor,
    websiteBackgroundColor, setWebsiteBackgroundColor,
    websiteForegroundColor, setWebsiteForegroundColor,
    websiteNavBackgroundColor, setWebsiteNavBackgroundColor,
    websiteFooterBackgroundColor, setWebsiteFooterBackgroundColor,
    websiteCtaBackgroundColor, setWebsiteCtaBackgroundColor,
    websiteCtaHoverColor, setWebsiteCtaHoverColor,
    adminBackgroundColor, setAdminBackgroundColor,
    adminSidebarColor, setAdminSidebarColor,
    // homepage content
    homepageContent,
    // actions
    saveSettings,
    triggerAutoSave,
    updateHomepageContent,
  };
}

export type WebsiteSettingsReturn = ReturnType<typeof useWebsiteSettings>;
