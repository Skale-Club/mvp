import { Star } from "lucide-react";

export type FallbackReview = {
  id: number;
  authorName: string;
  authorMeta: string;
  content: string;
  rating: number;
  sourceLabel: string;
  isActive: boolean;
};

export function FallbackReviewCard({ review }: { review: FallbackReview }) {
  return (
    <article
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-full"
      data-testid={`card-fallback-review-${review.id}`}
    >
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: Math.max(1, Math.min(5, review.rating || 5)) }).map((_, index) => (
          <Star key={`${review.id}-star-${index}`} className="h-4 w-4 text-amber-500 fill-amber-500" />
        ))}
      </div>
      <p className="text-slate-700 leading-relaxed mb-4">"{review.content}"</p>
      <p className="font-semibold text-slate-900">{review.authorName}</p>
      {review.authorMeta ? (
        <p className="text-sm text-slate-500">{review.authorMeta}</p>
      ) : null}
      {review.sourceLabel ? (
        <span className="inline-flex mt-3 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {review.sourceLabel}
        </span>
      ) : null}
    </article>
  );
}
