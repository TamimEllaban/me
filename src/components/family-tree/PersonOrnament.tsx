import { memo, type CSSProperties } from "react";
import type { TreeNode } from "@/lib/tree/layoutTree";

const RING: Record<string, string> = {
  gold: "from-amber-200 to-amber-700",
  dad: "from-rose-300 to-rose-700",
  mom: "from-amber-200 to-amber-600",
};

/**
 * A single "hanging ornament": circular photo in a thin gold/wood ring,
 * hanging from the branch by a short curved string, with a name ribbon tag
 * and a relation label underneath. Falls back to an initial-letter leaf badge
 * when the person has no unique photo.
 */
export const PersonOrnament = memo(function PersonOrnament({
  node,
  grown,
  growIndex,
  selected,
  onSelect,
}: {
  node: TreeNode;
  grown: boolean;
  growIndex: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { x, y, size, name, role, kind } = node;
  const isRoot = kind === "root";
  const isTamim = kind === "tamim";
  const label = `${role} ${name}`;
  const ring =
    kind === "parent"
      ? node.side === "dad"
        ? RING["dad"]
        : RING["mom"]
      : isTamim
        ? "from-yellow-200 via-amber-300 to-amber-500"
        : RING["gold"];

  const stringH = isRoot ? 0 : isTamim ? 10 : 20;

  return (
    <div
      className={`ornament-wob absolute z-[2] ${selected ? "z-[6]" : ""}`}
      style={
        {
          left: `${x}px`,
          top: `${y}px`,
          transform: `translate(-50%, -50%) scale(${grown ? 1 : 0})`,
          transitionProperty: "transform, opacity",
          transitionDuration: "0.45s",
          transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)",
          transitionDelay: grown ? `${Math.min(growIndex * 0.032, 1.4)}s` : "0s",
          opacity: grown ? 1 : 0,
          ["--wob-dur" as string]: `${6 + (growIndex % 5)}s`,
          ["--wob-delay" as string]: `-${(growIndex * 1.7) % 6}s`,
        } as CSSProperties
      }
    >
      <button
        type="button"
        id={`ftree-orn-${node.id}`}
        aria-label={label}
        aria-pressed={selected}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id);
        }}
        className="group relative flex min-h-11 min-w-11 flex-col items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {stringH > 0 && (
          <svg
            width={size + 22}
            height={stringH + 4}
            className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-[#6d4c2f]"
            aria-hidden="true"
          >
            <path
              d={`M 4 0 Q ${size / 2 + 11} ${stringH + 8} ${size + 18} 0`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.75}
            />
          </svg>
        )}

        <span
          className={`relative block rounded-full bg-gradient-to-br p-[2.5px] shadow-[0_4px_10px_rgba(80,40,10,0.35)] ring-1 ring-black/10 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${
            isTamim ? `${ring} gem-breathe` : ring
          }`}
        >
          {node.photoUrl ? (
            <img
              src={node.photoUrl}
              alt=""
              width={size}
              height={size}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="block rounded-full object-cover"
              style={{ width: size, height: size }}
            />
          ) : (
            <span
              className="grid place-items-center rounded-full bg-gradient-to-br from-green-50 to-emerald-200 font-display font-semibold text-emerald-900 ring-1 ring-white/70"
              style={{ width: size, height: size }}
            >
              {name.trim().charAt(0)}
            </span>
          )}
        </span>

        <span className="mt-1 max-w-[7.5rem] rounded-md bg-[#fff8ea] px-1.5 py-0.5 text-center shadow-sm ring-1 ring-black/5 [line-clamp:2]">
          <b className="block font-display text-[15px] font-semibold leading-tight text-stone-900">
            {name}
          </b>
          <span className="block text-xs leading-tight text-stone-600">{role}</span>
        </span>
      </button>
    </div>
  );
});
