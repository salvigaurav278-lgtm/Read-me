// Generative AI image fallback for the image pipeline: when no real licensed
// image is found (Wikimedia/Openverse), generate an educational illustration
// with OpenAI Images or Google Imagen. Opt-in via IMAGE_GEN_PROVIDER; guarded
// and normalised to PNG. Never throws.

import sharp from "sharp";
import type { CacheMeta } from "./imageCache";

const FETCH_TIMEOUT_MS = 30000;

export type GenProvider = "openai" | "imagen";

/** Which generative provider is configured (null = disabled). */
export function genProvider(): GenProvider | null {
  const p = String(process.env.IMAGE_GEN_PROVIDER ?? "").toLowerCase();
  if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (p === "imagen" && process.env.GEMINI_API_KEY) return "imagen";
  if (p === "auto") {
    if (process.env.OPENAI_API_KEY) return "openai";
    if (process.env.GEMINI_API_KEY) return "imagen";
  }
  return null;
}

export function genEnabled(): boolean {
  return genProvider() !== null;
}

/** Educational-illustration prompt tuned for CBSE-style labeled diagrams. */
export function buildGenPrompt(concept: string): string {
  const c = concept.replace(/\bdiagram\b/i, "").trim();
  return (
    `A clean, colorful, clearly labeled educational diagram of ${c}, ` +
    `in the style of a CBSE school textbook illustration. Flat vector style, ` +
    `white background, neatly labeled parts, accurate and simple, no photographic ` +
    `realism, no watermark, no borders.`
  );
}

async function genOpenAI(prompt: string): Promise<Buffer | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
    const d = j.data?.[0];
    if (d?.b64_json) return Buffer.from(d.b64_json, "base64");
    if (d?.url) {
      const r = await fetch(d.url);
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function genImagen(prompt: string): Promise<Buffer | null> {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const res = await ai.models.generateImages({
      model: process.env.IMAGEN_MODEL || "imagen-3.0-generate-002",
      prompt,
      config: { numberOfImages: 1 },
    });
    const b64 = res?.generatedImages?.[0]?.image?.imageBytes;
    return b64 ? Buffer.from(b64, "base64") : null;
  } catch {
    return null;
  }
}

export interface Generated {
  buf: Buffer;
  meta: CacheMeta;
}

/** Generate an educational illustration for a concept, normalised to PNG. */
export async function generateImage(concept: string): Promise<Generated | null> {
  const provider = genProvider();
  if (!provider) return null;
  const prompt = buildGenPrompt(concept);
  const raw = provider === "openai" ? await genOpenAI(prompt) : await genImagen(prompt);
  if (!raw) return null;
  try {
    const png = await sharp(raw).png().toBuffer();
    const m = await sharp(png).metadata();
    return {
      buf: png,
      meta: {
        source: `AI generated (${provider})`,
        license: "AI-generated",
        sourceUrl: "",
        width: m.width || 1024,
        height: m.height || 1024,
        mime: "image/png",
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch {
    return null;
  }
}
