import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Plus, Trash2, Star, Shield, Clock, Sparkles, Heart, BadgeCheck, ThumbsUp, Trophy } from 'lucide-react';
import { DEFAULT_HOMEPAGE_CONTENT } from '@/lib/homepageDefaults';
import { uploadFileToServer } from '@/components/admin/shared/utils';
import { useToast } from '@/hooks/use-toast';
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

type Props = Pick<WebsiteSettingsReturn, 'savedFields' | 'homepageContent' | 'updateHomepageContent'>;

function SavedIndicator({ field, savedFields }: { field: string; savedFields: Record<string, boolean> }) {
  return savedFields[field] ? (
    <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 w-4 h-4" />
  ) : null;
}

export function TrustBadgesTab({ savedFields, homepageContent, updateHomepageContent }: Props) {
  const { toast } = useToast();
  const trustBadges = homepageContent.trustBadges || [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 transition-all hover:shadow-sm">
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

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-primary" />
            Trust Badges
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Displayed below the hero section to build credibility.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-dashed"
          onClick={() =>
            updateHomepageContent((prev) => ({
              ...prev,
              trustBadges: [...(prev.trustBadges || []), { title: 'New Badge', description: '' }],
            }))
          }
        >
          <Plus className="w-4 h-4 mr-2" /> Add badge
        </Button>
      </div>

      <div className="space-y-3">
        {trustBadges.map((badge, index) => (
          <div
            key={index}
            className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] items-start rounded-xl border border-border bg-card p-5 transition-all hover:shadow-sm"
          >
            <div className="space-y-2">
              <Label>Title</Label>
              <div className="relative">
                <Input
                  value={badge.title}
                  onChange={(e) =>
                    updateHomepageContent((prev) => {
                      const updated = [...(prev.trustBadges || [])];
                      updated[index] = { ...(updated[index] || { title: '', description: '' }), title: e.target.value };
                      return { ...prev, trustBadges: updated };
                    }, `homepageContent.trustBadges.${index}.title`)
                  }
                />
                <SavedIndicator field={`homepageContent.trustBadges.${index}.title`} savedFields={savedFields} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <div className="relative">
                <Input
                  value={badge.description}
                  onChange={(e) =>
                    updateHomepageContent((prev) => {
                      const updated = [...(prev.trustBadges || [])];
                      updated[index] = { ...(updated[index] || { title: '', description: '' }), description: e.target.value };
                      return { ...prev, trustBadges: updated };
                    }, `homepageContent.trustBadges.${index}.description`)
                  }
                />
                <SavedIndicator field={`homepageContent.trustBadges.${index}.description`} savedFields={savedFields} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={badge.icon || badgeIconOptions[index % badgeIconOptions.length].value}
                onValueChange={(value) =>
                  updateHomepageContent((prev) => {
                    const updated = [...(prev.trustBadges || [])];
                    updated[index] = { ...(updated[index] || { title: '', description: '' }), icon: value };
                    return { ...prev, trustBadges: updated };
                  }, `homepageContent.trustBadges.${index}.icon`)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {badgeIconOptions.map((option) => (
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
                  updateHomepageContent((prev) => ({
                    ...prev,
                    trustBadges: (prev.trustBadges || []).filter((_, i) => i !== index),
                  }))
                }
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {trustBadges.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No badges added yet.</p>
        )}
      </div>
    </div>
  );
}
