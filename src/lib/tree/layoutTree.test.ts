import { test } from "node:test";
import assert from "node:assert/strict";
import { countOverlaps, layoutTree, pickPhotoUrl, SCENE } from "./layoutTree.ts";
import { buildFamilyData } from "../family-data.ts";
import { PRODUCTION_RELATIVES } from "./productionFixture.ts";
import type {
  FamilyData,
  FamilyBranch,
  FamilyCouple,
  FamilyDescendant,
  FamilyPerson,
} from "@/lib/family-data";

type Rel = {
  id: string;
  name: string;
  relationship: string;
  group: string;
  image: string;
  fact: string;
  bio: string;
  parentId: string | null;
  spouseId: string | null;
};

const rel = (
  id: string,
  name: string,
  relationship: string,
  group: string,
  parentId: string | null = null,
  spouseId: string | null = null,
): Rel => ({
  id,
  name,
  relationship,
  group,
  image: "",
  fact: "",
  bio: "",
  parentId,
  spouseId,
});

const fp = (r: Rel): FamilyPerson => ({ id: r.id, name: r.name, role: "", relative: r });

const dc = (r: Rel): FamilyDescendant => ({
  id: r.id,
  name: r.name,
  role: "",
  relative: r,
  children: [],
});

function buildBranchData(base: FamilyBranch, extra: boolean): FamilyBranch {
  if (!extra) return base;

  const extraUncle = rel("s6", "وليد", "العم (شقيق بابا)", "Aunts & Uncles", "dgp", "sp6");
  const extraAunt = rel("sp6", "سوزان", "زوجة العم", "Aunts & Uncles", null, "s6");
  const extraCousin = dc(rel("k5", "حسن", "ابن العم", "Cousins", "s6"));
  const grandKid = dc(rel("gw1", "رؤى", "بنت ابن العم", "Cousins", "k5"));
  extraCousin.children = [grandKid];
  return {
    ...base,
    grandfatherSiblings: [
      ...base.grandfatherSiblings,
      fp(rel("dg4", "خالد", "خال جدو", "Great aunts & uncles")),
    ],
    children: [
      ...base.children,
      {
        couple: { person: fp(extraUncle), spouse: fp(extraAunt) },
        isTamimParent: false,
        children: [extraCousin],
      },
    ],
  };
}

