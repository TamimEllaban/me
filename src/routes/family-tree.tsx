import { createFileRoute, useRouter } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { LayoutGrid, List, Trees } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIntro, WorldShell } from "@/components/world-shell";
import { RelativeFormDialog, type RelativeLike } from "@/components/relative-editor";
import { FamilyTreeCards } from "@/components/family-tree/FamilyTreeCards";
import { FamilyTreeList } from "@/components/family-tree/FamilyTreeList";
import { buildFamilyData } from "@/lib/family-data";
import { getFamilyData } from "@/lib/gate.functions";

type FamilyTreeView = "scene" | "cards" | "list";

function initialView(): FamilyTreeView {
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
    return "cards";
  }
  return "scene";
}

export const Route = createFileRoute("/family-tree")({
  loader: () => getFamilyData(),
  head: () => ({
    meta: [
      { title: "Family Tree — Tamim's World" },
      { name: "description", content: "The family roots and people surrounding a beloved child." },
      { property: "og:title", content: "Family Tree — Tamim's World" },
      { property: "og:description", content: "The family roots surrounding a beloved child." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FamilyTreePage,
});

const FamilyTreeScene = lazy(() => import("@/components/family-tree/FamilyTreeScene"));

function SceneSkeleton() {
  return (
    <div
      className="scene-skeleton relative w-full overflow-hidden rounded-2xl border border-border bg-tree-paper shadow-keepsake"
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-sky-200/60 via-emerald-50/40 to-amber-50/60" />
      <svg
        viewBox="0 0 120 160"
        className="absolute left-1/2 top-12 h-full -translate-x-1/2 opacity-30"
        preserveAspectRatio="xMidYMin meet"
      >
        <path
          d="M60 10 L60 150 M38 150 L50 150 M70 150 L84 150"
          stroke="#7a5a38"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="60" cy="34" rx="30" ry="16" fill="#a8cf80" />
      </svg>
    </div>
  );
}

function FamilyTreePage() {
  const { child, relatives } = Route.useLoaderData();
  const router = useRouter();
  const [view, setView] = useState<FamilyTreeView>(initialView);
  const data = useMemo(() => buildFamilyData(relatives), [relatives]);
  const refresh = () => {
    router.invalidate();
  };
  const relativesList = relatives as RelativeLike[];

  const tabs: { id: FamilyTreeView; label: string; icon: typeof Trees }[] = [
    { id: "scene", label: "الشجرة", icon: Trees },
    { id: "cards", label: "الكروت", icon: LayoutGrid },
    { id: "list", label: "القائمة", icon: List },
  ];

  return (
    <WorldShell>
      <PageIntro
        eyebrow="Where you come from"
        title="Our family tree"
        text="شجرة حيّة بتنمو من الجذور لحد التاج: تميم في النور فوق، وبابا وماما، والجدود، والعمام والخالات، وأولادهم — كل واحد منّا مخضوب على فرع أو جذر. اضغط أي صورة تشوف بطاقتها. جرب طريقة العرض اللي تناسبك: الشجرة الكبيرة للموبيل والديسكتوب، أو الكروت، أو القائمة."
      />

      <div className="mx-auto mt-1 flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-5 sm:px-8">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="size-4" /> {label}
              </button>
            );
          })}
        </div>
        {view === "scene" && (
          <span className="text-xs text-muted-foreground">
            شريط التحكم يعمل على الكاميرا — إعادة ضبط ⌂
          </span>
        )}
      </div>

      {view === "scene" ? (
        <div className="family-tree-fullbleed mt-3">
          <Suspense fallback={<SceneSkeleton />}>
            <FamilyTreeScene
              data={data}
              relatives={relativesList}
              childHero={child.hero_image ?? null}
              onDone={refresh}
            />
          </Suspense>
        </div>
      ) : (
        <div
          className={`mt-3 w-full px-4 sm:px-6 ${
            view === "cards" ? "mx-auto max-w-2xl lg:max-w-4xl" : "mx-auto max-w-2xl"
          }`}
        >
          {view === "cards" ? (
            <FamilyTreeCards
              data={data}
              relatives={relativesList}
              onDone={refresh}
              onBack={() => setView("scene")}
            />
          ) : (
            <FamilyTreeList
              data={data}
              relatives={relativesList}
              onDone={refresh}
              onBack={() => setView("scene")}
            />
          )}
        </div>
      )}

      <div className="mx-auto mt-4 flex max-w-3xl items-center justify-between gap-3 px-5 pb-4 sm:px-8">
        <p className="text-xs leading-5 text-muted-foreground">
          ضيف أي حد جديد، واختار علاقته (بابا، ماما، جدو، عمو…) — هيلاقي مكانه لوحده في الشجرة.
          الصور والبيانات بتتعدل من البطاقة.
        </p>
        <RelativeFormDialog
          mode="create"
          relatives={relativesList}
          onDone={refresh}
          trigger={<Button size="sm">Add person</Button>}
        />
      </div>
    </WorldShell>
  );
}
