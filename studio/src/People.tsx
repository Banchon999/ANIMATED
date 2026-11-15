import React, { useId } from "react";
import { AbsoluteFill } from "remotion";
import { ensureFonts, lerp, rad, rng } from "./lib";
import { Gait, GAITS } from "./Character";

// Batch 1: seeded person generator + reusable pose / hand / mouth / emotion libraries.
// 100 units = 1 m, origin on the ground between the feet. See README for the scale table.

ensureFonts();
const INK = "#231c1a";

// ---------- who ----------
export type Era = "old" | "rural" | "city";
export type Age = "child" | "teen" | "adult" | "elder";
export type PersonSpec = {
  seed: number;
  age: Age;
  female: boolean;
  era: Era;
  h: number; // height in units
  wide: number; // body width factor
  skin: string;
  hair: string;
  hairStyle: number; // 0..5
  top: string;
  topKind: "tee" | "shirt" | "wrap";
  pattern: "plain" | "stripes" | "check" | "dots";
  patternColor: string;
  bottom: string;
  bottomKind: "pants" | "shorts" | "sarong" | "skirt";
  shoe: string | null;
  extra: "none" | "sash" | "hat" | "glasses" | "bag";
};

const SKINS = ["#f0c9a4", "#e3b088", "#cf9a70", "#b98058", "#9c6844"];
const TOPS: Record<Era, string[]> = {
  old: ["#e8dcc6", "#34466e", "#7a3b3b", "#566b4a", "#c9a56a", "#5a4a6e"],
  rural: ["#e4573f", "#3aa57c", "#f3c044", "#5b8cf0", "#f08fa8", "#8a6fd0", "#ffffff"],
  city: ["#22303c", "#f4f4f4", "#c44536", "#2f6f8f", "#d8c7a0", "#6b7a8f", "#e9a23b"],
};
const BOTTOMS: Record<Era, string[]> = {
  old: ["#2b2f3f", "#5a2f3a", "#3d4a36", "#4a3a2a"],
  rural: ["#33507c", "#4a4038", "#7b4fa3", "#2f6f5a", "#8a5a3a"],
  city: ["#1f2530", "#3a4660", "#6d5a4a", "#c9c2b4", "#2f3f3a"],
};

export const makePerson = (seed: number, want: Partial<Pick<PersonSpec, "age" | "female" | "era">> = {}): PersonSpec => {
  const r = rng(seed * 7919 + 13);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const age = want.age ?? pick<Age>(["child", "teen", "adult", "adult", "adult", "elder"]);
  const female = want.female ?? r() < 0.5;
  const era = want.era ?? pick<Era>(["old", "rural", "city"]);
  const base = { child: 118, teen: 150, adult: female ? 158 : 169, elder: female ? 151 : 161 }[age];
  const dark = pick(["#1d1614", "#2a1f1a", "#15131a", "#3a2a1e"]);
  const bottomKind =
    era === "old"
      ? pick<PersonSpec["bottomKind"]>(female ? ["sarong", "sarong", "skirt"] : ["pants", "sarong", "shorts"])
      : pick<PersonSpec["bottomKind"]>(female ? ["pants", "skirt", "sarong", "shorts"] : ["pants", "pants", "shorts"]);
  return {
    seed,
    age,
    female,
    era,
    h: base + (r() - 0.5) * 8,
    wide: (age === "child" ? 0.92 : 1) * (0.9 + r() * 0.3) * (female ? 0.94 : 1.04),
    skin: pick(SKINS),
    hair: age === "elder" ? pick(["#c9c5c0", "#9a9692", "#e4e1dc"]) : dark,
    hairStyle: Math.floor(r() * 6),
    top: pick(TOPS[era]),
    topKind: era === "old" ? pick<PersonSpec["topKind"]>(["shirt", "wrap", "tee"]) : pick<PersonSpec["topKind"]>(["tee", "shirt", "tee"]),
    pattern: pick<PersonSpec["pattern"]>(["plain", "plain", "stripes", "check", "dots"]),
    patternColor: pick(["#ffffff", "#f6e7c8", "#1f2530", "#ffd15c"]),
    bottom: pick(BOTTOMS[era]),
    bottomKind,
    shoe: era === "old" ? null : pick(["#2b2b2b", "#f4f4f4", "#8a4b2a", "#d94f70"]),
    extra: pick<PersonSpec["extra"]>(era === "old" ? ["none", "sash", "sash", "hat"] : era === "city" ? ["none", "glasses", "bag", "none"] : ["none", "hat", "bag", "none"]),
  };
};

// ---------- libraries ----------
// Angles in degrees. Arms/legs: 0 = hanging down, + = away from the body (outward). Elbow: + bends the forearm up/in.
export type Hand = "open" | "fist" | "point" | "flat";
export type Pose = {
  armL: number; elbowL: number; armR: number; elbowR: number;
  legL: number; legR: number; lean: number; head: number; crouch: number;
  handL: Hand; handR: Hand;
};
const P = (a: Partial<Pose>): Pose => ({ armL: 8, elbowL: 6, armR: 8, elbowR: 6, legL: 3, legR: 3, lean: 0, head: 0, crouch: 0, handL: "open", handR: "open", ...a });
export const POSES = {
  stand: P({}),
  wai: P({ armL: 10, elbowL: 216, armR: 10, elbowR: 216, head: 6, lean: 4, handL: "flat", handR: "flat" }),
  point: P({ armR: 82, elbowR: 6, handR: "point", armL: 12, lean: 3 }),
  wave: P({ armR: 135, elbowR: 40, handR: "open", head: -5 }),
  shock: P({ armL: 62, elbowL: 95, armR: 62, elbowR: 95, lean: -6, legL: 9, legR: 9 }),
  think: P({ armR: 22, elbowR: 150, handR: "fist", armL: 24, elbowL: 80, head: 8 }),
  carry: P({ armL: 30, elbowL: 100, armR: 30, elbowR: 100, handL: "fist", handR: "fist", lean: -3 }),
  cry: P({ armL: 34, elbowL: 156, armR: 34, elbowR: 156, handL: "fist", handR: "fist", head: 14, lean: 8 }),
  hips: P({ armL: 42, elbowL: -92, armR: 42, elbowR: -92, handL: "fist", handR: "fist", legL: 8, legR: 8 }),
  cheer: P({ armL: 150, elbowL: 18, armR: 150, elbowR: 18, handL: "fist", handR: "fist", lean: -4, legL: 8, legR: 8 }),
  bow: P({ lean: 34, head: 16, armL: 4, armR: 4 }),
  squat: P({ crouch: 0.42, legL: 26, legR: 26, armL: 26, elbowL: 70, armR: 26, elbowR: 70 }),
} satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES;
/** Blend two poses (hands switch halfway) so the script only names key poses. */
export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const o = {} as Record<string, number | Hand>;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    o[k] = typeof a[k] === "number" ? lerp(a[k] as number, b[k] as number, t) : t < 0.5 ? a[k] : b[k];
  });
  return o as unknown as Pose;
};

