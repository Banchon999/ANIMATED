import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { project, rng, V3 } from "./lib";

// Time of day, shared by every set. Outdoor sets take the sky, sun (or moon), hemisphere, fog and grade
// straight from the kit; indoor sets keep their own tuned lights at their default time and use the kit for
// the view through the window, the light coming in, and whether the practical lamps are on.

export type TimeOfDay = "morning" | "day" | "evening" | "night";
export const TIMES: readonly TimeOfDay[] = ["morning", "day", "evening", "night"];
export const TIME_LABEL: Record<TimeOfDay, string> = { morning: "เช้า", day: "กลางวัน", evening: "เย็น", night: "กลางคืน" };

export type Kit = {
  bg: string; // flat colour behind everything
  sky: string; // CSS gradient of the sky backdrop
  skyCols: [string, string, string]; // zenith, middle, horizon: for window views and water drawn on canvases
  body: { x: number; y: number; size: number; color: string; glow: string } | null; // sun / moon disc (fractions of the frame)
  stars: number;
  sun: { dir: V3; color: string; intensity: number }; // directional light; dir points from the origin towards it
  hemi: { sky: string; ground: string; intensity: number };
  ambient: { color: string; intensity: number };
  fog: { color: string; near: number; far: number };
  lamps: number; // practical lamps: 0 off .. 1 on
  litWindows: number; // share of windows lit from inside
  grade: string | null; // colour laid over the picture with "multiply"
  wash: string | null; // colour laid over the picture normally
  vignette: string; // edge darkening colour
  actor?: string; // CSS filter for the 2D actors
};

export const KITS: Record<TimeOfDay, Kit> = {
  // "day" is the village light the kit started with: keep it exactly so old clips do not change
  day: {
    bg: "#d9ecf2",
    sky: "linear-gradient(#63b1e6 0%, #a9d8f0 30%, #d9ecf2 52%)",
    skyCols: ["#63b1e6", "#a9d8f0", "#d9ecf2"],
    body: { x: 855 / 1080, y: 285 / 1920, size: 150 / 1080, color: "#fff6cf", glow: "0 0 90px 50px rgba(255,246,207,.55)" },
    stars: 0,
    sun: { dir: [-17, 21, 9], color: "#fff3d6", intensity: 2.1 },
    hemi: { sky: "#eaf6ff", ground: "#b9a37a", intensity: 1.25 },
    ambient: { color: "#ffffff", intensity: 0 },
    fog: { color: "#d9ecf2", near: 30, far: 95 },
    lamps: 0,
    litWindows: 0,
    grade: null,
    wash: null,
    vignette: "rgba(20,16,10,.38)",
  },
  morning: {
    bg: "#f2dcc4",
    sky: "linear-gradient(#78a6d6 0%, #bfd2e2 30%, #f5d9bc 52%)",
    skyCols: ["#78a6d6", "#c4d4e2", "#f5d9bc"],
    body: { x: 0.2, y: 0.3, size: 0.12, color: "#fff2d6", glow: "0 0 110px 64px rgba(255,214,168,.6)" },
    stars: 0,
    sun: { dir: [-20, 9, 12], color: "#ffd7a8", intensity: 2.0 },
    hemi: { sky: "#dce6f0", ground: "#a8906c", intensity: 1.15 },
    ambient: { color: "#ffffff", intensity: 0 },
    fog: { color: "#efdcc8", near: 26, far: 90 },
    lamps: 0,
    litWindows: 0,
    grade: null,
    wash: "rgba(255,196,150,0.06)",
    vignette: "rgba(40,26,14,.32)",
  },
  evening: {
    bg: "#e9a06c",
    sky: "linear-gradient(#3a4682 0%, #b46a86 30%, #f2a35e 52%)",
    skyCols: ["#3a4682", "#c0708a", "#f2a35e"],
    body: { x: 0.78, y: 0.34, size: 0.15, color: "#ffd690", glow: "0 0 120px 70px rgba(255,150,70,.55)" },
    stars: 0,
    sun: { dir: [21, 7, 11], color: "#ffaa70", intensity: 1.5 },
    hemi: { sky: "#d8b0a0", ground: "#6a5060", intensity: 1.0 },
    ambient: { color: "#ffb88a", intensity: 0.2 },
    fog: { color: "#dc9c7c", near: 24, far: 88 },
    lamps: 1,
    litWindows: 0.45,
    grade: null,
    wash: "rgba(255,130,70,0.07)",
    vignette: "rgba(46,18,24,.44)",
    actor: "sepia(0.12) saturate(1.05)",
  },
  night: {
    bg: "#0b1430",
    sky: "linear-gradient(#050a1c 0%, #0f1b3e 30%, #24365f 52%)",
    skyCols: ["#050a1c", "#13224a", "#2a3d6a"],
    body: { x: 0.24, y: 0.12, size: 0.085, color: "#eef2ff", glow: "0 0 60px 34px rgba(190,210,255,.35)" },
    stars: 80,
    sun: { dir: [-9, 20, 12], color: "#9fb8ff", intensity: 1.3 },
    hemi: { sky: "#5468a8", ground: "#2a2834", intensity: 1.05 },
    ambient: { color: "#7484b8", intensity: 0.55 },
    fog: { color: "#17223f", near: 20, far: 75 },
    lamps: 1,
    litWindows: 0.6,
    grade: "rgba(150,165,215,1)",
    wash: null,
    vignette: "rgba(2,4,14,.62)",
    actor: "brightness(0.9) saturate(0.78)",
  },
};
export const kitOf = (t: TimeOfDay) => KITS[t];

