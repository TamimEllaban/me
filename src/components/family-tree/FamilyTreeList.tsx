import { useState } from "react";
import { Trees } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RelativeLike } from "@/components/relative-editor";
import type { FamilyData, FamilyDescendant, FamilyPerson } from "@/lib/family-data";
import { DEFAULT_RELATIVE_IMAGE } from "@/lib/db";
import { PersonDialog } from "./PersonDialog";

/** One tappable person in the compact list card style. */
function PersonButton({ person, onClick }: { person: FamilyPerson; onClick: () => void }) {
  const hasPhoto = person.relative.image && person.relative.image !== DEFAULT_RELATIVE_IMAGE;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${person.role} ${person.name}`}
      className="flex min-h-11 min-w-28 max-w-36 flex-col items-center gap-1 rounded-xl border border-border bg-card p-2.5 text-center shadow-soft transition active:scale-95 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="relative">
        {hasPhoto ? (
          <img
            src={person.relative.image}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            className="size-14 rounded-full object-cover ring-2 ring-[#caa06b] ring-offset-1 ring-offset-card"
          />
        ) : (
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-green-50 to-emerald-200 font-display text-xl text-emerald-900 ring-1 ring-white/60">
            {person.name.trim().charAt(0)}
          </span>
        )}
      </span>
      <b className="font-display text-[15px] font-semibold leading-tight text-foreground">
        {person.name}
      </b>
      <span className="text-xs text-muted-foreground">{person.role}</span>
    </button>
  );
}

function DescendantChips({
  kids,
  onOpen,
}: {
  kids: FamilyDescendant[];
  onOpen: (id: string) => void;
}) {
  if (kids.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-2">
      {kids.map((c) => (
        <li key={c.id} className="flex flex-wrap items-start justify-center gap-2">
          <PersonButton person={c} onClick={() => onOpen(c.id)} />
          <DescendantChips kids={c.children} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

export function FamilyTreeList({
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
    <div className="mx-auto w-full max-w-2xl" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl">شجرة العائلة — عرض نصي</h2>
        <Button size="sm" variant="secondary" onClick={onBack}>
          <Trees className="size-4" /> عرض الشجرة
        </Button>
      </div>

      <ul className="mt-5 space-y-3">
        {/* Crown */}
        <li>
          <div className="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-primary/40 bg-gradient-to-tr from-primary/10 to-accent/10 px-6 py-3 text-center shadow-soft">
            <span className="font-display text-2xl font-semibold text-foreground">
              {data.rootName}
            </span>
            <span className="mt-0.5 text-xs text-muted-foreground">{data.rootSubtitle}</span>
          </div>
        </li>

        {/* Parents couple */}
        {data.parents?.person && (
          <li className="rounded-2xl border border-border bg-card p-3 shadow-soft">
            <ul className="flex flex-wrap items-center justify-center gap-2">
              <li>
                <PersonButton
                  person={data.parents.person}
                  onClick={() => setOpenId(data.parents!.person!.id)}
                />
              </li>
              {data.parents.spouse && (
                <li>
                  <PersonButton
                    person={data.parents.spouse}
                    onClick={() => setOpenId(data.parents!.spouse!.id)}
                  />
                </li>
              )}
            </ul>
          </li>
        )}
      </ul>

      {/* Two branches */}
      {data.branches.map((branch) => (
        <section
          key={branch.side}
          className="mt-6 rounded-2xl border border-border bg-card/60 p-4 shadow-soft"
        >
          <h3 className="text-center font-display text-xl font-semibold text-foreground">
            {branch.title}
          </h3>
          <p className="mt-0.5 text-center text-xs text-muted-foreground">{branch.subtitle}</p>

          <h4 className="mt-4 text-center text-sm font-semibold text-muted-foreground">الأجداد</h4>
          <ul className="flex flex-wrap justify-center gap-2">
            {branch.grandparents.person && (
              <li>
                <PersonButton
                  person={branch.grandparents.person}
                  onClick={() => setOpenId(branch.grandparents.person!.id)}
                />
              </li>
            )}
            {branch.grandparents.spouse && (
              <li>
                <PersonButton
                  person={branch.grandparents.spouse}
                  onClick={() => setOpenId(branch.grandparents.spouse!.id)}
                />
              </li>
            )}
          </ul>

          {(branch.grandfatherSiblings.length > 0 || branch.grandmotherSiblings.length > 0) && (
            <>
              <h4 className="mt-4 text-center text-sm font-semibold text-muted-foreground">
                الجذور (إخوة الأجداد)
              </h4>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[...branch.grandfatherSiblings, ...branch.grandmotherSiblings].map((p) => (
                  <li key={p.id} className="flex justify-center">
                    <PersonButton person={p} onClick={() => setOpenId(p.id)} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {branch.greatFamilies && branch.greatFamilies.length > 0 && (
            <>
              <h4 className="mt-4 text-center text-sm font-semibold text-muted-foreground">
                أولاد الجذور (أبناء أخوات الجدود)
              </h4>
              <ul className="mt-2 space-y-4">
                {branch.greatFamilies
                  .filter(
                    (g) =>
                      (g.person.relative.relationship.includes("ماما") ? "mom" : "dad") ===
                      branch.side,
                  )
                  .map((g) => (
                    <li
                      key={g.person.id}
                      className="rounded-xl border border-border/70 bg-background/60 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {g.person.role} {g.person.name}
                        </span>
                      </div>
                      <DescendantChips kids={g.children} onOpen={setOpenId} />
                    </li>
                  ))}
              </ul>
            </>
          )}

          <h4 className="mt-4 text-center text-sm font-semibold text-muted-foreground">الأبناء</h4>
          <ul className="mt-2 space-y-4">
            {branch.children.map((child) => {
              const spouse = child.couple.spouse;
              return (
                <li
                  key={child.couple.person.id}
                  className="rounded-xl border border-border/70 bg-background/60 p-3"
                >
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <PersonButton
                      person={child.couple.person}
                      onClick={() => setOpenId(child.couple.person.id)}
                    />
                    {spouse && (
                      <PersonButton person={spouse} onClick={() => setOpenId(spouse.id)} />
                    )}
                  </div>
                  <DescendantChips kids={child.children} onOpen={setOpenId} />
                </li>
              );
            })}
          </ul>
        </section>
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
