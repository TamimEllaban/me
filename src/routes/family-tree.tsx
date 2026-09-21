import { createFileRoute, useRouter } from "@tanstack/react-router";
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

type Tone = "paternal" | "maternal";

const byId =
  (relatives: RelativeLike[]) =>
  (id?: string | null): RelativeLike | undefined =>
    id ? relatives.find((p) => p.id === id) : undefined;

const safeSpouse = (root: RelativeLike, spouse?: RelativeLike) =>
  spouse && spouse.id !== root.id ? spouse : undefined;

function PersonCard({
  person,
  relatives,
  onRefresh,
  compact,
  tone,
}: {
  person: RelativeLike;
  relatives: RelativeLike[];
  onRefresh: () => void;
  compact?: boolean;
  tone?: Tone | undefined;
}) {
  const tinted =
    tone === "maternal"
      ? "bg-accent/10 ring-1 ring-accent/40"
      : tone === "paternal"
        ? "bg-primary/5 ring-1 ring-primary/30"
        : "";
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={`relative z-10 flex shrink-0 flex-col items-center rounded-lg border border-border bg-card p-3 shadow-soft transition active:scale-95 ${
            compact ? "w-20" : "w-28"
          } ${tinted}`}
        >
          <img
            src={person.image}
            alt=""
            width={1200}
            height={912}
            loading="lazy"
            className={`rounded-full object-cover ${compact ? "size-9" : "size-14"}`}
          />
          <b
            className={`mt-2 text-center font-display ${compact ? "text-[0.68rem] leading-tight" : ""}`}
          >
            {person.name}
          </b>
          <span
            className={`text-center text-primary ${compact ? "text-[0.55rem]" : "text-[0.68rem]"}`}
          >
            {person.relationship}
          </span>
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
    <div className="relative z-10 rounded-2xl border-2 border-primary bg-secondary px-8 py-5 text-center shadow-keepsake">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-primary-foreground">
        قلب الشجرة
      </div>
      <span className="text-3xl text-primary">♡</span>
      <b className="mt-1 block font-display text-2xl">{name}</b>
      <span className="text-xs text-muted-foreground">تجمعنا كلنا في حبك</span>
    </div>
  );
}

function CoupleRow({
  person,
  spouse,
  relatives,
  onRefresh,
  tone,
}: {
  person: RelativeLike;
  spouse?: RelativeLike | undefined;
  relatives: RelativeLike[];
  onRefresh: () => void;
  tone?: Tone | undefined;
}) {
  return (
    <div className="flex items-stretch justify-center">
      <PersonCard person={person} relatives={relatives} onRefresh={onRefresh} tone={tone} />
      {spouse && (
        <>
          <div className="flex w-7 flex-col items-center self-start pt-[2.2rem]">
            <div className="h-[3px] w-5 rounded bg-primary/40" />
            <span className="my-px text-[0.6rem] text-primary">♥</span>
            <div className="h-[3px] w-5 rounded bg-primary/40" />
          </div>
          <PersonCard person={spouse} relatives={relatives} onRefresh={onRefresh} tone={tone} />
        </>
      )}
    </div>
  );
}

function SiblingRibbon({
  label,
  people,
  relatives,
  onRefresh,
  tone,
}: {
  label: string;
  people: RelativeLike[];
  relatives: RelativeLike[];
  onRefresh: () => void;
  tone: Tone;
}) {
  if (people.length === 0) return null;
  return (
    <div className="w-full rounded-xl border border-dashed border-border bg-background/40 p-3">
      <p className="mb-2 text-center text-[0.7rem] font-semibold text-primary">{label}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {people.map((p) => (
          <PersonCard
            key={p.id}
            person={p}
            relatives={relatives}
            onRefresh={onRefresh}
            compact
            tone={tone}
          />
        ))}
      </div>
    </div>
  );
}

