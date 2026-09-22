import { Moon, Sun } from "lucide-react";
import type { FocusGroup } from "@/lib/tree/layoutTree";

const TABS: { value: FocusGroup; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "dad", label: "فرع بابا" },
  { value: "mom", label: "فرع ماما" },
];

/**
 * Segmented control. It never swaps content — it just moves the camera to
 * frame the chosen trunk(s).
 */
export function BranchFocusTabs({
  value,
  onChange,
}: {
  value: FocusGroup;
  onChange: (v: FocusGroup) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="تركيز الكاميرا"
      className="mx-auto grid w-full max-w-sm grid-cols-3 gap-1 rounded-2xl border border-border bg-card p-1 shadow-soft"
    >
      {TABS.map((t) => {
        const active = value === t.value;
        const activeCls =
          t.value === "dad"
            ? "bg-primary text-primary-foreground"
            : t.value === "mom"
              ? "bg-accent text-accent-foreground"
              : "bg-foreground text-background";
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`flex min-h-11 items-center justify-center rounded-xl px-2 text-sm font-semibold transition ${
              active ? activeCls : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function SceneToolbar({
  night,
  onNight,
  onReset,
}: {
  night: boolean;
  onNight: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onNight}
        aria-label={night ? "الوضع النهاري" : "الوضع الليلي"}
        className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition hover:text-foreground"
      >
        {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label="إعادة ضبط العرض"
        className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition hover:text-foreground"
      >
        <span className="text-sm font-bold">⌂</span>
      </button>
    </div>
  );
}
