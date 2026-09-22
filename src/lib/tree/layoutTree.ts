/**
 * Pure, data-driven layout for the illustrated family tree scene.
 *
 * HOW A NEW PERSON IS PLACED
 * ---------------------------
 * The scene is built entirely from the `relatives` table (the same DB the
 * /relatives page and the "Add person" dialog write to). `buildFamilyData`
 * maps every relative into one strict two-branch family structure, then
 * `layoutTree` assigns every person a deterministic place.
 *
 * The tree grows UP, with Tamim as the living seed at the bottom:
 *
 *   - Tamim                        -> the big golden base at the bottom
 *   - "Parents" (بابا / ماما)       -> the ♥ knot right above Tamim
 *   - "Aunts & Uncles" (siblings
 *     of the parents)              -> side branches climbing the trunks
 *   - "Grandparents" (جدو / تيتة)  -> the carved plaque further up the trunk
 *   - "Great aunts & uncles" (أخوات
 *     الجد والجدة)                 -> small knots flanking each plaque
 *   - "Cousins" and their own
 *     children & grandchildren     -> canopy fruits at the tips, growing up
 *
 * For a new person to land in the right spot, fill the relationship + family
 * group in the Add-person dialog as usual (parent for children, matching
 * relationship label for عمو/عمة/خالو/خالتو/ابن عمو…). To add a grandchild,
 * set the parent to the cousin instead — the descendant cascade places every
 * generation above. No code change is ever needed: the new relative appears
 * on the next render and ornaments animate to their updated positions.
 *
 * Determinism: same input => identical output. Every organic wiggle is seeded
 * by the person id, so the scene is stable between renders and visits.
 */

import type { FamilyData, FamilyDescendant, FamilyPerson } from "@/lib/family-data";
import { friendlyRole } from "../family-data.ts";
import { seededRandom, type SeededRandom } from "./seededRandom.ts";

export type Vec = { x: number; y: number };
export type Side = "dad" | "mom";
export type FocusGroup = "all" | Side;

export type NodeKind = "tamim" | "parent" | "grandparent" | "side" | "cousin" | "root";

export type TreeNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  size: number;
  side: Side | "both";
  name: string;
  role: string;
  photoUrl: string | null;
  spouseId: string | null;
  pairWith: string | null;
  focusGroup: FocusGroup;
};

export type Couple = {
  ids: [string, string];
  x: number;
  y: number;
  side: Side;
  size: number;
};

export type BranchPath = {
  d: string;
  fill: "bark" | "plaque" | "twig" | "root" | "soil";
  side: Side | "stem";
  spine?: Vec[];
};

export type RootsGroup = {
  side: Side;
  base: Vec;
  labelPos: Vec;
};

export type Leaf = {
  x: number;
  y: number;
  r: number;
  rot: number;
  variant: 1 | 2 | 3;
  side: Side | "stem";
};

export type Chain = Vec[];

export type LayoutDeps = {
  photos: Record<string, string | null>;
  childPhotoUrl?: string | null;
};

export type TreeLayout = {
  W: number;
  H: number;
  groundY: number;
  crown: Vec;
  meet: Vec;
  nodes: TreeNode[];
  byId: Record<string, TreeNode>;
  couples: Couple[];
  branches: BranchPath[];
  roots: RootsGroup[];
  leaves: Leaf[];
  chains: Record<string, Chain>;
};

export const SIZES: Record<NodeKind, number> = {
  tamim: 104,
  parent: 64,
  grandparent: 72,
  side: 56,
  cousin: 48,
  root: 42,
};

export const SCENE = {
  W: 1200,
  H: 1650,
  groundY: 1500,
  crown: { x: 600, y: 1490 },
  meet: { x: 600, y: 1408 },
} as const;

const TRUNK: Record<Side, { start: Vec; tip: Vec; pull: Vec }> = {
  dad: { start: { x: 610, y: 1408 }, tip: { x: 846, y: 648 }, pull: { x: 96, y: -26 } },
  mom: { start: { x: 590, y: 1408 }, tip: { x: 354, y: 648 }, pull: { x: -96, y: -26 } },
};

/** Pointing up + outward for each side. */
const OUTWARD: Record<Side, Vec> = {
  dad: { x: 0.96, y: -0.28 },
  mom: { x: -0.96, y: -0.28 },
};

/** Steeper climb for the cousin canopy so every generation really rises. */
const CANOPY: Record<Side, Vec> = {
  dad: normalize({ x: 0.78, y: -0.62 }),
  mom: normalize({ x: -0.78, y: -0.62 }),
};

