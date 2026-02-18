import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Check, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AdminReviewsResponse,
  ReviewItemData,
  ReviewsSettingsData,
} from '@/components/admin/shared/types';

const DEFAULT_SETTINGS: ReviewsSettingsData = {
  sectionTitle: '',
  sectionSubtitle: '',
  displayMode: 'auto',
  widgetEnabled: false,
  widgetEmbedUrl: '',
  fallbackEnabled: true,
};

type NewReviewDraft = {
  authorName: string;
  authorMeta: string;
  content: string;
  rating: number;
  sourceLabel: string;
  isActive: boolean;
};

const DEFAULT_DRAFT: NewReviewDraft = {
  authorName: '',
  authorMeta: '',
  content: '',
  rating: 5,
  sourceLabel: '',
  isActive: true,
};

function toReviewPayload(item: ReviewItemData) {
  return {
    authorName: item.authorName,
    authorMeta: item.authorMeta || '',
    content: item.content,
    rating: item.rating,
    sourceLabel: item.sourceLabel || '',
    isActive: item.isActive,
    sortOrder: item.sortOrder,
  };
}

export function ReviewsSection() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ReviewsSettingsData>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<ReviewItemData[]>([]);
  const [newReview, setNewReview] = useState<NewReviewDraft>(DEFAULT_DRAFT);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveSettingsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<AdminReviewsResponse>({
    queryKey: ['/api/admin/reviews'],
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!data) return;
    setSettings({
      ...DEFAULT_SETTINGS,
      ...data.settings,
    });
    setItems((data.items || []).slice().sort((a, b) => a.sortOrder - b.sortOrder));
  }, [data]);

  useEffect(() => {
    return () => {
      if (saveSettingsTimeoutRef.current) {
        clearTimeout(saveSettingsTimeoutRef.current);
      }
    };
  }, []);

  const saveSettings = useCallback(
    async (patch: Partial<ReviewsSettingsData>) => {
      setIsSavingSettings(true);
      try {
        await apiRequest('PUT', '/api/admin/reviews/settings', patch);
        queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
        queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
        setLastSavedAt(new Date());
      } catch (error: any) {
        toast({
          title: 'Error saving review settings',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setIsSavingSettings(false);
      }
    },
    [toast]
  );

  const updateSetting = useCallback(
    <K extends keyof ReviewsSettingsData>(field: K, value: ReviewsSettingsData[K]) => {
      setSettings((prev) => ({ ...prev, [field]: value }));
      if (saveSettingsTimeoutRef.current) {
        clearTimeout(saveSettingsTimeoutRef.current);
      }
      saveSettingsTimeoutRef.current = setTimeout(() => {
        saveSettings({ [field]: value });
      }, 700);
    },
    [saveSettings]
  );

  const persistItem = useCallback(
    async (item: ReviewItemData) => {
      try {
        await apiRequest('PUT', `/api/admin/reviews/items/${item.id}`, toReviewPayload(item));
        queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
        queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      } catch (error: any) {
        toast({
          title: 'Error saving review',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const moveItem = useCallback(
    async (id: number, direction: 'up' | 'down') => {
      const currentIndex = items.findIndex((item) => item.id === id);
      if (currentIndex < 0) return;
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= items.length) return;

      const next = items.slice();
      const [moved] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, moved);
      const normalized = next.map((item, index) => ({ ...item, sortOrder: index }));
      setItems(normalized);

      try {
        await apiRequest('POST', '/api/admin/reviews/items/reorder', {
          itemIds: normalized.map((item) => item.id),
        });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
        queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      } catch (error: any) {
        toast({
          title: 'Error reordering reviews',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    [items, toast]
  );

  const addReview = useCallback(async () => {
    if (!newReview.authorName.trim() || !newReview.content.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Name and review text are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/admin/reviews/items', {
        ...newReview,
        sortOrder: items.length,
      });
      setNewReview(DEFAULT_DRAFT);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      toast({ title: 'Review added' });
    } catch (error: any) {
      toast({
        title: 'Error adding review',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [items.length, newReview, toast]);

  const deleteReview = useCallback(
    async (id: number) => {
      try {
        await apiRequest('DELETE', `/api/admin/reviews/items/${id}`);
        queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
        queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
        toast({ title: 'Review removed' });
      } catch (error: any) {
        toast({
          title: 'Error deleting review',
          description: error.message,
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const sortedItems = useMemo(() => items.slice().sort((a, b) => a.sortOrder - b.sortOrder), [items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : 'Failed to load reviews.';
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h2 className="font-semibold text-destructive">Could not load reviews data</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            If this is a new section, restart the backend server so the new `/api/admin/reviews` routes are registered.
          </p>
          <div className="mt-3">
            <Button variant="outline" onClick={() => void refetch()} data-testid="button-reviews-retry">
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-muted-foreground">Configure widget and fallback reviews for clients without widget</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSavingSettings ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSavedAt ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span>Auto-saved</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="bg-muted p-6 rounded-lg space-y-5">
        <h2 className="text-lg font-semibold">Section Settings</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Section title</Label>
            <Input
              value={settings.sectionTitle || ''}
              onChange={(e) => updateSetting('sectionTitle', e.target.value)}
              data-testid="input-reviews-section-title"
            />
          </div>
          <div className="space-y-2">
            <Label>Display mode</Label>
            <Select
              value={settings.displayMode}
              onValueChange={(value: 'auto' | 'widget' | 'fallback') => updateSetting('displayMode', value)}
            >
              <SelectTrigger data-testid="select-reviews-display-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (widget when available)</SelectItem>
                <SelectItem value="widget">Force widget</SelectItem>
                <SelectItem value="fallback">Force fallback</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Section subtitle</Label>
          <Textarea
            value={settings.sectionSubtitle || ''}
            onChange={(e) => updateSetting('sectionSubtitle', e.target.value)}
            className="min-h-[90px]"
            data-testid="textarea-reviews-section-subtitle"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Enable review widget</p>
                <p className="text-xs text-muted-foreground">Use external embed when available</p>
              </div>
              <Switch
                checked={settings.widgetEnabled}
                onCheckedChange={(checked) => updateSetting('widgetEnabled', checked)}
                data-testid="switch-reviews-widget-enabled"
              />
            </div>
            <Input
              value={settings.widgetEmbedUrl || ''}
              onChange={(e) => updateSetting('widgetEmbedUrl', e.target.value)}
              placeholder="https://..."
              data-testid="input-reviews-widget-url"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Enable fallback reviews</p>
                <p className="text-xs text-muted-foreground">Show fake reviews when widget is off or unavailable</p>
              </div>
              <Switch
                checked={settings.fallbackEnabled}
                onCheckedChange={(checked) => updateSetting('fallbackEnabled', checked)}
                data-testid="switch-reviews-fallback-enabled"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-muted p-6 rounded-lg space-y-4">
        <h2 className="text-lg font-semibold">Add fallback review</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Customer name</Label>
            <Input
              value={newReview.authorName}
              onChange={(e) => setNewReview((prev) => ({ ...prev, authorName: e.target.value }))}
              data-testid="input-review-new-author"
            />
          </div>
          <div className="space-y-2">
            <Label>Meta (location, profile)</Label>
            <Input
              value={newReview.authorMeta}
              onChange={(e) => setNewReview((prev) => ({ ...prev, authorMeta: e.target.value }))}
              data-testid="input-review-new-meta"
            />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Source label</Label>
            <Input
              value={newReview.sourceLabel}
              onChange={(e) => setNewReview((prev) => ({ ...prev, sourceLabel: e.target.value }))}
              data-testid="input-review-new-source"
            />
          </div>
          <div className="space-y-2">
            <Label>Rating (1-5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={newReview.rating}
              onChange={(e) =>
                setNewReview((prev) => ({
                  ...prev,
                  rating: Math.max(1, Math.min(5, Number(e.target.value) || 5)),
                }))
              }
              data-testid="input-review-new-rating"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Review text</Label>
          <Textarea
            value={newReview.content}
            onChange={(e) => setNewReview((prev) => ({ ...prev, content: e.target.value }))}
            className="min-h-[100px]"
            data-testid="textarea-review-new-content"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={addReview} data-testid="button-review-add">
            <Plus className="w-4 h-4 mr-2" />
            Add review
          </Button>
        </div>
      </div>

      <div className="bg-muted p-6 rounded-lg space-y-4">
        <h2 className="text-lg font-semibold">Fallback reviews list</h2>
        {sortedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fallback reviews available.</p>
        ) : (
          <div className="space-y-4">
            {sortedItems.map((item, index) => (
              <div key={item.id} className="rounded-lg border border-border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>Item #{index + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => moveItem(item.id, 'up')}
                      disabled={index === 0}
                      data-testid={`button-review-up-${item.id}`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => moveItem(item.id, 'down')}
                      disabled={index === sortedItems.length - 1}
                      data-testid={`button-review-down-${item.id}`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => deleteReview(item.id)}
                      data-testid={`button-review-delete-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <Input
                    value={item.authorName}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((review) =>
                          review.id === item.id ? { ...review, authorName: e.target.value } : review
                        )
                      )
                    }
                    onBlur={() => persistItem(item)}
                    placeholder="Customer name"
                    data-testid={`input-review-author-${item.id}`}
                  />
                  <Input
                    value={item.authorMeta}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((review) =>
                          review.id === item.id ? { ...review, authorMeta: e.target.value } : review
                        )
                      )
                    }
                    onBlur={() => persistItem(item)}
                    placeholder="Meta"
                    data-testid={`input-review-meta-${item.id}`}
                  />
                </div>

                <Textarea
                  value={item.content}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((review) =>
                        review.id === item.id ? { ...review, content: e.target.value } : review
                      )
                    )
                  }
                  onBlur={() => persistItem(item)}
                  className="min-h-[90px]"
                  data-testid={`textarea-review-content-${item.id}`}
                />

                <div className="grid gap-3 lg:grid-cols-3">
                  <Input
                    value={item.sourceLabel}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((review) =>
                          review.id === item.id ? { ...review, sourceLabel: e.target.value } : review
                        )
                      )
                    }
                    onBlur={() => persistItem(item)}
                    placeholder="Source label"
                    data-testid={`input-review-source-${item.id}`}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={item.rating}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((review) =>
                          review.id === item.id
                            ? { ...review, rating: Math.max(1, Math.min(5, Number(e.target.value) || 5)) }
                            : review
                        )
                      )
                    }
                    onBlur={() => persistItem(item)}
                    data-testid={`input-review-rating-${item.id}`}
                  />
                  <div className="flex items-center justify-between rounded-md border border-border px-3">
                    <span className="text-sm">Active</span>
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={(checked) => {
                        setItems((prev) =>
                          prev.map((review) =>
                            review.id === item.id ? { ...review, isActive: checked } : review
                          )
                        );
                        void persistItem({ ...item, isActive: checked });
                      }}
                      data-testid={`switch-review-active-${item.id}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
