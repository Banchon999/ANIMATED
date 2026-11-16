import React from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { clamp01, project, rng, V3 } from "./lib";

// Per-shot effects. Everything is driven by the shot time / frame passed in; randomness is seeded.
export type Fx =
  | { kind: "beam"; through?: string; y?: number; z?: number; from?: number; strength?: number }
  | { kind: "flash"; at?: number }
  | { kind: "sparks"; at: [number, number, number] }
  | { kind: "question" };
export const FX_KINDS = ["beam", "flash", "sparks", "question"] as const;
/** Defaults for a beam without "through": the accelerator beam-pipe line. */
export const BEAM_DEFAULT = { y: 1.2, z: 0.85 };

type Pt = { x: number; y: number };
const full: React.CSSProperties = { position: "absolute", inset: 0, overflow: "visible" };
const cap = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Straight horizontal beam along world x at height y, depth z. If `head` (screen point) is given,
 * the projected line is shifted so it passes exactly through it.
 */
export const BeamFx: React.FC<{
  cam3: THREE.PerspectiveCamera; width: number; height: number; t: number; frame: number;
  y: number; z: number; x0?: number; head?: Pt; from?: number; strength?: number;
}> = ({ cam3, width, height, t, frame, y, z, x0 = 0, head, from = 0, strength = 1 }) => {
  const on = clamp01((t - from) / 0.12) * clamp01(strength);
  if (on <= 0) return null;
  const pts = [];
  for (let x = -60; x <= 60; x += 2) {
    const p = project(cam3, [x0 + x, y, z], width, height);
    if (p.depth > 0.3) pts.push(p);
  }
  if (pts.length < 2) return null;
  const a = pts[0], b = pts[pts.length - 1];
  const m = Math.abs(b.x - a.x) < 1e-3 ? 0 : (b.y - a.y) / (b.x - a.x);
  const dy = head ? head.y - (a.y + m * (head.x - a.x)) : 0;
  const X1 = -200, X2 = width + 200;
  const Y = (X: number) => a.y + m * (X - a.x) + dy;
  const ppu = project(cam3, [x0, y, z], width, height).ppu;
  // thickness follows distance, capped so a close-up is not flooded
  const core = cap(0.028 * ppu, 2.5, 13);
  const halo = cap(0.2 * ppu, 22, 140);
  const flick = 0.9 + 0.06 * Math.sin(frame * 1.9) + 0.04 * Math.sin(frame * 4.7 + 1);
  const k = on * flick;
  const len = Math.hypot(X2 - X1, Y(X2) - Y(X1));
  const ux = (X2 - X1) / len, uy = (Y(X2) - Y(X1)) / len;
  const r = rng(4242);
  const sparkles = Array.from({ length: 54 }).map(() => ({ u: r(), sp: 0.18 + r() * 0.45, off: (r() - 0.5) * 2, ph: r() * 6.28, s: 0.35 + r() * 0.7 }));
  const line = (w: number, c: string, o: number) => <line x1={X1} y1={Y(X1)} x2={X2} y2={Y(X2)} stroke={c} strokeWidth={w} strokeOpacity={o} />;
  const hg = head ? cap(0.16 * ppu, 30, 150) : 0;
  return (
    <>
      <svg width={width} height={height} style={{ ...full, mixBlendMode: "screen", filter: "blur(7px)" }}>
        {line(halo, "#4a3cff", 0.16 * k)}
        {line(halo * 0.55, "#6a62ff", 0.26 * k)}
        {line(halo * 0.26, "#8f98ff", 0.42 * k)}
      </svg>
      {head ? (
        <div style={{ position: "absolute", left: head.x - hg, top: head.y - hg, width: hg * 2, height: hg * 2, borderRadius: "50%", mixBlendMode: "screen", background: `radial-gradient(circle, rgba(190,200,255,${0.55 * k}) 0%, rgba(120,110,255,${0.22 * k}) 40%, rgba(120,110,255,0) 70%)` }} />
      ) : null}
      <svg width={width} height={height} style={{ ...full, mixBlendMode: "screen" }}>
        {line(core * 2.2, "#9fa8ff", 0.55 * k)}
        {line(core, "#d6dcff", 0.95 * k)}
        {line(Math.max(1.2, core * 0.38), "#ffffff", k)}
        {sparkles.map((s, i) => {
          const u = (s.u + t * s.sp) % 1;
          const d = u * len;
          const wob = s.off * core * 2.2 + Math.sin(t * 9 + s.ph) * core * 0.6;
          const cx = X1 + ux * d - uy * wob, cy = Y(X1) + uy * d + ux * wob;
          const rr = cap(core * s.s, 1.2, 6);
          return <circle key={i} cx={cx} cy={cy} r={rr} fill="#f2f0ff" opacity={k * (0.45 + 0.55 * Math.abs(Math.sin(frame * 0.7 + s.ph)))} />;
        })}
      </svg>
    </>
  );
};

