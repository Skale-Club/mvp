import { and, eq, lte, sql } from "drizzle-orm";
import { formLeads, type FormLead } from "#shared/schema.js";
import { db } from "../db.js";
import { storage } from "../storage.js";
import { sendAbandonedLeadNotification } from "../integrations/twilio.js";

const ABANDONED_LEAD_DELAY_MS = 5 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;
const SWEEP_BATCH_SIZE = 10;

let lastSweepAt = 0;
let sweepPromise: Promise<void> | null = null;

async function listPendingAbandonedLeads(cutoff: Date): Promise<FormLead[]> {
  return db
    .select()
    .from(formLeads)
    .where(
      and(
        eq(formLeads.source, "form"),
        eq(formLeads.formCompleto, false),
        eq(formLeads.notificacaoAbandonoEnviada, false),
        lte(formLeads.updatedAt, cutoff),
        sql`coalesce(length(trim(${formLeads.telefone})), 0) > 0`,
        sql`${formLeads.ultimaPerguntaRespondida} > 0`,
      ),
    )
    .orderBy(formLeads.updatedAt)
    .limit(SWEEP_BATCH_SIZE);
}

async function claimLeadNotification(leadId: number): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE form_leads
    SET notificacao_abandono_enviada = true
    WHERE id = ${leadId}
      AND notificacao_abandono_enviada = false
    RETURNING id
  `);
  return Array.isArray(result.rows) && result.rows.length > 0;
}

async function releaseLeadNotification(leadId: number): Promise<void> {
  await db.execute(sql`
    UPDATE form_leads
    SET notificacao_abandono_enviada = false
    WHERE id = ${leadId}
  `);
}

export function queueAbandonedLeadNotificationSweep() {
  const now = Date.now();
  if (sweepPromise) return;
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;

  lastSweepAt = now;
  sweepPromise = (async () => {
    const cutoff = new Date(Date.now() - ABANDONED_LEAD_DELAY_MS);
    const leads = await listPendingAbandonedLeads(cutoff);
    if (!leads.length) return;

    const [twilioSettings, company] = await Promise.all([
      storage.getTwilioSettings(),
      storage.getCompanySettings(),
    ]);

    if (!twilioSettings) return;
    const companyName = company?.companyName?.trim() || "";

    for (const lead of leads) {
      const claimed = await claimLeadNotification(lead.id);
      if (!claimed) continue;

      const result = await sendAbandonedLeadNotification(
        twilioSettings,
        lead,
        companyName,
        { leadId: lead.id, trigger: "lead_abandoned" },
      );
      if (!result.success) {
        await releaseLeadNotification(lead.id);
      }
    }
  })()
    .catch((error) => {
      console.error("Abandoned lead notification sweep failed:", error);
    })
    .finally(() => {
      sweepPromise = null;
    });
}
