import { z } from "zod";
import type { ContentType } from "@/lib/content-types";

// All 9 generators map to one of three structured shapes. This keeps prompts,
// validation, and renderers small while covering every content type.

export const documentSchema = z.object({
  kind: z.literal("document"),
  title: z.string(),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        body: z.array(z.string()).default([]),
        formulas: z
          .array(z.object({ name: z.string(), expression: z.string() }))
          .optional(),
      }),
    )
    .default([]),
  keyPoints: z.array(z.string()).optional(),
});

export const paperQuestionSchema = z.object({
  number: z.number(),
  text: z.string(),
  type: z.string().default("SHORT_ANSWER"),
  marks: z.number().default(1),
  options: z.array(z.string()).optional(),
  answer: z.string().optional(),
  solution: z.array(z.string()).optional(),
});

export const paperSchema = z.object({
  kind: z.literal("paper"),
  title: z.string(),
  instructions: z.array(z.string()).optional(),
  totalMarks: z.number().optional(),
  durationMin: z.number().optional(),
  questions: z.array(paperQuestionSchema).default([]),
});

export const deckSchema = z.object({
  kind: z.literal("deck"),
  title: z.string(),
  theme: z.string().default("MODERN_EDUCATION"),
  slides: z
    .array(
      z.object({
        title: z.string(),
        bullets: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }),
    )
    .default([]),
});

export const generatedContentSchema = z.discriminatedUnion("kind", [
  documentSchema,
  paperSchema,
  deckSchema,
]);

export type DocumentContent = z.infer<typeof documentSchema>;
export type PaperContent = z.infer<typeof paperSchema>;
export type DeckContent = z.infer<typeof deckSchema>;
export type GeneratedContent = z.infer<typeof generatedContentSchema>;

export type ContentShape = "document" | "paper" | "deck";

export function shapeForType(type: ContentType): ContentShape {
  switch (type) {
    case "PPT":
      return "deck";
    case "TEST":
    case "WORKSHEET":
    case "DPP":
    case "PYQ":
    case "QUESTION_BANK":
      return "paper";
    case "NOTES":
    case "MIND_MAP":
    case "LESSON_PLAN":
    default:
      return "document";
  }
}

export function schemaForType(type: ContentType) {
  switch (shapeForType(type)) {
    case "deck":
      return deckSchema;
    case "paper":
      return paperSchema;
    case "document":
      return documentSchema;
  }
}