export function makeData(extra: boolean): { data: FamilyData; ids: string[] } {
  const dgp = rel("dgp", "أحمد", "الجد (والد بابا)", "Grandparents", null, "dgm");
  const dgm = rel("dgm", "زينب", "الجدة (والدة بابا)", "Grandparents", null, "dgp");

  const dadBranch = buildBranchData(
    {
      side: "dad",
      title: "عيلة بابا مؤمن",
      subtitle: "فرع أحمد وزينب",
      grandparents: { person: fp(dgp), spouse: fp(dgm) },
      grandfatherSiblings: [
        fp(rel("dg1", "سمير", "خال بابا", "Great aunts & uncles")),
        fp(rel("dg2", "ميرفت", "خالة بابا", "Great aunts & uncles")),
        fp(rel("dg3", "حسن", "خال جدو", "Great aunts & uncles")),
      ],
      grandmotherSiblings: [
        fp(rel("dgm1", "عائشة", "خالة بابا", "Great aunts & uncles")),
        fp(rel("dgm2", "كريم", "خال بابا", "Great aunts & uncles")),
      ],
      children: [
        {
          couple: {
            person: {
              id: "momen",
              name: "مؤمن",
              role: "بابا",
              relative: rel("momen", "مؤمن", "بابا", "Parents", "dgp", "nagham"),
            },
            spouse: {
              id: "nagham",
              name: "نغم",
              role: "ماما",
              relative: rel("nagham", "نغم", "ماما", "Parents", null, "momen"),
            },
          },
          isTamimParent: true,
          children: [],
        },
        {
          couple: {
            person: fp(rel("s1", "محمد", "العم (شقيق بابا)", "Aunts & Uncles", "dgp", "sp1")),
            spouse: fp(rel("sp1", "سمر", "زوجة العم", "Aunts & Uncles", null, "s1")),
          },
          isTamimParent: false,
          children: [
            dc(rel("k1", "يوسف", "ابن العم", "Cousins", "s1")),
            dc(rel("k2", "مريم", "بنت العم", "Cousins", "s1")),
          ],
        },
        {
          couple: { person: fp(rel("s2", "منى", "العمة (شقيقة بابا)", "Aunts & Uncles", "dgp")) },
          isTamimParent: false,
          children: [dc(rel("k3", "نور", "بنت العمة", "Cousins", "s2"))],
        },
        {
          couple: {
            person: fp(rel("s3", "هدى", "العمة (شقيقة بابا)", "Aunts & Uncles", "dgp")),
            spouse: fp(rel("sp3", "طارق", "زوج الخالة", "Aunts & Uncles", null, "s3")),
          },
          isTamimParent: false,
          children: [],
        },
        {
          couple: {
            person: fp(rel("s4", "رامي", "العم (شقيق بابا)", "Aunts & Uncles", "dgp", "sp4")),
            spouse: fp(rel("sp4", "غادة", "زوجة العم", "Aunts & Uncles", null, "s4")),
          },
          isTamimParent: false,
          children: [dc(rel("k4", "ليلى", "بنت العم", "Cousins", "s4"))],
        },
        {
          couple: { person: fp(rel("s5", "أشرف", "العم (شقيق بابا)", "Aunts & Uncles", "dgp")) },
          isTamimParent: false,
          children: [],
        },
      ],
    } as FamilyBranch,
    extra,
  );

  const mgp = rel("mgp", "مصطفى", "الجد (والد ماما)", "Grandparents", null, "mgm");
  const mgm = rel("mgm", "نادية", "الجدة (والدة ماما)", "Grandparents", null, "mgp");

  const momBranch: FamilyBranch = {
    side: "mom",
    title: "عيلة ماما",
    subtitle: "فرع مصطفى ونادية",
    grandparents: { person: fp(mgp), spouse: fp(mgm) },
    grandfatherSiblings: [
      fp(rel("mg1", "خالد", "عم ماما", "Great aunts & uncles")),
      fp(rel("mg2", "سوسن", "عمة ماما", "Great aunts & uncles")),
    ],
    grandmotherSiblings: [fp(rel("mg3", "فاطمة", "خالة ماما", "Great aunts & uncles"))],
    children: [
      {
        couple: {
          person: fp(rel("m1", "إبراهيم", "الخال (شقيق ماما)", "Aunts & Uncles", "mgp", "ms1")),
          spouse: fp(rel("ms1", "عزة", "زوجة الخال", "Aunts & Uncles", null, "m1")),
        },
        isTamimParent: false,
        children: [
          dc(rel("mk1", "كريم", "ابن الخال", "Cousins", "m1")),
          dc(rel("mk2", "نور", "بنت الخال", "Cousins", "m1")),
        ],
      },
      {
        couple: {
          person: fp(rel("m2", "أمل", "الخالة (شقيقة ماما)", "Aunts & Uncles", "mgp", "ms2")),
          spouse: fp(rel("ms2", "ماجد", "زوج الخالة", "Aunts & Uncles", null, "m2")),
        },
        isTamimParent: false,
        children: [dc(rel("mk3", "زياد", "ابن الخالة", "Cousins", "m2"))],
      },
      {
        couple: { person: fp(rel("m3", "طه", "الخال (شقيق ماما)", "Aunts & Uncles", "mgp")) },
        isTamimParent: false,
        children: [],
      },
    ],
  };

  const parents: FamilyCouple = {
    person: {
      id: "momen",
      name: "مؤمن",
      role: "بابا",
      relative: rel("momen", "مؤمن", "بابا", "Parents", "dgp", "nagham"),
    },
    spouse: {
      id: "nagham",
      name: "نغم",
      role: "ماما",
      relative: rel("nagham", "نغم", "ماما", "Parents", null, "momen"),
    },
  };

  const data: FamilyData = {
    rootName: "تميم",
    rootSubtitle: "تجمعنا كلنا في حبك",
    parents,
    branches: [dadBranch, momBranch],
  };

  const ids: string[] = [];
  const walk = (r: Rel) => ids.push(r.id);
  const walkDesc = (d: FamilyDescendant) => {
    walk(d.relative as Rel);
    d.children.forEach(walkDesc);
  };
  const walkKid = (kid: (typeof dadBranch.children)[number]) => {
    walk(kid.couple.person.relative as Rel);
    if (kid.couple.spouse) walk(kid.couple.spouse.relative as Rel);
    kid.children.forEach(walkDesc);
  };
  [
    dgp,
    dgm,
    ...dadBranch.grandfatherSiblings.map((p) => p.relative as Rel),
    ...dadBranch.grandmotherSiblings.map((p) => p.relative as Rel),
  ].forEach(walk);
  for (const kid of dadBranch.children) walkKid(kid);
  [
    mgp,
    mgm,
    ...momBranch.grandfatherSiblings.map((p) => p.relative as Rel),
    ...momBranch.grandmotherSiblings.map((p) => p.relative as Rel),
  ].forEach(walk);
  for (const kid of momBranch.children) walkKid(kid);

  return { data, ids };
}

