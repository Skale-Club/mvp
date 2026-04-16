import type { InsertNotificationLog } from "#shared/schema.js";
import { storage } from "../storage.js";

const MAX_PREVIEW_CHARS = 5000;

export async function logNotification(entry: InsertNotificationLog): Promise<void> {
  try {
    const safeEntry: InsertNotificationLog = {
      ...entry,
      preview:
        typeof entry.preview === "string" && entry.preview.length > MAX_PREVIEW_CHARS
          ? entry.preview.slice(0, MAX_PREVIEW_CHARS)
          : entry.preview,
    };
    await storage.createNotificationLog(safeEntry);
  } catch (error) {
    console.error("Failed to write notification log:", error);
  }
}

export type NotificationLogContext = {
  leadId?: number | null;
  trigger: string;
  recipientName?: string | null;
  metadata?: Record<string, unknown> | null;
};
