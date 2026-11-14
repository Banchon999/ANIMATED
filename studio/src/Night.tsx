import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraRig } from "./Village";
import { NightRoom, ROOM } from "./NightRoom";
import { Kneeler, SleeperHead, Spirit } from "./Tall";
import { buildCam, Cam, clamp01, easeInOut, ensureFonts, lerp, lerp3, project, rng, V3 } from "./lib";

ensureFonts();
export const NIGHT_TOTAL = 360;
const FPS = 30;
const CUTS = [0, 135, 255, NIGHT_TOTAL];
const LINES = [
  ["คืนนั้นเดือนหงาย", "ทั้งเรือนเงียบผิดปกติ"],
  ["ใต้ลำแสงจันทร์", "มีใครบางคนยืนอยู่ข้างเตียง"],
  ["แล้วเธอก็ค่อย ๆ", "ลืมตาขึ้น"],
];
const GHOST: V3 = [-0.68, 0, 2.3];
const MAN: V3 = [-0.95, 0, 2.95];

const camFor = (idx: number, lf: number, dur: number): Cam => {
  const p = easeInOut(lf / dur);
  if (idx === 0) return { pos: lerp3([-0.2, 1.9, 10.6], [0.25, 1.8, 9.6], p), target: lerp3([0.25, 1.15, 0], [0.3, 1.1, 0], p), fov: 48 };
  if (idx === 1) return { pos: lerp3([0.5, 1.75, 8.7], [0.1, 1.6, 7.3], p), target: [0.0, 1.15, 1.0], fov: 46 };
  return { pos: lerp3([GHOST[0] + 0.5, 1.6, GHOST[2] + 2.9], [GHOST[0] + 0.2, 1.54, GHOST[2] + 2.15], p), target: [GHOST[0], 1.44, GHOST[2]], fov: 30 };
};

