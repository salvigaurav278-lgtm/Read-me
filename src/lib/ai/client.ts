import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, type PromptInput } from "./prompts";
import { schemaForType, type GeneratedContent } from "./schemas";
import { mockContent } from "./mock";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";

export interface GenerationResult {
  content: GeneratedContent;
  tokensUsed: number;
  mocked: boolean;
}

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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

function textFromMessage(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export async function generateContent(
  input: PromptInput,
): Promise<GenerationResult> {
  const api = getClient();
  const schema = schemaForType(input.type);

  // No API key configured → return a clearly-labelled mock so the app remains
  // usable in development and CI without external calls.
  if (!api) {
    return { content: mockContent(input), tokensUsed: 0, mocked: true };
  }

  const { system, user } = buildPrompt(input);

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  let tokensUsed = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await api.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages,
    });
    tokensUsed += msg.usage.input_tokens + msg.usage.output_tokens;

    const raw = textFromMessage(msg);
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
      messages.push({ role: "assistant", content: raw.slice(0, 4000) });
      messages.push({
        role: "user",
        content:
          "That was not valid JSON for the required schema. Reply again with ONLY the corrected JSON object — no prose, no code fences.",
      });
    }
  }

  // Unreachable, but satisfies the type checker.
  throw new Error("AI generation failed");
}
