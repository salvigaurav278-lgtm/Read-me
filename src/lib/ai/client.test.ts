import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateContent, geminiConfigured, strictAi } from "./client";

const ENV = { ...process.env };
beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.AI_REQUIRE_KEY;
});
afterEach(() => {
  process.env = { ...ENV };
});

const input = {
  type: "NOTES" as const,
  classLevel: "CLASS_10" as const,
  subject: "PHYSICS" as const,
  chapter: "Electricity",
  topic: null,
  params: { style: "SHORT" },
};

describe("Gemini vs mock", () => {
  it("treats blank/whitespace keys as unset", () => {
    process.env.GEMINI_API_KEY = "   ";
    expect(geminiConfigured()).toBe(false);
    process.env.GEMINI_API_KEY = "real-key";
    expect(geminiConfigured()).toBe(true);
  });

  it("returns mock ONLY when no key is configured", async () => {
    const r = await generateContent(input);
    expect(r.mocked).toBe(true);
  });

  it("never falls back to mock in strict mode without a key (throws)", async () => {
    process.env.AI_REQUIRE_KEY = "true";
    expect(strictAi()).toBe(true);
    await expect(generateContent(input)).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
