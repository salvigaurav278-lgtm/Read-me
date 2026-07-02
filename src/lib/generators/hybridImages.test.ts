import { describe, it, expect } from "vitest";
import { validateImage, imageSize } from "./imageQuality";
import { isAllowedLicense, buildQuery, fetchEnabled } from "./imageSources";
import { matchConcept } from "./diagramRegistry";
import { matchDiagram } from "./diagramRegistry";

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
});
