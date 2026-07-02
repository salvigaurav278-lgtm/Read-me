// Runtime-editable chapter→concept mappings: code defaults merged with admin
// overrides (persisted via configStore). Supports CRUD, JSON/CSV import-export,
// synonym-aware lookup, and coverage statistics.

import {
  DEFAULT_MAPPINGS,
  chapterKey,
  normalizeChapter,
  type ChapterMapping,
} from "./chapterConcepts";
import { readJson, writeJson } from "@/lib/config/configStore";
import { conceptExists } from "@/lib/generators/diagramRegistry";

interface OverrideDoc {
  upserts: Record<string, ChapterMapping>;
  deleted: string[];
}

const STORE_KEY = "chapter-mappings";

async function loadDoc(): Promise<OverrideDoc> {
  return (await readJson<OverrideDoc>(STORE_KEY)) ?? { upserts: {}, deleted: [] };
}
async function saveDoc(doc: OverrideDoc): Promise<boolean> {
  return writeJson(STORE_KEY, doc);
}

function normalizeMapping(raw: Partial<ChapterMapping>): ChapterMapping {
  const classLevel = String(raw.classLevel ?? "").trim();
  const subject = String(raw.subject ?? "").trim();
  const chapter = String(raw.chapter ?? "").trim();
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
  return {
    key: raw.key || chapterKey(classLevel, subject, chapter),
    classLevel,
    subject,
    chapter,
    synonyms: arr(raw.synonyms),
    concepts: arr(raw.concepts),
    keywords: arr(raw.keywords),
    formulas: arr(raw.formulas),
    experiments: arr(raw.experiments),
  };
}

/** Full effective list: defaults minus deletions, overlaid with upserts. */
export async function listMappings(): Promise<ChapterMapping[]> {
  const doc = await loadDoc();
  const map = new Map<string, ChapterMapping>();
  for (const d of DEFAULT_MAPPINGS) map.set(d.key, d);
  for (const k of doc.deleted) map.delete(k);
  for (const [k, v] of Object.entries(doc.upserts)) map.set(k, v);
  return [...map.values()].sort(
    (a, b) =>
      a.classLevel.localeCompare(b.classLevel) ||
      a.subject.localeCompare(b.subject) ||
      a.chapter.localeCompare(b.chapter),
  );
}

/** Synonym-aware lookup used during generation. */
export async function getMapping(
  classLevel: string,
  subject: string,
  chapter: string,
): Promise<ChapterMapping | undefined> {
  const all = await listMappings();
  const nk = normalizeChapter(chapter);
  const exact = all.find((x) => x.key === chapterKey(classLevel, subject, chapter));
  if (exact) return exact;
  const bySubject = all.find(
    (x) =>
      x.subject === subject &&
      (normalizeChapter(x.chapter) === nk || x.synonyms.some((s) => normalizeChapter(s) === nk)),
  );
  if (bySubject) return bySubject;
  return all.find(
    (x) => normalizeChapter(x.chapter) === nk || x.synonyms.some((s) => normalizeChapter(s) === nk),
  );
}

export async function upsertMapping(raw: Partial<ChapterMapping>): Promise<ChapterMapping> {
  const mapping = normalizeMapping(raw);
  const doc = await loadDoc();
  doc.upserts[mapping.key] = mapping;
  doc.deleted = doc.deleted.filter((k) => k !== mapping.key);
  await saveDoc(doc);
  return mapping;
}

export async function deleteMapping(key: string): Promise<void> {
  const doc = await loadDoc();
  delete doc.upserts[key];
  if (DEFAULT_MAPPINGS.some((d) => d.key === key) && !doc.deleted.includes(key)) {
    doc.deleted.push(key);
  }
  await saveDoc(doc);
}

export async function importMappings(
  items: Partial<ChapterMapping>[],
  mode: "merge" | "replace",
): Promise<number> {
  const doc: OverrideDoc = mode === "replace" ? { upserts: {}, deleted: [] } : await loadDoc();
  let n = 0;
  for (const raw of items) {
    const mp = normalizeMapping(raw);
    if (!mp.classLevel || !mp.subject || !mp.chapter) continue;
    doc.upserts[mp.key] = mp;
    doc.deleted = doc.deleted.filter((k) => k !== mp.key);
    n += 1;
  }
  await saveDoc(doc);
  return n;
}

// ── CSV ──────────────────────────────────────────────────────────────────
const CSV_COLS = ["classLevel", "subject", "chapter", "synonyms", "concepts", "keywords", "formulas", "experiments"] as const;

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(items: ChapterMapping[]): string {
  const rows = [CSV_COLS.join(",")];
  for (const m of items) {
    rows.push(
      [
        m.classLevel,
        m.subject,
        m.chapter,
        m.synonyms.join("|"),
        m.concepts.join("|"),
        m.keywords.join("|"),
        m.formulas.join("|"),
        m.experiments.join("|"),
      ]
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

// ── stats ──────────────────────────────────────────────────────────────────
export interface MappingStats {
  totals: { chapters: number; concepts: number; missingDiagrams: number; chaptersWithoutConcepts: number };
  bySubject: { subject: string; chapters: number; concepts: number; missingDiagrams: number }[];
  missingDiagramIds: string[];
  chaptersWithoutConcepts: { key: string; classLevel: string; subject: string; chapter: string }[];
}

export async function mappingStats(): Promise<MappingStats> {
  const all = await listMappings();
  const bySubject = new Map<string, { subject: string; chapters: number; concepts: number; missingDiagrams: number }>();
  const missing = new Set<string>();
  const noConcepts: MappingStats["chaptersWithoutConcepts"] = [];
  let concepts = 0;

  for (const mp of all) {
    const row = bySubject.get(mp.subject) ?? { subject: mp.subject, chapters: 0, concepts: 0, missingDiagrams: 0 };
    row.chapters += 1;
    row.concepts += mp.concepts.length;
    concepts += mp.concepts.length;
    for (const c of mp.concepts) if (!conceptExists(c)) { missing.add(c); row.missingDiagrams += 1; }
    if (mp.concepts.length === 0) noConcepts.push({ key: mp.key, classLevel: mp.classLevel, subject: mp.subject, chapter: mp.chapter });
    bySubject.set(mp.subject, row);
  }

  return {
    totals: { chapters: all.length, concepts, missingDiagrams: missing.size, chaptersWithoutConcepts: noConcepts.length },
    bySubject: [...bySubject.values()].sort((a, b) => a.subject.localeCompare(b.subject)),
    missingDiagramIds: [...missing].sort(),
    chaptersWithoutConcepts: noConcepts,
  };
}
