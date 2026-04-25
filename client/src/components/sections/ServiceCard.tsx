import { ArrowRight, ImageIcon } from "lucide-react";
import { Link } from "wouter";
import type { ServicePost } from "@shared/schema";
import { getServicePostPath } from "@/lib/service-path";

export function ServiceCard({ post }: { post: ServicePost }) {
  return (
    <Link
      href={getServicePostPath(post.id, post.slug)}
      className="group block h-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      data-testid={`link-home-service-post-${post.id}`}
    >
      {post.featureImageUrl ? (
        <img src={post.featureImageUrl} alt={post.title} className="aspect-[4/3] w-full object-cover" loading="lazy" />
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
