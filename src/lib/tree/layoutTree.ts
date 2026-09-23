/**
 * Pure, data-driven layout for the illustrated family tree scene.
 *
 * The tree grows UP, with Tamim as the living seed at the bottom:
 *
 *   - Tamim                    -> the big golden base at the bottom
 *   - Cousins (children of the
 *     aunts & uncles)          -> the "children" lane just above the base
 *   - Parents + aunts & uncles -> the generation lane above the cousins
 *   - Great aunts & uncles     -> per-family columns above the uncles
 *   - Grandparents             -> the carved plaque lane at the top
 *
 * Placement is a deterministic two-pass generation-lane layout:
 *
 *   1. Every person owns one "slot" on a 146px grid (avatar + 120px name tag
 *      + a guaranteed MIN_GAP of 22px), so ornaments can never touch.
 *      A couple spans two consecutive slots; siblings share one horizontal
 *      lane and the lane widens as siblings are added (Reingold–Tilford
 *      style subtree widths keep children centered under their parents).
 *   2. Generations stack bottom-up with wide air between lanes, and the whole
 *      composition is shifted so Tamim rests at the crown.
 *
 * All connectors, hearts and twigs are regenerated AFTER the final positions
 * settle, so nothing caches stale geometry. Determinism: same input produces
 * identical output; the only randomness is seeded by person ids in the
 * decorative branch/leaf wiggle.
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

/**
 * The ornament body: a circular avatar with a name ribbon tag hanging below
 * (120px wide, ~48px tall). Bounding boxes treat the avatar + tag as one
 * capsule so nothing can overlap.
 */
export const TAG = { w: 120, h: 48 } as const;

/** Minimum guaranteed clearance between any two ornaments. */
export const MIN_GAP = 22;

/** Center-to-center pitch for people sharing a lane (slot width). */
const SLOT = 146;

/** Vertical air between the close family lanes (cousins and the uncles lane). */
const CLOSE_AIR = 46;

/** Clearance between the deepest great-kin column bottom and the uncles lane. */
const COL_BASE = 130;

/** Vertical pitch inside a great column: root -> children -> grandchildren. */
const LEVEL_PITCH = 210;

/** Minimum vertical clearance between the two greats root rows. */
const ROOT_PITCH_MIN = 330;

/** Air between the highest greats row and the grandparents plaques. */
const GP_AIR = 150;

/** Slot distance of each grandparents' plaque from the centre line. */
const GP_POCKET = 3;

/** How far the trunks lean outward while climbing. */
const TRUNK_SPREAD = 330;

/** Headroom for the trunk tips above the grandparents lane. */
const TRUNK_ABOVE_GP = 150;

/** Horizontal scene padding measured from the tag edge. */
const EDGE_PAD = 130;

export const SCENE = {
  W: 1600,
  H: 1950,
  groundY: 1800,
  crown: { x: 800, y: 1786 },
  meet: { x: 800, y: 1700 },
} as const;

export type NodeRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** Bounding box of an ornament: avatar circle plus the name tag beneath it. */
export function nodeBounds(n: TreeNode): NodeRect {
  const halfW = Math.max(n.size / 2, TAG.w / 2);
  const halfA = n.size / 2;
  return {
    left: n.x - halfW,
    top: n.y - halfA,
    right: n.x + halfW,
    bottom: n.y + halfA + TAG.h,
  };
}

/** How many ornaments overlap once their bounds are inflated by the gap. */
export function countOverlaps(nodes: TreeNode[], gap: number = MIN_GAP): number {
  const g = gap / 2;
  let overlaps = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = pad(nodeBounds(nodes[i]!), g);
      const b = pad(nodeBounds(nodes[j]!), g);
      if (
        a.left < b.right - 0.5 &&
        b.left < a.right - 0.5 &&
        a.top < b.bottom - 0.5 &&
        b.top < a.bottom - 0.5
      ) {
        overlaps++;
      }
    }
  }
  return overlaps;
}

function pad(r: NodeRect, g: number): NodeRect {
  return { left: r.left - g, top: r.top - g, right: r.right + g, bottom: r.bottom + g };
}

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

/** Canonical branch side for a great-aunt/uncle from its relationship label. */
function greatSide(relationship: string): Side {
  return /ماما/.test(relationship) ? "mom" : "dad";
}

function cousinSize(depth: number) {
  return Math.max(34, SIZES.cousin - depth * 7);
}

