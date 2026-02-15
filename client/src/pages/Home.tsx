import { useEffect, useState } from "react";

import { Link } from "wouter";
import { ArrowRight, Star, Shield, Clock, Sparkles, Heart, BadgeCheck, ThumbsUp, Trophy, Calendar, FileText, ImageIcon } from "lucide-react";
import { AboutSection } from "@/components/AboutSection";
import { AreasServedMap } from "@/components/AreasServedMap";
import { useQuery } from "@tanstack/react-query";
import type { CompanySettings, BlogPost, HomepageContent, ServicePost, GalleryImage } from "@shared/schema";
import { format } from "date-fns";
import { trackCTAClick } from "@/lib/analytics";
import { LeadFormModal } from "@/components/LeadFormModal";
import { ConsultingStepsSection } from "@/components/ConsultingStepsSection";
import { DEFAULT_HOMEPAGE_CONTENT } from "@/lib/homepageDefaults";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { getServicePostPath } from "@/lib/service-path";

function BlogSection({ content }: { content: HomepageContent['blogSection'] }) {
  const sectionContent = {
    ...(content || {}),
  };

  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ['/api/blog', 'published', 3, 0],
    queryFn: () => fetch('/api/blog?status=published&limit=3&offset=0').then(r => r.json()),
  });

  if (isLoading || !posts || posts.length === 0) {
    return null;
  }

  const getExcerpt = (post: BlogPost) => {
    if (post.excerpt) return post.excerpt;
    const text = post.content.replace(/<[^>]*>/g, '');
    return text.length > 120 ? text.slice(0, 120) + '...' : text;
  };

  return (
    <section className="py-20 bg-[#F8FAFC]">
      <div className="container-custom mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1D1D1D] mb-2" data-testid="text-blog-section-title">
              {sectionContent.title}
            </h2>
            <p className="text-slate-600 text-lg">{sectionContent.subtitle}</p>
          </div>
          <Link href="/blog" className="hidden md:flex items-center gap-2 text-primary font-semibold hover:underline" data-testid="link-view-all-blog">
            {sectionContent.viewAllText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group" data-testid={`link-blog-card-${post.id}`}>
              <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                {post.featureImageUrl ? (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.featureImageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      data-testid={`img-blog-home-${post.id}`}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-blue-300" />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span data-testid={`text-blog-home-date-${post.id}`}>
                      {post.publishedAt ? format(new Date(post.publishedAt), 'MMMM d, yyyy') : ''}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1D1D1D] mb-2 line-clamp-2 group-hover:text-primary transition-colors" data-testid={`text-blog-home-title-${post.id}`}>
                    {post.title}
                  </h3>
                  <p className="text-slate-600 text-sm line-clamp-3 flex-1" data-testid={`text-blog-home-excerpt-${post.id}`}>
                    {getExcerpt(post)}
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-primary font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      {sectionContent.readMoreText}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center md:hidden">
          <Link href="/blog" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-colors" data-testid="link-view-all-blog-mobile">
            {sectionContent.viewAllText}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { data: companySettings } = useQuery<CompanySettings>({
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
  const servicePostsList = Array.isArray(servicePosts) ? servicePosts : [];

const consultingStepsSection: HomepageContent["consultingStepsSection"] = companySettings?.homepageContent?.consultingStepsSection || { enabled: false, steps: [] };
  const homepageContent: Partial<HomepageContent> = companySettings?.homepageContent || {};
  const areasServedSection: HomepageContent["areasServedSection"] = {
    ...DEFAULT_HOMEPAGE_CONTENT.areasServedSection,
    ...(homepageContent.areasServedSection || {}),
  };

  const trustBadges = homepageContent.trustBadges || [];
  const reviewsEmbedUrl = homepageContent.reviewsSection?.embedUrl || '';
  const reviewsTitle = homepageContent.reviewsSection?.title || '';
  const reviewsSubtitle = homepageContent.reviewsSection?.subtitle || '';
  const badgeIconMap: Record<string, React.ComponentType<any>> = {
    star: Star,
    shield: Shield,
    clock: Clock,
    sparkles: Sparkles,
    heart: Heart,
    badgeCheck: BadgeCheck,
    thumbsUp: ThumbsUp,
    trophy: Trophy,
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const heroImageUrl = (companySettings?.heroImageUrl || '').trim();
  const hasHeroImage = heroImageUrl.length > 0;
  const heroBackgroundImageUrl = (companySettings?.heroBackgroundImageUrl || '').trim();

  const handleConsultingCta = () => {
    setIsFormOpen(true);
    trackCTAClick('consulting-steps', consultingStepsSection.ctaButtonLabel || '{companySettings?.ctaText || ""}');
  };

  // Handle hash navigation on mount (e.g., /#about)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
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
        setIsFormOpen(true);
      }
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, []);

  return (
    <div className="pb-0">
      {/* Hero Section */}
      <section className="relative flex items-center lg:items-end pt-16 sm:pt-20 lg:pt-16 pb-12 sm:pb-16 lg:pb-20 overflow-hidden bg-[#1C53A3] min-h-[65vh] sm:min-h-[50vh] lg:min-h-[500px] xl:min-h-[550px]">
        <div className="container-custom mx-auto relative z-10 w-full">
          <div className={hasHeroImage ? "grid grid-cols-1 lg:grid-cols-2 gap-1 sm:gap-6 lg:gap-8 items-center lg:items-center" : "grid grid-cols-1 place-items-center"}>
            <div className={hasHeroImage ? "order-1 lg:order-2 text-white pt-6 sm:pt-8 lg:pt-16 pb-1 sm:pb-5 lg:pb-[5.5rem] lg:translate-y-0 relative z-20" : "order-1 text-white pt-6 sm:pt-8 pb-1 sm:pb-5 relative z-20 w-full max-w-4xl text-center"}>
              {homepageContent.heroBadgeImageUrl ? (
                <div className={hasHeroImage ? "mt-4 sm:mt-0 mb-3 lg:mb-6" : "mt-4 sm:mt-0 mb-3 lg:mb-6 flex justify-center"}>
                  <img
                    src={homepageContent.heroBadgeImageUrl}
                    alt={homepageContent.heroBadgeAlt || ''}
                    className="h-5 sm:h-6 w-auto object-contain"
                  />
                </div>
              ) : null}
              <h1 className="text-[11vw] sm:text-5xl md:text-6xl lg:text-4xl xl:text-5xl font-bold mb-3 lg:mb-6 font-display leading-[1.05] sm:leading-[1.1]">
                {companySettings?.heroTitle ? (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">{companySettings.heroTitle}</span>
                ) : null}
              </h1>
              <p className={hasHeroImage ? "text-base sm:text-xl text-blue-50/80 mb-4 lg:mb-8 leading-relaxed max-w-xl" : "text-base sm:text-xl text-blue-50/80 mb-4 lg:mb-8 leading-relaxed max-w-xl mx-auto"}>
                {companySettings?.heroSubtitle || ""}
              </p>
              <div className={hasHeroImage ? "flex flex-col sm:flex-row gap-3 lg:gap-5 flex-wrap" : "flex flex-col sm:flex-row gap-3 lg:gap-5 flex-wrap justify-center"}>
                {companySettings?.ctaText ? (
                  <button
                    data-form-trigger="lead-form"
                    className="w-full sm:w-auto shrink-0 px-6 sm:px-8 py-3 sm:py-4 bg-[#406EF1] hover:bg-[#355CD0] hover:scale-105 text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 text-base sm:text-lg whitespace-nowrap"
                    onClick={() => {
                      setIsFormOpen(true);
                      trackCTAClick('hero', companySettings?.ctaText || '');
                    }}
                    data-testid="button-hero-form"
                  >
                    {companySettings?.ctaText}
                  </button>
                ) : null}
              </div>
            </div>
            {hasHeroImage ? (
              <div className="order-2 lg:order-1 relative flex h-full items-end justify-center lg:justify-end self-end w-full lg:min-h-[400px] z-10 lg:ml-[-3%] mt-0 sm:mt-0 lg:-mt-10">
                <img
                  src={heroImageUrl}
                  alt={companySettings?.companyName || ""}
                  className="w-[92vw] sm:w-[98%] lg:w-full max-w-[380px] sm:max-w-[360px] md:max-w-[430px] lg:max-w-[500px] xl:max-w-[560px] object-contain drop-shadow-2xl -translate-y-[2%] sm:-translate-y-[1%] lg:translate-y-[0%] scale-100 sm:scale-100 lg:scale-98 origin-bottom"
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Hero Background Gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: heroBackgroundImageUrl
              ? `linear-gradient(to right bottom, rgba(9, 21, 45, 0.9), rgba(11, 21, 42, 0.9)), url(${heroBackgroundImageUrl}) center/cover no-repeat`
              : `linear-gradient(
                to right bottom,
                #09152d,
                #0b152a,
                #0d1427,
                #0f1424,
                #101421,
                #121622,
                #151723,
                #171924,
                #1c1c29,
                #21202e,
                #262332,
                #2c2637
              )`
          }}
        ></div>
      </section>
      {/* Trust Badges */}
      {trustBadges.length > 0 && (
      <section className="relative z-20 -mt-8 sm:-mt-12 lg:-mt-16 bg-transparent">
        <div className="container-custom mx-auto relative">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 overflow-hidden relative z-30">
            {trustBadges.map((feature, i) => {
              const iconKey = (feature.icon || '').toLowerCase();
              const Icon = badgeIconMap[iconKey] || badgeIconMap.star || Star;
              return (
                <div key={i} className="p-8 flex items-center gap-6 hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 bg-blue-50 text-primary rounded-full flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1D1D1D]">{feature.title}</h3>
                    <p className="text-sm text-slate-500">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}
      {consultingStepsSection?.enabled && (consultingStepsSection?.steps?.length ?? 0) > 0 && (
      <ConsultingStepsSection
        section={consultingStepsSection}
        onCtaClick={handleConsultingCta}
      />
      )}
      <div className="h-0 bg-[#111111]"></div>
      {/* Reviews Section */}
      {(reviewsEmbedUrl || reviewsTitle || reviewsSubtitle) && (
      <section className="pt-6 sm:pt-10 lg:pt-12 pb-0 bg-[#111111] overflow-hidden mb-0 text-white">
        <div className="w-full">
          <div className="container-custom mx-auto mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
              {reviewsTitle}
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto text-lg">
              {reviewsSubtitle}
            </p>
          </div>
          {reviewsEmbedUrl ? (
            <div className="w-full px-0">
              <div className="pb-0 bg-[#111111] -mt-6 sm:-mt-8 lg:-mt-10">
                <iframe 
                  className="lc_reviews_widget rounded-none" 
                  src={reviewsEmbedUrl}
                  frameBorder='0' 
                  scrolling='no' 
                  style={{ minWidth: '100%', width: '100%', height: '488px', border: 'none', display: 'block', borderRadius: '0', background: '#111111' }}
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
        </div>
      </section>
      )}
      <ServicesCarouselSection posts={servicePostsList} />
      <GalleryShowcaseSection images={galleryPreview || []} />
      <BlogSection content={homepageContent.blogSection} />
      {(companySettings?.aboutImageUrl || homepageContent.aboutSection?.description || (homepageContent.aboutSection?.highlights && homepageContent.aboutSection.highlights.length > 0)) && (
      <section id="about" className="bg-white py-20">
        <AboutSection
          aboutImageUrl={companySettings?.aboutImageUrl}
          content={homepageContent.aboutSection}
        />
      </section>
      )}
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

function ServiceCard({ post }: { post: ServicePost }) {
  return (
    <Link
      href={getServicePostPath(post.id, post.slug)}
      className="group block h-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      data-testid={`link-home-service-post-${post.id}`}
    >
      {post.featureImageUrl ? (
        <img src={post.featureImageUrl} alt={post.title} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
          <ImageIcon className="h-10 w-10 text-slate-400" />
        </div>
      )}
      <div className="space-y-3 p-5">
        <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-600">
          {post.excerpt || "Professional service tailored to your needs."}
        </p>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          View service page
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function ServicesCarouselSection({ posts }: { posts: ServicePost[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const safePosts = Array.isArray(posts) ? posts : [];
  const featuredPosts = safePosts
    .filter((post) => post.status === "published")
    .slice(0, 12);

  const enableCarousel = featuredPosts.length > 3;

  useEffect(() => {
    if (!api || !enableCarousel) return;
    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 4500);
    return () => clearInterval(interval);
  }, [api, enableCarousel]);

  if (featuredPosts.length === 0) return null;

  return (
    <section className="bg-white py-20">
      <div className="container-custom mx-auto">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-[#1D1D1D] md:text-4xl">Featured Services</h2>
            <p className="mt-2 text-lg text-slate-600">Explore our most requested services and open each page for details.</p>
          </div>
          <Link href="/services" className="hidden md:inline-flex items-center gap-2 text-primary font-semibold hover:underline">
            View all services
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {enableCarousel ? (
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {featuredPosts.map((post) => (
                <CarouselItem key={post.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <ServiceCard post={post} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {featuredPosts.map((post) => (
              <div key={post.id} className="w-full max-w-md sm:w-[calc(50%-12px)] lg:w-[calc(33.33%-16px)]">
                <ServiceCard post={post} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link href="/services" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white hover:bg-primary/90">
            View all services
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function GalleryShowcaseSection({ images }: { images: GalleryImage[] }) {
  if (!images.length) return null;

  return (
    <section className="bg-[#F8FAFC] py-20">
      <div className="container-custom mx-auto">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-[#1D1D1D] md:text-4xl">Gallery Showcase</h2>
            <p className="mt-2 text-lg text-slate-600">A quick preview of our latest project photos.</p>
          </div>
          <Link href="/gallery" className="hidden md:inline-flex items-center gap-2 text-primary font-semibold hover:underline">
            View all photos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {images.slice(0, 8).map((image) => (
            <Link
              key={image.id}
              href="/gallery"
              className="group overflow-hidden rounded-xl border border-white/60 bg-white shadow-sm"
              data-testid={`link-home-gallery-${image.id}`}
            >
              <img
                src={image.imageUrl}
                alt={image.altText || image.title || "Gallery image"}
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link href="/gallery" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-white hover:bg-primary/90">
            View all photos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
