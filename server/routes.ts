import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { db } from "./db.js";
import { users } from "#shared/schema.js";
import { eq } from "drizzle-orm";
import { registerStorageRoutes } from "./storage/storageAdapter.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerIntegrationRoutes } from "./routes/integrations.js";
import { registerContentRoutes } from "./routes/content.js";
import { registerUserRoutes } from "./routes/users.js";
import { registerLeadRoutes } from "./routes/leads.js";
import { registerNotificationRoutes } from "./routes/notifications.js";
import { registerReviewsRoutes } from "./routes/reviews.js";
import { registerServiceRoutes } from "./routes/services.js";
import { registerAttributionRoutes } from "./routes/attribution.js";
import { registerMarketingRoutes } from "./routes/marketing.js";

/**
 * Admin authentication middleware - Supabase Auth
 */
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const sess = req.session as any;
  if (!sess?.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const [dbUser] = await db.select().from(users).where(eq(users.id, sess.userId));
    if (!dbUser?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to verify admin status' });
  }
}

/**
 * Register all application routes
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Admin session status is handled by server/auth/supabaseAuth.ts

  // Register upload/storage routes (environment-aware: Replit Object Storage or Supabase Storage)
  await registerStorageRoutes(app, requireAdmin);

  // Register all route modules
  registerServiceRoutes(app, requireAdmin);
  registerLeadRoutes(app, requireAdmin);
  registerNotificationRoutes(app, requireAdmin);
  registerReviewsRoutes(app, requireAdmin);
  registerContentRoutes(app, requireAdmin);
  registerChatRoutes(app, requireAdmin);
  registerIntegrationRoutes(app, requireAdmin);
  registerUserRoutes(app, requireAdmin);
  registerAttributionRoutes(app);
  registerMarketingRoutes(app, requireAdmin);

  return httpServer;
}
