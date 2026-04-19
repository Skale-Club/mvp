import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { GalleryImage } from "@shared/schema";

export function GalleryShowcaseSection({ images }: { images: GalleryImage[] }) {
  if (!images.length) return null;

  return (
    <section className="bg-muted/40 py-20">
      <div className="container-custom mx-auto">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">Gallery Showcase</h2>
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
                loading="lazy"
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
