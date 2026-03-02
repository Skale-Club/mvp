import type { Express, Request } from "express";
import { storage } from "../storage.js";
import { z } from "zod";
import { 
  insertServicePostSchema, 
  insertCompanySettingsSchema, 
  insertGalleryImageSchema 
} from "#shared/schema.js";
import { slugify } from "./helpers.js";

/**
 * Helper to get unique service post slug
 */
async function getUniqueServicePostSlug(baseValue: string, currentPostId?: number): Promise<string> {
  const base = slugify(baseValue) || "service";
  let candidate = base;
  let counter = 2;
  while (true) {
    const existing = await storage.getServicePostBySlug(candidate);
    if (!existing || (currentPostId && existing.id === currentPostId)) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

/**
 * Register service posts, gallery, company settings, and SEO routes
 */
export function registerServiceRoutes(app: Express, requireAdmin: any) {
  
  // ===============================
  // Service Posts Routes
  // ===============================

  app.get('/api/service-posts', async (req, res) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      if (status === 'published') {
        const posts = await storage.getPublishedServicePosts(
          Number.isFinite(limit) && (limit as number) > 0 ? Math.min(Number(limit), 100) : 12,
          Number.isFinite(offset) && offset > 0 ? offset : 0
        );
        return res.json(posts);
      }

      const posts = await storage.getServicePosts(status);
      res.json(posts);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get('/api/service-posts/:idOrSlug', async (req, res) => {
    try {
      const param = req.params.idOrSlug;
      let post;
      if (/^\d+$/.test(param)) {
        post = await storage.getServicePost(Number(param));
      } else {
        post = await storage.getServicePostBySlug(param);
      }

      if (!post) {
        return res.status(404).json({ message: 'Service post not found' });
      }

      res.json(post);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post('/api/service-posts', requireAdmin, async (req, res) => {
    try {
      const validatedData = insertServicePostSchema.parse(req.body);
      const uniqueSlug = await getUniqueServicePostSlug(validatedData.slug || validatedData.title);
      const post = await storage.createServicePost({
        ...validatedData,
        slug: uniqueSlug,
      });
      res.status(201).json(post);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      if (err?.code === '23505') {
        return res.status(409).json({ message: 'Service post already exists for this service' });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.put('/api/service-posts/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: 'Invalid service post id' });
      }
      const validatedData = insertServicePostSchema.partial().parse(req.body);
      const payload = { ...validatedData } as any;
      if (payload.slug) {
        payload.slug = await getUniqueServicePostSlug(payload.slug, id);
      }
      const updated = await storage.updateServicePost(id, payload);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.delete('/api/service-posts/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: 'Invalid service post id' });
      }
      await storage.deleteServicePost(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // ===============================
  // Gallery Routes
  // ===============================

  app.get('/api/gallery', async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const parsedLimit = Number.isFinite(limit) && (limit as number) > 0 ? Math.min(Number(limit), 100) : undefined;
      const images = await storage.getGalleryImages(parsedLimit);
      res.json(images);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get('/api/gallery/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: 'Invalid gallery image id' });
      }
      const image = await storage.getGalleryImage(id);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }
      res.json(image);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.post('/api/gallery', requireAdmin, async (req, res) => {
    try {
      const validatedData = insertGalleryImageSchema.parse(req.body);
      const image = await storage.createGalleryImage(validatedData);
      res.status(201).json(image);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.post('/api/gallery/reorder', requireAdmin, async (req, res) => {
    try {
      const reorderSchema = z.object({
        imageIds: z.array(z.number().int().positive()).min(1),
      });
      const { imageIds } = reorderSchema.parse(req.body);
      await storage.reorderGalleryImages(imageIds);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.put('/api/gallery/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: 'Invalid gallery image id' });
      }
      const validatedData = insertGalleryImageSchema.partial().parse(req.body);
      const image = await storage.updateGalleryImage(id, validatedData);
      res.json(image);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.delete('/api/gallery/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: 'Invalid gallery image id' });
      }
      await storage.deleteGalleryImage(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  app.delete('/api/gallery', requireAdmin, async (_req, res) => {
    try {
      const deletedCount = await storage.deleteAllGalleryImages();
      res.json({ success: true, deletedCount });
    } catch (err) {
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // ===============================
  // Company Settings Routes
  // ===============================

  app.get('/api/company-settings', async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  app.put('/api/company-settings', requireAdmin, async (req, res) => {
    try {
      const validatedData = insertCompanySettingsSchema.partial().parse(req.body);
      const settings = await storage.updateCompanySettings(validatedData);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // ===============================
  // SEO Routes (robots.txt & sitemap.xml)
  // ===============================

  app.get('/robots.txt', async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      const hostname = req.hostname || '';
      const canonicalUrl =
        settings?.seoCanonicalUrl ||
        `${req.protocol}://${hostname}`;
      
      const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${canonicalUrl}/sitemap.xml
`;
      res.type('text/plain').send(robotsTxt);
    } catch (err) {
      res.type('text/plain').send('User-agent: *\nAllow: /');
    }
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      const servicePostsList = await storage.getPublishedServicePosts(500, 0);
      const blogPostsList = await storage.getPublishedBlogPosts(100, 0);
      const hostname = req.hostname || '';
      const canonicalUrl =
        settings?.seoCanonicalUrl ||
        `${req.protocol}://${hostname}`;
      const lastMod = new Date().toISOString().split('T')[0];

      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${canonicalUrl}/</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${canonicalUrl}/services</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${canonicalUrl}/blog</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${canonicalUrl}/gallery</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;

      for (const servicePost of servicePostsList) {
        const postDate = servicePost.updatedAt ? new Date(servicePost.updatedAt).toISOString().split('T')[0] : lastMod;
        sitemap += `
  <url>
    <loc>${canonicalUrl}/services/${servicePost.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }

      for (const post of blogPostsList) {
        const postDate = post.updatedAt ? new Date(post.updatedAt).toISOString().split('T')[0] : lastMod;
        sitemap += `
  <url>
    <loc>${canonicalUrl}/blog/${post.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }

      sitemap += `
</urlset>`;

      res.type('application/xml').send(sitemap);
    } catch (err) {
      res.status(500).send('Error generating sitemap');
    }
  });
}