export function pickPhotoUrl(
  relatives: readonly { id: string; image: string }[],
): Record<string, string | null> {
  const seen = new Set<string>();
  const out: Record<string, string | null> = {};
  for (const r of relatives) {
    if (r.image && !seen.has(r.image)) {
      seen.add(r.image);
      out[r.id] = r.image;
    } else {
      out[r.id] = null;
    }
  }
  return out;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function quadPoint(a: Vec, q: Vec, b: Vec, t: number): Vec {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * q.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * q.y + t * t * b.y,
  };
}

function quadCtrl(a: Vec, b: Vec, pull: Vec, rand: SeededRandom): Vec {
  return {
    x: (a.x + b.x) / 2 + pull.x + rand.range(-20, 20),
    y: (a.y + b.y) / 2 + pull.y + rand.range(-12, 12),
  };
}

/** Quadratic-bezier outline polygon whose width tapers from w0 -> w1. */
function taperedPath(
  a: Vec,
  b: Vec,
  w0: number,
  w1: number,
  pull: Vec,
  rand: SeededRandom,
): string {
  const ctrl = quadCtrl(a, b, pull, rand);
  const N = 14;
  const fwd: Vec[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = quadPoint(a, ctrl, b, t);
    const deep = quadPoint(a, ctrl, b, Math.min(1, t + 0.012));
    const dx = deep.x - p.x;
    const dy = deep.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = lerp(w0, w1, t) / 2;
    const jit = t * rand.range(-1, 1) * 3;
    fwd.push({ x: p.x + nx * (w + jit), y: p.y + ny * (w + jit) });
  }
  const s: string[] = fwd.map((p) => `${p.x} ${p.y}`);
  for (let i = N; i >= 0; i--) {
    const t = i / N;
    const p = quadPoint(a, ctrl, b, t);
    const deep = quadPoint(a, ctrl, b, Math.min(1, t + 0.012));
    const dx = deep.x - p.x;
    const dy = deep.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w = lerp(w0, w1, t) / 2;
    const jit = t * rand.range(-1, 1) * 3;
    s.push(`${p.x - nx * (w + jit)} ${p.y - ny * (w + jit)}`);
  }
  return `M ${s.join(" L ")} Z`;
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  return `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}

function sampleBezier(a: Vec, ctrl: Vec, b: Vec, n: number): Vec[] {
  const out: Vec[] = [];
  for (let i = 1; i <= n; i++) out.push(quadPoint(a, ctrl, b, i / n));
  return out;
}

function makeNode(
  person: FamilyPerson,
  x: number,
  y: number,
  kind: NodeKind,
  side: Side | "both",
): TreeNode {
  return {
    id: person.id,
    kind,
    x,
    y,
    size: SIZES[kind],
    side,
    name: person.name,
    role: person.role,
    photoUrl: null,
    spouseId: person.relative.spouseId,
    pairWith: null,
    focusGroup: side === "both" ? "all" : side,
  };
}

/**
 * Iterative separation so ornaments never overlap (same input => same output).
 * Each ornament is treated as a capsule: a circle with a name tag hanging
 * beneath it, so we keep extra vertical air for the tag. Pinned nodes (the
 * base seed and the parents) stay glued in place; everyone else is pushed.
 */
function separateNodes(nodes: TreeNode[], pin?: (id: string) => boolean) {
  const GAP_X = 14;
  const GAP_Y = 26;
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minX = a.size / 2 + b.size / 2 + GAP_X;
        const minY = a.size / 2 + b.size / 2 + GAP_Y;
        const ox = minX - Math.abs(dx);
        const oy = minY - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        if (ox <= oy) {
          const dir = dx === 0 ? 1 : Math.sign(dx);
          const aPin = pin?.(a.id) ?? false;
          const bPin = pin?.(b.id) ?? false;
          if (aPin && bPin) continue;
          const total = ox;
          const moveA = aPin ? 0 : total / (bPin ? 1 : 2);
          const moveB = bPin ? 0 : total / (aPin ? 1 : 2);
          a.x -= dir * moveA;
          b.x += dir * moveB;
        } else {
          const dir = dy === 0 ? 1 : Math.sign(dy);
          const aPin = pin?.(a.id) ?? false;
          const bPin = pin?.(b.id) ?? false;
          if (aPin && bPin) continue;
          const total = oy;
          const moveA = aPin ? 0 : total / (bPin ? 1 : 2);
          const moveB = bPin ? 0 : total / (aPin ? 1 : 2);
          a.y -= dir * moveA;
          b.y += dir * moveB;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
}

export function layoutTree(data: FamilyData, deps: LayoutDeps): TreeLayout {
  const { W, H, groundY, crown, meet } = SCENE;
  const nodes: TreeNode[] = [];
  const byId: Record<string, TreeNode> = {};
  const couples: Couple[] = [];
  const branches: BranchPath[] = [];
  const leaves: Leaf[] = [];
  const chains: Record<string, Chain> = {};

  const photos = deps.photos;

  const add = (n: TreeNode) => {
    nodes.push(n);
    byId[n.id] = n;
  };

  /** Path from a node back down to Tamim, following the trunk from tIdx to its base. */
  const down = (samples: Vec[], tIdx: number): Chain => samples.slice(0, tIdx + 1).reverse();
  const chainVia = (pos: Vec, samples: Vec[], tIdx: number): Chain => [
    pos,
    ...down(samples, tIdx),
    { x: meet.x, y: meet.y },
    { x: crown.x, y: crown.y },
  ];

  /**
   * Places a cousin and then cascades to their children / grandchildren,
   * each generation stepping further outward and upward.
   */
  function placeDescendants(
    kids: FamilyDescendant[],
    from: Vec,
    dir: Vec,
    depth: number,
    chainTail: Chain,
    side: Side,
  ) {
    kids.forEach((kid, k) => {
      const rnd = seededRandom(`cd-${side}-${kid.id}`);
      const perp = { x: -dir.y, y: dir.x };
      const spread = (k - (kids.length - 1) / 2) * 46;
      const step = 116 + depth * 40;
      const pos = {
        x: from.x + dir.x * step + perp.x * spread + rnd.range(-8, 8),
        y: from.y + dir.y * step + perp.y * spread + rnd.range(-8, 8),
      };
      const n = makeNode(kid, pos.x, pos.y, "cousin", side);
      n.size = Math.max(34, SIZES.cousin - depth * 7);
      n.photoUrl = photos[kid.id] ?? null;
      add(n);
      chains[kid.id] = [pos, ...chainTail];
      branches.push({
        d: taperedPath(from, pos, 8, 4, { x: 0, y: -2 }, rnd),
        fill: "twig",
        side,
      });
      if (kid.children.length > 0) {
        const nDir = normalize({
          x: dir.x + perp.x * spread * 0.02,
          y: dir.y + perp.y * spread * 0.02,
        });
        placeDescendants(kid.children, pos, nDir, depth + 1, [pos, ...chainTail], side);
      }
    });
  }

  // ---- Tamim: the seed at the base ----
  const tamim: TreeNode = {
    id: "tamim",
    kind: "tamim",
    x: crown.x,
    y: crown.y,
    size: SIZES.tamim,
    side: "both",
    name: data.rootName,
    role: "قلب الشجرة",
    photoUrl: deps.childPhotoUrl ?? null,
    spouseId: null,
    pairWith: null,
    focusGroup: "all",
  };
  add(tamim);
  chains["tamim"] = [{ ...crown }];

  // ---- short stem: seed up to the heart knot ----
  branches.push({
    d: taperedPath(
      { x: 600, y: 1456 },
      { x: 600, y: meet.y + 6 },
      30,
      22,
      { x: 0, y: -6 },
      seededRandom("stem"),
    ),
    fill: "bark",
    side: "stem",
    spine: sampleBezier({ x: 600, y: 1456 }, { x: 600, y: 1434 }, { x: 600, y: meet.y + 6 }, 5),
  });

  // ---- Parents at the ♥ knot ----
  if (data.parents?.person) {
    const baba = makeNode(data.parents.person, meet.x + 86, meet.y + 2, "parent", "dad");
    baba.photoUrl = photos[data.parents.person.id] ?? null;
    add(baba);
    chains[baba.id] = [
      { x: baba.x, y: baba.y },
      { x: meet.x, y: meet.y },
      { x: crown.x, y: crown.y },
    ];
  }
  if (data.parents?.spouse) {
    const mama = makeNode(data.parents.spouse, meet.x - 86, meet.y + 2, "parent", "mom");
    mama.photoUrl = photos[data.parents.spouse.id] ?? null;
    add(mama);
    chains[mama.id] = [
      { x: mama.x, y: mama.y },
      { x: meet.x, y: meet.y },
      { x: crown.x, y: crown.y },
    ];
  }
  if (data.parents?.person && data.parents.spouse) {
    couples.push({
      ids: [data.parents.person.id, data.parents.spouse.id],
      x: meet.x,
      y: meet.y,
      side: "dad",
      size: SIZES.parent,
    });
  }

  // ---- The two trunks and everything that climbs them ----
  for (const branch of data.branches) {
    const side = branch.side;
    const cfg = TRUNK[side];
    const rand = seededRandom(`trunk-${side}`);
    const px = side === "dad" ? 1 : -1;
    const out = OUTWARD[side];
    const ctrl = quadCtrl(cfg.start, cfg.tip, cfg.pull, rand);

    branches.push({
      d: taperedPath(cfg.start, cfg.tip, 60, 24, cfg.pull, rand),
      fill: "bark",
      side,
      spine: sampleBezier(cfg.start, ctrl, cfg.tip, 10),
    });

    const trunkSamples = sampleBezier(cfg.start, ctrl, cfg.tip, 12);

    // ---- grandparents plaque (one rung up the trunk) ----
    const plaqueT = 0.55;
    const plaqueTIdx = Math.round(plaqueT * 12);
    const pp = quadPoint(cfg.start, ctrl, cfg.tip, plaqueT);
    const gx = clamp(pp.x + px * 104, 140, W - 140);
    const gy = pp.y + 8;

    const gp = branch.grandparents.person;
    const gm = branch.grandparents.spouse;
    if (gp) {
      const n = makeNode(gp, gx + 64 * px, gy, "grandparent", side);
      n.photoUrl = photos[gp.id] ?? null;
      add(n);
      chains[n.id] = chainVia({ x: n.x, y: n.y }, trunkSamples, plaqueTIdx);
    }
    if (gm) {
      const n = makeNode(gm, gx - 64 * px, gy, "grandparent", side);
      n.photoUrl = photos[gm.id] ?? null;
      add(n);
      chains[n.id] = chainVia({ x: n.x, y: n.y }, trunkSamples, plaqueTIdx);
    }
    if (gp && gm)
      couples.push({ ids: [gp.id, gm.id], x: gx, y: gy, side, size: SIZES.grandparent });

    branches.push({
      d: roundedRect(gx - 136, gy - SIZES.grandparent / 2 - 34, 272, 128, 20),
      fill: "plaque",
      side,
    });

    // ---- great aunts & uncles: the grandparents' siblings, flanking the plaque ----
    const greats = [...branch.grandfatherSiblings, ...branch.grandmotherSiblings];
    greats.forEach((g, i) => {
      const gr = seededRandom(`great-${side}-${g.id}`);
      const col = i % 2;
      const row = Math.floor(i / 2);
      const rowJit = row * 2;
      const pos = {
        x: gx + px * (120 + col * 62) + gr.range(-8, 8),
        y: gy - 70 + row * 92 + gr.range(-12, 12),
      };
      const tAdj = clamp(0.5 + row * 0.05, 0.5, 0.76);
      const anch = quadPoint(cfg.start, ctrl, cfg.tip, tAdj);
      const anchIdx = Math.round(tAdj * 12);
      const n = makeNode(g, pos.x, pos.y, "root", side);
      n.photoUrl = photos[g.id] ?? null;
      n.role = friendlyRole(g.relative);
      add(n);
      chains[n.id] = chainVia(pos, trunkSamples, anchIdx);
      branches.push({
        d: taperedPath(anch, pos, 13, 4, { x: 0, y: 4 }, gr),
        fill: "root",
        side,
      });
    });

    // ---- aunts & uncles: the parents' siblings, climbing side branches ----
    const sibs = branch.children.filter((c) => !c.isTamimParent);
    sibs.forEach((sib, i) => {
      const sr = seededRandom(`sib-${side}-${i}`);
      const alt = i % 2 === 0 ? 1 : -1;
      const t = clamp(0.27 + i * 0.075, 0.27, 0.55);
      const tIdx = Math.round(t * 12);
      const trunkP = quadPoint(cfg.start, ctrl, cfg.tip, t);
      const len = 148 + (alt === 1 ? 10 : 74);
      const pc = { x: trunkP.x + out.x * len, y: trunkP.y + out.y * len };

      const person = sib.couple.person;
      const spouse = sib.couple.spouse;
      const personPos = { x: pc.x + px * 34, y: pc.y + sr.range(-4, 4) };
      const pNode = makeNode(person, personPos.x, personPos.y, "side", side);
      pNode.photoUrl = photos[person.id] ?? null;
      add(pNode);
      chains[pNode.id] = chainVia(personPos, trunkSamples, tIdx);

      branches.push({
        d: taperedPath(
          trunkP,
          pc,
          13,
          6,
          { x: 0, y: 0 },
          seededRandom(`twig-${side}-${person.id}`),
        ),
        fill: "twig",
        side,
      });

      if (spouse) {
        const sNode = makeNode(
          spouse,
          personPos.x - 76 * px,
          personPos.y + sr.range(-4, 4),
          "side",
          side,
        );
        sNode.photoUrl = photos[spouse.id] ?? null;
        sNode.pairWith = person.id;
        pNode.pairWith = spouse.id;
        add(sNode);
        chains[sNode.id] = chainVia({ x: sNode.x, y: sNode.y }, trunkSamples, tIdx);
        couples.push({
          ids: [person.id, spouse.id],
          x: (personPos.x + sNode.x) / 2,
          y: personPos.y,
          side,
          size: SIZES.side,
        });
      }

      const chainTail: Chain = [
        pc,
        ...down(trunkSamples, tIdx),
        { x: meet.x, y: meet.y },
        { x: crown.x, y: crown.y },
      ];
      placeDescendants(sib.children, { x: pc.x, y: pc.y }, CANOPY[side], 0, chainTail, side);
    });

    scatterLeaves(side, cfg, trunkSamples, sibs, leaves);
  }

  // Tamim and the parents anchor the composition; neighbours must move around them.
  const pinned = new Set<string>(["tamim"]);
  if (data.parents?.person) pinned.add(data.parents.person.id);
  if (data.parents?.spouse) pinned.add(data.parents.spouse.id);
  const isPinned = (id: string) => pinned.has(id);

  const clampNodes = () => {
    for (const n of nodes) {
      n.x = clamp(n.x, 70, W - 70);
      n.y = clamp(n.y, 90, H - 64);
    }
  };

  separateNodes(nodes, isPinned);
  clampNodes();
  separateNodes(nodes, isPinned);
  clampNodes();

  // hearts sit exactly halfway between their pair after separation
  for (const c of couples) {
    const a = byId[c.ids[0]];
    const b = byId[c.ids[1]];
    if (a && b) {
      c.x = (a.x + b.x) / 2;
      c.y = (a.y + b.y) / 2;
    }
  }

  const roots: RootsGroup[] = [];

  return { W, H, groundY, crown, meet, nodes, byId, couples, branches, roots, leaves, chains };
}

function normalize(v: Vec): Vec {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function scatterLeaves(
  side: Side,
  cfg: { start: Vec; tip: Vec; pull: Vec },
  trunkSamples: Vec[],
  sibs: { couple: { person: FamilyPerson }; children: FamilyDescendant[] }[],
  leaves: Leaf[],
) {
  const rand = seededRandom(`leaves-${side}`);
  const n = Math.floor(rand.range(16, 22));
  for (let i = 0; i < n; i++) {
    const p =
      trunkSamples[
        Math.min(trunkSamples.length - 1, Math.floor(rand.range(0.1, 0.95) * trunkSamples.length))
      ]!;
    const off = rand.range(12, 30);
    const sign = cfg.start.x >= 600 ? 1 : -1;
    leaves.push({
      x: p.x + (rand.next() > 0.45 ? sign : -sign) * off,
      y: p.y + rand.range(-16, 16),
      r: rand.range(11, 19),
      rot: rand.range(-60, 60),
      variant: rand.int(1, 3) as 1 | 2 | 3,
      side,
    });
  }
  for (const sib of sibs) {
    const k = seededRandom(`leaf-sib-${side}-${sib.couple.person.id}`);
    for (let j = 0; j < 3; j++) {
      leaves.push({
        x: clusterX(side, sib.couple.person.id, j) + k.range(-14, 14),
        y: k.range(300, 1250),
        r: k.range(9, 15),
        rot: k.range(-70, 70),
        variant: k.int(1, 3) as 1 | 2 | 3,
        side,
      });
    }
  }
}

function clusterX(side: Side, id: string, j: number) {
  const rand = seededRandom(`leaf-x-${side}-${id}-${j}`);
  return side === "dad" ? 600 + rand.range(140, 340) : 600 - rand.range(140, 340);
}
