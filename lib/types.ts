export type Difficulty = "facil" | "media" | "dificil";

export interface Question {
  id: string;
  year: number;
  source: string;
  number: number;
  statement: string;
  options: Record<string, string>;
  correct: string | null;
  subject: string;
  subjectSource: "oficial" | "auto";
  lang: string | null;
  difficulty: Difficulty;
  difficultyScore: number;
  contextId: string | null;
  needsImage: boolean;
  graphicalOptions: boolean;
  stemImages: string[];
  optImages: Record<string, string>;
  similar: { id: string; s: number }[];
}

export interface Ctx {
  id: string;
  text: string;
  year: number;
  source: string;
  shared: boolean;
}

export interface Dataset {
  meta: {
    years: number[];
    difficultyNote: string;
    subjectNote: string;
  };
  contexts: Record<string, Ctx>;
  questions: Question[];
}

export interface Discursiva {
  id: string;
  year: number;
  subject: string;
  number: number;
  source: string;
  kind: "discursiva" | "redacao";
  points: number | null;
  lines: number | null;
  text: string;
  images: string[];
}

export interface Redacao {
  id: string;
  year: number;
  source: string;
  subject: string;
  pages: string[];
  prompts: { n: number; text: string; lines: number | null }[];
}

export interface Filters {
  subjects: string[];
  difficulties: Difficulty[];
  years: number[];
  langs: string[];
  onlyWithContext: boolean;
  onlyUnseen: boolean;
  excludeCorrect: boolean;
  onlyErrors: boolean;
}

export interface RunConfig extends Filters {
  count: number;
  mode: "treino" | "simulado";
  autoAdvance: boolean;
  advanceDelay: number;
  instantFeedback: boolean;
  shuffleOptions: boolean;
  timed: boolean;
  minutes: number;
}

export interface Attempt {
  qid: string;
  chosen: string;
  correct: boolean;
  at: number;
  subject: string;
  ms: number;
}
