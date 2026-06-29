// Registry of the 9 AI generators. Drives the sidebar, routing, the generic
// generator form, and the prompt builder. Each type declares its own option
// fields so the UI and validation stay data-driven.

export const CONTENT_TYPES = [
  "NOTES",
  "PPT",
  "TEST",
  "WORKSHEET",
  "DPP",
  "PYQ",
  "MIND_MAP",
  "LESSON_PLAN",
  "QUESTION_BANK",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export type OptionField =
  | {
      kind: "select";
      key: string;
      label: string;
      options: { value: string; label: string }[];
      default: string;
    }
  | {
      kind: "number";
      key: string;
      label: string;
      default: number;
      min: number;
      max: number;
    }
  | {
      kind: "toggle";
      key: string;
      label: string;
      default: boolean;
    };

export interface ContentTypeConfig {
  type: ContentType;
  slug: string;
  label: string;
  description: string;
  icon: string; // lucide-react icon name
  /** PPTX for decks, DOCX+PDF for notes, PDF for the rest. */
  exportFormats: ("PDF" | "DOCX" | "PPTX")[];
  fields: OptionField[];
}

const DIFFICULTY: OptionField = {
  kind: "select",
  key: "difficulty",
  label: "Difficulty",
  default: "MEDIUM",
  options: [
    { value: "EASY", label: "Easy" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HARD", label: "Hard" },
  ],
};

export const CONTENT_TYPE_CONFIG: Record<ContentType, ContentTypeConfig> = {
  NOTES: {
    type: "NOTES",
    slug: "notes",
    label: "Notes Generator",
    description: "Chapter-wise notes in multiple styles, exportable to PDF & DOCX.",
    icon: "NotebookPen",
    exportFormats: ["PDF", "DOCX"],
    fields: [
      {
        kind: "select",
        key: "style",
        label: "Note Style",
        default: "DETAILED",
        options: [
          { value: "SHORT", label: "Short Notes" },
          { value: "DETAILED", label: "Detailed Notes" },
          { value: "REVISION", label: "Revision Notes" },
          { value: "ONE_SHOT", label: "One-Shot Notes" },
          { value: "FORMULA_SHEET", label: "Formula Sheet" },
        ],
      },
    ],
  },
  PPT: {
    type: "PPT",
    slug: "ppt",
    label: "PPT Generator",
    description: "Professional teaching decks with themes, exported to PPTX.",
    icon: "Presentation",
    exportFormats: ["PPTX", "PDF"],
    fields: [
      { kind: "number", key: "slides", label: "Number of Slides", default: 12, min: 6, max: 30 },
      {
        kind: "select",
        key: "theme",
        label: "Theme",
        default: "MODERN_EDUCATION",
        options: [
          { value: "BLUE", label: "Blue" },
          { value: "GREEN", label: "Green" },
          { value: "DARK", label: "Dark" },
          { value: "MINIMAL", label: "Minimal" },
          { value: "MODERN_EDUCATION", label: "Modern Education" },
        ],
      },
      { kind: "toggle", key: "includePYQ", label: "Include Previous Year Questions (CBSE)", default: true },
      { kind: "toggle", key: "includeHomework", label: "Include Homework slide", default: true },
    ],
  },
  TEST: {
    type: "TEST",
    slug: "test",
    label: "Test Generator",
    description: "Chapter / unit / board-pattern papers with answer keys & solutions.",
    icon: "FileCheck2",
    exportFormats: ["PDF", "DOCX"],
    fields: [
      {
        kind: "select",
        key: "testKind",
        label: "Test Type",
        default: "CHAPTER_TEST",
        options: [
          { value: "CHAPTER_TEST", label: "Chapter Test" },
          { value: "UNIT_TEST", label: "Unit Test" },
          { value: "SAMPLE_PAPER", label: "Sample Paper" },
          { value: "BOARD_PATTERN", label: "Board Pattern Paper" },
        ],
      },
      DIFFICULTY,
      { kind: "number", key: "totalMarks", label: "Total Marks", default: 40, min: 10, max: 100 },
      { kind: "number", key: "durationMin", label: "Duration (minutes)", default: 90, min: 15, max: 180 },
      { kind: "number", key: "questionCount", label: "Number of Questions", default: 15, min: 5, max: 40 },
      { kind: "toggle", key: "includeSolutions", label: "Include step-by-step solutions", default: true },
      { kind: "toggle", key: "includeMarkingScheme", label: "Include marking scheme", default: true },
    ],
  },
  WORKSHEET: {
    type: "WORKSHEET",
    slug: "worksheet",
    label: "Worksheet Generator",
    description: "Practice worksheets with a mix of question types and an answer key.",
    icon: "ClipboardList",
    exportFormats: ["PDF", "DOCX"],
    fields: [
      DIFFICULTY,
      { kind: "number", key: "questionCount", label: "Number of Questions", default: 12, min: 5, max: 30 },
      { kind: "toggle", key: "includeSolutions", label: "Include solutions", default: true },
    ],
  },
  DPP: {
    type: "DPP",
    slug: "dpp",
    label: "DPP Generator",
    description: "Daily Practice Problems — focused, exam-oriented question sets.",
    icon: "CalendarCheck",
    exportFormats: ["PDF"],
    fields: [
      DIFFICULTY,
      { kind: "number", key: "questionCount", label: "Number of Questions", default: 10, min: 5, max: 25 },
      { kind: "toggle", key: "includeSolutions", label: "Include solutions", default: true },
    ],
  },
  PYQ: {
    type: "PYQ",
    slug: "pyq",
    label: "PYQ Generator",
    description: "Previous Year Questions (CBSE board) with answers, chapter-wise.",
    icon: "History",
    exportFormats: ["PDF", "DOCX"],
    fields: [
      { kind: "number", key: "questionCount", label: "Number of Questions", default: 12, min: 5, max: 30 },
    ],
  },
  MIND_MAP: {
    type: "MIND_MAP",
    slug: "mind-map",
    label: "Mind Map Generator",
    description: "Visual, hierarchical mind maps to revise a chapter at a glance.",
    icon: "Network",
    exportFormats: ["PDF"],
    fields: [
      { kind: "number", key: "branches", label: "Main Branches", default: 6, min: 3, max: 10 },
    ],
  },
  LESSON_PLAN: {
    type: "LESSON_PLAN",
    slug: "lesson-plan",
    label: "Lesson Planner",
    description: "Complete lesson plans: objectives, strategy, activities, outcomes.",
    icon: "CalendarRange",
    exportFormats: ["PDF", "DOCX"],
    fields: [
      { kind: "number", key: "periods", label: "Number of Periods", default: 3, min: 1, max: 8 },
    ],
  },
  QUESTION_BANK: {
    type: "QUESTION_BANK",
    slug: "question-bank",
    label: "Question Bank",
    description: "NCERT, Board, HOTS & competency-based questions with answers.",
    icon: "Library",
    exportFormats: ["PDF", "DOCX"],
    fields: [
      DIFFICULTY,
      { kind: "number", key: "questionCount", label: "Number of Questions", default: 20, min: 10, max: 50 },
    ],
  },
};

export const CONTENT_TYPE_LIST: ContentTypeConfig[] =
  CONTENT_TYPES.map((t) => CONTENT_TYPE_CONFIG[t]);

const SLUG_TO_TYPE: Record<string, ContentType> = Object.fromEntries(
  CONTENT_TYPE_LIST.map((c) => [c.slug, c.type]),
);

export function typeFromSlug(slug: string): ContentType | undefined {
  return SLUG_TO_TYPE[slug];
}

export function defaultParams(type: ContentType): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of CONTENT_TYPE_CONFIG[type].fields) out[f.key] = f.default;
  return out;
}
