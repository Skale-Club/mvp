import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { GalleryImage, CompanySettings } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Camera, ChevronLeft, ChevronRight, X } from "lucide-react";

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const galleryImages = Array.isArray(images) ? images : [];
  const selectedImage = selectedIndex !== null ? galleryImages[selectedIndex] : null;

  const closeLightbox = () => setSelectedIndex(null);

  const goToPrevImage = () => {
    if (selectedIndex === null || galleryImages.length <= 1) return;
    setSelectedIndex((selectedIndex - 1 + galleryImages.length) % galleryImages.length);
  };

  const goToNextImage = () => {
    if (selectedIndex === null || galleryImages.length <= 1) return;
    setSelectedIndex((selectedIndex + 1) % galleryImages.length);
  };

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

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevImage();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNextImage();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, galleryImages.length]);

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-primary/5 pb-8 pt-24 md:pb-10 md:pt-24">
        <div className="container-custom">
          <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" data-testid="nav-gallery-breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <span className="text-foreground">Gallery</span>
          </nav>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl" data-testid="text-gallery-title">
                Gallery
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Browse all project photos and highlights from our latest work.
              </p>
            </div>
            <div className="w-full max-w-md md:max-w-sm" aria-hidden="true">
              <div className="h-10 rounded-md opacity-0" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-custom py-8 md:py-12">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
            ))}
          </div>
        ) : galleryImages.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {galleryImages.map((image, index) => (
              <article key={image.id} className="overflow-hidden rounded-xl border border-border bg-card">
                <button
                  type="button"
                  className="group block w-full cursor-zoom-in"
                  onClick={() => setSelectedIndex(index)}
                  data-testid={`button-gallery-open-${image.id}`}
                >
                  <img
                    src={image.imageUrl}
                    alt={image.altText || image.title || "Gallery image"}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    data-testid={`img-gallery-${image.id}`}
                  />
                </button>
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

      <Dialog open={selectedIndex !== null} onOpenChange={(open) => { if (!open) closeLightbox(); }}>
        <DialogContent className="[&>button]:hidden w-[96vw] max-w-6xl border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">Gallery image preview</DialogTitle>
          {selectedImage ? (
            <div
              className="relative flex h-[88vh] w-full items-center justify-center"
              onClick={closeLightbox}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  closeLightbox();
                }}
                className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
                aria-label="Close image preview"
                data-testid="button-gallery-lightbox-close"
              >
                <X className="h-5 w-5" />
              </button>

              {galleryImages.length > 1 ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToPrevImage();
                  }}
                  className="absolute left-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 md:left-5"
                  aria-label="Previous image"
                  data-testid="button-gallery-lightbox-prev"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              ) : null}

              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.altText || selectedImage.title || "Gallery image"}
                className="max-h-[88vh] max-w-full rounded-xl object-contain"
                onClick={(event) => event.stopPropagation()}
                data-testid="img-gallery-lightbox"
              />

              {galleryImages.length > 1 ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToNextImage();
                  }}
                  className="absolute right-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75 md:right-5"
                  aria-label="Next image"
                  data-testid="button-gallery-lightbox-next"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
