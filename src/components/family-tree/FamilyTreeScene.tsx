import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { RelativeLike } from "@/components/relative-editor";
import {
  layoutTree,
  nodeBounds,
  pickPhotoUrl,
  type FocusGroup,
  type TreeNode,
  type Vec,
} from "@/lib/tree/layoutTree";
import { seededRandom } from "@/lib/tree/seededRandom";
import type { FamilyData } from "@/lib/family-data";
import { PersonOrnament } from "./PersonOrnament";
import { CoupleOrnament } from "./CoupleOrnament";
import { TrunkBranch } from "./TrunkBranch";
import { LeafField } from "./LeafField";
import { SceneBackground } from "./SceneBackground";
import { BranchFocusTabs, SceneToolbar } from "./BranchFocusTabs";
import { PersonPopover } from "./PersonPopover";
import { PersonDialog } from "./PersonDialog";

const MIN_K = 0.18;
const MAX_K = 3.2;

type Camera = { k: number; tx: number; ty: number };

function worldPoint(c: Camera, sx: number, sy: number, r: DOMRect): Vec {
  return { x: (sx - r.left - c.tx) / c.k, y: (sy - r.top - c.ty) / c.k };
}

export function FamilyTreeScene({
  data,
  relatives,
  childHero,
  onDone,
}: {
  data: FamilyData;
  relatives: RelativeLike[];
  childHero: string | null;
  onDone: () => void;
}) {
  const layout = useMemo(
    () => layoutTree(data, { photos: pickPhotoUrl(relatives), childPhotoUrl: childHero }),
    [data, relatives, childHero],
  );

  // ---------- grow sequence ----------
  const growOrder = useMemo(() => {
    const order = [...layout.nodes].sort((a, b) => {
      const rank = (n: TreeNode) =>
        n.kind === "root"
          ? 0
          : n.kind === "cousin"
            ? 1
            : n.kind === "side"
              ? 2
              : n.kind === "grandparent"
                ? 3
                : n.kind === "parent"
                  ? 5
                  : 6;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return a.y - b.y;
    });
    return order.map((n) => n.id);
  }, [layout]);

  const growIndex = useMemo(() => {
    const m: Record<string, number> = {};
    growOrder.forEach((id, i) => {
      m[id] = i;
    });
    return m;
  }, [growOrder]);

  const [grown, setGrown] = useState(false);
  const [night, setNight] = useState(false);
  const [focus, setFocus] = useState<FocusGroup>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setDebug(window.location.search.includes("debugLayout"));
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const bgWrapRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<Camera>({ k: 1, tx: 0, ty: 0 });
  const gestureRef = useRef<{
    points: Map<number, { x: number; y: number }>;
    mode: "idle" | "pan" | "pinch";
    startCam: Camera;
    startDist: number;
    startMid: Vec;
    lastTap: { t: number; sx: number; sy: number } | null;
    moved: boolean;
  }>({
    points: new Map(),
    mode: "idle",
    startCam: { k: 1, tx: 0, ty: 0 },
    startDist: 0,
    startMid: { x: 0, y: 0 },
    lastTap: null,
    moved: false,
  });
  const parRef = useRef<Vec>({ x: 0, y: 0 });
  const parTarget = useRef<Vec>({ x: 0, y: 0 });
  const rafRef = useRef(0);

  // ---------- camera helpers ----------
  const applyWorld = () => {
    const el = worldRef.current;
    if (!el) return;
    const c = camRef.current;
    el.style.transform = `translate(${c.tx}px, ${c.ty}px) scale(${c.k})`;
  };
  const easeWorld = () => {
    const el = worldRef.current;
    if (!el) return;
    el.style.transition = "transform 720ms cubic-bezier(.22,1,.36,1)";
    applyWorld();
    window.setTimeout(() => {
      if (worldRef.current) worldRef.current.style.transition = "none";
    }, 760);
  };

  const boxOf = (f: FocusGroup): { cx: number; cy: number; w: number; h: number } => {
    const ids = layout.nodes.filter((n) => (f === "all" ? true : n.focusGroup === f));
    if (ids.length === 0) {
      return { cx: layout.W / 2, cy: layout.H / 2, w: 600, h: 800 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of ids) {
      const b = nodeBounds(n);
      minX = Math.min(minX, b.left);
      maxX = Math.max(maxX, b.right);
      minY = Math.min(minY, b.top);
      maxY = Math.max(maxY, b.bottom);
    }
    const pad = f === "all" ? 60 : 90;
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    };
  };

  const fitBox = (box: { cx: number; cy: number; w: number; h: number }, animated: boolean) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let k = Math.min((r.width - 20) / box.w, (r.height - 20) / box.h);
    k = Math.min(MAX_K, Math.max(MIN_K, k));
    camRef.current = {
      k,
      tx: r.width / 2 - box.cx * k,
      ty: r.height / 2 - box.cy * k,
    };
    if (animated) easeWorld();
    else applyWorld();
  };

  const fitTo = (f: FocusGroup, animated: boolean) => {
    fitBox(boxOf(f), animated);
  };

  const resetView = () => {
    setFocus("all");
    fitTo("all", true);
  };

  // ---------- init ----------
  useLayoutEffect(() => {
    // open on the view that shows the whole tree
    fitTo("all", false);
    applyWorld();
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(rm.matches);
    const onChange = () => setReducedMotion(rm.matches);
    rm.addEventListener?.("change", onChange);
    const t = window.setTimeout(() => setGrown(true), 120);
    return () => {
      window.clearTimeout(t);
      rm.removeEventListener?.("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- auto degrade ----------
  useEffect(() => {
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
      setDegraded(true);
      return;
    }
    let frames = 0;
    let t0 = performance.now();
    let lowCount = 0;
    let killed = false;
    const tick = () => {
      if (killed) return;
      frames++;
      const now = performance.now();
      if (now - t0 >= 2000) {
        const fps = frames / ((now - t0) / 1000);
        frames = 0;
        t0 = now;
        if (fps < 40) {
          lowCount++;
          if (lowCount >= 2) {
            setDegraded(true);
            return;
          }
        } else lowCount = 0;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      killed = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ---------- pointer parallax (faces desktop) ----------
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      parTarget.current = {
        x: ((e.clientX - r.left) / r.width - 0.5) * 2,
        y: ((e.clientY - r.top) / r.height - 0.5) * 2,
      };
    };
    const loop = () => {
      const p = parRef.current;
      p.x += (parTarget.current.x - p.x) * 0.08;
      p.y += (parTarget.current.y - p.y) * 0.08;
      const wrap = bgWrapRef.current;
      if (wrap) wrap.style.transform = `translate3d(${p.x * 10}px, ${p.y * 8}px, 0)`;
      rafRef.current = requestAnimationFrame(loop);
    };
    el.addEventListener("pointermove", onMove);
    if (window.matchMedia("(pointer: fine)").matches && !reducedMotion && !degraded) {
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, degraded]);

  // ---------- pans / pinch / taps ----------
  const getPoints = (e: ReactPointerEvent) => {
    const r = rootRef.current!.getBoundingClientRect();
    const map = gestureRef.current.points;
    const arr: Vec[] = [];
    map.forEach((p) => arr.push({ x: p.x - r.left, y: p.y - r.top }));
    return arr;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (!grown) {
      setGrown(true);
      return;
    }
    const g = gestureRef.current;
    const r = rootRef.current!.getBoundingClientRect();
    g.points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    g.mode = g.points.size === 2 ? "pinch" : "pan";
    g.moved = false;
    g.startCam = { ...camRef.current };
    if (g.points.size === 2) {
      const pts = getPoints(e);
      g.startMid = { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
      g.startDist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
    }
    if (worldRef.current) worldRef.current.style.transition = "none";
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.points.has(e.pointerId)) return;
    const r = rootRef.current!.getBoundingClientRect();
    const prev = g.points.get(e.pointerId)!;
    g.points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y) > 4) g.moved = true;

    if (g.mode === "pinch" && g.points.size >= 2) {
      const pts = getPoints(e);
      const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) || 1;
      const mid = { x: (pts[0]!.x + pts[1]!.x) / 2, y: (pts[0]!.y + pts[1]!.y) / 2 };
      const ratio = dist / (g.startDist || 1);
      const k = Math.min(MAX_K, Math.max(MIN_K, g.startCam.k * ratio));
      const base = g.startCam;
      camRef.current = {
        k,
        tx: mid.x - (g.startMid.x - base.tx) * (k / base.k),
        ty: mid.y - (g.startMid.y - base.ty) * (k / base.k),
      };
      applyWorld();
    } else if (g.mode === "pan") {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      camRef.current = {
        ...camRef.current,
        tx: camRef.current.tx + dx,
        ty: camRef.current.ty + dy,
      };
      applyWorld();
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g.points.has(e.pointerId)) return;
    g.points.delete(e.pointerId);
    if (g.points.size === 0) {
      const now = performance.now();
      const r = rootRef.current!.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      if (
        g.mode === "pan" &&
        !g.moved &&
        now - (g.lastTap?.t ?? 0) < 360 &&
        Math.hypot(sx - (g.lastTap?.sx ?? 0), sy - (g.lastTap?.sy ?? 0)) < 40
      ) {
        // double-tap: toggle zoom centered at tap
        const wasZoomed = camRef.current.k > 1.6;
        const target = wasZoomed ? 1.1 : 2.2;
        const c = camRef.current;
        const k = target;
        camRef.current = { k, tx: sx - (sx - c.tx) * (k / c.k), ty: sy - (sy - c.ty) * (k / c.k) };
        easeWorld();
        g.lastTap = null;
      } else {
        if (!g.moved) g.lastTap = { t: now, sx, sy };
      }
      g.mode = "idle";
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = rootRef.current!.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const c = camRef.current;
    const ratio = Math.exp(-e.deltaY * 0.0015);
    const k = Math.min(MAX_K, Math.max(MIN_K, c.k * ratio));
    camRef.current = { k, tx: sx - (sx - c.tx) * (k / c.k), ty: sy - (sy - c.ty) * (k / c.k) };
    if (worldRef.current) worldRef.current.style.transition = "none";
    applyWorld();
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const wheel = (e: Event) => {
      e.preventDefault();
      onWheel(e as WheelEvent);
    };
    el.addEventListener("wheel", wheel as EventListener, { passive: false });
    return () => el.removeEventListener("wheel", wheel as EventListener);
  }, []);

  // ---------- keyboard navigation (a11y mirror) ----------
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setSelectedId(null);
      return;
    }
    const dir =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0;
    if (dir === 0) return;
    const active = document.activeElement;
    if (!active || !active.id.startsWith("ftree-orn-")) return;
    const idx = growOrder.indexOf(active.id.replace("ftree-orn-", ""));
    if (idx === -1) return;
    const next = growOrder[(idx + dir + growOrder.length) % growOrder.length]!;
    document.getElementById(`ftree-orn-${next}`)?.focus();
    setSelectedId(next);
    e.preventDefault();
  };

  // ---------- tap -> select (ornament buttons stopPropagation) ----------
  const selectPerson = (id: string) => {
    setSelectedId(id);
  };
  const clearSelection = () => setSelectedId(null);

  // ---------- data for popover / dialog ----------
  const selectedNode = selectedId ? layout.byId[selectedId] : null;
  const selectedRel = selectedId ? relatives.find((r) => r.id === selectedId) : null;
  const editPerson = editId ? relatives.find((r) => r.id === editId) : null;

  // ---------- light path ----------
  const lightPoints =
    selectedId && layout.chains[selectedId]
      ? layout.chains[selectedId].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      : null;

  // ---------- particles ----------
  const particles = useMemo(() => {
    if (reducedMotion) return [];
    const rand = seededRandom("particles");
    const count = Math.min(24, 14 + rand.int(0, 10));
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand.range(20, layout.W - 20),
      y: rand.range(20, 900),
      size: night ? rand.range(3, 6) : rand.range(2, 5),
      dur: rand.range(9, 18),
      delay: rand.range(0, 12),
      drift: rand.next() > 0.5 ? 1 : -1,
      night,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, night, degraded]);

  // pause when tab hidden
  useEffect(() => {
    const onVis = () => rootRef.current?.classList.toggle("scene-paused", document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const noFx = reducedMotion || degraded;

  return (
    <div
      ref={rootRef}
      className={`scene-viewport relative w-full touch-none select-none overflow-hidden rounded-2xl border border-border bg-tree-paper shadow-keepsake ${noFx ? "no-effects" : ""} ${night ? "scene-night" : ""}`}
      style={{ height: "min(74svh, 820px)", minHeight: 420 }}
      dir="rtl"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={0}
      aria-label="شجرة العائلة المصوّرة"
    >
      {/* controls */}
      <div className="absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-2 p-3">
        <div className="w-full max-w-xs">
          <BranchFocusTabs
            value={focus}
            onChange={(f) => {
              setFocus(f);
              fitTo(f, true);
            }}
          />
        </div>
        <SceneToolbar night={night} onNight={() => setNight((v) => !v)} onReset={resetView} />
      </div>

      <div
        ref={worldRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ width: layout.W, height: layout.H }}
      >
        {/* parallax backdrop */}
        <div ref={bgWrapRef} className="absolute inset-0 will-change-transform">
          <svg width={layout.W} height={layout.H} aria-hidden="true">
            <SceneBackground night={night} par={{ x: 0, y: 0 }} w={layout.W} />
            <defs>
              <radialGradient id="soilGrad">
                <stop offset="0%" stopColor="#7c4c2a" />
                <stop offset="100%" stopColor="#8a5a34" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse
              cx={layout.crown.x}
              cy={layout.crown.y + 56}
              rx={140}
              ry={22}
              fill="url(#soilGrad)"
              opacity={0.9}
            />
          </svg>
        </div>

        {/* wood geometry + leaves + light path */}
        <svg width={layout.W} height={layout.H} className="absolute inset-0" aria-hidden="true">
          <g className="trunk-grow">
            <TrunkBranch branches={layout.branches} />
          </g>
          <LeafField leaves={layout.leaves} night={night} />
          {lightPoints && (
            <g className={`light-path ${night ? "light-night" : ""}`}>
              <polyline
                points={lightPoints}
                fill="none"
                stroke="rgba(255,215,94,0.35)"
                strokeWidth={14}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={lightPoints}
                fill="none"
                stroke="#ffd75e"
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
          {debug && (
            <g
              pointerEvents="none"
              fill="rgba(220,38,38,0.10)"
              stroke="rgba(220,38,38,0.6)"
              strokeWidth={1}
            >
              {layout.nodes.map((n) => {
                const b = nodeBounds(n);
                return (
                  <rect
                    key={n.id}
                    x={b.left}
                    y={b.top}
                    width={b.right - b.left}
                    height={b.bottom - b.top}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* hanging ornaments (HTML, tappable) */}
        <div className="absolute inset-0" dir="rtl">
          {layout.nodes.map((n) => (
            <PersonOrnament
              key={n.id}
              node={n}
              grown={grown}
              growIndex={growIndex[n.id] ?? 0}
              selected={selectedId === n.id}
              onSelect={selectPerson}
            />
          ))}
          {layout.couples.map((c) => (
            <CoupleOrnament
              key={c.ids.join("-")}
              couple={c}
              grown={grown}
              growIndex={growIndex[c.ids[0]] ?? 0}
            />
          ))}
        </div>

        {/* ambient life */}
        {!noFx && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {particles.map((p) => (
              <span
                key={p.id}
                className={night ? "particle firefly" : "particle pollen"}
                style={
                  {
                    left: p.x,
                    top: p.y,
                    width: p.size,
                    height: p.size,
                    ["--drift" as string]: p.drift,
                    animationDuration: `${p.dur}s`,
                    animationDelay: `${p.delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}
            <span className="bird" />
          </div>
        )}
      </div>

      {/* popover under the controls */}
      {selectedNode && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 p-3">
          <div className="pointer-events-auto w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            {selectedRel || selectedNode.id === "tamim" ? (
              <PersonPopover
                node={selectedNode}
                relative={
                  selectedRel ?? {
                    id: "tamim",
                    name: selectedNode.name,
                    relationship: selectedNode.role,
                    group: "Parents",
                    image: childHero ?? "",
                    fact: "",
                    bio: data.rootSubtitle,
                    parentId: null,
                    spouseId: null,
                  }
                }
                onEdit={() => setEditId(selectedNode.id)}
                onClose={clearSelection}
              />
            ) : null}
          </div>
        </div>
      )}

      {editPerson && (
        <PersonDialog
          person={editPerson}
          relatives={relatives}
          onDone={onDone}
          open
          onOpenChange={(o) => !o && setEditId(null)}
        />
      )}
    </div>
  );
}

export default FamilyTreeScene;
