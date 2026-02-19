import type { Request } from "express";
import type { CompanySettings } from "#shared/schema.js";

type SeoSettings = Pick<
  CompanySettings,
  | "seoTitle"
  | "seoDescription"
  | "ogImage"
  | "seoKeywords"
  | "seoAuthor"
  | "seoCanonicalUrl"
  | "seoRobotsTag"
  | "ogType"
  | "ogSiteName"
  | "twitterCard"
  | "twitterSite"
  | "twitterCreator"
  | "companyName"
  | "facebookAppId"
>;

interface SeoRenderContext {
  requestOrigin: string;
  requestPath: string;
  envFacebookAppId?: string;
}

const SEO_BLOCK_START = "<!-- SEO_RUNTIME_START -->";
const SEO_BLOCK_END = "<!-- SEO_RUNTIME_END -->";

function trimValue(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toAbsoluteUrl(value: string, requestOrigin: string): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (!requestOrigin) return value;
  if (value.startsWith("/")) return `${requestOrigin}${value}`;
  return `${requestOrigin}/${value.replace(/^\/+/, "")}`;
}

function normalizeRequestPath(pathname: string): string {
  if (!pathname) return "/";
  const cleanPath = pathname.split("?")[0] || "/";
  if (cleanPath === "/index.html") return "/";
  return cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
}

function joinOriginAndPath(origin: string, pathname: string): string {
  if (!origin) return pathname || "/";
  const safePath = pathname === "/" ? "/" : pathname.replace(/^\/+/, "/");
  return `${origin}${safePath}`;
}

export function getRequestOrigin(req: Request): string {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req.protocol || "https";
  const host = forwardedHost || req.get("host") || req.hostname || "";
  return host ? `${protocol}://${host}` : "";
}

export function getRequestPath(req: Request): string {
  return normalizeRequestPath(req.originalUrl || req.path || "/");
}

function buildSeoBlock(settings: SeoSettings, context: SeoRenderContext): string {
  const requestPath = normalizeRequestPath(context.requestPath);
  const canonicalFromSettings = trimValue(settings.seoCanonicalUrl);
  const canonicalUrl = canonicalFromSettings
    ? toAbsoluteUrl(canonicalFromSettings, context.requestOrigin)
    : joinOriginAndPath(context.requestOrigin, requestPath);

  let canonicalOrigin = context.requestOrigin;
  try {
    if (canonicalUrl) {
      canonicalOrigin = new URL(canonicalUrl).origin;
    }
  } catch {
    canonicalOrigin = context.requestOrigin;
  }

  const title = trimValue(settings.seoTitle) || trimValue(settings.companyName) || "Website";
  const description = trimValue(settings.seoDescription);
  const keywords = trimValue(settings.seoKeywords);
  const author = trimValue(settings.seoAuthor);
  const robotsTag = trimValue(settings.seoRobotsTag) || "index, follow";
  const ogType = trimValue(settings.ogType) || "website";
  const ogSiteName = trimValue(settings.ogSiteName) || trimValue(settings.companyName) || "Website";
  const twitterCard = trimValue(settings.twitterCard) || "summary_large_image";
  const twitterSite = trimValue(settings.twitterSite);
  const twitterCreator = trimValue(settings.twitterCreator);
  const facebookAppId = trimValue(settings.facebookAppId) || trimValue(context.envFacebookAppId);
  const ogImageRaw = trimValue(settings.ogImage);
  const ogImage = ogImageRaw ? toAbsoluteUrl(ogImageRaw, canonicalOrigin || context.requestOrigin) : "";

  const lines: string[] = [];
  lines.push(`<title>${escapeHtml(title)}</title>`);
  lines.push(`<meta name="description" content="${escapeHtml(description)}" />`);
  if (keywords) lines.push(`<meta name="keywords" content="${escapeHtml(keywords)}" />`);
  if (author) lines.push(`<meta name="author" content="${escapeHtml(author)}" />`);
  if (robotsTag) lines.push(`<meta name="robots" content="${escapeHtml(robotsTag)}" />`);
  if (canonicalUrl) lines.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);

  lines.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  lines.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
  lines.push(`<meta property="og:type" content="${escapeHtml(ogType)}" />`);
  lines.push(`<meta property="og:site_name" content="${escapeHtml(ogSiteName)}" />`);
  if (ogImage) lines.push(`<meta property="og:image" content="${escapeHtml(ogImage)}" />`);
  if (canonicalUrl) lines.push(`<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
  if (facebookAppId) lines.push(`<meta property="fb:app_id" content="${escapeHtml(facebookAppId)}" />`);

  lines.push(`<meta name="twitter:card" content="${escapeHtml(twitterCard)}" />`);
  lines.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  lines.push(`<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  if (ogImage) lines.push(`<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`);
  if (twitterSite) lines.push(`<meta name="twitter:site" content="${escapeHtml(twitterSite)}" />`);
  if (twitterCreator) lines.push(`<meta name="twitter:creator" content="${escapeHtml(twitterCreator)}" />`);

  return `${SEO_BLOCK_START}\n    ${lines.join("\n    ")}\n    ${SEO_BLOCK_END}`;
}

function stripManagedSeoTags(html: string): string {
  const patterns = [
    /<title>[\s\S]*?<\/title>/gi,
    /<meta\s+name="description"[\s\S]*?\/?>/gi,
    /<meta\s+name="keywords"[\s\S]*?\/?>/gi,
    /<meta\s+name="author"[\s\S]*?\/?>/gi,
    /<meta\s+name="robots"[\s\S]*?\/?>/gi,
    /<link\s+rel="canonical"[\s\S]*?\/?>/gi,
    /<meta\s+property="og:title"[\s\S]*?\/?>/gi,
    /<meta\s+property="og:description"[\s\S]*?\/?>/gi,
    /<meta\s+property="og:type"[\s\S]*?\/?>/gi,
    /<meta\s+property="og:site_name"[\s\S]*?\/?>/gi,
    /<meta\s+property="og:image"[\s\S]*?\/?>/gi,
    /<meta\s+property="og:url"[\s\S]*?\/?>/gi,
    /<meta\s+property="fb:app_id"[\s\S]*?\/?>/gi,
    /<meta\s+name="twitter:card"[\s\S]*?\/?>/gi,
    /<meta\s+name="twitter:title"[\s\S]*?\/?>/gi,
    /<meta\s+name="twitter:description"[\s\S]*?\/?>/gi,
    /<meta\s+name="twitter:image"[\s\S]*?\/?>/gi,
    /<meta\s+name="twitter:site"[\s\S]*?\/?>/gi,
    /<meta\s+name="twitter:creator"[\s\S]*?\/?>/gi,
  ];

  let sanitized = html;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized;
}

export function injectSeoIntoHtml(
  html: string,
  settings: SeoSettings,
  context: SeoRenderContext,
): string {
  const seoBlock = buildSeoBlock(settings, context);

  if (html.includes(SEO_BLOCK_START) && html.includes(SEO_BLOCK_END)) {
    return html.replace(
      /<!-- SEO_RUNTIME_START -->[\s\S]*?<!-- SEO_RUNTIME_END -->/,
      seoBlock,
    );
  }

  const sanitized = stripManagedSeoTags(html);
  return sanitized.replace("</head>", `    ${seoBlock}\n  </head>`);
}
