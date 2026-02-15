import type { LeadClassification, FormConfig, FormQuestion, FormOption as SchemaFormOption } from "./schema.js";

// Legacy type for backward compatibility
export type FormOption = {
  value: string;
  label: string;
  points: number;
};

export type FormAnswers = {
  nome?: string;
  email?: string;
  telefone?: string;
  cidadeEstado?: string;
  tipoNegocio?: string;
  tipoNegocioOutro?: string;
  tempoNegocio?: string;
  experienciaMarketing?: string;
  orcamentoAnuncios?: string;
  principalDesafio?: string;
  disponibilidade?: string;
  expectativaResultado?: string;
  [key: string]: string | undefined; // Support for custom questions
};

// Default form configuration - used as fallback when no config in database
// Generic service business qualification form (white-label)
export const DEFAULT_FORM_CONFIG: FormConfig = {
  questions: [
    {
      id: "nome",
      order: 1,
      title: "What is your full name?",
      type: "text",
      required: true,
      placeholder: "Enter your full name",
    },
    {
      id: "email",
      order: 2,
      title: "What is your email address?",
      type: "email",
      required: true,
      placeholder: "you@example.com",
    },
    {
      id: "telefone",
      order: 3,
      title: "What is your phone number?",
      type: "tel",
      required: true,
      placeholder: "(555) 123-4567",
    },
    {
      id: "tipoNegocio",
      order: 4,
      title: "What type of service do you provide?",
      type: "select",
      required: true,
      options: [
        { value: "Cleaning", label: "Cleaning", points: 10 },
        { value: "Landscaping", label: "Landscaping", points: 10 },
        { value: "Construction", label: "Construction / Remodeling", points: 10 },
        { value: "Plumbing", label: "Plumbing", points: 10 },
        { value: "Electrical", label: "Electrical", points: 10 },
        { value: "HVAC", label: "HVAC", points: 10 },
        { value: "Painting", label: "Painting", points: 10 },
        { value: "Other", label: "Other (please specify)", points: 5 },
      ],
      conditionalField: {
        showWhen: "Other",
        id: "tipoNegocioOutro",
        title: "Please describe your service",
        placeholder: "e.g. Pest Control, Roofing, etc.",
      },
    },
    {
      id: "tempoNegocio",
      order: 5,
      title: "How long have you been in business?",
      type: "select",
      required: true,
      options: [
        { value: "Less than 6 months", label: "Less than 6 months", points: 3 },
        { value: "6 months to 1 year", label: "6 months to 1 year", points: 7 },
        { value: "1 to 3 years", label: "1 to 3 years", points: 10 },
        { value: "More than 3 years", label: "More than 3 years", points: 8 },
      ],
    },
    {
      id: "experienciaMarketing",
      order: 6,
      title: "How do you currently get most of your clients?",
      type: "select",
      required: true,
      options: [
        { value: "Word of mouth only", label: "Word of mouth / referrals only", points: 8 },
        { value: "Tried ads with poor results", label: "Tried online ads, but poor results", points: 10 },
        { value: "Hired agency that didn't work", label: "Hired someone / agency that didn't work", points: 10 },
        { value: "Getting results but want to scale", label: "Getting some results, want to scale", points: 9 },
        { value: "Haven't started marketing", label: "Haven't started any marketing yet", points: 5 },
      ],
    },
    {
      id: "orcamentoAnuncios",
      order: 7,
      title: "Are you ready to invest in marketing to grow your business?",
      type: "select",
      required: true,
      options: [
        { value: "Yes, ready to invest", label: "Yes, I have a budget ready", points: 10 },
        { value: "Start small and scale", label: "I can start small and scale up", points: 8 },
        { value: "Not at this time", label: "Not at this time", points: 3 },
      ],
    },
    {
      id: "principalDesafio",
      order: 8,
      title: "What is your biggest challenge right now?",
      type: "select",
      required: true,
      options: [
        { value: "Not enough clients", label: "Not enough clients", points: 8 },
        { value: "Spending on marketing with no ROI", label: "Spending on marketing with no return", points: 10 },
        { value: "Inconsistent lead flow", label: "Inconsistent lead flow", points: 9 },
        { value: "Don't know where to start", label: "Don't know where to start with marketing", points: 7 },
        { value: "Can't charge what I'm worth", label: "Can't charge what my service is worth", points: 8 },
      ],
    },
    {
      id: "expectativaResultado",
      order: 9,
      title: "What are your expectations for results?",
      type: "select",
      required: true,
      options: [
        { value: "Understand it takes time", label: "I understand solid results take 2-3 months", points: 10 },
        { value: "Need results ASAP", label: "I need results as soon as possible", points: 5 },
        { value: "Not sure yet", label: "Not sure yet", points: 3 },
      ],
    },
  ],
  maxScore: 68,
  thresholds: {
    hot: 58,
    warm: 40,
    cold: 25,
  },
};