export type Mouth = "rest" | "smile" | "A" | "E" | "O" | "U" | "M" | "frown" | "grit";
export type Feel = { eyes: "open" | "happy" | "closed" | "wide" | "narrow"; brow: number; browY: number; mouth: Mouth; blush?: boolean; tears?: boolean; sweat?: boolean };
export const FEELS = {
  neutral: { eyes: "open", brow: 0, browY: 0, mouth: "rest" },
  happy: { eyes: "happy", brow: -4, browY: -1, mouth: "smile", blush: true },
  sad: { eyes: "open", brow: -18, browY: 0, mouth: "frown" },
  angry: { eyes: "narrow", brow: 24, browY: 1.2, mouth: "grit" },
  shock: { eyes: "wide", brow: -6, browY: -3, mouth: "O", sweat: true },
  cry: { eyes: "closed", brow: -20, browY: 0, mouth: "A", tears: true },
  calm: { eyes: "closed", brow: 0, browY: 0, mouth: "rest" },
  shy: { eyes: "happy", brow: -8, browY: 0, mouth: "M", blush: true },
} satisfies Record<string, Feel>;
export type FeelName = keyof typeof FEELS;

// ---------- drawing ----------
const HandShape: React.FC<{ kind: Hand; r: number; skin: string }> = ({ kind, r, skin }) => {
  if (kind === "fist") return <circle r={r * 0.95} fill={skin} />;
  if (kind === "point")
    return (
      <g>
        <circle r={r * 0.9} fill={skin} />
        <rect x={-r * 0.28} y={r * 0.3} width={r * 0.56} height={r * 1.9} rx={r * 0.28} fill={skin} />
      </g>
    );
  if (kind === "flat") return <ellipse rx={r * 0.5} ry={r * 1.5} cy={r * 0.7} fill={skin} />;
  return (
    <g>
      <ellipse rx={r * 0.85} ry={r * 1.15} cy={r * 0.35} fill={skin} />
      <ellipse cx={r * 0.85} cy={-r * 0.1} rx={r * 0.3} ry={r * 0.7} fill={skin} transform={`rotate(-28 ${r * 0.85} 0)`} />
    </g>
  );
};

