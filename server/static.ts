import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage.js";
import { getRequestOrigin, getRequestPath, injectSeoIntoHtml, type PageSeoData } from "./seo.js";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexPath = path.resolve(distPath, "index.html");
  let cachedTemplate: string | null = null;

  const readTemplate = async () => {
    if (!cachedTemplate) {
      cachedTemplate = await fs.promises.readFile(indexPath, "utf-8");
    }
    return cachedTemplate;
  };

  const renderIndex = async (req: Request, res: Response) => {
    try {
      const requestPath = getRequestPath(req);
      let pageData: PageSeoData | undefined;

      // Detect page-specific routes to fetch dynamic SEO data
      if (requestPath.startsWith("/blog/")) {
        const slug = requestPath.split("/")[2];
        if (slug) {
          const post = await storage.getBlogPostBySlug(slug);
          if (post) {
            pageData = {
              type: "article",
              title: post.title,
              description: post.metaDescription || post.excerpt || undefined,
              image: post.featureImageUrl || undefined,
              publishedAt: post.publishedAt?.toISOString(),
              updatedAt: post.updatedAt?.toISOString(),
              author: post.authorName || undefined,
            };
          }
        }
      } else if (requestPath.startsWith("/services/")) {
        const slug = requestPath.split("/")[2];
        if (slug) {
          const service = await storage.getServicePostBySlug(slug);
          if (service) {
            pageData = {
              type: "service",
              title: service.title,
              description: service.metaDescription || service.excerpt || undefined,
              image: service.featureImageUrl || undefined,
              updatedAt: service.updatedAt?.toISOString(),
            };
          }
        }
      }

      const [template, settings] = await Promise.all([
        readTemplate(),
        storage.getCompanySettings(),
      ]);
      const html = injectSeoIntoHtml(template, settings, {
        requestOrigin: getRequestOrigin(req),
        requestPath,
        envFacebookAppId: process.env.FACEBOOK_APP_ID,
        pageData,
      });

      res.status(200).type("text/html").send(html);
      return;
    } catch {
      res.sendFile(indexPath);
      return;
    }
  };

  // Ensure root requests always receive dynamic SEO tags.
  app.get(["/", "/index.html"], renderIndex);

  app.use(express.static(distPath, { index: false }));

  // fall through to index.html if the file doesn't exist
  app.get("*", renderIndex);
}
