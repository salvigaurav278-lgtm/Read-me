import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { listMappings, importMappings, toCsv, parseCsv } from "@/lib/curriculum/mappingStore";

export const runtime = "nodejs";

// Export: GET ?format=json|csv
export async function GET(req: NextRequest) {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const format = (req.nextUrl.searchParams.get("format") || "json").toLowerCase();
  const mappings = await listMappings();
  if (format === "csv") {
    return new NextResponse(toCsv(mappings), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="chapter-mappings.csv"',
      },
    });
  }
  return new NextResponse(JSON.stringify(mappings, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="chapter-mappings.json"',
    },
  });
}

// Import: POST { format: "json"|"csv", data: string, mode: "merge"|"replace" }
export async function POST(req: NextRequest) {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });
  const body = (await req.json().catch(() => null)) as
    | { format?: string; data?: string; mode?: "merge" | "replace" }
    | null;
  if (!body?.data) return NextResponse.json({ error: "Missing data" }, { status: 400 });
  const mode = body.mode === "replace" ? "replace" : "merge";
  try {
    let items;
    if ((body.format || "json").toLowerCase() === "csv") {
      items = parseCsv(body.data);
    } else {
      const parsed = JSON.parse(body.data);
      items = Array.isArray(parsed) ? parsed : parsed.mappings ?? [];
    }
    const count = await importMappings(items, mode);
    return NextResponse.json({ ok: true, imported: count, mode });
  } catch (e) {
    return NextResponse.json({ error: `Import failed: ${(e as Error).message}` }, { status: 400 });
  }
}
