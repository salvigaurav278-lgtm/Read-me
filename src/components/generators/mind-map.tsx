import type { GeneratedContent } from "@/lib/ai/schemas";
import {
  toMindMap,
  MINDMAP_COLORS,
  MINDMAP_CENTRAL,
} from "@/lib/mindmap";

// Fixed drawing canvas; the outer wrapper scrolls on narrow screens.
const W = 760;
const H = 600;
const CX = W / 2;
const CY = H / 2;
const RX = 250;
const RY = 215;

/** Radial mind map: central topic in the middle, colored branch cards around it
 * with their sub-nodes, connected by curved lines. Matches the reference look. */
export function MindMap({ content }: { content: GeneratedContent }) {
  const { central, branches } = toMindMap(content);

  if (!branches.length) return null;

  const n = branches.length;
  const nodes = branches.map((b, i) => {
    // Start at the top and go clockwise.
    const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
    const x = CX + RX * Math.cos(angle);
    const y = CY + RY * Math.sin(angle);
    return { ...b, x, y, color: MINDMAP_COLORS[i % MINDMAP_COLORS.length] };
  });

  return (
    <div className="overflow-x-auto">
      <div className="relative mx-auto" style={{ width: W, height: H }}>
        {/* Connector lines behind the nodes */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="absolute inset-0"
          aria-hidden
        >
          {nodes.map((node, i) => {
            const mx = (CX + node.x) / 2;
            return (
              <path
                key={i}
                d={`M ${CX} ${CY} C ${mx} ${CY}, ${mx} ${node.y}, ${node.x} ${node.y}`}
                fill="none"
                stroke={node.color.line}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Central node */}
        <div
          className="absolute flex max-w-[190px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl px-5 py-4 text-center text-base font-extrabold shadow-lg"
          style={{ left: CX, top: CY, background: MINDMAP_CENTRAL.bg, color: MINDMAP_CENTRAL.text }}
        >
          {central}
        </div>

        {/* Branch nodes */}
        {nodes.map((node, i) => (
          <div
            key={i}
            className="absolute w-[168px] -translate-x-1/2 -translate-y-1/2 rounded-xl px-3 py-2 shadow-md"
            style={{ left: node.x, top: node.y, background: node.color.bg, color: node.color.text }}
          >
            <p className="text-center text-sm font-bold leading-tight">{node.label}</p>
            {node.items.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-[11px] font-medium leading-snug">
                {node.items.map((it, j) => (
                  <li key={j} className="flex gap-1">
                    <span className="opacity-70">•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
