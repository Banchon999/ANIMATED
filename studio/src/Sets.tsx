import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Blob, CameraRig, Village } from "./Village";
import { NightRoom, ROOM, ROOM_LIGHT } from "./NightRoom";
import { Accelerator, ACCEL } from "./Accelerator";
import { Clinic, CLINIC } from "./Clinic";
import { Temple, TEMPLE } from "./Temple";
import { Market, MARKET } from "./Market";
import { Ricefield, salaLamp } from "./Ricefield";
import { Cityroom, CITYROOM } from "./Cityroom";
import { Glow, Grade, INDOOR, KITS, SkyBack, TimeOfDay } from "./Light";
import { Cam, project, rng, V3 } from "./lib";

// Set kit: every set draws its 3D layers, takes the 2D actors as children, then adds its own light effects.
// "time" is the set's default time of day; a shot may override it with ShotScript.time.
export type SetName = "village" | "room" | "accelerator" | "clinic" | "temple" | "market" | "ricefield" | "cityroom";
export const SETS: Record<SetName, { label: string; dark: boolean; time: TimeOfDay; actorFilter?: string }> = {
  village: { label: "หมู่บ้าน", dark: false, time: "day" },
  room: { label: "ห้องเรือนไม้", dark: true, time: "night", actorFilter: "brightness(0.8) saturate(0.82)" },
  accelerator: { label: "โถงเครื่องเร่งอนุภาคโซเวียต", dark: false, time: "day" },
  clinic: { label: "ห้องคนไข้โรงพยาบาลยุค 70", dark: false, time: "day" },
  temple: { label: "ลานวัด", dark: false, time: "day" },
  market: { label: "ตลาดสด", dark: false, time: "day" },
  ricefield: { label: "ทุ่งนา", dark: false, time: "day" },
  cityroom: { label: "ห้องคอนโด", dark: true, time: "night" },
};

/** CSS filter for the 2D actors of a set at a time of day (undefined = untouched). */
const actorFilter = (set: SetName, time: TimeOfDay) => {
  if (set === "room") return time === "night" ? SETS.room.actorFilter : time === "evening" ? "brightness(0.9) saturate(0.9)" : undefined;
  const indoor = set === "accelerator" || set === "clinic" || set === "cityroom";
  if (indoor) return time === "night" ? "brightness(0.88) saturate(0.85)" : time === "evening" ? "sepia(0.08)" : undefined;
  return KITS[time].actor;
};

type StageProps = {
  set: SetName;
  cam: Cam;
  cam3: THREE.PerspectiveCamera;
  width: number;
  height: number;
  frame: number;
  blur: number;
  seed: number;
  time?: TimeOfDay; // defaults to the set's own time
  blobs: Blob[];
  behind?: React.ReactNode; // HTML/SVG layers drawn over the set but under the actors
  children: React.ReactNode; // SVG content: the actors
};

type FxProps = { cam3: THREE.PerspectiveCamera; width: number; height: number; time: TimeOfDay };

const AccelFx: React.FC<FxProps> = ({ cam3, width, height, time }) => {
  const L = INDOOR[time];
  return (
    <>
      {ACCEL.lamps.map((p, i) => (
        <Glow key={i} cam3={cam3} width={width} height={height} p={[p[0], p[1] - 0.1, p[2]]} radius={0.9} strength={0.8 + 0.4 * L.lamp} rgb="255,250,225" />
      ))}
      {time === "day" ? (
        <>
          <AbsoluteFill style={{ background: "linear-gradient(rgba(200,225,215,0.10), rgba(0,0,0,0) 45%, rgba(20,40,32,0.08))" }} />
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 62% at 50% 46%, rgba(0,0,0,0) 55%, rgba(10,18,14,0.38) 100%)" }} />
        </>
      ) : (
        <IndoorGrade time={time} edge="10,18,14" />
      )}
    </>
  );
};

