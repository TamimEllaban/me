import { memo } from "react";
import type { RootsGroup as RootsGroupType } from "@/lib/tree/layoutTree";

/**
 * Under-soil decoration: faint root tendrils + the "الجذور" label chip for
 * each trunk side. The root-knot people themselves are rendered as PersonOrnament
 * nodes by the scene.
 */
export const RootsGroup = memo(function RootsGroup({
  roots,
  night,
}: {
  roots: RootsGroupType[];
  night: boolean;
}) {
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#1d2741" : "#8a6a45"} />
          <stop offset="1" stopColor={night ? "#101a30" : "#6e4b2a"} />
        </linearGradient>
        <linearGradient id="tendrilGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? "#31415f" : "#7d5330"} />
          <stop offset="1" stopColor={night ? "#1c2740" : "#5a3d22"} />
        </linearGradient>
      </defs>
      {roots.map((r, i) => (
        <g key={i}>
          {/* short tendril strokes radiating from the trunk base */}
          {TENDRILS.map((t, j) => (
            <path
              key={j}
              d={`M ${r.base.x} ${r.base.y} Q ${r.base.x + t.half} ${r.base.y + 30} ${r.base.x + t.half * 2 + (i % 2) * 10} ${
                r.base.y + 84 + j * 16
              }`}
              fill="none"
              stroke="url(#tendrilGrad)"
              strokeWidth={6 - j * 0.8}
              strokeLinecap="round"
              opacity={0.75 - j * 0.08}
            />
          ))}
          <text
            x={r.labelPos.x}
            y={r.labelPos.y}
            textAnchor="middle"
            fontSize="22"
            fontWeight={700}
            fontFamily="var(--font-display), serif"
            fill={night ? "#ffe9b8" : "#8b5a2b"}
            style={{ letterSpacing: "2px" }}
          >
            الجذور
          </text>
        </g>
      ))}
      <rect x={0} y={1432} width={1200} height={218} fill="url(#soilGrad)" opacity={0.65} />
    </g>
  );
});

const TENDRILS = [{ half: -70 }, { half: 60 }, { half: -120 }, { half: 110 }];
