import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage.js";
import { getRequestOrigin, getRequestPath, injectSeoIntoHtml } from "./seo.js";

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
      const [template, settings] = await Promise.all([
        readTemplate(),
        storage.getCompanySettings(),
      ]);
      const html = injectSeoIntoHtml(template, settings, {
        requestOrigin: getRequestOrigin(req),
        requestPath: getRequestPath(req),
        envFacebookAppId: process.env.FACEBOOK_APP_ID,
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
