#!/usr/bin/env tsx
/**
 * Build-time script to inject SEO data into dist/public/index.html.
 * Runtime responses still inject tags per request to keep og:url domain-aware.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

function getOriginFromCanonical(canonicalUrl: string | null | undefined): string {
  const value = (canonicalUrl || "").trim();
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

async function injectSEOData() {
  try {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      console.warn(
        "DATABASE_URL or POSTGRES_URL not set. Skipping SEO injection and using default tags.",
      );
      return;
    }

    console.log("Fetching SEO data from database...");
    const [{ storage }, { injectSeoIntoHtml }] = await Promise.all([
      import("../server/storage"),
      import("../server/seo"),
    ]);

    const seoData = await storage.getCompanySettings();
    if (!seoData) {
      console.warn("No company settings found in database. Using defaults.");
      return;
    }

    const indexPath = join(process.cwd(), "dist", "public", "index.html");
    if (!existsSync(indexPath)) {
      console.error("index.html not found at:", indexPath);
      console.log("Make sure to run 'npm run build' first");
      return;
    }

    let html = readFileSync(indexPath, "utf-8");
    const fallbackOrigin = (process.env.SITE_URL || "").trim();
    const requestOrigin = getOriginFromCanonical(seoData.seoCanonicalUrl) || fallbackOrigin;

    html = injectSeoIntoHtml(html, seoData, {
      requestOrigin,
      requestPath: "/",
      envFacebookAppId: process.env.FACEBOOK_APP_ID,
    });

    writeFileSync(indexPath, html, "utf-8");
    console.log("SEO data injected successfully!");
    console.log(`Updated file: ${indexPath}`);
  } catch (error) {
    if ((error as any)?.code === "SELF_SIGNED_CERT_IN_CHAIN") {
      console.warn("Skipping SEO injection due to self-signed certificate in chain.");
      process.exit(0);
    }
    console.error("Error injecting SEO data:", error);
    console.warn("Build will continue with default SEO tags");
    process.exit(0);
  }
}

injectSEOData();