/** Sun or moon: a directional light placed so its direction passes through the origin. */
export const SunLight: React.FC<{ kit: Kit; dist?: number; box?: number; far?: number; map?: number; bias?: number; mul?: number; shadows?: boolean }> = ({
  kit, dist, box = 30, far = 80, map = 2048, bias = -0.0006, mul = 1, shadows = true,
}) => {
  const d = new THREE.Vector3(...kit.sun.dir);
  if (dist) d.setLength(dist);
  return (
    <directionalLight
      position={[d.x, d.y, d.z]}
      intensity={kit.sun.intensity * mul}
      color={kit.sun.color}
      castShadow={shadows}
      shadow-mapSize-width={map}
      shadow-mapSize-height={map}
      shadow-camera-left={-box}
      shadow-camera-right={box}
      shadow-camera-top={box}
      shadow-camera-bottom={-box}
      shadow-camera-near={1}
      shadow-camera-far={far}
      shadow-bias={bias}
    />
  );
};

/** Hemisphere + ambient + sun + fog of an outdoor set. */
export const SkyLights: React.FC<{ kit: Kit; box?: number; far?: number; fogMul?: number }> = ({ kit, box, far, fogMul = 1 }) => (
  <>
    <hemisphereLight args={[kit.hemi.sky, kit.hemi.ground, kit.hemi.intensity]} />
    {kit.ambient.intensity > 0 ? <ambientLight color={kit.ambient.color} intensity={kit.ambient.intensity} /> : null}
    <SunLight kit={kit} box={box} far={far} />
    <fog attach="fog" args={[kit.fog.color, kit.fog.near * fogMul, kit.fog.far * fogMul]} />
  </>
);

/** 2D sky behind the 3D canvas: gradient, sun or moon, stars. */
export const SkyBack: React.FC<{ kit: Kit; width: number; height: number; seed?: number }> = ({ kit, width, height, seed = 7 }) => {
  const stars = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: kit.stars }).map(() => ({ x: r() * width, y: r() * height * 0.45, s: 1 + r() * 2.2, a: 0.3 + r() * 0.6 }));
  }, [kit.stars, width, height, seed]);
  const b = kit.body;
  const k = width / 1080;
  const size = b ? b.size * width : 0;
  const glow = b ? b.glow.replace(/(\d+)px/g, (_, n) => `${Number(n) * k}px`) : "";
  return (
    <>
      <AbsoluteFill style={{ background: kit.sky }} />
      {stars.length ? (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          {stars.map((s, i) => <rect key={i} x={s.x} y={s.y} width={s.s * k} height={s.s * k} fill="#dfe6ff" opacity={s.a} />)}
        </svg>
      ) : null}
      {b ? <div style={{ position: "absolute", left: b.x * width - size / 2, top: b.y * height - size / 2, width: size, height: size, borderRadius: "50%", background: b.color, boxShadow: glow }} /> : null}
    </>
  );
};

