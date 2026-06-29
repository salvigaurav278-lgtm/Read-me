// Shared DTOs and AI output contracts used by both web and api.

import type {
  ClassLevel,
  Subject,
  ContentType,
  NoteStyle,
  TestKind,
  QuestionType,
  Difficulty,
  PptTheme,
  ExportFormat,
  JobStatus,
} from "./enums.js";

// ─── Generation request DTOs ────────────────────────────────

export interface NotesRequest {
  classLevel: ClassLevel;
  subject: Subject;
  chapter: string;
  topic?: string;
  style: NoteStyle;
}

export interface TestRequest {
  classLevel: ClassLevel;
  subject: Subject;
  chapters: string[];
  testKind: TestKind;
  difficulty: Difficulty;
  totalMarks: number;
  durationMin: number;
  questionMix: Partial<Record<QuestionType, number>>;
  includeAnswerKey: boolean;
  includeSolutions: boolean;
  includeMarkingScheme: boolean;
}

export interface PptRequest {
  classLevel: ClassLevel;
  subject: Subject;
  chapter: string;
  slides: number;
  theme: PptTheme;
  includePYQ: boolean;
  includeDiagrams: boolean;
  includeHomework: boolean;
}

export interface QuestionBankRequest {
  classLevel: ClassLevel;
  subject: Subject;
  chapter: string;
  questionTypes: QuestionType[];
  count: number;
}

export interface LessonPlanRequest {
  classLevel: ClassLevel;
  subject: Subject;
  chapter: string;
  periods: number;
}

// ─── Generation response ────────────────────────────────────

export interface GenerationResponse {
  projectId: string;
  jobId: string;
  status: JobStatus;
}

// ─── AI output contracts (mirror docs/ai-prompts.md) ────────

export interface NotesContent {
  title: string;
  classLevel: ClassLevel;
  subject: Subject;
  chapter: string;
  style: NoteStyle;
  sections: Array<{
    heading: string;
    points: string[];
    formulas?: Array<{ name: string; expression: string }>;
    examples?: Array<{ problem: string; solution: string }>;
  }>;
  keyTakeaways: string[];
  mindMap?: {
    root: string;
    branches: Array<{ label: string; children: string[] }>;
  };
}

export interface TestQuestion {
  number: number;
  type: QuestionType;
  marks: number;
  text: string;
  options?: string[];
  caseStudy?: { passage: string; subQuestions: string[] };
  assertionReason?: { assertion: string; reason: string };
}

export interface TestContent {
  title: string;
  meta: { totalMarks: number; durationMin: number; instructions: string[] };
  sections: Array<{ name: string; questions: TestQuestion[] }>;
  answerKey?: Array<{ number: number; answer: string }>;
  solutions?: Array<{ number: number; steps: string[]; finalAnswer: string }>;
  markingScheme?: Array<{ number: number; breakdown: string[] }>;
}

export type SlideLayout =
  | "cover"
  | "objectives"
  | "theory"
  | "diagram"
  | "table"
  | "flowchart"
  | "example"
  | "questions"
  | "pyq"
  | "summary"
  | "homework"
  | "thankyou";

export interface PptContent {
  title: string;
  theme: PptTheme;
  slides: Array<{
    layout: SlideLayout;
    title: string;
    bullets?: string[];
    table?: { headers: string[]; rows: string[][] };
    diagramDescription?: string;
    flowchart?: string[];
    notes?: string;
  }>;
}

export interface QuestionBankContent {
  title: string;
  questions: Array<{
    category: "NCERT" | "BOARD" | "PYQ_CBSE" | "HOTS" | "COMPETENCY" | "EXTRA";
    type: QuestionType;
    marks: number;
    text: string;
    answer: string;
  }>;
}

export interface LessonPlanContent {
  title: string;
  periods: number;
  objectives: string[];
  teachingStrategy: string[];
  activities: Array<{ name: string; duration: string; description: string }>;
  assessment: string[];
  homework: string[];
  expectedOutcomes: string[];
}

// ─── Project & export view models ───────────────────────────

export interface ProjectSummary {
  id: string;
  title: string;
  type: ContentType;
  classLevel: ClassLevel;
  subject: Subject;
  chapter?: string;
  updatedAt: string;
  exports: Array<{ format: ExportFormat; fileUrl: string }>;
}
