// Shared shape + palette for the radial mind-map renderers (web preview + PDF).
// Mind maps are generated as `document` content: the title is the central topic
// and each section is a branch whose `body` items are its sub-nodes.

import type { GeneratedContent } from "@/lib/ai/schemas";

export interface MindMapBranch {
  label: string;
  items: string[];
}

export interface MindMapModel {
  central: string;
  branches: MindMapBranch[];
}

/** Vibrant branch palette (node background + readable text), mirroring the
 * colourful reference. Index by branch order, wrapping around. */
export const MINDMAP_COLORS: { bg: string; text: string; line: string }[] = [
  { bg: "#F472B6", text: "#500724", line: "#EC4899" }, // pink
  { bg: "#34D399", text: "#053B2B", line: "#10B981" }, // green
  { bg: "#FB923C", text: "#4A1D02", line: "#F97316" }, // orange
  { bg: "#A78BFA", text: "#2E1065", line: "#8B5CF6" }, // purple
  { bg: "#22D3EE", text: "#083344", line: "#06B6D4" }, // teal
  { bg: "#FBBF24", text: "#4A2C02", line: "#F59E0B" }, // amber
  { bg: "#F87171", text: "#4C0519", line: "#EF4444" }, // red
  { bg: "#60A5FA", text: "#0A2540", line: "#3B82F6" }, // blue
];

export const MINDMAP_CENTRAL = { bg: "#4F46E5", text: "#FFFFFF" };

/** Max branches to lay out radially before it gets too crowded. */
export const MINDMAP_MAX_BRANCHES = 8;
/** Max sub-nodes shown per branch, and max characters each, so nodes stay small
 * and never overlap even when the AI returns verbose phrases. */
export const MINDMAP_MAX_ITEMS = 4;
const MAX_ITEM_CHARS = 46;

/** Shorten a sub-node to a compact label: drop trailing parenthetical detail and
 * clamp length, so cards read like the keyword-style reference. */
function shorten(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  // Prefer the part before a colon/dash/parenthesis (usually the key term).
  const cut = t.search(/[(:–—-]/);
  if (cut > 12) t = t.slice(0, cut).trim();
  if (t.length > MAX_ITEM_CHARS) t = t.slice(0, MAX_ITEM_CHARS - 1).trimEnd() + "…";
  return t;
}

/** Build the mind-map model from generated `document` content. */
export function toMindMap(content: GeneratedContent, fallbackTitle = "Mind Map"): MindMapModel {
  const central = (content.title || fallbackTitle).trim();
  const branches: MindMapBranch[] =
    content.kind === "document"
      ? content.sections
          .map((s) => ({
            label: (s.heading || "").replace(/\s+/g, " ").trim(),
            items: (s.body ?? [])
              .map((b) => shorten(b))
              .filter(Boolean)
              .slice(0, MINDMAP_MAX_ITEMS),
          }))
          .filter((b) => b.label)
          .slice(0, MINDMAP_MAX_BRANCHES)
      : [];
  return { central, branches };
}
