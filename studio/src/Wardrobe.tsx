import React from "react";
import {
  ACC, AccPiece, BOTTOM, BottomPiece, Colors, FOOT, FeetPiece, HEAD, HeadPiece, OUTER, OuterPiece, PatternId, TOP, TopPiece, Wear,
} from "./wardrobe-data";

// Batch 2: layered wardrobe. The catalogue and the seeded picker are in wardrobe-data.ts (plain data, also read by
// scripts/dress.mjs); this file draws the pieces for the front / back figure (People.tsx Figure) and the walking
// side view (PersonSide). 100 units = 1 m. Front/back pieces are drawn with the hip at y = 0, y down.
export * from "./wardrobe-data";

export type Pt = { x: number; y: number };
export type ArmPts = { sh: Pt; el: Pt; hd: Pt };
export type LegPts = { hip: Pt; knee: Pt; foot: Pt };
export type Look = { top: TopPiece; bottom: BottomPiece; outer?: OuterPiece; head?: HeadPiece; acc: AccPiece[]; feet: FeetPiece; c: Colors; pattern: PatternId; has: (k: AccPiece["kind"]) => boolean };

export const lookOf = (w: Wear): Look => {
  const acc = w.acc.map((a) => ACC[a]).filter(Boolean);
  return { top: TOP[w.top], bottom: BOTTOM[w.bottom], outer: w.outer ? OUTER[w.outer] : undefined, head: w.head ? HEAD[w.head] : undefined, acc, feet: FOOT[w.feet], c: w.colors, pattern: w.pattern, has: (k) => acc.some((a) => a.kind === k) };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const LINE = "rgba(0,0,0,.22)";
const SHADE = "rgba(0,0,0,.16)";
/** Darken (k < 1) or lighten (k > 1) a #rrggbb colour. */
export const tint = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

// ---------- patterns ----------
const Tile: React.FC<{ id: string; kind: PatternId | "batik" | "sarong"; base: string; ink: string }> = ({ id, kind, base, ink }) => {
  const P = (s: number, kids: React.ReactNode) => (
    <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">
      <rect width={s} height={s} fill={base} />
      {kids}
    </pattern>
  );
  if (kind === "stripes") return P(6, <rect width={6} height={1.8} fill={ink} opacity={0.85} />);
  if (kind === "check" || kind === "sarong")
    return P(kind === "sarong" ? 9 : 7, <g fill={ink} opacity={0.45}><rect width={kind === "sarong" ? 2.6 : 1.3} height={9} /><rect height={kind === "sarong" ? 2.6 : 1.3} width={9} /></g>);
  if (kind === "floral" || kind === "batik") {
    const fl = (x: number, y: number, r: number) => (
      <g key={`${x}${y}`}>
        {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={x + Math.cos((a * Math.PI) / 180) * r} cy={y + Math.sin((a * Math.PI) / 180) * r} r={r * 0.62} fill={ink} />)}
        <circle cx={x} cy={y} r={r * 0.5} fill={kind === "batik" ? base : "#f3c044"} />
      </g>
    );
    return P(kind === "batik" ? 9 : 11, <>{fl(3, 3, kind === "batik" ? 1.1 : 1.3)}{fl(kind === "batik" ? 7.5 : 8.5, kind === "batik" ? 7.5 : 8.5, 0.8)}</>);
  }
  if (kind === "plaid")
    return P(12, (
      <>
        <rect width={4.5} height={12} fill={ink} opacity={0.45} />
        <rect height={4.5} width={12} fill={ink} opacity={0.45} />
        <rect x={8} width={0.8} height={12} fill="#fff" opacity={0.7} />
        <rect y={8} height={0.8} width={12} fill="#fff" opacity={0.7} />
        <rect x={10.5} width={0.6} height={12} fill="rgba(0,0,0,.35)" />
        <rect y={10.5} height={0.6} width={12} fill="rgba(0,0,0,.35)" />
      </>
    ));
  return P(4, null);
};

/** <defs> for one person; returns paints keyed by use. */
export const usePaints = (id: string, L: Look) => {
  const top = L.pattern === "plain" ? L.c.top : `url(#${id}pt)`;
  const bottomKind = L.bottom.batik ? "batik" : L.bottom.checks ? "sarong" : null;
  const bottom = bottomKind ? `url(#${id}pb)` : L.c.bottom;
  const plaidAcc = `url(#${id}pa)`, plaidHead = `url(#${id}ph)`;
  const defs = (
    <defs>
      {L.pattern !== "plain" && <Tile id={`${id}pt`} kind={L.pattern} base={L.c.top} ink={L.c.top2} />}
      {bottomKind && <Tile id={`${id}pb`} kind={bottomKind} base={L.c.bottom} ink={L.c.bottom2} />}
      {L.has("waistcloth") && <Tile id={`${id}pa`} kind="plaid" base={L.c.acc} ink="#f1e9d6" />}
      {L.head?.kind === "band" && <Tile id={`${id}ph`} kind="plaid" base={L.c.head} ink="#f1e9d6" />}
    </defs>
  );
  return { defs, top, bottom, plaidAcc, plaidHead };
};
export type Paints = ReturnType<typeof usePaints>;

// ---------- shared geometry helpers ----------
/** Points along a polyline whose segments count equally, up to fraction f (0..1). */
export const along = (pts: Pt[], f: number): Pt[] => {
  const n = pts.length - 1;
  const t = Math.max(0, Math.min(1, f)) * n;
  const i = Math.min(n - 1, Math.floor(t));
  const out = pts.slice(0, i + 1);
  const a = pts[i], b = pts[i + 1];
  out.push({ x: lerp(a.x, b.x, t - i), y: lerp(a.y, b.y, t - i) });
  return out;
};
const poly = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
const armPts = (a: ArmPts) => [a.sh, a.el, a.hd];

// ---------- sleeves (front, back and side) ----------
/** Top sleeve plus the outer layer's sleeve and a wristwatch; draw after the bare arm, before the hand. */
export const Sleeves: React.FC<{ a: ArmPts; L: Look; paint: Paints; limb: number; watch: boolean; coat?: boolean; face?: boolean }> = ({ a, L, paint, limb, watch, coat, face = true }) => {
  const t = L.top, o = coat ? undefined : L.outer;
  const pts = armPts(a);
  const sl = t.sabai ? 0 : t.sleeve;
  const w = limb * 1.05 * (t.sleeveW ?? 1);
  const end = sl > 0 ? along(pts, sl) : null;
  const tip = end ? end[end.length - 1] : null;
  const prev = end ? end[end.length - 2] : null;
  const cuff = (p: Pt, q: Pt, col: string, width: number) => {
    const d = Math.hypot(p.x - q.x, p.y - q.y) || 1;
    const u = { x: (p.x - q.x) / d, y: (p.y - q.y) / d };
    return <path d={`M ${p.x - u.x * 2.4} ${p.y - u.y * 2.4} L ${p.x} ${p.y}`} stroke={col} strokeWidth={width} strokeLinecap="butt" />;
  };
  const ws = along(pts, 0.93);
  const wr = ws[ws.length - 1];
  const wDir = Math.atan2(a.hd.y - a.el.y, a.hd.x - a.el.x) * (180 / Math.PI);
  const os = o && o.sleeve > 0 ? along(pts, o.sleeve) : null;
  return (
    <g>
      {watch && (
        <g transform={`translate(${wr.x} ${wr.y}) rotate(${wDir})`}>
          <rect x={-1.6} y={-limb * 0.46} width={3.2} height={limb * 0.92} rx={1} fill={L.c.acc === "#d9b45a" ? "#3a2a20" : "#2b2b2b"} />
          {face && <circle r={limb * 0.24} fill="#e8e2d6" stroke="#9a9692" strokeWidth={0.6} />}
        </g>
      )}
      {end && <path d={poly(end)} fill="none" stroke={paint.top} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />}
      {end && tip && prev && (t.jersey ? cuff(tip, prev, L.c.top2, w) : t.neck === "hood" ? cuff(tip, prev, tint(L.c.top, 0.82), w * 0.92) : null)}
      {os && (
        <>
          <path d={poly(os)} fill="none" stroke={tint(L.c.outer, 0.78)} strokeWidth={limb * 1.32} strokeLinecap="round" strokeLinejoin="round" />
          <path d={poly(os)} fill="none" stroke={L.c.outer} strokeWidth={limb * 1.16} strokeLinecap="round" strokeLinejoin="round" />
          {o?.id === "denim" && cuff(os[os.length - 1], os[os.length - 2], tint(L.c.outer, 0.82), limb * 1.1)}
        </>
      )}
    </g>
  );
};

// ---------- tops, front and back ----------
export type BodyGeo = { sw: number; hw: number; shY: number; torso: number; limb: number; R: number; legLen: number; torsoD: string; clip: string; seed: number };

