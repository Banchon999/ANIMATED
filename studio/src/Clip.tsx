import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { FeelName, GaitName, headCenter, headCenterSide, makePerson, mixPose, Mouth, Outfit, OUTFITS, Person, PersonBack, PersonSide, PersonSpec, Pose, PoseName, POSES, Stool, strideOf, Age, Era } from "./People";
import { checkWear, WearSpec } from "./Wardrobe";
import { BEAM_DEFAULT, BeamFx, Fx, FX_KINDS, FlashFx, QuestionFx, SparksFx } from "./Fx";
import { GAITS } from "./Character";
import { SetName, SETS, SetStage } from "./Sets";
import { TimeOfDay, TIMES } from "./Light";
import { buildCam, Cam, clamp01, easeInOut, easeOut, easeOutBack, ensureFonts, lerp, project, rng, V3 } from "./lib";

ensureFonts();

// ---------- clip script format (plain JSON, see clips/*.json) ----------
export type CamKind = "high" | "wide" | "mid" | "close";
export type ActorCue = {
  who: string;
  at: [number, number]; // x, z on the ground
  walkTo?: [number, number]; // walks there over the whole shot, drawn in side view
  gait?: GaitName; // stroll (default), hurry, sneak, tired
  pose?: PoseName;
  feel?: FeelName;
  then?: { at: number; pose?: PoseName; feel?: FeelName }[]; // seconds into the shot
  face?: 1 | -1;
  view?: "front" | "back"; // back = seen from behind (walkTo still draws the side view)
  lieOn?: number; // pose "lie": height of the surface in metres (bed mattress 0.55, floor 0 = default)
  headDir?: 1 | -1; // pose "lie": head towards +x (1, default) or -x (-1), whatever "face" says
  eyes?: "open" | "closed"; // force the eyes; "lie" closes them unless "open"
  stool?: boolean; // pose "sit": draw a simple 0.45 m stool under the actor
};
export type ShotScript = {
  set: SetName;
  cam: CamKind;
  dur: number; // seconds
  focus: string | [number, number, number]; // actor name, "a+b" for the middle of several, or a point
  actors: ActorCue[];
  caption?: string[]; // lines shown one after another; *word* = highlight
  say?: string; // actor whose mouth moves
  card?: { title: string; value: number; unit?: string };
  fx?: Fx[]; // per-shot effects: beam, flash, sparks, question
  time?: TimeOfDay; // morning, day, evening, night; default: the set's own time (SETS[set].time)
};
export type ClipScript = {
  id: string;
  seed: number;
  cast: Record<string, { seed: number; age?: Age; female?: boolean; era?: Era; outfit?: Outfit; wear?: WearSpec; lead?: boolean }>;
  shots: ShotScript[];
  audio?: string; // file in public/audio/, plays from frame 0 for the whole clip
};
const FPS = 30;
export const clipFrames = (c: ClipScript) => c.shots.reduce((n, s) => n + Math.round(s.dur * FPS), 0);

