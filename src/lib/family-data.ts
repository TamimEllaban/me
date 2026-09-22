import type { RelativeLike } from "@/components/relative-editor";

/**
 * Structured, DB-driven view of the family tree.
 *
 * `buildFamilyData` maps the relatives table into a strict two-branch tree so
 * the page never hard-codes names. People keep their existing related id and
 * photo; labels are child-friendly, from Tamim's point of view.
 */

export type FamilyPerson = {
  id: string;
  name: string;
  role: string;
  relative: RelativeLike;
  isTamimParent?: boolean;
};

export type FamilyCouple = {
  person: FamilyPerson;
  spouse?: FamilyPerson;
};

export type BranchChild = {
  couple: FamilyCouple;
  isTamimParent: boolean;
  children: FamilyPerson[];
};

export type FamilyBranch = {
  side: "dad" | "mom";
  title: string;
  subtitle: string;
  grandparents: FamilyCouple;
  grandfatherSiblings: FamilyPerson[];
  grandmotherSiblings: FamilyPerson[];
  children: BranchChild[];
};

export type FamilyData = {
  rootName: string;
  rootSubtitle: string;
  parents?: FamilyCouple;
  branches: FamilyBranch[];
};

const FRIENDLY_ROLES: Record<string, string> = {
  بابا: "بابا",
  ماما: "ماما",
  "الجد (والد بابا)": "جدو",
  "الجدة (والدة بابا)": "تيتة",
  "الجد (والد ماما)": "جدو",
  "الجدة (والدة ماما)": "تيتة",
  "العم (شقيق بابا)": "عمو",
  "العمة (شقيقة بابا)": "عمة",
  "زوجة العم": "طنط",
  "الخال (شقيق ماما)": "خالو",
  "الخالة (شقيقة ماما)": "خالتو",
  "زوج الخالة": "عمو",
  "ابن العم": "ابن عمو",
  "بنت العم": "بنت عمو",
  "ابن الخال": "ابن خالو",
  "بنت الخال": "بنت خالو",
  "ابن الخالة": "ابن خالتو",
  "بنت الخالة": "بنت خالتو",
  "عم ماما": "عمو",
  "عمة ماما": "عمة",
  "خال بابا": "خالو",
  "خالة بابا": "خالتو",
  "خال جدو": "خال جدو",
  "عمة بابا": "عمة",
};

export function friendlyRole(relative: RelativeLike): string {
  return FRIENDLY_ROLES[relative.relationship.trim()] ?? relative.relationship;
}

function byId(relatives: RelativeLike[]) {
  return (id?: string | null): RelativeLike | undefined =>
    id ? relatives.find((r) => r.id === id) : undefined;
}

function safeSpouse(root: RelativeLike, spouse?: RelativeLike): RelativeLike | undefined {
  return spouse && spouse.id !== root.id ? spouse : undefined;
}

function buildCouple(relatives: RelativeLike[], root: RelativeLike): FamilyCouple {
  const find = byId(relatives);
  const spouse = safeSpouse(root, find(root.spouseId));
  const couple: FamilyCouple = {
    person: { id: root.id, name: root.name, role: friendlyRole(root), relative: root },
  };
  if (spouse)
    couple.spouse = {
      id: spouse.id,
      name: spouse.name,
      role: friendlyRole(spouse),
      relative: spouse,
    };
  return couple;
}

function directKids(relatives: RelativeLike[], parentIds: Set<string>): RelativeLike[] {
  return relatives.filter((r) => r.parentId && parentIds.has(r.parentId));
}

function buildBranch(
  relatives: RelativeLike[],
  side: "dad" | "mom",
  parent: RelativeLike,
): FamilyBranch {
  const find = byId(relatives);
  const grand = parent.parentId ? find(parent.parentId) : undefined;
  const grandma = grand ? safeSpouse(grand, find(grand.spouseId)) : undefined;
  const grandCoupleIds = new Set(
    ([grand, grandma].filter(Boolean) as RelativeLike[]).map((r) => r.id),
  );

  const children = directKids(relatives, grandCoupleIds).map((kid) => {
    const couple = buildCouple(relatives, kid);
    const kidIds = new Set([kid.id, couple.spouse?.id].filter(Boolean) as string[]);
    return {
      couple,
      isTamimParent: kid.id === parent.id,
      children: directKids(relatives, kidIds).map((c) => ({
        id: c.id,
        name: c.name,
        role: friendlyRole(c),
        relative: c,
      })),
    };
  });

  const greats = relatives.filter((r) => r.group === "Great aunts & uncles");
  const grandSibRe = side === "dad" ? /^(عم |عمة )/ : /^عم ماما/;
  const grandmaSibRe = side === "dad" ? /^(خال |خالة )/ : /^خال ماما|^خالة ماما/;
  const grandSibs = greats.filter((g) => grandSibRe.test(g.relationship));
  const grandmaSibs = greats.filter((g) => grandmaSibRe.test(g.relationship));
  const unplaced = greats.filter(
    (g) => !grandSibRe.test(g.relationship) && !grandmaSibRe.test(g.relationship),
  );
  const makePerson = (r: RelativeLike): FamilyPerson => ({
    id: r.id,
    name: r.name,
    role: r.relationship,
    relative: r,
  });

  const title =
    parent.relationship.trim() === "بابا"
      ? "عيلة بابا مؤمن"
      : `عيلة ${friendlyRole(parent)} ${parent.name}`;
  const subtitle = grandma ? `فرع ${grand?.name} و${grandma.name}` : `فرع ${grand?.name ?? ""}`;

  return {
    side,
    title,
    subtitle,
    grandparents: grand ? buildCouple(relatives, grand) : buildCouple(relatives, parent),
    grandfatherSiblings: [...grandSibs.map(makePerson), ...unplaced.map(makePerson)],
    grandmotherSiblings: grandmaSibs.map(makePerson),
    children,
  };
}

export function buildFamilyData(relatives: RelativeLike[]): FamilyData {
  const find = byId(relatives);
  const papi =
    find("momen") ??
    relatives.find((r) => r.relationship.trim() === "بابا") ??
    relatives.find((r) => r.group === "Parents");
  const mami =
    find("nagham") ??
    relatives.find((r) => r.relationship.trim() === "ماما") ??
    (papi ? find(papi.spouseId) : undefined) ??
    relatives.find((r) => r.group === "Parents" && r.id !== papi?.id);

  const parents: FamilyCouple | undefined = papi ? buildCouple(relatives, papi) : undefined;

  const branches: FamilyBranch[] = [];
  if (papi) {
    const dad = buildBranch(relatives, "dad", papi);
    const grand = dad.grandparents.person.id;
    if (grand !== papi.id) branches.push(dad);
  }
  if (mami) {
    const mom = buildBranch(relatives, "mom", mami);
    const grand = mom.grandparents.person.id;
    if (grand !== mami.id) branches.push(mom);
  }

  return {
    rootName: "تميم",
    rootSubtitle: "تجمعنا كلنا في حبك",
    ...(parents ? { parents } : {}),
    branches,
  };
}
