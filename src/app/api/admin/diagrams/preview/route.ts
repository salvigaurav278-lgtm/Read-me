import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { conceptInfo } from "@/lib/generators/diagramRegistry";
import { renderExport } from "@/lib/generators";
import type { GeneratedContent } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Render a single-card PDF for a concept, exactly as it appears in a real
 * export — so admins preview the actual selected diagram. `?id=` is the concept
 * id; `?topic=` is optional display text.
 */
export async function GET(req: NextRequest) {
  const g = await requireAdmin();
  if (!g.ok) return NextResponse.json({ error: g.error }, { status: g.status });

  const id = (req.nextUrl.searchParams.get("id") || "").trim();
  const topic = (req.nextUrl.searchParams.get("topic") || "").trim();
  const info = id ? conceptInfo(id) : undefined;
  const label = topic || info?.label || id || "Diagram preview";

  // Text strongly biases matchConcept to this concept; a vector id is also
  // honored directly via diagramId.
  const bodyHint = info?.synonyms?.[0] ?? label;
  const content: GeneratedContent = {
    kind: "document",
    title: label,
    sections: [
      {
        heading: label,
        body: [`Preview of the selected diagram for “${bodyHint}”, exactly as it appears in the PDF.`],
        diagramId: info?.hasVector ? id : undefined,
      },
    ],
  };

  try {
    const buf = await renderExport("PDF", content, {
      className: "Preview",
      subject: info?.subject,
      chapter: label,
    });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="preview-${id || "diagram"}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}
