import React from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import type { TimeOfDay } from "./Light";
import { Cam, clamp01, easeInOut, easeOut, easeOutBack, lerp, project, rng, V3 } from "./lib";

// Moods: one reusable look-and-feel layer over any set. A mood never changes the set itself; it grades the
// finished picture, moves the camera a little differently, styles the captions and cards, and adds a few
// ambient effects that need no script. Everything for a mood lives in MOODS below.
// Flashback is a separate treatment (sepia, grain, gate weave, white whoosh in and out) that can sit on top.

export type MoodName = "horror" | "comedy" | "drama" | "explainer";
export const MOOD_NAMES: readonly MoodName[] = ["horror", "comedy", "drama", "explainer"];
/** Script form: "horror", or { "kind": "horror", "time": true } to let the mood choose the time of day. */
export type MoodCue = MoodName | { kind: MoodName; time?: boolean };

type CaptionLook = {
  weight: number;
  size: number;
  color: string;
  hi: string; // highlight colour for *word*
  shadow: string; // text-shadow (outline)
  box?: string; // background box behind the line
  enter: "jitter" | "pop" | "fade" | "slide";
};
type CardLook = { bg: string; border: string; title: string; value: string; unit: string; weight: number; radius: number; tilt: number; shadow: string };
type MoodDef = {
  label: string;
  filter: string; // CSS filter over the set and actors
  multiply?: string; // colour laid over with "multiply"
  wash?: string; // colour laid over normally
  vignette?: { clear: number; color: string };
  grain: number; // 0..1 film grain strength
  flicker: number; // 0..1 slow brightness flicker
  time?: TimeOfDay; // default time when the shot has none and the script opts in with { "time": true }
  cam: { drift: number; push: number; travel: number; punch: number; punchFrames: number; snap: boolean };
  caption: CaptionLook;
  card: CardLook;
  ambient: "fog" | "sparkles" | "dust" | null;
  captionShade: boolean; // dark gradient under the captions
};

/** Thick outline made of many shadows (works for every font, unlike text-stroke). */
const ring = (r: number, c: string, n = 16) =>
  Array.from({ length: n }).map((_, i) => `${(Math.cos((i / n) * Math.PI * 2) * r).toFixed(1)}px ${(Math.sin((i / n) * Math.PI * 2) * r).toFixed(1)}px 0 ${c}`).join(", ");

export const MOODS: Record<MoodName, MoodDef> = {
  horror: {
    label: "สยองขวัญ",
    filter: "saturate(0.42) contrast(1.1) brightness(0.97)",
    multiply: "rgb(184,212,210)", // cold green-blue
    wash: "rgba(14,40,44,0.10)",
    vignette: { clear: 36, color: "rgba(0,5,8,0.8)" },
    grain: 0.55,
    flicker: 1,
    time: "night",
    cam: { drift: 1, push: 0.14, travel: 1, punch: 0.03, punchFrames: 7, snap: false },
    caption: { weight: 700, size: 66, color: "#ece6da", hi: "#e3262f", shadow: `${ring(4, "rgba(0,0,0,0.85)")}, 0 0 18px rgba(0,0,0,0.9)`, enter: "jitter" },
    card: { bg: "rgba(14,10,10,0.88)", border: "#8a0f14", title: "#b9aea2", value: "#ece6da", unit: "#c3121c", weight: 700, radius: 6, tilt: 0, shadow: "0 0 40px rgba(0,0,0,0.6)" },
    ambient: "fog",
    captionShade: true,
  },
  comedy: {
    label: "ตลก",
    filter: "saturate(1.32) brightness(1.07) contrast(1.04)",
    wash: "rgba(255,196,110,0.07)",
    vignette: { clear: 62, color: "rgba(70,36,0,0.16)" },
    grain: 0,
    flicker: 0,
    cam: { drift: 0, push: 0, travel: 1, punch: 0.075, punchFrames: 5, snap: true },
    caption: { weight: 800, size: 76, color: "#1e1a2a", hi: "#e8203a", shadow: `${ring(7, "#ffd21f", 20)}, 0 9px 0 rgba(0,0,0,0.5)`, enter: "pop" },
    card: { bg: "#ffd21f", border: "#1e1a2a", title: "#3a3020", value: "#1e1a2a", unit: "#e8203a", weight: 800, radius: 34, tilt: -3, shadow: "0 10px 0 rgba(0,0,0,0.3)" },
    ambient: "sparkles",
    captionShade: true,
  },
  drama: {
    label: "ดราม่า",
    filter: "contrast(0.86) saturate(0.74) sepia(0.12) brightness(0.99)",
    wash: "rgba(255,186,130,0.07)",
    vignette: { clear: 48, color: "rgba(34,20,10,0.42)" },
    grain: 0.18,
    flicker: 0,
    cam: { drift: 0, push: 0, travel: 0.35, punch: 0, punchFrames: 7, snap: false },
    caption: { weight: 500, size: 64, color: "#fffaf2", hi: "#ffc978", shadow: `${ring(2.5, "rgba(20,12,6,0.75)", 12)}, 0 3px 16px rgba(0,0,0,0.85)`, enter: "fade" },
    card: { bg: "rgba(36,26,20,0.72)", border: "#d9a86a", title: "#e0d2c0", value: "#f5eee4", unit: "#f2c27b", weight: 500, radius: 18, tilt: 0, shadow: "0 8px 30px rgba(0,0,0,0.35)" },
    ambient: "dust",
    captionShade: true,
  },
  explainer: {
    label: "อธิบาย",
    filter: "saturate(0.96) brightness(1.06) contrast(1.03)",
    grain: 0,
    flicker: 0,
    cam: { drift: 0, push: 0, travel: 0.2, punch: 0.02, punchFrames: 6, snap: false },
    caption: { weight: 700, size: 62, color: "#ffffff", hi: "#ffd84a", shadow: "none", box: "rgba(16,20,30,0.84)", enter: "slide" },
    card: { bg: "#ffffff", border: "#ffd84a", title: "#5a6478", value: "#12161e", unit: "#2a6af0", weight: 800, radius: 26, tilt: 0, shadow: "0 10px 30px rgba(0,0,0,0.25)" },
    ambient: null,
    captionShade: false,
  },
};

