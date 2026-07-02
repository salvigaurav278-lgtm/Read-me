import type { ContentType } from "@/lib/content-types";
import {
  CLASS_LABELS,
  SUBJECT_LABELS,
  type ClassLevel,
  type Subject,
} from "@/lib/curriculum";
import { shapeForType, type ContentShape } from "./schemas";
import { DIAGRAM_IDS } from "@/lib/generators/diagrams";

export interface PromptInput {
  type: ContentType;
  classLevel: ClassLevel;
  subject: Subject;
  chapter?: string | null;
  topic?: string | null;
  params: Record<string, unknown>;
}

const SHAPE_CONTRACT: Record<ContentShape, string> = {
  document: `{
  "kind": "document",
  "title": string,
  "subtitle"?: string,
  "sections": [ { "heading": string, "body": [string], "example"?: string, "formulas"?: [ { "name": string, "expression": string } ], "keyPoints"?: [string], "table"?: { "headers": [string], "rows": [[string]] }, "diagramId"?: string, "diagram"?: string, "tip"?: string, "mistake"?: string } ],
  "keyPoints"?: [string],
  "tips"?: [string],
  "commonMistakes"?: [string],
  "keyTakeaways"?: [string],
  "quote"?: string,
  "summary"?: [string],
  "pyqs"?: [ { "question": string, "answer"?: string, "year"?: string } ]
}`,
  paper: `{
  "kind": "paper",
  "title": string,
  "instructions"?: [string],
  "totalMarks"?: number,
  "durationMin"?: number,
  "questions": [ { "number": number, "text": string, "type": "MCQ"|"SHORT_ANSWER"|"LONG_ANSWER"|"CASE_STUDY"|"ASSERTION_REASON"|"HOTS"|"COMPETENCY", "marks": number, "options"?: [string], "answer"?: string, "solution"?: [string] } ]
}`,
  deck: `{
  "kind": "deck",
  "title": string,
  "theme": string,
  "slides": [ { "title": string, "bullets"?: [string], "notes"?: string } ]
}`,
};

function instructionsForType(input: PromptInput): string {
  const p = input.params;
  switch (input.type) {
    case "NOTES":
      return `Produce premium ${p.style ?? "DETAILED"} style coaching notes laid out like a printed coaching-institute handout (Allen / Physics Wallah quality). Set a short "subtitle" (e.g. "CBSE • Class & Subject"). Break the chapter into 12-24 compact, numbered "sections" — each a small self-contained card with a short "heading" and 2-4 concise "body" bullet points (keep each card short so two fit side by side). For each section, where relevant also add:
- "example": one short real-life or worked example (rendered as an "Example:" line);
- "formulas" (name + expression);
- a small "table" with "headers" and "rows" for comparisons/classifications (e.g. differences, soluble vs insoluble) — keep to 2-3 columns and short cells;
- "diagramId": choose the single best-fitting built-in diagram ONLY from this exact list when the concept is one of them, else omit it: [${DIAGRAM_IDS.join(", ")}];
- a one-line teaching "tip" and a common "mistake" (use sparingly).
At the document level also provide: overall "keyPoints", "tips", "commonMistakes", a short "keyTakeaways" checklist (3-5 items), a memorable one-line "quote", a "summary" (chapter summary bullets), and "pyqs" — a few CBSE previous-year questions with "question", "answer" and "year". Prefer many short cards with examples and diagrams over a few long ones.`;
    case "MIND_MAP":
      return `Produce a mind-map outline with ${p.branches ?? 6} main branches. Each "section" is a main branch (heading) whose "body" lists its sub-nodes as short phrases.`;
    case "LESSON_PLAN":
      return `Produce a lesson plan spanning ${p.periods ?? 3} periods. Use sections titled exactly: "Learning Objectives", "Teaching Strategy", "Activities", "Assessment", "Homework", "Expected Learning Outcomes". Put items as bullet points in each section's "body".`;
    case "PPT":
      return `Produce a teaching presentation of about ${p.slides ?? 12} slides. The first slide is a cover (title only), then Learning Objectives, then theory/concept slides with 3-5 concise bullets each, worked Examples, ${p.includePYQ ? "a Previous Year Questions (CBSE board only) slide, " : ""}a Summary slide, ${p.includeHomework ? "a Homework slide, " : ""}and a closing "Thank You" slide. Add brief speaker "notes" to content slides. Use theme "${p.theme ?? "MODERN_EDUCATION"}".`;
    case "TEST":
      return `Produce a ${p.testKind ?? "CHAPTER_TEST"} of ${p.questionCount ?? 15} questions worth ${p.totalMarks ?? 40} marks total, for ${p.durationMin ?? 90} minutes, at ${p.difficulty ?? "MEDIUM"} difficulty. Follow the CBSE board pattern with a mix of MCQ, short-answer, long-answer, case-study and assertion-reason questions. Set "totalMarks" and "durationMin". Provide general "instructions". For every question include the "answer"${p.includeSolutions ? ` and a step-by-step "solution"` : ""}.`;
    case "WORKSHEET":
      return `Produce a practice worksheet of ${p.questionCount ?? 12} questions at ${p.difficulty ?? "MEDIUM"} difficulty with a variety of question types. Include the "answer" for each${p.includeSolutions ? ` and a "solution"` : ""}.`;
    case "DPP":
      return `Produce a Daily Practice Problem set of ${p.questionCount ?? 10} focused, exam-oriented questions at ${p.difficulty ?? "MEDIUM"} difficulty. Include the "answer" for each${p.includeSolutions ? ` and a "solution"` : ""}.`;
    case "PYQ":
      return `Produce ${p.questionCount ?? 12} Previous Year Questions from CBSE board examinations only, relevant to this chapter. Include the "answer" for each and note the question "type".`;
    case "QUESTION_BANK":
      return `Produce a question bank of ${p.questionCount ?? 20} questions at ${p.difficulty ?? "MEDIUM"} difficulty, mixing NCERT, important board, HOTS and competency-based questions. Set "type" accordingly and include an "answer" for each.`;
    default:
      return `Produce high-quality educational content for this chapter.`;
  }
}

export function buildPrompt(input: PromptInput): {
  system: string;
  user: string;
} {
  const shape = shapeForType(input.type);
  const cls = CLASS_LABELS[input.classLevel];
  const subj = SUBJECT_LABELS[input.subject];

  const system = `You are Real Pathshala AI, an expert CBSE ${cls} teacher and content author for ${subj}. You strictly follow the latest NCERT syllabus and the CBSE board examination pattern. Use correct notation, units and Indian curriculum conventions. When asked for previous-year questions, use CBSE board examinations only.

You must respond with ONLY a single valid JSON object that matches this exact schema — no markdown, no code fences, no commentary:

${SHAPE_CONTRACT[shape]}`;

  const target = [
    `Class: ${cls}`,
    `Subject: ${subj}`,
    input.chapter ? `Chapter: ${input.chapter}` : null,
    input.topic ? `Topic focus: ${input.topic}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const user = `${target}

Task: ${instructionsForType(input)}

Return only the JSON object.`;

  return { system, user };
}
