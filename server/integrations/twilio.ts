import type { TwilioSettings, FormLead } from "#shared/schema.js";
import { logNotification, type NotificationLogContext } from "../notifications/logger.js";

type TwilioResult = { success: boolean; message?: string };

type TwilioLogParams = {
  trigger: string;
  leadId?: number | null;
  recipientName?: string | null;
  metadata?: Record<string, unknown> | null;
};

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  from: string;
  recipients: string[];
  companyName: string;
};

type TwilioValidationResult =
  | { success: true; config: TwilioConfig }
  | { success: false; message: string };

function normalizePhone(value?: string | null): string {
  return (value || "")
    .toString()
    .replace(/[\s()-]/g, "")
    .trim();
}

function collectRecipients(settings: TwilioSettings): string[] {
  const recipients: string[] = [];
  const push = (value?: string | null) => {
    const normalized = normalizePhone(value);
    if (normalized) recipients.push(normalized);
  };

  if (Array.isArray(settings.toPhoneNumbers)) {
    for (const num of settings.toPhoneNumbers) {
      push(num as string);
    }
  }

  push(settings.toPhoneNumber);

  return Array.from(new Set(recipients));
}

function validateConfig(
  twilioSettings: TwilioSettings,
  options?: { requireNotify?: boolean; companyName?: string }
): TwilioValidationResult {
  if (!twilioSettings.enabled) {
    return { success: false, message: "Twilio notifications are disabled" };
  }

  if (options?.requireNotify && !twilioSettings.notifyOnNewChat) {
    return { success: false, message: "Twilio notifications for new chats are disabled" };
  }

  const accountSid = twilioSettings.accountSid?.trim();
  const authToken = twilioSettings.authToken?.trim();
  const from = normalizePhone(twilioSettings.fromPhoneNumber);
  const recipients = collectRecipients(twilioSettings);

  if (!accountSid || !authToken || !from || !recipients.length) {
    return { success: false, message: "Twilio settings are incomplete" };
  }

  return {
    success: true,
    config: {
      accountSid,
      authToken,
      from,
      recipients,
      companyName: (options?.companyName || "My Company").trim(),
    },
  };
}

