import React, { useId } from "react";
import { AbsoluteFill } from "remotion";
import { clamp01, ensureFonts, lerp, rad, rng } from "./lib";
import { Gait, GAITS } from "./Character";
import {
  ACC, BOTTOM, AccBody, Cloth, Foot, Headwear, hidesBun, lookOf, OuterFront, OuterSide, PantsExtras, PantsLeg, Sleeves, TopFront, TopOverArms, TopSide,
  AccSide, AccSideBehind, usePaints, Waistband, finishWear, pickWear, Wear, WearSpec,
} from "./Wardrobe";

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
  /** layered outfit from the wardrobe catalogue (Wardrobe.tsx): piece ids, colours, pattern */
  wear: Wear;
  outfit?: Outfit; // worn over (or instead of) the clothes
};
export type Outfit = "labcoat" | "patient";
export const OUTFITS: Outfit[] = ["labcoat", "patient"];
const COAT = "#f5f7f6";
const COAT_EDGE = "#b9c4c4";
const GOWN = "#cfe2e3";

const SKINS = ["#f0c9a4", "#e3b088", "#cf9a70", "#b98058", "#9c6844"];

export type PersonWant = Partial<Pick<PersonSpec, "age" | "female" | "era" | "outfit">> & { wear?: WearSpec };
export const makePerson = (seed: number, want: PersonWant = {}): PersonSpec => {
  const r = rng(seed * 7919 + 13);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const age = want.age ?? pick<Age>(["child", "teen", "adult", "adult", "adult", "elder"]);
  const female = want.female ?? r() < 0.5;
  const era = want.era ?? pick<Era>(["old", "rural", "city"]);
  const base = { child: 118, teen: 150, adult: female ? 158 : 169, elder: female ? 151 : 161 }[age];
  const dark = pick(["#1d1614", "#2a1f1a", "#15131a", "#3a2a1e"]);
  r(); // was the bottom kind; kept so every seed keeps its body, face and hair from batch 1
  const h = base + (r() - 0.5) * 8;
  const wide = (age === "child" ? 0.92 : 1) * (0.9 + r() * 0.3) * (female ? 0.94 : 1.04);
  const skin = pick(SKINS);
  const hair = age === "elder" ? pick(["#c9c5c0", "#9a9692", "#e4e1dc"]) : dark;
  const hairStyle = Math.floor(r() * 6); // 5 = thin/bald, only kept for elders (see below)
  // clothes come from the wardrobe on their own random stream; a script's "wear" overrides the seeded pick
  let wear = want.wear ? finishWear(want.wear, era, rng(seed * 31 + 7)) : pickWear(seed, era, female, age);
  const spec: PersonSpec = { seed, age, female, era, h, wide, skin, hair, hairStyle, wear };
  // style 5 draws thin/bald hair on a grown-up male: keep it for elders only (children get a top knot, women a bun).
  if (spec.hairStyle === 5 && age !== "elder" && age !== "child" && !female) spec.hairStyle = seed % 2;
  // outfits are applied after every seeded pick, so the same seed keeps the same face, hair and body
  if (want.outfit === "labcoat") {
    // the coat goes over the clothes: no other outer layer, hat or carried things
    wear = { ...wear, outer: undefined, head: undefined, acc: wear.acc.filter((a) => !["bag", "backpack", "waistcloth"].includes(ACC[a]?.kind)) };
    Object.assign(spec, { outfit: "labcoat", wear });
  } else if (want.outfit === "patient") {
    const g = GOWN;
    wear = { top: "tee", bottom: "shorts", feet: "barefoot", acc: wear.acc.filter((a) => a === "glasses"), pattern: "plain", colors: { top: g, top2: g, bottom: g, bottom2: g, outer: g, head: g, acc: g, feet: g } };
    Object.assign(spec, { outfit: "patient", wear });
  }
  return spec;
};

/** A tube skirt (ผ้าซิ่น, ผ้าถุง, โสร่ง) shortens the step so the legs stay inside the cloth. */
const stepK = (s: PersonSpec) => (BOTTOM[s.wear.bottom]?.shape === "tube" ? 0.55 : 1);

/** Seat height (units) of the `sit` pose: a chair or a bed edge. */
export const SEAT = 45;
/** Shared measurements (units) of a front/back-view person in a pose. hipH = hip joint above the ground. */
const body = (s: PersonSpec, pose: Pose) => {
  const child = s.age === "child";
  const headR = s.h * (child ? 0.098 : 0.074);
  const legLen = s.h * (child ? 0.43 : 0.47) * (1 - pose.crouch * 0.55);
  const torso = s.h * (child ? 0.3 : 0.31);
  const limb = s.h * 0.062 * (0.85 + s.wide * 0.2);
  const sw = s.h * 0.105 * s.wide;
  const hw = s.h * 0.085 * s.wide * (s.female ? 1.08 : 1);
  let ws = clamp01(pose.sit), wf = clamp01(pose.cross);
  if (ws + wf > 1) { const n = ws + wf; ws /= n; wf /= n; }
  const w0 = 1 - ws - wf;
  const hipSit = SEAT + limb * 0.6; // thighs rest on the seat
  const hipFloor = limb; // cross-legged on the floor
  const hipH = w0 * legLen + ws * hipSit + wf * hipFloor;
  return { child, headR, legLen, torso, limb, sw, hw, ws, wf, w0, hipSit, hipFloor, hipH };
};
/**
 * Lying: the drawing is turned 90 degrees around the middle of the body (s.h / 2 up) and lowered so the
 * back of the body rests on a surface `on` metres high. dir 1 puts the head towards +x. k blends from standing.
 */
const lieXform = (s: PersonSpec, k: number, on: number, dir: number) => {
  const b = body(s, POSES.lie);
  const cy = s.h / 2;
  const centre = on * 100 + b.hw + b.limb * 0.15; // hips and legs rest on the surface (hands are on the belly)
  const T = lerp(cy, centre, k);
  const deg = dir * 90 * k;
  const c = Math.cos(rad(deg)), sn = Math.sin(rad(deg));
  return {
    svg: `translate(0 ${-T}) rotate(${deg}) translate(0 ${cy})`,
    map: (x: number, y: number) => ({ x: x * c - (y + cy) * sn, y: x * sn + (y + cy) * c - T }),
  };
};
export type LieOpts = { on?: number; dir?: 1 | -1 };