/** Fail early, with a readable message, when a script names something the kit does not have. */
export const validateClip = (c: ClipScript) => {
  const bad = (msg: string) => { throw new Error(`clips/${c.id}.json: ${msg}`); };
  for (const [name, p] of Object.entries(c.cast)) {
    if (p.outfit && !OUTFITS.includes(p.outfit)) bad(`cast "${name}": unknown outfit "${p.outfit}" (have: ${OUTFITS.join(", ")})`);
    if (p.lead !== undefined && typeof p.lead !== "boolean") bad(`cast "${name}": lead must be true or false`);
    if (p.wear !== undefined) {
      if (!p.era) bad(`cast "${name}": a cast entry with "wear" needs "era" (old, rural or city) so the pieces can be checked`);
      const problems = checkWear(p.wear, p.era!);
      if (problems.length) bad(`cast "${name}": ${problems.join("; ")}`);
    }
    // the lead never wears the same outfit twice: dress.mjs picks an unused one and logs it in wardrobe/used.json
    if (p.lead && !p.wear) bad(`cast "${name}" is a lead but has no "wear": run  node scripts/dress.mjs ${c.id}`);
  }
  if (c.audio !== undefined && (typeof c.audio !== "string" || !c.audio)) bad(`audio must be a file name in public/audio/`);
  c.shots.forEach((s, i) => {
    const at = `shot ${i + 1}`;
    if (!(s.set in SETS)) bad(`${at}: unknown set "${s.set}" (have: ${Object.keys(SETS).join(", ")})`);
    if (!["high", "wide", "mid", "close"].includes(s.cam)) bad(`${at}: unknown cam "${s.cam}"`);
    if (s.time !== undefined && !TIMES.includes(s.time)) bad(`${at}: unknown time "${s.time}" (have: ${TIMES.join(", ")})`);
    if (!(s.dur > 0)) bad(`${at}: dur must be a positive number of seconds`);
    const names = s.actors.map((a) => a.who);
    s.actors.forEach((a) => {
      if (!(a.who in c.cast)) bad(`${at}: actor "${a.who}" is not in cast`);
      for (const p of [a.pose, ...(a.then ?? []).map((x) => x.pose)]) if (p && !(p in POSES)) bad(`${at}: unknown pose "${p}" (have: ${Object.keys(POSES).join(", ")})`);
      if (a.gait && !(a.gait in GAITS)) bad(`${at}: unknown gait "${a.gait}" (have: ${Object.keys(GAITS).join(", ")})`);
      const who = `${at}: actor "${a.who}"`;
      const poses = [a.pose, ...(a.then ?? []).map((x) => x.pose)];
      if (a.view !== undefined && a.view !== "front" && a.view !== "back") bad(`${who}: view must be "front" or "back"`);
      if (a.lieOn !== undefined && !(typeof a.lieOn === "number" && a.lieOn >= 0 && a.lieOn <= 2.5)) bad(`${who}: lieOn must be a height in metres, 0..2.5 (bed 0.55, floor 0)`);
      if (a.headDir !== undefined && a.headDir !== 1 && a.headDir !== -1) bad(`${who}: headDir must be 1 or -1`);
      if ((a.lieOn !== undefined || a.headDir !== undefined) && !poses.includes("lie")) bad(`${who}: lieOn / headDir need the pose "lie"`);
      if (a.eyes !== undefined && a.eyes !== "open" && a.eyes !== "closed") bad(`${who}: eyes must be "open" or "closed"`);
      if (a.stool !== undefined && typeof a.stool !== "boolean") bad(`${who}: stool must be true or false`);
      if (a.stool && !poses.includes("sit")) bad(`${who}: stool needs the pose "sit"`);
    });
    if (typeof s.focus === "string") for (const n of s.focus.split("+")) if (!names.includes(n)) bad(`${at}: focus "${n}" is not an actor in this shot`);
    if (s.say && !names.includes(s.say)) bad(`${at}: say "${s.say}" is not an actor in this shot`);
    (s.fx ?? []).forEach((f) => {
      if (!(FX_KINDS as readonly string[]).includes(f.kind)) bad(`${at}: unknown fx "${(f as { kind: string }).kind}" (have: ${FX_KINDS.join(", ")})`);
      if (f.kind === "beam" && f.through && !names.includes(f.through)) bad(`${at}: beam through "${f.through}" is not an actor in this shot`);
      if (f.kind === "beam" && f.strength !== undefined && !(f.strength >= 0 && f.strength <= 1)) bad(`${at}: beam strength must be 0..1`);
      if (f.kind === "sparks" && !(Array.isArray(f.at) && f.at.length === 3 && f.at.every((v) => typeof v === "number"))) bad(`${at}: sparks needs "at": [x, y, z]`);
      if (f.kind === "question" && !s.actors.length) bad(`${at}: question needs an actor in the shot`);
    });
    const xs = s.actors.filter((a) => !a.walkTo).map((a) => a.at[0]);
    const span = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
    const limit = s.cam === "close" ? 0.6 : s.cam === "mid" ? 1.4 : 3.6;
    if (s.cam !== "high" && span > limit) bad(`${at}: actors stand ${span.toFixed(1)} m apart but a "${s.cam}" shot only fits ${limit} m`);
  });
  return c;
};

