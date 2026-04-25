import type { Express } from "express";
import { storage } from "../storage.js";
import { z } from "zod";
import { insertChatIntegrationsSchema } from "#shared/schema.js";
import { safeErrorMessage } from "./errorUtils.js";
import {
  ANALYTICS_CHANNELS,
  DEFAULT_EVENT_ACTIVITY_WINDOW_DAYS,
  WEBSITE_EVENT_DEFINITIONS,
  getEventChannelSupport,
  isAnalyticsEventName,
  type AnalyticsChannel,
  type WebsiteEventName,
  type WebsiteEventsHealthResponse,
} from "#shared/analytics-events.js";
import { DEFAULT_CHAT_MODEL, DEFAULT_GHL_CALENDAR_ID } from "./constants.js";
import { cleanPhone, parseRecipients } from "./helpers.js";
import { testGHLConnection, getGHLCustomFields } from "../integrations/ghl.js";
import { getOpenAIClient, runtimeOpenAiKey } from "./chat.js";

/**
 * Register integration-related routes (OpenAI, GoHighLevel, Twilio)
 */
export function registerIntegrationRoutes(app: Express, requireAdmin: any) {
  const eventHitSchema = z.object({
    eventName: z.string().trim().min(1),
    pagePath: z.string().trim().max(600).optional(),
    sessionId: z.string().trim().max(120).optional(),
    visitorId: z.string().uuid().optional(),  // mvp_vid UUID — enables visitor-correlated page_view rows
  });

  const analyticsHealthQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(365).optional(),
  });

  const websiteEventNameSet = new Set<WebsiteEventName>(
    WEBSITE_EVENT_DEFINITIONS.map((definition) => definition.event as WebsiteEventName),
  );

  const toIso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
  const toDayCount = (activatedAt: Date | null | undefined, now: Date, enabled: boolean) => {
    if (!enabled || !activatedAt) return null;
    const diffMs = now.getTime() - activatedAt.getTime();
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  };
  let analyticsConfigCache:
    | {
        expiresAt: number;
        company: Awaited<ReturnType<typeof storage.getCompanySettings>>;
        ghlSettings: Awaited<ReturnType<typeof storage.getIntegrationSettings>>;
      }
    | null = null;

  const getAnalyticsConfig = async () => {
    const now = Date.now();
    if (analyticsConfigCache && analyticsConfigCache.expiresAt > now) {
      return analyticsConfigCache;
    }

    const [company, ghlSettings] = await Promise.all([
      storage.getCompanySettings(),
      storage.getIntegrationSettings('gohighlevel'),
    ]);

    analyticsConfigCache = {
      company,
      ghlSettings,
      expiresAt: now + 5 * 60 * 1000,
    };
    return analyticsConfigCache;
  };
  
  // ===============================
  // OpenAI Integration Routes
  // ===============================

  app.get('/api/integrations/openai', requireAdmin, async (_req, res) => {
    try {
      const integration = await storage.getChatIntegration('openai');
      res.json({
        provider: 'openai',
        enabled: integration?.enabled || false,
        model: integration?.model || DEFAULT_CHAT_MODEL,
        hasKey: !!(runtimeOpenAiKey || process.env.OPENAI_API_KEY || integration?.apiKey),
      });
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.put('/api/integrations/openai', requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getChatIntegration('openai');
      const payload = insertChatIntegrationsSchema
        .partial()
        .extend({
          apiKey: z.string().min(10).optional(),
        })
        .parse({ ...req.body, provider: 'openai' });

      const providedKey = payload.apiKey && payload.apiKey !== '********' ? payload.apiKey : undefined;
      const keyToPersist = providedKey ?? existing?.apiKey ?? runtimeOpenAiKey ?? process.env.OPENAI_API_KEY;
      if (providedKey) {
        // Note: This modifies the imported runtimeOpenAiKey from chat.ts
        Object.assign(await import('./chat.js'), { runtimeOpenAiKey: providedKey });
      }

      const willEnable = payload.enabled ?? false;
      const keyAvailable = !!keyToPersist;
      if (willEnable && !keyAvailable) {
        return res.status(400).json({ message: 'Provide a valid API key and test it before enabling.' });
      }

      const updated = await storage.upsertChatIntegration({
        provider: 'openai',
        enabled: payload.enabled ?? false,
        model: payload.model || DEFAULT_CHAT_MODEL,
        apiKey: keyToPersist,
      });

      res.json({
        ...updated,
        hasKey: !!keyToPersist,
        apiKey: undefined,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.post('/api/integrations/openai/test', requireAdmin, async (req, res) => {
    try {
      const bodySchema = z.object({
        apiKey: z.string().min(10).optional(),
        model: z.string().optional(),
      });
      const { apiKey, model } = bodySchema.parse(req.body);
      const existing = await storage.getChatIntegration('openai');
      const keyToUse =
        (apiKey && apiKey !== '********' ? apiKey : undefined) ||
        runtimeOpenAiKey ||
        process.env.OPENAI_API_KEY ||
        existing?.apiKey;

      if (!keyToUse) {
        return res.status(400).json({ success: false, message: 'API key is required' });
      }

      const client = getOpenAIClient(keyToUse);
      if (!client) {
        return res.status(400).json({ success: false, message: 'Invalid API key' });
      }

      try {
        await client.chat.completions.create({
          model: model || DEFAULT_CHAT_MODEL,
          messages: [{ role: 'user', content: 'Say pong' }],
          max_tokens: 5,
        });
      } catch (err: any) {
        const message = err?.message || 'Failed to test OpenAI connection';
        const status = err?.status || err?.response?.status;
        return res.status(500).json({
          success: false,
          message: status ? `OpenAI error (${status}): ${message}` : message,
        });
      }

      // Cache key in memory for runtime use
      Object.assign(await import('./chat.js'), { runtimeOpenAiKey: keyToUse });
      await storage.upsertChatIntegration({
        provider: 'openai',
        enabled: existing?.enabled ?? false,
        model: model || existing?.model || DEFAULT_CHAT_MODEL,
        apiKey: keyToUse,
      });

      res.json({ success: true, message: 'Connection successful' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to test OpenAI connection' });
    }
  });

  // ===============================
  // GoHighLevel Integration Routes
  // ===============================

  app.get('/api/integrations/ghl', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getIntegrationSettings('gohighlevel');
      if (!settings) {
        return res.json({ 
          provider: 'gohighlevel',
          apiKey: '',
          locationId: '',
          calendarId: DEFAULT_GHL_CALENDAR_ID,
          isEnabled: false
        });
      }
      res.json({
        ...settings,
        apiKey: settings.apiKey ? '********' : ''
      });
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.put('/api/integrations/ghl', requireAdmin, async (req, res) => {
    try {
      const { apiKey, locationId, calendarId, isEnabled } = req.body;
      
      const existingSettings = await storage.getIntegrationSettings('gohighlevel');
      
      const settingsToSave: any = {
        provider: 'gohighlevel',
        locationId,
        calendarId: calendarId || DEFAULT_GHL_CALENDAR_ID,
        isEnabled: isEnabled ?? false
      };
      
      if (apiKey && apiKey !== '********') {
        settingsToSave.apiKey = apiKey;
      } else if (existingSettings?.apiKey) {
        settingsToSave.apiKey = existingSettings.apiKey;
      }
      
      const settings = await storage.upsertIntegrationSettings(settingsToSave);
      res.json({
        ...settings,
        apiKey: settings.apiKey ? '********' : ''
      });
    } catch (err) {
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.post('/api/integrations/ghl/test', requireAdmin, async (req, res) => {
    try {
      const { apiKey, locationId } = req.body;
      
      let keyToTest = apiKey;
      if (apiKey === '********' || !apiKey) {
        const existingSettings = await storage.getIntegrationSettings('gohighlevel');
        keyToTest = existingSettings?.apiKey;
      }
      
      if (!keyToTest || !locationId) {
        return res.status(400).json({ 
          success: false, 
          message: 'API key and Location ID are required' 
        });
      }
      
      const result = await testGHLConnection(keyToTest, locationId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: safeErrorMessage(err, 'Connection test failed') 
      });
    }
  });

  app.get('/api/integrations/ghl/status', async (req, res) => {
    try {
      const settings = await storage.getIntegrationSettings('gohighlevel');
      res.json({
        enabled: settings?.isEnabled || false,
        hasCalendar: !!settings?.calendarId
      });
    } catch (err) {
      res.json({ enabled: false, hasCalendar: false });
    }
  });

  app.get('/api/integrations/ghl/custom-fields', requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getIntegrationSettings('gohighlevel');

      if (!settings?.isEnabled || !settings.apiKey || !settings.locationId) {
        return res.status(400).json({
          success: false,
          message: 'GHL is not configured. Set the API key and Location ID first.'
        });
      }

      const result = await getGHLCustomFields(settings.apiKey, settings.locationId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Error fetching custom fields'
      });
    }
  });

  // ===============================
  // Twilio Integration Routes
  // ===============================

  const twilioSettingsSchema = z.object({
    accountSid: z.string().trim().optional(),
    authToken: z.string().trim().optional(),
    fromPhoneNumber: z.string().trim().optional(),
    toPhoneNumber: z.string().trim().optional(),
    toPhoneNumbers: z.array(z.string().trim()).optional(),
    notifyOnNewChat: z.boolean().optional(),
    enabled: z.boolean().optional(),
  });

  app.get('/api/integrations/twilio', requireAdmin, async (_req, res) => {
    try {
      const settings = await storage.getTwilioSettings();
      if (!settings) {
        return res.json({
          enabled: false,
          accountSid: '',
          authToken: '',
          fromPhoneNumber: '',
          toPhoneNumber: '',
          toPhoneNumbers: [],
          notifyOnNewChat: true
        });
      }
      const recipients = parseRecipients(settings.toPhoneNumbers as string[] | undefined, settings.toPhoneNumber);
      res.json({
        ...settings,
        toPhoneNumbers: recipients,
        toPhoneNumber: recipients[0] || '',
        authToken: settings.authToken ? '********' : ''
      });
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.put('/api/integrations/twilio', requireAdmin, async (req, res) => {
    try {
      const parsed = twilioSettingsSchema.parse(req.body);
      const existingSettings = await storage.getTwilioSettings();

      const accountSid = parsed.accountSid?.trim() || existingSettings?.accountSid;
      const fromPhoneNumber = parsed.fromPhoneNumber?.trim() || existingSettings?.fromPhoneNumber;
      const toPhoneNumbers = parseRecipients(
        parsed.toPhoneNumbers,
        parsed.toPhoneNumber || existingSettings?.toPhoneNumber
      );
      const tokenFromRequest = parsed.authToken && parsed.authToken !== '********'
        ? parsed.authToken.trim()
        : undefined;
      const authTokenToPersist = tokenFromRequest || existingSettings?.authToken;
      const enabled = parsed.enabled ?? existingSettings?.enabled ?? false;

      if (enabled && (!accountSid || !authTokenToPersist || !fromPhoneNumber || !toPhoneNumbers.length)) {
        return res.status(400).json({ message: 'All Twilio fields are required to enable notifications' });
      }

      const settingsToSave: any = {
        accountSid,
        fromPhoneNumber,
        toPhoneNumber: toPhoneNumbers[0] || null,
        toPhoneNumbers,
        notifyOnNewChat: parsed.notifyOnNewChat ?? existingSettings?.notifyOnNewChat ?? true,
        enabled
      };

      if (tokenFromRequest) {
        settingsToSave.authToken = tokenFromRequest;
      } else if (existingSettings?.authToken) {
        settingsToSave.authToken = existingSettings.authToken;
      }

      const settings = await storage.saveTwilioSettings(settingsToSave);

      res.json({
        ...settings,
        authToken: settings.authToken ? '********' : ''
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid Twilio settings payload', errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.post('/api/integrations/twilio/test', requireAdmin, async (req, res) => {
    try {
      const parsed = twilioSettingsSchema.parse(req.body);
      const existingSettings = await storage.getTwilioSettings();

      const accountSid = parsed.accountSid?.trim() || existingSettings?.accountSid;
      const fromPhoneNumber = parsed.fromPhoneNumber?.trim() || existingSettings?.fromPhoneNumber;
      const toPhoneNumbers = parseRecipients(
        parsed.toPhoneNumbers,
        parsed.toPhoneNumber || existingSettings?.toPhoneNumber
      );
      const tokenToTest = parsed.authToken && parsed.authToken !== '********'
        ? parsed.authToken.trim()
        : existingSettings?.authToken;

      if (!accountSid || !tokenToTest || !fromPhoneNumber || !toPhoneNumbers.length) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required to test Twilio connection'
        });
      }

      const company = await storage.getCompanySettings();
      const companyName = company?.companyName?.trim() || '';

      // Send test SMS using Twilio
      const twilio = await import('twilio');
      const client = twilio.default(accountSid, tokenToTest);

      for (const to of toPhoneNumbers) {
        await client.messages.create({
          body: `Test message from ${companyName} - Your Twilio integration is working!`,
          from: fromPhoneNumber,
          to
        });
      }

      res.json({
        success: true,
        message: 'Test SMS sent successfully!'
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Twilio test payload',
          errors: err.errors
        });
      }
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to send test SMS'
      });
    }
  });

  // ===============================
  // Resend Integration Routes
  // ===============================
  const resendSettingsSchema = z.object({
    apiKey: z.string().trim().optional(),
    fromEmail: z.string().trim().optional(),
    fromName: z.string().trim().optional(),
    toEmails: z.array(z.string().trim()).optional(),
    notifyOnNewLead: z.boolean().optional(),
    notifyOnNewContact: z.boolean().optional(),
    enabled: z.boolean().optional(),
  });

  app.get('/api/integrations/resend', requireAdmin, async (_req, res) => {
    try {
      const settings = await storage.getResendSettings();
      if (!settings) {
        return res.json({
          enabled: false,
          apiKey: '',
          fromEmail: '',
          fromName: '',
          toEmails: [],
          notifyOnNewLead: true,
          notifyOnNewContact: true
        });
      }
      const recipients = Array.isArray(settings.toEmails) ? settings.toEmails : [];
      res.json({
        ...settings,
        toEmails: recipients,
        apiKey: settings.apiKey ? '********' : ''
      });
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.put('/api/integrations/resend', requireAdmin, async (req, res) => {
    try {
      const parsed = resendSettingsSchema.parse(req.body);
      const existingSettings = await storage.getResendSettings();

      const apiKeyFromRequest = parsed.apiKey && parsed.apiKey !== '********'
        ? parsed.apiKey.trim()
        : undefined;
      const apiKeyToPersist = apiKeyFromRequest || existingSettings?.apiKey;
      const fromEmail = parsed.fromEmail?.trim() || existingSettings?.fromEmail || '';
      const fromName = parsed.fromName?.trim() || existingSettings?.fromName || '';
      const toEmails = parsed.toEmails?.filter(e => e?.trim()) || existingSettings?.toEmails || [];
      const enabled = parsed.enabled ?? existingSettings?.enabled ?? false;
      const notifyOnNewLead = parsed.notifyOnNewLead ?? existingSettings?.notifyOnNewLead ?? true;
      const notifyOnNewContact = parsed.notifyOnNewContact ?? existingSettings?.notifyOnNewContact ?? true;

      if (enabled && (!apiKeyToPersist || !fromEmail || !toEmails.length)) {
        return res.status(400).json({ message: 'All Resend fields are required to enable notifications' });
      }

      const settingsToSave: any = {
        fromEmail,
        fromName,
        toEmails,
        notifyOnNewLead,
        notifyOnNewContact,
        enabled
      };

      if (apiKeyFromRequest) {
        settingsToSave.apiKey = apiKeyFromRequest;
      } else if (existingSettings?.apiKey) {
        settingsToSave.apiKey = existingSettings.apiKey;
      }

      const settings = await storage.saveResendSettings(settingsToSave);

      res.json({
        ...settings,
        apiKey: settings.apiKey ? '********' : ''
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid Resend settings payload', errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.post('/api/integrations/resend/test', requireAdmin, async (req, res) => {
    try {
      const parsed = resendSettingsSchema.parse(req.body);
      const existingSettings = await storage.getResendSettings();

      const apiKey = parsed.apiKey && parsed.apiKey !== '********'
        ? parsed.apiKey.trim()
        : existingSettings?.apiKey;
      const fromEmail = parsed.fromEmail?.trim() || existingSettings?.fromEmail;
      const fromName = parsed.fromName?.trim() || existingSettings?.fromName || '';
      const toEmails = parsed.toEmails?.length ? parsed.toEmails : existingSettings?.toEmails || [];

      if (!apiKey || !fromEmail || !toEmails.length) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required to test Resend connection'
        });
      }

      const company = await storage.getCompanySettings();
      const companyName = company?.companyName?.trim() || 'Test';

      const { sendTestEmail } = await import('../integrations/resend.js');
      const result = await sendTestEmail(apiKey, fromEmail, fromName, toEmails[0] as string, companyName);

      if (result.success) {
        res.json({
          success: true,
          message: 'Test email sent successfully!'
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Failed to send test email'
        });
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Resend test payload',
          errors: err.errors
        });
      }
      res.status(500).json({
        success: false,
        message: err?.message || 'Failed to send test email'
      });
    }
  });

  // ===============================
  // Contact Form Route
  // ===============================
  const contactFormSchema = z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(255),
    subject: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(5000),
  });

  app.post('/api/contact', async (req, res) => {
    try {
      const parsed = contactFormSchema.parse(req.body);

      const company = await storage.getCompanySettings();
      const companyName = company?.companyName?.trim() || '';

      const resendSettings = await storage.getResendSettings();

      if (resendSettings?.enabled && resendSettings.notifyOnNewContact) {
        (async () => {
          try {
            const { sendContactFormNotification } = await import('../integrations/resend.js');
            await sendContactFormNotification(
              resendSettings,
              parsed,
              companyName,
              { leadId: null, trigger: "contact_form" },
            );
          } catch (notificationError) {
            console.error('Contact form notification error:', notificationError);
          }
        })();
      }

      res.json({ success: true, message: 'Message sent successfully!' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid contact form data', errors: err.errors });
      }
      res.status(500).json({ message: safeErrorMessage(err, 'Failed to send message') });
    }
  });

  // ===============================
  // Analytics Event Health Routes
  // ===============================

  app.post('/api/analytics/hit', async (req, res) => {
    try {
      const payload = eventHitSchema.parse(req.body);
      if (!isAnalyticsEventName(payload.eventName)) {
        return res.status(202).json({ accepted: false });
      }

      const { company, ghlSettings } = await getAnalyticsConfig();
      const support = getEventChannelSupport(payload.eventName);
      const channels = {
        ga4: support.ga4 && !!(company.ga4Enabled && company.ga4MeasurementId?.trim()),
        facebook: support.facebook && !!(company.facebookPixelEnabled && company.facebookPixelId?.trim()),
        ghl: support.ghl && !!ghlSettings?.isEnabled,
        telegram: false,
      } satisfies Record<AnalyticsChannel, boolean>;

      const hasActiveDestination = Object.values(channels).some(Boolean);
      const forceStore = !!payload.visitorId; // visitor-correlated hits always stored for journey view
      if (!hasActiveDestination && !forceStore && process.env.ENABLE_ANALYTICS_EVENT_STORAGE !== 'true') {
        return res.status(202).json({ accepted: true, stored: false });
      }

      await storage.recordAnalyticsEventHit({
        eventName: payload.eventName,
        channels,
        pagePath: payload.pagePath,
        sessionId: payload.sessionId,
        visitorId: payload.visitorId,
      });

      return res.status(204).end();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid analytics hit payload', errors: err.errors });
      }
      return res.status(500).json({ message: (err as Error).message });
    }
  });

  app.get('/api/integrations/events-health', requireAdmin, async (req, res) => {
    try {
      const { days } = analyticsHealthQuerySchema.parse(req.query);
      const lookbackDays = days ?? DEFAULT_EVENT_ACTIVITY_WINDOW_DAYS;
      const now = new Date();
      const lookbackStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

      const [company, ghlSettings, hits] = await Promise.all([
        storage.getCompanySettings(),
        storage.getIntegrationSettings('gohighlevel'),
        storage.getAnalyticsEventHitsSince(lookbackStart),
      ]);

      const integrations: WebsiteEventsHealthResponse['integrations'] = {
        ga4: {
          enabled: !!(company.ga4Enabled && company.ga4MeasurementId?.trim()),
          activatedAt: toIso(company.ga4EnabledAt),
          activeForDays: toDayCount(company.ga4EnabledAt, now, !!(company.ga4Enabled && company.ga4MeasurementId?.trim())),
        },
        facebook: {
          enabled: !!(company.facebookPixelEnabled && company.facebookPixelId?.trim()),
          activatedAt: toIso(company.facebookPixelEnabledAt),
          activeForDays: toDayCount(
            company.facebookPixelEnabledAt,
            now,
            !!(company.facebookPixelEnabled && company.facebookPixelId?.trim()),
          ),
        },
        ghl: {
          enabled: !!ghlSettings?.isEnabled,
          activatedAt: toIso(ghlSettings?.enabledAt),
          activeForDays: toDayCount(ghlSettings?.enabledAt, now, !!ghlSettings?.isEnabled),
        },
        telegram: {
          enabled: false,
          activatedAt: null,
          activeForDays: null,
        },
      };

      const aggregateByEvent = new Map<
        WebsiteEventName,
        {
          hitsInWindow: number;
          lastHitAt: Date | null;
          channelLastHitAt: Record<AnalyticsChannel, Date | null>;
        }
      >();

      for (const definition of WEBSITE_EVENT_DEFINITIONS) {
        aggregateByEvent.set(definition.event as WebsiteEventName, {
          hitsInWindow: 0,
          lastHitAt: null,
          channelLastHitAt: {
            ga4: null,
            facebook: null,
            ghl: null,
            telegram: null,
          },
        });
      }

      for (const hit of hits) {
        if (!websiteEventNameSet.has(hit.eventName as WebsiteEventName)) continue;
        const eventKey = hit.eventName as WebsiteEventName;
        const aggregate = aggregateByEvent.get(eventKey);
        if (!aggregate) continue;
        if (!hit.createdAt) continue;

        const hitDate = new Date(hit.createdAt);
        if (Number.isNaN(hitDate.getTime())) continue;

        aggregate.hitsInWindow += 1;
        if (!aggregate.lastHitAt || hitDate > aggregate.lastHitAt) {
          aggregate.lastHitAt = hitDate;
        }

        const hitChannels = (hit.channels || {}) as Partial<Record<AnalyticsChannel, boolean>>;
        for (const channel of ANALYTICS_CHANNELS) {
          if (!hitChannels[channel]) continue;
          const previous = aggregate.channelLastHitAt[channel];
          if (!previous || hitDate > previous) {
            aggregate.channelLastHitAt[channel] = hitDate;
          }
        }
      }

      const events: WebsiteEventsHealthResponse['events'] = WEBSITE_EVENT_DEFINITIONS.map((definition) => {
        const eventKey = definition.event as WebsiteEventName;
        const aggregate = aggregateByEvent.get(eventKey);
        const channels = {
          ga4: {
            supported: definition.channels.ga4,
            activeInWindow: definition.channels.ga4 && integrations.ga4.enabled && !!aggregate?.channelLastHitAt.ga4,
            lastHitAt: definition.channels.ga4 ? toIso(aggregate?.channelLastHitAt.ga4) : null,
          },
          facebook: {
            supported: definition.channels.facebook,
            activeInWindow:
              definition.channels.facebook && integrations.facebook.enabled && !!aggregate?.channelLastHitAt.facebook,
            lastHitAt: definition.channels.facebook ? toIso(aggregate?.channelLastHitAt.facebook) : null,
          },
          ghl: {
            supported: definition.channels.ghl,
            activeInWindow: definition.channels.ghl && integrations.ghl.enabled && !!aggregate?.channelLastHitAt.ghl,
            lastHitAt: definition.channels.ghl ? toIso(aggregate?.channelLastHitAt.ghl) : null,
          },
          telegram: {
            supported: definition.channels.telegram,
            activeInWindow: false,
            lastHitAt: null,
          },
        };

        const activeInWindow = ANALYTICS_CHANNELS.some((channel) => channels[channel].activeInWindow);

        return {
          event: eventKey,
          trigger: definition.trigger,
          hitsInWindow: aggregate?.hitsInWindow ?? 0,
          activeInWindow,
          lastHitAt: toIso(aggregate?.lastHitAt),
          channels,
        };
      });

      const response: WebsiteEventsHealthResponse = {
        lookbackDays,
        generatedAt: now.toISOString(),
        integrations,
        events,
      };

      return res.json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid events health query', errors: err.errors });
      }
      return res.status(500).json({ message: (err as Error).message });
    }
  });
}
