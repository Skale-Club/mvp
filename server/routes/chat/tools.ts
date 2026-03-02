import OpenAI from "openai";
import crypto from "crypto";
import { storage } from "../../storage.js";
import { DEFAULT_FORM_CONFIG, getSortedQuestions, type FormAnswers } from "#shared/form.js";
import type { FormConfig } from "#shared/schema.js";
import { getOrCreateGHLContact } from "../../integrations/ghl.js";
import { sendHotLeadNotification } from "../../integrations/twilio.js";

/**
 * Chat tools for lead qualification flow
 */
export function getChatTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return [
    {
      type: "function",
      function: {
        name: "get_form_config",
        description: "Get the qualification form configuration including all questions, options, and scoring thresholds. Call this at the start to know what questions to ask.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "save_lead_answer",
        description: "Save a lead's answer to a question and get the updated score and next question",
        parameters: {
          type: "object",
          properties: {
            question_id: {
              type: "string",
              description: "The ID of the question being answered (e.g., 'nome', 'email', 'tipoNegocio')"
            },
            answer: {
              type: "string",
              description: "The lead's answer to the question"
            },
          },
          required: ["question_id", "answer"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_lead_state",
        description: "Get the current state of the lead including answers collected so far, current score, and next question to ask",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "complete_lead",
        description: "Mark the lead as complete and sync to CRM. Call this after all questions have been answered.",
        parameters: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_faqs",
        description: "Search frequently asked questions database to answer questions about services, pricing, process, and other common inquiries",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Optional search keywords to filter FAQs. Leave empty to get all FAQs."
            },
          },
          additionalProperties: false,
        },
      },
    },
  ];
}

/**
 * Helper to get next unanswered question
 */
