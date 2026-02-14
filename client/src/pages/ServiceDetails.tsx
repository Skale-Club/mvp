import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { CompanySettings, Service, ServicePost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, ImageIcon, Tag } from "lucide-react";
import { getServicePath, getServicePostPath } from "@/lib/service-path";

interface ServiceDetailsResponse {
  post: ServicePost;
  service: Service;
}

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

export default function ServiceDetails() {
  const params = useParams<{ id: string; slug?: string }>();
  const serviceId = Number(params.id);

  const { data: payload, isLoading, isError } = useQuery<ServiceDetailsResponse>({
    queryKey: ["/api/services", serviceId, "post"],
    queryFn: () =>
      fetch(`/api/services/${serviceId}/post`).then((res) => {
        if (!res.ok) {
          throw new Error("Service not found");
        }
        return res.json();
      }),
    enabled: Number.isFinite(serviceId),
  });

  const { data: relatedServices } = useQuery<Service[]>({
    queryKey: ["/api/services", "category-related", payload?.service?.categoryId],
    queryFn: () => fetch(`/api/services?categoryId=${payload?.service?.categoryId}`).then((res) => res.json()),
    enabled: !!payload?.service?.categoryId,
  });

  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });

  useEffect(() => {
    if (!payload?.service || !payload?.post) return;
    const { service, post } = payload;
    const canonicalBase = settings?.seoCanonicalUrl || window.location.origin;
    const canonicalPath = getServicePostPath(service.id, post.slug);
    const canonicalUrl = `${canonicalBase}${canonicalPath}`;
    const title = `${post.title || service.name} | ${settings?.companyName || "Services"}`;
    const description =
      post.metaDescription ||
      post.excerpt ||
      service.description ||
      `Learn more about ${service.name}, including scope, duration, and pricing.`;
    const shareImage = post.featureImageUrl || service.imageUrl || undefined;

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
      name: post.title || service.name,
      description,
      image: shareImage,
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: String(service.price),
      },
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
  }, [payload, settings]);

  if (!Number.isFinite(serviceId)) {
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

  if (isError || !payload?.service || !payload?.post) {
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

  const { service, post } = payload;
  const related = (relatedServices || []).filter((item) => item.id !== service.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-primary/5 py-8 md:py-10">
        <div className="container-custom">
          <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" data-testid="nav-service-breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/services" className="hover:text-primary">Services</Link>
            <span>/</span>
            <span className="truncate text-foreground">{post.title || service.name}</span>
          </nav>
          <h1 className="text-3xl font-bold md:text-4xl" data-testid="text-service-title">
            {post.title || service.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              <Tag className="mr-2 h-4 w-4" />
              ${service.price}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Clock className="mr-2 h-4 w-4" />
              {service.durationMinutes} minutes
            </Badge>
          </div>
        </div>
      </section>

      <section className="container-custom py-8 md:py-12">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {(post.featureImageUrl || service.imageUrl) ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <img
                  src={post.featureImageUrl || service.imageUrl || ""}
                  alt={post.title || service.name}
                  className="aspect-video w-full object-cover"
                  data-testid="img-service-detail"
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-muted">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            <article className="mt-6 rounded-xl border border-border bg-card p-6">
              <h2 className="text-xl font-semibold">Service Overview</h2>
              {post.content ? (
                <div
                  className="prose prose-slate mt-4 max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              ) : (
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {service.description || "Detailed service description is coming soon."}
                </p>
              )}
            </article>
          </div>

          <aside className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Service Details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Price</dt>
                  <dd className="font-semibold">${service.price}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Estimated duration</dt>
                  <dd className="font-semibold">{service.durationMinutes} min</dd>
                </div>
              </dl>

              <div className="mt-6 space-y-2">
                <Link href={`/services?category=${service.categoryId}`} className="block">
                  <Button className="w-full" data-testid="button-book-service">
                    Book This Service
                  </Button>
                </Link>
                <Link href="/services" className="block">
                  <Button variant="outline" className="w-full">
                    View All Services
                  </Button>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="container-custom pb-12">
          <h2 className="mb-4 text-2xl font-bold">Related Services</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <Link key={item.id} href={getServicePath(item)} className="group overflow-hidden rounded-xl border border-border bg-card">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold group-hover:text-primary">{item.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">${item.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
