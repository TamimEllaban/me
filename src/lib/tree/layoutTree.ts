/**
 * Pure, data-driven layout for the illustrated family tree scene.
 *
 * The tree grows UP, with Tamim as the living seed at the bottom:
 *
 *   - Tamim                    -> the big golden base at the bottom
 *   - Cousins (children of the
 *     aunts & uncles)          -> the "children" lane just above the base
 *   - Parents + aunts & uncles -> the generation lane above the cousins
 *   - Great aunts & uncles     -> the roots rows (separate lane)
 *   - Grandparents             -> the carved plaque lane at the top
 *
 * Placement is a deterministic two-pass generation-lane layout:
 *
 *   1. Every person owns one "slot" on a 140px grid (avatar + 120px name tag
 *      + a guaranteed MIN_GAP of 20px), so ornaments can never touch.
 *      A couple spans two consecutive slots; siblings share one horizontal
 *      lane and the lane widens as siblings are added (Reingold–Tilford
 *      style subtree widths keep children centered under their parents).
 *   2. Generations stack bottom-up with MIN_GAP between lanes, and the whole
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
export const MIN_GAP = 20;

/** Center-to-center pitch for people sharing a lane (slot width). */
const SLOT = 140;

/** Vertical pitch between the great aunts/uncles rows. */
const ROW_PITCH = 110;