function getNextQuestion(lead: any, formConfig: FormConfig): any {
  const sortedQuestions = getSortedQuestions(formConfig);
  const answers: Record<string, string | undefined> = {
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

  for (const question of sortedQuestions) {
    // Check if this question is answered
    const answer = answers[question.id];
    if (!answer || answer.trim() === '') {
      return question;
    }
    // Check conditional field if applicable
    if (question.conditionalField && answer === question.conditionalField.showWhen) {
      const conditionalAnswer = answers[question.conditionalField.id];
      if (!conditionalAnswer || conditionalAnswer.trim() === '') {
        return {
          ...question,
          isConditional: true,
          conditionalQuestion: question.conditionalField,
        };
      }
    }
  }
  return null; // All questions answered
}

/**
 * Execute a chat tool function
 */
export async function runChatTool(
  toolName: string,
  args: any,
  conversationId?: string,
  options?: { allowFaqs?: boolean }
) {
  switch (toolName) {
    case 'get_form_config': {
      const settings = await storage.getCompanySettings();
      const formConfig = settings?.formConfig || DEFAULT_FORM_CONFIG;
      const sortedQuestions = getSortedQuestions(formConfig);

      return {
        questions: sortedQuestions.map(q => ({
          id: q.id,
          order: q.order,
          title: q.title,
          type: q.type,
          required: q.required,
          placeholder: q.placeholder,
          options: q.options?.map(o => ({ value: o.value, label: o.label })),
          conditionalField: q.conditionalField ? {
            showWhen: q.conditionalField.showWhen,
            id: q.conditionalField.id,
            title: q.conditionalField.title,
            placeholder: q.conditionalField.placeholder,
          } : undefined,
        })),
        thresholds: formConfig.thresholds,
        maxScore: formConfig.maxScore,
        totalQuestions: sortedQuestions.length,
      };
    }

    case 'save_lead_answer': {
      if (!conversationId) return { error: 'Conversation ID missing' };

      const questionId = args?.question_id as string;
      const answer = args?.answer as string;

      if (!questionId || !answer) {
        return { error: 'question_id and answer are required' };
      }

      const settings = await storage.getCompanySettings();
      const formConfig = settings?.formConfig || DEFAULT_FORM_CONFIG;

      // Get or create lead for this conversation
      let lead = await storage.getFormLeadByConversationId(conversationId);
      const sortedQuestions = getSortedQuestions(formConfig);

      // Build current answers
      const currentAnswers: FormAnswers = lead ? {
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
      } : {};

      // Add the new answer
      currentAnswers[questionId] = answer;

      // Find the question index
      const questionIndex = sortedQuestions.findIndex(q => q.id === questionId);
      const questionNumber = questionIndex >= 0 ? questionIndex + 1 : (lead?.ultimaPerguntaRespondida || 0) + 1;

      // Check if form is complete
      const answeredCount = Object.entries(currentAnswers).filter(([k, v]) => v && typeof v === 'string' && v.trim() !== '').length;
      const formCompleto = answeredCount >= sortedQuestions.length;

      // Determine nome for upsert (required field)
      const nome = currentAnswers.nome || lead?.nome || answer; // Use first answer as nome if nome not yet set

      // Upsert the lead
      const sessionId = lead?.sessionId || crypto.randomUUID();
      lead = await storage.upsertFormLeadProgress({
        sessionId,
        nome: nome || '',
        email: currentAnswers.email,
        telefone: currentAnswers.telefone,
        cidadeEstado: currentAnswers.cidadeEstado,
        tipoNegocio: currentAnswers.tipoNegocio,
        tipoNegocioOutro: currentAnswers.tipoNegocioOutro,
        tempoNegocio: currentAnswers.tempoNegocio,
        experienciaMarketing: currentAnswers.experienciaMarketing,
        orcamentoAnuncios: currentAnswers.orcamentoAnuncios,
        principalDesafio: currentAnswers.principalDesafio,
        disponibilidade: currentAnswers.disponibilidade,
        expectativaResultado: currentAnswers.expectativaResultado,
        questionNumber,
        formCompleto,
        customAnswers: lead?.customAnswers || undefined,
      }, { conversationId, source: 'chat' }, formConfig);

      // Get next question
      const nextQuestion = getNextQuestion(lead, formConfig);

      // Send SMS notification if phone is provided
      if (lead.telefone && !lead.notificacaoEnviada) {
        try {
          const twilioSettings = await storage.getTwilioSettings();
          const companyName = settings?.companyName || 'My Company';
          if (twilioSettings) {
            const notifyResult = await sendHotLeadNotification(twilioSettings, lead, companyName);
            if (notifyResult.success) {
              await storage.updateFormLead(lead.id, { notificacaoEnviada: true });
            }
          }
        } catch (err) {
          console.error('Lead notification error:', err);
        }
      }

      return {
        success: true,
        currentScore: lead.scoreTotal,
        classification: lead.classificacao,
        isComplete: !nextQuestion,
        nextQuestion: nextQuestion ? {
          id: nextQuestion.isConditional ? nextQuestion.conditionalQuestion.id : nextQuestion.id,
          title: nextQuestion.isConditional ? nextQuestion.conditionalQuestion.title : nextQuestion.title,
          type: nextQuestion.type,
          placeholder: nextQuestion.isConditional ? nextQuestion.conditionalQuestion.placeholder : nextQuestion.placeholder,
          options: nextQuestion.options?.map((o: any) => ({ value: o.value, label: o.label })),
        } : null,
        answeredQuestions: answeredCount,
        totalQuestions: sortedQuestions.length,
      };
    }

    case 'get_lead_state': {
      if (!conversationId) return { error: 'Conversation ID missing' };

      const settings = await storage.getCompanySettings();
      const formConfig = settings?.formConfig || DEFAULT_FORM_CONFIG;
      const lead = await storage.getFormLeadByConversationId(conversationId);

      if (!lead) {
        const sortedQuestions = getSortedQuestions(formConfig);
        return {
          answers: {},
          currentScore: 0,
          classification: null,
          isComplete: false,
          nextQuestion: sortedQuestions[0] ? {
            id: sortedQuestions[0].id,
            title: sortedQuestions[0].title,
            type: sortedQuestions[0].type,
            placeholder: sortedQuestions[0].placeholder,
            options: sortedQuestions[0].options?.map(o => ({ value: o.value, label: o.label })),
          } : null,
          answeredQuestions: 0,
          totalQuestions: sortedQuestions.length,
        };
      }

      const answers: Record<string, string> = {};
      if (lead.nome) answers.nome = lead.nome;
      if (lead.email) answers.email = lead.email;
      if (lead.telefone) answers.telefone = lead.telefone;
      if (lead.cidadeEstado) answers.cidadeEstado = lead.cidadeEstado;
      if (lead.tipoNegocio) answers.tipoNegocio = lead.tipoNegocio;
      if (lead.tipoNegocioOutro) answers.tipoNegocioOutro = lead.tipoNegocioOutro;
      if (lead.tempoNegocio) answers.tempoNegocio = lead.tempoNegocio;
      if (lead.experienciaMarketing) answers.experienciaMarketing = lead.experienciaMarketing;
      if (lead.orcamentoAnuncios) answers.orcamentoAnuncios = lead.orcamentoAnuncios;
      if (lead.principalDesafio) answers.principalDesafio = lead.principalDesafio;
      if (lead.customAnswers) Object.assign(answers, lead.customAnswers);

      const nextQuestion = getNextQuestion(lead, formConfig);
      const sortedQuestions = getSortedQuestions(formConfig);

      return {
        answers,
        currentScore: lead.scoreTotal,
        classification: lead.classificacao,
        isComplete: !nextQuestion,
        nextQuestion: nextQuestion ? {
          id: nextQuestion.isConditional ? nextQuestion.conditionalQuestion.id : nextQuestion.id,
          title: nextQuestion.isConditional ? nextQuestion.conditionalQuestion.title : nextQuestion.title,
          type: nextQuestion.type,
          placeholder: nextQuestion.isConditional ? nextQuestion.conditionalQuestion.placeholder : nextQuestion.placeholder,
          options: nextQuestion.options?.map((o: any) => ({ value: o.value, label: o.label })),
        } : null,
        answeredQuestions: Object.keys(answers).length,
        totalQuestions: sortedQuestions.length,
      };
    }

    case 'complete_lead': {
      if (!conversationId) return { error: 'Conversation ID missing' };

      const lead = await storage.getFormLeadByConversationId(conversationId);
      if (!lead) {
        return { error: 'No lead found for this conversation' };
      }

      // Mark as complete
      await storage.updateFormLead(lead.id, { formCompleto: true } as any);

      // Sync to GoHighLevel
      let ghlContactId: string | undefined;
      try {
        const ghlSettings = await storage.getIntegrationSettings('gohighlevel');
        const settings = await storage.getCompanySettings();
        const formConfig = settings?.formConfig || DEFAULT_FORM_CONFIG;

        if (ghlSettings?.isEnabled && ghlSettings.apiKey && ghlSettings.locationId && lead.telefone) {
          const nameParts = (lead.nome || '').trim().split(' ').filter(Boolean);
          const firstName = nameParts.shift() || lead.nome || 'Lead';
          const lastName = nameParts.join(' ');

          // Build custom fields from form config mappings
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
            ghlContactId = contactResult.contactId;
          }
        }
      } catch (err) {
        console.error('GHL sync error:', err);
        await storage.updateFormLead(lead.id, { ghlSyncStatus: 'failed' });
      }

      return {
        success: true,
        classification: lead.classificacao,
        score: lead.scoreTotal,
        ghlContactId,
      };
    }

    case 'search_faqs': {
      if (options?.allowFaqs === false) {
        return { error: 'FAQ search is disabled for this chat.' };
      }
      const query = (args?.query as string | undefined)?.toLowerCase?.()?.trim();
      const allFaqs = await storage.getFaqs();

      if (!query) {
        return {
          faqs: allFaqs.map(faq => ({
            question: faq.question,
            answer: faq.answer,
          })),
        };
      }

      const filtered = allFaqs.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );

      return {
        faqs: filtered.map(faq => ({
          question: faq.question,
          answer: faq.answer,
        })),
        searchQuery: query,
      };
    }

    default:
      return { error: 'Unknown tool' };
  }
}
