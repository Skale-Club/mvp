import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { ServicePost } from "@shared/schema";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { ServiceCard } from "./ServiceCard";

export function ServicesCarouselSection({ posts }: { posts: ServicePost[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const safePosts = Array.isArray(posts) ? posts : [];
  const featuredPosts = safePosts.filter((post) => post.status === "published").slice(0, 12);
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
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">Featured Services</h2>
            <p className="mt-2 text-lg text-slate-600">Explore our most requested services and open each page for details.</p>
          </div>
          <Link href="/services" className="hidden md:inline-flex items-center gap-2 text-primary font-semibold hover:underline">
            View all services
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {enableCarousel ? (
          <Carousel setApi={setApi} opts={{ align: "start", loop: true }} className="w-full">
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
