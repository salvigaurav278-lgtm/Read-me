import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { matchConcept } from "@/lib/generators/diagramRegistry";
import {
  readImageCache,
  writeImageCache,
  deleteImageCache,
} from "@/lib/generators/imageCache";
import { acquireImage, fetchImageForQuery } from "@/lib/generators/imageSources";
import { optimizeForPdf } from "@/lib/generators/imageOptimize";

export const runtime = "nodejs";
export const maxDuration = 60;

// Teachers (and admins) can manage the image for any topic in their content.
async function requireTeacher() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, status: 401 as const };
  const role = session.user.role;
  if (role !== "TEACHER" && role !== "ADMIN") return { ok: false as const, status: 403 as const };
  return { ok: true as const };
}

/** Resolve the concept id for a topic (explicit id wins, else semantic). */
function resolveId(id: string | undefined, text: string | undefined): string | undefined {
  if (id) return id;
  const c = matchConcept(text ?? "");
  return c?.id;
}

export async function POST(req: NextRequest) {
  const g = await requireTeacher();
  if (!g.ok) return NextResponse.json({ error: g.status === 401 ? "Unauthorized" : "Forbidden" }, { status: g.status });

  const ct = req.headers.get("content-type") || "";

  // ── multipart: Replace / Upload a custom image ──
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const id = resolveId((form.get("id") as string) || undefined, (form.get("text") as string) || undefined);
    const file = form.getAll("files").find((f): f is File => f instanceof File);
    if (!id || !file) return NextResponse.json({ error: "Missing id/file" }, { status: 400 });
    const opt = await optimizeForPdf(Buffer.from(await file.arrayBuffer()));
    if (!opt) return NextResponse.json({ error: "Could not process image" }, { status: 400 });
    const ok = await writeImageCache(id, opt.buf, {
      source: "Teacher upload",
      license: "Provided by teacher",
      sourceUrl: "teacher-upload",
      width: opt.width,
      height: opt.height,
      mime: "image/png",
      fetchedAt: new Date().toISOString(),
      approved: true,
    });
    return NextResponse.json({ ok, id });
  }

  // ── json: regenerate / search / approve / reject ──
  const body = (await req.json().catch(() => ({}))) as { id?: string; text?: string; action?: string; query?: string };
  const id = resolveId(body.id, body.text);
  if (!id || !body.action) return NextResponse.json({ error: "Missing id/action" }, { status: 400 });
  const c = matchConcept(body.text ?? "", id);

  switch (body.action) {
    case "reject": {
      const ok = await deleteImageCache(id);
      return NextResponse.json({ ok, id });
    }
    case "regenerate": {
      // Drop any cached image and fetch a fresh one (for fetch-backed concepts).
      await deleteImageCache(id);
      const got = c && !c.hasVector ? await acquireImage(id, c.query, { allowFetch: true }) : null;
      return NextResponse.json({ ok: true, id, refetched: !!got });
    }
    case "search": {
      if (!body.query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
      const fetched = await fetchImageForQuery(body.query);
      if (!fetched) return NextResponse.json({ ok: false, error: "No suitable image found" }, { status: 404 });
      await writeImageCache(id, fetched.buf, fetched.meta);
      return NextResponse.json({ ok: true, id, source: fetched.meta.source, license: fetched.meta.license });
    }
    case "approve": {
      const cur = await readImageCache(id);
      if (!cur) return NextResponse.json({ ok: false, error: "Nothing cached" }, { status: 404 });
      const ok = await writeImageCache(id, cur.buf, { ...cur.meta, approved: true });
      return NextResponse.json({ ok, id });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
