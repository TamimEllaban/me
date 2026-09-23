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

/** A descendant (cousin) that may itself have children and grandchildren. */
export type FamilyDescendant = FamilyPerson & {
  children: FamilyDescendant[];
  spouse?: FamilyPerson;
};

export type FamilyCouple = {
  person: FamilyPerson;
  spouse?: FamilyPerson;
};

export type BranchChild = {
  couple: FamilyCouple;
  isTamimParent: boolean;
  children: FamilyDescendant[];
};

export type FamilyBranch = {
  side: "dad" | "mom";
  title: string;
  subtitle: string;
  grandparents: FamilyCouple;
  grandfatherSiblings: FamilyPerson[];
  grandmotherSiblings: FamilyPerson[];
  greatFamilies?: GreatFamily[];
  children: BranchChild[];
};

/** A great aunt/uncle (sibling of a grandparent) plus their own descendants. */
export type GreatFamily = {
  person: FamilyPerson;
  spouse?: FamilyPerson;
  children: FamilyDescendant[];
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
  "ابن خالة بابا": "ابن خالتو",
  "بنت خالة بابا": "بنت خالتو",
  "ابن خال بابا": "ابن خالو",
  "بنت خال بابا": "بنت خالو",
  "ابن عمة بابا": "ابن عمة",
  "بنت عمة بابا": "بنت عمة",
  "ابن عم بابا": "ابن عمو",
  "بنت عم بابا": "بنت عمو",
  "ابن خالة ماما": "ابن خالتو",
  "بنت خالة ماما": "بنت خالتو",
  "ابن عم ماما": "ابن عمو",
  "بنت عم ماما": "بنت عمو",
  "زوج بنت خالة ماما": "عمو",
  "بنت بنت الخالة": "بنت بنت خالتو",
  "ابن بنت الخالة": "ابن بنت خالتو",
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

/**
 * Recursive cousins — children, grandchildren, great-grandchildren of the
 * aunts/uncles all follow the parent link, so new generations appear in the
 * tree without touching layout code.
 */
function buildDescendants(
  relatives: RelativeLike[],
  parentIds: Set<string>,
  depth: number,
): FamilyDescendant[] {
  return directKids(relatives, parentIds).map((c) => ({
    id: c.id,
    name: c.name,
    role: friendlyRole(c),
    relative: c,
    children:
      depth > 1
        ? buildDescendants(
            relatives,
            new Set([c.id, c.spouseId].filter(Boolean) as string[]),
            depth - 1,
          )
        : [],
  }));
}

/**
 * Attach a spouse reference to every descendant of a great aunt/uncle so the
 * tree layout can draw a couple there too.
 */
function attachSpouses(relatives: RelativeLike[], kids: FamilyDescendant[]): FamilyDescendant[] {
  const find = byId(relatives);
  return kids.map((k) => {
    const sp = safeSpouse(k.relative, find(k.relative.spouseId));
    return {
      ...k,
      children: attachSpouses(relatives, k.children),
      ...(sp ? { spouse: { id: sp.id, name: sp.name, role: friendlyRole(sp), relative: sp } } : {}),
    };
  });
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
      children: buildDescendants(relatives, kidIds, 3),
    };
  });

  const greats = relatives.filter((r) => r.group === "Great aunts & uncles");
  // Only the greats of THIS branch's side (بابا or ماما in the label). Within a
  // side, عم/عمة are siblings of the grandfather (أعمام) and خال/خالة are
  // siblings of the grandmother (خلان) — the layout hangs each band off its own
  // grandparent plaque.
  const sideWord = side === "dad" ? /بابا/ : /ماما/;
  const onSide = greats.filter((g) => sideWord.test(g.relationship));
  const grandSibRe = /^(عم |عمة )/;
  const grandmaSibRe = /^(خال |خالة )/;
  const grandSibs = onSide.filter((g) => grandSibRe.test(g.relationship));
  const grandmaSibs = onSide.filter((g) => grandmaSibRe.test(g.relationship));
  const unplaced = onSide.filter(
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

  // each great aunt/uncle carries its own children + grandchildren, so their
  // branch hangs under its root on the tree
  const greatFamilies: GreatFamily[] = [];
  for (const g of greats) {
    const gRow = find(g.id);
    if (!gRow) continue;
    const couple = buildCouple(relatives, gRow);
    const begin: GreatFamily = {
      person: couple.person,
      children: attachSpouses(relatives, buildDescendants(relatives, new Set([gRow.id]), 2)),
    };
    if (couple.spouse) begin.spouse = couple.spouse;
    greatFamilies.push(begin);
  }

  return {
    side,
    title,
    subtitle,
    grandparents: grand ? buildCouple(relatives, grand) : buildCouple(relatives, parent),
    grandfatherSiblings: [...grandSibs.map(makePerson), ...unplaced.map(makePerson)],
    grandmotherSiblings: grandmaSibs.map(makePerson),
    greatFamilies,
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
