import React, { useMemo } from "react";
import * as THREE from "three";
import { makeTex } from "./NightRoom";
import type { Blob } from "./Village";
import { rng, V3 } from "./lib";
import { KITS, paintSky, TimeOfDay } from "./Light";
import { B, Blobs, Lit, Rod, shade } from "./SetKit";

// Small Bangkok condo room, real-world scale. Back wall at z 0, room x -2.3..2.3, ceiling 2.6; floor,
// ceiling and side walls run on to z 12 so wide cameras stay inside. Along the back wall: wardrobe,
// desk with laptop under the window (city view), bed with its long side against the wall (head at +x),
// air conditioner and a poster above the bed. Door on the left wall. Paint, bedding, curtains, rug,
// poster, the city outside and small props come from the clip seed.

export const CITYROOM = {
  halfW: 2.3,
  ceiling: 2.6,
  window: { x: -0.45, y: 1.625, w: 1.5, h: 1.45 }, // sill 0.9, top 2.35
  desk: { x0: -1.15, x1: 0.15, z0: 0.02, z1: 0.62, top: 0.75 },
  laptop: [-0.5, 0.75, 0.3] as V3, // laptop screen centre is about 0.17 higher
  wardrobe: { x0: -2.28, x1: -1.38, z0: 0.02, z1: 0.62, h: 2.0 },
  bed: { x0: 0.3, x1: 2.28, z0: 0.02, z1: 1.55, top: 0.5 }, // head at x1; lying actor: at [1.3, 0.8], lieOn 0.5, headDir 1
  ac: [1.3, 2.3, 0.14] as V3,
  poster: [1.3, 1.45, 0.02] as V3,
  door: { z: 2.85, w: 0.85, h: 2.0 }, // on the left wall (x -2.3)
  lamp: [-0.2, 2.56, 2.3] as V3, // ceiling light
  deskLamp: [0.0, 1.12, 0.22] as V3,
  actorZone: { x: [-1.6, 0.4], z: [2.2, 3.6] },
};

/** Room light per time; "night" (default) is lit by the ceiling light and the city outside. */
const CITY_LIGHT: Record<TimeOfDay, { amb: string; ambI: number; hemi: [string, string, number]; sun: string; sunI: number; lamp: number }> = {
  night: { amb: "#c4bed4", ambI: 0.9, hemi: ["#c8d0f0", "#5a5048", 0.55], sun: "#8fa8ff", sunI: 0.3, lamp: 1 },
  evening: { amb: "#e6cdbb", ambI: 1.1, hemi: ["#f0c8b0", "#6a5a50", 0.7], sun: "#ffa060", sunI: 1.3, lamp: 0.8 },
  morning: { amb: "#f2e6da", ambI: 1.55, hemi: ["#e8eef8", "#8a7a68", 1.0], sun: "#ffd8a8", sunI: 1.7, lamp: 0 },
  day: { amb: "#eef0f2", ambI: 1.7, hemi: ["#f0f6ff", "#8a8070", 1.1], sun: "#f6faff", sunI: 1.5, lamp: 0 },
};

const planks = (seed: number, hue: number, light: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  const n = 8;
  const pw = 512 / n;
  for (let i = 0; i < n; i++) {
    c.fillStyle = `hsl(${hue + (r() - 0.5) * 4} 35% ${light + (r() - 0.5) * 6}%)`;
    c.fillRect(0, i * pw, 512, pw);
    for (let g = 0; g < 14; g++) {
      c.fillStyle = `rgba(90,60,30,${0.04 + r() * 0.06})`;
      c.fillRect(0, i * pw + r() * pw, 512, 1 + r() * 2);
    }
    c.fillStyle = "rgba(60,40,20,0.35)";
    c.fillRect(0, i * pw, 512, 2);
    c.fillRect(r() * 512, i * pw, 2, pw);
  }
};

