import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FeelName, GaitName, makePerson, mixPose, Mouth, Person, PersonSide, PersonSpec, Pose, PoseName, POSES, strideOf, Age, Era } from "./People";
import { GAITS } from "./Character";
import { SetName, SETS, SetStage } from "./Sets";
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
};
export type ClipScript = {
  id: string;
  seed: number;
  cast: Record<string, { seed: number; age?: Age; female?: boolean; era?: Era }>;
  shots: ShotScript[];
};
const FPS = 30;
export const clipFrames = (c: ClipScript) => c.shots.reduce((n, s) => n + Math.round(s.dur * FPS), 0);

/** Fail early, with a readable message, when a script names something the kit does not have. */
export const validateClip = (c: ClipScript) => {
  const bad = (msg: string) => { throw new Error(`clips/${c.id}.json: ${msg}`); };
  c.shots.forEach((s, i) => {
    const at = `shot ${i + 1}`;
    if (!(s.set in SETS)) bad(`${at}: unknown set "${s.set}" (have: ${Object.keys(SETS).join(", ")})`);
    if (!["high", "wide", "mid", "close"].includes(s.cam)) bad(`${at}: unknown cam "${s.cam}"`);
    if (!(s.dur > 0)) bad(`${at}: dur must be a positive number of seconds`);
    const names = s.actors.map((a) => a.who);
    s.actors.forEach((a) => {
      if (!(a.who in c.cast)) bad(`${at}: actor "${a.who}" is not in cast`);
      for (const p of [a.pose, ...(a.then ?? []).map((x) => x.pose)]) if (p && !(p in POSES)) bad(`${at}: unknown pose "${p}" (have: ${Object.keys(POSES).join(", ")})`);
      if (a.gait && !(a.gait in GAITS)) bad(`${at}: unknown gait "${a.gait}" (have: ${Object.keys(GAITS).join(", ")})`);
    });
    if (typeof s.focus === "string") for (const n of s.focus.split("+")) if (!names.includes(n)) bad(`${at}: focus "${n}" is not an actor in this shot`);
    if (s.say && !names.includes(s.say)) bad(`${at}: say "${s.say}" is not an actor in this shot`);
    const xs = s.actors.filter((a) => !a.walkTo).map((a) => a.at[0]);
    const span = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
    const limit = s.cam === "close" ? 0.6 : s.cam === "mid" ? 1.4 : 3.6;
    if (s.cam !== "high" && span > limit) bad(`${at}: actors stand ${span.toFixed(1)} m apart but a "${s.cam}" shot only fits ${limit} m`);
  });
  return c;
};

// ---------- camera presets: framing relative to the focus point, varied per shot by seed ----------
const camPreset = (kind: CamKind, f: V3, p: number, r: () => number, dark: boolean): { cam: Cam; blur: number } => {
  const sx = (r() - 0.5) * 2; // -1..1, which side the camera drifts from
  const e = easeInOut(p);
  const at = (dx: number, y: number, dz: number, ty: number, fov: number, blur = 0) => ({
    cam: { pos: [f[0] + dx, y, f[2] + dz] as V3, target: [f[0], ty, f[2]] as V3, fov },
    blur,
  });
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
  // focus: a point, one actor, or "a+b" for the middle of several actors
  const names = typeof shot.focus === "string" ? shot.focus.split("+") : [];
  const focused = states.filter((s) => names.includes(s.cue.who));
  const focus: V3 = focused.length
    ? [
        focused.reduce((n, s) => n + s.pos[0], 0) / focused.length,
        shot.cam === "close" ? (focused[0].spec.h / 100) * 0.87 : 0,
        focused.reduce((n, s) => n + s.pos[2], 0) / focused.length,
      ]
    : typeof shot.focus === "string" ? [0, 0, 0] : shot.focus;
  const { cam, blur } = camPreset(shot.cam, focus, t / shot.dur, rng(script.seed * 131 + idx * 17), dark);
  const cam3 = buildCam(cam, width / height);

  const placed = states
    .map((s) => ({ s, pr: project(cam3, s.pos, width, height) }))
    .sort((a, b) => b.pr.depth - a.pr.depth);
  const punch = 1 + 0.045 * (1 - easeOut(lf / 7));

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${punch})` }}>
        <SetStage set={shot.set} cam={cam} cam3={cam3} width={width} height={height} frame={frame} blur={blur} seed={script.seed} blobs={dark ? [] : states.map((s) => ({ x: s.pos[0], z: s.pos[2], r: 0.32 }))}>
          {placed.map(({ s, pr }, i) => (
            <g key={i} transform={`translate(${pr.x} ${pr.y - (s.lift * pr.ppu) / 100}) scale(${(pr.ppu / 100) * s.face} ${pr.ppu / 100})`}>
              {s.walk ? (
                <PersonSide spec={s.spec} gait={GAITS[s.walk.gait]} phase={s.walk.phase} feel={s.feel} t={frame / FPS} blink={(frame + s.spec.seed * 11) % 96 < 4} />
              ) : (
                <Person
                  spec={s.spec}
                  pose={s.pose}
                  feel={s.feel}
                  t={frame / FPS}
                  blink={(frame + s.spec.seed * 11) % 96 < 4}
                  mouth={shot.say === s.cue.who ? TALK[Math.floor(frame / 3 + s.spec.seed) % TALK.length] : undefined}
                />
              )}
            </g>
          ))}
        </SetStage>
      </AbsoluteFill>
      {shot.caption?.length ? <AbsoluteFill style={{ background: "linear-gradient(rgba(0,0,0,0) 62%, rgba(0,0,0,0.38) 80%, rgba(0,0,0,0.08) 96%)" }} /> : null}
      {shot.card ? <Card card={shot.card} t={t} /> : null}
      {shot.caption?.length ? <Caption lines={shot.caption} t={t} dur={shot.dur} /> : null}
    </AbsoluteFill>
  );
};
