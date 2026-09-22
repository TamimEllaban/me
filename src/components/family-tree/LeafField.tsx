import { memo } from "react";
import type { Leaf } from "@/lib/tree/layoutTree";

const SHAPES: Record<1 | 2 | 3, string> = {
  1: "M0 0 C 8 -10 22 -10 30 0 C 22 10 8 10 0 0 Z",
  2: "M2 2 C 12 -6 26 -4 30 6 C 18 12 6 10 2 2 Z",
  3: "M0 0 C 6 -14 24 -14 28 0 C 24 10 6 10 0 0 Z",
};

export const LeafField = memo(function LeafField({
  leaves,
  night,
}: {
  leaves: Leaf[];
  night: boolean;
}) {
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id="leafDad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={night ? "#2e5a2f" : "#8fc677"} />
          <stop offset="1" stopColor={night ? "#1c3a20" : "#5aa04a"} />
        </linearGradient>
        <linearGradient id="leafMom" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={night ? "#54704a" : "#d4c470"} />
          <stop offset="1" stopColor={night ? "#33432e" : "#9cae52"} />
        </linearGradient>
        <linearGradient id="leafStem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={night ? "#3f5c33" : "#a8cf7e"} />
          <stop offset="1" stopColor={night ? "#24401f" : "#6fb05c"} />
        </linearGradient>
      </defs>
      {leaves.map((l, i) => {
        const fill =
          l.side === "dad"
            ? "url(#leafDad)"
            : l.side === "mom"
              ? "url(#leafMom)"
              : "url(#leafStem)";
        return (
          <g
            key={i}
            className="leaf-pop"
            style={{ animationDelay: `${Math.min(i * 14, 900)}ms` }}
            transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.r / 30})`}
            opacity={0.92}
          >
            <path
              d={SHAPES[l.variant]}
              fill={fill}
              stroke="rgba(60,90,40,0.35)"
              strokeWidth={0.8}
            />
            <path d="M2 0 L 26 0" stroke="rgba(60,90,40,0.4)" strokeWidth={1} fill="none" />
          </g>
        );
      })}
    </g>
  );
});