// ---------- camera presets: framing relative to the focus point, varied per shot by seed ----------
export const camPreset = (kind: CamKind, f: V3, p: number, r: () => number, set: SetName): { cam: Cam; blur: number } => {
  const dark = SETS[set].dark;
  const sx = (r() - 0.5) * 2; // -1..1, which side the camera drifts from
  const e = easeInOut(p);
  const at = (dx: number, y: number, dz: number, ty: number, fov: number, blur = 0) => ({
    cam: { pos: [f[0] + dx, y, f[2] + dz] as V3, target: [f[0], ty, f[2]] as V3, fov },
    blur,
  });
  // portrait frames see only 0.56 of their height across: width = 2 * dist * tan(fov/2) * 0.5625
  if (set === "clinic") {
    // ceiling is 2.8 m, so "high" is a corner view from just under the ceiling (about 4.3 m across)
    if (kind === "high") {
      const side = sx > 0 ? 1 : -1;
      return { cam: { pos: [f[0] + side * lerp(1.9, 1.5, e), 2.55, f[2] + lerp(6.1, 5.5, e)], target: [f[0] + side * 0.15, 0.8, f[2] - 0.9], fov: 56 }, blur: 0 };
    }
    if (kind === "wide") return at(sx * 0.4 + lerp(-0.2, 0.2, e), 1.7, lerp(8.0, 7.3, e), 1.2, 48); // ~4.0 m across
    if (kind === "mid") return at(sx * 0.4 + lerp(-0.12, 0.12, e), 1.6, lerp(5.3, 4.9, e), 1.1, 36, 1.5); // ~1.9 m
    return at(sx * 0.2, 1.5, lerp(3.2, 2.95, e), f[1], 30, 3); // ~0.95 m
  }
  if (set === "cityroom") {
    // ceiling 2.6 m: "high" is a corner view from just under the ceiling, like the clinic (about 3.6 m across)
    if (kind === "high") {
      const side = sx > 0 ? 1 : -1;
      return { cam: { pos: [f[0] * 0.5 + side * lerp(1.9, 1.7, e), 2.48, f[2] + lerp(4.3, 3.9, e)], target: [f[0] - side * 0.15, 0.45, f[2] - 1.3], fov: 62 }, blur: 0 };
    }
    if (kind === "wide") return at(sx * 0.3 + lerp(-0.15, 0.15, e), 1.6, lerp(7.6, 7.0, e), 1.15, 48); // ~3.7 m across
    if (kind === "mid") return at(sx * 0.35 + lerp(-0.12, 0.12, e), 1.55, lerp(5.3, 4.9, e), 1.1, 36, 1.5); // ~1.9 m
    return at(sx * 0.2, 1.5, lerp(3.2, 2.95, e), f[1], 30, 3); // ~0.95 m
  }
  if (set === "shop" || set === "school") {
    // ceiling 3.0 m: "high" is a corner view from just under the ceiling, like the clinic
    const school = set === "school";
    if (kind === "high") {
      const side = sx > 0 ? 1 : -1;
      return school
        ? { cam: { pos: [f[0] * 0.5 + side * lerp(2.6, 2.3, e), 2.62, f[2] + lerp(5.2, 4.7, e)], target: [f[0] - side * 0.2, 0.6, f[2] - 1.6], fov: 60 }, blur: 0 }
        : { cam: { pos: [f[0] * 0.5 + side * lerp(1.5, 1.3, e), 2.8, f[2] + lerp(4.4, 4.0, e)], target: [f[0] - side * 0.1, 0.55, f[2] - 1.4], fov: 62 }, blur: 0 };
    }
    if (kind === "wide") return school ? at(sx * 0.3 + lerp(-0.15, 0.15, e), 1.65, lerp(8.0, 7.5, e), 1.35, 52) : at(sx * 0.3 + lerp(-0.15, 0.15, e), 1.6, lerp(7.4, 6.9, e), 1.3, 50); // ~4.4 / 4.0 m across
    if (kind === "mid") return at(sx * 0.35 + lerp(-0.12, 0.12, e), 1.55, lerp(5.3, 4.9, e), 1.1, 36, 1.5); // ~1.9 m
    return at(sx * 0.2, 1.5, lerp(3.2, 2.95, e), f[1], 30, 3); // ~0.95 m
  }
  if (set === "forest") {
    if (kind === "high") {
      // under the canopy (it closes at 14 m): looking down onto the trail between the trunks
      const az = lerp(0.4, 0.18, e) * (sx > 0 ? 1 : -1);
      const R = lerp(11, 9.5, e);
      return { cam: { pos: [f[0] + R * Math.sin(az), lerp(7.5, 6.8, e), f[2] + R * Math.cos(az)], target: [f[0], 0.8, f[2] - 1.5], fov: 50 }, blur: 0 };
    }
    if (kind === "wide") return at(sx * 0.5 + lerp(-0.25, 0.25, e), 1.75, lerp(8.6, 7.9, e), 1.6, 48); // ~4 m across, trunks rising out of the frame
    if (kind === "mid") return at(sx * 0.45 + lerp(-0.15, 0.15, e), 1.6, lerp(5.6, 5.1, e), 1.15, 36, 2);
    return at(sx * 0.25, 1.5, lerp(3.3, 3.0, e), f[1], 30, 5);
  }
  if (set === "street") {
    if (kind === "high") {
      // from above the lane (over the road, never inside the shophouse rows), looking down the soi
      const az = lerp(0.17, 0.08, e) * (sx > 0 ? 1 : -1);
      const R = lerp(14, 12.5, e);
      return { cam: { pos: [f[0] * 0.5 + R * Math.sin(az), lerp(9.2, 8.2, e), f[2] + R * Math.cos(az)], target: [f[0], 1.2, f[2] - 4], fov: 50 }, blur: 0 };
    }
    if (kind === "wide") return at(sx * 0.4 + lerp(-0.2, 0.2, e), 1.75, lerp(8.8, 8.1, e), 1.7, 48); // ~4 m across, wires overhead
    if (kind === "mid") return at(sx * 0.45 + lerp(-0.15, 0.15, e), 1.6, lerp(5.6, 5.1, e), 1.15, 36, 2);
    return at(sx * 0.25, 1.5, lerp(3.3, 3.0, e), f[1], 30, 5);
  }
  if (set === "temple") {
    if (kind === "high") {
      // from above the courtyard: the hall roofs, chedi and bodhi tree around the actors
      const az = lerp(0.42, 0.22, e) * (sx > 0 ? 1 : -1);
      const R = lerp(17, 15, e);
      return { cam: { pos: [f[0] + R * Math.sin(az), lerp(12.5, 11, e), f[2] + R * Math.cos(az)], target: [f[0], 2.4, f[2] - 4.5], fov: 50 }, blur: 0 };
    }
    // low and looking up a little, so the layered roofs and the chofa stay in the frame (~4.5 m across)
    if (kind === "wide") return at(sx * 0.5 + lerp(-0.3, 0.3, e), 1.5, lerp(10.4, 9.6, e), 2.15, 50);
    if (kind === "mid") return at(sx * 0.45 + lerp(-0.15, 0.15, e), 1.55, lerp(5.6, 5.1, e), 1.2, 36, 2);
    return at(sx * 0.25, 1.5, lerp(3.3, 3.0, e), f[1], 30, 5);
  }
  if (set === "market") {
    if (kind === "high") {
      const az = lerp(0.35, 0.15, e) * (sx > 0 ? 1 : -1);
      const R = lerp(11, 9.5, e);
      return { cam: { pos: [f[0] + R * Math.sin(az), lerp(8.5, 7.5, e), f[2] + R * Math.cos(az)], target: [f[0], 1.0, f[2] - 1.6], fov: 46 }, blur: 0 };
    }
    if (kind === "wide") return at(sx * 0.5 + lerp(-0.25, 0.25, e), 1.9, lerp(8.6, 7.9, e), 1.3, 46); // ~3.9 m across
    if (kind === "mid") return at(sx * 0.45 + lerp(-0.15, 0.15, e), 1.6, lerp(5.6, 5.1, e), 1.1, 36, 2);
    return at(sx * 0.25, 1.5, lerp(3.3, 3.0, e), f[1], 30, 5);
  }
  if (set === "ricefield") {
    if (kind === "high") {
      const az = lerp(0.5, 0.25, e) * (sx > 0 ? 1 : -1);
      const R = lerp(19, 16, e);
      return { cam: { pos: [f[0] + R * Math.sin(az), lerp(13, 11, e), f[2] + R * Math.cos(az)], target: [f[0], 0.4, f[2] - 5], fov: 44 }, blur: 0 };
    }
    if (kind === "wide") return at(sx * 0.6 + lerp(-0.35, 0.35, e), 1.9, lerp(9.0, 8.2, e), 1.35, 44); // ~4 m across, horizon high in the frame
    if (kind === "mid") return at(sx * 0.45 + lerp(-0.15, 0.15, e), 1.6, lerp(5.6, 5.1, e), 1.1, 36, 2);
    return at(sx * 0.25, 1.5, lerp(3.3, 3.0, e), f[1], 30, 5);
  }
  if (set === "accelerator") {
    if (kind === "high") {
      // steep view from above the open roof: the ring reads as an arc, the back wall top sits near the frame top
      const az = lerp(0.42, 0.18, e) * (sx > 0 ? 1 : -1);
      const R = lerp(15, 12.5, e);
      return { cam: { pos: [f[0] + R * Math.sin(az), lerp(24, 21, e), f[2] + R * Math.cos(az)], target: [f[0], 0.6, f[2] - 1.4], fov: 46 }, blur: 0 };
    }
    if (kind === "wide") return at(sx * 0.6 + lerp(-0.35, 0.35, e), 2.3, lerp(9.2, 8.4, e), 1.45, 44); // ~4.0 m across
    if (kind === "mid") return at(sx * 0.45 + lerp(-0.15, 0.15, e), 1.6, lerp(5.4, 5.0, e), 1.15, 36, 1.5); // ~1.9 m
    return at(sx * 0.25, 1.5, lerp(3.3, 3.0, e), f[1], 30, 4); // ~0.95 m
  }
  if (kind === "high") {
    const az = lerp(0.55, 0.2, e) * (sx > 0 ? 1 : -1);
    const R = lerp(30, 25, e);
    return { cam: { pos: [f[0] + R * Math.sin(az), lerp(21, 16, e), f[2] + R * Math.cos(az)], target: [f[0], 1.1, f[2] - 2.5], fov: 40 }, blur: 0 };
  }
  if (kind === "wide") return dark ? at(sx * 0.3 + lerp(-0.25, 0.2, e), 1.85, lerp(8.2, 7.4, e), 1.1, 46) : at(sx * 0.8 + lerp(-0.4, 0.4, e), 2.6, lerp(9.5, 8.6, e), 1.05, 42);
  if (kind === "mid") return at(sx * 0.5 + lerp(-0.15, 0.15, e), 1.65, lerp(5.6, 5.1, e), 1.05, 36, dark ? 0 : 2);
  return at(sx * 0.25, 1.5, lerp(3.3, 3.0, e), f[1], 30, dark ? 3 : 6);
};

