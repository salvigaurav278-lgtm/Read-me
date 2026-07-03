import { describe, it, expect } from "vitest";
import { buildPrompt, noteStyleAllowsDiagrams, normalizeNoteStyle } from "./prompts";

function notesPrompt(style: string): string {
  return buildPrompt({
    type: "NOTES", classLevel: "CLASS_10", subject: "PHYSICS", chapter: "Electricity", topic: null, params: { style },
  }).user;
}

describe("note styles", () => {
  it("normalises style values", () => {
    expect(normalizeNoteStyle("short")).toBe("SHORT");
    expect(normalizeNoteStyle("One-Shot")).toBe("ONE_SHOT");
    expect(normalizeNoteStyle("FORMULA")).toBe("FORMULA_SHEET");
    expect(normalizeNoteStyle(undefined)).toBe("DETAILED");
  });

  it("produces a distinct prompt per style", () => {
    expect(notesPrompt("SHORT")).toContain("SHORT NOTES");
    expect(notesPrompt("DETAILED")).toContain("DETAILED, comprehensive");
    expect(notesPrompt("REVISION")).toContain("REVISION NOTES");
    const one = notesPrompt("ONE_SHOT");
    expect(one).toContain("ONE-SHOT NOTES");
    expect(one).toContain("Quick Recap");
    const formula = notesPrompt("FORMULA_SHEET");
    expect(formula).toContain("FORMULA SHEET");
    expect(formula).toContain("empty array");
  });

  it("gives different output for different styles", () => {
    const styles = ["SHORT", "DETAILED", "REVISION", "ONE_SHOT", "FORMULA_SHEET"];
    const prompts = styles.map(notesPrompt);
    expect(new Set(prompts).size).toBe(styles.length); // all unique
  });

  it("Formula Sheet and Short omit diagram options", () => {
    expect(notesPrompt("FORMULA_SHEET")).not.toContain("what it shows");
    expect(notesPrompt("SHORT")).not.toContain("what it shows");
    expect(notesPrompt("DETAILED")).toContain("what it shows"); // detailed lists diagrams
  });

  it("gates diagrams by style", () => {
    expect(noteStyleAllowsDiagrams("DETAILED")).toBe(true);
    expect(noteStyleAllowsDiagrams("ONE_SHOT")).toBe(true);
    expect(noteStyleAllowsDiagrams("SHORT")).toBe(false);
    expect(noteStyleAllowsDiagrams("REVISION")).toBe(false);
    expect(noteStyleAllowsDiagrams("FORMULA_SHEET")).toBe(false);
  });
});