/** Grade for indoor sets away from their default time: warm wash in the evening, cool and darker at night. */
const IndoorGrade: React.FC<{ time: TimeOfDay; edge: string }> = ({ time, edge }) => (
  <>
    {time === "night" ? <AbsoluteFill style={{ background: "rgba(176,186,222,1)", mixBlendMode: "multiply" }} /> : null}
    {time === "evening" ? <AbsoluteFill style={{ background: "rgba(255,140,80,0.07)" }} /> : null}
    {time === "morning" ? <AbsoluteFill style={{ background: "rgba(255,205,160,0.06)" }} /> : null}
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 62% at 50% 46%, rgba(0,0,0,0) 52%, rgba(${edge},${time === "night" ? 0.55 : 0.4}) 100%)` }} />
  </>
);

const WINDOW_RGB: Record<TimeOfDay, [string, number]> = {
  day: ["235,248,255", 0.55],
  morning: ["255,226,190", 0.55],
  evening: ["255,170,110", 0.4],
  night: ["150,175,255", 0.16],
};

const ClinicFx: React.FC<FxProps> = ({ cam3, width, height, time }) => {
  const w = CLINIC.window;
  const L = INDOOR[time];
  const [rgb, k] = WINDOW_RGB[time];
  return (
    <>
      <Glow cam3={cam3} width={width} height={height} p={[w.x, w.y, 0.05]} radius={1.1} strength={k} rgb={rgb} maxR={420} />
      <Glow cam3={cam3} width={width} height={height} p={CLINIC.lamp} radius={0.55 + 0.25 * L.lamp} strength={0.6 + 0.35 * L.lamp} rgb="255,252,235" />
      {time === "day" ? (
        <>
          <AbsoluteFill style={{ background: "rgba(225,240,240,0.06)" }} />
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 82% 64% at 50% 46%, rgba(0,0,0,0) 58%, rgba(18,28,26,0.3) 100%)" }} />
        </>
      ) : (
        <IndoorGrade time={time} edge="18,28,26" />
      )}
    </>
  );
};

const CityFx: React.FC<FxProps> = ({ cam3, width, height, time }) => {
  const w = CITYROOM.window;
  const lamp = time === "night" ? 1 : time === "evening" ? 0.8 : 0;
  const [rgb, k] = WINDOW_RGB[time];
  return (
    <>
      <Glow cam3={cam3} width={width} height={height} p={[w.x, w.y, 0.05]} radius={1.1} strength={time === "night" ? 0.25 : k} rgb={time === "night" ? "255,190,140" : rgb} maxR={420} />
      <Glow cam3={cam3} width={width} height={height} p={CITYROOM.lamp} radius={0.7} strength={0.75 * lamp} rgb="255,246,226" />
      <Glow cam3={cam3} width={width} height={height} p={CITYROOM.deskLamp} radius={0.45} strength={0.7 * lamp} rgb="255,214,150" />
      <Glow cam3={cam3} width={width} height={height} p={[CITYROOM.laptop[0], CITYROOM.laptop[1] + 0.17, CITYROOM.laptop[2] - 0.1]} radius={0.3} strength={0.5 * lamp} rgb="180,205,255" />
      {time === "night" ? (
        <>
          <AbsoluteFill style={{ background: "rgba(205,200,228,1)", mixBlendMode: "multiply" }} />
          <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 62% at 50% 46%, rgba(0,0,0,0) 50%, rgba(10,10,24,0.5) 100%)" }} />
        </>
      ) : (
        <IndoorGrade time={time} edge="30,26,22" />
      )}
    </>
  );
};

/** Lamp glows of the outdoor sets: they switch on in the evening and at night. */
const OutdoorFx: React.FC<FxProps & { set: SetName; seed: number }> = ({ cam3, width, height, time, set, seed }) => {
  const on = KITS[time].lamps;
  if (!on) return null;
  const G = (p: V3, radius: number, strength: number, rgb = "255,200,120", maxR?: number) => (
    <Glow key={p.join()} cam3={cam3} width={width} height={height} p={p} radius={radius} strength={strength * on} rgb={rgb} maxR={maxR} />
  );
  if (set === "temple") return <>{[...TEMPLE.lamps.map((p) => G(p, 0.7, 0.9)), G(TEMPLE.door, 1.6, 0.35, "255,200,120", 300)]}</>;
  if (set === "market") return <>{MARKET.bulbs.map((p) => G(p, 0.55, 0.85, "255,226,160"))}</>;
  if (set === "ricefield") return <>{G(salaLamp(seed), 0.9, 0.9)}</>;
  return null;
};

const RoomFx: React.FC<Omit<StageProps, "children" | "set" | "blobs" | "seed" | "blur" | "cam" | "time"> & { flicker: number; time: TimeOfDay }> = ({ cam3, width, height, frame, flicker, time }) => {
  const RL = ROOM_LIGHT[time];
  const sun = time === "night" ? 1 : time === "evening" ? 1.1 : 1.5; // daylight shafts are stronger
  const t = frame / 30;
  const P = (p: V3) => project(cam3, p, width, height);
  const w = ROOM.window;
  const shafts = [
    [-0.62, 0.1, 0.15], [-0.42, 0.06, 0.1], [-0.2, 0.13, 0.17], [0.02, 0.05, 0.09], [0.2, 0.1, 0.14], [0.42, 0.07, 0.11], [0.56, 0.05, 0.08],
  ].map(([o, wd, a], i) => {
    const top = w.y + 0.55;
    const k = 0.75;
    return {
      i,
      a1: P([w.x + o * k, top, 0.12]),
      a2: P([w.x + (o + wd) * k, top, 0.12]),
      b2: P([w.x + (o * 1.5 + wd * 2.2) * k + 0.95, 0, 2.9]),
      b1: P([w.x + o * 1.5 * k + 0.95, 0, 2.9]),
      a: 1.7 * a * sun * (0.85 + 0.15 * Math.sin(t * 0.8 + i * 1.7)),
    };
  });
  const dust = useMemo(() => {
    const r = rng(99);
    return Array.from({ length: 90 }).map(() => ({ x: -1.8 + r() * 3.6, y: 0.15 + r() * 2.5, z: 0.4 + r() * 4.6, ph: r() * 6.28, s: 0.6 + r() * 1.2, sp: 0.02 + r() * 0.05 }));
  }, []);
  const glow = (p: V3, radius: number, strength: number) => {
    const pr = P(p);
    // cap the radius so a close camera does not flood the frame with orange
    const R = Math.min(radius * pr.ppu, 620);
    const s = strength * Math.min(1, 520 / Math.max(pr.ppu, 1));
    return (
      <div
        style={{
          position: "absolute", left: pr.x - R, top: pr.y - R, width: R * 2, height: R * 2, borderRadius: "50%", mixBlendMode: "screen",
          background: `radial-gradient(circle, rgba(255,186,96,${0.62 * s}) 0%, rgba(255,150,60,${0.26 * s}) 28%, rgba(255,130,40,${0.08 * s}) 52%, rgba(255,130,40,0) 70%)`,
        }}
      />
    );
  };
  const full: React.CSSProperties = { position: "absolute", inset: 0, overflow: "visible" };
  return (
    <>
      <svg width={width} height={height} style={{ ...full, mixBlendMode: "screen", filter: "blur(5px)" }}>
        {shafts.map((s) => (
          <g key={s.i}>
            <linearGradient id={`rsh${s.i}`} gradientUnits="userSpaceOnUse" x1={(s.a1.x + s.a2.x) / 2} y1={s.a1.y} x2={(s.b1.x + s.b2.x) / 2} y2={s.b1.y}>
              <stop offset="0" stopColor={RL.shaft} stopOpacity={0} />
              <stop offset="0.1" stopColor={RL.shaft} stopOpacity={s.a} />
              <stop offset="0.62" stopColor={time === "night" ? "#a9c2ff" : RL.shaft} stopOpacity={s.a * 0.5} />
              <stop offset="1" stopColor={time === "night" ? "#a9c2ff" : RL.shaft} stopOpacity={0} />
            </linearGradient>
            <polygon points={`${s.a1.x},${s.a1.y} ${s.a2.x},${s.a2.y} ${s.b2.x},${s.b2.y} ${s.b1.x},${s.b1.y}`} fill={`url(#rsh${s.i})`} />
          </g>
        ))}
      </svg>
      {RL.lamp > 0 ? glow([ROOM.lantern[0], 0.25, ROOM.lantern[2]], 1.05, flicker * RL.lamp) : null}
      {RL.lamp > 0 ? glow([ROOM.candles[0], 0.2, ROOM.candles[2]], 0.8, (0.55 + 0.45 * flicker) * RL.lamp) : null}
      <svg width={width} height={height} style={{ ...full, mixBlendMode: "screen" }}>
        {dust.map((d, i) => {
          const pr = P([d.x + Math.sin(t * 0.35 + d.ph) * 0.18, ((d.y + t * d.sp) % 2.6) + 0.1, d.z + Math.cos(t * 0.27 + d.ph) * 0.15]);
          if (pr.depth < 0.4) return null;
          const r = Math.max(1.2, Math.min(7, 0.011 * d.s * pr.ppu));
          return <circle key={i} cx={pr.x} cy={pr.y} r={r} fill="#e6edff" opacity={(0.16 + 0.3 * Math.abs(Math.sin(t * 0.9 + d.ph))) * (r > 5 ? 0.5 : 1)} />;
        })}
      </svg>
      <AbsoluteFill style={{ background: "rgba(176,156,146,0.15)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 78% 62% at 50% 46%, rgba(0,0,0,0) ${time === "night" ? 42 : 50}%, rgba(6,4,3,${time === "night" ? 0.62 : time === "evening" ? 0.5 : 0.4}) 100%)` }} />
    </>
  );
};

