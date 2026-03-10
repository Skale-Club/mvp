import 'dotenv/config';
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type express from "express";

let app: express.Express | null = null;
let initPromise: Promise<express.Express> | null = null;

async function getApp() {
  if (app) return app;

  if (!initPromise) {
    initPromise = import("../server/app.js")
      .then(async ({ createApp }) => {
        const result = await createApp();
        app = result.app;
        
        try {
          const { serveStatic } = await import("../server/static.js");
          serveStatic(app);
          console.log("[vercel] serveStatic initialized successfully");
        } catch (staticErr) {
          console.error("[vercel] Non-fatal error loading serveStatic:", staticErr);
        }

        return app;
      })
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
    console.error("[vercel] App initialization failed:", err.stack || err);
    if (!res.headersSent) {
      const message =
        err instanceof Error && err.stack
          ? err.stack
          : "Server initialization failed";
      if (typeof (res as any).status === "function" && typeof (res as any).json === "function") {
        return (res as any).status(500).json({ message, error: String(err) });
      }
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ message, error: String(err) }));
    }
  }
}