export const TopFront: React.FC<{ g: BodyGeo; L: Look; paint: Paints; skin: string; back: boolean }> = ({ g, L, paint, skin, back }) => {
  const { sw, hw, shY, torso, R } = g;
  const t = L.top;
  const k = back ? -1 : 1; // asymmetric details mirror in the back view
  const ink = L.c.top2;
  const dark = tint(L.c.top, 0.75);
  const yy = (f: number) => shY + torso * f;
  const btn = (ys: number[], fill: string, r = 1.05) => ys.map((f) => <circle key={f} cx={0} cy={yy(f)} r={r} fill={fill} />);
  const btnFill = t.buttons === "gold" ? "#d9b45a" : t.buttons === "knot" ? tint(L.c.top, 0.6) : L.c.top === "#f7f7f4" || L.c.top === "#f4f4f4" ? "#c9c9c9" : tint(L.c.top, 1.45);

  if (t.sabai) {
    // breast cloth: wrapped round the chest, the end thrown over one shoulder and hanging down the back
    const wrap = `M ${-sw - 6} ${yy(0.16)} L ${sw + 6} ${yy(0.34)} L ${sw + 6} 6 L ${-sw - 6} 6 Z`;
    return (
      <g>
        <path d={g.torsoD} fill={skin} />
        <g clipPath={`url(#${g.clip})`}>
          <path d={back ? `M ${-sw - 6} ${yy(0.3)} L ${sw + 6} ${yy(0.3)} L ${sw + 6} 6 L ${-sw - 6} 6 Z` : wrap} fill={paint.top} />
          {[-0.6, -0.2, 0.2, 0.6].map((f) => <line key={f} x1={sw * f} x2={sw * f * 1.1} y1={yy(0.36)} y2={2} stroke={SHADE} strokeWidth={0.9} />)}
          <path d={back ? `M ${-sw - 6} ${yy(0.3)} L ${sw + 6} ${yy(0.3)}` : `M ${-sw - 6} ${yy(0.16)} L ${sw + 6} ${yy(0.34)}`} stroke={ink} strokeWidth={1.6} />
          {back && <path d={`M ${k * sw * 0.15} ${shY - 2} L ${k * sw * 0.95} ${shY - 2} L ${-k * hw * 0.2} -1 L ${-k * hw * 0.95} -1 Z`} fill={paint.top} stroke={dark} strokeWidth={0.8} />}
        </g>
      </g>
    );
  }

  const neck = (() => {
    const n = t.neck;
    if (back) {
      if (n === "collar" || n === "polo" || n === "softcollar" || n === "stand" || n === "lapel")
        return <path d={`M ${-R * 0.62} ${shY - 2.5} Q 0 ${shY - 0.5} ${R * 0.62} ${shY - 2.5} L ${R * 0.66} ${shY + 1.2} Q 0 ${shY + 3} ${-R * 0.66} ${shY + 1.2} Z`} fill={n === "lapel" ? L.c.top : paint.top} stroke={LINE} strokeWidth={0.9} />;
      if (n === "hood")
        return (
          <g>
            <path d={`M ${-R * 0.85} ${shY - 2} Q ${-R * 1.05} ${yy(0.36)} 0 ${yy(0.44)} Q ${R * 1.05} ${yy(0.36)} ${R * 0.85} ${shY - 2} Z`} fill={L.c.top} stroke={dark} strokeWidth={1} />
            <path d={`M 0 ${shY} L 0 ${yy(0.42)}`} stroke={dark} strokeWidth={0.9} />
          </g>
        );
      if (n === "scoop") return <path d={`M ${-sw * 0.45} ${shY - 1} Q 0 ${yy(0.12)} ${sw * 0.45} ${shY - 1} Z`} fill={skin} />;
      return <path d={`M ${-R * 0.4} ${shY - 1} Q 0 ${shY + R * 0.2} ${R * 0.4} ${shY - 1} Z`} fill={skin} />;
    }
    if (n === "round") return <path d={`M ${-R * 0.44} ${shY - 1} Q 0 ${shY + R * 0.5} ${R * 0.44} ${shY - 1} Z`} fill={skin} stroke={LINE} strokeWidth={0.9} />;
    if (n === "v")
      return (
        <g>
          <path d={`M ${-R * 0.48} ${shY - 1} L 0 ${yy(0.2)} L ${R * 0.48} ${shY - 1} Z`} fill={skin} />
          <path d={`M ${-R * 0.52} ${shY - 1} L 0 ${yy(0.21)} L ${R * 0.52} ${shY - 1}`} fill="none" stroke={t.jersey ? ink : LINE} strokeWidth={t.jersey ? 2.2 : 0.9} />
        </g>
      );
    if (n === "scoop")
      return (
        <g>
          <path d={`M ${-sw * 0.56} ${shY - 1} Q ${-sw * 0.5} ${yy(0.3)} 0 ${yy(0.3)} Q ${sw * 0.5} ${yy(0.3)} ${sw * 0.56} ${shY - 1} Z`} fill={skin} />
          {t.lace && Array.from({ length: 13 }).map((_, i) => {
            const u = i / 12, x = lerp(-sw * 0.56, sw * 0.56, u);
            const y = shY - 1 + (yy(0.3) - shY + 1) * (1 - Math.pow(2 * u - 1, 2)) * 0.98;
            return <circle key={i} cx={x} cy={y + 0.5} r={0.95} fill={ink} stroke={tint(L.c.top, 0.85)} strokeWidth={0.3} />;
          })}
        </g>
      );
    if (n === "stand")
      return (
        <g>
          <line x1={0} x2={0} y1={shY + 1} y2={2} stroke={LINE} strokeWidth={1} />
          {btn([0.15, 0.32, 0.5, 0.68, 0.86], btnFill, t.buttons === "knot" ? 1.25 : 1.1)}
          <path d={`M ${-R * 0.42} ${shY - 3.2} L ${R * 0.42} ${shY - 3.2} L ${R * 0.46} ${shY + 1.2} L ${-R * 0.46} ${shY + 1.2} Z`} fill={paint.top} stroke={LINE} strokeWidth={0.9} />
        </g>
      );
    if (n === "slit")
      return (
        <g>
          <path d={`M ${-R * 0.42} ${shY - 1} Q 0 ${shY + R * 0.3} ${R * 0.42} ${shY - 1} Z`} fill={skin} />
          <path d={`M -1.2 ${shY + 1} L 0 ${yy(0.22)} L 1.2 ${shY + 1} Z`} fill={skin} />
          <path d={`M -1 ${yy(0.1)} l -2.5 2.5 M 1 ${yy(0.1)} l 2.5 2.5`} stroke={ink} strokeWidth={0.8} />
        </g>
      );
    if (n === "hood")
      return (
        <g>
          <ellipse cx={0} cy={shY - 0.5} rx={R * 0.95} ry={R * 0.32} fill={tint(L.c.top, 0.86)} />
          <path d={`M ${-R * 0.25} ${shY + 1} L ${-R * 0.3} ${yy(0.3)} M ${R * 0.25} ${shY + 1} L ${R * 0.3} ${yy(0.3)}`} stroke={ink} strokeWidth={1} strokeLinecap="round" />
        </g>
      );
    if (n === "lapel")
      return (
        <g>
          <path d={`M ${-sw * 0.5} ${shY - 1} L ${sw * 0.5} ${shY - 1} L 0 ${yy(0.6)} Z`} fill={ink} />
          <path d={`M ${-R * 0.42} ${shY - 1} Q 0 ${shY + R * 0.45} ${R * 0.42} ${shY - 1} Z`} fill={skin} />
          {[-1, 1].map((s) => <path key={s} d={`M ${s * sw * 0.5} ${shY - 1.5} L ${s * sw * 0.74} ${yy(0.24)} L ${s * sw * 0.5} ${yy(0.3)} L 0 ${yy(0.6)} Z`} fill={L.c.top} stroke={dark} strokeWidth={0.9} />)}
          <circle cx={0} cy={yy(0.68)} r={1.2} fill={dark} />
        </g>
      );
    // collar / polo / softcollar
    const soft = n === "softcollar";
    const deep = n === "polo" ? 0.12 : 0.15;
    const colCol = soft ? ink : paint.top;
    return (
      <g>
        <path d={`M ${-R * 0.4} ${shY - 1} L 0 ${yy(deep)} L ${R * 0.4} ${shY - 1} Z`} fill={skin} />
        <line x1={0} x2={0} y1={yy(deep)} y2={n === "polo" ? yy(0.36) : 2} stroke={LINE} strokeWidth={1} />
        {btn(n === "polo" ? [0.22, 0.32] : [0.24, 0.42, 0.6, 0.78], btnFill)}
        {[-1, 1].map((s) => (
          <path key={s} d={soft ? `M ${s * R * 0.42} ${shY - 2.5} Q ${s * R * 1.2} ${shY} ${s * R * 0.75} ${yy(0.16)} Q ${s * R * 0.3} ${yy(0.2)} 0 ${yy(deep)} Z` : `M ${s * R * 0.42} ${shY - 2.5} L ${s * R * 0.98} ${shY + 0.8} L ${s * R * 0.42} ${yy(deep + 0.04)} L 0 ${yy(deep)} Z`} fill={colCol} stroke={LINE} strokeWidth={0.9} strokeLinejoin="round" />
        ))}
        {t.bow && (
          <g fill={ink}>
            <path d={`M 0 ${yy(deep)} l -4.5 -2.4 l 0 4.8 Z M 0 ${yy(deep)} l 4.5 -2.4 l 0 4.8 Z`} />
            <path d={`M -1 ${yy(deep)} l -1.6 6 l 1.6 -1 l 1 1.5 Z M 1 ${yy(deep)} l 1.6 6 l -1.6 -1 l -1 1.5 Z`} />
            <circle cx={0} cy={yy(deep)} r={1.4} />
          </g>
        )}
      </g>
    );
  })();

  const pocket = (x: number, y: number, w: number, h: number, flap = false) => (
    <g key={`${x}${y}`}>
      <rect x={x} y={y} width={w} height={h} rx={0.8} fill="none" stroke={LINE} strokeWidth={0.9} />
      {flap && <path d={`M ${x - 0.4} ${y} L ${x + w + 0.4} ${y} L ${x + w + 0.4} ${y + h * 0.32} L ${x - 0.4} ${y + h * 0.32} Z`} fill={SHADE} />}
    </g>
  );
  const pockets = back ? null : t.pockets === "chest" ? (
    <g>
      {pocket(k * sw * 0.32, yy(0.3), sw * 0.38, torso * 0.17)}
      {t.id === "school" && <path d={`M ${k * sw * 0.36} ${yy(0.25)} l ${sw * 0.12} 0 M ${k * sw * 0.52} ${yy(0.25)} l ${sw * 0.12} 0`} stroke="#2f4a9a" strokeWidth={1} />}
    </g>
  ) : t.pockets === "two" ? (
    <g>{[-1, 1].map((s) => pocket(s > 0 ? sw * 0.22 : -sw * 0.62, yy(0.28), sw * 0.4, torso * 0.18, true))}</g>
  ) : t.pockets === "lower" ? (
    <g>{[-1, 1].map((s) => pocket(s > 0 ? hw * 0.25 : -hw * 0.85, -torso * 0.3, hw * 0.6, torso * 0.2, t.id !== "kuiheng"))}</g>
  ) : t.pockets === "kangaroo" ? (
    <path d={`M ${-hw * 0.7} ${-torso * 0.36} L ${hw * 0.7} ${-torso * 0.36} L ${hw * 0.85} ${-3} L ${-hw * 0.85} ${-3} Z`} fill={SHADE} stroke={LINE} strokeWidth={0.9} />
  ) : null;

  return (
    <g>
      <path d={g.torsoD} fill={paint.top} />
      {t.straps && (
        <g fill={skin}>
          {[-1, 1].map((s) => <path key={s} d={`M ${s * sw * 0.62} ${shY - 2} L ${s * (sw + 3)} ${shY - 2} L ${s * (sw + 3)} ${yy(0.42)} Q ${s * sw * 0.66} ${yy(0.36)} ${s * sw * 0.62} ${shY - 2} Z`} />)}
        </g>
      )}
      {t.id === "workshirt" || t.id === "shirt" || t.id === "floral" ? <path d={`M ${-sw * 0.85} ${yy(0.16)} Q 0 ${yy(0.2)} ${sw * 0.85} ${yy(0.16)}`} fill="none" stroke={back ? LINE : "none"} strokeWidth={1.1} /> : null}
      {neck}
      {pockets}
      {t.print && !back && (
        <g>
          <circle cx={0} cy={yy(0.46)} r={sw * 0.36} fill={ink} />
          <path d={`M ${-sw * 0.05} ${yy(0.32)} L ${-sw * 0.18} ${yy(0.48)} L ${sw * 0.02} ${yy(0.46)} L ${-sw * 0.06} ${yy(0.6)} L ${sw * 0.18} ${yy(0.42)} L ${-sw * 0.0} ${yy(0.44)} Z`} fill={L.c.top} />
        </g>
      )}
      {t.jersey && <JerseyNumber x={back ? 0 : k * sw * 0.42} y={back ? yy(0.62) : yy(0.42)} h={back ? torso * 0.3 : torso * 0.13} seed={g.seed} fill={ink} />}
      {t.pockets === "lower" && back && null}
    </g>
  );
};

