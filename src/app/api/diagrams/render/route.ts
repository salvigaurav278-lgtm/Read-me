import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { matchConcept } from "@/lib/generators/diagramRegistry";
import { acquireImage } from "@/lib/generators/imageSources";
import { renderDiagramSvg } from "@/lib/generators/svgDiagram";

export const runtime = "nodejs";

/**
 * Render the diagram for a topic as a web image — used inline in the preview.
 * Resolves the concept from `text` (+ optional `id`), then returns:
 *   - a cached/admin/uploaded/fetched raster (PNG/JPEG), or
 *   - the built-in vector as inline SVG, or
 *   - 404 when nothing relevant exists.
 * Missing raster concepts are fetched automatically when fetching is enabled.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const id = sp.get("id") || undefined;
  const text = sp.get("text") || "";
  const scope = sp.get("project") || undefined;
  const c = matchConcept(text, id);
  if (!c) return NextResponse.json({ error: "No diagram" }, { status: 404 });

  const got = await acquireImage(c.id, c.query, { allowFetch: !c.hasVector, scope });
  if (got) {
    return new NextResponse(new Uint8Array(got.buf), {
      headers: { "content-type": got.mime, "cache-control": "private, max-age=120" },
    });
  }
  if (c.hasVector) {
    return new NextResponse(renderDiagramSvg(c.id), {
      headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "private, max-age=120" },
    });
  }
  return NextResponse.json({ error: "No image available" }, { status: 404 });
}
