"use client";

import { useEffect, useRef, useState } from "react";
import type { GeneratedContent } from "@/lib/ai/schemas";
import { toMindMap, MINDMAP_COLORS, MINDMAP_CENTRAL } from "@/lib/mindmap";

// Fixed drawing canvas; scaled down to fit the container width so the whole
// map is visible on any screen (no overlap, no horizontal scrolling).
const W = 1060;
const H = 860;
const CX = W / 2;
const CY = H / 2;
const RX = 372;
const RY = 336;

/** Radial mind map: central topic in the middle, colored branch cards around it
 * with their sub-nodes, connected by curved lines. Matches the reference look. */
export function MindMap({ content }: { content: GeneratedContent }) {
  const { central, branches } = toMindMap(content);
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!branches.length) return null;

  const n = branches.length;
  const nodes = branches.map((b, i) => {
    const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
    return {
      ...b,
      x: CX + RX * Math.cos(angle),
      y: CY + RY * Math.sin(angle),
      color: MINDMAP_COLORS[i % MINDMAP_COLORS.length],
    };
  });

  return (
    <div ref={ref} className="w-full">
      {/* Reserve the *scaled* footprint — transform:scale doesn't shrink the
          layout box, so without this the 1060px canvas overflows and clips. */}
      <div
        style={{ width: W * scale, height: H * scale }}
        className="mx-auto overflow-hidden"
      >
        <div
          className="relative origin-top-left"
          style={{ width: W, height: H, transform: `scale(${scale})` }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0" aria-hidden>
            {nodes.map((node, i) => {
              const mx = (CX + node.x) / 2;
              return (
                <path
                  key={i}
                  d={`M ${CX} ${CY} C ${mx} ${CY}, ${mx} ${node.y}, ${node.x} ${node.y}`}
                  fill="none"
                  stroke={node.color.line}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Central node */}
          <div
            className="absolute flex max-w-[240px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl px-6 py-5 text-center text-xl font-extrabold shadow-lg"
            style={{ left: CX, top: CY, background: MINDMAP_CENTRAL.bg, color: MINDMAP_CENTRAL.text }}
          >
            {central}
          </div>

          {/* Branch nodes */}
          {nodes.map((node, i) => (
            <div
              key={i}
              className="absolute w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-xl px-3.5 py-2.5 shadow-md"
              style={{ left: node.x, top: node.y, background: node.color.bg, color: node.color.text }}
            >
              <p className="text-center text-[15px] font-bold leading-tight">{node.label}</p>
              {node.items.length > 0 && (
                <ul className="mt-2 space-y-1 text-[12.5px] font-medium leading-snug">
                  {node.items.map((it, j) => (
                    <li key={j} className="flex gap-1.5">
                      <span className="opacity-60">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              )}
              {node.formulas.length > 0 && (
                <div className="mt-2 space-y-1">
                  {node.formulas.map((f, k) => (
                    <p
                      key={k}
                      className="rounded-md bg-white/45 px-1.5 py-0.5 text-center font-mono text-[12px] font-semibold"
                    >
                      {f}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
