import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, Plus, User, Image } from 'lucide-react';
import { uploadFileToServer } from '@/components/admin/shared/utils';
import { useToast } from '@/hooks/use-toast';
import type { WebsiteSettingsReturn } from './useWebsiteSettings';

type Props = Pick<
  WebsiteSettingsReturn,
  | 'savedFields'
  | 'heroTitle' | 'setHeroTitle'
  | 'heroSubtitle' | 'setHeroSubtitle'
  | 'ctaText' | 'setCtaText'
  | 'heroImageUrl' | 'setHeroImageUrl'
  | 'heroBackgroundImageUrl' | 'setHeroBackgroundImageUrl'
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

export function HeroTab({
  savedFields,
  heroTitle, setHeroTitle,
  heroSubtitle, setHeroSubtitle,
  ctaText, setCtaText,
  heroImageUrl, setHeroImageUrl,
  heroBackgroundImageUrl, setHeroBackgroundImageUrl,
  homepageContent,
  saveSettings,
  triggerAutoSave,
  updateHomepageContent,
}: Props) {
  const { toast } = useToast();

  return (
    <div className="space-y-8">
      {/* Text + Images */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-6 transition-all hover:shadow-sm">
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
    </div>
  );
}
