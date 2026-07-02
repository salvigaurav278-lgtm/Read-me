import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { readImageCache, writeImageCache, deleteImageCache } from "@/lib/generators/imageCache";

export const runtime = "nodejs";

/**
 * Cache actions for a concept id:
 *   approve  — mark a cached (usually fetched) image as approved
 *   reject   — delete the cached image (it will not be used again)
 *   rebuild  — delete so the next PDF re-fetches a fresh image
 */
export async function POST(req: NextRequest) {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  const id = body.id?.trim();
  const action = body.action;
  if (!id || !action) return NextResponse.json({ error: "Missing id/action" }, { status: 400 });

  if (action === "approve") {
    const cur = await readImageCache(id);
    if (!cur) return NextResponse.json({ ok: false, error: "Nothing cached" }, { status: 404 });
    const ok = await writeImageCache(id, cur.buf, { ...cur.meta, approved: true });
    return NextResponse.json({ ok, id, action });
  }

  if (action === "reject" || action === "rebuild") {
    const ok = await deleteImageCache(id);
    return NextResponse.json({ ok, id, action });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
