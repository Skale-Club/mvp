import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CompanySettings, HomepageContent, ServicePost, GalleryImage } from "@shared/schema";
import { AboutSection } from "@/components/AboutSection";
import { AreasServedMap } from "@/components/AreasServedMap";
import { LeadFormModal } from "@/components/LeadFormModal";
import { DEFAULT_HOMEPAGE_CONTENT } from "@/lib/homepageDefaults";
import { fireConversionEvent } from "@/lib/attribution";
import { ErrorState } from "@/components/ui/error-state";
import { FaqSection } from "@/components/FaqSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { TrustBadgesSection } from "@/components/sections/TrustBadgesSection";
import { ServicesCarouselSection } from "@/components/sections/ServicesCarouselSection";
import { GalleryShowcaseSection } from "@/components/sections/GalleryShowcaseSection";
import { BlogSection } from "@/components/sections/BlogSection";
import { ReviewsSection } from "@/components/sections/ReviewsSection";
import type { FallbackReview } from "@/components/sections/FallbackReviewCard";

type PublicReviewsPayload = {
  settings: {
    sectionTitle: string;
    sectionSubtitle: string;
    displayMode: 'auto' | 'widget' | 'fallback';
    widgetEnabled: boolean;
    widgetEmbedUrl: string;
    fallbackEnabled: boolean;
    useWidget: boolean;
    useFallback: boolean;
  };
  fallbackReviews: FallbackReview[];
};

export default function Home() {
  const { data: companySettings, isError: isSettingsError, refetch: refetchSettings } = useQuery<CompanySettings>({
    queryKey: ['/api/company-settings'],
  });
  const { data: galleryPreview } = useQuery<GalleryImage[]>({
    queryKey: ['/api/gallery', 'home', 8],
    queryFn: () => fetch('/api/gallery?limit=8').then((res) => res.json()),
  });
  const { data: servicePosts } = useQuery<ServicePost[]>({
    queryKey: ['/api/service-posts', 'published', 12, 0],
    queryFn: () => fetch('/api/service-posts?status=published&limit=12&offset=0').then((res) => res.json()),
  });
  const { data: reviewsPayload } = useQuery<PublicReviewsPayload>({
    queryKey: ['/api/reviews'],
  });

  const servicePostsList = Array.isArray(servicePosts) ? servicePosts : [];
  const homepageContent: Partial<HomepageContent> = companySettings?.homepageContent || {};
  const areasServedSection: HomepageContent["areasServedSection"] = {
    ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection,
    ...(homepageContent.areasServedSection || {}),
  };

  const trustBadges = homepageContent.trustBadges || [];
  const reviewsTitle = (reviewsPayload?.settings?.sectionTitle || '').trim();
  const reviewsSubtitle = (reviewsPayload?.settings?.sectionSubtitle || '').trim();
  const reviewsEmbedUrl = (reviewsPayload?.settings?.widgetEmbedUrl || '').trim();
  const reviewsUseWidget = !!reviewsPayload?.settings?.useWidget;
  const reviewsUseFallback = !!reviewsPayload?.settings?.useFallback;
  const fallbackReviews = Array.isArray(reviewsPayload?.fallbackReviews) ? reviewsPayload.fallbackReviews : [];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const heroImageUrl = (companySettings?.heroImageUrl || '').trim();
  const heroBackgroundImageUrl = (companySettings?.heroBackgroundImageUrl || '').trim();

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, []);

  useEffect(() => {
    const clickHandler = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const trigger = target.closest('[data-form-trigger], button, a') as HTMLElement | null;
      if (!trigger) return;
      if (trigger.dataset.formTrigger === 'lead-form') {
        event.preventDefault();
        fireConversionEvent("booking_started");
        setIsFormOpen(true);
      }
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, []);

  if (isSettingsError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center pt-24">
        <ErrorState
          title="Failed to load page"
          message="We couldn't load the homepage content. Please try again."
          onRetry={() => refetchSettings()}
        />
      </div>
    );
  }

  return (
    <div className="pb-0">
      <HeroSection
        heroTitle={companySettings?.heroTitle}
        heroSubtitle={companySettings?.heroSubtitle}
        ctaText={companySettings?.ctaText}
        companyName={companySettings?.companyName}
        heroImageUrl={heroImageUrl}
        heroBackgroundImageUrl={heroBackgroundImageUrl}
        heroBadgeImageUrl={homepageContent.heroBadgeImageUrl}
        heroBadgeAlt={homepageContent.heroBadgeAlt}
        hasTrustBadges={trustBadges.length > 0}
        onCtaClick={() => {
          fireConversionEvent("booking_started");
          setIsFormOpen(true);
        }}
      />
      <TrustBadgesSection trustBadges={trustBadges} />
      <div className="h-0 bg-website-footer"></div>
      <ServicesCarouselSection posts={servicePostsList} />
      <GalleryShowcaseSection images={galleryPreview || []} />
      <BlogSection content={homepageContent.blogSection} />
      {(companySettings?.aboutImageUrl || homepageContent.aboutSection?.description || (homepageContent.aboutSection?.highlights && homepageContent.aboutSection.highlights.length > 0)) && (
        <section id="about" className="bg-muted/40 py-20">
          <AboutSection
            aboutImageUrl={companySettings?.aboutImageUrl}
            content={homepageContent.aboutSection}
          />
        </section>
      )}
      <ReviewsSection
        useWidget={reviewsUseWidget}
        useFallback={reviewsUseFallback}
        title={reviewsTitle}
        subtitle={reviewsSubtitle}
        embedUrl={reviewsEmbedUrl}
        fallbackReviews={fallbackReviews}
      />
      <FaqSection maxItems={8} />
      {(companySettings?.mapEmbedUrl || homepageContent.areasServedSection?.heading || homepageContent.areasServedSection?.description) && (
        <section id="areas-served" className="bg-white py-20">
          <AreasServedMap
            mapEmbedUrl={companySettings?.mapEmbedUrl}
            content={areasServedSection}
          />
        </section>
      )}
      <LeadFormModal open={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  );
}