export const moodKind = (m: MoodCue | undefined): MoodName | undefined => (m === undefined ? undefined : typeof m === "string" ? m : m.kind);
export const moodTimeOptIn = (m: MoodCue | undefined) => typeof m === "object" && m !== null && m.time === true;

/** Mood of a shot: the shot's own, else the clip's. */
export const shotMood = (clipMood: MoodCue | undefined, shotMoodCue: MoodCue | undefined) => moodKind(shotMoodCue ?? clipMood);
/** Time of day a shot renders at: its own time, else (only when the mood opts in with time: true) the mood's. */
export const shotTime = (time: TimeOfDay | undefined, clipMood: MoodCue | undefined, shotMoodCue: MoodCue | undefined): TimeOfDay | undefined => {
  if (time) return time;
  const cue = shotMoodCue ?? clipMood;
  const k = moodKind(cue);
  return k && moodTimeOptIn(cue) ? MOODS[k].time : undefined;
};

// ---------- camera feel ----------
/** Progress through the camera move: drama and explainer travel less of it (slower, steadier). */
export const moodProgress = (mood: MoodName | undefined, p: number) => {
  if (!mood) return p;
  const k = MOODS[mood].cam.travel;
  return 0.5 + (p - 0.5) * k;
};
/** Handheld drift and the occasional slow push-in of horror; untouched for the other moods. */
export const moodCam = (mood: MoodName | undefined, cam: Cam, t: number, p: number, seed: number): Cam => {
  if (!mood) return cam;
  const C = MOODS[mood].cam;
  if (!C.drift && !C.push) return cam;
  const d: V3 = [cam.target[0] - cam.pos[0], cam.target[1] - cam.pos[1], cam.target[2] - cam.pos[2]];
  const dist = Math.hypot(...d);
  const r = rng(seed);
  const pushes = r() < 0.6; // "occasional": about every other shot
  const push = pushes ? C.push * easeInOut(p) : 0;
  const k = C.drift * Math.min(1, dist / 4) * 0.035; // metres of drift, less on close-ups
  const ph = r() * 6.28;
  const wob = (a: number, b: number) => Math.sin(t * a + ph) * 0.6 + Math.sin(t * b + ph * 1.7) * 0.4;
  const pos: V3 = [cam.pos[0] + d[0] * push + wob(0.9, 2.3) * k, cam.pos[1] + d[1] * push + wob(1.3, 0.7) * k * 0.6, cam.pos[2] + d[2] * push];
  const target: V3 = [cam.target[0] + wob(0.7, 1.9) * k * 0.8, cam.target[1] + wob(1.1, 2.9) * k * 0.6, cam.target[2]];
  return { ...cam, pos, target };
};
/** Zoom punch at the cut (the default kit uses 1 + 0.045 easing out over 7 frames). */
export const moodPunch = (mood: MoodName | undefined, lf: number, dur: number) => {
  if (!mood) return 1 + 0.045 * (1 - easeOut(lf / 7));
  const C = MOODS[mood].cam;
  if (C.snap) {
    // comedy: snaps in hard on the cut, overshoots, then eases back over the shot
    const inK = easeOutBack(lf / C.punchFrames);
    return 1.0 + C.punch * inK * (1 - 0.5 * clamp01(lf / (dur * 30)));
  }
  return 1 + C.punch * (1 - easeOut(lf / C.punchFrames));
};

