import { ReviewsCarouselSection } from "./ReviewsCarouselSection";
import type { FallbackReview } from "./FallbackReviewCard";

type ReviewsSectionProps = {
  useWidget: boolean;
  useFallback: boolean;
  title?: string;
  subtitle?: string;
  embedUrl?: string;
  fallbackReviews: FallbackReview[];
};

export function ReviewsSection({
  useWidget,
  useFallback,
  title,
  subtitle,
  embedUrl,
  fallbackReviews,
}: ReviewsSectionProps) {
  const hasContent = useWidget || (useFallback && fallbackReviews.length > 0) || title || subtitle;
  if (!hasContent) return null;

  return (
    <section className="pt-6 sm:pt-10 lg:pt-12 pb-0 bg-white mb-0 text-slate-800">
      <div className="w-full">
        {(title || subtitle) ? (
          <div className="container-custom mx-auto mb-16 text-center">
            {title ? (
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-800">{title}</h2>
            ) : null}
            {subtitle ? (
              <p className="text-slate-600 max-w-2xl mx-auto text-lg">{subtitle}</p>
            ) : null}
          </div>
        ) : null}
        {useWidget && embedUrl ? (
          <div className="w-full px-0">
            <div className="pb-0 bg-muted/40 -mt-6 sm:-mt-8 lg:-mt-10">
              <iframe
                className="lc_reviews_widget rounded-none"
                src={embedUrl}
                frameBorder="0"
                scrolling="no"
                style={{ minWidth: '100%', width: '100%', height: '488px', border: 'none', display: 'block', borderRadius: '0', background: 'transparent' }}
                onLoad={() => {
                  const script = document.createElement('script');
                  script.type = 'text/javascript';
                  script.src = 'https://reputationhub.site/reputation/assets/review-widget.js';
                  document.body.appendChild(script);
                }}
              ></iframe>
            </div>
          </div>
        ) : null}
        {!useWidget && useFallback && fallbackReviews.length > 0 ? (
          <ReviewsCarouselSection reviews={fallbackReviews} />
        ) : null}
      </div>
    </section>
  );
}
