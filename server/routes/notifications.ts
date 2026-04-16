import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { api } from "#shared/routes.js";
import { safeErrorMessage } from "./errorUtils.js";

export function registerNotificationRoutes(app: Express, requireAdmin: any) {
  app.get("/api/form-leads/:id/notifications", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid lead id" });
      }
      const logs = await storage.getNotificationLogsByLead(id);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, "Failed to load notification logs") });
    }
  });

  app.get("/api/admin/notification-logs", requireAdmin, async (req, res) => {
    try {
      const parsed = api.notificationLogs.list.input
        ? api.notificationLogs.list.input.parse(req.query)
        : {};
      const filters = parsed ?? {};
      const logs = await storage.listNotificationLogs(filters);
      res.json(logs);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid filters", errors: err.errors });
      }
      res.status(500).json({ message: safeErrorMessage(err, "Failed to load notification logs") });
    }
  });
}
