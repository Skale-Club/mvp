import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage.js";
import { getRequestOrigin, getRequestPath, injectSeoIntoHtml, type PageSeoData } from "./seo.js";
import { applyPublicCache } from "./routes/helpers.js";

export function serveStatic(app: Express) {
  // Find the index.html path robustly across different environments (local, Replit, Vercel)
  const possiblePaths = [
    path.resolve(process.cwd(), "dist", "public", "index.html"),
    path.resolve(__dirname, "public", "index.html"),
    path.resolve(__dirname, "..", "dist", "public", "index.html"),
    path.resolve(process.cwd(), "public", "index.html"),
  ];

  let indexPath: string | null = null;
  let distPath: string | null = null;

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      indexPath = p;
      distPath = path.dirname(p);
      break;
    }
  }

  let cachedTemplate: string | null = null;

  const readTemplate = async () => {
    if (!cachedTemplate && indexPath) {
      cachedTemplate = await fs.promises.readFile(indexPath, "utf-8");
    }
    return cachedTemplate || "";
  };

  const renderIndex = async (req: Request, res: Response) => {
    try {
      if (!indexPath) {
        // If we can't find the file in the lambda, let Vercel handle it by returning a simple error
        // or a fallback string. Ideally this shouldn't happen if included properly.
        console.error("index.html not found in lambda environment");
        return res.status(404).send("Not found");
      }

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

      applyPublicCache(res, { edgeMaxAge: 300, staleWhileRevalidate: 86400 });
      res.status(200).type("text/html").send(html);
      return;
    } catch (e) {
      console.error("Error rendering index:", e);
      if (indexPath && fs.existsSync(indexPath)) {
        applyPublicCache(res, { edgeMaxAge: 300, staleWhileRevalidate: 86400 });
        res.sendFile(indexPath);
      } else {
        res.status(500).send("Internal Server Error");
      }
      return;
    }
  };

  // Ensure root requests always receive dynamic SEO tags.
  app.get(["/", "/index.html"], renderIndex);

  if (distPath) {
    app.use(express.static(distPath, { index: false }));
  }

  // fall through to index.html if the file doesn't exist
  app.get("*", renderIndex);
}
