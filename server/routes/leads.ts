import type { Express } from "express";
import { storage } from "../storage.js";
import { z } from "zod";
import { formLeadProgressSchema, type LeadStatus, type LeadClassification } from "#shared/schema.js";
import { safeErrorMessage } from "./errorUtils.js";
import { DEFAULT_FORM_CONFIG, calculateMaxScore, getSortedQuestions } from "#shared/form.js";
import type { FormConfig } from "#shared/schema.js";
import { api } from "#shared/routes.js";
import { sendHotLeadNotification } from "../integrations/twilio.js";
import { getOrCreateGHLContact } from "../integrations/ghl.js";
import { applyPublicCache } from "./helpers.js";
import { queueAbandonedLeadNotificationSweep } from "../leads/abandonedNotifications.js";

/**
 * Register form configuration and lead management routes
 */
export function registerLeadRoutes(app: Express, requireAdmin: any) {

  // ===============================
  // Form Configuration Routes
  // ===============================

  app.get('/api/form-config', async (req, res) => {
    try {
      queueAbandonedLeadNotificationSweep();
      applyPublicCache(res, { edgeMaxAge: 300 });
      const settings = await storage.getCompanySettings();
      const existing = settings?.formConfig || DEFAULT_FORM_CONFIG;
      const spec = DEFAULT_FORM_CONFIG;
      const specById = new Map(spec.questions.map(q => [q.id, q]));

      // Start with existing questions exactly as saved by admin
      // DO NOT normalize existing questions - respect admin customizations
      let normalizedQuestions = [...existing.questions];

      // ONLY add missing default questions that don't exist yet
      // This allows upgrading the form when new questions are added to DEFAULT_FORM_CONFIG
      for (const specQ of spec.questions) {
        if (!normalizedQuestions.some(q => q.id === specQ.id)) {
          normalizedQuestions.push({ ...specQ });
        }
      }

      // Merge standalone conditional questions back into their parent (backward compatibility)
      // This handles old data where conditional fields were saved as separate questions
      const idxLocalizacao = normalizedQuestions.findIndex(q => q.id === 'localizacao');
      if (idxLocalizacao >= 0) {
        const hasStandaloneCidadeEstado = normalizedQuestions.some(q => q.id === 'cidadeEstado');
        if (hasStandaloneCidadeEstado) {
          normalizedQuestions = normalizedQuestions.filter(q => q.id !== 'cidadeEstado');
          const specLocalizacao = specById.get('localizacao');
          if (specLocalizacao?.conditionalField) {
            normalizedQuestions[idxLocalizacao] = {
              ...normalizedQuestions[idxLocalizacao],
              conditionalField: {
                showWhen: specLocalizacao.conditionalField.showWhen,
                id: specLocalizacao.conditionalField.id,
                title: specLocalizacao.conditionalField.title,
                placeholder: specLocalizacao.conditionalField.placeholder,
              },
            };
          }
        } else if (!normalizedQuestions[idxLocalizacao].conditionalField) {
          // Add conditional field if missing (backward compatibility)
          const specLocalizacao = specById.get('localizacao');
          if (specLocalizacao?.conditionalField) {
            normalizedQuestions[idxLocalizacao] = {
              ...normalizedQuestions[idxLocalizacao],
              conditionalField: specLocalizacao.conditionalField,
            };
          }
        }
      }

      const idxTipoNegocio = normalizedQuestions.findIndex(q => q.id === 'tipoNegocio');
      if (idxTipoNegocio >= 0) {
        const hasStandaloneOutro = normalizedQuestions.some(q => q.id === 'tipoNegocioOutro');
        if (hasStandaloneOutro) {
          normalizedQuestions = normalizedQuestions.filter(q => q.id !== 'tipoNegocioOutro');
          const specTipo = specById.get('tipoNegocio');
          if (specTipo?.conditionalField) {
            normalizedQuestions[idxTipoNegocio] = {
              ...normalizedQuestions[idxTipoNegocio],
              conditionalField: {
                showWhen: specTipo.conditionalField.showWhen,
                id: specTipo.conditionalField.id,
                title: specTipo.conditionalField.title,
                placeholder: specTipo.conditionalField.placeholder,
              },
            };
          }
        } else if (!normalizedQuestions[idxTipoNegocio].conditionalField) {
          // Add conditional field if missing (backward compatibility)
          const specTipo = specById.get('tipoNegocio');
          if (specTipo?.conditionalField) {
            normalizedQuestions[idxTipoNegocio] = {
              ...normalizedQuestions[idxTipoNegocio],
              conditionalField: specTipo.conditionalField,
            };
          }
        }
      }

      // Sort: known spec questions by spec order, custom questions follow after
      const isKnown = (qId: string) => specById.has(qId);
      normalizedQuestions = normalizedQuestions
        .sort((a, b) => {
          const aKnown = isKnown(a.id);
          const bKnown = isKnown(b.id);
          if (aKnown && bKnown) {
            const aSpec = specById.get(a.id)!.order;
            const bSpec = specById.get(b.id)!.order;
            return aSpec - bSpec;
          }
          if (aKnown && !bKnown) return -1;
          if (!aKnown && bKnown) return 1;
          return (a.order ?? 999) - (b.order ?? 999);
        })
        .map((q, i) => ({ ...q, order: i + 1 }));

      const normalizedConfig: FormConfig = {
        questions: normalizedQuestions,
        maxScore: calculateMaxScore({ ...existing, questions: normalizedQuestions }),
        thresholds: existing.thresholds || spec.thresholds,
      };
      res.json(normalizedConfig);
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  app.put('/api/form-config', requireAdmin, async (req, res) => {
    try {
      const config = req.body as FormConfig;

      // Validate basic structure
      if (!config.questions || !Array.isArray(config.questions)) {
        return res.status(400).json({ message: 'Invalid config: questions array required' });
      }

      // Recalculate maxScore based on options
      const maxScore = calculateMaxScore(config);
      const updatedConfig: FormConfig = {
        ...config,
        maxScore,
      };

      await storage.updateCompanySettings({ formConfig: updatedConfig });
      res.json(updatedConfig);
    } catch (err) {
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  // ===============================
  // Form Leads Routes
  // ===============================

  app.get('/api/form-leads/:sessionId', async (req, res) => {
    const lead = await storage.getFormLeadBySession(req.params.sessionId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    res.json(lead);
  });

  app.post('/api/form-leads/progress', async (req, res) => {
    try {
      queueAbandonedLeadNotificationSweep();
      const parsed = formLeadProgressSchema.parse(req.body);
      const settings = await storage.getCompanySettings();
      const formConfig = settings?.formConfig || DEFAULT_FORM_CONFIG;
      const companyName = settings?.companyName?.trim() || '';
      const totalQuestions = formConfig.questions.length || DEFAULT_FORM_CONFIG.questions.length;
      const questionNumber = Math.min(parsed.questionNumber, totalQuestions);
      const payload = {
        ...parsed,
        questionNumber,
        formCompleto: parsed.formCompleto || questionNumber >= totalQuestions,
      };
      let lead = await storage.upsertFormLeadProgress(payload, { userAgent: req.get('user-agent') || undefined }, formConfig);

      const hasPhone = !!lead.telefone?.trim();
      if (lead.formCompleto && hasPhone && !lead.notificacaoEnviada) {
        (async () => {
          try {
            const twilioSettings = await storage.getTwilioSettings();
            if (twilioSettings) {
              const notifyResult = await sendHotLeadNotification(twilioSettings, lead, companyName);
              if (notifyResult.success) {
                await storage.updateFormLead(lead.id, { notificacaoEnviada: true });
              }
            }
          } catch (notificationError) {
            console.error('Lead notification error:', notificationError);
          }
        })();

        (async () => {
          try {
            const resendSettings = await storage.getResendSettings();
            if (resendSettings?.enabled && resendSettings.notifyOnNewLead) {
              const { sendNewLeadNotification } = await import('../integrations/resend.js');
              await sendNewLeadNotification(resendSettings, lead, companyName);
            }
          } catch (notificationError) {
            console.error('Resend lead notification error:', notificationError);
          }
        })();
      }

      if (lead.formCompleto) {
        (async () => {
          try {
            const ghlSettings = await storage.getIntegrationSettings('gohighlevel');
            if (ghlSettings?.isEnabled && ghlSettings.apiKey && ghlSettings.locationId && lead.telefone) {
              const nameParts = (lead.nome || '').trim().split(' ').filter(Boolean);
              const firstName = nameParts.shift() || lead.nome || 'Lead';
              const lastName = nameParts.join(' ');

              const customFields: Array<{ id: string; field_value: string }> = [];
              const allAnswers: Record<string, string | undefined> = {
                nome: lead.nome || undefined,
                email: lead.email || undefined,
                telefone: lead.telefone || undefined,
                cidadeEstado: lead.cidadeEstado || undefined,
                tipoNegocio: lead.tipoNegocio || undefined,
                tipoNegocioOutro: lead.tipoNegocioOutro || undefined,
                tempoNegocio: lead.tempoNegocio || undefined,
                experienciaMarketing: lead.experienciaMarketing || undefined,
                orcamentoAnuncios: lead.orcamentoAnuncios || undefined,
                principalDesafio: lead.principalDesafio || undefined,
                disponibilidade: lead.disponibilidade || undefined,
                expectativaResultado: lead.expectativaResultado || undefined,
                ...(lead.customAnswers || {}),
              };

              for (const question of formConfig.questions) {
                if (question.ghlFieldId && allAnswers[question.id]) {
                  customFields.push({
                    id: question.ghlFieldId,
                    field_value: allAnswers[question.id]!,
                  });
                }
              }

              const contactResult = await getOrCreateGHLContact(
                ghlSettings.apiKey,
                ghlSettings.locationId,
                {
                  email: lead.email || '',
                  firstName,
                  lastName,
                  phone: lead.telefone || '',
                  address: lead.cidadeEstado || undefined,
                  customFields: customFields.length > 0 ? customFields : undefined,
                }
              );

              if (contactResult.success && contactResult.contactId) {
                await storage.updateFormLead(lead.id, { ghlContactId: contactResult.contactId, ghlSyncStatus: 'synced' });
              } else {
                await storage.updateFormLead(lead.id, { ghlSyncStatus: 'failed' });
              }
            }
          } catch (ghlError) {
            console.error('GHL lead sync error (non-blocking):', ghlError);
            try {
              await storage.updateFormLead(lead.id, { ghlSyncStatus: 'failed' });
            } catch { /* ignore */ }
          }
        })();
      }
      res.json(lead);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors?.[0]?.message || 'Validation error' });
      }
      if (err?.code === '23505') {
        const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : null;
        if (sessionId) {
          const existing = await storage.getFormLeadBySession(sessionId);
          if (existing) {
            return res.json(existing);
          }
        }
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.get('/api/form-leads', requireAdmin, async (req, res) => {
    try {
      queueAbandonedLeadNotificationSweep();
      const parsed = api.formLeads.list.input ? api.formLeads.list.input.parse(req.query) : {};
      const filters = (parsed || {}) as {
        status?: LeadStatus;
        classificacao?: LeadClassification;
        formCompleto?: boolean;
        completionStatus?: 'completo' | 'em_progresso' | 'abandonado';
        search?: string
      };
      const leads = await storage.listFormLeads(filters);
      res.json(leads);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid filters', errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.patch('/api/form-leads/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: 'Invalid lead id' });
      }
      const updates = api.formLeads.update.input.parse(req.body) as {
        status?: LeadStatus;
        observacoes?: string;
        notificacaoEnviada?: boolean
      };
      const updated = await storage.updateFormLead(id, updates);
      if (!updated) {
        return res.status(404).json({ message: 'Lead not found' });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(400).json({ message: safeErrorMessage(err, 'Invalid request') });
    }
  });

  app.delete('/api/form-leads/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid lead id' });
    const deleted = await storage.deleteFormLead(id);
    if (!deleted) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead deleted' });
  });
}
