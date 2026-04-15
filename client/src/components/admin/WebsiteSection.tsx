import { Loader2, Image as ImageIcon, BadgeCheck, LayoutGrid, Palette } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebsiteSettings } from './website/useWebsiteSettings';
import { HeroTab } from './website/HeroTab';
import { TrustBadgesTab } from './website/TrustBadgesTab';
import { SectionsTab } from './website/SectionsTab';
import { ColorsTab } from './website/ColorsTab';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { SIDEBAR_MENU_ITEMS } from '@/components/admin/shared/constants';

export function WebsiteSection() {
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
      <AdminPageHeader
        title={heroMenuTitle}
        description="Customize your website hero, colors, and homepage sections."
        actions={isSaving ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </div>
        ) : null}
      />

      <Tabs defaultValue="hero">
        <TabsList className="mb-4 grid w-full grid-cols-4 h-auto p-1.5 rounded-xl">
          <TabsTrigger value="hero" className="gap-2 rounded-lg py-2.5">
            <ImageIcon className="h-4 w-4" />
            Hero
          </TabsTrigger>
          <TabsTrigger value="badges" className="gap-2 rounded-lg py-2.5">
            <BadgeCheck className="h-4 w-4" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2 rounded-lg py-2.5">
            <LayoutGrid className="h-4 w-4" />
            Sections
          </TabsTrigger>
          <TabsTrigger value="colors" className="gap-2 rounded-lg py-2.5">
            <Palette className="h-4 w-4" />
            Colors
          </TabsTrigger>
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

        <TabsContent value="colors">
          <ColorsTab
            savedFields={settings.savedFields}
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
            adminBackgroundColor={settings.adminBackgroundColor}
            setAdminBackgroundColor={settings.setAdminBackgroundColor}
            adminSidebarColor={settings.adminSidebarColor}
            setAdminSidebarColor={settings.setAdminSidebarColor}
            triggerAutoSave={settings.triggerAutoSave}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