// ---------- grade ----------
const full: React.CSSProperties = { position: "absolute", inset: 0, overflow: "visible" };

/** CSS filter for the stage (set + actors) of a mood / flashback, with the slow horror flicker. */
export const gradeFilter = (mood: MoodName | undefined, flashback: boolean, frame: number) => {
  const parts: string[] = [];
  if (mood && !flashback) parts.push(MOODS[mood].filter);
  if (flashback) parts.push("sepia(0.82) saturate(0.62) contrast(0.86) brightness(1.03)");
  if (mood && MOODS[mood].flicker) {
    const r = rng(Math.floor(frame / 4) * 977 + 31);
    const dip = r() < 0.06 ? 0.12 * r() : 0; // now and then a short dip
    const f = 1 - 0.035 * (0.5 + 0.5 * Math.sin(frame * 0.21)) - 0.02 * (0.5 + 0.5 * Math.sin(frame * 0.53 + 1)) - dip;
    parts.push(`brightness(${f.toFixed(3)})`);
  }
  return parts.length ? parts.join(" ") : undefined;
};

/** Film grain: seeded per frame (feTurbulence seed), blended softly. */
export const Grain: React.FC<{ width: number; height: number; frame: number; amount: number; id: string }> = ({ width, height, frame, amount, id }) =>
  amount > 0 ? (
    <svg width={width} height={height} style={{ ...full, mixBlendMode: "overlay", opacity: amount * 0.55 }}>
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={0.85 * (1080 / width)} numOctaves={2} seed={(frame % 61) + 1} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={width} height={height} filter={`url(#${id})`} />
    </svg>
  ) : null;