// ---------- actor state at a moment of a shot ----------
const cueState = (cue: ActorCue, spec: PersonSpec, t: number, dur: number) => {
  let pose: Pose = POSES[cue.pose ?? "stand"];
  let feel: FeelName = cue.feel ?? "neutral";
  let lastAt = -1;
  for (const step of cue.then ?? []) {
    if (t < step.at) break;
    const k = easeOutBack((t - step.at) / 0.3);
    if (step.pose) pose = mixPose(pose, POSES[step.pose], Math.min(1.08, k));
    if (step.feel) feel = step.feel;
    lastAt = step.at;
  }
  let pos: V3 = [cue.at[0], 0, cue.at[1]];
  let face = cue.face ?? 1;
  let walk: { gait: GaitName; phase: number } | null = null;
  if (cue.walkTo) {
    const p = clamp01(t / dur);
    pos = [lerp(cue.at[0], cue.walkTo[0], p), 0, lerp(cue.at[1], cue.walkTo[1], p)];
    face = cue.walkTo[0] >= cue.at[0] ? 1 : -1;
    const gait = cue.gait ?? "stroll";
    // phase follows the distance covered, so the planted foot never slides
    const dist = Math.hypot(cue.walkTo[0] - cue.at[0], cue.walkTo[1] - cue.at[1]) * 100 * p;
    walk = { gait, phase: dist / strideOf(spec, GAITS[gait]) };
  }
  // a small hop when the pose or feeling changes
  const hop = lastAt >= 0 ? Math.max(0, 1 - (t - lastAt) / 0.25) * 5 : 0;
  return { pose, feel, pos, face, lift: hop, walk };
};
const TALK: Mouth[] = ["A", "M", "E", "O", "A", "U", "E", "M"];

