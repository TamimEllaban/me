import { memo } from "react";
import type { Couple } from "@/lib/tree/layoutTree";

/** Tiny ♥ knot between two ornaments of a joined couple. */
export const CoupleOrnament = memo(function CoupleOrnament({
  couple,
  grown,
  growIndex,
}: {
  couple: Couple;
  grown: boolean;
  growIndex: number;
}) {
  return (
    <span
      className="ornament-wob pointer-events-none absolute z-[3] grid place-items-center rounded-full"
      style={{
        left: `${couple.x}px`,
        top: `${couple.y}px`,
        transform: `translate(-50%, -50%) scale(${grown ? 1 : 0})`,
        opacity: grown ? 1 : 0,
        transitionProperty: "transform, opacity",
        transitionDuration: "0.4s",
        transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)",
        transitionDelay: grown ? `${Math.min(growIndex * 0.028, 1.2) + 0.15}s` : "0s",
      }}
      aria-hidden="true"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-[11px] leading-none text-white shadow-[0_3px_7px_rgba(190,30,30,0.4)] ring-1 ring-white/70">
        ♥
      </span>
    </span>
  );
});
