import type { Express, Request, Response } from "express";
import { storage } from "../storage.js";
import OpenAI from "openai";
import crypto from "crypto";
import { 
  chatMessageSchema, 
  isUrlExcluded, 
  type UrlRule, 
  type IntakeObjective 
} from "./helpers.js";
import { 
  DEFAULT_CHAT_MODEL, 
  DEFAULT_INTAKE_OBJECTIVES, 
  CHAT_MESSAGE_LIMIT_PER_CONVERSATION 
} from "./constants.js";
import { isRateLimited, updateLastLowPerformanceAlert, lastLowPerformanceAlertAt } from "./rateLimit.js";
import { getChatTools, runChatTool } from "./chat/tools.js";
import { sendNewChatNotification, sendLowPerformanceAlert } from "../integrations/twilio.js";
import { z } from "zod";
import { urlRuleSchema } from "./helpers.js";

let runtimeOpenAiKey = process.env.OPENAI_API_KEY || "";

function getOpenAIClient(apiKey?: string) {
  const key = apiKey || runtimeOpenAiKey || process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

/**
 * Register chat-related routes
 */
export function registerChatRoutes(app: Express, requireAdmin: any) {
  
  // Public chat configuration for widget
  app.get('/api/chat/config', async (_req, res) => {
    try {
      const settings = await storage.getChatSettings();
      const company = await storage.getCompanySettings();
      const defaultName = company?.companyName?.trim();
      const defaultAssistantName = defaultName ? `${defaultName} Assistant` : 'Assistant';
      const fallbackName = settings.agentName?.trim() || defaultAssistantName;
      const companyIcon = company?.logoIcon || '/favicon.ico';
      const fallbackAvatar = companyIcon;
      const primaryAvatar = settings.agentAvatarUrl || fallbackAvatar;
      const intakeObjectives = (settings.intakeObjectives as IntakeObjective[] | null) || [];
      const effectiveObjectives = intakeObjectives.length ? intakeObjectives : DEFAULT_INTAKE_OBJECTIVES;

      res.json({
        enabled: !!settings.enabled,
        agentName: fallbackName,
        agentAvatarUrl: primaryAvatar,
        fallbackAvatarUrl: fallbackAvatar,
        welcomeMessage: settings.welcomeMessage || 'Hi! How can I help you today?',
        avgResponseTime: settings.avgResponseTime || '',
        languageSelectorEnabled: settings.languageSelectorEnabled ?? false,
        defaultLanguage: settings.defaultLanguage || 'en',
        excludedUrlRules: (settings.excludedUrlRules as UrlRule[]) || [],
        intakeObjectives: effectiveObjectives,
      });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Admin chat settings
  app.get('/api/chat/settings', requireAdmin, async (_req, res) => {
    try {
      const settings = await storage.getChatSettings();
      const intakeObjectives = (settings.intakeObjectives as IntakeObjective[] | null) || [];
      const effectiveObjectives = intakeObjectives.length ? intakeObjectives : DEFAULT_INTAKE_OBJECTIVES;
      res.json({ ...settings, intakeObjectives: effectiveObjectives });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Calculate average response time
  app.get('/api/chat/response-time', requireAdmin, async (_req, res) => {
    try {
      const conversations = await storage.listConversations();
      let totalMs = 0;
      let samples = 0;

      for (const conversation of conversations) {
        const messages = await storage.getConversationMessages(conversation.id);
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];
          if (msg.role !== 'visitor') continue;
          const nextAssistant = messages.slice(i + 1).find((m) => m.role === 'assistant');
          if (!nextAssistant || !msg.createdAt || !nextAssistant.createdAt) continue;
          const start = new Date(msg.createdAt).getTime();
          const end = new Date(nextAssistant.createdAt).getTime();
          if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
          if (end < start) continue;
          totalMs += end - start;
          samples += 1;
        }
      }

      const avgSeconds = samples ? Math.round(totalMs / samples / 1000) : 0;
      const minutes = Math.floor(avgSeconds / 60);
      const seconds = avgSeconds % 60;
      const formatted = samples
        ? minutes > 0
          ? `${minutes}m ${seconds}s`
          : `${seconds}s`
        : 'No responses yet';

      const chatSettings = await storage.getChatSettings();
      if (chatSettings.lowPerformanceSmsEnabled && samples > 0) {
        const threshold = chatSettings.lowPerformanceThresholdSeconds || 300;
        const cooldownMs = 6 * 60 * 60 * 1000;
        const now = Date.now();
        const canAlert = !lastLowPerformanceAlertAt || now - lastLowPerformanceAlertAt > cooldownMs;
        if (avgSeconds >= threshold && canAlert) {
          const twilioSettings = await storage.getTwilioSettings();
          if (twilioSettings) {
            const company = await storage.getCompanySettings();
            const companyName = company?.companyName?.trim() || '';
            const result = await sendLowPerformanceAlert(twilioSettings, avgSeconds, samples, companyName);
            if (result.success) {
              updateLastLowPerformanceAlert(now);
            }
          }
        }
      }

      res.json({ averageSeconds: avgSeconds, formatted, samples });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Update chat settings
  app.put('/api/chat/settings', requireAdmin, async (req, res) => {
    try {
      const payload = z.object({
        enabled: z.boolean().optional(),
        agentName: z.string().optional(),
        agentAvatarUrl: z.string().optional(),
        welcomeMessage: z.string().optional(),
        systemPrompt: z.string().optional(),
        avgResponseTime: z.string().optional(),
        excludedUrlRules: z.array(urlRuleSchema).optional(),
        intakeObjectives: z.array(z.object({
          id: z.enum(['zipcode', 'name', 'phone', 'serviceType', 'serviceDetails', 'date', 'address']),
          label: z.string(),
          description: z.string(),
          enabled: z.boolean()
        })).optional(),
        useFaqs: z.boolean().optional(),
        calendarProvider: z.string().optional(),
        calendarId: z.string().optional(),
        calendarStaff: z.array(z.object({
          name: z.string(),
          calendarId: z.string(),
        })).optional(),
        languageSelectorEnabled: z.boolean().optional(),
        defaultLanguage: z.string().optional(),
        lowPerformanceSmsEnabled: z.boolean().optional(),
        lowPerformanceThresholdSeconds: z.number().int().positive().optional(),
      }).parse(req.body);
      
      const updated = await storage.updateChatSettings(payload);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: (err as Error).message });
    }
  });

  // Admin conversations list
  app.get('/api/chat/conversations', requireAdmin, async (_req, res) => {
    try {
      const conversations = await storage.listConversations();
      const withPreview = await Promise.all(
        conversations.map(async (conv) => {
          const messages = await storage.getConversationMessages(conv.id);
          const lastMessage = messages[messages.length - 1];
          return {
            ...conv,
            lastMessage: lastMessage?.content || '',
            lastMessageRole: lastMessage?.role || null,
            messageCount: messages.length,
          };
        })
      );
      res.json(withPreview);
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Get single conversation with messages
  app.get('/api/chat/conversations/:id', requireAdmin, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
      const messages = await storage.getConversationMessages(conversation.id);
      res.json({ conversation, messages });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Update conversation status
  app.post('/api/chat/conversations/:id/status', requireAdmin, async (req, res) => {
    try {
      const { status } = z.object({ status: z.enum(['open', 'closed']) }).parse(req.body);
      const existing = await storage.getConversation(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Conversation not found' });
      const updated = await storage.updateConversation(req.params.id, { status });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Delete conversation
  app.delete('/api/chat/conversations/:id', requireAdmin, async (req, res) => {
    try {
      await storage.deleteConversation(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Public conversation history
  app.get('/api/chat/conversations/:id/messages', async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      const messages = await storage.getConversationMessages(req.params.id);
      res.json({ conversation, messages });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });

  // Public chat message endpoint (main chat API)
  app.post('/api/chat/message', async (req, res) => {
    try {
      const ipKey = (req.ip || 'unknown').toString();
      if (isRateLimited(ipKey)) {
        return res.status(429).json({ message: 'Too many requests, please slow down.' });
      }

      const parsed = chatMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid input', errors: parsed.error.errors });
      }
      const input = parsed.data;

      const settings = await storage.getChatSettings();
      const excludedRules = (settings.excludedUrlRules as UrlRule[]) || [];

      if (!settings.enabled) {
        return res.status(503).json({ message: 'Chat is currently disabled.' });
      }

      if (isUrlExcluded(input.pageUrl || '', excludedRules)) {
        return res.status(403).json({ message: 'Chat is not available on this page.' });
      }

      const integration = await storage.getChatIntegration('openai');
      if (!integration?.enabled) {
        return res.status(503).json({ message: 'OpenAI integration is not enabled. Please enable it in Admin → Integrations.' });
      }

      const apiKey = runtimeOpenAiKey || process.env.OPENAI_API_KEY || integration?.apiKey;
      if (!apiKey) {
        return res.status(503).json({ message: 'OpenAI API key is missing. Please configure it in Admin → Integrations.' });
      }

      const model = integration.model || DEFAULT_CHAT_MODEL;
      const conversationId = input.conversationId || crypto.randomUUID();

      let conversation = await storage.getConversation(conversationId);
      const isNewConversation = !conversation;
      if (!conversation) {
        conversation = await storage.createConversation({
          id: conversationId,
          status: 'open',
          firstPageUrl: input.pageUrl,
          visitorName: input.visitorName,
          visitorEmail: input.visitorEmail,
          visitorPhone: input.visitorPhone,
        });

        // Send Twilio notification for new chat
        const company = await storage.getCompanySettings();
        const companyName = company?.companyName?.trim() || '';
        const twilioSettings = await storage.getTwilioSettings();
        if (twilioSettings && isNewConversation) {
          sendNewChatNotification(twilioSettings, conversationId, input.pageUrl, companyName).catch(err => {
            console.error('Failed to send Twilio notification:', err);
          });
        }
      } else {
        await storage.updateConversation(conversationId, { lastMessageAt: new Date() });
      }

      if (conversation?.status === 'closed') {
        await storage.updateConversation(conversationId, { status: 'open' });
      }

      // Check message limit
      const existingMessages = await storage.getConversationMessages(conversationId);
      if (existingMessages.length >= CHAT_MESSAGE_LIMIT_PER_CONVERSATION) {
        return res.status(429).json({
          message: 'This conversation has reached the message limit. Please start a new conversation.',
          limitReached: true
        });
      }

      await storage.addConversationMessage({
        id: crypto.randomUUID(),
        conversationId,
        role: 'visitor',
        content: input.message.trim(),
        metadata: {
          pageUrl: input.pageUrl,
          userAgent: input.userAgent,
          visitorId: input.visitorId,
          language: input.language,
        },
      });

      const company = await storage.getCompanySettings();
      const history = await storage.getConversationMessages(conversationId);
      const historyMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = history.map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.content,
      }));

      const allowFaqs = settings.useFaqs !== false;
      const sourceRules = `SOURCES:
- FAQs are ${allowFaqs ? 'enabled' : 'disabled'}. ${allowFaqs ? 'Use search_faqs for general policies, process, products, guarantees, cancellation, payment methods, and common questions.' : 'Do not call search_faqs.'}`;
      const languageInstruction = input.language
        ? `LANGUAGE:\n- Respond in ${input.language}.`
        : '';

      const defaultSystemPrompt = `You are a friendly, consultative lead qualification assistant for ${company?.companyName?.trim() || ''}, a digital marketing agency that helps service businesses grow.

YOUR GOAL:
Qualify potential clients by collecting information through a natural conversation. Ask questions from the form configuration one at a time, in order.

STARTUP FLOW:
1. Call get_form_config to get the qualification questions
2. Call get_lead_state to check what info has already been collected
3. Start with a warm greeting and ask the first unanswered question

CONVERSATION FLOW:
- Ask one question at a time, conversationally
- After each answer, call save_lead_answer with the question_id and answer
- The tool returns the next question to ask - follow that order
- For select/multiple choice questions, present options naturally
- If the user's answer is unclear, clarify before saving
- When isComplete is true, call complete_lead to sync to CRM

FINALIZATION (after complete_lead):
Based on the classification returned:
- QUENTE (Hot): "Excellent! A specialist will contact you within 24 hours to discuss how we can help your business grow."
- MORNO (Warm): "Thanks for the information! We'll review your profile and get in touch soon."
- FRIO (Cold): "Thanks for your interest! We'll send you some useful content."

SOURCES:
${allowFaqs ? '- FAQs are enabled. Use search_faqs for common questions about our services.' : ''}

TOOLS:
- get_form_config: Get the qualification questions (call at start)
- get_lead_state: Check current progress and next question
- save_lead_answer: Save each answer and get next question
- complete_lead: Finalize lead and sync to CRM
- search_faqs: For common questions${!allowFaqs ? ' (disabled)' : ''}

RULES:
- Keep responses concise (1-2 sentences)
- Be warm and professional, not robotic
- Never skip questions or change the order
- Support Portuguese, English, and Spanish - respond in the user's language
- If user asks about our services, answer then return to qualification
- Don't make up information - use search tools when needed

EXAMPLE CONVERSATION:

You: "Hello! I'm the virtual assistant. We're here to help your business grow. To get started, what is your full name?"
User: "John Smith"
[Call save_lead_answer with question_id="nome", answer="John Smith"]
You: "Nice to meet you, John! What is your email?"
User: "john@email.com"
[Call save_lead_answer with question_id="email", answer="john@email.com"]
You: "Great! What is your phone number?"
[Continue through all questions...]
[When complete, call complete_lead]
You: "Excellent, John! A specialist will contact you within 24 hours to discuss how we can help your business grow."`;
      
      const systemPrompt = settings.systemPrompt || defaultSystemPrompt;

      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: sourceRules },
        ...(languageInstruction ? [{ role: 'system', content: languageInstruction } as const] : []),
        { role: 'system', content: 'IMPORTANT: Use get_form_config and get_lead_state at the start to know which questions to ask. Follow the form configuration order. Save each answer with save_lead_answer before asking the next question.' },
        ...historyMessages,
      ];

      const openai = getOpenAIClient(apiKey);
      if (!openai) {
        return res.status(503).json({ message: 'Chat is currently unavailable.' });
      }

      let assistantResponse = 'Sorry, I could not process that request.';
      let leadCaptured = false;

      try {
        const chatTools = getChatTools();
        const first = await openai.chat.completions.create({
          model,
          messages: chatMessages,
          tools: chatTools,
          tool_choice: 'auto',
          max_tokens: 500,
        });

        let choice = first.choices[0].message;
        const toolCalls = choice.tool_calls || [];

        if (toolCalls.length > 0) {
          const toolResponses = [];
          for (const call of toolCalls) {
            let args: any = {};
            try {
              args = JSON.parse(call.function.arguments || '{}');
            } catch {
              args = {};
            }
            const toolResult = await runChatTool(call.function.name, args, conversationId, {
              allowFaqs,
            });

            // Track lead completion
            if (call.function.name === 'complete_lead' && toolResult.success) {
              leadCaptured = true;
            }

            toolResponses.push({
              role: 'tool' as const,
              tool_call_id: call.id,
              content: JSON.stringify(toolResult),
            });
          }

          const second = await openai.chat.completions.create({
            model,
            messages: [...chatMessages, choice, ...toolResponses],
            max_tokens: 500,
          });

          assistantResponse = second.choices[0].message.content || assistantResponse;
        } else {
          assistantResponse = choice.content || assistantResponse;
        }
      } catch (err: any) {
        console.error('OpenAI chat error:', err?.message);
        assistantResponse = 'Chat is unavailable right now. Please try again soon.';
      }

      await storage.addConversationMessage({
        id: crypto.randomUUID(),
        conversationId,
        role: 'assistant',
        content: assistantResponse,
      });
      await storage.updateConversation(conversationId, { lastMessageAt: new Date() });

      res.json({
        conversationId,
        response: assistantResponse,
        leadCaptured
      });
    } catch (err) {
      res.status(500).json({ message: (err as Error).message });
    }
  });
}

export { runtimeOpenAiKey, getOpenAIClient };