export const Person: React.FC<{ spec: PersonSpec; pose?: Pose; feel?: FeelName; mouth?: Mouth; t?: number; blink?: boolean }> = ({
  spec: s, pose = POSES.stand, feel = "neutral", mouth, t = 0, blink = false,
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = s.h;
  const child = s.age === "child";
  const headR = h * (child ? 0.098 : 0.074);
  const headRy = headR * 1.18;
  const legLen = h * (child ? 0.43 : 0.47) * (1 - pose.crouch * 0.55);
  const torso = h * (child ? 0.3 : 0.31);
  const sw = h * 0.105 * s.wide; // half shoulder width
  const hw = h * 0.085 * s.wide * (s.female ? 1.08 : 1);
  const limb = h * 0.062 * (0.85 + s.wide * 0.2);
  const upper = h * 0.165;
  const fore = h * 0.155;
  const hipY = -legLen;
  const shY = -torso; // relative to hip
  const f = FEELS[feel] as Feel;
  const m: Mouth = mouth ?? f.mouth;
  const breathe = Math.sin(t * 2.2 + s.seed) * 0.6;

  const leg = (sx: number, ang: number) => {
    const a = rad(ang) * sx;
    const k = pose.crouch > 0 ? rad(70 * pose.crouch) : 0;
    const half = legLen / 2 / Math.max(0.6, Math.cos(k));
    const knee = { x: sx * hw * 0.55 + Math.sin(a + sx * k) * half, y: Math.cos(k) * legLen * 0.5 };
    const foot = { x: sx * hw * 0.55 + Math.sin(a) * legLen * 0.35, y: legLen - 3 };
    return { hip: { x: sx * hw * 0.55, y: 0 }, knee, foot };
  };
  const arm = (sx: number, ang: number, elbow: number) => {
    const a = rad(ang) * sx;
    const b = a + rad(elbow) * sx;
    const sh = { x: sx * sw, y: shY + limb * 0.5 };
    const el = { x: sh.x + Math.sin(a) * upper, y: sh.y + Math.cos(a) * upper };
    const hd = { x: el.x + Math.sin(b) * fore, y: el.y + Math.cos(b) * fore };
    return { sh, el, hd, rot: (-b * 180) / Math.PI };
  };
  const LL = leg(-1, pose.legL), LR = leg(1, pose.legR);
  const AL = arm(-1, pose.armL, pose.elbowL), AR = arm(1, pose.armR, pose.elbowR);
  const legSkin = s.bottomKind !== "pants";
  const sleeve = s.topKind === "tee" ? 0.45 : s.topKind === "wrap" ? 0 : 1;

  const drawLeg = (l: ReturnType<typeof leg>) => (
    <g>
      <path d={`M ${l.hip.x} ${l.hip.y} L ${l.knee.x} ${l.knee.y} L ${l.foot.x} ${l.foot.y}`} fill="none" stroke={legSkin ? s.skin : s.bottom} strokeWidth={limb * 1.15} strokeLinecap="round" strokeLinejoin="round" />
      {s.bottomKind === "shorts" && <path d={`M ${l.hip.x} ${l.hip.y} L ${lerp(l.hip.x, l.knee.x, 0.75)} ${lerp(l.hip.y, l.knee.y, 0.75)}`} stroke={s.bottom} strokeWidth={limb * 1.4} strokeLinecap="round" />}
      <ellipse cx={l.foot.x} cy={l.foot.y + 1} rx={limb * 0.85} ry={limb * 0.42} fill={s.shoe ?? s.skin} />
    </g>
  );
  const drawArm = (a: ReturnType<typeof arm>, hand: Hand) => (
    <g>
      <path d={`M ${a.sh.x} ${a.sh.y} L ${a.el.x} ${a.el.y} L ${a.hd.x} ${a.hd.y}`} fill="none" stroke={s.skin} strokeWidth={limb * 0.82} strokeLinecap="round" strokeLinejoin="round" />
      {sleeve > 0 && (
        <path
          d={sleeve === 1 ? `M ${a.sh.x} ${a.sh.y} L ${a.el.x} ${a.el.y} L ${lerp(a.el.x, a.hd.x, 0.8)} ${lerp(a.el.y, a.hd.y, 0.8)}` : `M ${a.sh.x} ${a.sh.y} L ${lerp(a.sh.x, a.el.x, 0.55)} ${lerp(a.sh.y, a.el.y, 0.55)}`}
          fill="none" stroke={s.top} strokeWidth={limb * 1.05} strokeLinecap="round" strokeLinejoin="round"
        />
      )}
      <g transform={`translate(${a.hd.x} ${a.hd.y}) rotate(${a.rot})`}>
        <HandShape kind={hand} r={limb * 0.5} skin={s.skin} />
      </g>
    </g>
  );

  const torsoD = `M ${-sw} ${shY + 4} Q ${-sw} ${shY} ${-sw * 0.55} ${shY - 1} L ${sw * 0.55} ${shY - 1} Q ${sw} ${shY} ${sw} ${shY + 4} L ${hw} ${-2} Q ${hw} 4 ${hw * 0.6} 4 L ${-hw * 0.6} 4 Q ${-hw} 4 ${-hw} ${-2} Z`;
  const pat = () => {
    const c = s.patternColor;
    if (s.pattern === "stripes") return Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-sw - 2} y={shY + i * (torso / 8)} width={sw * 2 + 4} height={torso / 20} fill={c} opacity={0.85} />);
    if (s.pattern === "check")
      return (
        <g opacity={0.5} stroke={c} strokeWidth={1.4}>
          {Array.from({ length: 8 }).map((_, i) => <line key={`h${i}`} x1={-sw - 2} x2={sw + 2} y1={shY + i * (torso / 7)} y2={shY + i * (torso / 7)} />)}
          {Array.from({ length: 7 }).map((_, i) => <line key={`v${i}`} y1={shY - 2} y2={6} x1={-sw + i * (sw / 3)} x2={-sw + i * (sw / 3)} />)}
        </g>
      );
    if (s.pattern === "dots") return Array.from({ length: 24 }).map((_, i) => <circle key={i} cx={-sw + 3 + (i % 4) * (sw / 1.7) + (Math.floor(i / 4) % 2) * 3} cy={shY + 5 + Math.floor(i / 4) * (torso / 6)} r={1.5} fill={c} />);
    return null;
  };

  // face
  const eye = (sx: number) => {
    const x = sx * headR * 0.42, y = headR * 0.08, w = headR * 0.2;
    const kind = blink && (f.eyes === "open" || f.eyes === "narrow") ? "closed" : f.eyes;
    return (
      <g key={sx}>
        {kind === "open" || kind === "narrow" || kind === "wide" ? (
          <>
            <ellipse cx={x} cy={y} rx={w * (kind === "wide" ? 1.25 : 1)} ry={w * (kind === "wide" ? 1.5 : kind === "narrow" ? 0.6 : 1.15)} fill="#fff" />
            <circle cx={x} cy={y} r={w * (kind === "wide" ? 0.4 : 0.62)} fill={INK} />
          </>
        ) : (
          <path d={kind === "happy" ? `M ${x - w} ${y + w * 0.4} Q ${x} ${y - w * 1.1} ${x + w} ${y + w * 0.4}` : `M ${x - w} ${y} Q ${x} ${y + w * 0.9} ${x + w} ${y}`} fill="none" stroke={INK} strokeWidth={headR * 0.075} strokeLinecap="round" />
        )}
        <line x1={-w * 1.25} x2={w * 1.25} y1={0} y2={0} stroke={s.age === "elder" ? "#8a8580" : INK} strokeWidth={headR * 0.085} strokeLinecap="round" transform={`translate(${x} ${y - w * 2.1 + f.browY}) rotate(${-sx * f.brow})`} />
        {f.tears && <path d={`M ${x - w * 0.5} ${y + w} q ${sx * 1} ${w * 2.5} 0 ${w * 5} q 0 ${w} ${w * 0.8} ${w} q ${w * 0.8} 0 ${w * 0.6} ${-w} q -${w * 0.4} ${-w * 2.5} 0 ${-w * 5} z`} fill="#7cc6ee" opacity={0.9} />}
      </g>
    );
  };
  const my = headR * 0.62, mw = headR * 0.3;
  const mouths: Record<Mouth, React.ReactNode> = {
    rest: <path d={`M ${-mw * 0.7} ${my} Q 0 ${my + mw * 0.25} ${mw * 0.7} ${my}`} fill="none" stroke={INK} strokeWidth={headR * 0.07} strokeLinecap="round" />,
    smile: <path d={`M ${-mw} ${my - mw * 0.2} Q 0 ${my + mw * 1.2} ${mw} ${my - mw * 0.2} Z`} fill="#7a2e2a" stroke={INK} strokeWidth={headR * 0.05} strokeLinejoin="round" />,
    A: <ellipse cx={0} cy={my + mw * 0.2} rx={mw * 0.75} ry={mw * 0.95} fill="#6a2622" stroke={INK} strokeWidth={headR * 0.05} />,
    E: <rect x={-mw} y={my - mw * 0.3} width={mw * 2} height={mw * 0.75} rx={mw * 0.3} fill="#fff" stroke={INK} strokeWidth={headR * 0.05} />,
    O: <ellipse cx={0} cy={my + mw * 0.15} rx={mw * 0.45} ry={mw * 0.65} fill="#5a2320" stroke={INK} strokeWidth={headR * 0.05} />,
    U: <ellipse cx={0} cy={my + mw * 0.1} rx={mw * 0.3} ry={mw * 0.35} fill="#5a2320" stroke={INK} strokeWidth={headR * 0.05} />,
    M: <line x1={-mw * 0.6} x2={mw * 0.6} y1={my} y2={my} stroke={INK} strokeWidth={headR * 0.07} strokeLinecap="round" />,
    frown: <path d={`M ${-mw * 0.8} ${my + mw * 0.4} Q 0 ${my - mw * 0.4} ${mw * 0.8} ${my + mw * 0.4}`} fill="none" stroke={INK} strokeWidth={headR * 0.07} strokeLinecap="round" />,
    grit: <rect x={-mw} y={my - mw * 0.3} width={mw * 2} height={mw * 0.8} rx={mw * 0.25} fill="#fff" stroke={INK} strokeWidth={headR * 0.06} />,
  };
  const R = headR, Ry = headRy;
  const hairs = [
    // 0 short crop, 1 side part, 2 bun, 3 long, 4 bob, 5 thin/bald-ish (elder) or top knot (child)
    <path key="h" d={`M ${-R * 1.03} ${-Ry * 0.1} Q ${-R * 1.1} ${-Ry * 1.15} 0 ${-Ry * 1.12} Q ${R * 1.1} ${-Ry * 1.15} ${R * 1.03} ${-Ry * 0.1} Q ${R * 0.7} ${-Ry * 0.7} 0 ${-Ry * 0.66} Q ${-R * 0.7} ${-Ry * 0.7} ${-R * 1.03} ${-Ry * 0.1} Z`} />,
    <path key="h" d={`M ${-R * 1.04} 0 Q ${-R * 1.15} ${-Ry * 1.2} ${R * 0.1} ${-Ry * 1.14} Q ${R * 1.15} ${-Ry * 1.1} ${R * 1.04} 0 Q ${R * 0.9} ${-Ry * 0.62} ${-R * 0.2} ${-Ry * 0.6} Q ${-R * 0.8} ${-Ry * 0.5} ${-R * 1.04} 0 Z`} />,
    <g key="h"><circle cx={0} cy={-Ry * 1.28} r={R * 0.42} /><path d={`M ${-R * 1.03} ${-Ry * 0.05} Q ${-R * 1.08} ${-Ry * 1.14} 0 ${-Ry * 1.1} Q ${R * 1.08} ${-Ry * 1.14} ${R * 1.03} ${-Ry * 0.05} Q ${R * 0.6} ${-Ry * 0.72} 0 ${-Ry * 0.7} Q ${-R * 0.6} ${-Ry * 0.72} ${-R * 1.03} ${-Ry * 0.05} Z`} /></g>,
    <path key="h" d={`M ${-R * 1.1} ${Ry * 2.4} Q ${-R * 1.3} ${-Ry * 1.2} 0 ${-Ry * 1.14} Q ${R * 1.3} ${-Ry * 1.2} ${R * 1.1} ${Ry * 2.4} L ${R * 0.78} ${Ry * 2.3} L ${R * 0.92} ${-Ry * 0.1} Q ${R * 0.5} ${-Ry * 0.7} 0 ${-Ry * 0.68} Q ${-R * 0.5} ${-Ry * 0.7} ${-R * 0.92} ${-Ry * 0.1} L ${-R * 0.78} ${Ry * 2.3} Z`} />,
    <path key="h" d={`M ${-R * 1.12} ${Ry * 0.75} Q ${-R * 1.3} ${-Ry * 1.2} 0 ${-Ry * 1.14} Q ${R * 1.3} ${-Ry * 1.2} ${R * 1.12} ${Ry * 0.75} L ${R * 0.82} ${Ry * 0.7} L ${R * 0.94} ${-Ry * 0.15} Q ${R * 0.4} ${-Ry * 0.5} ${-R * 0.94} ${-Ry * 0.2} L ${-R * 0.82} ${Ry * 0.7} Z`} />,
    child ? <g key="h"><circle cx={0} cy={-Ry * 1.2} r={R * 0.3} /><path d={`M ${-R * 0.5} ${-Ry * 0.9} Q 0 ${-Ry * 1.2} ${R * 0.5} ${-Ry * 0.9} Q 0 ${-Ry * 0.8} ${-R * 0.5} ${-Ry * 0.9} Z`} /></g>
      : <path key="h" d={`M ${-R * 1.02} ${-Ry * 0.1} Q ${-R * 1.0} ${-Ry * 0.8} ${-R * 0.6} ${-Ry * 0.95} Q ${-R * 0.75} ${-Ry * 0.5} ${-R * 1.02} ${-Ry * 0.1} Z M ${R * 1.02} ${-Ry * 0.1} Q ${R * 1.0} ${-Ry * 0.8} ${R * 0.6} ${-Ry * 0.95} Q ${R * 0.75} ${-Ry * 0.5} ${R * 1.02} ${-Ry * 0.1} Z`} />,
  ];
  const style = s.female && (s.hairStyle === 0 || s.hairStyle === 5) && !child ? 2 : !s.female && s.hairStyle === 3 ? 1 : s.hairStyle;

  return (
    <g transform={`translate(0 ${hipY})`}>
      {drawLeg(LL)}
      {drawLeg(LR)}
      {(s.bottomKind === "sarong" || s.bottomKind === "skirt") && (
        <path d={`M ${-hw} -3 L ${hw} -3 L ${hw * (s.bottomKind === "skirt" ? 1.5 : 1.12)} ${legLen * (s.bottomKind === "skirt" ? 0.5 : 0.82)} L ${-hw * (s.bottomKind === "skirt" ? 1.5 : 1.12)} ${legLen * (s.bottomKind === "skirt" ? 0.5 : 0.82)} Z`} fill={s.bottom} />
      )}
      <g transform={`rotate(${pose.lean})`}>
        {s.extra === "bag" && <rect x={hw * 0.7} y={-torso * 0.35} width={hw * 0.9} height={torso * 0.42} rx={3} fill="#8a5a3a" />}
        <clipPath id={`c${id}`}><path d={torsoD} /></clipPath>
        <path d={torsoD} fill={s.top} transform={`scale(1 ${1 + breathe * 0.004})`} />
        <g clipPath={`url(#c${id})`}>{pat()}</g>
        {s.topKind === "shirt" && <line x1={0} x2={0} y1={shY} y2={3} stroke="rgba(0,0,0,.25)" strokeWidth={1.2} />}
        {s.topKind === "wrap" && <path d={`M ${-sw * 0.5} ${shY - 1} L ${sw * 0.5} ${shY - 1} L ${-hw * 0.2} ${-torso * 0.35} Z`} fill={s.skin} />}
        {s.bottomKind !== "sarong" && s.bottomKind !== "skirt" && <path d={`M ${-hw} -5 L ${hw} -5 L ${hw} 0 Q ${hw} 5 ${hw * 0.6} 5 L ${-hw * 0.6} 5 Q ${-hw} 5 ${-hw} 0 Z`} fill={s.bottom} />}
        {s.extra === "sash" && <path d={`M ${-sw * 0.9} ${shY} L ${-sw * 0.35} ${shY - 1} L ${hw} ${-torso * 0.1} L ${hw * 0.5} 2 Z`} fill="#a8443f" opacity={0.95} />}
        {s.extra === "bag" && <line x1={-sw * 0.6} y1={shY} x2={hw * 1.1} y2={-torso * 0.3} stroke="#8a5a3a" strokeWidth={2.4} />}
        {drawArm(AL, pose.handL)}
        {drawArm(AR, pose.handR)}
        <rect x={-R * 0.3} y={shY - R * 0.5} width={R * 0.6} height={R * 0.7} fill={s.skin} />
        <g transform={`translate(0 ${shY - R * 0.35 - Ry}) rotate(${pose.head})`}>
          {style === 3 || style === 4 ? <g fill={s.hair}>{hairs[style]}</g> : null}
          <ellipse rx={R} ry={Ry} fill={s.skin} />
          <ellipse cx={-R} cy={Ry * 0.12} rx={R * 0.16} ry={R * 0.26} fill={s.skin} />
          <ellipse cx={R} cy={Ry * 0.12} rx={R * 0.16} ry={R * 0.26} fill={s.skin} />
          {f.blush && <><ellipse cx={-R * 0.6} cy={R * 0.42} rx={R * 0.2} ry={R * 0.12} fill="#ef7a80" opacity={0.5} /><ellipse cx={R * 0.6} cy={R * 0.42} rx={R * 0.2} ry={R * 0.12} fill="#ef7a80" opacity={0.5} /></>}
          {eye(-1)}{eye(1)}
          <path d={`M 0 ${R * 0.18} l ${-R * 0.07} ${R * 0.24} l ${R * 0.13} ${R * 0.02}`} fill="none" stroke="rgba(60,30,20,.45)" strokeWidth={R * 0.06} strokeLinecap="round" />
          {mouths[m]}
          {s.age === "elder" && <path d={`M ${-R * 0.75} ${R * 0.5} q ${R * 0.1} ${R * 0.2} 0 ${R * 0.4} M ${R * 0.75} ${R * 0.5} q ${-R * 0.1} ${R * 0.2} 0 ${R * 0.4}`} fill="none" stroke="rgba(60,30,20,.35)" strokeWidth={R * 0.05} />}
          {style !== 3 && style !== 4 ? <g fill={s.hair}>{hairs[style]}</g> : <g fill={s.hair}>{hairs[0]}</g>}
          {s.extra === "glasses" && <g fill="none" stroke={INK} strokeWidth={R * 0.07}><circle cx={-R * 0.42} cy={R * 0.08} r={R * 0.3} /><circle cx={R * 0.42} cy={R * 0.08} r={R * 0.3} /><line x1={-R * 0.12} x2={R * 0.12} y1={R * 0.08} y2={R * 0.08} /></g>}
          {s.extra === "hat" && <g><ellipse cx={0} cy={-Ry * 0.72} rx={R * 1.75} ry={R * 0.32} fill="#e3c57c" /><path d={`M ${-R * 0.85} ${-Ry * 0.75} Q 0 ${-Ry * 1.9} ${R * 0.85} ${-Ry * 0.75} Z`} fill="#e3c57c" stroke="#b9963f" strokeWidth={1} /></g>}
          {f.sweat && <path transform={`translate(${R * 1.05} ${-R * 0.4})`} d={`M 0 ${-R * 0.3} Q ${R * 0.25} ${R * 0.1} 0 ${R * 0.22} Q ${-R * 0.25} ${R * 0.1} 0 ${-R * 0.3} Z`} fill="#8fd0f2" />}
        </g>
      </g>
    </g>
  );
};