/**
 * Shirt number drawn from bars, never text: a figure facing left is mirrored, so it only uses 0 and 8, which read
 * the same either way.
 */
const JerseyNumber: React.FC<{ x: number; y: number; h: number; seed: number; fill: string }> = ({ x, y, h, seed, fill }) => {
  const digits = [["8", "0"], ["0", "8"], ["8", "8"], ["8"], ["0", "0"]][seed % 5];
  const w = h * 0.55, t = h * 0.16, gap = h * 0.18;
  const total = digits.length * w + (digits.length - 1) * gap;
  return (
    <g fill={fill}>
      {digits.map((d, i) => {
        const x0 = x - total / 2 + i * (w + gap), y0 = y - h / 2;
        return (
          <g key={i}>
            <rect x={x0} y={y0} width={w} height={t} /><rect x={x0} y={y0 + h - t} width={w} height={t} />
            <rect x={x0} y={y0} width={t} height={h} /><rect x={x0 + w - t} y={y0} width={t} height={h} />
            {d === "8" && <rect x={x0} y={y0 + h / 2 - t / 2} width={w} height={t} />}
          </g>
        );
      })}
    </g>
  );
};

/** Pieces of the top that lie over the arms (front view): none at present, kept for the sabai shoulder drape. */
export const TopOverArms: React.FC<{ g: BodyGeo; L: Look; paint: Paints; back: boolean }> = ({ g, L, paint, back }) => {
  if (!L.top.sabai) return null;
  const { sw, shY, torso } = g;
  const k = back ? 1 : -1; // over the person's left shoulder: screen left from the front, screen right from behind
  return (
    <path d={`M ${k * sw * 0.12} ${shY + torso * 0.26} L ${k * sw * 0.5} ${shY - 2} Q ${k * sw * 1.05} ${shY - 2.5} ${k * sw * 1.12} ${shY + 3} L ${k * sw * 0.72} ${shY + torso * 0.2} Z`} fill={paint.top} stroke={tint(L.c.top, 0.75)} strokeWidth={0.8} strokeLinejoin="round" />
  );
};

