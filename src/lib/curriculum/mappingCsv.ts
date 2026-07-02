// CSV (de)serialisation for chapter mappings — shared by the store, the
// import/export route, and the bundled bulk dataset.

import type { ChapterMapping } from "./chapterConcepts";

const CSV_COLS = ["classLevel", "subject", "chapter", "synonyms", "concepts", "keywords", "formulas", "experiments"] as const;

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(items: ChapterMapping[]): string {
  const rows = [CSV_COLS.join(",")];
  for (const m of items) {
    rows.push(
      [m.classLevel, m.subject, m.chapter, m.synonyms.join("|"), m.concepts.join("|"), m.keywords.join("|"), m.formulas.join("|"), m.experiments.join("|")]
        .map((c) => csvEscape(String(c)))
        .join(","),
    );
  }
  return rows.join("\n");
}

/** Minimal RFC-4180-ish CSV parser (handles quotes and embedded commas). */
export function parseCsv(text: string): Partial<ChapterMapping>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); if (row.some((x) => x !== "")) rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const listAt = (r: string[], name: string) => (r[idx(name)] ?? "").split("|").map((s) => s.trim()).filter(Boolean);
  return rows.slice(1).map((r) => ({
    classLevel: r[idx("classLevel")]?.trim() ?? "",
    subject: r[idx("subject")]?.trim() ?? "",
    chapter: r[idx("chapter")]?.trim() ?? "",
    synonyms: listAt(r, "synonyms"),
    concepts: listAt(r, "concepts"),
    keywords: listAt(r, "keywords"),
    formulas: listAt(r, "formulas"),
    experiments: listAt(r, "experiments"),
  }));
}
