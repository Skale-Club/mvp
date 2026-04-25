import { FileText, Calendar } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import type { BlogPost } from "@shared/schema";

function getExcerpt(post: BlogPost, maxLength = 150) {
  if (post.excerpt) return post.excerpt;
  const text = post.content.replace(/<[^>]*>/g, '');
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

export function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <Card
        className="overflow-hidden hover-elevate cursor-pointer h-full flex flex-col border-0"
        data-testid={`card-blog-${post.id}`}
      >
        {post.featureImageUrl ? (
          <div className="aspect-video overflow-hidden">
            <img
              src={post.featureImageUrl}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.025]"
              data-testid={`img-blog-${post.id}`}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center">
            <FileText className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <CardContent className="p-4 flex-1 flex flex-col bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calendar className="w-4 h-4" />
            <span data-testid={`text-blog-date-${post.id}`}>
              {post.publishedAt ? format(new Date(post.publishedAt), 'MMMM d, yyyy') : 'Draft'}
            </span>
          </div>
          <h2
            className="text-lg font-semibold text-foreground mb-2 line-clamp-2"
            data-testid={`text-blog-title-${post.id}`}
          >
            {post.title}
          </h2>
          <p
            className="text-sm text-muted-foreground line-clamp-3 flex-1"
            data-testid={`text-blog-excerpt-${post.id}`}
          >
            {getExcerpt(post)}
          </p>
          <div className="mt-4">
            <span className="text-primary font-medium text-sm hover:underline">Read More</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
