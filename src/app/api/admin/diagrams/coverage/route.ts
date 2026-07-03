import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { allConcepts, type Subject } from "@/lib/generators/diagramRegistry";
import { listCachedIds, listCachedMeta, blobConfigured } from "@/lib/generators/imageCache";
import { fetchEnabled } from "@/lib/generators/imageSources";
import { genProvider } from "@/lib/generators/imageGenerate";

function sourceKind(source: string): "real" | "ai" | "upload" | "other" {
  const s = source.toLowerCase();
  if (s.includes("ai generated")) return "ai";
  if (s.includes("wikimedia") || s.includes("openverse")) return "real";
  if (s.includes("upload")) return "upload";
  return "other";
}

export async function GET() {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const concepts = allConcepts();
  const cached = await listCachedIds();
  const metas = await listCachedMeta();
  const sources = { vector: concepts.filter((c) => c.hasVector).length, real: 0, ai: 0, upload: 0, other: 0, cached: metas.length };
  for (const m of metas) sources[sourceKind(m.source)] += 1;

  type Row = { subject: Subject; total: number; vector: number; cached: number; missing: number };
  const bySubject = new Map<Subject, Row>();
  const missing: { id: string; label: string; subject: Subject }[] = [];

  for (const c of concepts) {
    const row = bySubject.get(c.subject) ?? { subject: c.subject, total: 0, vector: 0, cached: 0, missing: 0 };
    row.total += 1;
    const isCached = cached.has(c.id);
    if (c.hasVector) row.vector += 1;
    if (isCached) row.cached += 1;
    // "missing" = no built-in vector and nothing cached yet
    if (!c.hasVector && !isCached) {
      row.missing += 1;
      missing.push({ id: c.id, label: c.label, subject: c.subject });
    }
    bySubject.set(c.subject, row);
  }

  const subjects = [...bySubject.values()].sort((a, b) => a.subject.localeCompare(b.subject));
  const totals = subjects.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      vector: acc.vector + r.vector,
      cached: acc.cached + r.cached,
      missing: acc.missing + r.missing,
    }),
    { total: 0, vector: 0, cached: 0, missing: 0 },
  );

  return NextResponse.json({
    subjects,
    totals,
    missing,
    sources,
    generator: genProvider(),
    fetchEnabled: fetchEnabled(),
    blobConfigured: blobConfigured(),
  });
}
