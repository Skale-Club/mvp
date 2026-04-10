import { Loader2, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebsiteSettings } from './website/useWebsiteSettings';
import { HeroTab } from './website/HeroTab';
import { TrustBadgesTab } from './website/TrustBadgesTab';
import { SectionsTab } from './website/SectionsTab';
import { SIDEBAR_MENU_ITEMS } from '@/components/admin/shared/constants';

export function HeroSettingsSection() {
  const settings = useWebsiteSettings();
  const { isLoading, isSaving } = settings;
  const heroMenuTitle = SIDEBAR_MENU_ITEMS.find((item) => item.id === 'hero')?.title ?? 'Website';

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            {heroMenuTitle}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Customize your website's hero, colors and homepage sections</p>
        </div>
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="hero">
        <TabsList className="mb-2">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="badges">Trust Badges</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <HeroTab
            savedFields={settings.savedFields}
            heroTitle={settings.heroTitle}
            setHeroTitle={settings.setHeroTitle}
            heroSubtitle={settings.heroSubtitle}
            setHeroSubtitle={settings.setHeroSubtitle}
            ctaText={settings.ctaText}
            setCtaText={settings.setCtaText}
            heroImageUrl={settings.heroImageUrl}
            setHeroImageUrl={settings.setHeroImageUrl}
            heroBackgroundImageUrl={settings.heroBackgroundImageUrl}
            setHeroBackgroundImageUrl={settings.setHeroBackgroundImageUrl}
            websitePrimaryColor={settings.websitePrimaryColor}
            setWebsitePrimaryColor={settings.setWebsitePrimaryColor}
            websiteSecondaryColor={settings.websiteSecondaryColor}
            setWebsiteSecondaryColor={settings.setWebsiteSecondaryColor}
            websiteAccentColor={settings.websiteAccentColor}
            setWebsiteAccentColor={settings.setWebsiteAccentColor}
            websiteBackgroundColor={settings.websiteBackgroundColor}
            setWebsiteBackgroundColor={settings.setWebsiteBackgroundColor}
            websiteForegroundColor={settings.websiteForegroundColor}
            setWebsiteForegroundColor={settings.setWebsiteForegroundColor}
            websiteNavBackgroundColor={settings.websiteNavBackgroundColor}
            setWebsiteNavBackgroundColor={settings.setWebsiteNavBackgroundColor}
            websiteFooterBackgroundColor={settings.websiteFooterBackgroundColor}
            setWebsiteFooterBackgroundColor={settings.setWebsiteFooterBackgroundColor}
            websiteCtaBackgroundColor={settings.websiteCtaBackgroundColor}
            setWebsiteCtaBackgroundColor={settings.setWebsiteCtaBackgroundColor}
            websiteCtaHoverColor={settings.websiteCtaHoverColor}
            setWebsiteCtaHoverColor={settings.setWebsiteCtaHoverColor}
            homepageContent={settings.homepageContent}
            saveSettings={settings.saveSettings}
            triggerAutoSave={settings.triggerAutoSave}
            updateHomepageContent={settings.updateHomepageContent}
          />
        </TabsContent>

        <TabsContent value="badges">
          <TrustBadgesTab
            savedFields={settings.savedFields}
            homepageContent={settings.homepageContent}
            updateHomepageContent={settings.updateHomepageContent}
          />
        </TabsContent>

        <TabsContent value="sections">
          <SectionsTab
            savedFields={settings.savedFields}
            homepageContent={settings.homepageContent}
            updateHomepageContent={settings.updateHomepageContent}
            aboutImageUrl={settings.aboutImageUrl}
            setAboutImageUrl={settings.setAboutImageUrl}
            triggerAutoSave={settings.triggerAutoSave}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