// ---------- overlay ----------
const outline = "0 0 10px rgba(0,0,0,.6), 0 4px 0 rgba(0,0,0,.55), 3px 0 0 rgba(0,0,0,.45), -3px 0 0 rgba(0,0,0,.45), 0 -3px 0 rgba(0,0,0,.45)";
const Caption: React.FC<{ lines: string[]; t: number; dur: number }> = ({ lines, t, dur }) => {
  const slot = dur / lines.length;
  const i = Math.min(lines.length - 1, Math.floor(t / slot));
  const lt = t - i * slot;
  const parts = lines[i].split("*");
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 1500, textAlign: "center" }}>
      <div style={{ display: "inline-block", transform: `scale(${lerp(0.75, 1, easeOutBack(lt / 0.28))})`, opacity: clamp01(lt / 0.12), fontFamily: "Kanit", fontWeight: 800, fontSize: 70, lineHeight: 1.22, color: "#fff", textShadow: outline }}>
        {parts.map((s, k) => (
          <span key={k} style={{ color: k % 2 ? "#ffd84a" : "#fff" }}>{s}</span>
        ))}
      </div>
    </div>
  );
};
const Card: React.FC<{ card: NonNullable<ShotScript["card"]>; t: number }> = ({ card, t }) => (
  <div style={{ position: "absolute", left: 80, top: 150, transform: `translateX(${lerp(-80, 0, easeOutBack(t / 0.35))}px)`, opacity: clamp01(t / 0.15), fontFamily: "Kanit", background: "#1d2a44", borderRadius: 30, padding: "16px 34px 22px", boxShadow: "0 10px 0 rgba(0,0,0,.2)", borderLeft: "14px solid #ffd84a" }}>
    <div style={{ color: "#cfd8ea", fontWeight: 500, fontSize: 44, lineHeight: 1.1 }}>{card.title}</div>
    <div style={{ color: "#fff", fontWeight: 800, fontSize: 92, lineHeight: 1.05 }}>
      {Math.round(card.value * easeOut((t - 0.25) / 1.1)).toLocaleString("en-US")}
      {card.unit ? <span style={{ fontSize: 48, fontWeight: 700, marginLeft: 14, color: "#ffd84a" }}>{card.unit}</span> : null}
    </div>
  </div>
);