// ---------- outer layer, front and back ----------
export const OuterFront: React.FC<{ g: BodyGeo; L: Look; hem: number; back: boolean; seated: number }> = ({ g, L, hem: kneeHem, back, seated }) => {
  const o = L.outer;
  if (!o) return null;
  const { sw, hw, shY, torso, R } = g;
  const c = L.c.outer, edge = tint(c, 0.75);
  const W = Math.max(hw, sw * 0.82);
  const hem = o.len === "knee" ? kneeHem : o.len === "hip" ? Math.max(4, g.legLen * 0.14 * (1 - seated * 0.6)) : 2;
  const flare = o.len === "knee" ? 1.3 : 1.12;
  if (o.apron) {
    if (back)
      return (
        <g stroke={edge} strokeWidth={0.8} fill={c}>
          <rect x={-hw - 1} y={-torso * 0.18} width={hw * 2 + 2} height={2.6} />
          <path d={`M 0 ${-torso * 0.17} l -5 -3 l 0 6 Z M 0 ${-torso * 0.17} l 5 -3 l 0 6 Z M -0.5 ${-torso * 0.17} l -2 8 l 1.5 0 Z M 0.5 ${-torso * 0.17} l 2 8 l -1.5 0 Z`} />
          <path d={`M ${-R * 0.5} ${shY - 2} Q 0 ${shY + 1.5} ${R * 0.5} ${shY - 2}`} fill="none" strokeWidth={2} stroke={c} />
        </g>
      );
    return (
      <g stroke={edge} strokeWidth={0.9} strokeLinejoin="round">
        <path d={`M ${-R * 0.42} ${shY - 2} L ${-sw * 0.5} ${shY + torso * 0.22} M ${R * 0.42} ${shY - 2} L ${sw * 0.5} ${shY + torso * 0.22}`} stroke={c} strokeWidth={2} />
        <path d={`M ${-sw * 0.55} ${shY + torso * 0.22} L ${sw * 0.55} ${shY + torso * 0.22} L ${hw * 0.82} -4 L ${W * 1.12} ${hem} L ${-W * 1.12} ${hem} L ${-hw * 0.82} -4 Z`} fill={c} />
        <rect x={-hw - 1} y={-torso * 0.18} width={hw * 2 + 2} height={2.6} fill={c} />
        {[-1, 1].map((s) => <rect key={s} x={s > 0 ? W * 0.18 : -W * 0.78} y={hem * 0.3} width={W * 0.6} height={Math.max(4, hem * 0.22)} rx={1} fill="none" />)}
      </g>
    );
  }
  if (back) {
    return (
      <g strokeLinejoin="round">
        <path d={`M ${-sw * 1.07} ${shY + 3} Q ${-sw} ${shY - 1.5} ${-sw * 0.4} ${shY - 1.5} L ${sw * 0.4} ${shY - 1.5} Q ${sw} ${shY - 1.5} ${sw * 1.07} ${shY + 3} L ${W * 1.12} -2 L ${W * flare} ${hem} L ${-W * flare} ${hem} L ${-W * 1.12} -2 Z`} fill={c} stroke={edge} strokeWidth={1.1} />
        {o.id === "denim" && <path d={`M ${-sw} ${shY + torso * 0.22} L ${sw} ${shY + torso * 0.22} M ${-W * 1.12} ${hem - 4} L ${W * 1.12} ${hem - 4}`} stroke={edge} strokeWidth={1} />}
        {o.id === "cardigan" && <rect x={-W * 1.12} y={hem - 3.5} width={W * 2.24} height={3.5} fill={edge} opacity={0.5} />}
        {o.collar === "hood" && <path d={`M ${-R * 0.85} ${shY - 2} Q ${-R * 1.05} ${shY + torso * 0.36} 0 ${shY + torso * 0.44} Q ${R * 1.05} ${shY + torso * 0.36} ${R * 0.85} ${shY - 2} Z`} fill={c} stroke={edge} strokeWidth={1} />}
        {o.collar === "denim" && <path d={`M ${-R * 0.75} ${shY - 2.5} Q 0 ${shY} ${R * 0.75} ${shY - 2.5} L ${R * 0.8} ${shY + 2} Q 0 ${shY + 4} ${-R * 0.8} ${shY + 2} Z`} fill={c} stroke={edge} strokeWidth={0.9} />}
      </g>
    );
  }
  if (!o.open) {
    // closed raincoat: one piece, snaps down the front, hood lying behind the neck
    return (
      <g strokeLinejoin="round">
        <ellipse cx={0} cy={shY - 0.5} rx={R * 1.0} ry={R * 0.34} fill={edge} />
        <path d={`M ${-sw * 1.07} ${shY + 3} Q ${-sw} ${shY - 1.5} ${-sw * 0.4} ${shY - 1.5} Q 0 ${shY + 3} ${sw * 0.4} ${shY - 1.5} Q ${sw} ${shY - 1.5} ${sw * 1.07} ${shY + 3} L ${W * 1.12} -2 L ${W * flare} ${hem} L ${-W * flare} ${hem} L ${-W * 1.12} -2 Z`} fill={c} stroke={edge} strokeWidth={1.1} />
        <line x1={1.5} x2={1.5} y1={shY + 2} y2={hem} stroke={edge} strokeWidth={1} />
        {[0.12, 0.35, 0.58, 0.81].map((f) => <circle key={f} cx={-1.2} cy={lerp(shY + 4, hem - 4, f)} r={1} fill={edge} />)}
        {[-1, 1].map((s) => <path key={s} d={`M ${s * W * 0.5} ${hem * 0.18} L ${s * W * 1.0} ${hem * 0.18}`} stroke={edge} strokeWidth={1.2} />)}
      </g>
    );
  }
  // open front: cardigan, denim jacket, vest
  const inner = o.collar === "denim" ? sw * 0.2 : sw * 0.36;
  const panel = (s: number) =>
    `M ${s * inner} ${shY - 1.5} L ${s * sw * 1.07} ${shY + 3} L ${s * W * 1.12} -2 L ${s * W * flare} ${hem} L ${s * W * 0.14} ${hem} L ${s * W * 0.1} ${o.collar === "denim" ? shY + torso * 0.25 : -torso * 0.1} Z`;
  return (
    <g strokeLinejoin="round">
      {[-1, 1].map((s) => (
        <g key={s}>
          <path d={panel(s)} fill={c} stroke={edge} strokeWidth={1.1} />
          {o.id === "cardigan" && <rect x={s > 0 ? W * 0.14 : -W * flare} y={hem - 3.5} width={W * (flare - 0.14)} height={3.5} fill={edge} opacity={0.5} />}
          {o.pockets === "chest" && <g><rect x={s > 0 ? sw * 0.28 : -sw * 0.74} y={shY + torso * 0.3} width={sw * 0.46} height={torso * 0.16} rx={1} fill="none" stroke={edge} strokeWidth={0.9} /><path d={`M ${s > 0 ? sw * 0.28 : -sw * 0.74} ${shY + torso * 0.3} l ${sw * 0.46} 0 l ${-sw * 0.23} ${torso * 0.06} Z`} fill={edge} /></g>}
          {o.pockets === "four" && [0.32, 0.68].map((f) => <rect key={f} x={s > 0 ? W * 0.3 : -W * 0.96} y={lerp(shY + 3, hem, f)} width={W * 0.66} height={torso * 0.14} rx={1} fill="none" stroke={edge} strokeWidth={0.9} />)}
          {o.collar === "denim" && <path d={`M ${s * R * 0.42} ${shY - 3} L ${s * sw * 0.95} ${shY + 1} L ${s * sw * 0.32} ${shY + torso * 0.24} Z`} fill={c} stroke={edge} strokeWidth={0.9} />}
          {o.collar === "denim" && <line x1={s * W * 0.95} x2={s * W * 1.05} y1={hem - 4} y2={hem - 4} stroke={edge} strokeWidth={1} />}
        </g>
      ))}
      {o.id === "cardigan" && [0.2, 0.45, 0.7].map((f) => <circle key={f} cx={-lerp(inner, W * 0.12, f) - 1.6} cy={lerp(shY + 2, hem, f)} r={1} fill={edge} />)}
    </g>
  );
};