/**
 * Centre of the head in metres above the ground point of a front-view (or back-view) Person in a given pose
 * (x is sideways for an actor facing right; mirror it for face -1). Matches the drawing in Person exactly,
 * including sitting (seat 0.45 m), cross-legged on the floor and lying on a surface `lie.on` metres high.
 */
export const headCenter = (s: PersonSpec, pose: Pose = POSES.stand, lie: LieOpts = {}) => {
  const b = body(s, pose);
  const R = b.headR;
  const d = b.torso + R * 0.35 + R * 1.18;
  const a = rad(pose.lean);
  const x = d * Math.sin(a), y = b.hipH + d * Math.cos(a);
  const k = clamp01(pose.lie);
  if (k <= 0) return { x: x / 100, y: y / 100 };
  // the lie transform works on drawing coordinates (ground origin, y down)
  const p = lieXform(s, k, lie.on ?? 0, lie.dir ?? 1).map(x, -y);
  return { x: p.x / 100, y: -p.y / 100 };
};
/** Same for the walking side view (PersonSide); x is forward. Approximate within ~1 cm. */
export const headCenterSide = (s: PersonSpec, gait: Gait | null) => {
  const child = s.age === "child";
  const R = s.h * (child ? 0.098 : 0.074);
  const hip = s.h * (child ? 0.43 : 0.47) * (gait ? Math.cos(rad(gait.A * stepK(s) * 0.7)) : 1) + s.h * 0.062 * 0.4;
  const d = s.h * (child ? 0.3 : 0.31) + R * 0.35 + R * 1.18;
  const a = rad(gait ? gait.lean : 0);
  return { x: (R * 0.12 * Math.cos(a) + d * Math.sin(a)) / 100, y: (hip + d * Math.cos(a) - R * 0.12 * Math.sin(a)) / 100 };
};
/** Head-centre height (m) of a Person in a pose. */
export const headHeight = (s: PersonSpec, pose: Pose = POSES.stand, lie: LieOpts = {}) => headCenter(s, pose, lie).y;

// ---------- libraries ----------
// Angles in degrees. Arms/legs: 0 = hanging down, + = away from the body (outward). Elbow: + bends the forearm up/in.
export type Hand = "open" | "fist" | "point" | "flat";
export type Pose = {
  armL: number; elbowL: number; armR: number; elbowR: number;
  legL: number; legR: number; lean: number; head: number; crouch: number;
  /** 0..1: sitting on a 0.45 m seat / cross-legged on the floor / lying (see lieXform). Blend like the angles. */
  sit: number; cross: number; lie: number;
  handL: Hand; handR: Hand;
};
const P = (a: Partial<Pose>): Pose => ({ armL: 8, elbowL: 6, armR: 8, elbowR: 6, legL: 3, legR: 3, lean: 0, head: 0, crouch: 0, sit: 0, cross: 0, lie: 0, handL: "open", handR: "open", ...a });
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
  // hands are placed on the thighs / knees / belly by Person, whatever the arm angles say
  sit: P({ sit: 1, legL: 0, legR: 0 }),
  sitfloor: P({ cross: 1, legL: 0, legR: 0 }),
  lie: P({ lie: 1, legL: 1.5, legR: 1.5 }),
} satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES;
/** Poses that are not standing; review sheets of standing poses leave these out. */
export const REST_POSES: PoseName[] = ["sit", "sitfloor", "lie"];
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

