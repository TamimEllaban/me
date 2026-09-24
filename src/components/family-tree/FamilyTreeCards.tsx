import { useState, type ReactNode } from "react";
import { Heart, LayoutGrid, Trees } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RelativeLike } from "@/components/relative-editor";
import {
  type FamilyBranch,
  type FamilyCouple,
  type FamilyData,
  type FamilyDescendant,
  type FamilyPerson,
} from "@/lib/family-data";
import { DEFAULT_RELATIVE_IMAGE } from "@/lib/default-relative-image";
import { PersonDialog } from "./PersonDialog";

function hasPhoto(relative: RelativeLike | undefined): boolean {
  return !!relative?.image && relative.image !== DEFAULT_RELATIVE_IMAGE;
}

/** Circular photo or an initial-letter fallback tile. */
function Avatar({ person, className }: { person: FamilyPerson; className?: string }) {
  const size = className ?? "size-16 sm:size-20";
  if (hasPhoto(person.relative)) {
    return (
      <img
        src={person.relative.image}
        alt=""
        width={80}
        height={80}
        loading="lazy"
        className={`${size} rounded-full object-cover ring-2 ring-[#caa06b] ring-offset-2 ring-offset-card shadow-sm`}
      />
    );
  }
  return (
    <span
      className={`${size} grid place-items-center rounded-full bg-gradient-to-br from-green-50 to-emerald-200 font-display text-2xl font-semibold text-emerald-900 ring-2 ring-[#caa06b] ring-offset-2 ring-offset-card`}
    >
      {person.name.trim().charAt(0)}
    </span>
  );
}

/** One tappable, photo-first card — great for phones and tablets. */
function PersonCard({ person, onOpen }: { person: FamilyPerson; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(person.id)}
      aria-label={`${person.role} ${person.name}`}
      className="flex h-full flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3.5 text-center shadow-soft transition hover:border-primary/50 active:scale-[.98] focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Avatar person={person} />
      <b className="font-display text-[15px] font-semibold leading-tight text-foreground">
        {person.name}
      </b>
      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">
        {person.role}
      </span>
      {person.relative.fact && (
        <span className="line-clamp-2 text-[0.72rem] leading-4 text-muted-foreground">
          {person.relative.fact}
        </span>
      )}
    </button>
  );
}