/** Overlays after the stage: multiply tint, wash, vignette, grain (a mood's or the flashback's). */
export const MoodGrade: React.FC<{ mood?: MoodName; flashback: boolean; width: number; height: number; frame: number }> = ({ mood, flashback, width, height, frame }) => {
  const M = mood ? MOODS[mood] : null;
  if (flashback) {
    const r = rng(frame * 131 + 7);
    // a few dust specks and a hairline scratch now and then, re-drawn every frame like old film
    const specks = Array.from({ length: 5 }).map(() => ({ x: r() * width, y: r() * height, s: (1 + r() * 3) * (width / 1080), on: r() < 0.5 }));
    const scratch = r() < 0.35 ? { x: r() * width, o: 0.15 + r() * 0.2 } : null;
    return (
      <>
        <AbsoluteFill style={{ background: "rgba(255,226,170,0.12)" }} />
        <AbsoluteFill style={{ background: "rgba(246,232,206,0.10)" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 78% 64% at 50% 46%, rgba(0,0,0,0) 46%, rgba(46,28,10,0.6) 100%)" }} />
        <Grain width={width} height={height} frame={frame} amount={0.75} id="fbgrain" />
        <svg width={width} height={height} style={full}>
          {specks.map((s, i) => (s.on ? <circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#2a1e12" opacity={0.35} /> : null))}
          {scratch ? <rect x={scratch.x} y={0} width={1.5 * (width / 1080)} height={height} fill="#f4ead8" opacity={scratch.o} /> : null}
        </svg>
      </>
    );
  }
  if (!M) return null;
  return (
    <>
      {M.multiply ? <AbsoluteFill style={{ background: M.multiply, mixBlendMode: "multiply" }} /> : null}
      {M.wash ? <AbsoluteFill style={{ background: M.wash }} /> : null}
      {M.vignette ? <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 64% at 50% 46%, rgba(0,0,0,0) ${M.vignette.clear}%, ${M.vignette.color} 100%)` }} /> : null}
      <Grain width={width} height={height} frame={frame} amount={M.grain} id="moodgrain" />
    </>
  );
};

/** Gate weave of the flashback: the picture wobbles a pixel or two like film in an old projector. */
export const gateWeave = (frame: number, width: number) => {
  const r = rng(frame * 53 + 3);
  const k = width / 1080;
  const dx = (Math.sin(frame * 0.37) * 1.4 + (r() - 0.5) * 1.6) * k;
  const dy = (Math.sin(frame * 0.23 + 1) * 2.2 + (r() - 0.5) * 1.8) * k;
  return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(1.012)`;
};

/** White whoosh into (start) and out of (end) a flashback run: a bright streak sweeps across and the frame flares white. */
export const FlashbackWhoosh: React.FC<{ t: number; dur: number; start: boolean; end: boolean; width: number; height?: number }> = ({ t, dur, start, end, width }) => {
  const L = 0.4;
  let k = -1; // 0..1 progress of the sweep, -1 = none
  let white = 0;
  if (start && t < L) {
    k = t / L;
    white = 1 - easeOut(t / L);
  } else if (end && t > dur - L) {
    k = (t - (dur - L)) / L;
    white = Math.pow(clamp01(k), 2);
  }
  if (k < 0) return null;
  const x = lerp(-0.6, 1.6, easeInOut(k)) * width;
  const bw = width * 0.9;
  return (
    <>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: x - bw / 2, width: bw, background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,250,240,0.85) 45%, rgba(255,255,255,0.95) 50%, rgba(255,250,240,0.85) 55%, rgba(255,255,255,0) 100%)", filter: `blur(${18 * (width / 1080)}px)`, opacity: 0.9 }} />
      <AbsoluteFill style={{ background: "#fffaf0", opacity: white }} />
    </>
  );
};

// ---------- ambient effects ----------
type AmbProps = { cam3: THREE.PerspectiveCamera; width: number; height: number; t: number; frame: number; focus: V3; seed: number };

/** Horror: slow fog drifting at ground level (drawn over the actors' feet). */
export const GroundFog: React.FC<AmbProps> = ({ cam3, width, height, t, focus, seed }) => {
  const r = rng(seed * 17 + 5);
  const banks = Array.from({ length: 16 }).map(() => ({ x: (r() - 0.5) * 9, z: (r() - 0.65) * 5, y: 0.02 + r() * 0.12, w: 1.1 + r() * 1.4, sp: 0.08 + r() * 0.12, a: 0.5 + r() * 0.5, ph: r() * 6.28 }));
  return (
    <svg width={width} height={height} style={{ ...full, filter: `blur(${16 * (width / 1080)}px)` }}>
      {banks.map((b, i) => {
        const x = focus[0] + ((((b.x + t * b.sp + 4.5) % 9) + 9) % 9) - 4.5;
        const pr = project(cam3, [x, b.y, focus[2] + b.z], width, height);
        if (pr.depth < 0.5) return null;
        const rx = Math.min(b.w * pr.ppu, 700 * (width / 1080));
        const ry = Math.min(0.13 * pr.ppu, 80 * (width / 1080));
        const o = 0.11 * b.a * (0.75 + 0.25 * Math.sin(t * 0.5 + b.ph));
        return <ellipse key={i} cx={pr.x} cy={pr.y} rx={rx} ry={ry} fill="#c8d6d8" opacity={o} />;
      })}
    </svg>
  );
};

/** Horror: now and then a faint shadow figure crosses far behind the actors (drawn under the actors). */
export const ShadowFigure: React.FC<AmbProps & { dur: number; back: number }> = ({ cam3, width, height, t, focus, seed, dur, back }) => {
  const r = rng(seed * 29 + 11);
  if (r() > 0.75) return null; // not in every shot
  const span = Math.max(1.2, Math.min(3.2, dur * 0.9));
  const t0 = (dur - span) * r();
  const k = (t - t0) / span;
  if (k < 0 || k > 1) return null;
  const dir = r() < 0.5 ? 1 : -1;
  const x = focus[0] + dir * lerp(-2.4, 2.4, k);
  const z = focus[2] - back;
  const foot = project(cam3, [x, 0, z], width, height);
  if (foot.depth < 0.5) return null;
  const s = foot.ppu; // px per metre
  const sway = Math.sin(k * Math.PI * 6) * 0.015 * s;
  const o = 0.62 * Math.pow(Math.sin(Math.PI * k), 0.6);
  const H = 1.72 * s;
  const d = `M ${-0.2 * s} ${-1.42 * s} Q 0 ${-1.52 * s} ${0.2 * s} ${-1.42 * s} L ${0.17 * s} ${-0.75 * s} L ${0.13 * s} 0 L ${-0.13 * s} 0 L ${-0.17 * s} ${-0.75 * s} Z`;
  return (
    <svg width={width} height={height} style={{ ...full, filter: `blur(${Math.max(3, 0.03 * s)}px)` }}>
      <g transform={`translate(${foot.x + sway} ${foot.y})`} opacity={o}>
        {/* faint cold rim, as if backlit by the moon, so the shape still reads on dark walls */}
        <g transform={`translate(0 ${0.02 * s}) scale(1.09)`} opacity={0.32}>
          <path d={d} fill="#a9c0cc" />
          <ellipse cx={0} cy={-H + 0.12 * s} rx={0.1 * s} ry={0.12 * s} fill="#a9c0cc" />
        </g>
        <path d={d} fill="#000000" />
        <ellipse cx={0} cy={-H + 0.12 * s} rx={0.1 * s} ry={0.12 * s} fill="#000000" />
      </g>
    </svg>
  );
};

/** Drama: dust motes floating in the light. */
export const DustMotes: React.FC<AmbProps> = ({ cam3, width, height, t, focus, seed }) => {
  const r = rng(seed * 41 + 2);
  const motes = Array.from({ length: 70 }).map(() => ({ x: (r() - 0.5) * 3.2, y: 0.3 + r() * 2.2, z: (r() - 0.3) * 2.6, ph: r() * 6.28, s: 0.6 + r() * 1.1, sp: 0.02 + r() * 0.04 }));
  return (
    <svg width={width} height={height} style={{ ...full, mixBlendMode: "screen" }}>
      {motes.map((m, i) => {
        const pr = project(cam3, [focus[0] + m.x + Math.sin(t * 0.3 + m.ph) * 0.15, 0.3 + ((m.y + t * m.sp) % 2.3), focus[2] + m.z + Math.cos(t * 0.25 + m.ph) * 0.12], width, height);
        if (pr.depth < 0.5) return null;
        const rr = Math.max(1.2, Math.min(5, 0.009 * m.s * pr.ppu)) * (width / 1080);
        return <circle key={i} cx={pr.x} cy={pr.y} r={rr} fill="#ffe8c4" opacity={(0.18 + 0.32 * Math.abs(Math.sin(t * 0.8 + m.ph))) * (rr > 4 ? 0.6 : 1)} />;
      })}
    </svg>
  );
};

// ---------- captions and cards ----------
const Sparkle: React.FC<{ x: string; y: string; t: number; ph: number; size: number }> = ({ x, y, t, ph, size }) => {
  const k = 0.5 + 0.5 * Math.sin(t * 9 + ph);
  const s = size * (0.55 + 0.6 * k);
  return (
    <svg width={s} height={s} viewBox="-10 -10 20 20" style={{ position: "absolute", left: x, top: y, marginLeft: -s / 2, marginTop: -s / 2, overflow: "visible", opacity: 0.4 + 0.6 * k }}>
      <path d="M0 -10 Q1.6 -1.6 10 0 Q1.6 1.6 0 10 Q-1.6 1.6 -10 0 Q-1.6 -1.6 0 -10 Z" fill="#fff6c0" stroke="#ffb400" strokeWidth={1.2} transform={`rotate(${(t * 60 + ph * 50) % 360})`} />
    </svg>
  );
};

export const MoodCaption: React.FC<{ mood: MoodName; lines: string[]; t: number; dur: number; frame: number }> = ({ mood, lines, t, dur, frame }) => {
  const L = MOODS[mood].caption;
  const slot = dur / lines.length;
  const i = Math.min(lines.length - 1, Math.floor(t / slot));
  const lt = t - i * slot;
  const parts = lines[i].split("*");
  let transform = "";
  let opacity = 1;
  if (L.enter === "jitter") {
    const r = rng(Math.floor(frame / 2) * 7 + i);
    transform = `translate(${((r() - 0.5) * 3).toFixed(1)}px, ${((r() - 0.5) * 3).toFixed(1)}px)`;
    opacity = clamp01(lt / 0.3) * (r() < 0.04 ? 0.75 : 1);
  } else if (L.enter === "pop") {
    const k = easeOutBack(lt / 0.22);
    const bounce = Math.sin(clamp01(lt / 0.5) * Math.PI * 2) * (1 - clamp01(lt / 0.5)) * 14;
    transform = `translateY(${(-bounce).toFixed(1)}px) scale(${lerp(0.35, 1, k).toFixed(3)}) rotate(${lerp(-6, -1.5, k).toFixed(2)}deg)`;
    opacity = clamp01(lt / 0.06);
  } else if (L.enter === "fade") {
    transform = `translateY(${lerp(14, 0, easeOut(lt / 0.6)).toFixed(1)}px)`;
    opacity = clamp01(lt / 0.55);
  } else {
    transform = `translateY(${lerp(26, 0, easeOut(lt / 0.22)).toFixed(1)}px)`;
    opacity = clamp01(lt / 0.16);
  }
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: 1490, textAlign: "center" }}>
      <div
        style={{
          display: "inline-block", transform, opacity, fontFamily: "Kanit", fontWeight: L.weight, fontSize: L.size, lineHeight: 1.22, color: L.color, textShadow: L.shadow,
          ...(L.box ? { background: L.box, borderRadius: 28, padding: "14px 34px 20px" } : {}),
        }}
      >
        {parts.map((s, k) => (
          <span key={k} style={{ color: k % 2 ? L.hi : L.color, position: "relative" }}>
            {s}
            {k % 2 && mood === "comedy" && lt > 0.15 ? (
              <>
                <Sparkle x="-4%" y="8%" t={lt} ph={0} size={46} />
                <Sparkle x="102%" y="18%" t={lt} ph={2.1} size={38} />
                <Sparkle x="88%" y="96%" t={lt} ph={4.2} size={30} />
              </>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
};

export const MoodCard: React.FC<{ mood: MoodName; card: { title: string; value: number; unit?: string }; t: number; frame: number }> = ({ mood, card, t, frame }) => {
  const C = MOODS[mood].card;
  const enter = MOODS[mood].caption.enter;
  let transform = `translateX(${lerp(-80, 0, easeOutBack(t / 0.35))}px)`;
  let opacity = clamp01(t / 0.15);
  if (enter === "pop") transform = `scale(${lerp(0.3, 1, easeOutBack(t / 0.25))}) rotate(${C.tilt}deg)`;
  if (enter === "fade") { transform = `translateY(${lerp(16, 0, easeOut(t / 0.7))}px)`; opacity = clamp01(t / 0.6); }
  if (enter === "jitter") {
    const r = rng(Math.floor(frame / 2) * 5 + 3);
    transform = `translate(${((r() - 0.5) * 3).toFixed(1)}px, ${((r() - 0.5) * 3).toFixed(1)}px)`;
    opacity = clamp01(t / 0.4);
  }
  const v = Math.round(card.value * easeOut((t - 0.25) / 1.1)).toLocaleString("en-US");
  return (
    <div style={{ position: "absolute", left: 80, top: 150, transform, transformOrigin: "left center", opacity, fontFamily: "Kanit", background: C.bg, borderRadius: C.radius, padding: "16px 34px 22px", boxShadow: C.shadow, borderLeft: `14px solid ${C.border}`, ...(mood === "comedy" ? { border: `6px solid ${C.border}`, borderLeft: `14px solid ${C.border}` } : {}) }}>
      <div style={{ color: C.title, fontWeight: 500, fontSize: 44, lineHeight: 1.1 }}>{card.title}</div>
      <div style={{ color: C.value, fontWeight: C.weight, fontSize: 92, lineHeight: 1.05 }}>
        {v}
        {card.unit ? <span style={{ fontSize: 48, fontWeight: 700, marginLeft: 14, color: C.unit }}>{card.unit}</span> : null}
      </div>
    </div>
  );
};
