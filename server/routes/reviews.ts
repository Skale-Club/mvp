import type { Express } from "express";
import { z } from "zod";
import {
  insertReviewItemSchema,
  insertReviewsSettingsSchema,
} from "#shared/schema.js";
import { storage } from "../storage.js";
import { safeErrorMessage } from "./errorUtils.js";

function buildPublicReviewsPayload(settings: Awaited<ReturnType<typeof storage.getReviewsSettings>>, items: Awaited<ReturnType<typeof storage.getReviewItems>>) {
  const hasWidgetUrl = (settings.widgetEmbedUrl || "").trim().length > 0;
  const useWidget =
    settings.widgetEnabled &&
    hasWidgetUrl &&
    (settings.displayMode === "auto" || settings.displayMode === "widget");
  const useFallback =
    settings.fallbackEnabled &&
    (settings.displayMode === "auto" || settings.displayMode === "fallback");

  return {
    settings: {
      sectionTitle: settings.sectionTitle,
      sectionSubtitle: settings.sectionSubtitle,
      displayMode: settings.displayMode,
      widgetEnabled: settings.widgetEnabled,
      widgetEmbedUrl: settings.widgetEmbedUrl,
      fallbackEnabled: settings.fallbackEnabled,
      useWidget,
      useFallback,
    },
    fallbackReviews: items,
  };
}

export function registerReviewsRoutes(app: Express, requireAdmin: any) {
  app.get("/api/reviews", async (_req, res) => {
    try {
      const [settings, items] = await Promise.all([
        storage.getReviewsSettings(),
        storage.getReviewItems(true),
      ]);
      res.json(buildPublicReviewsPayload(settings, items));
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.get("/api/admin/reviews", requireAdmin, async (_req, res) => {
    try {
      const [settings, items] = await Promise.all([
        storage.getReviewsSettings(),
        storage.getReviewItems(false),
      ]);
      res.json({ settings, items });
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.put("/api/admin/reviews/settings", requireAdmin, async (req, res) => {
    try {
      const payload = insertReviewsSettingsSchema.partial().parse(req.body);
      const settings = await storage.upsertReviewsSettings(payload);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.post("/api/admin/reviews/items", requireAdmin, async (req, res) => {
    try {
      const payload = insertReviewItemSchema.parse(req.body);
      const item = await storage.createReviewItem(payload);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.put("/api/admin/reviews/items/:id", requireAdmin, async (req, res) => {
    try {
      const payload = insertReviewItemSchema.partial().parse(req.body);
      const item = await storage.updateReviewItem(Number(req.params.id), payload);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.post("/api/admin/reviews/items/reorder", requireAdmin, async (req, res) => {
    try {
      const payload = z.object({
        itemIds: z.array(z.number().int()),
      }).parse(req.body);
      await storage.reorderReviewItems(payload.itemIds);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.delete("/api/admin/reviews/items/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteReviewItem(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });
}
