import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Plus, Trash2, Star, Shield, Clock, Sparkles, Heart, BadgeCheck, ThumbsUp, Trophy } from 'lucide-react';
import { DEFAULT_HOMEPAGE_CONTENT } from '@/lib/homepageDefaults';
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
  const trustBadges = homepageContent.trustBadges || [];

  return (
    <div className="space-y-4">
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
            className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] items-start bg-muted p-4 rounded-lg border border-border"
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
