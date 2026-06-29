import { describe, it, expect } from "vitest";
import { typeFromSlug, defaultParams, CONTENT_TYPE_LIST } from "@/lib/content-types";
import { shapeForType } from "@/lib/ai/schemas";
import { buildPrompt } from "@/lib/ai/prompts";
import { mockContent } from "@/lib/ai/mock";
import { generatedContentSchema } from "@/lib/ai/schemas";
import { SUBJECTS_BY_CLASS } from "@/lib/curriculum";

describe("content-type registry", () => {
  it("maps every slug back to its type", () => {
    for (const c of CONTENT_TYPE_LIST) {
      expect(typeFromSlug(c.slug)).toBe(c.type);
    }
  });

  it("returns undefined for unknown slugs", () => {
    expect(typeFromSlug("nope")).toBeUndefined();
  });

  it("builds default params for every field", () => {
    for (const c of CONTENT_TYPE_LIST) {
      const p = defaultParams(c.type);
      for (const f of c.fields) expect(p[f.key]).toBe(f.default);
    }
  });
});

describe("content shapes", () => {
  it("classifies PPT as a deck and TEST as a paper", () => {
    expect(shapeForType("PPT")).toBe("deck");
    expect(shapeForType("TEST")).toBe("paper");
    expect(shapeForType("NOTES")).toBe("document");
  });
});

describe("prompt builder", () => {
  it("includes class, subject and a JSON-only instruction", () => {
    const { system, user } = buildPrompt({
      type: "NOTES",
      classLevel: "CLASS_10",
      subject: "MATHEMATICS",
      chapter: "Real Numbers",
      topic: null,
      params: defaultParams("NOTES"),
    });
    expect(system).toContain("Class 10");
    expect(system).toContain("Mathematics");
    expect(system.toLowerCase()).toContain("json");
    expect(user).toContain("Real Numbers");
  });
});

describe("mock content validates against the schema", () => {
  it("produces valid content for every type", () => {
    for (const c of CONTENT_TYPE_LIST) {
      const cls = "CLASS_11" as const;
      const subject = SUBJECTS_BY_CLASS[cls][0];
      const content = mockContent({
        type: c.type,
        classLevel: cls,
        subject,
        chapter: "Sample",
        topic: null,
        params: defaultParams(c.type),
      });
      expect(generatedContentSchema.safeParse(content).success).toBe(true);
    }
  });
});