// ---------- the reader ----------
export const Clip: React.FC<{ script: ClipScript }> = ({ script }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  let start = 0;
  let idx = 0;
  for (let i = 0; i < script.shots.length; i++) {
    const n = Math.round(script.shots[i].dur * FPS);
    if (frame < start + n || i === script.shots.length - 1) { idx = i; break; }
    start += n;
  }
  const shot = script.shots[idx];
  const lf = frame - start;
  const t = lf / FPS;
  const dark = SETS[shot.set].dark;

  const people: Record<string, PersonSpec> = {};
  for (const [name, c] of Object.entries(script.cast)) people[name] = makePerson(c.seed, c);

  const states = shot.actors.map((cue) => ({ cue, spec: people[cue.who], ...cueState(cue, people[cue.who], t, shot.dur) }));
  // lying is drawn inside the actor's face-flipped group, so turn headDir into that frame
  const lieOf = (s: (typeof states)[number]) => ({ on: s.cue.lieOn ?? 0, dir: ((s.cue.headDir ?? 1) * s.face) as 1 | -1 });
  // close-ups look at the head: follow it down when the actor sits or lies (unchanged for standing poses)
  // ...and sideways to the head of a lying actor
  const headSide = (s: (typeof states)[number]) => (!s.walk && s.pose.lie > 0 ? s.face * headCenter(s.spec, s.pose, lieOf(s)).x : 0);
  const headDrop = (s: (typeof states)[number]) => (s.walk ? 0 : headCenter(s.spec, POSES.stand).y - headCenter(s.spec, s.pose, lieOf(s)).y);
  // focus: a point, one actor, or "a+b" for the middle of several actors
  const names = typeof shot.focus === "string" ? shot.focus.split("+") : [];
  const focused = states.filter((s) => names.includes(s.cue.who));
  const focus: V3 = focused.length
    ? [
        focused.reduce((n, s) => n + s.pos[0], 0) / focused.length + (shot.cam === "close" ? headSide(focused[0]) : 0),
        shot.cam === "close" ? (focused[0].spec.h / 100) * 0.87 - headDrop(focused[0]) : 0,
        focused.reduce((n, s) => n + s.pos[2], 0) / focused.length,
      ]
    : typeof shot.focus === "string" ? [0, 0, 0] : shot.focus;
  const { cam, blur } = camPreset(shot.cam, focus, t / shot.dur, rng(script.seed * 131 + idx * 17), shot.set);
  const cam3 = buildCam(cam, width / height);

  const placed = states
    .map((s) => ({ s, pr: project(cam3, s.pos, width, height) }))
    .sort((a, b) => b.pr.depth - a.pr.depth);
  const punch = 1 + 0.045 * (1 - easeOut(lf / 7));

  // ---- per-shot effects ----
  const headOf = (who: string) => {
    const hit = placed.find((q) => q.s.cue.who === who);
    if (!hit) return null;
    const { s, pr } = hit;
    const hc = s.walk ? headCenterSide(s.spec, GAITS[s.walk.gait]) : headCenter(s.spec, s.pose, lieOf(s));
    return { x: pr.x + s.face * hc.x * pr.ppu, y: pr.y - (s.lift * pr.ppu) / 100 - hc.y * pr.ppu, ppu: pr.ppu, world: [s.pos[0], hc.y, s.pos[2]] as V3 };
  };
  const fx = shot.fx ?? [];
  const asker = shot.say ?? (names[0] && states.some((s) => s.cue.who === names[0]) ? names[0] : shot.actors[0]?.who);
  const behind = fx.map((f, i) => {
    if (f.kind !== "question" || !asker) return null;
    const h = headOf(asker);
    return h ? <QuestionFx key={i} head={h} ppu={h.ppu} t={t} width={width} height={height} /> : null;
  });
  const over = fx.map((f, i) => {
    if (f.kind === "beam") {
      const h = f.through ? headOf(f.through) : null;
      const y = h ? h.world[1] : f.y ?? BEAM_DEFAULT.y;
      const z = h ? h.world[2] : f.z ?? BEAM_DEFAULT.z;
      return <BeamFx key={i} cam3={cam3} width={width} height={height} t={t} frame={frame} y={y} z={z} x0={h ? h.world[0] : focus[0]} head={h ?? undefined} from={f.from} strength={f.strength} />;
    }
    if (f.kind === "sparks") return <SparksFx key={i} cam3={cam3} width={width} height={height} frame={frame} at={f.at} />;
    return null;
  });

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${punch})` }}>
        <SetStage set={shot.set} cam={cam} cam3={cam3} width={width} height={height} frame={frame} blur={blur} seed={script.seed} time={shot.time} blobs={dark ? [] : states.map((s) => ({ x: s.pos[0], z: s.pos[2], r: 0.32 }))} behind={behind}>
          {placed.map(({ s, pr }, i) => (
            <g key={i} transform={`translate(${pr.x} ${pr.y - (s.lift * pr.ppu) / 100}) scale(${(pr.ppu / 100) * s.face} ${pr.ppu / 100})`}>
              {s.walk ? (
                <PersonSide spec={s.spec} gait={GAITS[s.walk.gait]} phase={s.walk.phase} feel={s.feel} t={frame / FPS} blink={(frame + s.spec.seed * 11) % 96 < 4} />
              ) : (
                <>
                  {s.cue.stool ? <g transform={`translate(0 ${s.lift})`}><Stool /></g> : null}
                  {React.createElement(s.cue.view === "back" ? PersonBack : Person, {
                    spec: s.spec,
                    pose: s.pose,
                    feel: s.feel,
                    t: frame / FPS,
                    blink: (frame + s.spec.seed * 11) % 96 < 4,
                    mouth: shot.say === s.cue.who ? TALK[Math.floor(frame / 3 + s.spec.seed) % TALK.length] : undefined,
                    eyes: s.cue.eyes ?? (s.pose.lie > 0.5 ? "closed" : undefined),
                    lieOn: lieOf(s).on,
                    headDir: lieOf(s).dir,
                  })}
                </>
              )}
            </g>
          ))}
        </SetStage>
        {over}
      </AbsoluteFill>
      {fx.map((f, i) => (f.kind === "flash" ? <FlashFx key={i} t={t} at={f.at} /> : null))}
      {shot.caption?.length ? <AbsoluteFill style={{ background: "linear-gradient(rgba(0,0,0,0) 62%, rgba(0,0,0,0.38) 80%, rgba(0,0,0,0.08) 96%)" }} /> : null}
      {shot.card ? <Card card={shot.card} t={t} /> : null}
      {shot.caption?.length ? <Caption lines={shot.caption} t={t} dur={shot.dur} /> : null}
      {script.audio ? <Audio src={staticFile(`audio/${script.audio}`)} /> : null}
    </AbsoluteFill>
  );
};
