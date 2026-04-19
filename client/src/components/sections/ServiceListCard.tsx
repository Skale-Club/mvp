import { ImageIcon } from "lucide-react";
import { Link } from "wouter";
import type { ServicePost } from "@shared/schema";
import { getServicePostPath } from "@/lib/service-path";

export function ServiceListCard({ post }: { post: ServicePost }) {
  return (
    <Link
      href={getServicePostPath(post.id, post.slug)}
      className="group bg-light-gray rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full"
    >
      <div className="relative w-full pt-[75%] bg-slate-100 overflow-hidden">
        {post.featureImageUrl ? (
          <img
            src={post.featureImageUrl}
            alt={post.title}
            className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-slate-300">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors mb-1">
          {post.title}
        </h3>
        <p className="text-slate-500 text-sm mb-4 flex-grow">
          {post.excerpt || "Professional service tailored to your needs."}
        </p>
        <span className="text-sm font-medium text-primary">
          Learn more &rarr;
        </span>
      </div>
    </Link>
  );
}
