import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { Search, X, ImageIcon } from "lucide-react";
import type { ServicePost } from "@shared/schema";
import { getServicePostPath } from "@/lib/service-path";
import { trackViewServices } from "@/lib/analytics";
import { ErrorState } from "@/components/ui/error-state";

function ServicePostCard({ post }: { post: ServicePost }) {
  return (
    <Link 
      href={getServicePostPath(post.id, post.slug)} 
      className="group bg-light-gray rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full"
    >
      <div className="relative w-full pt-[75%] bg-muted overflow-hidden">
        {post.featureImageUrl ? (
          <img
            src={post.featureImageUrl}
            alt={post.title}
            className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageIcon className="w-12 h-12" />
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-1">
          {post.title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 flex-grow">
          {post.excerpt || "Professional service tailored to your needs."}
        </p>
        <span className="text-sm font-medium text-primary">
          Learn more &rarr;
        </span>
      </div>
    </Link>
  );
}

export default function Services() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: servicePostsRaw, isLoading, isError, refetch } = useQuery<ServicePost[]>({
    queryKey: ['/api/service-posts', 'published'],
    queryFn: () => fetch('/api/service-posts?status=published').then(r => r.json()),
  });

  const servicePosts = Array.isArray(servicePostsRaw)
    ? [...servicePostsRaw].sort((a, b) => {
        const orderA = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title);
      })
    : [];

  const filteredPosts = servicePosts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(query) ||
      (post.excerpt?.toLowerCase().includes(query))
    );
  });

  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!hasTrackedView.current && servicePosts.length > 0) {
      trackViewServices(
        'All Services',
        servicePosts.slice(0, 10).map(p => ({ id: p.id, name: p.title, price: 0 }))
      );
      hasTrackedView.current = true;
    }
  }, [servicePosts]);

  return (
    <div className="min-h-[60vh] pb-32 pt-24" id="services-top">
      <div className="container-custom mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Our Services</h1>

          <div className="relative">
            {isSearchOpen && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="w-full max-w-md relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) {
                        setIsSearchOpen(false);
                      }
                    }}
                    className="w-full pl-12 pr-12 py-2.5 bg-card border border-border rounded-full shadow-lg focus:outline-none transition-all text-foreground placeholder:text-muted-foreground"
                    data-testid="input-search-services"
                  />
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                    aria-label="Close search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <div className={clsx(
              "flex overflow-x-auto w-full pb-4 lg:pb-0 gap-3 no-scrollbar lg:flex-wrap lg:justify-center scroll-smooth transition-opacity duration-200",
              isSearchOpen ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
              <button
                onClick={() => {
                  setIsSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className="w-11 h-11 shrink-0 flex items-center justify-center bg-card border border-border rounded-full shadow-sm hover:bg-muted hover:border-border transition-all"
                aria-label="Search services"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-wrap justify-center gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.67rem)] lg:w-[calc(25%-0.75rem)] h-64 bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Failed to load services"
            message="We couldn't load the services. Please try again."
            onRetry={() => refetch()}
          />
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {filteredPosts?.map((post) => (
              <div key={post.id} className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.67rem)] lg:w-[calc(25%-0.75rem)]">
                <ServicePostCard post={post} />
              </div>
            ))}
            {filteredPosts?.length === 0 && (
              <div className="w-full text-center py-20 text-muted-foreground">
                No services found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
