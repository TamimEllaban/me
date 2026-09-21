import { createFileRoute, useRouter } from "@tanstack/react-router";
import { GitBranch, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";
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
import { DEFAULT_RELATIVE_IMAGE } from "@/lib/db";
import {
  buildFamilyData,
  type FamilyBranch,
  type FamilyCouple,
  type FamilyPerson,
} from "@/lib/family-data";
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

type Tone = "dad" | "mom";
type PersonSize = "grandparent" | "parent" | "cousin" | "chip";

type TreeCtx = {
  relatives: RelativeLike[];
  onDone: () => void;
};

const TreeContext = createContext<TreeCtx>({ relatives: [], onDone: () => undefined });

const toneCfg = {
  dad: {
    line: "color-mix(in srgb, var(--color-primary) 40%, transparent)",
    ring: "ring-primary/60",
    soft: "bg-primary/10 text-primary",
    pill: "bg-primary text-primary-foreground",
    badge: "bg-accent text-accent-foreground",
    panel: "border-primary/20",
    dashed: "border-primary/40",
    dot: "bg-primary",
  },
  mom: {
    line: "color-mix(in srgb, var(--color-accent) 45%, transparent)",
    ring: "ring-accent/70",
    soft: "bg-accent/15 text-accent-foreground",
    pill: "bg-accent text-accent-foreground",
    badge: "bg-primary text-primary-foreground",
    panel: "border-accent/30",
    dashed: "border-accent/50",
    dot: "bg-accent",
  },
} as const;

const avatarPx: Record<PersonSize, number> = {
  grandparent: 64,
  parent: 56,
  cousin: 48,
  chip: 40,
};

const cardWidth: Record<PersonSize, string> = {
  grandparent: "w-28",
  parent: "w-28",
  cousin: "w-24",
  chip: "w-20",
};

const nameSize: Record<PersonSize, string> = {
  grandparent: "text-[15px]",
  parent: "text-[15px]",
  cousin: "text-[15px]",
  chip: "text-sm",
};

function Avatar({
  src,
  name,
  px,
  ringCls,
  softCls,
}: {
  src?: string | undefined;
  name: string;
  px: number;
  ringCls: string;
  softCls: string;
}) {
  const initials = name.trim().charAt(0) || "؟";
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-card ${ringCls}`}
      style={{ width: px, height: px }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={500}
          height={500}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={`grid h-full w-full place-items-center font-display text-2xl ${softCls}`}>
          {initials}
        </span>
      )}
    </span>
  );
}

function PersonCard({
  person,
  size,
  tone,
  highlighted,
  nodeId,
  onFocus,
  roleBadge,
}: {
  person: FamilyPerson;
  size: PersonSize;
  tone: Tone;
  highlighted?: boolean;
  nodeId?: string | undefined;
  onFocus?: (() => void) | undefined;
  roleBadge?: boolean | undefined;
}) {
  const cfg = toneCfg[tone];
  const ctx = useContext(TreeContext);
  const px = avatarPx[size];
  const { name, role } = person;
  const label = `${role} ${name}`;
  const hasPhoto = person.relative.image && person.relative.image !== DEFAULT_RELATIVE_IMAGE;

  const inner = (
    <span className="relative flex w-full flex-col items-center">
      <span className="relative block">
        <Avatar
          src={hasPhoto ? person.relative.image : undefined}
          name={name}
          px={px}
          ringCls={highlighted ? "ring-primary" : cfg.ring}
          softCls={cfg.soft}
        />
        {roleBadge && (
          <span
            className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-px text-xs font-bold shadow-soft ${cfg.badge}`}
          >
            {role}
          </span>
        )}
      </span>
      <b className={`mt-1.5 font-display font-semibold leading-snug ${nameSize[size]}`}>{name}</b>
      <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{role}</span>
    </span>
  );

  const cardCls = `relative z-[1] flex min-h-11 flex-col items-center justify-start rounded-2xl border bg-card p-3 text-center shadow-soft transition-transform select-none ${
    highlighted ? "border-primary ring-2 ring-primary/60" : "border-border"
  } ${cardWidth[size]} active:scale-95`;

  if (onFocus) {
    return (
      <button type="button" id={nodeId} onClick={onFocus} aria-label={label} className={cardCls}>
        {inner}
      </button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" id={nodeId} aria-label={label} className={cardCls}>
          {inner}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {hasPhoto && (
          <img
            src={person.relative.image}
            alt=""
            width={1200}
            height={912}
            className="max-h-[60vh] w-full rounded-lg bg-background object-contain"
          />
        )}
        <DialogTitle className="font-display text-3xl">{person.name}</DialogTitle>
        <p className="text-sm font-semibold text-primary">{person.role}</p>
        <DialogDescription className="leading-6">{person.relative.bio}</DialogDescription>
        <div className="flex flex-wrap gap-2">
          <RelativeFormDialog
            mode="child"
            parent={person.relative}
            relatives={ctx.relatives}
            onDone={ctx.onDone}
            trigger={
              <Button size="sm">
                <GitBranch className="size-4" /> Add branch
              </Button>
            }
          />
          <RelativeFormDialog
            mode="edit"
            person={person.relative}
            relatives={ctx.relatives}
            onDone={ctx.onDone}
            trigger={
              <Button size="sm" variant="secondary">
                <Pencil className="size-4" /> Edit
              </Button>
            }
          />
          <RemoveRelativeButton
            person={person.relative}
            onDone={ctx.onDone}
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

function CoupleRow({
  couple,
  size,
  tone,
  hero,
  onPersonFocus,
  flashId,
  roleBadge,
}: {
  couple: FamilyCouple;
  size: PersonSize;
  tone: Tone;
  hero?: boolean;
  onPersonFocus?: (person: FamilyPerson) => void;
  flashId?: string | null | undefined;
  roleBadge?: boolean | undefined;
}) {
  const cfg = toneCfg[tone];
  const heartMt = avatarPx[size] / 2 + 2;
  const card = (person: FamilyPerson) => (
    <PersonCard
      person={person}
      size={size}
      tone={tone}
      highlighted={flashId === person.id}
      nodeId={hero ? undefined : `ftree-${person.id}`}
      onFocus={hero && onPersonFocus ? () => onPersonFocus(person) : undefined}
      roleBadge={roleBadge && person.isTamimParent}
    />
  );

  return (
    <div className="flex items-start justify-center">
      {card(couple.person)}
      {couple.spouse && (
        <>
          <div
            className="flex w-7 flex-col items-center gap-1.5"
            style={{ marginTop: heartMt }}
            aria-hidden="true"
          >
            <div className="h-[2px] w-full rounded-full" style={{ background: cfg.line }} />
            <span
              className={`grid size-5 place-items-center rounded-full text-xs leading-none ${cfg.pill}`}
            >
              ♥
            </span>
            <div className="h-[2px] w-full rounded-full" style={{ background: cfg.line }} />
          </div>
          {card(couple.spouse)}
        </>
      )}
    </div>
  );
}

function TamimHero({
  name,
  subtitle,
  image,
}: {
  name: string;
  subtitle: string;
  image?: string | null | undefined;
}) {
  return (
    <div className="relative z-[1] inline-flex flex-col items-center rounded-3xl border border-border/70 bg-card px-8 py-5 text-center shadow-keepsake">
      <span className="rounded-full bg-gradient-to-tr from-primary via-primary/80 to-accent p-[3px]">
        <Avatar
          src={image ?? undefined}
          name={name}
          px={96}
          ringCls="ring-transparent"
          softCls="bg-primary/10 text-primary"
        />
      </span>
      <b className="mt-3 font-display text-[28px] font-semibold leading-tight">{name}</b>
      <span className="mt-1 text-sm text-muted-foreground">{subtitle}</span>
    </div>
  );
}

function BranchHeader({ branch, tone }: { branch: FamilyBranch; tone: Tone }) {
  const cfg = toneCfg[tone];
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span
        className={`rounded-full px-5 py-1.5 font-display text-lg font-bold shadow-soft ${cfg.pill}`}
      >
        {branch.title}
      </span>
      <span className="text-xs text-muted-foreground">{branch.subtitle}</span>
    </div>
  );
}

function SiblingChips({
  label,
  people,
  tone,
}: {
  label: string;
  people: FamilyPerson[];
  tone: Tone;
}) {
  const cfg = toneCfg[tone];
  const [open, setOpen] = useState(people.length <= 3);
  const shown = open ? people : people.slice(0, 3);
  const hidden = people.length - shown.length;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.soft}`}>
        {label}
      </span>
      <div className="flex flex-wrap items-start justify-center gap-1.5 lg:flex-col lg:items-center">
        {shown.map((p) => (
          <PersonCard key={p.id} person={p} size="chip" tone={tone} />
        ))}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
        >
          +{hidden} أكتر
        </button>
      )}
      {open && people.length > 3 && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-muted-foreground underline decoration-dotted underline-offset-2"
        >
          إظهار أقل
        </button>
      )}
    </div>
  );
}

function ChildrenBus({ children }: { children: ReactNode }) {
  return <ul className="ftree">{children}</ul>;
}

function BranchPanel({
  branch,
  tone,
  flashId,
}: {
  branch: FamilyBranch;
  tone: Tone;
  flashId?: string | null;
}) {
  const cfg = toneCfg[tone];
  return (
    <section
      dir="rtl"
      className={`mx-1 rounded-2xl border bg-card/50 p-4 text-center sm:mx-2 sm:p-5 ${cfg.panel}`}
      style={{ "--ftree-line": cfg.line } as CSSProperties}
    >
      <BranchHeader branch={branch} tone={tone} />
      <div className="mt-6">
        <ul className="ftree">
          <li>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
              <SiblingChips label="إخوة جدو" people={branch.grandfatherSiblings} tone={tone} />
              <div className="flex flex-col items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`hidden h-8 w-px border-e-2 border-dashed lg:block ${cfg.dashed}`}
                />
                <CoupleRow
                  couple={branch.grandparents}
                  size="grandparent"
                  tone={tone}
                  flashId={flashId}
                />
              </div>
              <SiblingChips label="إخوة تيتة" people={branch.grandmotherSiblings} tone={tone} />
            </div>
            {branch.children.length > 0 && (
              <ChildrenBus>
                {branch.children.map((child) => (
                  <li key={child.couple.person.id} className="px-2 sm:px-3">
                    <div className="inline-flex flex-col items-center gap-3">
                      <CoupleRow
                        couple={child.couple}
                        size="parent"
                        tone={tone}
                        flashId={flashId}
                        roleBadge={child.isTamimParent}
                      />
                      {child.children.length > 0 && (
                        <ChildrenBus>
                          {child.children.map((c) => (
                            <li key={c.id}>
                              <PersonCard person={c} size="cousin" tone={tone} />
                            </li>
                          ))}
                        </ChildrenBus>
                      )}
                    </div>
                  </li>
                ))}
              </ChildrenBus>
            )}
          </li>
        </ul>
      </div>
    </section>
  );
}

function BranchTabs({
  branches,
  active,
  onSelect,
}: {
  branches: FamilyBranch[];
  active: string;
  onSelect: (side: "dad" | "mom") => void;
}) {
  return (
    <div className="sticky top-16 z-30 mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft">
      {branches.map((b) => {
        const cfg = toneCfg[b.side];
        const isActive = active === b.side;
        return (
          <button
            type="button"
            key={b.side}
            onClick={() => onSelect(b.side)}
            aria-pressed={isActive}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-center transition ${
              isActive
                ? `text-sm font-bold ${cfg.pill}`
                : "text-xs font-semibold text-muted-foreground"
            }`}
          >
            <span
              className={`size-2.5 shrink-0 rounded-full ${isActive ? "bg-current opacity-80" : cfg.dot}`}
            />
            <span className="truncate">{b.title}</span>
          </button>
        );
      })}
    </div>
  );
}