function CoupleNode({
  person,
  spouse,
  relatives,
  onRefresh,
  skipIds,
  ribbons,
  tone,
}: {
  person: RelativeLike;
  spouse?: RelativeLike | undefined;
  relatives: RelativeLike[];
  onRefresh: () => void;
  skipIds: Set<string>;
  ribbons: { label: string; people: RelativeLike[] }[];
  tone?: Tone | undefined;
}) {
  const find = byId(relatives);
  const ids = new Set<string>([person.id, ...(spouse ? [spouse.id] : [])]);
  const kids = relatives.filter((r) => r.parentId && ids.has(r.parentId) && !skipIds.has(r.id));
  const visibleRibbons = ribbons.filter((rib) => rib.people.length > 0);

  return (
    <div className="flex w-full flex-col items-center">
      <CoupleRow
        person={person}
        spouse={spouse}
        relatives={relatives}
        onRefresh={onRefresh}
        tone={tone}
      />
      {visibleRibbons.length > 0 && (
        <div className="mt-4 flex w-full flex-col gap-3">
          {visibleRibbons.map((rib, i) => (
            <SiblingRibbon
              key={i}
              label={rib.label}
              people={rib.people}
              relatives={relatives}
              onRefresh={onRefresh}
              tone={tone ?? "paternal"}
            />
          ))}
        </div>
      )}
      {kids.length > 0 && (
        <>
          <div className="mt-6 h-6 w-px bg-primary/35" />
          <div className="max-w-xs rounded-[3px] border-t-2 border-primary/35" />
          <div className="mt-0 flex flex-wrap justify-center gap-8">
            {kids.map((k) => (
              <div key={k.id} className="border-t-2 border-primary/35 pt-4">
                <CoupleNode
                  person={k}
                  spouse={safeSpouse(k, find(k.spouseId))}
                  relatives={relatives}
                  onRefresh={onRefresh}
                  skipIds={new Set()}
                  ribbons={[]}
                  tone={tone}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FamilySide({
  title,
  subtitle,
  tone,
  root,
  skip,
  ribbons,
  relatives,
  onRefresh,
}: {
  title: string;
  subtitle: string;
  tone: Tone;
  root?: RelativeLike | undefined;
  skip: RelativeLike[];
  ribbons: { label: string; people: RelativeLike[] }[];
  relatives: RelativeLike[];
  onRefresh: () => void;
}) {
  if (!root) return null;
  const find = byId(relatives);
  const spouse = safeSpouse(root, find(root.spouseId));
  const bannerCls =
    tone === "maternal" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground";
  const frameCls =
    tone === "maternal"
      ? "border-accent/25 bg-accent/[0.05]"
      : "border-primary/25 bg-primary/[0.04]";

  return (
    <section
      className={`flex w-full max-w-lg flex-col items-center gap-5 rounded-2xl border p-4 sm:p-5 ${frameCls}`}
    >
      <div className={`flex flex-col items-center rounded-full px-6 py-2 text-center ${bannerCls}`}>
        <b className="font-display text-lg leading-tight">{title}</b>
        <span className="text-[0.65rem] opacity-80">{subtitle}</span>
      </div>
      <CoupleNode
        person={root}
        spouse={spouse}
        relatives={relatives}
        onRefresh={onRefresh}
        skipIds={new Set(skip.map((s) => s.id))}
        ribbons={ribbons}
        tone={tone}
      />
    </section>
  );
}

function FamilyTreePage() {
  const { child, relatives } = Route.useLoaderData();
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const refresh = () => {
    router.invalidate();
  };

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

  const find = byId(relatives);
  const parens = relatives.filter(
    (p) => p.id === "momen" || p.id === "nagham" || p.group === "Parents",
  );
  const papi = find("momen") ?? parens.find((p) => p.group === "Parents");
  const mami =
    find("nagham") ?? (papi ? find(papi.spouseId) : undefined) ?? parens.find((p) => p !== papi);

  const geddoAhmed = papi ? find(papi.parentId) : undefined;
  const geddoIshaq = mami ? find(mami.parentId) : undefined;

  const greats = relatives.filter((p) => p.group === "Great aunts & uncles");
  const paternalRibbons = [
    {
      label: "أشقاء وأخوات الجد — عمات وأعمام بابا",
      people: greats.filter((g) => /عم بابا|عمة بابا/.test(g.relationship)),
    },
    {
      label: "أشقاء وأخوات الجدة — خالات وأخوال بابا",
      people: greats.filter((g) => /خال بابا|خالة بابا/.test(g.relationship)),
    },
    {
      label: "سائر أهل الجدة",
      people: greats.filter((g) => !/بابا|ماما/.test(g.relationship)),
    },
  ];
  const maternalRibbons = [
    {
      label: "أشقاء وأخوات الجد — عمام ماما",
      people: greats.filter((g) => /عم ماما/.test(g.relationship)),
    },
    {
      label: "أشقاء وأخوات الجدة — خالات ماما",
      people: greats.filter((g) => /خال ماما|خالة ماما/.test(g.relationship)),
    },
  ];

  return (
    <WorldShell>
      <PageIntro
        eyebrow="Where you come from"
        title="Our family tree"
        text="الشجرة كلها هنا: تبدأ من تميم في القلب، بعدين بابا وماما، وبعدين أسرتيهم الكبيرة — من الجدود وشقيقاتهم لكل العمام والخالات وأولادهم."
      />
      <div className="mx-5 flex flex-wrap items-center gap-2 sm:mx-8">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/30">
          فرع بابا
        </span>
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent ring-1 ring-accent/50">
          فرع ماما
        </span>
        <span className="text-xs text-muted-foreground">
          اضغط على أي شخص تشوف صورته وتعدّل بياناته
        </span>
      </div>
      <div className="mx-5 mt-4 overflow-auto rounded-lg border border-border bg-tree-paper shadow-soft touch-pan-x touch-pan-y sm:mx-8">
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
          className={`mx-auto flex min-h-[38rem] min-w-[24rem] origin-top flex-col items-center px-4 py-8 transition-transform ${zoomClass}`}
        >
          {!papi || !mami ? (
            <div className="flex flex-wrap justify-center gap-4 py-10">
              {relatives.map((p) => (
                <PersonCard key={p.id} person={p} relatives={relatives} onRefresh={refresh} />
              ))}
            </div>
          ) : (
            <>
              <TamimHeart name={child.name} />
              <div className="h-8 w-px bg-primary/35" />
              <CoupleNode
                person={papi}
                spouse={safeSpouse(papi, find(papi.spouseId))}
                relatives={relatives}
                onRefresh={refresh}
                skipIds={new Set()}
                ribbons={[]}
              />
              <div className="mt-8 h-7 w-px bg-primary/35" />
              <div className="flex w-80 max-w-full justify-between">
                <div className="h-10 w-px bg-primary/35" />
                <div className="h-10 w-px bg-primary/35" />
              </div>
              <div className="mt-0 flex flex-wrap items-start justify-center gap-8 pt-4 sm:gap-12">
                <FamilySide
                  title="عيلت بابا مؤمن"
                  subtitle="فرع الجد أحمد والجدة ناديه"
                  tone="paternal"
                  root={geddoAhmed}
                  skip={papi ? [papi] : []}
                  ribbons={paternalRibbons}
                  relatives={relatives}
                  onRefresh={refresh}
                />
                <FamilySide
                  title="عيلت ماما نغم"
                  subtitle="فرع الجد اسحاق والجدة ماجده"
                  tone="maternal"
                  root={geddoIshaq}
                  skip={mami ? [mami] : []}
                  ribbons={maternalRibbons}
                  relatives={relatives}
                  onRefresh={refresh}
                />
              </div>
            </>
          )}
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