export const Night: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const idx = frame < CUTS[1] ? 0 : frame < CUTS[2] ? 1 : 2;
  const lf = frame - CUTS[idx];
  const dur = CUTS[idx + 1] - CUTS[idx];
  const t = frame / FPS;
  const cam = camFor(idx, lf, dur);
  const cam3 = buildCam(cam, width / height);
  const P = (p: V3) => project(cam3, p, width, height);

  let flicker = 0.86 + 0.08 * Math.sin(frame * 0.9) + 0.06 * Math.sin(frame * 2.3 + 1);
  if (idx === 2) flicker *= 1 - 0.7 * Math.max(0, 1 - Math.abs(lf - 56) / 9);
  const ghostAlpha = idx === 0 ? 0 : idx === 1 ? easeInOut((lf - 14) / 44) : 1;
  const eyes = idx === 2 ? easeInOut((lf - 60) / 16) : 0;

  const sleeper = P(ROOM.sleeperHead);
  const ghost = P(GHOST);
  const man = P(MAN);
  const lan = P([ROOM.lantern[0], 0.25, ROOM.lantern[2]]);
  const can = P([ROOM.candles[0], 0.2, ROOM.candles[2]]);

  // moonlight shafts, projected from the 3D room
  const w = ROOM.window;
  const shafts = [
    [-0.62, 0.1, 0.15], [-0.42, 0.06, 0.1], [-0.2, 0.13, 0.17], [0.02, 0.05, 0.09], [0.2, 0.1, 0.14], [0.42, 0.07, 0.11], [0.56, 0.05, 0.08],
  ].map(([o, wd, a], i) => {
    const top = w.y + 0.55;
    const k = 0.75;
    const a1 = P([w.x + o * k, top, 0.12]);
    const a2 = P([w.x + (o + wd) * k, top, 0.12]);
    const b2 = P([w.x + (o * 1.5 + wd * 2.2) * k + 0.95, 0, 2.9]);
    const b1 = P([w.x + o * 1.5 * k + 0.95, 0, 2.9]);
    return { i, a1, a2, b1, b2, a: 1.7 * a * (0.85 + 0.15 * Math.sin(t * 0.8 + i * 1.7)) };
  });

  const dust = useMemo(() => {
    const r = rng(99);
    return Array.from({ length: 90 }).map(() => ({ x: -1.8 + r() * 3.6, y: 0.15 + r() * 2.5, z: 0.4 + r() * 4.6, ph: r() * 6.28, s: 0.6 + r() * 1.2, sp: 0.02 + r() * 0.05 }));
  }, []);

  const figure = (pr: ReturnType<typeof P>, node: React.ReactNode) => (
    <g transform={`translate(${pr.x} ${pr.y}) scale(${pr.ppu / 100})`}>{node}</g>
  );
  const glow = (pr: ReturnType<typeof P>, radius: number, strength: number) => {
    const R = radius * pr.ppu;
    return (
      <div
        style={{
          position: "absolute",
          left: pr.x - R,
          top: pr.y - R,
          width: R * 2,
          height: R * 2,
          borderRadius: "50%",
          mixBlendMode: "screen",
          background: `radial-gradient(circle, rgba(255,186,96,${0.62 * strength}) 0%, rgba(255,150,60,${0.26 * strength}) 28%, rgba(255,130,40,${0.08 * strength}) 52%, rgba(255,130,40,0) 70%)`,
        }}
      />
    );
  };
  const full: React.CSSProperties = { position: "absolute", inset: 0, overflow: "visible" };

  return (
    <AbsoluteFill style={{ background: "#0b0705", overflow: "hidden" }}>
      <AbsoluteFill>
        <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}>
          <CameraRig cam={cam} />
          <NightRoom layer="back" flicker={flicker} moon={1} />
        </ThreeCanvas>
      </AbsoluteFill>
      <svg width={width} height={height} style={full}>
        {figure(sleeper, <SleeperHead t={t} />)}
      </svg>
      <AbsoluteFill>
        <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}>
          <CameraRig cam={cam} />
          <NightRoom layer="front" flicker={flicker} moon={1} />
        </ThreeCanvas>
      </AbsoluteFill>

      {/* cool night grade over the set, under the lights */}
      <AbsoluteFill style={{ background: "rgba(60,52,80,0.12)", mixBlendMode: "multiply" }} />

      <svg width={width} height={height} style={full}>
        {ghostAlpha > 0.01 && figure(ghost, <Spirit t={t} open={eyes} alpha={ghostAlpha} />)}
        {figure(man, <Kneeler t={t} warm={flicker} />)}
      </svg>

      {/* moon shafts */}
      <svg width={width} height={height} style={{ ...full, mixBlendMode: "screen", filter: "blur(5px)" }}>
        {shafts.map((s) => (
          <g key={s.i}>
            <linearGradient id={`sh${s.i}`} gradientUnits="userSpaceOnUse" x1={(s.a1.x + s.a2.x) / 2} y1={s.a1.y} x2={(s.b1.x + s.b2.x) / 2} y2={s.b1.y}>
              <stop offset="0" stopColor="#bcd0ff" stopOpacity={0} />
              <stop offset="0.1" stopColor="#bcd0ff" stopOpacity={s.a} />
              <stop offset="0.62" stopColor="#a9c2ff" stopOpacity={s.a * 0.5} />
              <stop offset="1" stopColor="#a9c2ff" stopOpacity={0} />
            </linearGradient>
            <polygon points={`${s.a1.x},${s.a1.y} ${s.a2.x},${s.a2.y} ${s.b2.x},${s.b2.y} ${s.b1.x},${s.b1.y}`} fill={`url(#sh${s.i})`} />
          </g>
        ))}
      </svg>

      {/* warm pools of light */}
      {glow(lan, 1.05, flicker * (idx === 2 ? 0.3 : 1))}
      {glow(can, 0.8, (0.55 + 0.45 * flicker) * (idx === 2 ? 0.3 : 1))}

      {/* drifting dust */}
      <svg width={width} height={height} style={{ ...full, mixBlendMode: "screen" }}>
        {dust.map((d, i) => {
          const pr = P([d.x + Math.sin(t * 0.35 + d.ph) * 0.18, ((d.y + t * d.sp) % 2.6) + 0.1, d.z + Math.cos(t * 0.27 + d.ph) * 0.15]);
          if (pr.depth < 0.4) return null;
          const r = Math.max(1.2, Math.min(7, 0.011 * d.s * pr.ppu));
          return <circle key={i} cx={pr.x} cy={pr.y} r={r} fill="#e6edff" opacity={(0.16 + 0.3 * Math.abs(Math.sin(t * 0.9 + d.ph))) * (r > 5 ? 0.5 : 1)} />;
        })}
      </svg>

      {/* haze + vignette */}
      <AbsoluteFill style={{ background: "rgba(176,156,146,0.15)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 78% 62% at 50% 46%, rgba(0,0,0,0) 42%, rgba(6,4,3,0.62) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(rgba(0,0,0,0) 62%, rgba(0,0,0,0.42) 79%, rgba(0,0,0,0.1) 96%)" }} />

      {/* cut fade */}
      <AbsoluteFill style={{ background: "#000", opacity: Math.max(1 - clamp01(lf / 8), frame > NIGHT_TOTAL - 12 ? clamp01((frame - (NIGHT_TOTAL - 12)) / 12) : 0) }} />

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1470,
          textAlign: "center",
          fontFamily: "Kanit",
          fontWeight: 700,
          fontSize: 64,
          lineHeight: 1.28,
          color: "#fff",
          textShadow: "0 3px 10px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.9)",
          opacity: clamp01((lf - 6) / 8),
        }}
      >
        <div>{LINES[idx][0]}</div>
        <div style={{ opacity: clamp01((lf - 30) / 8), transform: `translateY(${lerp(10, 0, clamp01((lf - 30) / 8))}px)` }}>{LINES[idx][1]}</div>
      </div>
    </AbsoluteFill>
  );
};
