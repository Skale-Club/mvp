import type { ResendSettings, FormLead } from "#shared/schema.js";

type ResendResult = { success: boolean; message?: string };

type ResendConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  recipients: string[];
  companyName: string;
};

type ResendValidationResult =
  | { success: true; config: ResendConfig }
  | { success: false; message: string };

function collectRecipients(settings: ResendSettings): string[] {
  const recipients: string[] = [];
  if (Array.isArray(settings.toEmails)) {
    for (const email of settings.toEmails) {
      const normalized = (email as string)?.toString().trim();
      if (normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        recipients.push(normalized);
      }
    }
  }
  return Array.from(new Set(recipients));
}

function validateConfig(
  resendSettings: ResendSettings,
  options?: { requireNotify?: boolean; companyName?: string }
): ResendValidationResult {
  if (!resendSettings.enabled) {
    return { success: false, message: "Resend notifications are disabled" };
  }

  if (options?.requireNotify && !resendSettings.notifyOnNewContact) {
    return { success: false, message: "Resend notifications for contacts are disabled" };
  }

  const apiKey = resendSettings.apiKey?.trim();
  const fromEmail = resendSettings.fromEmail?.trim();
  const fromName = resendSettings.fromName?.trim() || "Your Company";
  const recipients = collectRecipients(resendSettings);

  if (!apiKey || !fromEmail || !recipients.length) {
    return { success: false, message: "Resend settings are incomplete" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    return { success: false, message: "Invalid from email address" };
  }

  return {
    success: true,
    config: {
      apiKey,
      fromEmail,
      fromName,
      recipients,
      companyName: (options?.companyName || "My Company").trim(),
    },
  };
}

async function sendEmail(config: ResendConfig, subject: string, html: string): Promise<ResendResult> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(config.apiKey);

    for (const to of config.recipients) {
      await resend.emails.send({
        from: `${config.fromName} <${config.fromEmail}>`,
        to,
        subject,
        html,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send Resend email:", error);
    return { success: false, message: error?.message || "Failed to send email" };
  }
}

export async function sendContactFormNotification(
  resendSettings: ResendSettings,
  formData: { name: string; email: string; subject: string; message: string },
  companyName?: string
): Promise<ResendResult> {
  try {
    const validation = validateConfig(resendSettings, { requireNotify: true, companyName });
    if (!validation.success) return validation;

    const { config } = validation;
    const cleanName = formData.name?.trim() || "Anonymous";
    const cleanEmail = formData.email?.trim() || "No email";
    const cleanSubject = formData.subject?.trim() || "No subject";
    const cleanMessage = formData.message?.trim() || "No message";

    const subject = `📧 New Contact Form | ${config.companyName} | ${cleanName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #1C53A3;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cleanName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cleanEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subject:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cleanSubject}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Message:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cleanMessage.replace(/\n/g, '<br>')}</td>
          </tr>
        </table>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Submitted from ${config.companyName} website
        </p>
      </div>
    `;

    return await sendEmail(config, subject, html);
  } catch (error: any) {
    console.error("Failed to send contact form notification:", error);
    return { success: false, message: error?.message || "Unknown error" };
  }
}

export async function sendNewLeadNotification(
  resendSettings: ResendSettings,
  lead: Pick<FormLead, "nome" | "email" | "telefone" | "cidadeEstado" | "classificacao">,
  companyName?: string
): Promise<ResendResult> {
  try {
    const validation = validateConfig(resendSettings, { companyName });
    if (!validation.success) return validation;

    const { config } = validation;
    const cleanName = lead.nome?.trim() || "No name";
    const cleanPhone = lead.telefone?.trim() || "No phone";
    const cleanEmail = lead.email?.trim() || "No email";
    const cleanCity = lead.cidadeEstado?.trim() || "No city";
    const cleanClassification = lead.classificacao || "N/A";
    const companyLabel = companyName?.trim() || config.companyName || "My Company";

    const subject = `🧲 NEW LEAD | ${companyLabel} | ${cleanName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #1C53A3;">New Lead Notification</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cleanName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cleanPhone}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cleanEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">City/State:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cleanCity}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Classification:</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cleanClassification}</td>
          </tr>
        </table>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Submitted from ${companyLabel} website via lead form
        </p>
      </div>
    `;

    return await sendEmail(config, subject, html);
  } catch (error: any) {
    console.error("Failed to send lead notification:", error);
    return { success: false, message: error?.message || "Unknown error" };
  }
}

export async function sendTestEmail(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  toEmail: string,
  companyName?: string
): Promise<ResendResult> {
  try {
    if (!apiKey?.trim()) {
      return { success: false, message: "API key is required" };
    }
    if (!fromEmail?.trim()) {
      return { success: false, message: "From email is required" };
    }
    if (!toEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return { success: false, message: "Valid to email is required" };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
      return { success: false, message: "Invalid from email address" };
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: `${fromName || "Test"} <${fromEmail}>`,
      to: toEmail,
      subject: `✅ Test Email | ${companyName || "Test"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #22c55e;">Test Email Successful!</h2>
          <p>If you received this email, your Resend integration is working correctly.</p>
          <p style="color: #666; font-size: 12px;">
            Sent to: ${toEmail}
          </p>
        </div>
      `,
    });

    if (result.error) {
      return { success: false, message: result.error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send test email:", error);
    return { success: false, message: error?.message || "Failed to send test email" };
  }
}