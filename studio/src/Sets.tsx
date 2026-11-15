import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Blob, CameraRig, Village } from "./Village";
import { NightRoom, ROOM } from "./NightRoom";
import { Cam, project, rng, V3 } from "./lib";

// Set kit: every set draws its 3D layers, takes the 2D actors as children, then adds its own light effects.
export type SetName = "village" | "room";
export const SETS: Record<SetName, { label: string; dark: boolean; actorFilter?: string }> = {
  village: { label: "หมู่บ้านกลางวัน", dark: false },
  room: { label: "ห้องเรือนไม้กลางคืน", dark: true, actorFilter: "brightness(0.8) saturate(0.82)" },
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
  blobs: Blob[];
  children: React.ReactNode; // SVG content: the actors
};

const RoomFx: React.FC<Omit<StageProps, "children" | "set" | "blobs" | "seed" | "blur" | "cam"> & { flicker: number }> = ({ cam3, width, height, frame, flicker }) => {
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
      a: 1.7 * a * (0.85 + 0.15 * Math.sin(t * 0.8 + i * 1.7)),
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
              <stop offset="0" stopColor="#bcd0ff" stopOpacity={0} />
              <stop offset="0.1" stopColor="#bcd0ff" stopOpacity={s.a} />
              <stop offset="0.62" stopColor="#a9c2ff" stopOpacity={s.a * 0.5} />
              <stop offset="1" stopColor="#a9c2ff" stopOpacity={0} />
            </linearGradient>
            <polygon points={`${s.a1.x},${s.a1.y} ${s.a2.x},${s.a2.y} ${s.b2.x},${s.b2.y} ${s.b1.x},${s.b1.y}`} fill={`url(#rsh${s.i})`} />
          </g>
        ))}
      </svg>
      {glow([ROOM.lantern[0], 0.25, ROOM.lantern[2]], 1.05, flicker)}
      {glow([ROOM.candles[0], 0.2, ROOM.candles[2]], 0.8, 0.55 + 0.45 * flicker)}
      <svg width={width} height={height} style={{ ...full, mixBlendMode: "screen" }}>
        {dust.map((d, i) => {
          const pr = P([d.x + Math.sin(t * 0.35 + d.ph) * 0.18, ((d.y + t * d.sp) % 2.6) + 0.1, d.z + Math.cos(t * 0.27 + d.ph) * 0.15]);
          if (pr.depth < 0.4) return null;
          const r = Math.max(1.2, Math.min(7, 0.011 * d.s * pr.ppu));
          return <circle key={i} cx={pr.x} cy={pr.y} r={r} fill="#e6edff" opacity={(0.16 + 0.3 * Math.abs(Math.sin(t * 0.9 + d.ph))) * (r > 5 ? 0.5 : 1)} />;
        })}
      </svg>
      <AbsoluteFill style={{ background: "rgba(176,156,146,0.15)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 78% 62% at 50% 46%, rgba(0,0,0,0) 42%, rgba(6,4,3,0.62) 100%)" }} />
    </>
  );
};

export const SetStage: React.FC<StageProps> = ({ set, cam, cam3, width, height, frame, blur, seed, blobs, children }) => {
  const full: React.CSSProperties = { position: "absolute", inset: 0, overflow: "visible" };
  const blurStyle = blur > 0.2 ? { filter: `blur(${blur}px)` } : undefined;
  if (set === "room") {
    const flicker = 0.86 + 0.08 * Math.sin(frame * 0.9) + 0.06 * Math.sin(frame * 2.3 + 1);
    return (
      <AbsoluteFill style={{ background: "#0b0705" }}>
        <AbsoluteFill style={blurStyle}>
          <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}>
            <CameraRig cam={cam} />
            <NightRoom layer="back" flicker={flicker} moon={1} />
          </ThreeCanvas>
        </AbsoluteFill>
        <AbsoluteFill style={blurStyle}>
          <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}>
            <CameraRig cam={cam} />
            <NightRoom layer="front" flicker={flicker} moon={1} />
          </ThreeCanvas>
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "rgba(60,52,80,0.12)", mixBlendMode: "multiply" }} />
        <svg width={width} height={height} style={{ ...full, filter: SETS.room.actorFilter }}>{children}</svg>
        <RoomFx cam3={cam3} width={width} height={height} frame={frame} flicker={flicker} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: "#d9ecf2" }}>
      <AbsoluteFill style={{ background: "linear-gradient(#63b1e6 0%, #a9d8f0 30%, #d9ecf2 52%)" }} />
      <div style={{ position: "absolute", right: 150, top: 210, width: 150, height: 150, borderRadius: "50%", background: "#fff6cf", boxShadow: "0 0 90px 50px rgba(255,246,207,.55)" }} />
      <AbsoluteFill style={blurStyle}>
        <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}>
          <CameraRig cam={cam} />
          <Village seed={seed} blobs={blobs} />
        </ThreeCanvas>
      </AbsoluteFill>
      <svg width={width} height={height} style={full}>{children}</svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,16,10,.38) 100%)" }} />
    </AbsoluteFill>
  );
};
