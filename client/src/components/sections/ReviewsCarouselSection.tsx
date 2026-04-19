import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { FallbackReviewCard, type FallbackReview } from "./FallbackReviewCard";

export function ReviewsCarouselSection({ reviews }: { reviews: FallbackReview[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const enableCarousel = safeReviews.length > 1;

  useEffect(() => {
    if (!api || !enableCarousel) return;
    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [api, enableCarousel]);

  if (safeReviews.length === 0) return null;

  if (!enableCarousel) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-16">
        <FallbackReviewCard review={safeReviews[0]} />
      </div>
    );
  }

  return (
    <div className="w-full pb-16">
      <div className="relative">
        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true }}
          className="w-full px-4 sm:px-6 lg:px-8"
        >
          <CarouselContent>
            {safeReviews.map((review) => (
              <CarouselItem key={review.id} className="pl-0 px-2 sm:px-3 lg:px-4 basis-full sm:basis-1/2 lg:basis-1/3">
                <FallbackReviewCard review={review} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        <button
          type="button"
          aria-label="Previous review"
          onClick={() => api?.scrollPrev()}
          className="inline-flex absolute left-1 top-1/2 -translate-y-1/2 z-10 items-center justify-center text-slate-700 hover:text-slate-900"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label="Next review"
          onClick={() => api?.scrollNext()}
          className="inline-flex absolute right-1 top-1/2 -translate-y-1/2 z-10 items-center justify-center text-slate-700 hover:text-slate-900"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
