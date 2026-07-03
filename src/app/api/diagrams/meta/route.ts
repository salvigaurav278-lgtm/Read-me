import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { matchConcept } from "@/lib/generators/diagramRegistry";
import { readImageCache } from "@/lib/generators/imageCache";

export const runtime = "nodejs";

function kindOf(source: string): "real" | "ai" | "upload" | "other" {
  const s = source.toLowerCase();
  if (s.includes("ai generated")) return "ai";
  if (s.includes("wikimedia") || s.includes("openverse")) return "real";
  if (s.includes("upload")) return "upload";
  return "other";
}

/** Source/provenance of the image currently used for a topic (for the UI badge). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const c = matchConcept(sp.get("text") || "", sp.get("id") || undefined);
  if (!c) return NextResponse.json({ kind: "none" });
  const scope = sp.get("project") || undefined;

  const cached = (scope ? await readImageCache(c.id, scope) : null) ?? (await readImageCache(c.id));
  if (cached) {
    return NextResponse.json({
      kind: kindOf(cached.meta.source),
      source: cached.meta.source,
      license: cached.meta.license,
      approved: cached.meta.approved ?? false,
      scoped: !!scope && !!(await readImageCache(c.id, scope)),
    });
  }
  if (c.hasVector) return NextResponse.json({ kind: "vector", source: "Local vector library", license: "Built-in" });
  return NextResponse.json({ kind: "none" });
}
