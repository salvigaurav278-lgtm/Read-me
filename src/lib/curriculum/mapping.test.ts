import { describe, it, expect } from "vitest";
import { toCsv, parseCsv } from "./mappingStore";
import { DEFAULT_MAPPINGS, chapterKey, normalizeChapter, type ChapterMapping } from "./chapterConcepts";
import { buildPrompt } from "@/lib/ai/prompts";

describe("chapter mapping data", () => {
  it("has stable, unique keys", () => {
    const keys = DEFAULT_MAPPINGS.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const m of DEFAULT_MAPPINGS) {
      expect(m.key).toBe(chapterKey(m.classLevel, m.subject, m.chapter));
    }
  });

  it("normalizes chapter names for synonym matching", () => {
    expect(normalizeChapter("Light – Reflection and Refraction")).toBe("lightreflectionandrefraction");
    expect(normalizeChapter("Current Electricity!")).toBe("currentelectricity");
  });
});

describe("CSV round-trip", () => {
  it("serialises and parses back to equivalent rows", () => {
    const sample: ChapterMapping[] = [
      {
        key: "CLASS_10::PHYSICS::electricity",
        classLevel: "CLASS_10", subject: "PHYSICS", chapter: "Electricity",
        synonyms: ["current electricity", "electric current"],
        concepts: ["circuit-simple", "resistors-series"],
        keywords: ["current, voltage"], // comma inside a field → must survive quoting
        formulas: ["V = IR"], experiments: ["Ohm's law"],
      },
    ];
    const parsed = parseCsv(toCsv(sample));
    expect(parsed).toHaveLength(1);
    expect(parsed[0].chapter).toBe("Electricity");
    expect(parsed[0].synonyms).toEqual(["current electricity", "electric current"]);
    expect(parsed[0].concepts).toEqual(["circuit-simple", "resistors-series"]);
    expect(parsed[0].keywords).toEqual(["current, voltage"]);
  });
});

describe("prompt injection", () => {
  it("embeds the chapter blueprint into the notes prompt", () => {
    const mapping = DEFAULT_MAPPINGS.find((m) => m.chapter === "Electricity")!;
    const { user } = buildPrompt(
      { type: "NOTES", classLevel: "CLASS_10", subject: "PHYSICS", chapter: "Electricity", topic: null, params: {} },
      mapping,
    );
    expect(user).toContain("CHAPTER BLUEPRINT");
    expect(user).toContain("circuit-simple");
    expect(user).toContain("V = IR");
  });

  it("omits the blueprint when no mapping is supplied", () => {
    const { user } = buildPrompt({
      type: "NOTES", classLevel: "CLASS_10", subject: "PHYSICS", chapter: "Electricity", topic: null, params: {},
    });
    expect(user).not.toContain("CHAPTER BLUEPRINT");
  });
});
