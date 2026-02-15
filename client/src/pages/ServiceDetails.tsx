import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { CompanySettings, ServicePost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { getServicePostPath } from "@/lib/service-path";
import { LeadFormModal } from "@/components/LeadFormModal";

function setMetaTag(name: string, content: string, isProperty = false) {
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(isProperty ? "property" : "name", name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

function upsertJsonLd(id: string, data: unknown) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function ServiceDetails() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: post, isLoading, isError } = useQuery<ServicePost>({
    queryKey: ["/api/service-posts", slug],
    queryFn: () =>
      fetch(`/api/service-posts/${slug}`).then((res) => {
        if (!res.ok) {
          throw new Error("Service not found");
        }
        return res.json();
      }),
    enabled: !!slug,
  });

  const { data: relatedPosts } = useQuery<ServicePost[]>({
    queryKey: ["/api/service-posts"],
    queryFn: () => fetch("/api/service-posts").then((res) => res.json()),
    enabled: !!post,
  });

  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });

  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!post) return;
    const canonicalBase = settings?.seoCanonicalUrl || window.location.origin;
    const canonicalPath = getServicePostPath(post.id, post.slug);
    const canonicalUrl = `${canonicalBase}${canonicalPath}`;
    const title = `${post.title} | ${settings?.companyName || "Services"}`;
    const description =
      post.metaDescription ||
      post.excerpt ||
      `Learn more about ${post.title}.`;
    const shareImage = post.featureImageUrl || undefined;

    document.title = title;
    setMetaTag("description", description);
    setMetaTag("og:title", title, true);
    setMetaTag("og:description", description, true);
    setMetaTag("og:url", canonicalUrl, true);
    if (shareImage) {
      setMetaTag("og:image", shareImage, true);
      setMetaTag("twitter:image", shareImage);
    }
    setMetaTag("twitter:title", title);
    setMetaTag("twitter:description", description);
    setCanonical(canonicalUrl);

    upsertJsonLd("service-jsonld", {
      "@context": "https://schema.org",
      "@type": "Service",
      name: post.title,
      description,
      image: shareImage,
      provider: {
        "@type": "Organization",
        name: settings?.companyName || "Company",
        url: canonicalBase,
      },
      areaServed: settings?.companyAddress || undefined,
      url: canonicalUrl,
    });

    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({}, "", canonicalPath);
    }
  }, [post, settings]);

  if (!slug) {
    return (
      <div className="container-custom py-16">
        <h1 className="text-2xl font-bold">Invalid service URL</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-custom py-10">
        <Skeleton className="mb-4 h-6 w-40" />
        <Skeleton className="mb-3 h-12 w-3/4" />
        <Skeleton className="mb-8 aspect-video w-full max-w-4xl" />
        <Skeleton className="h-4 w-full max-w-3xl" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="container-custom py-16 text-center">
        <h1 className="text-2xl font-bold">Service not found</h1>
        <p className="mt-2 text-muted-foreground">The service you requested is unavailable.</p>
        <Link href="/services" className="mt-6 inline-flex">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Services
          </Button>
        </Link>
      </div>
    );
  }

  const related = (relatedPosts || [])
    .filter((item) => item.id !== post.id)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative flex min-h-[35vh] items-center justify-center overflow-hidden bg-slate-900 text-white">
        {post.featureImageUrl && (
          <div className="absolute inset-0 z-0">
            <img
              src={post.featureImageUrl}
              alt={post.title}
              className="h-full w-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />
          </div>
        )}
        <div className="container-custom relative z-10 mx-auto px-4 pt-24 pb-6 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl" data-testid="text-service-title">
            {post.title}
          </h1>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="h-10 min-w-[180px] border-0 text-base" onClick={() => setIsFormOpen(true)}>
              Get a Free Quote
            </Button>
            <Link href="/services">
              <Button variant="outline" size="lg" className="h-10 min-w-[180px] border-0 bg-white/10 text-white hover:bg-white/20 hover:text-white text-base">
                View All Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container-custom py-6 md:py-10">
        <div className="mx-auto w-full">
          {post.featureImageUrl && (
            <div className="mb-8 overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
              <img
                src={post.featureImageUrl}
                alt={post.title}
                className="h-full w-full object-cover max-h-[600px]"
              />
            </div>
          )}
          <div className="prose prose-lg prose-slate max-w-none mx-auto dark:prose-invert">
            {post.content ? (
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <ImageIcon className="mb-4 h-16 w-16 opacity-20" />
                <p>Detailed description for this service is coming soon.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 py-16 md:py-24">
        <div className="container-custom text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Ready to start your project?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Contact us today to discuss your {post.title.toLowerCase()} needs and get a personalized quote.
          </p>
          <Button size="lg" className="h-12 min-w-[200px] text-lg" onClick={() => setIsFormOpen(true)}>
            Contact Us Now
          </Button>
        </div>
      </section>

      {/* Related Services */}
      {related.length > 0 && (
        <section className="container-custom py-16 md:py-24">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="text-3xl font-bold">Other Services</h2>
            <Link href="/services">
              <Button variant="ghost" className="hidden sm:flex">
                View All <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </Link>
          </div>
          {related.length > 2 ? (
            <Carousel
              opts={{
                align: "start",
              }}
              className="w-full"
            >
              <CarouselContent>
                {related.map((item) => (
                  <CarouselItem key={item.id} className="sm:basis-1/2 lg:basis-1/4">
                    <Link href={getServicePostPath(item.id, item.slug)} className="group block h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        {item.featureImageUrl ? (
                          <img
                            src={item.featureImageUrl}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="mb-2 font-bold text-foreground group-hover:text-primary">{item.title}</h3>
                        {item.excerpt && (
                          <p className="line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
                        )}
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          ) : (
            <div className="flex flex-wrap justify-center gap-6">
              {related.map((item) => (
                <div key={item.id} className="w-full max-w-sm sm:w-[calc(50%-12px)]">
                  <Link href={getServicePostPath(item.id, item.slug)} className="group block h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      {item.featureImageUrl ? (
                        <img
                          src={item.featureImageUrl}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="mb-2 font-bold text-foreground group-hover:text-primary">{item.title}</h3>
                      {item.excerpt && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 flex justify-center sm:hidden">
            <Link href="/services">
              <Button variant="outline" className="w-full">
                View All Services
              </Button>
            </Link>
          </div>
        </section>
      )}
      <LeadFormModal open={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  );
}