/** Full-frame white flash: full white within 2 frames, holds ~0.25 s, fades over ~1 s. */
export const FlashFx: React.FC<{ t: number; at?: number }> = ({ t, at = 0 }) => {
  const d = t - at;
  if (d < 0) return null;
  const rise = 2 / 30;
  const o = d < rise ? (d * 30 + 1) / 2 : d < rise + 0.25 ? 1 : 1 - (d - rise - 0.25) / 1.0;
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: "#ffffff", opacity: Math.min(1, o) }} />;
};

/** Small flickering electric sparks at a world point. */
export const SparksFx: React.FC<{ cam3: THREE.PerspectiveCamera; width: number; height: number; frame: number; at: V3 }> = ({ cam3, width, height, frame, at }) => {
  const P = project(cam3, at, width, height);
  if (P.depth < 0.2) return null;
  const L = cap(0.15 * P.ppu, 16, 80);
  const salt = Math.round(at[0] * 97 + at[1] * 31 + at[2] * 13);
  const r = rng((Math.floor(frame / 2) + 1) * 7919 + salt);
  const on = r() < 0.78;
  const bolts = on
    ? Array.from({ length: 3 + Math.floor(r() * 3) }).map(() => {
        let ang = r() * Math.PI * 2;
        const len = L * (0.5 + r() * 0.7);
        let x = P.x, y = P.y;
        const pts = [`${x},${y}`];
        for (let i = 0; i < 4; i++) {
          ang += (r() - 0.5) * 1.3;
          x += Math.cos(ang) * len / 4;
          y += Math.sin(ang) * len / 4;
          pts.push(`${x},${y}`);
        }
        return pts.join(" ");
      })
    : [];
  // falling sparks: each one lives 12 frames
  const dots = Array.from({ length: 7 }).map((_, i) => {
    const rr = rng(salt * 3 + i * 101 + Math.floor((frame + i * 5) / 12) * 13);
    const age = ((frame + i * 5) % 12) / 30;
    const vx = (rr() - 0.5) * 8 * L, vy = -(1 + rr() * 3) * L;
    return { x: P.x + vx * age, y: P.y + vy * age + 0.5 * 40 * L * age * age, o: 1 - age * 2.5 };
  });
  const sw = cap(L * 0.045, 1.4, 3.5);
  const g = Math.min(L * 1.5, 120);
  return (
    <>
      {on ? <div style={{ position: "absolute", left: P.x - g, top: P.y - g, width: g * 2, height: g * 2, borderRadius: "50%", mixBlendMode: "screen", background: "radial-gradient(circle, rgba(200,225,255,0.7) 0%, rgba(120,170,255,0.25) 35%, rgba(120,170,255,0) 70%)" }} /> : null}
      <svg width={width} height={height} style={{ ...full, mixBlendMode: "screen" }}>
        {bolts.map((d, i) => (
          <g key={i} fill="none" strokeLinejoin="round" strokeLinecap="round">
            <polyline points={d} stroke="#6fa8ff" strokeWidth={sw * 3} strokeOpacity={0.45} />
            <polyline points={d} stroke="#f2f8ff" strokeWidth={sw} />
          </g>
        ))}
        {dots.map((d, i) => (d.o > 0 ? <circle key={i} cx={d.x} cy={d.y} r={sw * 0.9} fill="#fff4c8" opacity={d.o} /> : null))}
      </svg>
    </>
  );
};

/** A few large, faint question marks drifting behind an actor's head (draw under the actors). */
export const QuestionFx: React.FC<{ head: Pt; ppu: number; t: number; width: number; height: number }> = ({ head, ppu, t, width, height }) => {
  const size = cap(0.5 * ppu, 70, 300);
  const fade = clamp01(t / 0.4);
  const marks = [
    { dx: -0.75, dy: -0.25, s: 1.0, ph: 0 },
    { dx: 0.8, dy: -0.55, s: 0.8, ph: 2.1 },
    { dx: 0.05, dy: -1.15, s: 1.2, ph: 4.0 },
  ];
  return (
    <svg width={width} height={height} style={full}>
      {marks.map((m, i) => {
        const rise = (t * 0.22 + i * 0.13) % 0.6;
        const x = head.x + m.dx * size + Math.sin(t * 1.3 + m.ph) * size * 0.08;
        const y = head.y + m.dy * size - rise * size;
        const o = fade * 0.3 * Math.sin(Math.PI * (rise / 0.6)) + fade * 0.08;
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontFamily="Kanit" fontWeight={800} fontSize={size * m.s} fill="#ffffff" fillOpacity={o} stroke="#2a3340" strokeOpacity={o * 0.5} strokeWidth={size * 0.02} transform={`rotate(${Math.sin(t * 0.9 + m.ph) * 10} ${x} ${y})`}>
            ?
          </text>
        );
      })}
    </svg>
  );
};
