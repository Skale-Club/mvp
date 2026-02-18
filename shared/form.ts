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
      id: "cidadeEstado",
      order: 1,
      title: "What is your zip code?",
      type: "text",
      required: true,
      placeholder: "e.g. 33101",
    },
    {
      id: "nome",
      order: 2,
      title: "What is your full name?",
      type: "text",
      required: true,
      placeholder: "Enter your full name",
    },
    {
      id: "email",
      order: 3,
      title: "What is your email address?",
      type: "email",
      required: true,
      placeholder: "you@example.com",
    },
    {
      id: "telefone",
      order: 4,
      title: "What is your phone number?",
      type: "tel",
      required: true,
      placeholder: "(555) 123-4567",
    },
    {
      id: "tipoNegocio",
      order: 5,
      title: "What type of project are you looking for?",
      type: "select",
      required: true,
      options: [
        { value: "Kitchen Remodel", label: "Kitchen Remodel", points: 10 },
        { value: "Bathroom Remodel", label: "Bathroom Remodel", points: 10 },
        { value: "Full Renovation", label: "Full Home Renovation", points: 10 },
        { value: "Custom Carpentry", label: "Custom Carpentry & Finishes", points: 8 },
        { value: "Outdoor Project", label: "Outdoor / Exterior Project", points: 8 },
        { value: "Other", label: "Other (please specify)", points: 5 },
      ],
      conditionalField: {
        showWhen: "Other",
        id: "tipoNegocioOutro",
        title: "Please describe your project",
        placeholder: "e.g. Garage conversion, Painting, etc.",
      },
    },
    {
      id: "expectativaResultado",
      order: 6,
      title: "When are you looking to start?",
      type: "select",
      required: true,
      options: [
        { value: "ASAP", label: "As soon as possible", points: 10 },
        { value: "Within 1 month", label: "Within 1 month", points: 8 },
        { value: "1 to 3 months", label: "1 to 3 months", points: 5 },
        { value: "Just exploring", label: "Just exploring options", points: 3 },
      ],
    },
  ],
  maxScore: 20,
  thresholds: {
    hot: 18,
    warm: 13,
    cold: 8,
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
  "expectativaResultado",
];

// Score field mapping for known questions
export const SCORE_FIELD_MAPPING: Record<string, string> = {
  tipoNegocio: "scoreTipoNegocio",
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
