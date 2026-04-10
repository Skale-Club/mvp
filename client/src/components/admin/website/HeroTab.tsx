import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Plus, User, Image, BadgeCheck, Palette, Star, Shield, Clock, Sparkles, Heart, ThumbsUp, Trophy } from 'lucide-react';
import { uploadFileToServer } from '@/components/admin/shared/utils';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_HOMEPAGE_CONTENT } from '@/lib/homepageDefaults';
import { WEBSITE_COLOR_DEFAULTS, normalizeColorInputValue } from './useWebsiteSettings';
import type { WebsiteSettingsReturn } from './useWebsiteSettings';

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

type Props = Pick<
  WebsiteSettingsReturn,
  | 'savedFields'
  | 'heroTitle' | 'setHeroTitle'
  | 'heroSubtitle' | 'setHeroSubtitle'
  | 'ctaText' | 'setCtaText'
  | 'heroImageUrl' | 'setHeroImageUrl'
  | 'heroBackgroundImageUrl' | 'setHeroBackgroundImageUrl'
  | 'websitePrimaryColor' | 'setWebsitePrimaryColor'
  | 'websiteSecondaryColor' | 'setWebsiteSecondaryColor'
  | 'websiteAccentColor' | 'setWebsiteAccentColor'
  | 'websiteBackgroundColor' | 'setWebsiteBackgroundColor'
  | 'websiteForegroundColor' | 'setWebsiteForegroundColor'
  | 'websiteNavBackgroundColor' | 'setWebsiteNavBackgroundColor'
  | 'websiteFooterBackgroundColor' | 'setWebsiteFooterBackgroundColor'
  | 'websiteCtaBackgroundColor' | 'setWebsiteCtaBackgroundColor'
  | 'websiteCtaHoverColor' | 'setWebsiteCtaHoverColor'
  | 'homepageContent'
  | 'saveSettings'
  | 'triggerAutoSave'
  | 'updateHomepageContent'
>;

function SavedIndicator({ field, savedFields }: { field: string; savedFields: Record<string, boolean> }) {
  return savedFields[field] ? (
    <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 w-4 h-4" />
  ) : null;
}

