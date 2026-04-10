import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, Plus, FolderOpen, FileText, User, MapPin, Image } from 'lucide-react';
import { uploadFileToServer } from '@/components/admin/shared/utils';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_HOMEPAGE_CONTENT } from '@/lib/homepageDefaults';
import type { WebsiteSettingsReturn } from './useWebsiteSettings';

type Props = Pick<
  WebsiteSettingsReturn,
  | 'savedFields'
  | 'homepageContent'
  | 'updateHomepageContent'
  | 'aboutImageUrl'
  | 'setAboutImageUrl'
  | 'triggerAutoSave'
>;

function SavedIndicator({ field, savedFields }: { field: string; savedFields: Record<string, boolean> }) {
  return savedFields[field] ? (
    <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 w-4 h-4" />
  ) : null;
}

export function SectionsTab({
  savedFields,
  homepageContent,
  updateHomepageContent,
  aboutImageUrl,
  setAboutImageUrl,
  triggerAutoSave,
}: Props) {
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="bg-muted p-6 rounded-lg space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          Categories Section
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <div className="relative">
              <Input
                value={categoriesSection.title || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    categoriesSection: { ...DEFAULT_HOMEPAGE_CONTENT.categoriesSection, ...(prev.categoriesSection || {}), title: e.target.value },
                  }), 'homepageContent.categoriesSection.title')
                }
              />
              <SavedIndicator field="homepageContent.categoriesSection.title" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>CTA Text</Label>
            <div className="relative">
              <Input
                value={categoriesSection.ctaText || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    categoriesSection: { ...DEFAULT_HOMEPAGE_CONTENT.categoriesSection, ...(prev.categoriesSection || {}), ctaText: e.target.value },
                  }), 'homepageContent.categoriesSection.ctaText')
                }
              />
              <SavedIndicator field="homepageContent.categoriesSection.ctaText" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Subtitle</Label>
            <div className="relative">
              <Textarea
                value={categoriesSection.subtitle || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    categoriesSection: { ...DEFAULT_HOMEPAGE_CONTENT.categoriesSection, ...(prev.categoriesSection || {}), subtitle: e.target.value },
                  }), 'homepageContent.categoriesSection.subtitle')
                }
                className="min-h-[80px]"
              />
              <SavedIndicator field="homepageContent.categoriesSection.subtitle" savedFields={savedFields} />
            </div>
          </div>
        </div>
      </div>

      {/* Blog */}
      <div className="bg-muted p-6 rounded-lg space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Blog Section
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <div className="relative">
              <Input
                value={blogSection.title || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    blogSection: { ...DEFAULT_HOMEPAGE_CONTENT.blogSection, ...(prev.blogSection || {}), title: e.target.value },
                  }), 'homepageContent.blogSection.title')
                }
              />
              <SavedIndicator field="homepageContent.blogSection.title" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>View All Text</Label>
            <div className="relative">
              <Input
                value={blogSection.viewAllText || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    blogSection: { ...DEFAULT_HOMEPAGE_CONTENT.blogSection, ...(prev.blogSection || {}), viewAllText: e.target.value },
                  }), 'homepageContent.blogSection.viewAllText')
                }
              />
              <SavedIndicator field="homepageContent.blogSection.viewAllText" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Card CTA Text</Label>
            <div className="relative">
              <Input
                value={blogSection.readMoreText || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    blogSection: { ...DEFAULT_HOMEPAGE_CONTENT.blogSection, ...(prev.blogSection || {}), readMoreText: e.target.value },
                  }), 'homepageContent.blogSection.readMoreText')
                }
              />
              <SavedIndicator field="homepageContent.blogSection.readMoreText" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Subtitle</Label>
            <div className="relative">
              <Textarea
                value={blogSection.subtitle || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    blogSection: { ...DEFAULT_HOMEPAGE_CONTENT.blogSection, ...(prev.blogSection || {}), subtitle: e.target.value },
                  }), 'homepageContent.blogSection.subtitle')
                }
                className="min-h-[80px]"
              />
              <SavedIndicator field="homepageContent.blogSection.subtitle" savedFields={savedFields} />
            </div>
          </div>
        </div>
      </div>

      {/* About Us */}
      <div className="bg-muted p-6 rounded-lg space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          About Us Section
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Label</Label>
            <div className="relative">
              <Input
                value={aboutSection.label || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    aboutSection: { ...DEFAULT_HOMEPAGE_CONTENT.aboutSection, ...(prev.aboutSection || {}), label: e.target.value },
                  }), 'homepageContent.aboutSection.label')
                }
              />
              <SavedIndicator field="homepageContent.aboutSection.label" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <div className="relative">
              <Input
                value={aboutSection.heading || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    aboutSection: { ...DEFAULT_HOMEPAGE_CONTENT.aboutSection, ...(prev.aboutSection || {}), heading: e.target.value },
                  }), 'homepageContent.aboutSection.heading')
                }
              />
              <SavedIndicator field="homepageContent.aboutSection.heading" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <div className="relative">
              <Textarea
                value={aboutSection.description || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    aboutSection: { ...DEFAULT_HOMEPAGE_CONTENT.aboutSection, ...(prev.aboutSection || {}), description: e.target.value },
                  }), 'homepageContent.aboutSection.description')
                }
                className="min-h-[100px]"
              />
              <SavedIndicator field="homepageContent.aboutSection.description" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Section Image</Label>
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
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const imagePath = await uploadFileToServer(file);
                      setAboutImageUrl(imagePath);
                      triggerAutoSave({ aboutImageUrl: imagePath }, ['aboutImageUrl']);
                      toast({ title: 'Image uploaded successfully!' });
                    } catch (error: any) {
                      toast({ title: 'Upload Error', description: error.message, variant: 'destructive' });
                    }
                  }}
                />
                <Plus className="w-8 h-8 text-white" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Areas Served */}
      <div className="bg-muted p-6 rounded-lg space-y-4">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Areas Served Section
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Label</Label>
            <div className="relative">
              <Input
                value={areasServedSection.label || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    areasServedSection: { ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection, ...(prev.areasServedSection || {}), label: e.target.value },
                  }), 'homepageContent.areasServedSection.label')
                }
              />
              <SavedIndicator field="homepageContent.areasServedSection.label" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Heading</Label>
            <div className="relative">
              <Input
                value={areasServedSection.heading || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    areasServedSection: { ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection, ...(prev.areasServedSection || {}), heading: e.target.value },
                  }), 'homepageContent.areasServedSection.heading')
                }
              />
              <SavedIndicator field="homepageContent.areasServedSection.heading" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>CTA Text</Label>
            <div className="relative">
              <Input
                value={areasServedSection.ctaText || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    areasServedSection: { ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection, ...(prev.areasServedSection || {}), ctaText: e.target.value },
                  }), 'homepageContent.areasServedSection.ctaText')
                }
              />
              <SavedIndicator field="homepageContent.areasServedSection.ctaText" savedFields={savedFields} />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <div className="relative">
              <Textarea
                value={areasServedSection.description || ''}
                onChange={(e) =>
                  updateHomepageContent((prev) => ({
                    ...prev,
                    areasServedSection: { ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection, ...(prev.areasServedSection || {}), description: e.target.value },
                  }), 'homepageContent.areasServedSection.description')
                }
                className="min-h-[100px]"
              />
              <SavedIndicator field="homepageContent.areasServedSection.description" savedFields={savedFields} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
