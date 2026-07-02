import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { matchConcept } from "@/lib/generators/diagramRegistry";
import {
  readImageCache,
  writeImageCache,
  deleteImageCache,
} from "@/lib/generators/imageCache";
import { fetchImageForQuery } from "@/lib/generators/imageSources";
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

  // ── multipart: Replace / Upload a custom image (per-project override) ──
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const id = resolveId((form.get("id") as string) || undefined, (form.get("text") as string) || undefined);
    const scope = (form.get("project") as string) || undefined;
    const file = form.getAll("files").find((f): f is File => f instanceof File);
    if (!id || !file) return NextResponse.json({ error: "Missing id/file" }, { status: 400 });
    const opt = await optimizeForPdf(Buffer.from(await file.arrayBuffer()));
    if (!opt) return NextResponse.json({ error: "Could not process image" }, { status: 400 });
    const ok = await writeImageCache(
      id,
      opt.buf,
      {
        source: "Teacher upload",
        license: "Provided by teacher",
        sourceUrl: "teacher-upload",
        width: opt.width,
        height: opt.height,
        mime: "image/png",
        fetchedAt: new Date().toISOString(),
        approved: true,
      },
      scope,
    );
    return NextResponse.json({ ok, id });
  }

  // ── json: regenerate / search / approve / reject (per-project override) ──
  const body = (await req.json().catch(() => ({}))) as {
    id?: string; text?: string; action?: string; query?: string; project?: string;
  };
  const id = resolveId(body.id, body.text);
  const scope = body.project || undefined;
  if (!id || !body.action) return NextResponse.json({ error: "Missing id/action" }, { status: 400 });
  const c = matchConcept(body.text ?? "", id);

  switch (body.action) {
    case "reject": {
      // Remove the project override → reverts to the shared/vector default.
      const ok = await deleteImageCache(id, scope);
      return NextResponse.json({ ok, id });
    }
    case "regenerate": {
      // Fetch a fresh image and store it as this project's override.
      await deleteImageCache(id, scope);
      const fetched = c && !c.hasVector ? await fetchImageForQuery(c.query) : null;
      if (fetched) await writeImageCache(id, fetched.buf, fetched.meta, scope);
      return NextResponse.json({ ok: true, id, refetched: !!fetched });
    }
    case "search": {
      if (!body.query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
      const fetched = await fetchImageForQuery(body.query);
      if (!fetched) return NextResponse.json({ ok: false, error: "No suitable image found" }, { status: 404 });
      await writeImageCache(id, fetched.buf, fetched.meta, scope);
      return NextResponse.json({ ok: true, id, source: fetched.meta.source, license: fetched.meta.license });
    }
    case "approve": {
      const cur = (await readImageCache(id, scope)) ?? (await readImageCache(id));
      if (!cur) return NextResponse.json({ ok: false, error: "Nothing cached" }, { status: 404 });
      const ok = await writeImageCache(id, cur.buf, { ...cur.meta, approved: true }, scope);
      return NextResponse.json({ ok, id });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
