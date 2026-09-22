/**
 * Pure, data-driven layout for the illustrated family tree scene.
 *
 * HOW A NEW PERSON IS PLACED
 * ---------------------------
 * The scene is built entirely from the `relatives` table (the same DB the
 * /relatives page and the "Add person" dialog write to). `buildFamilyData`
 * maps every relative into one strict two-branch family structure, then
 * `layoutTree` assigns every person a deterministic place:
 *
 *   - "Parents" (بابا / ماما)      -> the ♥ knot where the two trunks meet
 *   - "Grandparents" (جدو / تيتة)  -> the carved plaque at each trunk's base
 *   - "Aunts & Uncles" (siblings
 *     of the parents)              -> side branches off the matching trunk
 *   - "Cousins"                    -> fruits hanging past their parents
 *   - "Great aunts & uncles"       -> root knots under the matching trunk
 *
 * For a new person to land in the right spot, fill the relationship + family
 * group in the Add-person dialog as usual (parent for children, matching
 * relationship label for عمو/عمة/خالو/خالتو/ابن عمو…). No code change is ever
 * needed — the new relative appears on the next render and ornaments animate
 * to their updated positions.
 *
 * Determinism: same input => identical output. Every organic wiggle is seeded
 * by the person id, so the scene is stable between renders and visits.
 */

import type { FamilyData, FamilyPerson } from "@/lib/family-data";
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
  root: 40,
};

export const SCENE = {
  W: 1200,
  H: 1650,
  groundY: 1432,
  crown: { x: 600, y: 150 },
  meet: { x: 600, y: 486 },
} as const;

const TRUNK: Record<Side, { base: Vec; pull: Vec }> = {
  dad: { base: { x: 872, y: 1408 }, pull: { x: 78, y: -16 } },
  mom: { base: { x: 328, y: 1408 }, pull: { x: -78, y: -16 } },
};