function MobileBranchTree({
  branch,
  tone,
  flashId,
}: {
  branch: FamilyBranch;
  tone: Tone;
  flashId?: string | null;
}) {
  const cfg = toneCfg[tone];
  return (
    <div dir="rtl" className="mftree" style={{ "--ftree-line": cfg.line } as CSSProperties}>
      <ul className="mftree">
        <li>
          <div className="flex flex-col items-center gap-3">
            <CoupleRow
              couple={branch.grandparents}
              size="grandparent"
              tone={tone}
              flashId={flashId}
            />
            <div className="flex w-full flex-wrap justify-center gap-x-7 gap-y-3">
              <SiblingChips label="إخوة جدو" people={branch.grandfatherSiblings} tone={tone} />
              <SiblingChips label="إخوة تيتة" people={branch.grandmotherSiblings} tone={tone} />
            </div>
          </div>
          <ul className="mftree">
            {branch.children.map((child) => (
              <li key={child.couple.person.id}>
                <CoupleRow
                  couple={child.couple}
                  size="parent"
                  tone={tone}
                  flashId={flashId}
                  roleBadge={child.isTamimParent}
                />
                {child.children.length > 0 && (
                  <ul className="mftree">
                    {child.children.map((c) => (
                      <li key={c.id}>
                        <PersonCard person={c} size="cousin" tone={tone} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  );
}

function FamilyTreePage() {
  const { child, relatives } = Route.useLoaderData();
  const router = useRouter();
  const data = buildFamilyData(relatives);
  const [activeSide, setActiveSide] = useState<"dad" | "mom">(data.branches[0]?.side ?? "dad");
  const [flashId, setFlashId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const refresh = () => {
    router.invalidate();
  };

  const activeBranch = data.branches.find((b) => b.side === activeSide) ?? data.branches[0];

  function focusParent(person: FamilyPerson) {
    const side = data.branches.find((b) =>
      b.children.some((c) => c.couple.person.id === person.id || c.couple.spouse?.id === person.id),
    )?.side;
    if (side && window.innerWidth < 768) setActiveSide(side);
    requestAnimationFrame(() => {
      const el = document.getElementById(`ftree-${person.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashId(person.id);
      window.setTimeout(() => setFlashId(null), 1800);
    });
  }

  return (
    <TreeContext.Provider value={{ relatives, onDone: refresh }}>
      <WorldShell>
        <PageIntro
          eyebrow="Where you come from"
          title="Our family tree"
          text="الشجرة كلها هنا: تميم في القلب، بابا وماما، وأسرتيهم الكبيرة — من الجدود وشقيقاتهم لكل العمام والخالات وأولادهم. اضغط أي شخص تشوف صورته وتعدّل بياناته."
        />
        <div
          dir="rtl"
          className="mx-5 mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-1 text-xs text-muted-foreground sm:mx-8"
        >
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />
            فرع بابا
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />
            فرع ماما
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-sm leading-none text-primary">♥</span>
            زواج
          </span>
        </div>

        {data.branches.length === 0 ? (
          <div className="mx-5 mt-8 rounded-2xl border border-border bg-card p-10 text-center sm:mx-8">
            <span className="text-4xl">♡</span>
            <h2 className="mt-3 font-display text-2xl">الشجرة لسه بتتزرع</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ضيف الأشخاص الأول بأزرار Add person أو من صفحة Relatives.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: one branch at a time */}
            <div className="md:hidden" dir="rtl">
              <div className="px-5 sm:px-8">
                <div className="rounded-2xl border border-border bg-tree-paper pb-4 pt-6 shadow-soft">
                  <div className="flex flex-col items-center">
                    <TamimHero
                      name={data.rootName}
                      subtitle={data.rootSubtitle}
                      image={child.hero_image}
                    />
                    <div className="mt-2 h-8 w-0.5 rounded-full bg-primary/40" />
                    {data.parents && (
                      <CoupleRow
                        couple={data.parents}
                        size="parent"
                        tone="dad"
                        hero
                        onPersonFocus={focusParent}
                      />
                    )}
                  </div>
                  <div className="px-4">
                    <BranchTabs
                      branches={data.branches}
                      active={activeSide}
                      onSelect={setActiveSide}
                    />
                  </div>
                  {activeBranch && (
                    <div className="mt-6 px-4">
                      <MobileBranchTree
                        branch={activeBranch}
                        tone={activeBranch.side}
                        flashId={flashId}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop: both branches side by side */}
            <div className="hidden md:block">
              <div className="mx-5 mt-6 overflow-auto rounded-2xl border border-border bg-tree-paper shadow-soft sm:mx-8">
                <div className="sticky top-0 z-30 flex justify-end gap-1 p-3 pr-6">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => setZoom(Math.max(0.85, zoom - 0.1))}
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
                <div dir="rtl" className="ftree-fade flex justify-center px-4 py-10">
                  <div
                    className="flex w-full max-w-[70rem] flex-col items-center"
                    style={
                      {
                        transform: `scale(${zoom})`,
                        transformOrigin: "top center",
                        ["--ftree-line" as string]:
                          "color-mix(in srgb, var(--color-primary) 40%, transparent)",
                      } as CSSProperties
                    }
                  >
                    <ul className="w-full ftree">
                      <li>
                        <div className="inline-flex flex-col items-center">
                          <TamimHero
                            name={data.rootName}
                            subtitle={data.rootSubtitle}
                            image={child.hero_image}
                          />
                        </div>
                        <ul className="ftree">
                          <li className="px-0">
                            {data.parents ? (
                              <CoupleRow
                                couple={data.parents}
                                size="parent"
                                tone="dad"
                                hero
                                onPersonFocus={focusParent}
                              />
                            ) : (
                              <span className="inline-flex flex-col items-center gap-2">
                                <span className="rounded-2xl border border-border bg-card px-5 py-3 text-sm text-muted-foreground">
                                  عيلة محبوبة
                                </span>
                              </span>
                            )}
                            <ul className="ftree ftree-row">
                              {data.branches.map((b) => (
                                <li key={b.side}>
                                  <BranchPanel branch={b} tone={b.side} flashId={flashId} />
                                </li>
                              ))}
                            </ul>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mx-5 mt-4 flex items-center justify-between gap-3 sm:mx-8">
          <p className="text-xs text-muted-foreground">
            صور أي حد بتتغير من صفحة <b>Relatives</b> — افتح البطاقة واقدر ترفع صورة أو تفتح
            الكاميرا.
          </p>
          <RelativeFormDialog
            mode="create"
            relatives={relatives}
            onDone={refresh}
            trigger={<Button size="sm">Add person</Button>}
          />
        </div>
      </WorldShell>
    </TreeContext.Provider>
  );
}
