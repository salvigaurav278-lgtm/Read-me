import { z } from "zod";
import { CONTENT_TYPES } from "@/lib/content-types";
import { CLASS_LEVELS, SUBJECTS } from "@/lib/curriculum";

export const generateSchema = z.object({
  type: z.enum(CONTENT_TYPES),
  classLevel: z.enum(CLASS_LEVELS),
  subject: z.enum(SUBJECTS),
  chapter: z.string().trim().max(200).optional().nullable(),
  topic: z.string().trim().max(200).optional().nullable(),
  params: z.record(z.string(), z.unknown()).default({}),
});
export type GenerateInput = z.infer<typeof generateSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

export const exportSchema = z.object({
  format: z.enum(["PDF", "DOCX", "PPTX"]),
});