async function sendSms(
  config: TwilioConfig,
  body: string,
  logParams: TwilioLogParams,
): Promise<TwilioResult> {
  try {
    const twilio = await import("twilio");
    const client = twilio.default(config.accountSid, config.authToken);

    for (const to of config.recipients) {
      try {
        const result = await client.messages.create({ body, from: config.from, to });
        await logNotification({
          channel: "sms",
          trigger: logParams.trigger,
          recipient: to,
          recipientName: logParams.recipientName ?? null,
          preview: body,
          status: "sent",
          providerMessageId: result?.sid ?? null,
          leadId: logParams.leadId ?? null,
          metadata: logParams.metadata ?? null,
        });
      } catch (perRecipientError: any) {
        await logNotification({
          channel: "sms",
          trigger: logParams.trigger,
          recipient: to,
          recipientName: logParams.recipientName ?? null,
          preview: body,
          status: "failed",
          errorMessage: perRecipientError?.message || "Unknown error",
          leadId: logParams.leadId ?? null,
          metadata: logParams.metadata ?? null,
        });
        throw perRecipientError;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send Twilio SMS:", error);
    return { success: false, message: error?.message || "Failed to send SMS" };
  }
}

export async function sendNewChatNotification(
  twilioSettings: TwilioSettings,
  conversationId: string,
  pageUrl?: string,
  companyName?: string,
  logContext?: NotificationLogContext,
): Promise<{ success: boolean; message?: string }> {
  try {
    const validation = validateConfig(twilioSettings, { requireNotify: true, companyName });
    if (!validation.success) return validation;

    const { config } = validation;
    const message = [
      `🔔 New chat on ${config.companyName}`,
      `Conversation: ${conversationId.slice(0, 8)}...`,
      pageUrl ? `Page: ${pageUrl}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    return await sendSms(config, message, {
      trigger: logContext?.trigger ?? "new_chat",
      leadId: logContext?.leadId ?? null,
      recipientName: logContext?.recipientName ?? null,
      metadata: logContext?.metadata ?? { conversationId, pageUrl: pageUrl ?? null },
    });
  } catch (error: any) {
    console.error("Failed to send Twilio notification:", error);
    return { success: false, message: error?.message || "Unknown error" };
  }
}

export async function sendLowPerformanceAlert(
  twilioSettings: TwilioSettings,
  avgSeconds: number,
  samples: number,
  companyName?: string,
  logContext?: NotificationLogContext,
): Promise<{ success: boolean; message?: string }> {
  try {
    const validation = validateConfig(twilioSettings, { companyName });
    if (!validation.success) return validation;

    const minutes = Math.floor(avgSeconds / 60);
    const seconds = avgSeconds % 60;
    const formatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    const { config } = validation;
    const message = [
      `⚠️ ${config.companyName}: response-time alert`,
      `Average: ${formatted}`,
      `Samples: ${samples}`,
    ].join("\n");

    return await sendSms(config, message, {
      trigger: logContext?.trigger ?? "low_performance",
      leadId: null,
      metadata: logContext?.metadata ?? { avgSeconds, samples },
    });
  } catch (error: any) {
    console.error("Failed to send Twilio alert:", error);
    return { success: false, message: error?.message || "Unknown error" };
  }
}

export async function sendHotLeadNotification(
  twilioSettings: TwilioSettings,
  lead: Pick<FormLead, "nome" | "email" | "telefone" | "cidadeEstado" | "classificacao">,
  companyName?: string,
  logContext?: NotificationLogContext,
): Promise<{ success: boolean; message?: string }> {
  try {
    const validation = validateConfig(twilioSettings, { companyName });
    if (!validation.success) return validation;

    const { config } = validation;
    const cleanName = lead.nome?.trim() || "No name";
    const cleanPhone = lead.telefone?.trim() || "No phone";
    const companyLabel = companyName?.trim() || config.companyName || "My Company";
    const message = `🧲 NEW LEAD | ${companyLabel} | ${cleanName} | ${cleanPhone}`;

    return await sendSms(config, message, {
      trigger: logContext?.trigger ?? "lead_completed",
      leadId: logContext?.leadId ?? null,
      recipientName: logContext?.recipientName ?? null,
      metadata: logContext?.metadata ?? {
        classificacao: lead.classificacao,
        cidadeEstado: lead.cidadeEstado,
      },
    });
  } catch (error: any) {
    console.error("Failed to send lead notification:", error);
    return { success: false, message: error?.message || "Unknown error" };
  }
}

export async function sendAbandonedLeadNotification(
  twilioSettings: TwilioSettings,
  lead: Pick<FormLead, "nome" | "telefone" | "email" | "ultimaPerguntaRespondida" | "urlOrigem">,
  companyName?: string,
  logContext?: NotificationLogContext,
): Promise<{ success: boolean; message?: string }> {
  try {
    const validation = validateConfig(twilioSettings, { companyName });
    if (!validation.success) return validation;

    const { config } = validation;
    const cleanName = lead.nome?.trim() || "No name";
    const cleanPhone = lead.telefone?.trim() || "No phone";
    const cleanEmail = lead.email?.trim() || "No email";
    const step = Math.max(1, Number(lead.ultimaPerguntaRespondida || 0));
    const page = lead.urlOrigem?.trim();
    const companyLabel = companyName?.trim() || config.companyName || "My Company";
    const message = [
      `Form abandoned | ${companyLabel}`,
      `Name: ${cleanName}`,
      `Phone: ${cleanPhone}`,
      `Email: ${cleanEmail}`,
      `Last step: ${step}`,
      page ? `Page: ${page}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");

    return await sendSms(config, message, {
      trigger: logContext?.trigger ?? "lead_abandoned",
      leadId: logContext?.leadId ?? null,
      recipientName: logContext?.recipientName ?? null,
      metadata: logContext?.metadata ?? {
        lastQuestion: step,
        urlOrigem: page ?? null,
      },
    });
  } catch (error: any) {
    console.error("Failed to send abandoned lead notification:", error);
    return { success: false, message: error?.message || "Unknown error" };
  }
}