const DEPS = { photos: {}, childPhotoUrl: null };

test("layout is deterministic for the same input", () => {
  const { data } = makeData(false);
  const a = layoutTree(data, DEPS);
  const b = layoutTree(data, DEPS);
  assert.deepEqual(b, a);
});

test("every relative (and Tamim) gets a unique node", () => {
  const { data, ids } = makeData(false);
  const layout = layoutTree(data, DEPS);
  assert.equal(layout.nodes.length, Object.keys(layout.byId).length, "one node per id");
  assert.ok(layout.byId["tamim"], "Tamim has a node");
  assert.equal(layout.nodes.length, ids.length + 1, "every relative plus Tamim");
  for (const id of ids) {
    assert.ok(layout.byId[id], `node exists for ${id}`);
    assert.equal(layout.byId[id]!.id, id);
  }
});

test("Tamim is the seed at the base, below everyone else", () => {
  const { data, ids } = makeData(false);
  const layout = layoutTree(data, DEPS);
  const tamim = layout.byId["tamim"]!;
  assert.equal(tamim.kind, "tamim");
  assert.equal(tamim.x, layout.W / 2, "Tamim sits centred on the scene");
  assert.equal(tamim.y, SCENE.crown.y);
  for (const id of ids) {
    assert.ok(layout.byId[id]!.y < tamim.y, `${id} is above the base seed`);
  }
});

test("roots keep a friendly role from the relationship label", () => {
  const { data } = makeData(false);
  const layout = layoutTree(data, DEPS);
  for (const n of layout.nodes) {
    if (n.kind === "root") assert.ok(n.role.length > 0, `root ${n.id} has a friendly role`);
  }
});

test("ornaments never overlap after separation", () => {
  const { data } = makeData(false);
  const layout = layoutTree(data, DEPS);
  const nodes = layout.nodes;
  const SLACK = 12;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const min = a.size / 2 + b.size / 2 + 10 - SLACK;
      assert.ok(
        dist >= min,
        `${a.id} and ${b.id} overlap (dist ${dist.toFixed(1)} < ${min.toFixed(1)})`,
      );
    }
  }
});

test("every node stays inside the scene bounds", () => {
  const { data } = makeData(false);
  const layout = layoutTree(data, DEPS);
  for (const n of layout.nodes) {
    assert.ok(n.x >= 70 && n.x <= layout.W - 70, `${n.id} x in bounds`);
    assert.ok(n.y >= 90 && n.y <= layout.H - 64, `${n.id} y in bounds`);
  }
});

test("couples report a midpoint heart position", () => {
  const { data } = makeData(false);
  const layout = layoutTree(data, DEPS);
  for (const c of layout.couples) {
    for (const id of c.ids) assert.ok(layout.byId[id], `couple member ${id} exists`);
    const midX = (layout.byId[c.ids[0]]!.x + layout.byId[c.ids[1]]!.x) / 2;
    assert.ok(Math.abs(c.x - midX) < 6, "heart halfway between the pair");
  }
});

test("adding a new person places them deterministically, in-bounds, without breaking separation", () => {
  const base = makeData(false);
  const grown = makeData(true);
  const baseLayout = layoutTree(base.data, DEPS);
  const grownLayout = layoutTree(grown.data, DEPS);
  assert.equal(
    grownLayout.nodes.length,
    baseLayout.nodes.length + 5,
    "one new couple + cousin + grandchild + great",
  );

  const again = layoutTree(grown.data, DEPS);
  assert.deepEqual(again, grownLayout, "still deterministic");

  const gw1 = grownLayout.byId["gw1"];
  assert.ok(gw1, "deep grandchild of the new uncle is placed as a node");
  assert.ok(
    Array.isArray(again.chains["gw1"]) && again.chains["gw1"]!.length > 0,
    "grandchild has a light path",
  );

  const SLACK = 16;
  const nodes = grownLayout.nodes;
  for (const n of nodes) {
    assert.ok(n.x >= 70 && n.x <= grownLayout.W - 70, `${n.id} x in bounds`);
    assert.ok(n.y >= 90 && n.y <= grownLayout.H - 64, `${n.id} y in bounds`);
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const min = a.size / 2 + b.size / 2 + 10 - SLACK;
      assert.ok(dist >= min, `${a.id} and ${b.id} overlap (dist ${dist.toFixed(1)})`);
    }
  }
});