// ---------- outfits drawn over the seeded clothes ----------
type Pt = { x: number; y: number };
const CoatSleeve: React.FC<{ a: { sh: Pt; el: Pt; hd: Pt }; limb: number }> = ({ a, limb }) => {
  const end = { x: lerp(a.el.x, a.hd.x, 0.84), y: lerp(a.el.y, a.hd.y, 0.84) };
  const d = `M ${a.sh.x} ${a.sh.y} L ${a.el.x} ${a.el.y} L ${end.x} ${end.y}`;
  return (
    <g>
      <path d={d} fill="none" stroke={COAT_EDGE} strokeWidth={limb * 1.34} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={COAT} strokeWidth={limb * 1.16} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};
/** Open, knee-length lab coat seen from the front (hip at y=0, legs towards +y). */
const CoatFront: React.FC<{ sw: number; hw: number; shY: number; torso: number; hem: number }> = ({ sw, hw, shY, torso, hem }) => {
  const W = Math.max(hw, sw * 0.82);
  const panel = (k: number) =>
    `M ${k * sw * 0.4} ${shY - 1.5} L ${k * sw * 1.07} ${shY + 3} L ${k * W * 1.12} -2 L ${k * W * 1.3} ${hem} L ${k * W * 0.2} ${hem} L ${k * W * 0.15} ${-torso * 0.05} L ${k * sw * 0.13} ${-torso * 0.48} Z`;
  return (
    <g strokeLinejoin="round">
      {[-1, 1].map((k) => (
        <g key={k}>
          <path d={panel(k)} fill={COAT} stroke={COAT_EDGE} strokeWidth={1.3} />
          {/* lapel */}
          <path d={`M ${k * sw * 0.4} ${shY - 1.5} L ${k * sw * 0.62} ${shY + torso * 0.22} L ${k * sw * 0.2} ${-torso * 0.42}`} fill="none" stroke={COAT_EDGE} strokeWidth={1.3} />
          {/* hip pocket */}
          <path d={`M ${k * W * 1.02} ${hem * 0.2} L ${k * W * 0.42} ${hem * 0.2}`} stroke={COAT_EDGE} strokeWidth={1.4} />
        </g>
      ))}
      {/* breast pocket with a pen */}
      <rect x={-sw * 0.78} y={shY + torso * 0.3} width={sw * 0.34} height={1.6} fill={COAT_EDGE} />
      <rect x={-sw * 0.66} y={shY + torso * 0.3 - 4} width={1.6} height={5} fill="#3b5fa8" />
      {[0.55, 0.8].map((f) => <circle key={f} cx={W * 0.27} cy={-torso + torso * f} r={1.1} fill={COAT_EDGE} />)}
    </g>
  );
};
/** Plain hospital gown: covers the torso and hangs to the knee. */
const GownFront: React.FC<{ sw: number; hw: number; shY: number; torso: number; hem: number }> = ({ sw, hw, shY, torso, hem }) => {
  const W = Math.max(hw, sw * 0.8);
  return (
    <g>
      <path d={`M ${-sw} ${shY + 4} L ${-W * 1.08} -2 L ${-W * 1.24} ${hem} L ${W * 1.24} ${hem} L ${W * 1.08} -2 L ${sw} ${shY + 4} Z`} fill={GOWN} />
      <path d={`M ${-sw * 0.45} ${shY - 1} Q 0 ${shY + torso * 0.2} ${sw * 0.45} ${shY - 1}`} fill="none" stroke="#9fbcbe" strokeWidth={1.6} />
      <path d={`M ${-W * 0.5} ${hem * 0.15} L ${-W * 0.6} ${hem - 2} M ${W * 0.45} ${hem * 0.25} L ${W * 0.55} ${hem - 2}`} stroke="#b4cfd1" strokeWidth={1.2} />
    </g>
  );
};
/** Lab coat or gown in side view (faces +x, hip at y=0). */
const SideCover: React.FC<{ kind: Outfit; tw: number; shY: number; hem: number; flare: number }> = ({ kind, tw, shY, hem, flare }) =>
  kind === "labcoat" ? (
    <g strokeLinejoin="round">
      <path d={`M ${tw * 0.72} ${shY - 1} L ${tw * 0.98} ${-2} L ${flare * 0.95} ${hem} L ${-flare * 1.08} ${hem} L ${-tw * 1.2} ${-2} L ${-tw * 1.12} ${shY + 2} Q ${-tw * 0.4} ${shY - 2} ${tw * 0.72} ${shY - 1} Z`} fill={COAT} stroke={COAT_EDGE} strokeWidth={1.3} />
      <path d={`M ${tw * 0.72} ${shY - 1} L ${tw * 0.3} ${shY + 8}`} stroke={COAT_EDGE} strokeWidth={1.3} />
      <path d={`M ${-tw * 0.3} ${hem * 0.22} L ${tw * 0.6} ${hem * 0.22}`} stroke={COAT_EDGE} strokeWidth={1.4} />
    </g>
  ) : (
    <path d={`M ${tw * 1.02} -3 L ${flare * 0.95} ${hem} L ${-flare} ${hem} L ${-tw * 1.06} -3 Z`} fill={GOWN} />
  );

/** Open lab coat seen from behind: one back panel with a centre vent and a half belt. */
const CoatBack: React.FC<{ sw: number; hw: number; shY: number; torso: number; hem: number }> = ({ sw, hw, shY, torso, hem }) => {
  const W = Math.max(hw, sw * 0.82);
  return (
    <g strokeLinejoin="round">
      <path d={`M ${-sw * 1.07} ${shY + 3} Q ${-sw} ${shY - 1.5} ${-sw * 0.4} ${shY - 1.5} L ${sw * 0.4} ${shY - 1.5} Q ${sw} ${shY - 1.5} ${sw * 1.07} ${shY + 3} L ${W * 1.12} -2 L ${W * 1.3} ${hem} L ${-W * 1.3} ${hem} L ${-W * 1.12} -2 Z`} fill={COAT} stroke={COAT_EDGE} strokeWidth={1.3} />
      <path d={`M 0 ${lerp(-2, hem, 0.45)} L 0 ${hem}`} stroke={COAT_EDGE} strokeWidth={1.4} />
      <rect x={-W * 0.62} y={-torso * 0.14} width={W * 1.24} height={3.2} rx={1} fill={COAT} stroke={COAT_EDGE} strokeWidth={1.1} />
      {[-1, 1].map((k) => <circle key={k} cx={k * W * 0.48} cy={-torso * 0.14 + 1.6} r={1.1} fill={COAT_EDGE} />)}
    </g>
  );
};
/** Hospital gown from behind: open down the back, held by two ties. */
const GownBack: React.FC<{ sw: number; hw: number; shY: number; torso: number; hem: number }> = ({ sw, hw, shY, torso, hem }) => {
  const W = Math.max(hw, sw * 0.8);
  return (
    <g>
      <path d={`M ${-sw} ${shY + 4} L ${-W * 1.08} -2 L ${-W * 1.24} ${hem} L ${W * 1.24} ${hem} L ${W * 1.08} -2 L ${sw} ${shY + 4} Z`} fill={GOWN} />
      <path d={`M 0 ${shY} L 0 ${hem}`} stroke="#9fbcbe" strokeWidth={1.6} />
      {[shY + torso * 0.22, -torso * 0.38].map((y) => (
        <path key={y} d={`M -3 ${y - 1.5} L 0 ${y} L -3 ${y + 1.5} M 3 ${y - 1.5} L 0 ${y} L 3 ${y + 1.5}`} fill="none" stroke="#8fb0b2" strokeWidth={1.2} strokeLinecap="round" />
      ))}
    </g>
  );
};

/** Angles (Person convention) that put the hand of an arm starting at `sh` on `target`; the elbow points outward. */
const reach = (sh: Pt, target: Pt, sx: number, upper: number, fore: number) => {
  const tx = (target.x - sh.x) * sx, ty = target.y - sh.y;
  const d = Math.max(1, Math.min(Math.hypot(tx, ty), (upper + fore) * 0.995));
  const phi = Math.atan2(tx, ty);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (upper * upper + d * d - fore * fore) / (2 * upper * d))));
  const A = phi + alpha;
  const B = Math.atan2(tx - Math.sin(A) * upper, ty - Math.cos(A) * upper);
  return { arm: (A * 180) / Math.PI, elbow: ((B - A) * 180) / Math.PI };
};

type FigureProps = {
  spec: PersonSpec; pose?: Pose; feel?: FeelName; mouth?: Mouth; t?: number; blink?: boolean;
  /** force closed eyes whatever the feel (brows, mouth, tears still follow the feel) */
  eyes?: "open" | "closed";
  /** lying poses: surface height in metres and which way the head points (+x = 1, in this drawing's frame) */
  lieOn?: number; headDir?: 1 | -1;
};

