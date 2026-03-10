import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { storage } from "./storage.js";
import { getRequestOrigin, getRequestPath, injectSeoIntoHtml, type PageSeoData } from "./seo.js";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      
      const requestPath = getRequestPath(req);
      let pageData: PageSeoData | undefined;

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

      const settings = await storage.getCompanySettings();
      template = injectSeoIntoHtml(template, settings, {
        requestOrigin: getRequestOrigin(req),
        requestPath,
        envFacebookAppId: process.env.FACEBOOK_APP_ID,
        pageData,
      });
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
