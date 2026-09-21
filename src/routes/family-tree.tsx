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
      <DialogContent className="max-w-md">
        <img
          src={person.image}
          alt=""
          width={1200}
          height={912}
          className="max-h-[60vh] w-full rounded-lg bg-background object-contain"
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
      <span className="text-xs text-primary">قلب الشجرة</span>
    </div>
  );
}

function BranchLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 rounded-full bg-primary/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-primary">
      {children}
    </span>
  );
}

function SiblingUnit({
  sib,
  relatives,
  onRefresh,
}: {
  sib: RelativeLike;
  relatives: RelativeLike[];
  onRefresh: () => void;
}) {
  const spouse = sib.spouseId ? relatives.find((r) => r.id === sib.spouseId) : undefined;
  const kids = relatives.filter((r) => r.parentId === sib.id);
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-start gap-3">
        <PersonCard person={sib} relatives={relatives} onRefresh={onRefresh} />
        {spouse && <PersonCard person={spouse} relatives={relatives} onRefresh={onRefresh} />}
      </div>
      {kids.length > 0 && (
        <>
          <div className="h-6 w-px bg-primary/35" />
          <div className="flex flex-wrap justify-center gap-4">
            {kids.map((k) => (
              <PersonCard key={k.id} person={k} relatives={relatives} onRefresh={onRefresh} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ParentBranch({
  parent,
  relatives,
  onRefresh,
}: {
  parent: RelativeLike;
  relatives: RelativeLike[];
  onRefresh: () => void;
}) {
  const grandpa = parent.parentId ? relatives.find((r) => r.id === parent.parentId) : undefined;
  const grandma = grandpa?.spouseId
    ? relatives.find((r) => r.id === grandpa.spouseId && r.id !== grandpa.id)
    : undefined;
  const siblings = relatives.filter((r) => r.parentId === parent.parentId && r.id !== parent.id);
  return (
    <div className="flex flex-col items-center">
      <PersonCard person={parent} relatives={relatives} onRefresh={onRefresh} />
      <div className="mt-8 flex flex-wrap items-start justify-center gap-10">
        {grandpa && (
          <div className="flex flex-col items-center">
            <BranchLabel>والديه</BranchLabel>
            <div className="flex items-start gap-3">
              <PersonCard person={grandpa} relatives={relatives} onRefresh={onRefresh} />
              {grandma && (
                <PersonCard person={grandma} relatives={relatives} onRefresh={onRefresh} />
              )}
            </div>
          </div>
        )}
        {siblings.length > 0 && (
          <div className="flex flex-col items-center">
            <BranchLabel>أشقاؤه</BranchLabel>
            <div className="flex flex-wrap justify-center gap-5">
              {siblings.map((sib) => (
                <SiblingUnit key={sib.id} sib={sib} relatives={relatives} onRefresh={onRefresh} />
              ))}
            </div>
          </div>
        )}
      </div>
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
  const papi =
    treeable.find((p) => p.id === "momen") ?? treeable.find((p) => p.group === "Parents");
  const mami =
    treeable.find((p) => p.id === "nagham") ?? treeable.find((p) => p.group === "Parents");
  const parents = [papi, mami].filter(Boolean) as RelativeLike[];
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
        text="تبدأ الشجرة من تميم، بعدين بابا وماما، وبعدين أسرتيهم الكبيرة — كل البيانات من صفحة Relatives."
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
          className={`mx-auto flex min-h-[38rem] min-w-[23rem] origin-top flex-col items-center px-4 py-8 transition-transform ${zoomClass}`}
        >
          <TamimHeart name={child.name} />
          <div className="h-8 w-px bg-primary/35" />
          <div className="flex flex-wrap items-start justify-center gap-10 sm:gap-16">
            {parents.map((parent) => (
              <div key={parent.id} className="flex justify-center border-t border-primary/35 pt-4">
                <ParentBranch parent={parent} relatives={treeable} onRefresh={refresh} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-5 mt-4 flex items-center justify-between gap-3 sm:mx-8">
        <p className="text-xs text-muted-foreground">
          صور أي حد بتتغير من صفحة <b>Relatives</b> — افتح البطاقة واقدر ترفع صورة أو تفتح الكاميرا.
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