const Figure: React.FC<FigureProps & { back: boolean }> = ({
  spec: s, pose = POSES.stand, feel = "neutral", mouth, t = 0, blink = false, eyes, lieOn = 0, headDir = 1, back,
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = s.h;
  const B = body(s, pose);
  const child = B.child;
  const headR = B.headR;
  const headRy = headR * 1.18;
  const legLen = B.legLen;
  const torso = B.torso;
  const sw = B.sw; // half shoulder width
  const hw = B.hw;
  const limb = B.limb;
  const upper = h * 0.165;
  const fore = h * 0.155;
  const hipY = -B.hipH;
  const shY = -torso; // relative to hip
  const f = FEELS[feel] as Feel;
  const m: Mouth = mouth ?? f.mouth;
  const breathe = Math.sin(t * 2.2 + s.seed) * 0.6;
  const { ws, wf, w0 } = B;
  const seated = ws + wf;
  const crossed = wf > 0.5;

  // sitting legs: thighs come towards the camera (short on screen), shins hang down to the floor
  const thigh = (h * (child ? 0.43 : 0.47)) / 2;
  const shin = thigh - 3;
  const kneeSit = thigh * 0.42; // the shin is foreshortened too, so the foot is simply held on the floor
  const footSit = Math.min(B.hipSit - 3, kneeSit + shin); // a child on a 0.45 m seat really does dangle its feet
  const kneeX = hw * 0.55 + thigh * 0.72; // cross-legged knee spread
  const leg = (sx: number, ang: number) => {
    const a = rad(ang) * sx;
    const k = pose.crouch > 0 ? rad(70 * pose.crouch) : 0;
    const half = legLen / 2 / Math.max(0.6, Math.cos(k));
    const knee = { x: sx * hw * 0.55 + Math.sin(a + sx * k) * half, y: Math.cos(k) * legLen * 0.5 };
    const foot = { x: sx * hw * 0.55 + Math.sin(a) * legLen * 0.35, y: legLen - 3 };
    const hip = { x: sx * hw * 0.55, y: 0 };
    if (seated <= 0) return { hip, knee, foot };
    const sk = { x: sx * hw * 0.78, y: kneeSit }, sf = { x: sx * hw * 0.8, y: footSit };
    const ck = { x: sx * kneeX, y: B.hipFloor - limb * 0.55 }, cf = { x: -sx * hw * 0.3, y: B.hipFloor - limb * 0.45 - 1 };
    const mix = (p: Pt, q: Pt, r: Pt) => ({ x: w0 * p.x + ws * q.x + wf * r.x, y: w0 * p.y + ws * q.y + wf * r.y });
    return { hip, knee: mix(knee, sk, ck), foot: mix(foot, sf, cf) };
  };
  const arm = (sx: number, ang: number, elbow: number) => {
    const sh = { x: sx * sw, y: shY + limb * 0.5 };
    if (seated > 0) {
      // hands rest on the thighs (chair) or on the knees (floor)
      const st = { x: sx * hw * 0.8, y: kneeSit * 0.55 - limb * 0.2 };
      const ct = { x: sx * kneeX * 0.95, y: B.hipFloor - limb * 1.2 };
      const tg = { x: (ws * st.x + wf * ct.x) / seated, y: (ws * st.y + wf * ct.y) / seated };
      const ik = reach(sh, tg, sx, upper, fore);
      const k = Math.min(1, seated);
      ang = lerp(ang, ik.arm, k);
      elbow = lerp(elbow, ik.elbow, k);
    } else if (pose.lie > 0) {
      // a sleeper's arms lie along the body, hands resting on the front of the hips
      const ik = reach(sh, { x: sx * hw * 0.62, y: 8 }, sx, upper, fore);
      const k = clamp01(pose.lie);
      ang = lerp(ang, ik.arm, k);
      elbow = lerp(elbow, ik.elbow, k);
    }
    const a = rad(ang) * sx;
    const b = a + rad(elbow) * sx;
    const el = { x: sh.x + Math.sin(a) * upper, y: sh.y + Math.cos(a) * upper };
    const hd = { x: el.x + Math.sin(b) * fore, y: el.y + Math.cos(b) * fore };
    return { sh, el, hd, rot: (-b * 180) / Math.PI };
  };
  const LL = leg(-1, pose.legL), LR = leg(1, pose.legR);
  const AL = arm(-1, pose.armL, pose.elbowL), AR = arm(1, pose.armR, pose.elbowR);
  const L = lookOf(s.wear);
  const paint = usePaints(id, L);
  const bot = L.bottom;
  const pantsF = (part: "all" | "thigh" | "shin") => (bot.shape !== "pants" ? 0 : part === "all" ? bot.len : part === "thigh" ? Math.min(1, bot.len * 2) : Math.max(0, bot.len * 2 - 1));

  const drawLeg = (l: ReturnType<typeof leg>, part: "all" | "thigh" | "shin" = "all") => {
    const pts = part === "all" ? [l.hip, l.knee, l.foot] : part === "thigh" ? [l.hip, l.knee] : [l.knee, l.foot];
    const d = pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
    const kneeCloth = bot.shape === "pants" && bot.len >= 0.5;
    return (
      <g>
        <path d={d} fill="none" stroke={s.skin} strokeWidth={limb * 1.15} strokeLinecap="round" strokeLinejoin="round" />
        <PantsLeg pts={pts} f={pantsF(part)} L={L} paint={paint} limb={limb} back={back} />
        {/* knee coming towards the camera: a round cap and a soft shadow on the shin under it */}
        {ws > 0.5 && part === "all" && !back && (
          <>
            <ellipse cx={l.knee.x} cy={l.knee.y + limb * 0.62} rx={limb * 0.5} ry={limb * 0.16} fill="rgba(0,0,0,.22)" />
            <ellipse cx={l.knee.x} cy={l.knee.y} rx={limb * 0.64 * (kneeCloth ? Math.min(1.25, bot.wide) : 1)} ry={limb * 0.6} fill={kneeCloth ? paint.bottom : s.skin} />
          </>
        )}
        {part !== "thigh" && <Foot x={l.foot.x} y={l.foot.y} limb={limb} L={L} skin={s.skin} view={back ? "back" : "front"} />}
      </g>
    );
  };
  const drawArm = (a: ReturnType<typeof arm>, hand: Hand, left: boolean) => (
    <g>
      <path d={`M ${a.sh.x} ${a.sh.y} L ${a.el.x} ${a.el.y} L ${a.hd.x} ${a.hd.y}`} fill="none" stroke={s.skin} strokeWidth={limb * 0.82} strokeLinecap="round" strokeLinejoin="round" />
      <Sleeves a={a} L={L} paint={paint} limb={limb} watch={left && L.has("watch")} coat={!!s.outfit} face={!back} />
      {s.outfit === "labcoat" && <CoatSleeve a={a} limb={limb} />}
      <g transform={`translate(${a.hd.x} ${a.hd.y}) rotate(${a.rot})`}>
        <HandShape kind={hand} r={limb * 0.5} skin={s.skin} />
      </g>
    </g>
  );

  const torsoD = `M ${-sw} ${shY + 4} Q ${-sw} ${shY} ${-sw * 0.55} ${shY - 1} L ${sw * 0.55} ${shY - 1} Q ${sw} ${shY} ${sw} ${shY + 4} L ${hw} ${-2} Q ${hw} 4 ${hw * 0.6} 4 L ${-hw * 0.6} 4 Q ${-hw} 4 ${-hw} ${-2} Z`;
  const geo = { sw, hw, shY, torso, limb, R: headR, legLen: h * (child ? 0.43 : 0.47), torsoD, clip: `c${id}`, seed: s.seed };

  // face
  const eye = (sx: number) => {
    const x = sx * headR * 0.42, y = headR * 0.08, w = headR * 0.2;
    const kind = eyes === "closed" ? "closed" : blink && (f.eyes === "open" || f.eyes === "narrow") ? "closed" : f.eyes;
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

  // back of the head: the hair covers it all (down to the nape), except the elder's thin/bald style
  const cover = (nape: number, wide = 1.04) =>
    `M ${-R * wide} ${Ry * 0.15} Q ${-R * (wide + 0.1)} ${-Ry * 1.2} 0 ${-Ry * 1.14} Q ${R * (wide + 0.1)} ${-Ry * 1.2} ${R * wide} ${Ry * 0.15} Q ${R * 0.85} ${Ry * nape} 0 ${Ry * (nape - 0.08)} Q ${-R * 0.85} ${Ry * nape} ${-R * wide} ${Ry * 0.15} Z`;
  const backHair = () => {
    const line = "rgba(0,0,0,.28)";
    if (style === 3)
      return <path d={`M ${-R * 1.12} ${Ry * 2.35} Q ${-R * 1.32} ${-Ry * 1.22} 0 ${-Ry * 1.15} Q ${R * 1.32} ${-Ry * 1.22} ${R * 1.12} ${Ry * 2.35} Q 0 ${Ry * 2.55} ${-R * 1.12} ${Ry * 2.35} Z`} />;
    if (style === 4)
      return <path d={`M ${-R * 1.13} ${Ry * 0.78} Q ${-R * 1.3} ${-Ry * 1.2} 0 ${-Ry * 1.15} Q ${R * 1.3} ${-Ry * 1.2} ${R * 1.13} ${Ry * 0.78} Q 0 ${Ry * 0.9} ${-R * 1.13} ${Ry * 0.78} Z`} />;
    if (style === 5 && !child)
      return <path d={`M ${-R * 1.03} ${-Ry * 0.28} Q 0 ${Ry * 0.02} ${R * 1.03} ${-Ry * 0.28} L ${R * 0.88} ${Ry * 0.52} Q 0 ${Ry * 1.08} ${-R * 0.88} ${Ry * 0.52} Z`} />;
    return (
      <g>
        <path d={cover(style === 2 ? 0.62 : 0.55)} />
        {style === 1 && <path d={`M ${R * 0.25} ${-Ry * 1.1} Q ${R * 0.35} ${-Ry * 0.7} ${R * 0.2} ${-Ry * 0.35}`} fill="none" stroke={line} strokeWidth={R * 0.06} strokeLinecap="round" />}
        {style === 0 && <path d={`M ${-R * 0.15} ${-Ry * 0.75} q ${R * 0.2} ${-R * 0.15} ${R * 0.3} 0`} fill="none" stroke={line} strokeWidth={R * 0.05} strokeLinecap="round" />}
        {style === 2 && <><circle cx={0} cy={-Ry * 0.82} r={R * 0.46} /><path d={`M ${-R * 0.4} ${-Ry * 0.6} Q 0 ${-Ry * 0.5} ${R * 0.4} ${-Ry * 0.6}`} fill="none" stroke={line} strokeWidth={R * 0.07} /></>}
        {style === 5 && child && <circle cx={0} cy={-Ry * 1.2} r={R * 0.3} />}
      </g>
    );
  };

  // back view: arms whose hand ends in front of the body are hidden behind it (only the elbow shows)
  const hidden = (a: ReturnType<typeof arm>) => Math.abs(a.hd.x) < sw * 0.95 && a.hd.y < 8;
  const backArms = (behind: boolean) => (
    // the person's own left/right swap sides on screen when seen from behind
    <g transform="scale(-1 1)">
      {hidden(AL) === behind && drawArm(AL, pose.handL, true)}
      {hidden(AR) === behind && drawArm(AR, pose.handR, false)}
    </g>
  );
  const coatHem = Math.max(LL.knee.y, LR.knee.y);

  // tube skirt / pleated skirt: hangs from the hip, drapes over the knees when sitting, covers the lap on the floor
  const skirt = bot.shape === "skirt";
  const cloth = bot.shape !== "pants";
  const clothLen = w0 * legLen * bot.len + ws * (skirt ? kneeSit + limb * 0.55 : kneeSit + shin * 0.75) + wf * (B.hipFloor - 1);
  const clothW = w0 * hw * bot.wide + ws * hw * (skirt ? 1.55 : 1.45) + wf * (skirt ? kneeX * 0.85 : kneeX + limb * 0.65);
  const clothEl = cloth ? <Cloth L={L} paint={paint} y0={-3} len={clothLen} wTop={hw} wBot={clothW} back={back} clip={`k${id}`} standing={w0} /> : null;
  // hard hats come off in bed
  const hatOn = !L.head || pose.lie < 0.5 || L.head.kind === "scarf" || L.head.kind === "band";
  const glasses = L.has("glasses") && <g fill="none" stroke={INK} strokeWidth={R * 0.07}><circle cx={-R * 0.42} cy={R * 0.08} r={R * 0.3} /><circle cx={R * 0.42} cy={R * 0.08} r={R * 0.3} /><line x1={-R * 0.12} x2={R * 0.12} y1={R * 0.08} y2={R * 0.08} /></g>;
  const torsoLayer = (
    <>
      <clipPath id={`c${id}`}><path d={torsoD} /></clipPath>
      <g transform={`scale(1 ${1 + breathe * 0.004})`}><TopFront g={geo} L={L} paint={paint} skin={s.skin} back={back} /></g>
      <Waistband L={L} paint={paint} hw={hw} back={back} />
      <AccBody g={geo} L={L} paint={paint} back={back} layer="waist" lie={pose.lie} />
      {s.outfit === "labcoat" && (back ? <CoatBack sw={sw} hw={hw} shY={shY} torso={torso} hem={coatHem + limb * 0.5} /> : <CoatFront sw={sw} hw={hw} shY={shY} torso={torso} hem={coatHem + limb * 0.5} />)}
      {s.outfit === "patient" && (back ? <GownBack sw={sw} hw={hw} shY={shY} torso={torso} hem={coatHem + limb * 0.3} /> : <GownFront sw={sw} hw={hw} shY={shY} torso={torso} hem={coatHem + limb * 0.3} />)}
      {!s.outfit && <OuterFront g={geo} L={L} hem={coatHem + limb * 0.5} back={back} seated={seated} />}
      <AccBody g={geo} L={L} paint={paint} back={back} layer="over" lie={pose.lie} />
    </>
  );

  const fig = (
    <g transform={`translate(0 ${hipY})`}>
      {paint.defs}
      {back && seated > 0.5 && <ellipse cx={0} cy={4} rx={hw * 1.08} ry={limb * 0.75} fill={paint.bottom} />}
      {crossed ? (
        <>
          {drawLeg(LL, "thigh")}
          {drawLeg(LR, "thigh")}
          {clothEl}
          {!(cloth && !skirt) ? <>{drawLeg(LR, "shin")}{drawLeg(LL, "shin")}</> : [LR, LL].map((l, i) => <Foot key={i} x={l.foot.x} y={l.foot.y} limb={limb} L={L} skin={s.skin} view={back ? "back" : "front"} />)}
        </>
      ) : (
        <>
          {/* the lap: top of both thighs, seen from slightly above */}
          {ws > 0.5 && !back && !cloth && <path d={`M ${-hw} -2 L ${hw} -2 L ${hw * 0.78 + limb * 0.5} ${kneeSit} L ${-hw * 0.78 - limb * 0.5} ${kneeSit} Z`} fill={paint.bottom} />}
          {drawLeg(LL)}
          {drawLeg(LR)}
          {clothEl}
          <PantsExtras L={L} paint={paint} hw={hw} legLen={legLen} back={back} standing={w0} />
        </>
      )}
      <g transform={`rotate(${pose.lean})`}>
        {back ? (
          <>
            <AccBody g={geo} L={L} paint={paint} back layer="under" lie={pose.lie} />
            {backArms(true)}
            {torsoLayer}
            {backArms(false)}
            <TopOverArms g={geo} L={L} paint={paint} back />
            <rect x={-R * 0.3} y={shY - R * 0.5} width={R * 0.6} height={R * 0.7} fill={s.skin} />
            {s.outfit === "labcoat" && <path d={`M ${-R * 0.55} ${shY + 1} Q 0 ${shY - R * 0.3} ${R * 0.55} ${shY + 1} L ${R * 0.5} ${shY - 2.5} Q 0 ${shY - R * 0.55} ${-R * 0.5} ${shY - 2.5} Z`} fill={COAT} stroke={COAT_EDGE} strokeWidth={1.1} />}
            <g transform={`translate(0 ${shY - R * 0.35 - Ry}) rotate(${pose.head})`}>
              <ellipse cx={-R} cy={Ry * 0.12} rx={R * 0.16} ry={R * 0.26} fill={s.skin} />
              <ellipse cx={R} cy={Ry * 0.12} rx={R * 0.16} ry={R * 0.26} fill={s.skin} />
              <ellipse rx={R} ry={Ry} fill={s.skin} />
              <g fill={s.hair}>{backHair()}</g>
              {hatOn && <Headwear L={L} paint={paint} R={R} Ry={Ry} view="back" />}
            </g>
          </>
        ) : (
          <>
            {torsoLayer}
            {drawArm(AL, pose.handL, true)}
            {drawArm(AR, pose.handR, false)}
            <TopOverArms g={geo} L={L} paint={paint} back={false} />
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
              <g fill={s.hair}>{style === 3 || style === 4 || (style === 2 && hatOn && hidesBun(L)) ? hairs[0] : hairs[style]}</g>
              {hatOn && <Headwear L={L} paint={paint} R={R} Ry={Ry} view="front" />}
              {glasses}
              {f.sweat && <path transform={`translate(${R * 1.05} ${-R * 0.4})`} d={`M 0 ${-R * 0.3} Q ${R * 0.25} ${R * 0.1} 0 ${R * 0.22} Q ${-R * 0.25} ${R * 0.1} 0 ${-R * 0.3} Z`} fill="#8fd0f2" />}
            </g>
          </>
        )}
      </g>
    </g>
  );
  const k = clamp01(pose.lie);
  return k > 0 ? <g transform={lieXform(s, k, lieOn, headDir).svg}>{fig}</g> : fig;
};

/** Front view. 100 units = 1 m, origin on the ground between the feet. */
export const Person: React.FC<FigureProps> = (p) => <Figure {...p} back={false} />;
/** The same person seen from behind: no face, hair over the whole head, arms mirrored. Same skeleton as Person. */
export const PersonBack: React.FC<FigureProps> = (p) => <Figure {...p} back />;

/** Simple wooden stool, seat top at SEAT (0.45 m); draw it before (under) a sitting Person at the same origin. */
export const Stool: React.FC<{ w?: number }> = ({ w = 46 }) => {
  const y = -SEAT, wood = "#9a6a42", dark = "#6e4a2e";
  return (
    <g>
      {[-1, 1].map((k) => <rect key={`b${k}`} x={k * (w / 2 - 7) - 1.8} y={y - 5} width={3.6} height={SEAT - 1} fill={dark} />)}
      {[-1, 1].map((k) => <rect key={`f${k}`} x={k * (w / 2 - 3) - 2} y={y} width={4} height={SEAT} fill={wood} />)}
      <rect x={-w / 2 + 2} y={y + SEAT * 0.55} width={w - 4} height={2.4} fill={dark} />
      <path d={`M ${-w / 2} ${y} L ${w / 2} ${y} L ${w / 2 - 4} ${y - 6} L ${-w / 2 + 4} ${y - 6} Z`} fill="#b78456" />
      <rect x={-w / 2} y={y} width={w} height={3.5} fill={wood} />
    </g>
  );
};

// ---------- review sheet: 30 random people across the pose and emotion libraries ----------
export const PeopleSheet: React.FC = () => {
  const poses = (Object.keys(POSES) as PoseName[]).filter((p) => !REST_POSES.includes(p));
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
export const strideOf = (spec: PersonSpec, gait: Gait) => 4 * spec.h * (spec.age === "child" ? 0.43 : 0.47) * Math.sin(rad(gait.A * stepK(spec)));
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
    const th = gait ? rad(gait.A * stepK(s) * Math.sin(ph)) : 0;
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
  const look = lookOf(s.wear);
  const paint = usePaints(id, look);
  const bot = look.bottom;
  const dim = { filter: "brightness(0.8)" };

  const drawLeg = (l: ReturnType<typeof leg>, far: boolean) => (
    <g style={far ? dim : undefined}>
      <path d={`M 0 0 L ${l.knee.x} ${l.knee.y} L ${l.foot.x} ${l.foot.y}`} fill="none" stroke={s.skin} strokeWidth={limb * 1.15} strokeLinecap="round" strokeLinejoin="round" />
      <PantsLeg pts={[{ x: 0, y: 0 }, l.knee, l.foot]} f={bot.shape === "pants" ? bot.len : 0} L={look} paint={paint} limb={limb} />
      <Foot x={l.foot.x} y={l.foot.y} limb={limb} L={look} skin={s.skin} view="side" />
    </g>
  );
  const drawArm = (a: ReturnType<typeof arm>, far: boolean) => (
    <g style={far ? dim : undefined}>
      <path d={`M ${a.sh.x} ${a.sh.y} L ${a.el.x} ${a.el.y} L ${a.hd.x} ${a.hd.y}`} fill="none" stroke={s.skin} strokeWidth={limb * 0.82} strokeLinecap="round" strokeLinejoin="round" />
      <Sleeves a={a} L={look} paint={paint} limb={limb} watch={!far && look.has("watch")} coat={!!s.outfit} />
      {s.outfit === "labcoat" && <CoatSleeve a={a} limb={limb} />}
      <circle cx={a.hd.x} cy={a.hd.y} r={limb * 0.48} fill={s.skin} />
    </g>
  );
  const torsoD = `M ${-tw} ${shY + 5} Q ${-tw} ${shY - 1} 0 ${shY - 1} Q ${tw} ${shY - 1} ${tw} ${shY + 5} L ${tw * 1.05} -2 Q ${tw} 4 0 4 Q ${-tw} 4 ${-tw * 1.05} -2 Z`;
  const skirtLen = legLen * bot.len;
  const spread = Math.max(Math.abs(back.knee.x), Math.abs(front.knee.x)) + limb * 0.75;
  const sg = { tw, shY, torso, limb, R, L, torsoD, clip: `s${id}` };
  // a tube skirt is wide enough at the hem to hold both legs where they cross the hem line
  const atY = (l: ReturnType<typeof leg>, y: number) => {
    const [a, b] = y <= l.knee.y ? [{ x: 0, y: 0 }, l.knee] : [l.knee, l.foot];
    const u = Math.max(0, Math.min(1, (y - a.y) / ((b.y - a.y) || 1)));
    return Math.abs(a.x + (b.x - a.x) * u);
  };
  const hemReach = Math.max(atY(back, skirtLen), atY(front, skirtLen));
  const flare = Math.max(tw * 1.3, spread * 0.62);
  const hatShown = !!look.head;

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
      {bot.shape !== "pants" && <Cloth L={look} paint={paint} y0={-3} len={skirtLen} wTop={tw} wBot={Math.max(tw * (bot.shape === "skirt" ? 1.5 : 1.15), spread * (skirtLen / L) * 0.55, bot.shape === "tube" ? hemReach + limb * 0.62 : 0)} back clip={`k${id}`} standing={1} />}
      {bot.jong && <path d={`M ${tw * 0.6} -2 Q ${tw * 1.5} ${L * 0.4} ${tw * 0.9} ${L * 0.8} L ${tw * 0.3} ${L * 0.7} Z`} fill={paint.bottom} stroke="rgba(0,0,0,.25)" strokeWidth={0.8} />}
      <g transform={`rotate(${gait ? gait.lean : 0})`}>
        {paint.defs}
        {drawArm(armB, true)}
        <AccSideBehind g={sg} L={look} />
        <clipPath id={`s${id}`}><path d={torsoD} /></clipPath>
        <TopSide g={sg} L={look} paint={paint} skin={s.skin} />
        {bot.shape === "pants" && <path d={`M ${-tw * 1.05} -5 L ${tw * 1.05} -5 L ${tw * 1.05} 0 Q ${tw} 5 0 5 Q ${-tw} 5 ${-tw * 1.05} 0 Z`} fill={paint.bottom} />}
        {bot.jong && <path d={`M ${-tw * 1.05} -4 Q ${-tw * 1.6} 2 ${-tw * 1.0} 6 L ${-tw * 0.5} 3 Z`} fill={paint.bottom} stroke="rgba(0,0,0,.25)" strokeWidth={0.8} />}
        <AccSide g={sg} L={look} paint={paint} />
        {s.outfit ? <SideCover kind={s.outfit} tw={tw} shY={shY} hem={L * (s.outfit === "labcoat" ? 1.08 : 1.0)} flare={flare} /> : <OuterSide g={sg} L={look} hem={L * 1.08} flare={flare} />}
        <rect x={-R * 0.32} y={shY - R * 0.5} width={R * 0.64} height={R * 0.7} fill={s.skin} />
        <g transform={`translate(${R * 0.12} ${shY - R * 0.35 - Ry}) rotate(${gait ? gait.headTilt : 0})`}>
          <g fill={s.hair}>
            {style === 2 && !(hatShown && look.head?.kind === "scarf") && <circle cx={-R * 0.95} cy={-Ry * 0.75} r={R * 0.42} />}
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
          <Headwear L={look} paint={paint} R={R} Ry={Ry} view="side" />
          {look.has("glasses") && <g fill="none" stroke={INK} strokeWidth={R * 0.07}><circle cx={ex} cy={ey + R * 0.02} r={R * 0.3} /><line x1={ex - R * 0.3} x2={-R * 0.15} y1={ey} y2={ey - R * 0.05} /></g>}
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

// ---------- review sheet: front / back / sitting / lying on four people ----------
export const PoseSheet: React.FC = () => {
  const k = 1.25; // px per unit (cm)
  const rows: { spec: PersonSpec; label: string; feel: FeelName }[] = [
    { spec: makePerson(4, { age: "child", female: false, era: "rural" }), label: "เด็กชาย", feel: "happy" },
    { spec: makePerson(12, { age: "adult", female: true, era: "rural" }), label: "ผู้หญิง", feel: "neutral" },
    { spec: makePerson(15, { age: "adult", female: false, era: "city", outfit: "labcoat" }), label: "ผู้ชาย · เสื้อกาวน์", feel: "calm" },
    { spec: makePerson(24), label: "ผู้สูงอายุ", feel: "sad" },
  ];
  const cols: { pose: PoseName; back?: boolean; label: string }[] = [
    { pose: "stand", label: "ยืน" },
    { pose: "stand", back: true, label: "มุมหลัง" },
    { pose: "sit", label: "นั่ง · เก้าอี้ 0.45 ม." },
    { pose: "sitfloor", label: "นั่งขัดสมาธิ" },
  ];
  const txt = (x: number, y: number, s: string, size = 28, fill = "#5a4f46", weight = 500, anchor: "middle" | "start" = "middle") => (
    <text x={x} y={y} textAnchor={anchor} fontFamily="Kanit" fontWeight={weight} fontSize={size} fill={fill}>{s}</text>
  );
  // red cross = headCenter(): where a beam "through" this person would pass
  const mark = (x: number, y: number) => <path d={`M ${x - 7} ${y} L ${x + 7} ${y} M ${x} ${y - 7} L ${x} ${y + 7}`} stroke="#e0262b" strokeWidth={2.5} />;
  return (
    <AbsoluteFill style={{ background: "#efe8dc", fontFamily: "Kanit" }}>
      <div style={{ position: "absolute", left: 40, top: 22, fontSize: 44, fontWeight: 800, color: "#231c1a" }}>ท่านั่ง ท่านอน มุมหลัง</div>
      <div style={{ position: "absolute", right: 40, top: 22, fontSize: 28, fontWeight: 500, color: "#6b5f55", textAlign: "right", lineHeight: 1.25 }}>เส้นประ = 1.7 ม.<br /><span style={{ color: "#e0262b" }}>+</span> = จุดกลางศีรษะ</div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {rows.map((row, r) => {
          const top = 115 + r * 450;
          const gy = top + 255, ly = top + 437;
          return (
            <g key={r}>
              <line x1={20} x2={1060} y1={gy} y2={gy} stroke="#cbbfae" strokeWidth={3} />
              <line x1={20} x2={1060} y1={gy - 170 * k} y2={gy - 170 * k} stroke="#c9bca8" strokeWidth={2} strokeDasharray="6 8" />
              {cols.map((c, i) => {
                const x = 135 + i * 270;
                const pose = POSES[c.pose];
                const hc = headCenter(row.spec, pose);
                return (
                  <g key={i}>
                    <g transform={`translate(${x} ${gy}) scale(${k})`}>
                      {c.pose === "sit" && <Stool />}
                      {c.back ? <PersonBack spec={row.spec} pose={pose} feel={row.feel} /> : <Person spec={row.spec} pose={pose} feel={row.feel} />}
                    </g>
                    {mark(x + hc.x * 100 * k, gy - hc.y * 100 * k)}
                    {txt(x, gy + 34, c.label)}
                  </g>
                );
              })}
              <line x1={20} x2={1060} y1={ly} y2={ly} stroke="#cbbfae" strokeWidth={3} />
              {([1, -1] as const).map((dir, i) => {
                const x = 270 + i * 540;
                const lie = { on: 0.55, dir };
                const hc = headCenter(row.spec, POSES.lie, lie);
                return (
                  <g key={dir}>
                    <rect x={x - 125} y={ly - 55 * k} width={250} height={55 * k} rx={6} fill="#8a6f58" />
                    <rect x={x - 125} y={ly - 55 * k} width={250} height={10} rx={4} fill="#d9cfc2" />
                    <g transform={`translate(${x} ${ly}) scale(${k})`}>
                      <Person spec={row.spec} pose={POSES.lie} feel={row.feel} eyes="closed" lieOn={0.55} headDir={dir} />
                    </g>
                    {mark(x + hc.x * 100 * k, ly - hc.y * 100 * k)}
                    {txt(x, ly - 14, dir === 1 ? "นอน · หัวไปขวา →" : "← นอน · หัวไปซ้าย", 28, "#fff6ea")}
                  </g>
                );
              })}
              {txt(540, ly - 30, row.label, 32, "#231c1a", 700)}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
