import type { Express } from "express";
import { storage } from "../storage.js";
import { z } from "zod";
import { insertBlogPostSchema, insertFaqSchema } from "#shared/schema.js";
import { safeErrorMessage } from "./errorUtils.js";
import { applyPublicCache } from "./helpers.js";

/**
 * Register content-related routes (Blog, FAQs)
 */
export function registerContentRoutes(app: Express, requireAdmin: any) {
  
  // ===============================
  // Blog Posts Routes
  // ===============================

  app.get('/api/blog', async (req, res) => {
    try {
      applyPublicCache(res, { edgeMaxAge: 600 });
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      
      if (status === 'published' && limit) {
        const posts = await storage.getPublishedBlogPosts(limit, offset);
        res.json(posts);
      } else if (status) {
        const posts = await storage.getBlogPosts(status);
        res.json(posts);
      } else {
        const posts = await storage.getBlogPosts();
        res.json(posts);
      }
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.get('/api/blog/count', async (req, res) => {
    try {
      applyPublicCache(res, { edgeMaxAge: 600 });
      const count = await storage.countPublishedBlogPosts();
      res.json({ count });
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.delete('/api/blog/tags/:tag', requireAdmin, async (req, res) => {
    try {
      const rawTag = decodeURIComponent(req.params.tag || '').trim();
      if (!rawTag) {
        return res.status(400).json({ message: 'Tag is required' });
      }
      const posts = await storage.getBlogPosts();
      const target = rawTag.toLowerCase();
      let updatedCount = 0;
      for (const post of posts) {
        const tags = (post.tags || '')
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean);
        if (!tags.length) continue;
        const filtered = tags.filter(tag => tag.toLowerCase() !== target);
        if (filtered.length !== tags.length) {
          await storage.updateBlogPost(post.id, { tags: filtered.join(',') });
          updatedCount += 1;
        }
      }
      res.json({ success: true, tag: rawTag, updatedCount });
    } catch (err) {
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.put('/api/blog/tags/:tag', requireAdmin, async (req, res) => {
    try {
      const rawTag = decodeURIComponent(req.params.tag || '').trim();
      const nextTag = String(req.body?.name || '').trim();
      if (!rawTag || !nextTag) {
        return res.status(400).json({ message: 'Tag and new name are required' });
      }
      const fromLower = rawTag.toLowerCase();
      const toLower = nextTag.toLowerCase();
      const posts = await storage.getBlogPosts();
      let updatedCount = 0;

      for (const post of posts) {
        const tags = (post.tags || '')
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean);
        if (!tags.length) continue;

        const seen = new Set<string>();
        let changed = false;
        const nextTags: string[] = [];

        for (const tag of tags) {
          const lower = tag.toLowerCase();
          if (lower === fromLower) {
            changed = true;
            if (!seen.has(toLower)) {
              seen.add(toLower);
              nextTags.push(nextTag);
            }
            continue;
          }
          if (!seen.has(lower)) {
            seen.add(lower);
            nextTags.push(tag);
          }
        }

        if (changed) {
          await storage.updateBlogPost(post.id, { tags: nextTags.join(',') });
          updatedCount += 1;
        }
      }

      res.json({ success: true, tag: rawTag, renamedTo: nextTag, updatedCount });
    } catch (err) {
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.get('/api/blog/:idOrSlug', async (req, res) => {
    try {
      applyPublicCache(res, { edgeMaxAge: 600 });
      const param = req.params.idOrSlug;
      let post;
      
      if (/^\d+$/.test(param)) {
        post = await storage.getBlogPost(Number(param));
      } else {
        post = await storage.getBlogPostBySlug(param);
      }
      
      if (!post) {
        return res.status(404).json({ message: 'Blog post not found' });
      }
      res.json(post);
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.get('/api/blog/:id/related', async (req, res) => {
    try {
      applyPublicCache(res, { edgeMaxAge: 600 });
      const limit = req.query.limit ? Number(req.query.limit) : 4;
      const posts = await storage.getRelatedBlogPosts(Number(req.params.id), limit);
      res.json(posts);
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.post('/api/blog', requireAdmin, async (req, res) => {
    try {
      const validatedData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost(validatedData);
      res.status(201).json(post);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.put('/api/blog/:id', requireAdmin, async (req, res) => {
    try {
      const validatedData = insertBlogPostSchema.partial().parse(req.body);
      const post = await storage.updateBlogPost(Number(req.params.id), validatedData);
      res.json(post);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.delete('/api/blog/:id', requireAdmin, async (req, res) => {
    try {
      await storage.deleteBlogPost(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  // ===============================
  // FAQs Routes
  // ===============================

  app.get('/api/faqs', async (req, res) => {
    try {
      applyPublicCache(res, { edgeMaxAge: 900 });
      const faqList = await storage.getFaqs();
      res.json(faqList);
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.post('/api/faqs', requireAdmin, async (req, res) => {
    try {
      const validatedData = insertFaqSchema.parse(req.body);
      const faq = await storage.createFaq(validatedData);
      res.status(201).json(faq);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.put('/api/faqs/:id', requireAdmin, async (req, res) => {
    try {
      const validatedData = insertFaqSchema.partial().parse(req.body);
      const faq = await storage.updateFaq(Number(req.params.id), validatedData);
      res.json(faq);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.delete('/api/faqs/:id', requireAdmin, async (req, res) => {
    try {
      await storage.deleteFaq(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });
}