/** A couple rendered as one wide card with two tappable halves. */
function CoupleCard({ couple, onOpen }: { couple: FamilyCouple; onOpen: (id: string) => void }) {
  const pair = [couple.person, ...(couple.spouse ? [couple.spouse] : [])];
  return (
    <div className="col-span-full grid gap-2 rounded-2xl border border-border bg-card/60 p-3 shadow-soft sm:grid-cols-2">
      {pair.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onOpen(p.id)}
          aria-label={`${p.role} ${p.name}`}
          className={`flex items-center gap-3 rounded-xl p-2.5 text-center transition hover:bg-secondary/50 active:scale-[.99] focus-visible:ring-2 focus-visible:ring-primary ${
            pair.length === 1 ? "mx-auto" : ""
          }`}
        >
          <Avatar person={p} className="size-14 rounded-full object-cover" />
          <span className="min-w-0 flex-1">
            <b className="block truncate font-display text-[15px] font-semibold text-foreground">
              {p.name}
            </b>
            <span className="mt-0.5 block text-xs text-muted-foreground">{p.role}</span>
            {p.relative.fact && (
              <span className="mt-0.5 block line-clamp-1 text-[0.7rem] text-muted-foreground/80">
                {p.relative.fact}
              </span>
            )}
          </span>
          {i === 0 && pair.length > 1 && (
            <span className="mx-1 hidden shrink-0 sm:grid place-items-center rounded-full bg-rose-500/10 p-1 text-rose-500">
              <Heart className="size-3.5 fill-current" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-4 shadow-soft sm:p-5">
      <h3 className="flex items-center gap-2 text-center font-display text-lg font-semibold text-foreground">
        {icon}
        {title}
      </h3>
      {subtitle && <p className="mt-0.5 text-center text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CardGrid({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">{children}</ul>;
}

function DescendantCards({
  kids,
  onOpen,
}: {
  kids: FamilyDescendant[];
  onOpen: (id: string) => void;
}) {
  if (kids.length === 0) return null;
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-dashed border-border/70 bg-background/40 p-3">
      <p className="text-center text-[0.7rem] font-semibold text-muted-foreground">— الأبناء —</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {kids.map((c) => (
          <li key={c.id}>
            <PersonCard person={c} onOpen={onOpen} />
          </li>
        ))}
      </ul>
      {kids.some((c) => c.children.length > 0) && (
        <div className="space-y-2">
          {kids.map((c) => (
            <DescendantCards key={c.id} kids={c.children} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function BranchSection({ branch, onOpen }: { branch: FamilyBranch; onOpen: (id: string) => void }) {
  const roots = [...branch.grandfatherSiblings, ...branch.grandmotherSiblings];
  const greatFamilies = (branch.greatFamilies ?? []).filter(
    (g) => (g.person.relative.relationship.includes("ماما") ? "mom" : "dad") === branch.side,
  );

  return (
    <section className="rounded-2xl border border-border bg-card/50 p-4 shadow-soft sm:p-5">
      <h3 className="text-center font-display text-xl font-semibold text-foreground">
        {branch.title}
      </h3>
      <p className="mt-0.5 text-center text-xs text-muted-foreground">{branch.subtitle}</p>

      <div className="mt-4 space-y-4">
        <div>
          <h4 className="mb-2 text-center text-sm font-semibold text-muted-foreground">الأجداد</h4>
          <CoupleCard couple={branch.grandparents} onOpen={onOpen} />
        </div>

        {roots.length > 0 && (
          <div>
            <h4 className="mb-2 text-center text-sm font-semibold text-muted-foreground">
              إخوة الأجداد (الجذور)
            </h4>
            <CardGrid>
              {roots.map((p) => (
                <li key={p.id}>
                  <PersonCard person={p} onOpen={onOpen} />
                </li>
              ))}
            </CardGrid>
          </div>
        )}

        {greatFamilies.length > 0 && (
          <div>
            <h4 className="mb-2 text-center text-sm font-semibold text-muted-foreground">
              أولاد الجذور
            </h4>
            <ul className="space-y-3">
              {greatFamilies.map((g) => (
                <li key={g.person.id}>
                  <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                    <CoupleCard
                      couple={
                        g.spouse ? { person: g.person, spouse: g.spouse } : { person: g.person }
                      }
                      onOpen={onOpen}
                    />
                    <DescendantCards kids={g.children} onOpen={onOpen} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {branch.children.length > 0 && (
          <div>
            <h4 className="mb-2 text-center text-sm font-semibold text-muted-foreground">
              الأبناء
            </h4>
            <ul className="space-y-3">
              {branch.children.map((child) => (
                <li
                  key={child.couple.person.id}
                  className="rounded-xl border border-border/70 bg-background/60 p-3"
                >
                  <CoupleCard couple={child.couple} onOpen={onOpen} />
                  <DescendantCards kids={child.children} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The third view of the family: a responsive card grid (photo-first) that is
 * comfortable on phones and tablets — no zooming or panning needed.
 */
export function FamilyTreeCards({
  data,
  relatives,
  onBack,
  onDone,
}: {
  data: FamilyData;
  relatives: RelativeLike[];
  onBack: () => void;
  onDone: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openPerson = openId ? relatives.find((r) => r.id === openId) : undefined;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl">
          <LayoutGrid className="size-5 text-primary" />
          شجرة العائلة — عرض الكروت
        </h2>
        <Button size="sm" variant="secondary" onClick={onBack}>
          <Trees className="size-4" /> عرض الشجرة
        </Button>
      </div>

      {/* Crown — Tamim */}
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-primary/40 bg-gradient-to-tr from-primary/10 to-accent/10 px-6 py-4 text-center shadow-soft">
        <span className="font-display text-2xl font-semibold text-foreground">{data.rootName}</span>
        <span className="mt-0.5 text-xs text-muted-foreground">{data.rootSubtitle}</span>
      </div>

      {/* Parents */}
      {data.parents && (
        <Section
          title="الأهل"
          subtitle="بابا وماما"
          icon={<Heart className="size-4 text-primary" />}
        >
          <CoupleCard couple={data.parents} onOpen={setOpenId} />
        </Section>
      )}

      {/* Two branches */}
      {data.branches.map((branch) => (
        <BranchSection key={branch.side} branch={branch} onOpen={setOpenId} />
      ))}

      {openPerson && (
        <PersonDialog
          person={openPerson}
          relatives={relatives}
          onDone={onDone}
          open
          onOpenChange={(o) => !o && setOpenId(null)}
        />
      )}
    </div>
  );
}

export default FamilyTreeCards;
