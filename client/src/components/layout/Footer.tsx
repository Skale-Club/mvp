import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { forwardRef, useMemo } from "react";
import type { CompanySettings, ServicePost } from "@shared/schema";
import {
  SiFacebook,
  SiInstagram,
  SiX,
  SiYoutube,
  SiLinkedin,
  SiTiktok,
} from "react-icons/si";
import { getServicePostPath } from "@/lib/service-path";

const platformIcons: Record<string, any> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  twitter: SiX,
  x: SiX,
  youtube: SiYoutube,
  linkedin: SiLinkedin,
  tiktok: SiTiktok,
};

function extractIncludedServices(content?: string | null): string[] {
  if (!content) return [];

  try {
    const doc = new DOMParser().parseFromString(content, "text/html");
    const headings = Array.from(doc.querySelectorAll("h2, h3, h4"));
    const includedHeading = headings.find((heading) =>
      (heading.textContent || "").toLowerCase().includes("included services")
    );

    let list: HTMLUListElement | null = null;

    if (includedHeading) {
      let next = includedHeading.nextElementSibling;
      while (next) {
        const tag = next.tagName.toLowerCase();
        if (tag === "ul") {
          list = next as HTMLUListElement;
          break;
        }
        if (tag === "h2" || tag === "h3" || tag === "h4") {
          break;
        }
        next = next.nextElementSibling;
      }
    }

    if (!list) {
      list = doc.querySelector("ul");
    }
    if (!list) return [];

    return Array.from(list.querySelectorAll("li"))
      .map((li) => (li.textContent || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function toAnchorId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const Footer = forwardRef<HTMLElement>((_, ref) => {
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ['/api/company-settings'],
  });
  const { data: servicePostsRaw } = useQuery<ServicePost[]>({
    queryKey: ['/api/service-posts', 'published', 'footer'],
    queryFn: () => fetch('/api/service-posts?status=published').then((res) => res.json()),
  });

  const companyName = companySettings?.companyName?.trim() || "";
  const tagline =
    companySettings?.heroSubtitle?.trim() ||
    companySettings?.seoDescription?.trim() ||
    '';
  const servicePosts = useMemo(
    () =>
      Array.isArray(servicePostsRaw)
        ? [...servicePostsRaw].sort((a, b) => {
          const orderA = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
          const orderB = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return a.title.localeCompare(b.title);
        })
        : [],
    [servicePostsRaw]
  );
  const serviceGroups = useMemo(
    () =>
      servicePosts.map((post) => ({
        post,
        postPath: getServicePostPath(post.id, post.slug),
        items: extractIncludedServices(post.content).slice(0, 8),
      })),
    [servicePosts]
  );
  const leftColumnGroups = useMemo(
    () => serviceGroups.filter((_, index) => index % 2 === 0),
    [serviceGroups]
  );
  const rightColumnGroups = useMemo(
    () => serviceGroups.filter((_, index) => index % 2 === 1),
    [serviceGroups]
  );

  const renderServiceGroup = ({
    post,
    postPath,
    items,
  }: {
    post: ServicePost;
    postPath: string;
    items: string[];
  }) => {
    return (
      <div key={post.id} className="text-left px-4 py-3">
        <Link
          href={postPath}
          className="inline-block text-gray-100 font-semibold leading-tight hover:text-white transition-colors"
        >
          {post.title}
        </Link>

        {items.length > 0 ? (
          <ul className="mt-2 space-y-1.5 list-disc pl-5 marker:text-gray-500">
            {items.map((serviceItem) => {
              const subPath = `${postPath}#${toAnchorId(serviceItem)}`;
              return (
                <li key={`${post.id}-${serviceItem}`} className="text-sm text-gray-400 leading-relaxed">
                  <a href={subPath} className="hover:text-gray-200 transition-colors">
                    {serviceItem}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  };

  return (
    <footer ref={ref} className="relative z-10 text-slate-300 py-8 md:py-10" style={{ backgroundColor: "var(--website-footer-bg)" }}>
      <div className="container-custom mx-auto">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left space-y-6">
            <Link href="/" className="flex items-center gap-2">
              {companySettings?.logoDark ? (
                <img
                  src={companySettings.logoDark}
                  alt={companyName}
                  className="h-16 w-auto object-contain p-1"
                />
              ) : companySettings?.logoIcon ? (
                <img
                  src={companySettings.logoIcon}
                  alt={companyName}
                  className="h-16 w-auto object-contain p-1 brightness-0 invert"
                />
              ) : (
                companyName ? <span className="text-white font-semibold">{companyName}</span> : null
              )}
            </Link>
            {tagline ? (
              <p className="text-gray-400 max-w-md text-sm leading-relaxed">
                {tagline}
              </p>
            ) : null}

            {companySettings && (companySettings as any).socialLinks && Array.isArray((companySettings as any).socialLinks) && (companySettings as any).socialLinks.length > 0 && (
              <div className="flex gap-4">
                {((companySettings as any).socialLinks as { platform: string, url: string }[]).map((link, i) => {
                  const Icon = platformIcons[link.platform.toLowerCase()] || SiFacebook;
                  return (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {servicePosts.length > 0 ? (
            <div className="md:col-span-8">
              <div className="sm:hidden space-y-4">
                {serviceGroups.map(renderServiceGroup)}
              </div>

              <div className="hidden sm:grid sm:[grid-template-columns:auto_auto] sm:gap-x-4 sm:gap-y-4 sm:justify-start">
                <div className="space-y-4 max-w-[360px]">
                  {leftColumnGroups.map(renderServiceGroup)}
                </div>
                <div className="space-y-4 max-w-[360px]">
                  {rightColumnGroups.map(renderServiceGroup)}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="container-custom mx-auto mt-8 pt-6 border-t border-white/10">
        <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-4 text-center md:text-left">
          <p className="text-gray-400 text-xs md:text-sm">© {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-xs md:text-sm md:justify-end">
            <Link href="/contact" className="text-gray-400 hover:text-gray-200 transition-colors" onClick={() => import("@/lib/analytics").then(m => m.trackCTAClick('footer', 'Contact'))}>Contact</Link>
            <Link href="/privacy-policy" className="text-gray-400 hover:text-gray-200 transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-gray-400 hover:text-gray-200 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
});
