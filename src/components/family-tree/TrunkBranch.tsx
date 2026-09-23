import { memo } from "react";
import type { BranchPath } from "@/lib/tree/layoutTree";

/** SVG defs: one reusable bark-grain pattern and one soft wood gradient. */
export function TreeArtDefs() {
  return (
    <defs>
      <pattern id="barkTex" width="90" height="90" patternUnits="userSpaceOnUse">
        <path
          d="M0 12 Q 22 8 45 13 T 90 11"
          fill="none"
          stroke="#5c3b1e"
          strokeWidth={2}
          opacity={0.4}
        />
        <path
          d="M0 32 Q 30 27 60 33 T 90 30"
          fill="none"
          stroke="#5c3b1e"
          strokeWidth={2}
          opacity={0.32}
        />
        <path
          d="M0 52 Q 24 48 48 53 T 90 51"
          fill="none"
          stroke="#5c3b1e"
          strokeWidth={2}
          opacity={0.4}
        />
        <path
          d="M0 72 Q 28 68 56 74 T 90 71"
          fill="none"
          stroke="#5c3b1e"
          strokeWidth={2}
          opacity={0.32}
        />
      </pattern>
      <linearGradient id="plaqueGrad" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#b4824e" />
        <stop offset="0.5" stopColor="#9c6b3d" />
        <stop offset="1" stopColor="#7d5330" />
      </linearGradient>
      <linearGradient id="rootGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6e4b2a" />
        <stop offset="1" stopColor="#4a3018" />
      </linearGradient>
      <linearGradient id="twigGrad" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#9a7a50" />
        <stop offset="1" stopColor="#6d4c2f" />
      </linearGradient>
    </defs>
  );
}

const FILLS = {
  bark: "#7a5a38",
  twig: "url(#twigGrad)",
  root: "url(#rootGrad)",
  plaque: "url(#plaqueGrad)",
  soil: "#7e5936",
} as const;

function spinePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

/** The woody scene geometry: trunks, twigs, roots, the grandparents' plaques. */
export const TrunkBranch = memo(function TrunkBranch({ branches }: { branches: BranchPath[] }) {
  return (
    <g>
      <TreeArtDefs />
      {branches.map((b, i) => {
        if (b.fill === "plaque") {
          return (
            <g key={i}>
              <path
                d={b.d}
                fill={FILLS.plaque}
                stroke="#5d3d1f"
                strokeWidth={3}
                strokeLinejoin="round"
                opacity={0.96}
              />
              <path
                d={b.d}
                fill="none"
                stroke="#e7c795"
                strokeWidth={1.5}
                strokeLinejoin="round"
                opacity={0.5}
                transform="translate(0,2)"
              />
            </g>
          );
        }
        if (b.fill === "root" || b.fill === "twig") {
          return (
            <path
              key={i}
              d={b.d}
              fill={FILLS[b.fill]}
              stroke="#3f2a14"
              strokeWidth={1}
              opacity={0.9}
            />
          );
        }
        return (
          <g key={i}>
            <path
              d={b.d}
              fill={FILLS.bark}
              stroke="#4a3018"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <path d={b.d} fill="url(#barkTex)" opacity={0.55} />
            {b.spine && (
              <path
                d={spinePath(b.spine)}
                fill="none"
                stroke="#c9a26b"
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.32}
              />
            )}
          </g>
        );
      })}
    </g>
  );
});