// ---------- review sheet: 30 random people across the pose and emotion libraries ----------
export const PeopleSheet: React.FC = () => {
  const poses = Object.keys(POSES) as PoseName[];
  const feels = Object.keys(FEELS) as FeelName[];
  const cols = 5, rows = 6, cw = 1080 / cols, rh = 300;
  return (
    <AbsoluteFill style={{ background: "#efe8dc", fontFamily: "Kanit" }}>
      <div style={{ position: "absolute", left: 40, top: 26, fontSize: 44, fontWeight: 800, color: "#231c1a" }}>ชุด 1 · คนสุ่ม 30 คน</div>
      <div style={{ position: "absolute", right: 40, top: 40, fontSize: 26, fontWeight: 500, color: "#6b5f55" }}>เส้นประ = 1.7 ม.</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const c = i % cols, r = Math.floor(i / cols);
          const x = c * cw + cw / 2, y = 110 + (r + 1) * rh - 44;
          const spec = makePerson(i + 1);
          const pose = poses[i % poses.length], feel = feels[(i * 3) % feels.length];
          const k = 1.28;
          return (
            <g key={i}>
              <line x1={c * cw + 14} x2={(c + 1) * cw - 14} y1={y} y2={y} stroke="#cbbfae" strokeWidth={3} />
              <line x1={c * cw + 14} x2={(c + 1) * cw - 14} y1={y - 170 * k} y2={y - 170 * k} stroke="#d9cfbf" strokeWidth={2} strokeDasharray="6 8" />
              <g transform={`translate(${x} ${y}) scale(${k})`}><Person spec={spec} pose={POSES[pose]} feel={feel} /></g>
              <text x={x} y={y + 30} textAnchor="middle" fontFamily="Kanit" fontWeight={500} fontSize={21} fill="#5a4f46">{`#${i + 1} ${pose} · ${feel}`}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// ---------- side view with real walk cycles (faces +x; flip with scale(-1,1)) ----------
export type GaitName = keyof typeof GAITS;
/** Ground covered by one full walk cycle (two steps), in units. Drive the phase by distance so feet never slide. */
export const strideOf = (spec: PersonSpec, gait: Gait) => 4 * spec.h * (spec.age === "child" ? 0.43 : 0.47) * Math.sin(rad(gait.A));
/** Natural speed in metres per second, for choosing walk distances in a script. */
export const gaitMps = (spec: PersonSpec, gait: Gait) => (strideOf(spec, gait) * gait.cadence) / 100;

export const PersonSide: React.FC<{ spec: PersonSpec; gait?: Gait | null; phase?: number; feel?: FeelName; mouth?: Mouth; t?: number; blink?: boolean }> = ({
  spec: s, gait = null, phase = 0, feel = "neutral", mouth, t = 0, blink = false,
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = s.h;
  const child = s.age === "child";
  const R = h * (child ? 0.098 : 0.074);
  const Ry = R * 1.18;
  const legLen = h * (child ? 0.43 : 0.47);
  const L = legLen / 2;
  const torso = h * (child ? 0.3 : 0.31);
  const tw = h * 0.062 * s.wide; // half depth of the torso
  const limb = h * 0.062 * (0.85 + s.wide * 0.2);
  const upper = h * 0.165, fore = h * 0.155;
  const f = FEELS[feel] as Feel;
  const m: Mouth = mouth ?? f.mouth;
  const phi = phase * 2 * Math.PI;

  const leg = (ph: number) => {
    const th = gait ? rad(gait.A * Math.sin(ph)) : 0;
    const k = gait ? rad(gait.k0 + gait.K * Math.max(0, Math.cos(ph))) : 0;
    const knee = { x: L * Math.sin(th), y: L * Math.cos(th) };
    const foot = { x: knee.x + L * Math.sin(th - k), y: knee.y + L * Math.cos(th - k) };
    return { knee, foot };
  };
  const back = leg(phi + Math.PI), front = leg(phi);
  const hipH = Math.max(back.foot.y, front.foot.y) + limb * 0.4;
  const shY = -torso;
  const arm = (swing: number) => {
    const a = rad((gait ? gait.armBase + swing * gait.armSwing : 4));
    const b = a + rad(gait ? gait.elbow : 8);
    const sh = { x: 0, y: shY + limb * 0.5 };
    const el = { x: Math.sin(a) * upper, y: sh.y + Math.cos(a) * upper };
    const hd = { x: el.x + Math.sin(b) * fore, y: el.y + Math.cos(b) * fore };
    return { sh, el, hd };
  };
  const armB = arm(Math.sin(phi)), armF = arm(-Math.sin(phi));
  const legSkin = s.bottomKind !== "pants";
  const sleeve = s.topKind === "tee" ? 0.45 : s.topKind === "wrap" ? 0 : 1;
  const dim = { filter: "brightness(0.8)" };

  const drawLeg = (l: ReturnType<typeof leg>, far: boolean) => (
    <g style={far ? dim : undefined}>
      <path d={`M 0 0 L ${l.knee.x} ${l.knee.y} L ${l.foot.x} ${l.foot.y}`} fill="none" stroke={legSkin ? s.skin : s.bottom} strokeWidth={limb * 1.15} strokeLinecap="round" strokeLinejoin="round" />
      {s.bottomKind === "shorts" && <path d={`M 0 0 L ${l.knee.x * 0.75} ${l.knee.y * 0.75}`} stroke={s.bottom} strokeWidth={limb * 1.4} strokeLinecap="round" />}
      <ellipse cx={l.foot.x + limb * 0.45} cy={l.foot.y + 1} rx={limb * 0.95} ry={limb * 0.42} fill={s.shoe ?? s.skin} />
    </g>
  );
  const drawArm = (a: ReturnType<typeof arm>, far: boolean) => (
    <g style={far ? dim : undefined}>
      <path d={`M ${a.sh.x} ${a.sh.y} L ${a.el.x} ${a.el.y} L ${a.hd.x} ${a.hd.y}`} fill="none" stroke={s.skin} strokeWidth={limb * 0.82} strokeLinecap="round" strokeLinejoin="round" />
      {sleeve > 0 && (
        <path
          d={sleeve === 1 ? `M ${a.sh.x} ${a.sh.y} L ${a.el.x} ${a.el.y} L ${lerp(a.el.x, a.hd.x, 0.8)} ${lerp(a.el.y, a.hd.y, 0.8)}` : `M ${a.sh.x} ${a.sh.y} L ${lerp(a.sh.x, a.el.x, 0.55)} ${lerp(a.sh.y, a.el.y, 0.55)}`}
          fill="none" stroke={s.top} strokeWidth={limb * 1.05} strokeLinecap="round" strokeLinejoin="round"
        />
      )}
      <circle cx={a.hd.x} cy={a.hd.y} r={limb * 0.48} fill={s.skin} />
    </g>
  );
  const torsoD = `M ${-tw} ${shY + 5} Q ${-tw} ${shY - 1} 0 ${shY - 1} Q ${tw} ${shY - 1} ${tw} ${shY + 5} L ${tw * 1.05} -2 Q ${tw} 4 0 4 Q ${-tw} 4 ${-tw * 1.05} -2 Z`;
  const longSkirt = s.bottomKind === "sarong";
  const skirtLen = legLen * (longSkirt ? 0.8 : 0.48);
  const spread = Math.max(Math.abs(back.knee.x), Math.abs(front.knee.x)) + limb * 0.75;

  // profile face
  const ex = R * 0.5, ey = R * 0.06, ew = R * 0.2;
  const eyeKind = blink && (f.eyes === "open" || f.eyes === "narrow") ? "closed" : f.eyes;
  const mx = R * 0.62, my = R * 0.62, mw = R * 0.26;
  const open = m === "A" ? 0.9 : m === "O" ? 0.7 : m === "E" || m === "grit" ? 0.45 : m === "U" ? 0.4 : 0;
  const style = s.female && (s.hairStyle === 0 || s.hairStyle === 5) && !child ? 2 : !s.female && s.hairStyle === 3 ? 1 : s.hairStyle;
  const cap = `M ${R * 0.78} ${-Ry * 0.42} Q ${R * 0.7} ${-Ry * 1.14} ${-R * 0.1} ${-Ry * 1.13} Q ${-R * 1.16} ${-Ry * 1.08} ${-R * 1.08} ${Ry * 0.1} L ${-R * 0.62} ${Ry * 0.28} Q ${-R * 0.5} ${-Ry * 0.35} ${R * 0.2} ${-Ry * 0.52} Q ${R * 0.55} ${-Ry * 0.55} ${R * 0.78} ${-Ry * 0.42} Z`;

  return (
    <g transform={`translate(0 ${-hipH})`}>
      {drawLeg(back, true)}
      {drawLeg(front, false)}
      {(s.bottomKind === "sarong" || s.bottomKind === "skirt") && (
        <path d={`M ${-tw} -3 L ${tw} -3 L ${Math.max(tw * 1.15, spread * (skirtLen / L) * 0.55)} ${skirtLen} L ${-Math.max(tw * 1.15, spread * (skirtLen / L) * 0.55)} ${skirtLen} Z`} fill={s.bottom} />
      )}
      <g transform={`rotate(${gait ? gait.lean : 0})`}>
        {drawArm(armB, true)}
        {s.extra === "bag" && <rect x={-tw * 1.9} y={-torso * 0.3} width={tw * 1.5} height={torso * 0.4} rx={3} fill="#8a5a3a" />}
        <clipPath id={`s${id}`}><path d={torsoD} /></clipPath>
        <path d={torsoD} fill={s.top} />
        <g clipPath={`url(#s${id})`}>
          {(s.pattern === "stripes" || s.pattern === "check") && Array.from({ length: 9 }).map((_, i) => <rect key={i} x={-tw - 2} y={shY + i * (torso / 8)} width={tw * 2 + 4} height={torso / 20} fill={s.patternColor} opacity={s.pattern === "check" ? 0.5 : 0.85} />)}
          {s.pattern === "check" && Array.from({ length: 5 }).map((_, i) => <rect key={`v${i}`} x={-tw + i * (tw / 2)} y={shY - 2} width={1.4} height={torso + 8} fill={s.patternColor} opacity={0.5} />)}
          {s.pattern === "dots" && Array.from({ length: 14 }).map((_, i) => <circle key={i} cx={-tw * 0.5 + (i % 2) * tw + (Math.floor(i / 2) % 2) * 2} cy={shY + 5 + Math.floor(i / 2) * (torso / 7)} r={1.5} fill={s.patternColor} />)}
        </g>
        {s.bottomKind !== "sarong" && s.bottomKind !== "skirt" && <path d={`M ${-tw * 1.05} -5 L ${tw * 1.05} -5 L ${tw * 1.05} 0 Q ${tw} 5 0 5 Q ${-tw} 5 ${-tw * 1.05} 0 Z`} fill={s.bottom} />}
        {s.extra === "sash" && <path d={`M ${-tw} ${shY + 2} L ${tw * 0.2} ${shY - 1} L ${tw} ${-torso * 0.1} L ${tw * 0.2} 2 Z`} fill="#a8443f" opacity={0.95} />}
        <rect x={-R * 0.32} y={shY - R * 0.5} width={R * 0.64} height={R * 0.7} fill={s.skin} />
        <g transform={`translate(${R * 0.12} ${shY - R * 0.35 - Ry}) rotate(${gait ? gait.headTilt : 0})`}>
          <g fill={s.hair}>
            {style === 2 && <circle cx={-R * 0.95} cy={-Ry * 0.75} r={R * 0.42} />}
            {style === 3 && <path d={`M ${-R * 0.2} ${-Ry * 0.9} Q ${-R * 1.5} ${-Ry * 0.6} ${-R * 1.25} ${Ry * 2.3} L ${-R * 0.55} ${Ry * 2.2} L ${-R * 0.5} 0 Z`} />}
            {style === 4 && <path d={`M ${-R * 0.2} ${-Ry * 0.9} Q ${-R * 1.4} ${-Ry * 0.6} ${-R * 1.2} ${Ry * 0.8} L ${-R * 0.5} ${Ry * 0.75} L ${-R * 0.5} 0 Z`} />}
            {style === 5 && child && <circle cx={-R * 0.1} cy={-Ry * 1.2} r={R * 0.3} />}
          </g>
          <ellipse rx={R} ry={Ry} fill={s.skin} />
          <path d={`M ${R * 0.93} ${-R * 0.02} q ${R * 0.26} ${R * 0.3} ${-R * 0.04} ${R * 0.4} z`} fill={s.skin} />
          <ellipse cx={-R * 0.12} cy={Ry * 0.1} rx={R * 0.15} ry={R * 0.26} fill={s.skin} style={{ filter: "brightness(0.92)" }} />
          {f.blush && <ellipse cx={R * 0.42} cy={R * 0.42} rx={R * 0.22} ry={R * 0.12} fill="#ef7a80" opacity={0.5} />}
          {eyeKind === "open" || eyeKind === "narrow" || eyeKind === "wide" ? (
            <>
              <ellipse cx={ex} cy={ey} rx={ew * (eyeKind === "wide" ? 1.2 : 0.95)} ry={ew * (eyeKind === "wide" ? 1.5 : eyeKind === "narrow" ? 0.6 : 1.15)} fill="#fff" />
              <circle cx={ex + ew * 0.25} cy={ey} r={ew * (eyeKind === "wide" ? 0.4 : 0.62)} fill={INK} />
            </>
          ) : (
            <path d={eyeKind === "happy" ? `M ${ex - ew} ${ey + ew * 0.4} Q ${ex} ${ey - ew * 1.1} ${ex + ew} ${ey + ew * 0.4}` : `M ${ex - ew} ${ey} Q ${ex} ${ey + ew * 0.9} ${ex + ew} ${ey}`} fill="none" stroke={INK} strokeWidth={R * 0.075} strokeLinecap="round" />
          )}
          <line x1={-ew * 1.2} x2={ew * 1.2} y1={0} y2={0} stroke={s.age === "elder" ? "#8a8580" : INK} strokeWidth={R * 0.085} strokeLinecap="round" transform={`translate(${ex} ${ey - ew * 2.1 + f.browY}) rotate(${f.brow})`} />
          {f.tears && <path d={`M ${ex} ${ey + ew} q 1 ${ew * 2.5} 0 ${ew * 5} q 0 ${ew} ${ew * 0.8} ${ew} q ${ew * 0.8} 0 ${ew * 0.6} ${-ew} q -${ew * 0.4} ${-ew * 2.5} 0 ${-ew * 5} z`} fill="#7cc6ee" opacity={0.9} />}
          {open > 0 ? (
            <ellipse cx={mx} cy={my + mw * 0.2} rx={mw * (m === "E" || m === "grit" ? 0.9 : 0.55)} ry={mw * open} fill={m === "E" || m === "grit" ? "#fff" : "#6a2622"} stroke={INK} strokeWidth={R * 0.05} />
          ) : m === "smile" ? (
            <path d={`M ${mx - mw} ${my - mw * 0.2} Q ${mx} ${my + mw * 1.1} ${mx + mw * 0.8} ${my - mw * 0.3} Z`} fill="#7a2e2a" stroke={INK} strokeWidth={R * 0.05} strokeLinejoin="round" />
          ) : (
            <path d={m === "frown" ? `M ${mx - mw * 0.8} ${my + mw * 0.4} Q ${mx} ${my - mw * 0.3} ${mx + mw * 0.7} ${my + mw * 0.3}` : `M ${mx - mw * 0.7} ${my} Q ${mx} ${my + (m === "M" ? 0 : mw * 0.3)} ${mx + mw * 0.7} ${my}`} fill="none" stroke={INK} strokeWidth={R * 0.07} strokeLinecap="round" />
          )}
          {!(style === 5 && !child) ? <path d={cap} fill={s.hair} /> : <path d={`M ${-R * 1.05} ${Ry * 0.1} Q ${-R * 1.1} ${-Ry * 0.7} ${-R * 0.5} ${-Ry * 0.95} Q ${-R * 0.7} ${-Ry * 0.3} ${-R * 0.62} ${Ry * 0.28} Z`} fill={s.hair} />}
          {s.extra === "glasses" && <g fill="none" stroke={INK} strokeWidth={R * 0.07}><circle cx={ex} cy={ey + R * 0.02} r={R * 0.3} /><line x1={ex - R * 0.3} x2={-R * 0.15} y1={ey} y2={ey - R * 0.05} /></g>}
          {s.extra === "hat" && <g><ellipse cx={0} cy={-Ry * 0.72} rx={R * 1.75} ry={R * 0.3} fill="#e3c57c" /><path d={`M ${-R * 0.85} ${-Ry * 0.75} Q 0 ${-Ry * 1.9} ${R * 0.85} ${-Ry * 0.75} Z`} fill="#e3c57c" stroke="#b9963f" strokeWidth={1} /></g>}
          {f.sweat && <path transform={`translate(${-R * 0.5} ${-R * 0.5})`} d={`M 0 ${-R * 0.3} Q ${R * 0.25} ${R * 0.1} 0 ${R * 0.22} Q ${-R * 0.25} ${R * 0.1} 0 ${-R * 0.3} Z`} fill="#8fd0f2" />}
        </g>
        {drawArm(armF, false)}
      </g>
    </g>
  );
};

// ---------- review sheet: the four gaits at six phases, on four different people ----------
export const WalkSheet: React.FC = () => {
  const gaits = Object.keys(GAITS) as GaitName[];
  const th: Record<GaitName, string> = { stroll: "เดินเล่น", hurry: "วิ่งรีบ", sneak: "ย่อง", tired: "หมดแรง" } as Record<GaitName, string>;
  const who = [12, 4, 27, 1];
  const feels: FeelName[] = ["happy", "shock", "calm", "sad"];
  return (
    <AbsoluteFill style={{ background: "#efe8dc", fontFamily: "Kanit" }}>
      <div style={{ position: "absolute", left: 40, top: 26, fontSize: 44, fontWeight: 800, color: "#231c1a" }}>มุมข้าง · ท่าเดิน 4 แบบ</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {gaits.map((g, r) => {
          const y = 520 + r * 440;
          const spec = makePerson(who[r]);
          return (
            <g key={g}>
              <line x1={30} x2={1050} y1={y} y2={y} stroke="#cbbfae" strokeWidth={3} />
              <text x={40} y={y - 330} fontFamily="Kanit" fontWeight={700} fontSize={40} fill="#231c1a">{`${th[g]} · ${gaitMps(spec, GAITS[g]).toFixed(1)} ม./วินาที`}</text>
              {Array.from({ length: 6 }).map((_, i) => (
                <g key={i} transform={`translate(${110 + i * 172} ${y}) scale(1.55)`}>
                  <PersonSide spec={spec} gait={GAITS[g]} phase={i / 6} feel={feels[r]} />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