/** Colour grade over the finished picture (after the actors). */
export const Grade: React.FC<{ kit: Kit; centre?: string; clear?: number }> = ({ kit, centre = "50% 45%", clear = 55 }) => (
  <>
    {kit.grade ? <AbsoluteFill style={{ background: kit.grade, mixBlendMode: "multiply" }} /> : null}
    {kit.wash ? <AbsoluteFill style={{ background: kit.wash }} /> : null}
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${centre}, rgba(0,0,0,0) ${clear}%, ${kit.vignette} 100%)` }} />
  </>
);

/** Soft round glow at a world point; radius and strength are capped so close cameras are not flooded. */
export const Glow: React.FC<{ cam3: THREE.PerspectiveCamera; width: number; height: number; p: V3; radius: number; strength: number; rgb: string; maxR?: number }> = ({ cam3, width, height, p, radius, strength, rgb, maxR = 260 }) => {
  const pr = project(cam3, p, width, height);
  if (pr.depth < 0.3 || strength <= 0) return null;
  const R = Math.min(radius * pr.ppu, maxR * (height / 1920));
  const s = strength * Math.min(1, 300 / Math.max(pr.ppu, 1));
  if (pr.x < -R || pr.x > width + R || pr.y < -R || pr.y > height + R) return null;
  return (
    <div
      style={{
        position: "absolute", left: pr.x - R, top: pr.y - R, width: R * 2, height: R * 2, borderRadius: "50%", mixBlendMode: "screen",
        background: `radial-gradient(circle, rgba(${rgb},${0.7 * s}) 0%, rgba(${rgb},${0.22 * s}) 30%, rgba(${rgb},0) 68%)`,
      }}
    />
  );
};

/** Window view drawn on a canvas: sky gradient of the kit, sun / moon, stars. Callers paint the scenery on top. */
export const paintSky = (c: CanvasRenderingContext2D, w: number, h: number, kit: Kit, seed = 3) => {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, kit.skyCols[0]);
  g.addColorStop(0.55, kit.skyCols[1]);
  g.addColorStop(1, kit.skyCols[2]);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < kit.stars * 0.6; i++) {
    c.fillStyle = `rgba(220,230,255,${0.3 + r() * 0.6})`;
    c.fillRect(r() * w, r() * h * 0.5, 1.5 + r() * 1.5, 1.5 + r() * 1.5);
  }
};

/** Pick a warm or cool lit-window colour, or the dark glass colour, from a seeded value. */
export const windowColour = (kit: Kit, v: number, dark = "#3b4a55") =>
  v < kit.litWindows ? (v < kit.litWindows * 0.25 ? "#d8e6ff" : "#ffd387") : dark;

/**
 * Indoor sets keep their own lights at their default time ("day" for clinic and accelerator); other times
 * scale them: amb = ambient + hemisphere, sun = light through the windows (colour and strength), lamp = practicals.
 */
export const INDOOR: Record<TimeOfDay, { amb: number; sun: number; sunColor: string | null; lamp: number }> = {
  day: { amb: 1, sun: 1, sunColor: null, lamp: 0 },
  morning: { amb: 0.88, sun: 1.15, sunColor: "#ffd8ae", lamp: 0 },
  evening: { amb: 0.6, sun: 0.85, sunColor: "#ffa466", lamp: 1 },
  night: { amb: 0.34, sun: 0.3, sunColor: "#9fb8ff", lamp: 1 },
};