const cityView = (time: TimeOfDay, seed: number) => (c: CanvasRenderingContext2D) => {
  const kit = KITS[time];
  const W = 384, H = 384;
  paintSky(c, W, H, kit, seed);
  if (time === "night" || time === "evening") {
    const g = c.createLinearGradient(0, H * 0.5, 0, H);
    g.addColorStop(0, "rgba(255,150,80,0)");
    g.addColorStop(1, time === "night" ? "rgba(255,150,80,0.35)" : "rgba(255,170,90,0.25)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  const r = rng(seed);
  const dim = time === "night" ? 0.22 : time === "evening" ? 0.55 : time === "morning" ? 0.85 : 1;
  const tone = (l: number) => `hsl(${205 + r() * 20} ${8 + r() * 10}% ${l * dim}%)`;
  // far towers, then nearer blocks; windows lit at night
  for (const layer of [0, 1]) {
    let x = -10;
    while (x < W) {
      const w = layer ? 60 + r() * 70 : 30 + r() * 50;
      const h = layer ? 120 + r() * 170 : 160 + r() * 200;
      const top = H - h;
      c.fillStyle = tone(layer ? 52 : 68);
      c.fillRect(x, top, w - 4, h);
      const lit = time === "night" ? 0.55 : time === "evening" ? 0.3 : 0;
      for (let y = top + 8; y < H - 6; y += layer ? 14 : 11)
        for (let wx = x + 5; wx < x + w - 10; wx += layer ? 12 : 9) {
          const on = r() < lit;
          c.fillStyle = on ? (r() < 0.3 ? "#d8e6ff" : "#ffd890") : `rgba(${time === "day" ? "200,220,240" : "20,30,50"},${0.35 * dim + 0.1})`;
          c.fillRect(wx, y, layer ? 7 : 5, layer ? 8 : 6);
        }
      x += w + (layer ? 4 : 10 + r() * 20);
    }
  }
};

const posterTex = (seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  const pal = [["#1f3f6a", "#f2c230", "#e85a3a"], ["#e8e0d0", "#2d7a4a", "#d8382c"], ["#2a2a2e", "#e86a8a", "#5ac8d8"], ["#f2d23a", "#1f1f22", "#e8e4dc"]][Math.floor(r() * 4)];
  c.fillStyle = pal[0];
  c.fillRect(0, 0, 128, 180);
  for (let i = 0; i < 5; i++) {
    c.fillStyle = pal[1 + (i % 2)];
    c.beginPath();
    if (r() < 0.5) c.arc(20 + r() * 88, 20 + r() * 110, 10 + r() * 28, 0, 7);
    else c.rect(r() * 90, r() * 120, 20 + r() * 40, 10 + r() * 30);
    c.fill();
  }
  c.fillStyle = pal[1];
  c.fillRect(14, 148, 100, 8);
  c.fillRect(14, 162, 60, 6);
};

export const Cityroom: React.FC<{ seed: number; time?: TimeOfDay; blobs?: Blob[] }> = ({ seed, time = "night", blobs = [] }) => {
  const C = CITYROOM;
  const W2 = C.halfW * 2;
  const D = 12;
  const LT = CITY_LIGHT[time];
  const lampOn = LT.lamp > 0;
  const L = useMemo(() => {
    const r = rng(seed * 811 + 5);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const wall = pick(["#efe9df", "#e4e8ea", "#ece2d4", "#dfe6dc", "#ebe2e6", "#e6e0d8"]);
    return {
      wall,
      back: r() < 0.4 ? pick(["#8fa8b8", "#c8a890", "#9ab09a", "#b8a0b0", "#d8c8a0"]) : wall,
      floorHue: 28 + r() * 10,
      floorL: 52 + r() * 16,
      sheet: pick(["#f2f0ea", "#c8d8e8", "#e8c8c8", "#d8e0c8", "#e8e0c8"]),
      blanket: pick(["#3f5f8a", "#8a3f4f", "#4f7a5a", "#d8a040", "#6a5a8a", "#9a9a9a"]),
      curtain: pick(["#c8c0b0", "#8a9aa8", "#b08a7a", "#7a8a6a", "#e0d8c8"]),
      rug: pick(["#7a8aa0", "#b0907a", "#8a7a6a", "#a0a888", "#c8b8a0", "#6a6a7a"]),
      wood: pick(["#d8c0a0", "#8a6a4a", "#f0ece4", "#4a3a30"]),
      fan: r() < 0.6,
      plant: r() < 0.6,
      drawers: r() < 0.5,
      mug: pick(["#d8382c", "#f0ece4", "#2f6fb0"]),
      rugX: -0.6 + (r() - 0.5) * 0.4,
    };
  }, [seed]);
  const tx = useMemo(() => {
    const floor = makeTex(512, 512, planks(seed + 2, L.floorHue, L.floorL), [W2 / 1.52, D / 1.52]);
    const poster = makeTex(128, 180, posterTex(seed + 9));
    return { floor, poster };
  }, [seed, L, W2]);
  const view = useMemo(() => makeTex(384, 384, cityView(time, seed + 17)), [time, seed]);
  const win = C.window;
  const bd = C.bed;
  const frame = "#e8e8e4";

  return (
    <>
      <ambientLight color={LT.amb} intensity={LT.ambI} />
      <hemisphereLight args={LT.hemi} />
      {/* light through the window (behind, up, left); aimed through the origin */}
      <directionalLight
        position={[-2.5, 6, -7]}
        intensity={LT.sunI}
        color={LT.sun}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.001}
      />
      <directionalLight position={[2, 4, 9]} intensity={0.35 * LT.ambI} color="#f0f0f4" />
      {lampOn ? (
        <>
          <pointLight position={[C.lamp[0], C.lamp[1] - 0.2, C.lamp[2]]} color="#fff2dc" intensity={9 * LT.lamp} distance={9} decay={1.3} />
          <pointLight position={C.deskLamp} color="#ffd8a0" intensity={2.2 * LT.lamp} distance={3.5} decay={1.6} />
        </>
      ) : null}

      {/* floor, ceiling, walls */}
      <mesh position={[0, 0, D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W2, D]} />
        <meshLambertMaterial map={tx.floor} />
      </mesh>
      <mesh position={[0, C.ceiling, D / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W2, D]} />
        <meshLambertMaterial color="#f2f2ee" />
      </mesh>
      <mesh position={[0, C.ceiling / 2, 0]} receiveShadow>
        <planeGeometry args={[W2, C.ceiling]} />
        <meshLambertMaterial color={L.back} />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * C.halfW, C.ceiling / 2, D / 2]} rotation={[0, -k * Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[D, C.ceiling]} />
          <meshLambertMaterial color={L.wall} />
        </mesh>
      ))}
      <B p={[0, 0.04, 0.01]} s={[W2, 0.08, 0.02]} c="#d8d4cc" sh={false} />
      {[-1, 1].map((k) => <B key={k} p={[k * (C.halfW - 0.01), 0.04, D / 2]} s={[0.02, 0.08, D]} c="#d8d4cc" sh={false} />)}

      {/* window with the city outside, frame and curtains */}
      <group position={[win.x, win.y, 0]}>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[win.w, win.h]} />
          <meshBasicMaterial map={view} toneMapped={false} />
        </mesh>
        <B p={[0, win.h / 2 + 0.03, 0.04]} s={[win.w + 0.1, 0.06, 0.06]} c={frame} sh={false} />
        <B p={[0, -win.h / 2 - 0.03, 0.06]} s={[win.w + 0.14, 0.06, 0.12]} c={frame} sh={false} />
        <B p={[-win.w / 2 - 0.03, 0, 0.04]} s={[0.06, win.h + 0.1, 0.06]} c={frame} sh={false} />
        <B p={[win.w / 2 + 0.03, 0, 0.04]} s={[0.06, win.h + 0.1, 0.06]} c={frame} sh={false} />
        <B p={[0.1, 0, 0.03]} s={[0.04, win.h, 0.04]} c={frame} sh={false} />
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * (win.w / 2 + 0.08), -0.08, 0.14]} castShadow>
            <boxGeometry args={[0.38, win.h + 0.5, 0.06]} />
            <meshLambertMaterial color={L.curtain} />
          </mesh>
        ))}
        <Rod a={[-win.w / 2 - 0.4, win.h / 2 + 0.18, 0.14]} b={[win.w / 2 + 0.4, win.h / 2 + 0.18, 0.14]} r={0.012} c="#8a8a88" sh={false} />
      </group>

      {/* desk, chair, laptop, desk lamp */}
      <group>
        <B p={[(C.desk.x0 + C.desk.x1) / 2, C.desk.top - 0.02, (C.desk.z0 + C.desk.z1) / 2]} s={[C.desk.x1 - C.desk.x0, 0.04, C.desk.z1 - C.desk.z0]} c={L.wood} />
        {[C.desk.x0 + 0.04, C.desk.x1 - 0.04].map((x) => <B key={x} p={[x, (C.desk.top - 0.04) / 2, (C.desk.z0 + C.desk.z1) / 2]} s={[0.04, C.desk.top - 0.04, C.desk.z1 - C.desk.z0 - 0.04]} c={shade(L.wood, 0.85)} />)}
        <group position={C.laptop}>
          <B p={[0, 0.01, 0]} s={[0.34, 0.02, 0.24]} c="#4a4c50" />
          <group position={[0, 0.02, -0.11]} rotation={[-0.25, 0, 0]}>
            <B p={[0, 0.115, 0]} s={[0.34, 0.23, 0.015]} c="#4a4c50" sh={false} />
            <Lit p={[0, 0.115, 0.009]} s={[0.31, 0.2, 0.004]} c={lampOn ? "#bcd4ff" : "#7a90b0"} />
          </group>
        </group>
        <mesh position={[-0.05, C.desk.top + 0.05, 0.42]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
          <meshLambertMaterial color={L.mug} />
        </mesh>
        <group position={[C.deskLamp[0], C.desk.top, C.deskLamp[2]]}>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.07, 0.08, 0.02, 10]} />
            <meshLambertMaterial color="#2a2a2c" />
          </mesh>
          <Rod a={[0, 0, 0]} b={[0, 0.34, 0.04]} r={0.01} c="#2a2a2c" sh={false} />
          <mesh position={[0, 0.36, 0.06]} rotation={[0.5, 0, 0]}>
            <coneGeometry args={[0.07, 0.1, 10, 1, true]} />
            <meshLambertMaterial color="#2a2a2c" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.33, 0.08]}>
            <sphereGeometry args={[0.03, 6, 4]} />
            <meshBasicMaterial color={lampOn ? "#fff0c8" : "#c8c4b8"} />
          </mesh>
        </group>
        {/* office chair, pushed in */}
        <group position={[-0.55, 0, 0.95]}>
          <B p={[0, 0.46, 0]} s={[0.46, 0.07, 0.44]} c="#2e3034" />
          <B p={[0, 0.78, 0.2]} s={[0.44, 0.5, 0.06]} c="#2e3034" />
          <Rod a={[0, 0.06, 0]} b={[0, 0.43, 0]} r={0.025} c="#5a5c60" />
          <B p={[0, 0.04, 0]} s={[0.5, 0.04, 0.06]} c="#2a2a2c" sh={false} />
          <B p={[0, 0.04, 0]} s={[0.06, 0.04, 0.5]} c="#2a2a2c" sh={false} />
        </group>
      </group>

      {/* wardrobe */}
      <group position={[(C.wardrobe.x0 + C.wardrobe.x1) / 2, 0, (C.wardrobe.z0 + C.wardrobe.z1) / 2]}>
        <B p={[0, C.wardrobe.h / 2, 0]} s={[C.wardrobe.x1 - C.wardrobe.x0, C.wardrobe.h, C.wardrobe.z1 - C.wardrobe.z0]} c={L.wood} />
        <B p={[0, C.wardrobe.h / 2, 0.305]} s={[0.012, C.wardrobe.h - 0.1, 0.01]} c={shade(L.wood, 0.7)} sh={false} />
        {[-0.06, 0.06].map((x) => <B key={x} p={[x, 1.0, 0.315]} s={[0.02, 0.18, 0.02]} c="#9a9a98" sh={false} />)}
      </group>
      {L.drawers ? (
        <group position={[-1.75, 0, 1.0]}>
          {[0, 1, 2].map((k) => <B key={k} p={[0, 0.13 + k * 0.24, 0]} s={[0.4, 0.22, 0.45]} c={k % 2 ? "#d8e4ea" : "#e8eef0"} />)}
        </group>
      ) : null}

      {/* bed along the back wall, head at +x */}
      <group>
        <B p={[(bd.x0 + bd.x1) / 2, 0.15, (bd.z0 + bd.z1) / 2]} s={[bd.x1 - bd.x0, 0.3, bd.z1 - bd.z0]} c={shade(L.wood, 0.8)} />
        <B p={[(bd.x0 + bd.x1) / 2, 0.4, (bd.z0 + bd.z1) / 2]} s={[bd.x1 - bd.x0 - 0.04, 0.2, bd.z1 - bd.z0 - 0.04]} c={L.sheet} />
        <B p={[bd.x1 - 0.03, 0.55, (bd.z0 + bd.z1) / 2]} s={[0.05, 1.1, bd.z1 - bd.z0]} c={shade(L.wood, 0.8)} />
        {[0.45, 1.1].map((z) => (
          <mesh key={z} position={[bd.x1 - 0.3, bd.top + 0.07, z]} scale={[0.22, 0.08, 0.32]} castShadow>
            <sphereGeometry args={[1, 10, 6]} />
            <meshLambertMaterial color={L.sheet} />
          </mesh>
        ))}
        <mesh position={[bd.x0 + 0.65, bd.top + 0.05, 0.85]} scale={[0.7, 0.1, 0.72]} castShadow>
          <sphereGeometry args={[1, 12, 6]} />
          <meshLambertMaterial color={L.blanket} />
        </mesh>
      </group>
      {/* air conditioner and poster above the bed */}
      <group position={C.ac}>
        <B p={[0, 0, 0]} s={[0.85, 0.28, 0.22]} c="#f4f4f2" />
        <B p={[0, -0.1, 0.112]} s={[0.75, 0.03, 0.01]} c="#c8c8c4" sh={false} />
        <Lit p={[0.34, 0.05, 0.112]} s={[0.04, 0.02, 0.005]} c={lampOn ? "#7ae0a0" : "#c8d8c8"} />
      </group>
      <B p={[C.poster[0], C.poster[1], 0.02]} s={[0.56, 0.76, 0.02]} c="#2a2a2a" sh={false} />
      <mesh position={[C.poster[0], C.poster[1], 0.035]}>
        <planeGeometry args={[0.5, 0.7]} />
        <meshLambertMaterial map={tx.poster} />
      </mesh>

      {/* door on the left wall */}
      <group position={[-C.halfW, 0, C.door.z]}>
        <B p={[0.025, C.door.h / 2, 0]} s={[0.04, C.door.h, C.door.w]} c={shade(L.wood, 0.95)} sh={false} />
        <B p={[0.03, C.door.h + 0.04, 0]} s={[0.05, 0.08, C.door.w + 0.16]} c={frame} sh={false} />
        {[-1, 1].map((k) => <B key={k} p={[0.03, C.door.h / 2, k * (C.door.w / 2 + 0.04)]} s={[0.05, C.door.h, 0.08]} c={frame} sh={false} />)}
        <B p={[0.07, 1.0, C.door.w / 2 - 0.1]} s={[0.04, 0.03, 0.12]} c="#a8a8a4" sh={false} />
      </group>

      {/* ceiling light */}
      <mesh position={C.lamp} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 16]} />
        <meshBasicMaterial color={lampOn ? "#fffaf0" : "#e8e8e4"} side={THREE.DoubleSide} />
      </mesh>

      {/* rug, plant, floor fan */}
      <mesh position={[L.rugX, 0.006, 2.9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.0, 1.4]} />
        <meshLambertMaterial color={L.rug} />
      </mesh>
      {L.plant ? (
        <group position={[-2.0, 0, 1.55]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.14, 0.11, 0.3, 8]} />
            <meshLambertMaterial color="#d8d0c4" />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.sin(i * 1.3) * 0.12, 0.55 + i * 0.06, Math.cos(i * 1.3) * 0.12]} scale={[0.14, 0.26, 0.14]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshLambertMaterial color={i % 2 ? "#3f7a42" : "#4f8a48"} flatShading />
            </mesh>
          ))}
        </group>
      ) : null}
      {L.fan ? (
        <group position={[1.85, 0, 2.3]} rotation={[0, -0.6, 0]}>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.18, 0.2, 0.04, 10]} />
            <meshLambertMaterial color="#e8e8e4" />
          </mesh>
          <Rod a={[0, 0, 0]} b={[0, 1.0, 0]} r={0.02} c="#e8e8e4" />
          <mesh position={[0, 1.08, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.1, 12, 1, true]} />
            <meshLambertMaterial color="#9ab8d8" side={THREE.DoubleSide} transparent opacity={0.7} />
          </mesh>
        </group>
      ) : null}

      <Blobs blobs={blobs} y={0.01} c="#3a3430" o={0.24} />
    </>
  );
};
