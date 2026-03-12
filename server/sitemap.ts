import type { Request } from "express";
import type { BlogPost, CompanySettings, ServicePost } from "#shared/schema.js";

type SitemapChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

interface SitemapUrlEntry {
  path: string;
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  priority?: number;
}

interface SitemapReference {
  path: string;
  lastmod?: string;
}

interface SitemapData {
  baseUrl: string;
  staticUrls: SitemapUrlEntry[];
  serviceUrls: SitemapUrlEntry[];
  blogUrls: SitemapUrlEntry[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toIsoDate(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().split("T")[0];
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function normalizeBaseUrl(raw: string | null | undefined, req: Request): string {
  const host = req.get("host") || req.hostname || "localhost:5000";
  const fallback = `${req.protocol}://${host}`;

  if (!raw || !raw.trim()) {
    return fallback.replace(/\/+$/, "");
  }

  try {
    const parsed = new URL(raw.trim());
    const pathname = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/+$/, "") : "";
    return `${parsed.origin}${pathname}`;
  } catch {
    return fallback.replace(/\/+$/, "");
  }
}

function toAbsoluteUrl(path: string, baseUrl: string): string {
  return new URL(path, ensureTrailingSlash(baseUrl)).toString();
}

function newestLastmod(entries: SitemapUrlEntry[]): string | undefined {
  return entries
    .map((entry) => entry.lastmod)
    .filter((item): item is string => Boolean(item))
    .sort()
    .at(-1);
}

function renderUrlset(entries: SitemapUrlEntry[], baseUrl: string): string {
  const urls = entries
    .map((entry) => {
      const lines = [
        "  <url>",
        `    <loc>${escapeXml(toAbsoluteUrl(entry.path, baseUrl))}</loc>`,
      ];

      if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
      if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (typeof entry.priority === "number") lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);

      lines.push("  </url>");
      return lines.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function renderSitemapIndex(entries: SitemapReference[], baseUrl: string): string {
  const maps = entries
    .map((entry) => {
      const lines = [
        "  <sitemap>",
        `    <loc>${escapeXml(toAbsoluteUrl(entry.path, baseUrl))}</loc>`,
      ];
      if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
      lines.push("  </sitemap>");
      return lines.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps}\n</sitemapindex>`;
}

export function buildSitemapData(params: {
  req: Request;
  settings?: CompanySettings | null;
  servicePosts: ServicePost[];
  blogPosts: BlogPost[];
}): SitemapData {
  const { req, settings, servicePosts, blogPosts } = params;
  const baseUrl = normalizeBaseUrl(settings?.seoCanonicalUrl, req);
  const fallbackDate = toIsoDate(new Date())!;

  const staticUrls: SitemapUrlEntry[] = [
    { path: "/", lastmod: fallbackDate, changefreq: "weekly", priority: 1.0 },
    { path: "/services", lastmod: fallbackDate, changefreq: "weekly", priority: 0.9 },
    { path: "/blog", lastmod: fallbackDate, changefreq: "weekly", priority: 0.8 },
    { path: "/gallery", lastmod: fallbackDate, changefreq: "weekly", priority: 0.8 },
    { path: "/contact", lastmod: fallbackDate, changefreq: "monthly", priority: 0.6 },
    { path: "/faq", lastmod: fallbackDate, changefreq: "monthly", priority: 0.6 },
    { path: "/privacy-policy", lastmod: fallbackDate, changefreq: "yearly", priority: 0.3 },
    { path: "/terms-of-service", lastmod: fallbackDate, changefreq: "yearly", priority: 0.3 },
  ];

  const serviceUrls: SitemapUrlEntry[] = servicePosts
    .filter((post) => Boolean(post.slug))
    .map((post): SitemapUrlEntry => ({
      path: `/services/${post.slug}`,
      lastmod: toIsoDate(post.updatedAt || post.publishedAt || post.createdAt) || fallbackDate,
      changefreq: "monthly",
      priority: 0.7,
    }));

  const blogUrls: SitemapUrlEntry[] = blogPosts
    .filter((post) => Boolean(post.slug))
    .map((post): SitemapUrlEntry => ({
      path: `/blog/${post.slug}`,
      lastmod: toIsoDate(post.updatedAt || post.publishedAt || post.createdAt) || fallbackDate,
      changefreq: "monthly",
      priority: 0.7,
    }));

  return {
    baseUrl,
    staticUrls,
    serviceUrls,
    blogUrls,
  };
}

export function buildSitemapIndexXml(data: SitemapData): string {
  return renderSitemapIndex(
    [
      { path: "/sitemaps/static.xml", lastmod: newestLastmod(data.staticUrls) },
      { path: "/sitemaps/services.xml", lastmod: newestLastmod(data.serviceUrls) },
      { path: "/sitemaps/blog.xml", lastmod: newestLastmod(data.blogUrls) },
    ],
    data.baseUrl,
  );
}

export function buildStaticSitemapXml(data: SitemapData): string {
  return renderUrlset(data.staticUrls, data.baseUrl);
}

export function buildServicesSitemapXml(data: SitemapData): string {
  return renderUrlset(data.serviceUrls, data.baseUrl);
}

export function buildBlogSitemapXml(data: SitemapData): string {
  return renderUrlset(data.blogUrls, data.baseUrl);
}

export function buildRobotsTxt(req: Request, settings?: CompanySettings | null): string {
  const baseUrl = normalizeBaseUrl(settings?.seoCanonicalUrl, req);
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "",
    `Sitemap: ${toAbsoluteUrl("/sitemap.xml", baseUrl)}`,
    "",
  ].join("\n");
}