// ---------- bottoms ----------
/** Pants leg (front / back / side): cloth over a part of the leg path, with outline, seams and hem. */
export const PantsLeg: React.FC<{ pts: Pt[]; f: number; L: Look; paint: Paints; limb: number; back?: boolean; dim?: boolean }> = ({ pts, f, L, paint, limb, back }) => {
  const b = L.bottom;
  if (b.shape !== "pants" || f <= 0) return null;
  const p = along(pts, f);
  const d = poly(p);
  const w = limb * 1.15 * b.wide;
  const end = p[p.length - 1], pre = p[p.length - 2];
  const len = Math.hypot(end.x - pre.x, end.y - pre.y) || 1;
  const u = { x: (end.x - pre.x) / len, y: (end.y - pre.y) / len };
  const full = Math.abs(f - b.len) < 1e-6 || f >= b.len; // the hem is at the end of this piece
  return (
    <g>
      <path d={d} fill="none" stroke="rgba(0,0,0,.28)" strokeWidth={w + 1.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={paint.bottom} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      {b.seams && <path d={d} fill="none" stroke={tint(L.c.bottom, 1.35)} strokeWidth={0.6} strokeDasharray="1.6 1.2" transform={`translate(${w * 0.3} 0)`} />}
      {b.crease && !back && <path d={d} fill="none" stroke={tint(L.c.bottom, 0.8)} strokeWidth={0.6} />}
      {b.stripe && <path d={d} fill="none" stroke={L.c.bottom2} strokeWidth={1.3} transform={`translate(${w * 0.36} 0)`} />}
      {full && (b.jong || b.id === "kuay" || b.id === "shorts") && (
        <path d={`M ${end.x - u.y * w * 0.5 - u.x * 2.4} ${end.y + u.x * w * 0.5 - u.y * 2.4} L ${end.x + u.y * w * 0.5 - u.x * 2.4} ${end.y - u.x * w * 0.5 - u.y * 2.4}`} stroke={tint(L.c.bottom, 0.72)} strokeWidth={b.jong ? 1.6 : 1} />
      )}
    </g>
  );
};

/** Front / back extras of pants at the waist: jong fold or tail, jeans pockets. Draw over the legs, under the top. */
export const PantsExtras: React.FC<{ L: Look; paint: Paints; hw: number; legLen: number; back: boolean; standing: number }> = ({ L, paint, hw, legLen, back, standing }) => {
  const b = L.bottom;
  if (b.shape !== "pants" || standing < 0.5) return null;
  const dark = tint(L.c.bottom, 0.72);
  if (b.jong)
    return back ? (
      // the tail (หางกระเบน) pulled between the legs and tucked into the back of the waist
      <g>
        <path d={`M ${-hw * 0.3} -3 L ${hw * 0.3} -3 L ${hw * 0.16} ${legLen * 0.2} L ${-hw * 0.16} ${legLen * 0.2} Z`} fill={paint.bottom} stroke={dark} strokeWidth={0.9} />
        {[0.05, 0.1, 0.15].map((f) => <path key={f} d={`M ${-hw * 0.24} ${legLen * f - 2} L ${hw * 0.24} ${legLen * f + 1}`} stroke={dark} strokeWidth={0.8} />)}
      </g>
    ) : (
      // the gathered front fold hanging between the legs
      <g>
        <path d={`M ${-hw * 0.42} -3 L ${hw * 0.42} -3 L ${hw * 0.2} ${legLen * 0.4} Q 0 ${legLen * 0.43} ${-hw * 0.2} ${legLen * 0.4} Z`} fill={paint.bottom} stroke={dark} strokeWidth={0.9} />
        {[-0.18, 0, 0.18].map((f) => <line key={f} x1={hw * f * 1.6} x2={hw * f} y1={-1} y2={legLen * 0.39} stroke={dark} strokeWidth={0.7} />)}
      </g>
    );
  if (b.seams)
    return back ? (
      <g fill="none" stroke={tint(L.c.bottom, 1.35)} strokeWidth={0.7} strokeDasharray="1.6 1.2">
        {[-1, 1].map((s) => <path key={s} d={`M ${s * hw * 0.2} ${2} L ${s * hw * 0.85} 2 L ${s * hw * 0.8} ${legLen * 0.12} L ${s * hw * 0.52} ${legLen * 0.15} L ${s * hw * 0.24} ${legLen * 0.12} Z`} />)}
      </g>
    ) : (
      <g fill="none" stroke={tint(L.c.bottom, 1.35)} strokeWidth={0.7} strokeDasharray="1.6 1.2">
        {[-1, 1].map((s) => <path key={s} d={`M ${s * hw * 0.95} 1 Q ${s * hw * 0.6} 2 ${s * hw * 0.55} ${legLen * 0.09}`} />)}
      </g>
    );
  return null;
};

/** Waistband of pants (front and back), drawn in the torso layer over the top's hem. */
export const Waistband: React.FC<{ L: Look; paint: Paints; hw: number; back: boolean }> = ({ L, paint, hw, back }) => {
  const b = L.bottom;
  if (b.shape !== "pants") return null;
  const belt = b.seams || b.crease || L.top.id === "school";
  return (
    <g>
      <path d={`M ${-hw} -5 L ${hw} -5 L ${hw} 0 Q ${hw} 5 ${hw * 0.6} 5 L ${-hw * 0.6} 5 Q ${-hw} 5 ${-hw} 0 Z`} fill={paint.bottom} />
      {belt && <rect x={-hw} y={-5} width={hw * 2} height={2.6} fill={b.crease || L.top.id === "school" ? "#2b2420" : "#6a4a2e"} />}
      {belt && !back && <rect x={-2} y={-5.4} width={4} height={3.4} rx={0.6} fill="none" stroke="#c9b27a" strokeWidth={0.8} />}
      {b.stripe && <rect x={-hw} y={-5} width={hw * 2} height={2} fill={tint(L.c.bottom, 0.8)} />}
    </g>
  );
};

/** Tube skirt / pleated skirt cloth from y0 down to len, top half-width wTop, hem half-width wBot. */
export const Cloth: React.FC<{ L: Look; paint: Paints; y0: number; len: number; wTop: number; wBot: number; back: boolean; clip: string; standing: number }> = ({ L, paint, y0, len, wTop, wBot, back, clip, standing }) => {
  const b = L.bottom;
  const d = `M ${-wTop} ${y0} L ${wTop} ${y0} L ${wBot} ${len} L ${-wBot} ${len} Z`;
  const dark = tint(L.c.bottom, 0.72);
  const H = len - y0;
  const at = (f: number) => y0 + H * f;
  return (
    <g>
      <clipPath id={clip}><path d={d} /></clipPath>
      <path d={d} fill={paint.bottom} />
      <g clipPath={`url(#${clip})`}>
        {b.bands && [0.2, 0.38, 0.56].map((f) => <rect key={f} x={-wBot - 2} y={at(f)} width={wBot * 2 + 4} height={1.3} fill={L.c.bottom2} opacity={0.75} />)}
        {b.hemBand && (
          <g>
            <rect x={-wBot - 2} y={at(0.76)} width={wBot * 2 + 4} height={H * 0.26} fill={L.c.bottom2} />
            <path d={Array.from({ length: 14 }).map((_, i) => `${i ? "L" : "M"} ${-wBot + (i * wBot * 2) / 13} ${at(i % 2 ? 0.82 : 0.9)}`).join(" ")} fill="none" stroke={dark} strokeWidth={1.1} />
            <rect x={-wBot - 2} y={at(0.76)} width={wBot * 2 + 4} height={1} fill={dark} />
          </g>
        )}
        {b.hemBand && <rect x={-wTop - 2} y={y0} width={wTop * 2 + 4} height={Math.min(5, H * 0.1)} fill={tint(L.c.bottom, 1.3)} />}
        {b.pleats && Array.from({ length: 9 }).map((_, i) => { const u = (i + 0.5) / 9 * 2 - 1; return <line key={i} x1={u * wTop} x2={u * wBot} y1={y0 + 3} y2={len} stroke={dark} strokeWidth={0.8} />; })}
        {b.batik && <rect x={-wBot - 2} y={at(0.9)} width={wBot * 2 + 4} height={H * 0.1 + 2} fill={tint(L.c.bottom, 0.7)} />}
      </g>
      {/* phathung front fold / sarong knot at the waist (front only, and only while the cloth hangs) */}
      {!back && standing > 0.5 && b.batik && <path d={`M ${wTop * 0.15} ${y0 + 1} L ${wTop * 0.45} ${at(0.92)}`} stroke={dark} strokeWidth={1} />}
      {!back && b.checks && <ellipse cx={0} cy={y0 + 1.5} rx={wTop * 0.45} ry={2.6} fill={tint(L.c.bottom, 0.85)} stroke={dark} strokeWidth={0.7} />}
    </g>
  );
};

// ---------- feet ----------
export const Foot: React.FC<{ x: number; y: number; limb: number; L: Look; skin: string; view: "front" | "back" | "side"; dim?: boolean }> = ({ x, y, limb, L, skin, view }) => {
  const k = L.feet.kind;
  const side = view === "side";
  const cx = side ? x + limb * 0.45 : x, cy = y + 1;
  const rx = limb * (side ? 0.95 : 0.85), ry = limb * 0.42;
  const c = L.c.feet;
  if (k === "bare") return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={skin} />;
  if (k === "sneakers" || k === "leather")
    return (
      <g>
        <ellipse cx={cx} cy={cy - 0.4} rx={rx * 1.06} ry={ry * 1.12} fill={c} />
        {k === "sneakers" && <rect x={cx - rx * 1.06} y={cy + ry * 0.3} width={rx * 2.12} height={ry * 0.75} rx={ry * 0.35} fill={c === "#f4f4f4" ? "#cfd2d6" : "#f4f4f4"} />}
        {k === "sneakers" && view === "front" && <path d={`M ${cx - 1.5} ${cy - ry * 0.7} l 3 0 M ${cx - 1.5} ${cy - ry * 0.25} l 3 0`} stroke={c === "#f4f4f4" ? "#9a9da2" : "#f4f4f4"} strokeWidth={0.7} />}
        {k === "sneakers" && side && <path d={`M ${cx - rx * 0.2} ${cy - ry * 0.8} l ${rx * 0.5} ${ry * 0.5}`} stroke={c === "#f4f4f4" ? "#9a9da2" : "#f4f4f4"} strokeWidth={0.8} />}
        {k === "leather" && <ellipse cx={cx + (side ? rx * 0.35 : 0)} cy={cy - ry * 0.45} rx={rx * 0.32} ry={ry * 0.22} fill="rgba(255,255,255,.35)" />}
      </g>
    );
  // sandals / flip-flops: a sole under a bare foot and the straps over it
  return (
    <g>
      <ellipse cx={cx} cy={cy + ry * 0.55} rx={rx * 1.08} ry={ry * 0.42} fill={c} />
      <ellipse cx={cx} cy={cy - ry * 0.1} rx={rx * 0.95} ry={ry * 0.9} fill={skin} />
      {k === "sandals" ? (
        side ? <path d={`M ${cx - rx * 0.1} ${cy - ry * 0.9} L ${cx + rx * 0.05} ${cy + ry * 0.4} M ${cx - rx * 0.85} ${cy - ry * 0.4} L ${cx - rx * 0.75} ${cy + ry * 0.45}`} stroke={c} strokeWidth={1.6} />
          : view === "back" ? <rect x={cx - rx * 0.45} y={cy - ry * 0.75} width={rx * 0.9} height={1.6} fill={c} />
          : <rect x={cx - rx * 0.85} y={cy - ry * 0.55} width={rx * 1.7} height={2} rx={0.8} fill={c} />
      ) : side ? (
        <path d={`M ${cx + rx * 0.45} ${cy + ry * 0.2} L ${cx - rx * 0.05} ${cy - ry * 0.6}`} stroke={c} strokeWidth={1.2} />
      ) : view === "front" ? (
        <path d={`M ${cx - rx * 0.75} ${cy + ry * 0.1} L ${cx} ${cy - ry * 0.75} L ${cx + rx * 0.75} ${cy + ry * 0.1}`} fill="none" stroke={c} strokeWidth={1.2} />
      ) : null}
    </g>
  );
};

// ---------- headwear (head-local: centre of the head at 0, R = half width, Ry = half height) ----------
/** Hair styles a hat squashes: the front-view top bun goes under it. */
export const hidesBun = (L: Look) => !!L.head && L.head.kind !== "band";
export const Headwear: React.FC<{ L: Look; paint: Paints; R: number; Ry: number; view: "front" | "back" | "side" }> = ({ L, paint, R, Ry, view }) => {
  const h = L.head;
  if (!h) return null;
  const c = L.c.head, dark = tint(c, 0.72);
  if (h.kind === "ngob") {
    // งอบ: wide shallow palm-leaf cone; the same from every side
    const cone = `M ${-2.05 * R} ${-0.62 * Ry} Q ${-1.1 * R} ${-1.0 * Ry} 0 ${-1.66 * Ry} Q ${1.1 * R} ${-1.0 * Ry} ${2.05 * R} ${-0.62 * Ry} Q 0 ${-0.46 * Ry} ${-2.05 * R} ${-0.62 * Ry} Z`;
    return (
      <g transform={`translate(0 ${0.14 * Ry}) scale(1.06)`}>
        <ellipse cx={0} cy={-0.6 * Ry} rx={2.0 * R} ry={0.17 * Ry} fill={dark} />
        <path d={cone} fill={c} stroke={dark} strokeWidth={R * 0.04} strokeLinejoin="round" />
        {[-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((x) => <path key={x} d={`M 0 ${-1.6 * Ry} L ${x * R * 1.2} ${-0.56 * Ry + Math.abs(x) * 0.02 * Ry}`} stroke={dark} strokeWidth={R * 0.025} opacity={0.6} />)}
        <path d={`M ${-1.4 * R} ${-0.86 * Ry} Q 0 ${-0.72 * Ry} ${1.4 * R} ${-0.86 * Ry}`} fill="none" stroke={dark} strokeWidth={R * 0.03} opacity={0.6} />
        <circle cx={0} cy={-1.66 * Ry} r={R * 0.08} fill={dark} />
      </g>
    );
  }
  if (h.kind === "cap") {
    if (view === "side")
      return (
        <g>
          <path d={`M ${-1.06 * R} ${-0.28 * Ry} Q ${-1.12 * R} ${-1.24 * Ry} ${-0.05 * R} ${-1.2 * Ry} Q ${0.98 * R} ${-1.15 * Ry} ${1.0 * R} ${-0.5 * Ry} Z`} fill={c} />
          <path d={`M ${0.82 * R} ${-0.52 * Ry} L ${1.78 * R} ${-0.42 * Ry} Q ${1.84 * R} ${-0.32 * Ry} ${1.62 * R} ${-0.3 * Ry} L ${0.8 * R} ${-0.36 * Ry} Z`} fill={dark} />
          <path d={`M ${-0.05 * R} ${-1.2 * Ry} Q ${0.2 * R} ${-0.8 * Ry} ${0.1 * R} ${-0.42 * Ry}`} fill="none" stroke={dark} strokeWidth={R * 0.04} />
        </g>
      );
    return (
      <g>
        <path d={`M ${-1.06 * R} ${-0.42 * Ry} Q ${-1.12 * R} ${-1.26 * Ry} 0 ${-1.22 * Ry} Q ${1.12 * R} ${-1.26 * Ry} ${1.06 * R} ${-0.42 * Ry} Q 0 ${-0.6 * Ry} ${-1.06 * R} ${-0.42 * Ry} Z`} fill={c} />
        <path d={`M 0 ${-1.22 * Ry} L 0 ${-0.58 * Ry}`} stroke={dark} strokeWidth={R * 0.04} />
        <circle cx={0} cy={-1.22 * Ry} r={R * 0.08} fill={dark} />
        {view === "front" ? (
          <path d={`M ${-0.98 * R} ${-0.46 * Ry} Q 0 ${-0.24 * Ry} ${0.98 * R} ${-0.46 * Ry} Q 0 ${-0.66 * Ry} ${-0.98 * R} ${-0.46 * Ry} Z`} fill={dark} />
        ) : (
          <path d={`M ${-0.35 * R} ${-0.5 * Ry} Q 0 ${-0.78 * Ry} ${0.35 * R} ${-0.5 * Ry}`} fill="none" stroke={dark} strokeWidth={R * 0.07} />
        )}
      </g>
    );
  }
  if (h.kind === "bucket") {
    const crown = `M ${-0.92 * R} ${-0.56 * Ry} L ${-0.82 * R} ${-1.18 * Ry} Q 0 ${-1.32 * Ry} ${0.82 * R} ${-1.18 * Ry} L ${0.92 * R} ${-0.56 * Ry} Z`;
    return (
      <g>
        <path d={crown} fill={c} transform={view === "side" ? `translate(${-0.05 * R} 0)` : undefined} />
        <path d={`M ${-0.98 * R} ${-0.66 * Ry} L ${-1.5 * R} ${-0.36 * Ry} Q 0 ${(view === "front" ? -0.3 : -0.4) * Ry} ${1.5 * R} ${-0.36 * Ry} L ${0.98 * R} ${-0.66 * Ry} Q 0 ${-0.74 * Ry} ${-0.98 * R} ${-0.66 * Ry} Z`} fill={dark} />
        <path d={`M ${-0.9 * R} ${-0.66 * Ry} Q 0 ${-0.76 * Ry} ${0.9 * R} ${-0.66 * Ry}`} fill="none" stroke={tint(c, 0.6)} strokeWidth={R * 0.06} />
      </g>
    );
  }
  if (h.kind === "scarf") {
    if (view === "side")
      return (
        <g>
          <path d={`M ${0.72 * R} ${-0.5 * Ry} Q ${0.6 * R} ${-1.25 * Ry} ${-0.15 * R} ${-1.24 * Ry} Q ${-1.3 * R} ${-1.15 * Ry} ${-1.12 * R} ${0.3 * Ry} L ${-0.55 * R} ${0.5 * Ry} Q ${-0.4 * R} ${-0.4 * Ry} ${0.72 * R} ${-0.5 * Ry} Z`} fill={c} />
          <circle cx={-1.08 * R} cy={0.32 * Ry} r={R * 0.2} fill={dark} />
          <path d={`M ${-1.1 * R} ${0.4 * Ry} L ${-1.45 * R} ${1.1 * Ry} L ${-1.15 * R} ${1.05 * Ry} Z`} fill={c} />
        </g>
      );
    if (view === "back")
      return (
        <g>
          <path d={`M ${-1.1 * R} ${0.45 * Ry} Q ${-1.3 * R} ${-1.3 * Ry} 0 ${-1.26 * Ry} Q ${1.3 * R} ${-1.3 * Ry} ${1.1 * R} ${0.45 * Ry} Q 0 ${0.8 * Ry} ${-1.1 * R} ${0.45 * Ry} Z`} fill={c} />
          <circle cx={0} cy={0.58 * Ry} r={R * 0.22} fill={dark} />
          <path d={`M -${0.1 * R} ${0.66 * Ry} L ${-0.45 * R} ${1.35 * Ry} L ${-0.1 * R} ${1.3 * Ry} Z M ${0.1 * R} ${0.66 * Ry} L ${0.4 * R} ${1.3 * Ry} L ${0.12 * R} ${1.28 * Ry} Z`} fill={c} />
        </g>
      );
    return <path d={`M ${-1.12 * R} ${0.42 * Ry} Q ${-1.32 * R} ${-1.3 * Ry} 0 ${-1.26 * Ry} Q ${1.32 * R} ${-1.3 * Ry} ${1.12 * R} ${0.42 * Ry} L ${0.92 * R} ${0.36 * Ry} Q ${0.98 * R} ${-0.62 * Ry} 0 ${-0.66 * Ry} Q ${-0.98 * R} ${-0.62 * Ry} ${-0.92 * R} ${0.36 * Ry} Z`} fill={c} stroke={dark} strokeWidth={R * 0.03} />;
  }
  // ผ้าขาวม้า tied round the head, knot on one side (behind, in the side view)
  const band = `M ${-1.07 * R} ${-0.36 * Ry} Q 0 ${-0.66 * Ry} ${1.07 * R} ${-0.36 * Ry} L ${1.03 * R} ${-0.66 * Ry} Q 0 ${-0.98 * Ry} ${-1.03 * R} ${-0.66 * Ry} Z`;
  const knot = (x: number, y: number, dir: number) => (
    <g>
      <path d={`M ${x} ${y} l ${dir * 0.55 * R} ${0.15 * Ry} l ${dir * 0.05 * R} ${0.35 * Ry} Z M ${x} ${y} l ${dir * 0.65 * R} ${-0.25 * Ry} l ${dir * 0.1 * R} ${0.25 * Ry} Z`} fill={paint.plaidHead} stroke={dark} strokeWidth={R * 0.02} />
      <circle cx={x} cy={y} r={R * 0.16} fill={paint.plaidHead} stroke={dark} strokeWidth={R * 0.02} />
    </g>
  );
  if (view === "side")
    return (
      <g>
        <path d={`M ${0.95 * R} ${-0.42 * Ry} L ${-1.05 * R} ${-0.36 * Ry} L ${-1.0 * R} ${-0.72 * Ry} L ${0.9 * R} ${-0.72 * Ry} Z`} fill={paint.plaidHead} stroke={dark} strokeWidth={R * 0.02} />
        {knot(-1.05 * R, -0.54 * Ry, -1)}
      </g>
    );
  return (
    <g>
      <path d={band} fill={paint.plaidHead} stroke={dark} strokeWidth={R * 0.02} />
      {knot((view === "back" ? -1 : 1) * 0.98 * R, -0.5 * Ry, view === "back" ? -1 : 1)}
    </g>
  );
};

// ---------- accessories on the body, front / back ----------
/** Necklace colour: the acc colour when it is gold or silver, else gold. */
const metal = (L: Look) => (L.c.acc === "#c9c9c9" || L.c.acc === "#d9b45a" ? L.c.acc : "#d9b45a");
export const AccBody: React.FC<{ g: BodyGeo; L: Look; paint: Paints; back: boolean; layer: "under" | "waist" | "over"; lie: number }> = ({ g, L, paint, back, layer, lie }) => {
  const { sw, hw, shY, torso, R, legLen } = g;
  const k = back ? -1 : 1;
  const out: React.ReactNode[] = [];
  const carryOk = lie < 0.5;
  if (layer === "under") {
    // drawn before the torso: things hanging behind the body
    if (L.has("bag") && carryOk && back) out.push(<rect key="bag" x={-hw * 1.6} y={-torso * 0.35} width={hw * 0.9} height={torso * 0.42} rx={3} fill={L.c.acc} />);
  }
  if (layer === "waist" && L.has("waistcloth")) {
    out.push(
      <g key="wc">
        <rect x={-hw - 1.2} y={-8} width={hw * 2 + 2.4} height={6.5} rx={2} fill={paint.plaidAcc} />
        {!back && (
          <g>
            <path d={`M ${k * hw * 0.5} -4 l ${-2.6} ${legLen * 0.24} l 4 0 Z M ${k * hw * 0.5} -4 l ${3.2} ${legLen * 0.2} l 3.4 -1 Z`} fill={paint.plaidAcc} stroke="rgba(0,0,0,.25)" strokeWidth={0.6} />
            <circle cx={k * hw * 0.5} cy={-4.5} r={3.2} fill={paint.plaidAcc} stroke="rgba(0,0,0,.25)" strokeWidth={0.6} />
          </g>
        )}
      </g>,
    );
  }
  if (layer === "over") {
    if (L.has("bag") && carryOk) {
      out.push(<line key="bs" x1={-k * sw * 0.6} y1={shY} x2={k * hw * 1.1} y2={-torso * 0.3} stroke={tint(L.c.acc, 0.8)} strokeWidth={2.4} />);
      if (!back) out.push(<g key="bb"><rect x={hw * 0.7} y={-torso * 0.35} width={hw * 0.9} height={torso * 0.42} rx={3} fill={L.c.acc} /><path d={`M ${hw * 0.7} ${-torso * 0.35 + 4} L ${hw * 1.6} ${-torso * 0.35 + 4}`} stroke={tint(L.c.acc, 0.7)} strokeWidth={1} /></g>);
    }
    if (L.has("backpack") && carryOk) {
      const bp = tint(L.c.acc, 1), bd = tint(L.c.acc, 0.7);
      if (back)
        out.push(
          <g key="bp" strokeLinejoin="round">
            <rect x={-sw * 0.78} y={shY + 3} width={sw * 1.56} height={torso * 0.78} rx={sw * 0.3} fill={bp} stroke={bd} strokeWidth={1} />
            <path d={`M ${-sw * 0.78} ${shY + torso * 0.3} Q 0 ${shY + torso * 0.18} ${sw * 0.78} ${shY + torso * 0.3}`} fill="none" stroke={bd} strokeWidth={1} />
            <rect x={-sw * 0.5} y={shY + torso * 0.5} width={sw} height={torso * 0.26} rx={3} fill={tint(L.c.acc, 0.85)} stroke={bd} strokeWidth={0.8} />
            <rect x={-1.5} y={shY + 0.5} width={3} height={3.5} rx={1} fill={bd} />
          </g>,
        );
      else
        out.push(
          <g key="bp" stroke={bd} strokeWidth={2.6} strokeLinecap="round" fill="none">
            {[-1, 1].map((s) => <path key={s} d={`M ${s * sw * 0.5} ${shY - 0.5} Q ${s * sw * 0.55} ${shY + torso * 0.42} ${s * sw * 0.98} ${shY + torso * 0.56}`} />)}
            <path d={`M ${-sw * 0.53} ${shY + torso * 0.3} L ${sw * 0.53} ${shY + torso * 0.3}`} strokeWidth={1.4} />
          </g>,
        );
    }
    if (L.has("necklace") && !back && !L.top.sabai && L.top.neck !== "stand" && L.top.neck !== "hood" && !(L.outer && !L.outer.open && !L.outer.apron))
      out.push(
        <g key="nl">
          <path d={`M ${-R * 0.46} ${shY - 1} Q 0 ${shY + torso * 0.14} ${R * 0.46} ${shY - 1}`} fill="none" stroke={metal(L)} strokeWidth={0.9} />
          <path d={`M 0 ${shY + torso * 0.115} l -1.6 1.4 l 1.6 2.6 l 1.6 -2.6 Z`} fill={metal(L)} />
        </g>,
      );
  }
  return <>{out}</>;
};

// ---------- side view (faces +x, hip at y = 0) ----------
export type SideGeo = { tw: number; shY: number; torso: number; limb: number; R: number; L: number; torsoD: string; clip: string };
export const TopSide: React.FC<{ g: SideGeo; L: Look; paint: Paints; skin: string }> = ({ g, L, paint, skin }) => {
  const { tw, shY, torso, R } = g;
  const t = L.top;
  const yy = (f: number) => shY + torso * f;
  const dark = tint(L.c.top, 0.75);
  if (t.sabai)
    return (
      <g>
        <path d={g.torsoD} fill={skin} />
        <g clipPath={`url(#${g.clip})`}>
          <path d={`M ${-tw - 4} ${yy(0.3)} L ${tw + 4} ${yy(0.22)} L ${tw + 4} 6 L ${-tw - 4} 6 Z`} fill={paint.top} />
          <path d={`M ${-tw - 4} ${yy(0.3)} L ${tw + 4} ${yy(0.22)}`} stroke={L.c.top2} strokeWidth={1.4} />
        </g>
        <path d={`M ${tw * 0.6} ${yy(0.24)} L ${tw * 0.1} ${shY - 2} L ${-tw * 0.5} ${shY - 1} L ${-tw * 1.05} ${-torso * 0.05} L ${-tw * 0.4} ${-torso * 0.05} L ${tw * 0.1} ${yy(0.3)} Z`} fill={paint.top} stroke={dark} strokeWidth={0.8} strokeLinejoin="round" />
      </g>
    );
  const n = t.neck;
  return (
    <g>
      <path d={g.torsoD} fill={paint.top} />
      <g clipPath={`url(#${g.clip})`}>
        {n === "scoop" && <path d={`M ${tw * 0.1} ${shY - 2} Q ${tw * 0.75} ${yy(0.24)} ${tw * 1.3} ${yy(0.26)} L ${tw * 1.3} ${shY - 2} Z`} fill={skin} />}
        {n === "v" && <path d={`M ${tw * 0.35} ${shY - 2} L ${tw * 1.2} ${yy(0.18)} L ${tw * 1.2} ${shY - 2} Z`} fill={skin} />}
        {n === "lapel" && <path d={`M ${tw * 0.45} ${shY - 2} L ${tw * 1.2} ${yy(0.58)} L ${tw * 1.2} ${shY - 2} Z`} fill={L.c.top2} />}
        {t.pockets === "kangaroo" && <path d={`M ${tw * 1.2} ${-torso * 0.36} L ${tw * 0.35} ${-torso * 0.36} L ${tw * 0.2} -3 L ${tw * 1.2} -3`} fill={SHADE} stroke={LINE} strokeWidth={0.9} />}
        {(t.pockets === "chest" || t.pockets === "two") && <rect x={tw * 0.45} y={yy(0.3)} width={tw * 0.5} height={torso * 0.16} fill="none" stroke={LINE} strokeWidth={0.9} />}
        {t.straps && <path d={`M ${-tw * 0.4} ${shY - 2} L ${tw * 0.4} ${shY - 2} L ${tw * 0.5} ${yy(0.36)} Q 0 ${yy(0.44)} ${-tw * 0.5} ${yy(0.36)} Z`} fill={skin} />}
        {(t.buttons && n !== "lapel" && n !== "scoop") ? <line x1={tw * 0.98} x2={tw * 1.02} y1={yy(0.15)} y2={2} stroke={LINE} strokeWidth={1} /> : null}
      </g>
      {(n === "collar" || n === "polo" || n === "softcollar") && <path d={`M ${-tw * 0.4} ${shY - 2.5} L ${tw * 0.55} ${shY - 1.5} L ${tw * 0.75} ${shY + 3.5} L ${tw * 0.2} ${shY + 2} Z`} fill={n === "softcollar" ? L.c.top2 : paint.top} stroke={LINE} strokeWidth={0.9} />}
      {n === "stand" && <rect x={-R * 0.3} y={shY - 3.2} width={R * 0.7} height={4} fill={paint.top} stroke={LINE} strokeWidth={0.9} />}
      {n === "hood" && <path d={`M ${-tw * 0.1} ${shY - 2} Q ${-tw * 1.5} ${shY - 3} ${-tw * 1.25} ${yy(0.3)} Q ${-tw * 0.6} ${yy(0.28)} ${-tw * 0.1} ${shY + 2} Z`} fill={tint(L.c.top, 0.88)} stroke={dark} strokeWidth={0.9} />}
      {t.bow && <path d={`M ${tw * 0.75} ${shY + 3} l 2.5 -2 l 0 4 Z M ${tw * 0.75} ${shY + 3} l 0.8 5 l 1.4 -0.8 Z`} fill={L.c.top2} />}
    </g>
  );
};

/** Outer layer from the side (not the lab coat or gown, which People.tsx draws). */
export const OuterSide: React.FC<{ g: SideGeo; L: Look; hem: number; flare: number }> = ({ g, L, hem: kneeHem, flare }) => {
  const o = L.outer;
  if (!o) return null;
  const { tw, shY, torso, R } = g;
  const c = L.c.outer, edge = tint(c, 0.75);
  const hem = o.len === "knee" ? kneeHem : o.len === "hip" ? g.L * 0.28 : 2;
  const fl = o.len === "knee" ? flare : tw * 1.1;
  if (o.apron)
    return (
      <g strokeLinejoin="round">
        <path d={`M ${tw * 0.85} ${shY + torso * 0.22} L ${tw * 1.2} ${shY + torso * 0.22} L ${Math.max(tw * 1.3, fl * 0.95)} ${hem} L ${tw * 0.6} ${hem} Z`} fill={c} stroke={edge} strokeWidth={0.9} />
        <path d={`M ${tw * 1.0} ${shY + torso * 0.24} L ${R * 0.1} ${shY - 2}`} stroke={c} strokeWidth={1.8} />
        <rect x={-tw * 1.08} y={-torso * 0.18} width={tw * 2.2} height={2.6} fill={c} stroke={edge} strokeWidth={0.7} />
        <path d={`M ${-tw * 1.05} ${-torso * 0.17} l -3.5 -2.5 l 0 5 Z M ${-tw * 1.05} ${-torso * 0.17} l -1.5 7 l 1.6 0 Z`} fill={c} stroke={edge} strokeWidth={0.6} />
      </g>
    );
  return (
    <g strokeLinejoin="round">
      <path d={`M ${tw * 0.72} ${shY - 1} L ${tw * 1.02} ${-2} L ${fl * 0.95} ${hem} L ${-fl * 1.08} ${hem} L ${-tw * 1.2} ${-2} L ${-tw * 1.12} ${shY + 2} Q ${-tw * 0.4} ${shY - 2} ${tw * 0.72} ${shY - 1} Z`} fill={c} stroke={edge} strokeWidth={1.1} />
      {o.open && <path d={`M ${tw * 0.72} ${shY - 1} L ${tw * 0.3} ${shY + 8}`} stroke={edge} strokeWidth={1.1} />}
      {o.id === "cardigan" && <rect x={-fl * 1.08} y={hem - 3.5} width={fl * 2.03} height={3.5} fill={edge} opacity={0.5} />}
      {o.collar === "denim" && <path d={`M ${-tw * 0.6} ${shY - 2.5} L ${tw * 0.5} ${shY - 1} L ${tw * 0.6} ${shY + 4} L ${-tw * 0.2} ${shY + 3} Z`} fill={c} stroke={edge} strokeWidth={0.9} />}
      {o.collar === "hood" && <path d={`M ${-tw * 0.1} ${shY - 2} Q ${-tw * 1.6} ${shY - 3} ${-tw * 1.3} ${shY + torso * 0.3} Q ${-tw * 0.6} ${shY + torso * 0.28} ${-tw * 0.1} ${shY + 2} Z`} fill={edge} />}
      {o.pockets && <rect x={-tw * 0.2} y={o.len === "waist" ? shY + torso * 0.3 : hem * 0.2 - 2} width={tw * 0.9} height={torso * 0.13} fill="none" stroke={edge} strokeWidth={0.9} />}
    </g>
  );
};

/** Things that hang behind the torso in the side view (drawn before it). */
export const AccSideBehind: React.FC<{ g: SideGeo; L: Look }> = ({ g, L }) => {
  const { tw, shY, torso } = g;
  if (L.has("bag")) return <rect x={-tw * 1.9} y={-torso * 0.3} width={tw * 1.5} height={torso * 0.4} rx={3} fill={L.c.acc} />;
  if (!L.has("backpack")) return null;
  return (
    <g strokeLinejoin="round">
      <rect x={-tw * 2.3} y={shY + 3} width={tw * 1.5} height={torso * 0.78} rx={tw * 0.5} fill={L.c.acc} stroke={tint(L.c.acc, 0.7)} strokeWidth={1} />
      <rect x={-tw * 2.55} y={shY + torso * 0.45} width={tw * 0.7} height={torso * 0.28} rx={2.5} fill={tint(L.c.acc, 0.85)} stroke={tint(L.c.acc, 0.7)} strokeWidth={0.8} />
    </g>
  );
};
/** Accessories over the torso in the side view. */
export const AccSide: React.FC<{ g: SideGeo; L: Look; paint: Paints }> = ({ g, L, paint }) => {
  const { tw, shY, torso, R } = g;
  return (
    <g>
      {L.has("waistcloth") && (
        <g>
          <rect x={-tw * 1.12} y={-8} width={tw * 2.24} height={6.5} rx={2} fill={paint.plaidAcc} />
          <path d={`M ${tw * 0.5} -4 l -1.5 ${g.L * 0.45} l 3.5 0 Z`} fill={paint.plaidAcc} stroke="rgba(0,0,0,.25)" strokeWidth={0.6} />
          <circle cx={tw * 0.5} cy={-4.5} r={3} fill={paint.plaidAcc} stroke="rgba(0,0,0,.25)" strokeWidth={0.6} />
        </g>
      )}
      {L.has("backpack") && <path d={`M ${-tw * 0.7} ${shY + 1} Q ${tw * 0.6} ${shY - 1} ${tw * 0.75} ${shY + torso * 0.2} L ${tw * 0.2} ${-torso * 0.28}`} fill="none" stroke={tint(L.c.acc, 0.7)} strokeWidth={2.6} strokeLinecap="round" />}
      {L.has("bag") && <line x1={-tw * 0.2} y1={shY} x2={-tw * 0.4} y2={-torso * 0.3} stroke={tint(L.c.acc, 0.8)} strokeWidth={2.4} />}
      {L.has("necklace") && !L.top.sabai && L.top.neck !== "stand" && L.top.neck !== "hood" && !(L.outer && !L.outer.open && !L.outer.apron) && <path d={`M ${-R * 0.1} ${shY - 2} Q ${tw * 0.5} ${shY + torso * 0.1} ${tw * 0.85} ${shY + torso * 0.06}`} fill="none" stroke={metal(L)} strokeWidth={0.9} />}
    </g>
  );
};
