import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { matchConcept, conceptInfo } from "@/lib/generators/diagramRegistry";
import { readImageCache } from "@/lib/generators/imageCache";
import { readPngAsset } from "@/lib/generators/diagramRegistry";
import { fetchEnabled } from "@/lib/generators/imageSources";

export async function GET(req: NextRequest) {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const topic = (req.nextUrl.searchParams.get("topic") || "").trim();
  if (!topic) return NextResponse.json({ error: "Missing topic" }, { status: 400 });

  const c = matchConcept(topic);
  if (!c) {
    return NextResponse.json({ resolved: false, topic, fetchEnabled: fetchEnabled() });
  }

  const cached = await readImageCache(c.id);
  const info = conceptInfo(c.id);
  const hasAsset = !!readPngAsset(c.id);

  let source: string;
  let cacheStatus: "cached" | "asset-override" | "vector" | "missing";
  let license = "";
  let sourceUrl = "";
  let dimensions = "";
  let approved: boolean | undefined;

  if (cached) {
    source = cached.meta.source;
    license = cached.meta.license;
    sourceUrl = cached.meta.sourceUrl;
    dimensions = `${cached.meta.width}×${cached.meta.height}`;
    approved = cached.meta.approved;
    cacheStatus = "cached";
  } else if (c.hasVector && hasAsset) {
    source = "Drop-in asset (assets/diagrams)";
    license = "Provided by admin";
    cacheStatus = "asset-override";
  } else if (c.hasVector) {
    source = "Local vector library";
    license = "Built-in (Real Pathshala)";
    cacheStatus = "vector";
  } else {
    source = fetchEnabled() ? "Will fetch on next use" : "None (fetching disabled)";
    cacheStatus = "missing";
  }

  return NextResponse.json({
    resolved: true,
    topic,
    id: c.id,
    label: info?.label ?? c.id,
    subject: c.subject,
    hasVector: c.hasVector,
    query: c.query,
    source,
    license,
    sourceUrl,
    dimensions,
    approved,
    cacheStatus,
    fetchEnabled: fetchEnabled(),
  });
}
