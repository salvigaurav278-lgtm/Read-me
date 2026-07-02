import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listMappings, upsertMapping, deleteMapping, mappingStats } from "@/lib/curriculum/mappingStore";

export const runtime = "nodejs";

export async function GET() {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const [mappings, stats] = await Promise.all([listMappings(), mappingStats()]);
  return NextResponse.json({ mappings, stats });
}

export async function POST(req: NextRequest) {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const body = await req.json().catch(() => null);
  if (!body?.classLevel || !body?.subject || !body?.chapter) {
    return NextResponse.json({ error: "classLevel, subject and chapter are required" }, { status: 400 });
  }
  const saved = await upsertMapping(body);
  return NextResponse.json({ ok: true, mapping: saved });
}

export async function DELETE(req: NextRequest) {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  await deleteMapping(key);
  return NextResponse.json({ ok: true });
}
