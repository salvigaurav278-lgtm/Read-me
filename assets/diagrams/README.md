# Drop-in diagram assets

The PDF export ships a built-in **vector** diagram library (see
`src/lib/generators/diagrams.ts`) that is drawn with pdf-lib — print quality,
offline, no licensing concerns. This folder lets you **override or add** a
diagram without touching code.

## How to add / replace a diagram image

1. Drop a **PNG** file here named exactly after the diagram id:

       assets/diagrams/filtration.png
       assets/diagrams/human-eye.png

   (Use a transparent background, ≥1200 px wide, no watermark. Only
   public-domain / your own artwork — never copyrighted textbook scans.)

2. That's it. On the next PDF export the renderer embeds the PNG (scaled to
   fit the card, aspect-ratio preserved) instead of the built-in vector.

The list of ids is the keys of `CATALOG` in `src/lib/generators/diagrams.ts`
and is surfaced per subject via `diagramsBySubject()` in `diagramRegistry.ts`.

To add a brand-new concept id, either drop `<new-id>.png` here and reference it
from content as `diagramId: "<new-id>"`, or add a vector `Draw` function to the
CATALOG. Synonyms for automatic matching live in `diagramRegistry.ts`.

> Note: SVG is not embedded directly (pdf-lib has no full SVG renderer). Export
> SVGs to PNG at high resolution before dropping them here.