const OUTWARD: Record<Side, Vec> = {
  dad: { x: 0.962, y: -0.277 },
  mom: { x: -0.962, y: 0.277 },
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
  // back along the mirrored side
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

function wayToCrown(from: Vec, meet: Vec, crown: Vec, viaTrunk?: Vec[]): Chain {
  const pts: Vec[] = [{ x: from.x, y: from.y }];
  if (viaTrunk) for (const p of viaTrunk) pts.push({ ...p });
  pts.push({ x: meet.x, y: meet.y }, { x: crown.x, y: crown.y });
  return pts;
}

/** Iterative separation so ornaments never overlap (same input => same output). */
function separateNodes(nodes: TreeNode[]) {
  const MARGIN = 10;
  for (let iter = 0; iter < 40; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.size / 2 + b.size / 2 + MARGIN;
        if (dist < minDist && dist > 0.001) {
          const push = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          moved = true;
        }
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

  // ---- Crown: Tamim ----
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

  // ---- Stem between the merge point and the crown ----
  const stemCtrl = quadCtrl(
    meet,
    { x: crown.x, y: crown.y + 16 },
    { x: 0, y: -30 },
    seededRandom("stem"),
  );
  branches.push({
    d: taperedPath(
      meet,
      { x: crown.x, y: crown.y + 16 },
      26,
      18,
      { x: 0, y: -30 },
      seededRandom("stem"),
    ),
    fill: "bark",
    side: "stem",
    spine: sampleBezier(meet, stemCtrl, { x: crown.x, y: crown.y + 16 }, 8),
  });

  // ---- Parents at the ♥ knot ----
  if (data.parents?.person) {
    const baba = makeNode(data.parents.person, meet.x + 72, meet.y + 84, "parent", "dad");
    baba.photoUrl = photos[data.parents.person.id] ?? null;
    add(baba);
    chains[baba.id] = wayToCrown({ x: baba.x, y: baba.y }, meet, crown);
  }
  if (data.parents?.spouse) {
    const mama = makeNode(data.parents.spouse, meet.x - 72, meet.y + 84, "parent", "mom");
    mama.photoUrl = photos[data.parents.spouse.id] ?? null;
    add(mama);
    chains[mama.id] = wayToCrown({ x: mama.x, y: mama.y }, meet, crown);
  }
  if (data.parents?.person && data.parents.spouse) {
    couples.push({
      ids: [data.parents.person.id, data.parents.spouse.id],
      x: meet.x,
      y: meet.y + 84,
      side: "dad",
      size: SIZES.parent,
    });
  }

  // ---- The two trunks and everything that hangs from them ----
  for (const branch of data.branches) {
    const side = branch.side;
    const cfg = TRUNK[side];
    const rand = seededRandom(`trunk-${side}`);
    const out = OUTWARD[side];
    const ctrl = quadCtrl(cfg.base, meet, cfg.pull, rand);

    branches.push({
      d: taperedPath(cfg.base, meet, 62, 26, cfg.pull, rand),
      fill: "bark",
      side,
      spine: sampleBezier(cfg.base, ctrl, meet, 10),
    });

    // grandparents plaque at the base
    const gx = side === "dad" ? 870 : 330;
    const baseY = 1240;
    const gp = branch.grandparents.person;
    const gm = branch.grandparents.spouse;
    if (gp) {
      const n = makeNode(gp, gx + 56, baseY, "grandparent", side);
      n.photoUrl = photos[gp.id] ?? null;
      add(n);
      chains[n.id] = wayToCrown(
        { x: n.x, y: n.y + 30 },
        meet,
        crown,
        sampleBezier(cfg.base, quadCtrl(cfg.base, meet, cfg.pull, rand), meet, 6).map((p) => ({
          x: p.x,
          y: p.y,
        })),
      );
    }
    if (gm) {
      const n = makeNode(gm, gx - 56, baseY, "grandparent", side);
      n.photoUrl = photos[gm.id] ?? null;
      add(n);
      chains[n.id] = wayToCrown(
        { x: n.x, y: n.y + 30 },
        meet,
        crown,
        sampleBezier(cfg.base, quadCtrl(cfg.base, meet, cfg.pull, rand), meet, 6).map((p) => ({
          x: p.x,
          y: p.y,
        })),
      );
    }
    if (gp && gm)
      couples.push({ ids: [gp.id, gm.id], x: gx, y: baseY, side, size: SIZES.grandparent });

    branches.push({
      d: roundedRect(gx - 136, baseY - SIZES.grandparent / 2 - 34, 272, 128, 20),
      fill: "plaque",
      side,
    });

    // trunk sample path (shared for chains + twigs)
    const trunkSamples = sampleBezier(cfg.base, ctrl, meet, 12);
    const chainFrom = (from: Vec, tIndex: number): Chain =>
      wayToCrown(
        from,
        meet,
        crown,
        trunkSamples.slice(tIndex).map((p) => ({ x: p.x, y: p.y })),
      );

    const sibs = branch.children.filter((c) => !c.isTamimParent);
    sibs.forEach((sib, i) => {
      const sibRand = seededRandom(`sib-${side}-${sib.couple.person.id}`);
      const alt = i % 2 === 0 ? 1 : -1;
      const t = clamp(0.34 + i * 0.15, 0.36, 0.88);
      const tIndex = Math.round(t * 12);
      const trunkP = quadPoint(cfg.base, ctrl, meet, t);
      const len = alt === 1 ? 168 : 120;
      const pc = { x: trunkP.x + out.x * len * alt, y: trunkP.y + out.y * len * alt };

      const person = sib.couple.person;
      const spouse = sib.couple.spouse;
      const px = side === "dad" ? 1 : -1;

      const personPos = { x: pc.x + 31 * px, y: pc.y + sibRand.range(-4, 4) };
      const pNode = makeNode(person, personPos.x, personPos.y, "side", side);
      pNode.photoUrl = photos[person.id] ?? null;
      add(pNode);
      chains[pNode.id] = chainFrom({ x: pc.x, y: pc.y }, tIndex);

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
          personPos.x - 62 * px,
          personPos.y + sibRand.range(-4, 4),
          "side",
          side,
        );
        sNode.photoUrl = photos[spouse.id] ?? null;
        sNode.pairWith = person.id;
        pNode.pairWith = spouse.id;
        add(sNode);
        chains[sNode.id] = chainFrom({ x: pc.x, y: pc.y }, tIndex);
        couples.push({
          ids: [person.id, spouse.id],
          x: (personPos.x + sNode.x) / 2,
          y: personPos.y,
          side,
          size: SIZES.side,
        });
      }

      sib.children.forEach((kid, k) => {
        const kRand = seededRandom(`cousin-${side}-${kid.id}`);
        const step = alt === 1 ? 84 : 72;
        const d = len * alt + 112 + step * k;
        const pos = {
          x: pc.x + out.x * d + kRand.range(-6, 6),
          y: pc.y + out.y * d + kRand.range(-6, 6),
        };
        const n = makeNode(kid, pos.x, pos.y, "cousin", side);
        n.photoUrl = photos[kid.id] ?? null;
        add(n);
        chains[n.id] = chainFrom(pos, tIndex);
        branches.push({
          d: taperedPath(pc, pos, 9, 4, { x: 0, y: 0 }, seededRandom(`ctwig-${side}-${kid.id}`)),
          fill: "twig",
          side,
        });
      });
    });

    // roots: great aunts & uncles as root knots beneath the soil
    const greats = [...branch.grandfatherSiblings, ...branch.grandmotherSiblings];
    const base = { x: cfg.base.x, y: groundY + 8 };
    greats.forEach((person, i) => {
      const frac = greats.length <= 1 ? 0.5 : i / (greats.length - 1);
      const deg = lerp(side === "dad" ? 116 : 64, side === "dad" ? 172 : 8, frac);
      const a = (deg * Math.PI) / 180;
      const r = 86 + i * 20;
      const pos = { x: base.x + Math.cos(a) * r, y: base.y + Math.sin(a) * r + 6 };
      const n = makeNode(person, pos.x, pos.y, "root", side);
      n.photoUrl = photos[person.id] ?? null;
      n.role = friendlyRole(person.relative);
      add(n);
      chains[n.id] = wayToCrown(
        pos,
        meet,
        crown,
        sampleBezier(cfg.base, ctrl, meet, 6).map((p) => ({ x: p.x, y: p.y })),
      );
      branches.push({
        d: taperedPath(
          base,
          pos,
          15,
          5,
          { x: 0, y: 12 },
          seededRandom(`root-${side}-${person.id}`),
        ),
        fill: "root",
        side,
      });
    });

    scatterLeaves(side, cfg, trunkSamples, sibs, leaves);
  }

  const clampNodes = () => {
    for (const n of nodes) {
      n.x = clamp(n.x, 70, W - 70);
      n.y = clamp(n.y, 90, H - 64);
    }
  };

  separateNodes(nodes);
  clampNodes();
  separateNodes(nodes);
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

  const roots: RootsGroup[] = data.branches.map((branch) => ({
    side: branch.side,
    base: { x: TRUNK[branch.side].base.x, y: groundY + 8 },
    labelPos: { x: TRUNK[branch.side].base.x, y: groundY + 64 },
  }));

  return { W, H, groundY, crown, meet, nodes, byId, couples, branches, roots, leaves, chains };
}

function scatterLeaves(
  side: Side,
  cfg: { base: Vec; pull: Vec },
  trunkSamples: Vec[],
  sibs: { couple: { person: FamilyPerson }; children: FamilyPerson[] }[],
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
    const sign = cfg.base.x >= 600 ? 1 : -1;
    leaves.push({
      x: p.x + (rand.next() > 0.45 ? sign : -sign) * off,
      y: p.y + rand.range(-16, 16),
      r: rand.range(11, 19),
      rot: rand.range(-60, 60),
      variant: rand.int(1, 3) as 1 | 2 | 3,
      side,
    });
  }
  // a few leaves tucked beside each couple
  for (const sib of sibs) {
    const k = seededRandom(`leaf-sib-${side}-${sib.couple.person.id}`);
    for (let j = 0; j < 3; j++) {
      leaves.push({
        x: clusterX(side, sib.couple.person.id, j) + k.range(-14, 14),
        y: 700 + k.range(60, 340),
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
  return side === "dad" ? 600 + rand.range(140, 360) : 600 - rand.range(140, 360);
}
