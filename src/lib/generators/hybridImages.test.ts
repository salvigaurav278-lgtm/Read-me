import { describe, it, expect } from "vitest";
import { validateImage, imageSize } from "./imageQuality";
import { isAllowedLicense, buildQuery, fetchEnabled } from "./imageSources";
import { matchConcept } from "./diagramRegistry";
import { matchDiagram } from "./diagramRegistry";
import { genProvider, buildGenPrompt } from "./imageGenerate";

// Build a minimal valid PNG of a given width/height (IHDR only is enough for
// our size parser; the rest is padded so length passes the >1KB gate).
function fakePng(width: number, height: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(16);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  return Buffer.concat([sig, ihdr, Buffer.alloc(2048)]);
}

describe("imageQuality", () => {
  it("parses PNG dimensions", () => {
    const s = imageSize(fakePng(1600, 900));
    expect(s).toEqual({ width: 1600, height: 900, mime: "image/png" });
  });

  it("accepts a >=1200px raster", () => {
    expect(validateImage(fakePng(1600, 900)).ok).toBe(true);
  });

  it("rejects a small image", () => {
    expect(validateImage(fakePng(400, 300)).ok).toBe(false);
  });

  it("rejects SVG (not embeddable)", () => {
    const svg = Buffer.concat([Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), Buffer.alloc(2048)]);
    const r = validateImage(svg);
    expect(r.ok).toBe(false);
  });
});

describe("license filtering", () => {
  it("allows PD / CC0 / CC BY", () => {
    expect(isAllowedLicense("CC0")).toBe(true);
    expect(isAllowedLicense("Public domain")).toBe(true);
    expect(isAllowedLicense("CC BY-SA 4.0")).toBe(true);
    expect(isAllowedLicense("cc-by-3.0")).toBe(true);
  });
  it("blocks non-free / unknown", () => {
    expect(isAllowedLicense("CC BY-NC")).toBe(false);
    expect(isAllowedLicense("All rights reserved")).toBe(false);
    expect(isAllowedLicense("")).toBe(false);
    expect(isAllowedLicense(undefined)).toBe(false);
  });
});

describe("query building", () => {
  it("appends 'diagram' for plain concepts", () => {
    expect(buildQuery("human heart")).toBe("human heart diagram");
    expect(buildQuery("digestive-system")).toBe("digestive system diagram");
  });
  it("keeps queries that already imply a figure", () => {
    expect(buildQuery("nitrogen cycle")).toBe("nitrogen cycle");
  });
});

describe("feature flag", () => {
  it("is off unless explicitly enabled", () => {
    const prev = process.env.IMAGE_FETCH_ENABLED;
    delete process.env.IMAGE_FETCH_ENABLED;
    expect(fetchEnabled()).toBe(false);
    process.env.IMAGE_FETCH_ENABLED = "true";
    expect(fetchEnabled()).toBe(true);
    process.env.IMAGE_FETCH_ENABLED = prev;
  });
});

describe("generative image fallback", () => {
  it("selects a provider from env (Imagen by default with a Gemini key)", () => {
    const prev = { p: process.env.IMAGE_GEN_PROVIDER, o: process.env.OPENAI_API_KEY, g: process.env.GEMINI_API_KEY };
    delete process.env.IMAGE_GEN_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(genProvider()).toBeNull(); // no keys → off

    process.env.GEMINI_API_KEY = "g-test";
    expect(genProvider()).toBe("imagen"); // default enables Imagen

    process.env.IMAGE_GEN_PROVIDER = "off";
    expect(genProvider()).toBeNull(); // explicit off wins

    process.env.IMAGE_GEN_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test";
    expect(genProvider()).toBe("openai");

    process.env.IMAGE_GEN_PROVIDER = prev.p;
    prev.o === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = prev.o);
    prev.g === undefined ? delete process.env.GEMINI_API_KEY : (process.env.GEMINI_API_KEY = prev.g);
  });
  it("builds an educational illustration prompt", () => {
    const p = buildGenPrompt("human heart diagram");
    expect(p).toContain("human heart");
    expect(p.toLowerCase()).toContain("labeled");
    expect(p).not.toMatch(/\bdiagram diagram\b/);
  });
});

describe("semantic concept matching", () => {
  it("maps vector concepts", () => {
    expect(matchDiagram("separate sand from water with filter paper")).toBe("filtration");
    expect(matchConcept("Coulomb's law force between two charges")?.id).toBe("coulomb-force");
  });
  it("maps non-vector syllabus concepts (for fetch)", () => {
    const heart = matchConcept("the human heart and circulatory system pumps blood");
    expect(heart?.id).toBe("human-heart");
    expect(heart?.hasVector).toBe(false);
    expect(heart?.subject).toBe("Biology");
  });
  it("resolves synonyms to the same concept", () => {
    expect(matchConcept("circulatory system")?.id).toBe("human-heart");
    expect(matchConcept("blood circulation in the heart")?.id).toBe("human-heart");
  });
  it("returns nothing for non-visual text", () => {
    expect(matchConcept("this section is about exam time management tips")).toBeUndefined();
  });

  it("resolves every requested test topic to a concept", () => {
    const topics: [string, string, boolean][] = [
      // heading text, expected id, expected hasVector
      ["The Human Heart pumps blood", "human-heart", false],
      ["Structure of the Human Eye and retina", "human-eye", true],
      ["A simple Electric Circuit with a cell and bulb", "circuit-simple", true],
      ["Plant Cell with cell wall and chloroplasts", "plant-cell", true],
      ["Animal Cell and its organelles", "animal-cell", true],
      ["Filtration separates sand from water", "filtration", true],
      ["Reflection of light and angle of incidence", "reflection-laws", false],
      ["AC Generator / dynamo produces current", "electric-generator", false],
      ["The DNA double helix structure", "dna-helix", true],
      ["Mitosis is a type of cell division", "mitosis", false],
    ];
    for (const [text, id, hasVector] of topics) {
      const r = matchConcept(text);
      expect(r, `topic "${text}" should resolve`).toBeDefined();
      expect(r!.id, `topic "${text}"`).toBe(id);
      expect(r!.hasVector, `topic "${text}" hasVector`).toBe(hasVector);
    }
  });
});
