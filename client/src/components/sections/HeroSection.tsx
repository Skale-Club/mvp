import { trackCTAClick } from "@/lib/analytics";

type HeroSectionProps = {
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  ctaText?: string | null;
  companyName?: string | null;
  heroImageUrl?: string;
  heroBackgroundImageUrl?: string;
  heroBadgeImageUrl?: string | null;
  heroBadgeAlt?: string | null;
  hasTrustBadges?: boolean;
  onCtaClick: () => void;
};

export function HeroSection({
  heroTitle,
  heroSubtitle,
  ctaText,
  companyName,
  heroImageUrl,
  heroBackgroundImageUrl,
  heroBadgeImageUrl,
  heroBadgeAlt,
  hasTrustBadges,
  onCtaClick,
}: HeroSectionProps) {
  const hasHeroImage = (heroImageUrl || '').length > 0;

  return (
    <section className="relative flex items-center justify-center overflow-hidden bg-primary min-h-[65vh] sm:min-h-[50vh] lg:min-h-[500px] xl:min-h-[550px] py-16 sm:py-20">
      <div className={`container-custom mx-auto relative z-10 w-full py-8 ${hasTrustBadges ? 'translate-y-4 sm:translate-y-2 lg:translate-y-0' : 'translate-y-8'}`}>
        <div className={hasHeroImage ? "grid grid-cols-1 lg:grid-cols-2 gap-1 sm:gap-6 lg:gap-8 items-center lg:items-center" : "grid grid-cols-1 place-items-center"}>
          <div className={hasHeroImage ? "order-1 lg:order-2 text-white relative z-20" : "order-1 text-white relative z-20 w-full max-w-4xl text-center"}>
            {heroBadgeImageUrl ? (
              <div className={hasHeroImage ? "mt-4 sm:mt-0 mb-3 lg:mb-6" : "mt-4 sm:mt-0 mb-3 lg:mb-6 flex justify-center"}>
                <img
                  src={heroBadgeImageUrl}
                  alt={heroBadgeAlt || ''}
                  className="h-5 sm:h-6 w-auto object-contain"
                />
              </div>
            ) : null}
            <h1 className="text-5xl sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-3 lg:mb-6 font-display leading-[0.95] sm:leading-[1.0] lg:leading-[1.05]">
              {heroTitle ? (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">{heroTitle}</span>
              ) : null}
            </h1>
            <p className={hasHeroImage ? "text-base sm:text-xl text-primary-foreground/80 mb-4 lg:mb-8 leading-relaxed max-w-xl" : "text-base sm:text-xl text-primary-foreground/80 mb-4 lg:mb-8 leading-relaxed max-w-xl mx-auto"}>
              {heroSubtitle || ""}
            </p>
            <div className={hasHeroImage ? "flex flex-col sm:flex-row gap-3 lg:gap-5 flex-wrap" : "flex flex-col sm:flex-row gap-3 lg:gap-5 flex-wrap justify-center"}>
              {ctaText ? (
                <button
                  data-form-trigger="lead-form"
                  className="w-full sm:w-auto shrink-0 px-6 sm:px-8 py-3 sm:py-4 bg-cta hover:bg-cta-hover hover:scale-105 text-white font-bold rounded-full transition-all flex items-center justify-center gap-2 text-base sm:text-lg whitespace-nowrap"
                  onClick={() => {
                    onCtaClick();
                    trackCTAClick('hero', ctaText);
                  }}
                  data-testid="button-hero-form"
                >
                  {ctaText}
                </button>
              ) : null}
            </div>
          </div>
          {hasHeroImage ? (
            <div className="order-2 lg:order-1 relative flex h-full items-end justify-center lg:justify-end self-end w-full lg:min-h-[400px] z-10 lg:ml-[-3%] mt-0 sm:mt-0 lg:-mt-10">
              <img
                src={heroImageUrl}
                alt={companyName || ""}
                className="w-[92vw] sm:w-[98%] lg:w-full max-w-[380px] sm:max-w-[360px] md:max-w-[430px] lg:max-w-[500px] xl:max-w-[560px] object-contain drop-shadow-2xl -translate-y-[2%] sm:-translate-y-[1%] lg:translate-y-[0%] scale-100 sm:scale-100 lg:scale-98 origin-bottom"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="absolute inset-0"
        style={{
          background: heroBackgroundImageUrl
            ? `linear-gradient(to right bottom, rgba(0, 0, 0, 0.6), rgba(20, 20, 30, 0.7)), url(${heroBackgroundImageUrl}) center/cover no-repeat`
            : `linear-gradient(to right bottom, var(--website-nav-bg), var(--website-footer-bg))`
        }}
      ></div>
    </section>
  );
}