/**
 * Iterative separation so ornaments never overlap (same input => same output).
 * Each ornament is separated by its full bounding box (avatar circle + name
 * tag), inflated by MIN_GAP, so long names are respected exactly like the
 * overlap check. Pinned nodes (the base seed and the parents) stay glued in
 * place; everyone else is pushed. Lane placement already guarantees MIN_GAP
 * everywhere, so this is only a safety net.
 */
function separateNodes(nodes: TreeNode[], pin?: (id: string) => boolean) {
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;
        const ra = pad(nodeBounds(a), MIN_GAP / 2);
        const rb = pad(nodeBounds(b), MIN_GAP / 2);

        const overlapX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const overlapY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (overlapX <= 0 || overlapY <= 0) continue;

        const aPin = pin?.(a.id) ?? false;
        const bPin = pin?.(b.id) ?? false;
        if (aPin && bPin) continue;

        if (overlapX <= overlapY) {
          const dir = b.x >= a.x ? 1 : -1;
          const moveA = aPin ? 0 : overlapX / (bPin ? 1 : 2);
          const moveB = bPin ? 0 : overlapX / (aPin ? 1 : 2);
          a.x -= dir * moveA;
          b.x += dir * moveB;
        } else {
          const dir = b.y >= a.y ? 1 : -1;
          const moveA = aPin ? 0 : overlapY / (bPin ? 1 : 2);
          const moveB = bPin ? 0 : overlapY / (aPin ? 1 : 2);
          a.y -= dir * moveA;
          b.y += dir * moveB;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
}

/** Recursive cousin subtree used by the Reingold–Tilford width pass. */
type Desc = { person: FamilyPerson; kids: Desc[]; w: number; spouse?: FamilyPerson };

/** One aunt/uncle clause: a couple plus their descendant subtree. */
type Clause = {
  side: Side;
  p: FamilyPerson;
  sp?: FamilyPerson;
  kids: Desc[];
  w: number;
  leftCol: number;
};

export function layoutTree(data: FamilyData, deps: LayoutDeps): TreeLayout {
  const { H } = SCENE;
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

  const xOf = (col: number, cx: number) => cx + col * SLOT;

  // ---- turn the branch data into clauses + descendant trees ----
  const maxDepth = { v: 0 };
  const toDesc = (c: FamilyDescendant, dep: number, track = true): Desc => {
    if (track) maxDepth.v = Math.max(maxDepth.v, dep);
    return {
      person: c,
      ...(c.spouse ? { spouse: c.spouse } : {}),
      kids: c.children.map((k) => toDesc(k, dep + 1, track)),
      w: -1,
    };
  };
  const width = (k: Desc): number => {
    if (k.w < 0)
      k.w = Math.max(
        k.spouse ? 2 : 1,
        k.kids.reduce((s, x) => s + width(x), 0),
      );
    return k.w;
  };

  const clauses: Clause[] = [];
  for (const b of data.branches) {
    for (const child of b.children) {
      if (child.isTamimParent) continue;
      const clause: Clause = {
        side: b.side,
        p: child.couple.person,
        kids: child.children.map((k) => toDesc(k, 0)),
        w: -1,
        leftCol: 0,
      };
      if (child.couple.spouse) clause.sp = child.couple.spouse;
      clauses.push(clause);
    }
  }
  for (const cl of clauses)
    cl.w = Math.max(
      cl.sp ? 2 : 1,
      cl.kids.reduce((s, k) => s + width(k), 0),
    );

  // ---- children of the great aunts & uncles: one column per great root ----
  // Descendant trees are cached now (not at placement) so their width and depth
  // are known before columns are packed; they never touch the cousin lanes —
  // every level hangs directly under its parent inside its own column.
  const famByGreat = new Map<string, { sp?: FamilyPerson; kids: Desc[] }>();
  for (const b of data.branches) {
    for (const fam of b.greatFamilies ?? []) {
      if (famByGreat.has(fam.person.id)) continue;
      famByGreat.set(fam.person.id, {
        kids: fam.children.map((c) => toDesc(c, 0, false)),
        ...(fam.spouse ? { sp: fam.spouse } : {}),
      });
    }
  }
  const depthOf = (k: Desc): number =>
    k.kids.length ? 1 + Math.max(0, ...k.kids.map(depthOf)) : 0;

  // ---- great aunts & uncles: one node per person, canonical side ----
  const greats: { person: FamilyPerson; side: Side }[] = [];
  const seenGreat = new Set<string>();
  for (const b of data.branches) {
    for (const g of [...b.grandfatherSiblings, ...b.grandmotherSiblings]) {
      if (seenGreat.has(g.id)) continue;
      seenGreat.add(g.id);
      greats.push({ person: g, side: greatSide(g.relative.relationship) });
    }
  }

  // which grandparent each great hangs from: siblings of the grandfather (أعمام)
  // connect to the جد plaque, siblings of the grandmother (خلان) to the جدة
  // plaque — so every branch keeps the دوائر two groups visually apart.
  type GreatKind = "grandpa" | "grandma";
  const greatKindOf: Record<string, GreatKind> = {};
  for (const b of data.branches) {
    for (const g of b.grandfatherSiblings) greatKindOf[g.id] = "grandpa";
    for (const g of b.grandmotherSiblings) greatKindOf[g.id] = "grandma";
  }

  const gpBySide: { side: Side; person: FamilyPerson; spouse?: FamilyPerson }[] = [];
  for (const b of data.branches) {
    const entry: { side: Side; person: FamilyPerson; spouse?: FamilyPerson } = {
      side: b.side,
      person: b.grandparents.person,
    };
    if (b.grandparents.spouse) entry.spouse = b.grandparents.spouse;
    gpBySide.push(entry);
  }

  // ---- generation lanes, bottom-up from the crown ----
  const halfA = (size: number) => size / 2;
  const halfB = (size: number) => size / 2 + TAG.h;

  const laneOrder: { id: string; size: number }[] = [];
  for (let d = maxDepth.v; d >= 0; d--) laneOrder.push({ id: `c${d}`, size: cousinSize(d) });
  laneOrder.push({ id: "gen2", size: SIZES.parent });

  const yLane: Record<string, number> = {};
  let accY = SCENE.crown.y;
  let prevHalfB = halfB(SIZES.tamim);
  for (const lane of laneOrder) {
    accY -= prevHalfB + halfA(lane.size) + CLOSE_AIR;
    yLane[lane.id] = accY;
    prevHalfB = halfB(lane.size);
  }
  const yGen2 = yLane["gen2"]!;
  const yCousin = (d: number) => yLane[`c${d}`]!;

  // ---- assign slot columns (relative to the center line) ----
  const cols: Record<string, number> = {};
  let maxAbs = 0;
  const track = (c: number) => {
    const a = Math.abs(c);
    if (a > maxAbs) maxAbs = a;
  };

  if (data.parents?.person) {
    cols[data.parents.person.id] = 0.5;
    track(0.5);
  }
  if (data.parents?.spouse) {
    cols[data.parents.spouse.id] = -0.5;
    track(0.5);
  }

  // siblings fill the lane outward from the parents, parents-level fit carried
  let cursorR = 1.5;
  let cursorL = -1.5;
  for (const cl of clauses) {
    if (cl.side === "dad") {
      cl.leftCol = cursorR;
      cursorR += cl.w;
    } else {
      cursorL -= cl.w;
      cl.leftCol = cursorL;
    }
    const px = cl.side === "dad" ? 1 : -1;
    const center = cl.leftCol + cl.w / 2;
    const personCol = cl.sp ? center + px * 0.5 : center;
    cols[cl.p.id] = personCol;
    track(personCol);
    if (cl.sp) {
      const spouseCol = center - px * 0.5;
      cols[cl.sp.id] = spouseCol;
      track(spouseCol);
    }
  }

  const placeDesc = (parentCol: number, kids: Desc[], px: 1 | -1) => {
    if (!kids.length) return;
    const total = kids.reduce((s, k) => s + width(k), 0);
    let c = parentCol - (total - 1) / 2;
    for (const k of kids) {
      const cc = c + width(k) / 2;
      if (k.spouse) {
        cols[k.person.id] = cc + px * 0.5;
        cols[k.spouse.id] = cc - px * 0.5;
        track(cols[k.person.id]!);
        track(cols[k.spouse.id]!);
      } else {
        cols[k.person.id] = cc;
        track(cc);
      }
      placeDesc(cc, k.kids, px);
      c += width(k);
    }
  };
  for (const cl of clauses) placeDesc(cl.leftCol + cl.w / 2, cl.kids, cl.side === "dad" ? 1 : -1);

  // grandparents plaques on their trunk pockets
  const gpCols: { side: Side; personCol: number; spouseCol: number }[] = [];
  for (const g of gpBySide) {
    const px = g.side === "dad" ? 1 : -1;
    const personCol = px * (GP_POCKET + 0.5);
    const spouseCol = px * (GP_POCKET - 0.5);
    gpCols.push({ side: g.side, personCol, spouseCol });
    cols[g.person.id] = personCol;
    track(personCol);
    if (g.spouse) {
      cols[g.spouse.id] = spouseCol;
      track(spouseCol);
    }
  }

  // ---- great aunts & uncles: per-side family columns, packed in ≤2 rows ----
  type GkCol = {
    side: Side;
    group: GreatKind;
    root: FamilyPerson;
    sp?: FamilyPerson;
    kids: Desc[];
    depth: number;
    width: number;
    row: number;
    left: number;
  };
  const greatCols: GkCol[] = [];
  for (const g of greats) {
    const fam = famByGreat.get(g.person.id) ?? { kids: [] as Desc[] };
    const depth = fam.kids.length ? 1 + Math.max(0, ...fam.kids.map((k) => depthOf(k))) : 0;
    const own = fam.sp ? 2 : 1;
    greatCols.push({
      side: g.side,
      group: greatKindOf[g.person.id] ?? "grandpa",
      root: g.person,
      ...(fam.sp ? { sp: fam.sp } : {}),
      kids: fam.kids,
      depth,
      width: Math.max(
        own,
        fam.kids.reduce((s, k) => s + width(k), 0),
      ),
      row: 0,
      left: 0,
    });
  }

  // greedy first-fit packing into at most two rows per side (width-capped) —
  // some roots climb to a second, higher row so the widest side stays readable
  // while the whole composition grows taller.
  const packRows = (cols: GkCol[]) => {
    const sorted = [...cols].sort(
      (a, b) => b.width - a.width || a.root.id.localeCompare(b.root.id),
    );
    for (let cap = 14; ; cap++) {
      const rows: { sum: number; items: GkCol[] }[] = [];
      let ok = true;
      for (const c of sorted) {
        const slot = rows.find((r) => r.sum + c.width <= cap);
        if (slot) {
          slot.sum += c.width;
          slot.items.push(c);
        } else if (rows.length < 2) {
          rows.push({ sum: c.width, items: [c] });
        } else {
          ok = false;
          break;
        }
      }
      if (ok) return rows.map((r) => r.items);
    }
  };

  // pack every grandparent's own siblings separately so each branch keeps the
  // أعمام (the grandfather's side) and the خلان (the grandmother's side) as two
  // distinct bands instead of one mixed mass. The خلان band sits directly above
  // the parents lane; the أعمام band climbs higher, right under the plaques.
  type BandRows = Record<GreatKind, GkCol[][]>;
  const bands: Record<Side, BandRows> = {
    dad: { grandpa: [], grandma: [] },
    mom: { grandpa: [], grandma: [] },
  };
  for (const side of ["dad", "mom"] as const) {
    bands[side].grandma = packRows(
      greatCols.filter((c) => c.side === side && c.group === "grandma"),
    );
    bands[side].grandpa = packRows(
      greatCols.filter((c) => c.side === side && c.group === "grandpa"),
    );
  }
  for (const side of ["dad", "mom"] as const) {
    bands[side].grandma.forEach((row, i) => row.forEach((c) => (c.row = i)));
    bands[side].grandpa.forEach((row, i) =>
      row.forEach((c) => (c.row = bands[side].grandma.length + i)),
    );
  }

  const maxRows = Math.max(
    1,
    ...(["dad", "mom"] as const).map((s) => bands[s].grandma.length + bands[s].grandpa.length),
  );
  const D0max = Math.max(0, ...greatCols.filter((c) => c.row === 0).map((c) => c.depth));
  const D1max = Math.max(0, ...greatCols.filter((c) => c.row >= 1).map((c) => c.depth));

  const yRootPitch = Math.max(
    ROOT_PITCH_MIN,
    D1max * LEVEL_PITCH + halfB(cousinSize(0)) + halfA(SIZES.root) + MIN_GAP,
  );
  const yRoot0 = yGen2 - COL_BASE - halfB(cousinSize(0)) - D0max * LEVEL_PITCH;
  const yRootOf = (row: number) => yRoot0 - row * yRootPitch;
  const yGp = yRootOf(maxRows - 1) - GP_AIR - halfB(SIZES.root) - halfA(SIZES.grandparent);

  // Each branch keeps two distinct lateral zones so the plaques' stalks never
  // slice through the other band's roots: the خلان band starts at the trunk
  // (px*1.5) and fans outward, and the أعمام band starts just OUTSIDE the full
  // extent of the خلان band. The جدة plaque (inner GP_POCKET-0.5) then feeds a
  // short fan into the خلان zone and the جد plaque (outer GP_POCKET+0.5) feeds
  // the أعمام zone without crossing the sibling roots.
  for (const side of ["dad", "mom"] as const) {
    const px = side === "dad" ? 1 : -1;
    const place = (row: GkCol[]) => {
      let cursor = px * 1.5;
      for (const c of row) {
        c.left = cursor;
        cursor += px * c.width;
        track(Math.abs(c.left) + c.width);
      }
    };
    bands[side].grandma.forEach(place);
    let grandmaMax = 0;
    for (const c of greatCols.filter((g) => g.side === side && g.group === "grandma"))
      grandmaMax = Math.max(grandmaMax, Math.abs(c.left) + c.width);
    const gpaStart = px * (grandmaMax + 1);
    for (const row of bands[side].grandpa) {
      let cursor = gpaStart;
      for (const c of row) {
        c.left = cursor;
        cursor += px * c.width;
        track(Math.abs(c.left) + c.width);
      }
    }
  }

  // column members own signed columns (like the clauses) feeding the scene
  // width; the root (level 0) sits at the top of its column and every deeper
  // level hangs one lane below its parent.
  const placeColKids = (cc: number, kids: Desc[], level: number, px: number) => {
    if (!kids.length) return;
    const total = kids.reduce((s, k) => s + width(k), 0);
    let c = cc - total / 2;
    for (const k of kids) {
      const w = width(k);
      const cx2 = c + w / 2;
      if (k.spouse) {
        cols[k.person.id] = cx2 + px * 0.5;
        cols[k.spouse.id] = cx2 - px * 0.5;
        track(cols[k.person.id]!);
        track(cols[k.spouse.id]!);
      } else {
        cols[k.person.id] = cx2;
        track(cx2);
      }
      placeColKids(cx2, k.kids, level + 1, px);
      c += w;
    }
  };
  for (const gc of greatCols) {
    const px = gc.side === "dad" ? 1 : -1;
    const center = gc.left + (px * gc.width) / 2;
    if (gc.sp) {
      cols[gc.root.id] = center + px * 0.5;
      cols[gc.sp.id] = center - px * 0.5;
      track(cols[gc.root.id]!);
      track(cols[gc.sp.id]!);
    } else {
      cols[gc.root.id] = center;
      track(center);
    }
    placeColKids(center, gc.kids, 1, px);
  }

  // ---- scene width grows with the family; centre everything ----
  const W = Math.max(SCENE.W, 2 * (maxAbs * SLOT + EDGE_PAD));
  const cx = W / 2;
  const crown: Vec = { x: cx, y: SCENE.crown.y };
  const meet: Vec = { x: cx, y: yGen2 };

  // ---- nodes ----
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

  if (data.parents?.person) {
    const n = makeNode(
      data.parents.person,
      xOf(cols[data.parents.person.id]!, cx),
      yGen2,
      "parent",
      "dad",
    );
    n.photoUrl = photos[data.parents.person.id] ?? null;
    add(n);
  }
  if (data.parents?.spouse) {
    const n = makeNode(
      data.parents.spouse,
      xOf(cols[data.parents.spouse.id]!, cx),
      yGen2,
      "parent",
      "mom",
    );
    n.photoUrl = photos[data.parents.spouse.id] ?? null;
    add(n);
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

  for (const g of gpBySide) {
    const cfg = gpCols.find((c) => c.side === g.side)!;
    const pn = makeNode(g.person, xOf(cfg.personCol, cx), yGp, "grandparent", g.side);
    pn.photoUrl = photos[g.person.id] ?? null;
    add(pn);
    if (g.spouse) {
      const sn = makeNode(g.spouse, xOf(cfg.spouseCol, cx), yGp, "grandparent", g.side);
      sn.photoUrl = photos[g.spouse.id] ?? null;
      add(sn);
      couples.push({
        ids: [g.person.id, g.spouse.id],
        x: xOf(GP_POCKET * (g.side === "dad" ? 1 : -1), cx),
        y: yGp,
        side: g.side,
        size: SIZES.grandparent,
      });
    }
  }

  const sibNode: Record<string, Clause> = {};
  for (const cl of clauses) {
    const personCol = cols[cl.p.id]!;
    const pn = makeNode(cl.p, xOf(personCol, cx), yGen2, "side", cl.side);
    pn.photoUrl = photos[cl.p.id] ?? null;
    add(pn);
    sibNode[cl.p.id] = cl;
    if (cl.sp) {
      const spouseCol = cols[cl.sp.id]!;
      const sn = makeNode(cl.sp, xOf(spouseCol, cx), yGen2, "side", cl.side);
      sn.photoUrl = photos[cl.sp.id] ?? null;
      sn.pairWith = cl.p.id;
      pn.pairWith = cl.sp.id;
      add(sn);
      couples.push({
        ids: [cl.p.id, cl.sp.id],
        x: xOf((personCol + spouseCol) / 2, cx),
        y: yGen2,
        side: cl.side,
        size: SIZES.side,
      });
    }
  }

  // ---- trunks, stem, twigs and roots decoration (from final positions) ----
  const trunkSm: Record<Side, Vec[]> = { dad: [], mom: [] };
  for (const side of ["dad", "mom"] as const) {
    const px = side === "dad" ? 1 : -1;
    const start: Vec = { ...meet };
    const tip: Vec = { x: cx + px * TRUNK_SPREAD, y: yGp - TRUNK_ABOVE_GP };
    const pull: Vec = { x: px * 110, y: -90 };
    const rand = seededRandom(`trunk-${side}`);
    const ctrl = quadCtrl(start, tip, pull, rand);
    trunkSm[side] = sampleBezier(start, ctrl, tip, 12);
    branches.push({
      d: taperedPath(start, tip, 60, 24, pull, rand),
      fill: "bark",
      side,
      spine: sampleBezier(start, ctrl, tip, 10),
    });
  }

  branches.push({
    d: taperedPath(
      { x: cx, y: crown.y - SIZES.tamim / 2 + 22 },
      { x: cx, y: meet.y + 8 },
      30,
      22,
      { x: 0, y: -8 },
      seededRandom("stem"),
    ),
    fill: "bark",
    side: "stem",
    spine: sampleBezier(
      { x: cx, y: crown.y - SIZES.tamim / 2 + 22 },
      { x: cx, y: (crown.y + meet.y) / 2 - 40 },
      { x: cx, y: meet.y + 8 },
      5,
    ),
  });

  for (const g of gpBySide) {
    const pxc = g.side === "dad" ? 1 : -1;
    const centerX = xOf(GP_POCKET * pxc, cx);
    branches.push({
      d: roundedRect(centerX - 136, yGp - SIZES.grandparent / 2 - 34, 272, 128, 20),
      fill: "plaque",
      side: g.side,
    });
  }

  const idxAt = (side: Side, y: number): number => {
    const samples = trunkSm[side];
    let best = 0;
    let bd = Infinity;
    samples.forEach((s, i) => {
      const d = Math.abs(s.y - y);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };

  // roots stalks, column twigs and light-paths are built in the great-column
  // loop below, after the trunk samples exist.

  // aunt/uncle twigs: trunk to each clause
  for (const cl of clauses) {
    const anch = trunkSm[cl.side]![idxAt(cl.side, yGen2)]!;
    const pn = byId[cl.p.id]!;
    branches.push({
      d: taperedPath(
        anch,
        { x: pn.x, y: pn.y },
        13,
        6,
        { x: 0, y: 0 },
        seededRandom(`twig-${cl.side}-${cl.p.id}`),
      ),
      fill: "twig",
      side: cl.side,
    });
  }

  // ---- chains: light-path from every person back down to Tamim ----
  const down = (samples: Vec[], tIdx: number): Chain => samples.slice(0, tIdx + 1).reverse();
  const chainVia = (pos: Vec, samples: Vec[], tIdx: number): Chain => [
    pos,
    ...down(samples, tIdx),
    { ...meet },
    { ...crown },
  ];

  if (data.parents?.person) {
    const pn = byId[data.parents.person.id]!;
    chains[pn.id] = chainVia({ x: pn.x, y: pn.y }, trunkSm.dad!, 0);
  }
  if (data.parents?.spouse) {
    const sn = byId[data.parents.spouse.id]!;
    chains[sn.id] = chainVia({ x: sn.x, y: sn.y }, trunkSm.mom!, 0);
  }

  for (const g of gpBySide) {
    const pn = byId[g.person.id]!;
    chains[pn.id] = chainVia({ x: pn.x, y: pn.y }, trunkSm[g.side]!, idxAt(g.side, yGp));
    if (g.spouse)
      chains[g.spouse.id] = chainVia(
        { x: byId[g.spouse.id]!.x, y: byId[g.spouse.id]!.y },
        trunkSm[g.side]!,
        idxAt(g.side, yGp),
      );
  }

  // great aunts'/uncles' columns: roots sit on their band's row at the top,
  // every child hangs directly under its parents' heart, and each one gets a
  // twig from that heart plus a light-path back down to the trunk. A root stalk
  // no longer reaches the central trunk — it drops straight from the matching
  // grandparent plaque (أعمام from the جد plaque, خلان from the جدة plaque).
  for (const gc of greatCols) {
    const rootCol = cols[gc.root.id]!;
    const rootPos: Vec = { x: xOf(rootCol, cx), y: yRootOf(gc.row) };
    const rootChain = chainVia(rootPos, trunkSm[gc.side]!, idxAt(gc.side, rootPos.y));
    chains[gc.root.id] = rootChain;
    const rootNode = makeNode(gc.root, rootPos.x, rootPos.y, "root", gc.side);
    rootNode.photoUrl = photos[gc.root.id] ?? null;
    rootNode.role = friendlyRole(gc.root.relative);
    add(rootNode);

    // the grandparent this column belongs to: grandparents.person is the جد,
    // its spouse the جدة. Each column hangs off its own plaque.
    const gp = gpBySide.find((g) => g.side === gc.side)!;
    const gpId = gc.group === "grandpa" ? gp.person.id : (gp.spouse?.id ?? gp.person.id);
    const gpNode = byId[gpId]!;
    const gpPos: Vec = { x: gpNode.x, y: gpNode.y + halfA(SIZES.grandparent) + 10 };
    branches.push({
      d: taperedPath(
        gpPos,
        rootPos,
        12,
        4,
        { x: 0, y: 10 },
        seededRandom(`great-${gc.side}-${gc.root.id}`),
      ),
      fill: "root",
      side: gc.side,
    });

    let rootHeart: Vec = rootPos;
    if (gc.sp) {
      const spos: Vec = { x: xOf(cols[gc.sp.id]!, cx), y: yRootOf(gc.row) };
      chains[gc.sp.id] = chainVia(spos, trunkSm[gc.side]!, idxAt(gc.side, spos.y));
      const sn = makeNode(gc.sp, spos.x, spos.y, "root", gc.side);
      sn.photoUrl = photos[gc.sp.id] ?? null;
      add(sn);
      rootNode.pairWith = gc.sp.id;
      sn.pairWith = gc.root.id;
      rootHeart = { x: (rootPos.x + spos.x) / 2, y: rootPos.y };
      couples.push({
        ids: [gc.root.id, gc.sp.id],
        x: rootHeart.x,
        y: rootHeart.y,
        side: gc.side,
        size: SIZES.root,
      });
    }
    const placeColNodes = (kids: Desc[], level: number, groupAnchor: Chain, parentPos: Vec) => {
      const y = yRootOf(gc.row) + level * LEVEL_PITCH;
      for (const k of kids) {
        const kpos: Vec = { x: xOf(cols[k.person.id]!, cx), y };
        const kchain: Chain = [kpos, ...groupAnchor];
        chains[k.person.id] = kchain;
        const kn = makeNode(k.person, kpos.x, kpos.y, "cousin", gc.side);
        kn.size = cousinSize(level - 1);
        kn.photoUrl = photos[k.person.id] ?? null;
        kn.role = friendlyRole(k.person.relative);
        add(kn);
        branches.push({
          d: taperedPath(
            parentPos,
            kpos,
            10,
            4,
            { x: 0, y: 0 },
            seededRandom(`twig-${gc.side}-${k.person.id}`),
          ),
          fill: "twig",
          side: gc.side,
        });
        let childHeart: Vec = kpos;
        if (k.spouse) {
          const spos: Vec = { x: xOf(cols[k.spouse.id]!, cx), y };
          chains[k.spouse.id] = [spos, ...groupAnchor];
          const sn = makeNode(k.spouse, spos.x, spos.y, "cousin", gc.side);
          sn.size = cousinSize(level - 1);
          sn.photoUrl = photos[k.spouse.id] ?? null;
          add(sn);
          childHeart = { x: (kpos.x + spos.x) / 2, y };
          couples.push({
            ids: [k.person.id, k.spouse.id],
            x: childHeart.x,
            y: childHeart.y,
            side: gc.side,
            size: cousinSize(level - 1),
          });
        }
        placeColNodes(k.kids, level + 1, kchain, childHeart);
      }
    };
    placeColNodes(gc.kids, 1, rootChain, rootHeart);
  }

  for (const cl of clauses) {
    const pn = byId[cl.p.id]!;
    const sibIdx = idxAt(cl.side, yGen2);
    const chainAnch: Chain = chainVia({ x: pn.x, y: pn.y }, trunkSm[cl.side]!, sibIdx);
    chains[cl.p.id] = chainAnch;
    if (cl.sp) {
      const sn = byId[cl.sp.id]!;
      chains[cl.sp.id] = chainVia({ x: sn.x, y: sn.y }, trunkSm[cl.side]!, sibIdx);
    }
    placeCousins(cl, chainAnch, cx);
  }

  function placeCousins(cl: Clause, parentChain: Chain, center: number) {
    const walkKids = (kids: Desc[], depth: number, anch: Chain, parentPos: Vec) => {
      for (const k of kids) {
        const y = yCousin(depth);
        const pos: Vec = { x: center + cols[k.person.id]! * SLOT, y };
        const chain: Chain = [pos, ...anch];
        chains[k.person.id] = chain;
        const n = makeNode(k.person, pos.x, pos.y, "cousin", cl.side);
        n.size = cousinSize(depth);
        n.photoUrl = photos[k.person.id] ?? null;
        add(n);
        branches.push({
          d: taperedPath(
            parentPos,
            pos,
            8,
            4,
            { x: 0, y: 0 },
            seededRandom(`twig-${cl.side}-${k.person.id}`),
          ),
          fill: "twig",
          side: cl.side,
        });
        let childHeart: Vec = pos;
        if (k.spouse) {
          const spos: Vec = { x: center + cols[k.spouse.id]! * SLOT, y };
          chains[k.spouse.id] = [spos, ...anch];
          const sn = makeNode(k.spouse, spos.x, spos.y, "cousin", cl.side);
          sn.size = cousinSize(depth);
          sn.photoUrl = photos[k.spouse.id] ?? null;
          add(sn);
          childHeart = { x: (pos.x + spos.x) / 2, y };
          couples.push({
            ids: [k.person.id, k.spouse.id],
            x: childHeart.x,
            y: childHeart.y,
            side: cl.side,
            size: cousinSize(depth),
          });
        }
        walkKids(k.kids, depth + 1, chain, childHeart);
      }
    };
    const pnY = yGen2;
    walkKids(
      cl.kids,
      0,
      parentChain,
      cl.sp
        ? { x: (byId[cl.p.id]!.x + byId[cl.sp.id]!.x) / 2, y: pnY }
        : { x: byId[cl.p.id]!.x, y: pnY },
    );
  }

  // Tamim and the parents anchor the composition; everything else just keeps
  // its guaranteed slot distance.
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

  const sibClausesBySide: Record<Side, Clause[]> = { dad: [], mom: [] };
  for (const cl of clauses) sibClausesBySide[cl.side].push(cl);

  for (const side of ["dad", "mom"] as const) {
    scatterLeaves(side, trunkSm[side]!, sibClausesBySide[side], cx, leaves);
  }

  return {
    W,
    H,
    groundY: SCENE.groundY,
    crown,
    meet,
    nodes,
    byId,
    couples,
    branches,
    roots,
    leaves,
    chains,
  };
}

function scatterLeaves(
  side: Side,
  trunkSamples: Vec[],
  sibs: Clause[],
  cx: number,
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
    const sign = p.x >= cx ? 1 : -1;
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
    const k = seededRandom(`leaf-sib-${side}-${sib.p.id}`);
    for (let j = 0; j < 3; j++) {
      leaves.push({
        x: clusterX(side, sib.p.id, j, cx) + k.range(-14, 14),
        y: k.range(300, 1250),
        r: k.range(9, 15),
        rot: k.range(-70, 70),
        variant: k.int(1, 3) as 1 | 2 | 3,
        side,
      });
    }
  }
}

function clusterX(side: Side, id: string, j: number, cx: number) {
  const rand = seededRandom(`leaf-x-${side}-${id}-${j}`);
  return side === "dad" ? cx + rand.range(140, 340) : cx - rand.range(140, 340);
}