function ColorField({
  id,
  label,
  value,
  defaultValue,
  placeholder,
  savedFields,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  defaultValue: string;
  placeholder: string;
  savedFields: Record<string, boolean>;
  onChange: (val: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative flex items-center gap-1.5">
        <Input
          id={id}
          type="color"
          value={normalizeColorInputValue(value, defaultValue)}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-12 p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={placeholder}
          className="h-9 pr-9 text-sm"
        />
        <SavedIndicator field={id} savedFields={savedFields} />
      </div>
    </div>
  );
}

export function HeroTab({
  savedFields,
  heroTitle, setHeroTitle,
  heroSubtitle, setHeroSubtitle,
  ctaText, setCtaText,
  heroImageUrl, setHeroImageUrl,
  heroBackgroundImageUrl, setHeroBackgroundImageUrl,
  websitePrimaryColor, setWebsitePrimaryColor,
  websiteSecondaryColor, setWebsiteSecondaryColor,
  websiteAccentColor, setWebsiteAccentColor,
  websiteBackgroundColor, setWebsiteBackgroundColor,
  websiteForegroundColor, setWebsiteForegroundColor,
  websiteNavBackgroundColor, setWebsiteNavBackgroundColor,
  websiteFooterBackgroundColor, setWebsiteFooterBackgroundColor,
  websiteCtaBackgroundColor, setWebsiteCtaBackgroundColor,
  websiteCtaHoverColor, setWebsiteCtaHoverColor,
  homepageContent,
  saveSettings,
  triggerAutoSave,
  updateHomepageContent,
}: Props) {
  const { toast } = useToast();

  const makeColorHandler = (setter: (v: string) => void, key: string) => (val: string) => {
    setter(val);
    triggerAutoSave({ [key]: val } as any, [key]);
  };

  return (
    <div className="space-y-8">
      {/* Text + Images */}
      <div className="bg-muted p-6 rounded-lg space-y-6">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Image className="w-4 h-4 text-primary" />
          Hero Content
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Title</Label>
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
                <SavedIndicator field="heroTitle" savedFields={savedFields} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSubtitle">Subtitle</Label>
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
                  className="min-h-[100px]"
                />
                <SavedIndicator field="heroSubtitle" savedFields={savedFields} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaText">CTA Button Text</Label>
              <div className="relative">
                <Input
                  id="ctaText"
                  value={ctaText}
                  onChange={(e) => {
                    setCtaText(e.target.value);
                    triggerAutoSave({ ctaText: e.target.value }, ['ctaText']);
                  }}
                  placeholder="Get a Free Estimate"
                  data-testid="input-cta-text"
                />
                <SavedIndicator field="ctaText" savedFields={savedFields} />
              </div>
            </div>
          </div>

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
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const imagePath = await uploadFileToServer(file);
                        setHeroImageUrl(imagePath);
                        await saveSettings({ heroImageUrl: imagePath }, ['heroImageUrl']);
                        toast({ title: 'Hero image uploaded and saved' });
                      } catch (error: any) {
                        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                      }
                    }}
                  />
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
                        await saveSettings({ heroBackgroundImageUrl: imagePath }, ['heroBackgroundImageUrl']);
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

      {/* Hero Badge */}
      <div className="bg-muted p-6 rounded-lg space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-primary" />
          Hero Badge
        </h2>
        <div className="flex gap-6 items-start">
          <div className="shrink-0 space-y-2">
            <Label>Image</Label>
            <div className="w-[100px] h-[100px] rounded-lg border-2 border-dashed border-border bg-card flex items-center justify-center overflow-hidden relative group">
              {homepageContent.heroBadgeImageUrl ? (
                <img src={homepageContent.heroBadgeImageUrl} alt={homepageContent.heroBadgeAlt || 'Badge'} className="w-full h-full object-contain p-1" />
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
                      updateHomepageContent((prev) => ({ ...prev, heroBadgeImageUrl: imagePath }), 'homepageContent.heroBadgeImageUrl');
                      toast({ title: 'Badge uploaded and saved' });
                    } catch (error: any) {
                      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                    } finally {
                      if (e.target) e.target.value = '';
                    }
                  }}
                />
                <Plus className="w-6 h-6 text-white" />
              </label>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label>Alt Text</Label>
              <div className="relative">
                <Input
                  value={homepageContent.heroBadgeAlt || ''}
                  onChange={(e) =>
                    updateHomepageContent((prev) => ({ ...prev, heroBadgeAlt: e.target.value }), 'homepageContent.heroBadgeAlt')
                  }
                  placeholder="Trusted Experts"
                />
                <SavedIndicator field="homepageContent.heroBadgeAlt" savedFields={savedFields} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Website Colors */}
      <div className="bg-muted p-6 rounded-lg space-y-4">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Website Colors
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Customize the public website palette (navbar, footer and CTA buttons).</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <ColorField id="websitePrimaryColor" label="Primary" value={websitePrimaryColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websitePrimaryColor} placeholder="#1C53A3" savedFields={savedFields} onChange={makeColorHandler(setWebsitePrimaryColor, 'websitePrimaryColor')} />
          <ColorField id="websiteSecondaryColor" label="Secondary" value={websiteSecondaryColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteSecondaryColor} placeholder="#FFFF01" savedFields={savedFields} onChange={makeColorHandler(setWebsiteSecondaryColor, 'websiteSecondaryColor')} />
          <ColorField id="websiteAccentColor" label="Accent" value={websiteAccentColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteAccentColor} placeholder="#FFFF01" savedFields={savedFields} onChange={makeColorHandler(setWebsiteAccentColor, 'websiteAccentColor')} />
          <ColorField id="websiteBackgroundColor" label="Background" value={websiteBackgroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteBackgroundColor} placeholder="#FFFFFF" savedFields={savedFields} onChange={makeColorHandler(setWebsiteBackgroundColor, 'websiteBackgroundColor')} />
          <ColorField id="websiteForegroundColor" label="Text" value={websiteForegroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteForegroundColor} placeholder="#1D1D1D" savedFields={savedFields} onChange={makeColorHandler(setWebsiteForegroundColor, 'websiteForegroundColor')} />
          <ColorField id="websiteNavBackgroundColor" label="Navbar Background" value={websiteNavBackgroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteNavBackgroundColor} placeholder="#1C1E24" savedFields={savedFields} onChange={makeColorHandler(setWebsiteNavBackgroundColor, 'websiteNavBackgroundColor')} />
          <ColorField id="websiteFooterBackgroundColor" label="Footer Background" value={websiteFooterBackgroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteFooterBackgroundColor} placeholder="#18191F" savedFields={savedFields} onChange={makeColorHandler(setWebsiteFooterBackgroundColor, 'websiteFooterBackgroundColor')} />
          <ColorField id="websiteCtaBackgroundColor" label="CTA Background" value={websiteCtaBackgroundColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteCtaBackgroundColor} placeholder="#406EF1" savedFields={savedFields} onChange={makeColorHandler(setWebsiteCtaBackgroundColor, 'websiteCtaBackgroundColor')} />
          <ColorField id="websiteCtaHoverColor" label="CTA Hover" value={websiteCtaHoverColor} defaultValue={WEBSITE_COLOR_DEFAULTS.websiteCtaHoverColor} placeholder="#355CD0" savedFields={savedFields} onChange={makeColorHandler(setWebsiteCtaHoverColor, 'websiteCtaHoverColor')} />
        </div>
      </div>
    </div>
  );
}