// Legacy exports for backward compatibility
export const FORM_TOTAL_QUESTIONS = DEFAULT_FORM_CONFIG.questions.length;
export const FORM_MAX_SCORE = DEFAULT_FORM_CONFIG.maxScore;

export const formOptions: Record<string, FormOption[]> = DEFAULT_FORM_CONFIG.questions
  .filter((q) => q.type === "select" && q.options)
  .reduce((acc, q) => {
    acc[q.id] = q.options!;
    return acc;
  }, {} as Record<string, FormOption[]>);

// Known field IDs that map to columns in form_leads table
export const KNOWN_FIELD_IDS = [
  "nome",
  "email",
  "telefone",
  "cidadeEstado",
  "tipoNegocio",
  "tipoNegocioOutro",
  "tempoNegocio",
  "situacaoMarketing",
  "orcamentoAnuncios",
  "principalDesafio",
  "expectativaTempo",
];

// Score field mapping for known questions
export const SCORE_FIELD_MAPPING: Record<string, string> = {
  tipoNegocio: "scoreTipoNegocio",
  tempoNegocio: "scoreTempoNegocio",
  experienciaMarketing: "scoreExperiencia",
  orcamentoAnuncios: "scoreOrcamento",
  principalDesafio: "scoreDesafio",
  disponibilidade: "scoreDisponibilidade",
  expectativaResultado: "scoreExpectativa",
};

function resolvePoints(options: SchemaFormOption[] | undefined, value?: string, fallback = 0): number {
  if (!value || !options) return 0;
  const match = options.find((option) => option.value === value || option.label === value);
  return match?.points ?? fallback;
}

// Calculate scores using config (supports dynamic questions)
export function calculateFormScoresWithConfig(answers: FormAnswers, config: FormConfig) {
  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const question of config.questions) {
    if (question.type === "select" && question.options) {
      const answer = answers[question.id];
      let points = resolvePoints(question.options, answer);

      // Handle conditional field with fallback points (e.g., "Outro" option)
      if (question.conditionalField && answer === question.conditionalField.showWhen) {
        const conditionalAnswer = answers[question.conditionalField.id];
        if (conditionalAnswer && points === 0) {
          // Use the points from the trigger option
          const triggerOption = question.options.find(o => o.value === question.conditionalField!.showWhen);
          points = triggerOption?.points ?? 0;
        }
      }

      const scoreKey = SCORE_FIELD_MAPPING[question.id] || `score_${question.id}`;
      breakdown[scoreKey] = points;
      total += points;
    }
  }

  return { total, breakdown };
}

// Legacy function - uses default config for backward compatibility
export function calculateFormScores(answers: Partial<FormAnswers>) {
  const result = calculateFormScoresWithConfig(answers as FormAnswers, DEFAULT_FORM_CONFIG);

  // Map to legacy format
  return {
    total: result.total,
    breakdown: {
      scoreTipoNegocio: result.breakdown.scoreTipoNegocio || 0,
      scoreTempoNegocio: result.breakdown.scoreTempoNegocio || 0,
      scoreExperiencia: result.breakdown.scoreExperiencia || 0,
      scoreOrcamento: result.breakdown.scoreOrcamento || 0,
      scoreDesafio: result.breakdown.scoreDesafio || 0,
      scoreDisponibilidade: result.breakdown.scoreDisponibilidade || 0,
      scoreExpectativa: result.breakdown.scoreExpectativa || 0,
    },
  };
}

export function classifyLead(score: number, thresholds?: FormConfig["thresholds"]): LeadClassification {
  const t = thresholds || DEFAULT_FORM_CONFIG.thresholds;
  if (score >= t.hot) return "QUENTE";
  if (score >= t.warm) return "MORNO";
  if (score >= t.cold) return "FRIO";
  return "DESQUALIFICADO";
}

// Helper to calculate max possible score from config
export function calculateMaxScore(config: FormConfig): number {
  return config.questions
    .filter((q) => q.type === "select" && q.options)
    .reduce((sum, q) => {
      const maxPoints = Math.max(...(q.options || []).map((o) => o.points));
      return sum + maxPoints;
    }, 0);
}

// Helper to get questions sorted by order
export function getSortedQuestions(config: FormConfig): FormQuestion[] {
  return [...config.questions].sort((a, b) => a.order - b.order);
}
