import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageIntro, WorldShell } from "@/components/world-shell";
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
function Person({
  person,
}: {
  person: ReturnType<typeof Route.useLoaderData>["relatives"][number];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="relative z-10 flex w-28 shrink-0 flex-col items-center rounded-lg border border-border bg-card p-3 shadow-soft transition active:scale-95">
          <img
            src={person.image}
            alt=""
            width={1200}
            height={912}
            loading="lazy"
            className="size-14 rounded-full object-cover"
          />
          <b className="mt-2 font-display">{person.name}</b>
          <span className="text-[0.68rem] text-primary">{person.relationship}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <img
          src={person.image}
          alt=""
          width={1200}
          height={912}
          className="aspect-[4/3] w-full rounded-lg object-cover"
        />
        <DialogTitle className="font-display text-3xl">{person.name}</DialogTitle>
        <p className="text-sm font-semibold text-primary">{person.relationship}</p>
        <DialogDescription className="leading-6">{person.bio}</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
function FamilyTreePage() {
  const { relatives } = Route.useLoaderData();
  const [zoom, setZoom] = useState(1);
  const grandparents = relatives.filter((p) => p.group === "Grandparents");
  const parents = relatives.filter((p) => p.group === "Parents");
  const uncle = relatives.find((p) => p.group === "Aunts & Uncles");
  const zoomClass =
    zoom < 0.85
      ? "scale-[.8]"
      : zoom < 0.95
        ? "scale-90"
        : zoom > 1.15
          ? "scale-125"
          : zoom > 1.05
            ? "scale-110"
            : "scale-100";
  return (
    <WorldShell>
      <PageIntro
        eyebrow="Where you come from"
        title="Our family tree"
        text="Tap a person to meet them. Pinch or use the controls to explore every branch."
      />
      <div className="mx-5 overflow-auto rounded-lg border border-border bg-tree-paper shadow-soft touch-pan-x touch-pan-y sm:mx-8">
        <div className="sticky right-3 top-3 z-30 ml-auto flex w-fit gap-1 p-3">
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setZoom(Math.max(0.8, zoom - 0.1))}
            aria-label="Zoom out"
          >
            <Minus />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setZoom(Math.min(1.25, zoom + 0.1))}
            aria-label="Zoom in"
          >
            <Plus />
          </Button>
        </div>
        <div
          className={`mx-auto flex min-h-[38rem] min-w-[23rem] origin-top flex-col items-center px-4 pb-12 transition-transform ${zoomClass}`}
        >
          <div className="grid grid-cols-2 gap-5 border-b border-primary/35 pb-8">
            {grandparents.slice(0, 4).map((p) => (
              <Person key={p.id} person={p} />
            ))}
          </div>
          <div className="h-8 w-px bg-primary/35" />
          <div className="flex gap-5 border-b border-primary/35 pb-8">
            {parents.map((p) => (
              <Person key={p.id} person={p} />
            ))}
            {uncle && <Person person={uncle} />}
          </div>
          <div className="h-8 w-px bg-primary/35" />
          <div className="rounded-lg border-2 border-primary bg-secondary p-4 text-center shadow-keepsake">
            <span className="text-2xl">♡</span>
            <b className="mt-1 block font-display text-lg">Tamim</b>
            <span className="text-xs text-primary">The heart of our tree</span>
          </div>
        </div>
      </div>
    </WorldShell>
  );
}