/** Max great-aunts/uncles per roots row, per side. */
const PER_ROW = 4;

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
  H: 1650,
  groundY: 1500,
  crown: { x: 800, y: 1486 },
  meet: { x: 800, y: 1400 },
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
type Desc = { person: FamilyPerson; kids: Desc[]; w: number };

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
  const toDesc = (c: FamilyDescendant, dep: number): Desc => {
    maxDepth.v = Math.max(maxDepth.v, dep);
    return { person: c, kids: c.children.map((k) => toDesc(k, dep + 1)), w: -1 };
  };
  const width = (k: Desc): number => {
    if (k.w < 0)
      k.w = Math.max(
        1,
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

  // ---- children of the great aunts & uncles: one fan per great root ----
  // Descendant trees are built here (not at placement time) so maxDepth picks
  // up their grandchildren and reserves the cousin lanes they need.
  type GkFanEntry = { p: FamilyDescendant; sp?: FamilyPerson; kids: Desc[]; w: number };
  type GkFan = { side: Side; rootId: string; entries: GkFanEntry[] };
  const gkFans: GkFan[] = [];
  const seenFan = new Set<string>();
  for (const b of data.branches) {
    for (const fam of b.greatFamilies ?? []) {
      if (seenFan.has(fam.person.id)) continue;
      seenFan.add(fam.person.id);
      gkFans.push({
        side: greatSide(fam.person.relative.relationship),
        rootId: fam.person.id,
        entries: fam.children.map((c) => {
          const kids = c.children.map((k) => toDesc(k, 0));
          const entry: GkFanEntry = {
            p: c,
            kids,
            w: Math.max(
              c.spouse ? 2 : 1,
              kids.reduce((s, k) => s + width(k), 0),
            ),
          };
          if (c.spouse) entry.sp = c.spouse;
          return entry;
        }),
      });
    }
  }

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

  const sideCells: Record<Side, number> = { dad: 0, mom: 0 };
  const byGreatSide: Record<Side, FamilyPerson[]> = { dad: [], mom: [] };
  for (const g of greats) {
    byGreatSide[g.side].push(g.person);
    sideCells[g.side] = Math.ceil(byGreatSide[g.side].length / PER_ROW);
  }
  const maxRows = Math.max(1, sideCells.dad, sideCells.mom);

  const laneOrder: { id: string; size: number }[] = [];
  for (let d = maxDepth.v; d >= 0; d--) laneOrder.push({ id: `c${d}`, size: cousinSize(d) });
  laneOrder.push(
    { id: "gen2", size: SIZES.parent },
    { id: "gk", size: cousinSize(0) },
    { id: "greats", size: SIZES.root },
  );

  const yLane: Record<string, number> = {};
  let accY = SCENE.crown.y;
  let prevHalfB = halfB(SIZES.tamim);
  for (const lane of laneOrder) {
    accY -= prevHalfB + halfA(lane.size) + MIN_GAP;
    yLane[lane.id] = accY;
    prevHalfB = halfB(lane.size);
  }
  const yGen2 = yLane["gen2"]!;
  const yGk = yLane["gk"]!;
  const yGreatBot = yLane["greats"]!;
  const yGp =
    yGreatBot -
    (maxRows - 1) * ROW_PITCH -
    (halfB(SIZES.root) + halfA(SIZES.grandparent) + MIN_GAP);
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

  const placeDesc = (parentCol: number, kids: Desc[]) => {
    if (!kids.length) return;
    const total = kids.reduce((s, k) => s + width(k), 0);
    let c = parentCol - total / 2;
    for (const k of kids) {
      const cc = c + width(k) / 2;
      cols[k.person.id] = cc;
      track(cc);
      placeDesc(cc, k.kids);
      c += width(k);
    }
  };
  for (const cl of clauses) placeDesc(cl.leftCol + cl.w / 2, cl.kids);

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

  // great aunts & uncles fill rows of PER_ROW per side, bottom-up
  const greatPlaces: { p: FamilyPerson; side: Side; col: number; y: number }[] = [];
  for (const side of ["dad", "mom"] as const) {
    const people = byGreatSide[side];
    const pocket = side === "dad" ? GP_POCKET : -GP_POCKET;
    let i = 0;
    let row = 0;
    while (i < people.length) {
      const k = Math.min(PER_ROW, people.length - i);
      const startCol = pocket - (k - 1) / 2;
      for (let j = 0; j < k; j++) {
        const col = startCol + j;
        cols[people[i + j]!.id] = col;
        track(col);
        greatPlaces.push({ p: people[i + j]!, side, col, y: yGreatBot - row * ROW_PITCH });
      }
      i += k;
      row++;
    }
  }

  // great aunts' & uncles' own children hang in the "gk" lane, their kids
  // cascade down into the cousin lanes. Because all great-kin share one lane
  // while their parents sit on several root rows, fans are block-packed per
  // side (owning their full subtree width) instead of centering on the great's
  // column — that keeps every slot on the 140px grid, touch-free.
  type GkRow = {
    side: Side;
    rootId: string;
    p: FamilyPerson;
    sp?: FamilyPerson;
    col: number;
    spCol: number;
    kids: Desc[];
  };
  const gkRows: GkRow[] = [];
  let fanCursorR = 1.5;
  let fanCursorL = -1.5;
  for (const fan of gkFans) {
    const fw = fan.entries.reduce((s, e) => s + e.w, 0);
    if (fw <= 0) continue;
    const leftCol = fan.side === "dad" ? fanCursorR : fanCursorL - fw;
    if (fan.side === "dad") fanCursorR += fw;
    else fanCursorL -= fw;
    const px = fan.side === "dad" ? 1 : -1;
    let c = leftCol;
    for (const e of fan.entries) {
      const cc = c + e.w / 2;
      if (e.sp) {
        const personCol = cc + px * 0.5;
        const spCol = cc - px * 0.5;
        cols[e.p.id] = personCol;
        cols[e.sp.id] = spCol;
        track(personCol);
        track(spCol);
        gkRows.push({
          side: fan.side,
          rootId: fan.rootId,
          p: e.p,
          sp: e.sp,
          col: personCol,
          spCol,
          kids: e.kids,
        });
      } else {
        cols[e.p.id] = cc;
        track(cc);
        gkRows.push({
          side: fan.side,
          rootId: fan.rootId,
          p: e.p,
          col: cc,
          spCol: cc,
          kids: e.kids,
        });
      }
      placeDesc(cc, e.kids);
      c += e.w;
    }
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

  for (const r of greatPlaces) {
    const n = makeNode(r.p, xOf(r.col, cx), r.y, "root", r.side);
    n.photoUrl = photos[r.p.id] ?? null;
    n.role = friendlyRole(r.p.relative);
    add(n);
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

  // roots stalks: trunk to each great-aunt/uncle
  for (const r of greatPlaces) {
    const anch = trunkSm[r.side]![idxAt(r.side, r.y)]!;
    const pos: Vec = { x: xOf(r.col, cx), y: r.y };
    branches.push({
      d: taperedPath(anch, pos, 13, 4, { x: 0, y: 4 }, seededRandom(`great-${r.side}-${r.p.id}`)),
      fill: "root",
      side: r.side,
    });
  }

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

  for (const r of greatPlaces) {
    chains[r.p.id] = chainVia(
      { x: byId[r.p.id]!.x, y: byId[r.p.id]!.y },
      trunkSm[r.side]!,
      idxAt(r.side, r.y),
    );
  }

  // great aunts'/uncles' children on the "gk" lane, plus their own kids
  // cascading down the cousin lanes; every one hangs a twig from its branch
  // and a light-path back to the trunk.
  for (const gg of gkRows) {
    const rootChain = chains[gg.rootId] ?? [];
    const pos: Vec = { x: xOf(gg.col, cx), y: yGk };
    const chain: Chain = [pos, ...rootChain];
    chains[gg.p.id] = chain;
    const n = makeNode(gg.p, pos.x, pos.y, "cousin", gg.side);
    n.size = cousinSize(0);
    n.photoUrl = photos[gg.p.id] ?? null;
    n.role = friendlyRole(gg.p.relative);
    add(n);
    const rootPos: Vec = { x: byId[gg.rootId]!.x, y: byId[gg.rootId]!.y };
    branches.push({
      d: taperedPath(rootPos, pos, 12, 5, { x: 0, y: 2 }, seededRandom(`gk-${gg.side}-${gg.p.id}`)),
      fill: "twig",
      side: gg.side,
    });
    if (gg.sp) {
      const spos: Vec = { x: xOf(gg.spCol, cx), y: yGk };
      const sn = makeNode(gg.sp, spos.x, spos.y, "cousin", gg.side);
      sn.size = cousinSize(0);
      sn.photoUrl = photos[gg.sp.id] ?? null;
      sn.role = friendlyRole(gg.sp.relative);
      add(sn);
      couples.push({
        ids: [gg.p.id, gg.sp.id],
        x: (pos.x + spos.x) / 2,
        y: yGk,
        side: gg.side,
        size: cousinSize(0),
      });
    }
    const walkGkKids = (kids: Desc[], depth: number, anch: Chain) => {
      for (const k of kids) {
        const kpos: Vec = { x: cx + cols[k.person.id]! * SLOT, y: yCousin(depth) };
        const kchain: Chain = [kpos, ...anch];
        chains[k.person.id] = kchain;
        const kn = makeNode(k.person, kpos.x, kpos.y, "cousin", gg.side);
        kn.size = cousinSize(depth);
        kn.photoUrl = photos[k.person.id] ?? null;
        kn.role = friendlyRole(k.person.relative);
        add(kn);
        branches.push({
          d: taperedPath(
            anch[0]!,
            kpos,
            8,
            4,
            { x: 0, y: 0 },
            seededRandom(`gk-${gg.side}-${k.person.id}`),
          ),
          fill: "twig",
          side: gg.side,
        });
        walkGkKids(k.kids, depth + 1, kchain);
      }
    };
    walkGkKids(gg.kids, 0, chain);
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
    const walkKids = (kids: Desc[], depth: number, anch: Chain) => {
      for (const k of kids) {
        const pos: Vec = { x: center + cols[k.person.id]! * SLOT, y: yCousin(depth) };
        const chain: Chain = [pos, ...anch];
        chains[k.person.id] = chain;
        const n = makeNode(k.person, pos.x, pos.y, "cousin", cl.side);
        n.size = cousinSize(depth);
        n.photoUrl = photos[k.person.id] ?? null;
        add(n);
        const parentPos = anch[0]!;
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
        walkKids(k.kids, depth + 1, chain);
      }
    };
    walkKids(cl.kids, 0, parentChain);
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
