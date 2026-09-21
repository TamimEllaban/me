import { createFileRoute } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { GitBranch, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  RelativeFormDialog,
  RemoveRelativeButton,
  type RelativeLike,
} from "@/components/relative-editor";
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

function PersonCard({
  person,
  relatives,
  onRefresh,
}: {
  person: RelativeLike;
  relatives: RelativeLike[];
  onRefresh: () => void;
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
          <b className="mt-2 text-center font-display">{person.name}</b>
          <span className="text-center text-[0.68rem] text-primary">{person.relationship}</span>
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
        <div className="flex flex-wrap gap-2">
          <RelativeFormDialog
            mode="child"
            parent={person}
            relatives={relatives}
            onDone={onRefresh}
            trigger={
              <Button size="sm">
                <GitBranch className="size-4" /> Add branch
              </Button>
            }
          />
          <RelativeFormDialog
            mode="edit"
            person={person}
            relatives={relatives}
            onDone={onRefresh}
            trigger={
              <Button size="sm" variant="secondary">
                <Pencil className="size-4" /> Edit
              </Button>
            }
          />
          <RemoveRelativeButton
            person={person}
            onDone={onRefresh}
            trigger={
              <Button size="sm" variant="secondary" className="text-destructive">
                <Trash2 className="size-4" /> Remove
              </Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TamimHeart({ name }: { name: string }) {
  return (
    <div className="relative z-10 rounded-lg border-2 border-primary bg-secondary p-4 text-center shadow-keepsake">
      <span className="text-2xl">♡</span>
      <b className="mt-1 block font-display text-lg">{name}</b>
      <span className="text-xs text-primary">The heart of our tree</span>
    </div>
  );
}

function Node({
  person,
  relatives,
  onRefresh,
  childName,
  rendered,
}: {
  person: RelativeLike;
  relatives: RelativeLike[];
  onRefresh: () => void;
  childName: string;
  rendered: Set<string>;
}) {
  rendered.add(person.id);
  const spouse = person.spouseId
    ? relatives.find((r) => r.id === person.spouseId && r.id !== person.id)
    : undefined;
  if (spouse) rendered.add(spouse.id);
  const children = relatives.filter(
    (r) => r.parentId === person.id && r.id !== person.id && !rendered.has(r.id),
  );
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-start gap-4">
        <PersonCard person={person} relatives={relatives} onRefresh={onRefresh} />
        {spouse && <PersonCard person={spouse} relatives={relatives} onRefresh={onRefresh} />}
      </div>
      {children.length > 0 && (
        <>
          <div className="h-8 w-px bg-primary/35" />
          <div className="flex flex-wrap items-start justify-center gap-5">
            {children.map((c) => (
              <Node
                key={c.id}
                person={c}
                relatives={relatives}
                onRefresh={onRefresh}
                childName={childName}
                rendered={rendered}
              />
            ))}
          </div>
        </>
      )}
      {person.id === "momen" && children.length === 0 && (
        <>
          <div className="h-8 w-px bg-primary/35" />
          <TamimHeart name={childName} />
        </>
      )}
    </div>
  );
}

function FamilyTreePage() {
  const { child, relatives } = Route.useLoaderData();
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const refresh = () => {
    router.invalidate();
  };

  const treeable = relatives.filter((p) => p.group !== "Great aunts & uncles");
  const spouseIds = new Set(treeable.flatMap((r) => (r.spouseId ? [r.spouseId] : [])));
  const rootBranches: RelativeLike[] = [];
  for (const root of treeable.filter((p) => !p.parentId && !spouseIds.has(p.id))) {
    if (root.spouseId && rootBranches.some((r) => r.id === root.spouseId)) continue;
    rootBranches.push(root);
  }
  const rendered = new Set<string>();
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
        text="The tree grows from the grandparents. Tap anyone to edit them or add a branch under them."
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {rootBranches.map((root) => (
              <div
                key={root.id}
                className="flex justify-center border-b border-primary/35 pb-4 sm:border-b-0 sm:pb-0"
              >
                <Node
                  person={root}
                  relatives={treeable}
                  onRefresh={refresh}
                  childName={child.name}
                  rendered={rendered}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-5 mt-4 flex items-center justify-between gap-3 sm:mx-8">
        <p className="text-xs text-muted-foreground">
          صور كل واحد موجودة في صفحة <b>Relatives</b> — ضيفها من هناك بعدين.
        </p>
        <RelativeFormDialog
          mode="create"
          relatives={relatives}
          onDone={refresh}
          trigger={<Button size="sm">Add person</Button>}
        />
      </div>
    </WorldShell>
  );
}