test("pickPhotoUrl dedupes so an image is never reused by two people", () => {
  const group = [
    { id: "a", image: "pic1.jpg" },
    { id: "b", image: "pic2.jpg" },
    { id: "c", image: "pic1.jpg" },
    { id: "d", image: "" },
    { id: "e", image: "pic2.jpg" },
  ];
  const out = pickPhotoUrl(group);
  assert.equal(out["a"], "pic1.jpg");
  assert.equal(out["b"], "pic2.jpg");
  assert.equal(out["c"], null, "duplicate of a is dropped");
  assert.equal(out["d"], null, "empty image means no photo");
  assert.equal(out["e"], null, "duplicate of b is dropped");
});

test("production dataset: every relative gets one node, zero bbox overlaps at any zoom", () => {
  const data = buildFamilyData(PRODUCTION_RELATIVES);
  const layout = layoutTree(data, DEPS);
  assert.equal(
    layout.nodes.length,
    70,
    "one node per production relative (69) plus Tamim, duplicate greats deduped",
  );
  assert.equal(Object.keys(layout.byId).length, layout.nodes.length, "ids stay unique");
  assert.equal(countOverlaps(layout.nodes), 0, "no bbox overlaps in the real 69-relative dataset");

  for (const n of layout.nodes) {
    assert.ok(n.x >= 70 && n.x <= layout.W - 70, `${n.id} x in bounds`);
    assert.ok(n.y >= 90 && n.y <= layout.H - 64, `${n.id} y in bounds`);
  }
});

test("production dataset: children of the great aunts/uncles hang under their roots", () => {
  const data = buildFamilyData(PRODUCTION_RELATIVES);
  const layout = layoutTree(data, DEPS);
  // every cousin of the parents' generation (children of the greats) is placed
  for (const id of [
    "saad-sherif",
    "saad-tamer",
    "saeed-aya",
    "hassan-bilal",
    "ali-karim",
    "hamdy-eman",
    "gamal-fatma",
    "hoda-enas",
    "nora-ahmed",
    "mohamed-ahmed-m",
    "hoda-hager",
    "maha-ahmed",
    "wafa-rawan",
    "wafa-abdelatif",
    "mama-hassan-rim",
    "mama-mohamed-karim",
  ]) {
    assert.ok(layout.byId[id], `great-kin ${id} has a node`);
    assert.ok(
      Array.isArray(layout.chains[id]) && layout.chains[id]!.length > 0,
      `${id} has a light path`,
    );
  }
  // the one couple among the great-kin renders with a heart
  const rawSieh = layout.byId["wafa-rawan"]!;
  const ibrahim = layout.byId["ibrahim-rawan"]!;
  assert.ok(rawSieh && ibrahim, "روان and ابراهيم both placed");
  assert.ok(
    layout.couples.some((c) => c.ids[0] === "wafa-rawan" && c.ids[1] === "ibrahim-rawan"),
    "great-kin couple gets a heart",
  );
  // deep grandchild of a great lands in the cousin lanes
  assert.ok(layout.byId["rawan-dana"], "دانه (benet وفاء) is placed");
  // great-kin wait between the roots and the parents row: below their root's row
  const root = layout.byId["khala-wafa"]!;
  assert.ok(rawSieh.y > root.y, "روان hangs below her mother وفاء");
});

test("production dataset: roots live in a dedicated lane above the parents/uncles row", () => {
  const data = buildFamilyData(PRODUCTION_RELATIVES);
  const layout = layoutTree(data, DEPS);
  const roots = layout.nodes.filter((n) => n.kind === "root");
  const gen2 = layout.nodes.filter((n) => n.kind === "parent" || n.kind === "side");
  assert.equal(roots.length, 16, "11 paternal + 5 maternal great aunts/uncles");
  for (const r of roots) {
    for (const g of gen2) {
      assert.ok(r.y < g.y, `${r.id} (root) sits above the ${g.id} parents/uncles lane`);
    }
  }
});

test("synthetic stress dataset also keeps zero bbox overlaps", () => {
  const base = layoutTree(makeData(false).data, DEPS);
  assert.equal(countOverlaps(base.nodes), 0, "base synthetic layout is overlap-free");
  const grown = layoutTree(makeData(true).data, DEPS);
  assert.equal(countOverlaps(grown.nodes), 0, "added siblings/cousins still overlap-free");
  for (const n of grown.nodes) {
    assert.ok(n.x >= 70 && n.x <= grown.W - 70, `${n.id} x in bounds`);
    assert.ok(n.y >= 90 && n.y <= grown.H - 64, `${n.id} y in bounds`);
  }
});
