import 'dotenv/config';
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type express from "express";

let app: express.Express | null = null;
let initPromise: Promise<express.Express> | null = null;

async function getApp() {
  if (app) return app;

  if (!initPromise) {
    initPromise = Promise.all([
      import("../server/app.js"),
      import("../server/static.js")
    ])
      .then(([{ createApp }, { serveStatic }]) => 
        createApp().then((result) => {
          app = result.app;
          // Serve frontend with dynamic SEO for non-API routes
          serveStatic(app);
          return app;
        })
      )
      .catch((err) => {
        // Reset so next request retries initialization
        initPromise = null;
        throw err;
      });
  }

  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const expressApp = await getApp();
    return expressApp(req as any, res as any);
  } catch (err: any) {
    console.error("[vercel] App initialization failed:", err);
    if (!res.headersSent) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Server initialization failed";
      if (typeof (res as any).status === "function" && typeof (res as any).json === "function") {
        return (res as any).status(500).json({ message });
      }
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ message }));
    }
  }
}
