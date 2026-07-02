import { GoogleGenAI, type Content } from "@google/genai";
import { buildPrompt, type PromptInput } from "./prompts";
import { schemaForType, type GeneratedContent } from "./schemas";
import { mockContent } from "./mock";
import { getMapping } from "@/lib/curriculum/mappingStore";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export interface GenerationResult {
  content: GeneratedContent;
  tokensUsed: number;
  mocked: boolean;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/** Strip accidental ```json fences and grab the outermost JSON object. */
function extractJson(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return t.slice(start, end + 1);
  }
  return t;
}

export async function generateContent(
  input: PromptInput,
): Promise<GenerationResult> {
  const ai = getClient();
  const schema = schemaForType(input.type);

  // No API key configured → return a clearly-labelled mock so the app remains
  // usable in development and CI without external calls.
  if (!ai) {
    return { content: mockContent(input), tokensUsed: 0, mocked: true };
  }

  // Apply the CBSE chapter→concept mapping (with admin overrides) so the AI
  // covers the right concepts and tags the correct diagrams.
  const mapping = input.chapter
    ? await getMapping(input.classLevel, input.subject, input.chapter).catch(() => null)
    : null;
  const { system, user } = buildPrompt(input, mapping);

  const contents: Content[] = [{ role: "user", parts: [{ text: user }] }];
  let tokensUsed = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        // Structured extraction doesn't need extended reasoning — keep it fast.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    tokensUsed += res.usageMetadata?.totalTokenCount ?? 0;

    const raw = res.text ?? "";
    try {
      const parsed = JSON.parse(extractJson(raw));
      const validated = schema.parse(parsed) as GeneratedContent;
      return { content: validated, tokensUsed, mocked: false };
    } catch (err) {
      if (attempt === 1) {
        throw new Error(
          `AI returned invalid content: ${(err as Error).message}`,
        );
      }
      // Repair turn — show the model its output and ask for valid JSON only.
      contents.push({ role: "model", parts: [{ text: raw.slice(0, 4000) }] });
      contents.push({
        role: "user",
        parts: [
          {
            text:
              "That was not valid JSON for the required schema. Reply again with ONLY the corrected JSON object — no prose, no code fences.",
          },
        ],
      });
    }
  }

  // Unreachable, but satisfies the type checker.
  throw new Error("AI generation failed");
}
