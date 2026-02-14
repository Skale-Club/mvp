import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { GalleryImage, CompanySettings } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera } from "lucide-react";

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

export default function GalleryPage() {
  const { data: images, isLoading } = useQuery<GalleryImage[]>({
    queryKey: ["/api/gallery"],
  });
  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });

  useEffect(() => {
    const baseUrl = settings?.seoCanonicalUrl || window.location.origin;
    const title = `Gallery | ${settings?.companyName || "Company"}`;
    const description = `Explore our complete photo gallery with recent project highlights and before-and-after results.`;
    const canonical = `${baseUrl}/gallery`;

    document.title = title;
    setMetaTag("description", description);
    setMetaTag("og:title", title, true);
    setMetaTag("og:description", description, true);
    setMetaTag("og:url", canonical, true);
    setMetaTag("twitter:title", title);
    setMetaTag("twitter:description", description);
    setCanonical(canonical);
  }, [settings]);

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-primary/5 py-8 md:py-10">
        <div className="container-custom">
          <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" data-testid="nav-gallery-breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <span className="text-foreground">Gallery</span>
          </nav>

          <h1 className="text-2xl font-bold md:text-3xl" data-testid="text-gallery-title">
            Gallery
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Browse all project photos and highlights from our latest work.
          </p>
        </div>
      </section>

      <section className="container-custom py-8 md:py-12">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
            ))}
          </div>
        ) : images && images.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image) => (
              <article key={image.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <img
                  src={image.imageUrl}
                  alt={image.altText || image.title || "Gallery image"}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                  data-testid={`img-gallery-${image.id}`}
                />
                {(image.title || image.description) ? (
                  <div className="space-y-1 p-3">
                    {image.title ? <h2 className="text-sm font-semibold">{image.title}</h2> : null}
                    {image.description ? <p className="text-xs text-muted-foreground">{image.description}</p> : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Camera className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No gallery images yet</h2>
            <p className="mt-2 text-muted-foreground">
              Add images in the admin area to populate this page.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
