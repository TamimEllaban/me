import { createFileRoute, useRouter } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { List, Trees } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIntro, WorldShell } from "@/components/world-shell";
import { RelativeFormDialog, type RelativeLike } from "@/components/relative-editor";
import { FamilyTreeList } from "@/components/family-tree/FamilyTreeList";
import { buildFamilyData } from "@/lib/family-data";
import { getFamilyData } from "@/lib/gate.functions";

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
      className="relative mx-auto w-full overflow-hidden rounded-2xl border border-border bg-tree-paper shadow-keepsake"
      style={{ height: "min(74svh, 820px)", minHeight: 420 }}
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
  const [view, setView] = useState<"scene" | "list">("scene");
  const data = useMemo(() => buildFamilyData(relatives), [relatives]);
  const refresh = () => {
    router.invalidate();
  };
  const relativesList = relatives as RelativeLike[];

  return (
    <WorldShell>
      <PageIntro
        eyebrow="Where you come from"
        title="Our family tree"
        text="شجرة حيّة بتنمو من الجذور لحد التاج: تميم في النور فوق، وبابا وماما، والجدود، والعمام والخالات، وأولادهم — كل واحد منّا مخضوب على فرع أو جذر. اضغط أي صورة تشوف بطاقتها، وحرّك الشاشة أو استخدم الإشارة +/− عشان تنشوف مكتبنا كلّه."
      />

      <div className="mx-auto mt-1 flex w-full max-w-3xl items-center justify-between px-5 sm:px-8">
        <span className="text-xs text-muted-foreground">
          شريط التحكم يعمل على الكاميرا — إعادة ضبط ⌂
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setView((v) => (v === "scene" ? "list" : "scene"))}
        >
          {view === "scene" ? (
            <>
              <List className="size-4" /> عرض القائمة
            </>
          ) : (
            <>
              <Trees className="size-4" /> عرض الشجرة
            </>
          )}
        </Button>
      </div>

      <div className="mx-auto mt-3 w-full max-w-3xl px-5 sm:px-8">
        {view === "scene" ? (
          <Suspense fallback={<SceneSkeleton />}>
            <FamilyTreeScene
              data={data}
              relatives={relativesList}
              childHero={child.hero_image ?? null}
              onDone={refresh}
            />
          </Suspense>
        ) : (
          <FamilyTreeList
            data={data}
            relatives={relativesList}
            onDone={refresh}
            onBack={() => setView("scene")}
          />
        )}
      </div>

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