export const SetStage: React.FC<StageProps> = ({ set, cam, cam3, width, height, frame, blur, seed, time: timeIn, blobs, behind, children }) => {
  const time = timeIn ?? SETS[set].time;
  const full: React.CSSProperties = { position: "absolute", inset: 0, overflow: "visible" };
  const blurStyle = blur > 0.2 ? { filter: `blur(${blur}px)` } : undefined;
  const filter = actorFilter(set, time);
  const actors = <svg width={width} height={height} style={filter ? { ...full, filter } : full}>{children}</svg>;
  if (set === "accelerator" || set === "clinic" || set === "cityroom") {
    const acc = set === "accelerator";
    const bg = acc ? (time === "night" ? "#10161a" : "#2c3430") : set === "clinic" ? "#cfdcd4" : "#d8d4cc";
    return (
      <AbsoluteFill style={{ background: bg }}>
        <AbsoluteFill style={blurStyle}>
          <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}>
            <CameraRig cam={cam} />
            {acc ? <Accelerator blobs={blobs} time={time} /> : set === "clinic" ? <Clinic blobs={blobs} time={time} /> : <Cityroom seed={seed} time={time} blobs={blobs} />}
          </ThreeCanvas>
        </AbsoluteFill>
        {behind}
        {actors}
        {acc ? <AccelFx cam3={cam3} width={width} height={height} time={time} /> : set === "clinic" ? <ClinicFx cam3={cam3} width={width} height={height} time={time} /> : <CityFx cam3={cam3} width={width} height={height} time={time} />}
      </AbsoluteFill>
    );
  }
  if (set === "room") {
    const flicker = 0.86 + 0.08 * Math.sin(frame * 0.9) + 0.06 * Math.sin(frame * 2.3 + 1);
    return (
      <AbsoluteFill style={{ background: "#0b0705" }}>
        <AbsoluteFill style={blurStyle}>
          <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}>
            <CameraRig cam={cam} />
            <NightRoom layer="back" flicker={flicker} moon={1} time={time} />
          </ThreeCanvas>
        </AbsoluteFill>
        <AbsoluteFill style={blurStyle}>
          <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}>
            <CameraRig cam={cam} />
            <NightRoom layer="front" flicker={flicker} moon={1} time={time} />
          </ThreeCanvas>
        </AbsoluteFill>
        <AbsoluteFill style={{ background: time === "night" ? "rgba(60,52,80,0.12)" : "rgba(120,100,90,0.08)", mixBlendMode: "multiply" }} />
        {behind}
        {actors}
        <RoomFx cam3={cam3} width={width} height={height} frame={frame} flicker={flicker} time={time} />
      </AbsoluteFill>
    );
  }
  // outdoor sets: sky backdrop and sun / moon from the time kit
  const kit = KITS[time];
  return (
    <AbsoluteFill style={{ background: kit.bg }}>
      <SkyBack kit={kit} width={width} height={height} seed={seed + 1} />
      <AbsoluteFill style={blurStyle}>
        <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}>
          <CameraRig cam={cam} />
          {set === "temple" ? (
            <Temple seed={seed} kit={kit} blobs={blobs} />
          ) : set === "market" ? (
            <Market seed={seed} kit={kit} blobs={blobs} />
          ) : set === "ricefield" ? (
            <Ricefield seed={seed} kit={kit} blobs={blobs} />
          ) : (
            <Village seed={seed} kit={kit} blobs={blobs} />
          )}
        </ThreeCanvas>
      </AbsoluteFill>
      {behind}
      {actors}
      <OutdoorFx cam3={cam3} width={width} height={height} time={time} set={set} seed={seed} />
      <Grade kit={kit} />
    </AbsoluteFill>
  );
};
