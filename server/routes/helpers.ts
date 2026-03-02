import { z } from "zod";

/**
 * Utility functions shared across routes
 */

/**
 * Converts text to URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Cleans and formats phone number
 */
export function cleanPhone(value?: string | null): string {
  return (value || "").toString().replace(/[\s()-]/g, "").trim();
}

/**
 * Parses and deduplicates phone number recipients
 */
export function parseRecipients(numbers?: string[] | null, fallback?: string | null): string[] {
  const recipients: string[] = [];
  const push = (val?: string | null) => {
    const cleaned = cleanPhone(val);
    if (cleaned) recipients.push(cleaned);
  };

  if (Array.isArray(numbers)) {
    for (const num of numbers) push(num);
  }
  push(fallback);

  return Array.from(new Set(recipients));
}

/**
 * URL rule schema for chat exclusions
 */
export const urlRuleSchema = z.object({
  pattern: z.string().min(1),
  match: z.enum(['contains', 'starts_with', 'equals']),
});

export type UrlRule = z.infer<typeof urlRuleSchema>;

/**
 * Checks if a URL should be excluded based on rules
 */
export function isUrlExcluded(url: string, rules: UrlRule[] = []): boolean {
  if (!url) return false;
  return rules.some(rule => {
    const pattern = rule.pattern || '';
    if (rule.match === 'contains') return url.includes(pattern);
    if (rule.match === 'starts_with') return url.startsWith(pattern);
    return url === pattern;
  });
}

/**
 * Chat message validation schema
 */
export const chatMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
  pageUrl: z.string().optional(),
  visitorId: z.string().optional(),
  userAgent: z.string().optional(),
  visitorName: z.string().optional(),
  visitorEmail: z.string().optional(),
  visitorPhone: z.string().optional(),
  language: z.string().optional(),
});

/**
 * Intake objective type
 */
export type IntakeObjective = {
  id: 'zipcode' | 'name' | 'phone' | 'serviceType' | 'serviceDetails' | 'date' | 'address';
  label: string;
  description: string;
  enabled: boolean;
};
