import React, { useMemo } from "react";
import * as THREE from "three";
import { makeTex } from "./NightRoom";
import type { Blob } from "./Village";
import { rng, V3 } from "./lib";
import { Kit, KITS, SkyLights } from "./Light";
import { B, Blobs, Ground, Lit, Rod, shade } from "./SetKit";

// Paddy fields, real-world scale. A raised dike path (top y 0, 1.6 m wide, z 2.2..3.8) crosses the frame;
// the paddies lie 0.3 m lower, flooded (reflecting the sky) or planted. A sala (open hut on stilts) stands
// behind the path on one side, sugar palms along the far dikes, hills on the horizon. Which paddies are
// flooded / green / ripe, the sala side, palms, buffalo and dike lines all come from the clip seed.

export const RICE = {
  path: { z0: 2.2, z1: 3.8 }, // dike path, top at y 0
  water: -0.3, // water level in the paddies
  sala: { x: 5.4, z: -3.4, floor: 0.9, ridge: 3.9 }, // x is mirrored to -5.4 for half the seeds: see salaX
  backDikes: [-7, -17, -30, -46, -66], // z of the dikes parallel to the path
  actorZone: { x: [-2.0, 2.0], z: [2.6, 3.4] },
};
/** Sala x for a clip seed (the hut stands left or right of the path). */
export const salaX = (seed: number) => (rng(seed * 389 + 7)() > 0.5 ? 1 : -1) * RICE.sala.x;
/** Lantern under the sala roof (lit at evening / night). */
export const salaLamp = (seed: number): V3 => [salaX(seed), 2.35, RICE.sala.z + 0.4];

const dirt = (seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  c.fillStyle = "#9a7a52";
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "70,52,32" : "190,160,120"},${0.15 + r() * 0.2})`;
    c.fillRect(r() * 256, r() * 256, 1 + r() * 4, 1 + r() * 3);
  }
  c.fillStyle = "rgba(90,130,60,0.85)";
  for (let i = 0; i < 260; i++) {
    const edge = r() < 0.5 ? r() * 40 : 216 + r() * 40;
    c.fillRect(r() * 256, edge, 2, 3 + r() * 8);
  }
};

const rows = (base: string, tip: string, seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  c.fillStyle = base;
  c.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 8)
    for (let x = 0; x < 256; x += 3) {
      c.fillStyle = r() < 0.5 ? tip : shade(base, 0.8);
      c.fillRect(x, y + r() * 3, 2, 4 + r() * 3);
    }
};

const seedlings = (seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  c.clearRect(0, 0, 256, 256);
  for (let y = 4; y < 256; y += 16)
    for (let x = 4; x < 256; x += 12) {
      c.fillStyle = `rgba(${90 + r() * 40},${150 + r() * 40},${60 + r() * 20},0.95)`;
      c.fillRect(x + r() * 3, y + r() * 3, 3, 6);
    }
};

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), Bc = p(b);
  return `#${A.map((v, i) => Math.round(v + (Bc[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

type Cell = { x0: number; x1: number; z0: number; z1: number; kind: "water" | "green" | "gold" | "stubble" };

const SugarPalm: React.FC<{ p: V3; h: number; seed: number }> = ({ p, h, seed }) => {
  const lean = (rng(seed)() - 0.5) * 0.12;
  return (
    <group position={p} rotation={[0, seed, lean]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, h, 5]} />
        <meshLambertMaterial color="#4a3c30" flatShading />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[0, h, 0]} rotation={[0.5 + (i % 3) * 0.35, (i / 9) * Math.PI * 2, 0]}>
          <circleGeometry args={[1.5, 5, 0, 1.6]} />
          <meshLambertMaterial color={i % 2 ? "#4c7a3c" : "#3d6a34"} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, h - 0.1, 0]}>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshLambertMaterial color="#3d5a30" flatShading />
      </mesh>
    </group>
  );
};

const Buffalo: React.FC<{ p: V3; ry: number }> = ({ p, ry }) => (
  <group position={p} rotation={[0, ry, 0]}>
    <mesh position={[0, 0.95, 0]} scale={[1.15, 0.55, 0.52]} castShadow>
      <icosahedronGeometry args={[1, 1]} />
      <meshLambertMaterial color="#3e3c40" flatShading />
    </mesh>
    <mesh position={[1.2, 1.05, 0]} rotation={[0, 0, -0.5]} scale={[0.5, 0.32, 0.3]}>
      <icosahedronGeometry args={[1, 0]} />
      <meshLambertMaterial color="#38363a" flatShading />
    </mesh>
    {[-1, 1].map((k) => (
      <mesh key={k} position={[1.15, 1.32, k * 0.28]} rotation={[k * 1.2, 0, 0.6]}>
        <torusGeometry args={[0.3, 0.05, 4, 6, Math.PI * 0.75]} />
        <meshLambertMaterial color="#8a8070" />
      </mesh>
    ))}
    {[[-0.7, -0.25], [-0.7, 0.25], [0.6, -0.25], [0.6, 0.25]].map(([x, z], i) => (
      <B key={i} p={[x, 0.35, z]} s={[0.16, 0.7, 0.16]} c="#353337" sh={false} />
    ))}
  </group>
);

export const Ricefield: React.FC<{ seed: number; kit?: Kit; blobs?: Blob[] }> = ({ seed, kit = KITS.day, blobs = [] }) => {
  const R = RICE;
  const sx = salaX(seed);
  const L = useMemo(() => {
    const r = rng(seed * 523 + 41);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    // dikes running away from the camera: a jittered grid, different on each side and in front
    const across = (from: number, to: number) => {
      const xs: number[] = [];
      for (let x = -70 + r() * 6; x < 70; x += 7 + r() * 8) xs.push(x);
      return xs.map((x) => ({ x, z0: from, z1: to }));
    };
    const zLines = [R.path.z0, ...R.backDikes, -95];
    const far: Cell[] = [];
    const farDikes: { x: number; z0: number; z1: number }[] = [];
    for (let i = 0; i < zLines.length - 1; i++) {
      const lines = across(zLines[i + 1], zLines[i]);
      farDikes.push(...lines);
      for (let k = 0; k < lines.length - 1; k++) far.push({ x0: lines[k].x, x1: lines[k + 1].x, z0: zLines[i + 1], z1: zLines[i], kind: "water" });
    }
    const nearLines = across(R.path.z1, 40);
    const near: Cell[] = nearLines.slice(0, -1).map((l, k) => ({ x0: l.x, x1: nearLines[k + 1].x, z0: R.path.z1, z1: 40, kind: "water" }));
    // season: mostly flooded, mostly green, or ripening gold
    const season = pick(["flooded", "green", "mixed", "gold"]);
    const kinds: Record<string, Cell["kind"][]> = {
      flooded: ["water", "water", "water", "green"],
      green: ["green", "green", "green", "water"],
      mixed: ["water", "green", "gold", "water", "green"],
      gold: ["gold", "gold", "green", "stubble"],
    };
    [...far, ...near].forEach((c) => (c.kind = pick(kinds[season])));
    // keep the paddy right behind the actors calm (water or green) so they read clearly
    const palms = Array.from({ length: 9 }).map(() => {
      const zi = Math.floor(r() * 4);
      return { p: [(r() - 0.5) * 70, R.water, R.backDikes[zi] + (r() - 0.5) * 0.3] as V3, h: 9 + r() * 3, seed: Math.floor(r() * 9999) };
    }).filter((t) => Math.abs(t.p[0]) > 3 || t.p[2] < -20);
    const buffalo = r() < 0.6 ? { p: [(r() < 0.5 ? -1 : 1) * (4 + r() * 6), R.water, -10 - r() * 4] as V3, ry: r() * 6 } : null;
    const roof = pick(["#8a7a5a", "#7a6a4a", "#8a8c8e"]);
    const hills = Array.from({ length: 6 }).map((_, i) => ({ x: -160 + i * 64 + (r() - 0.5) * 30, z: -115 - r() * 25, rad: 30 + r() * 25, h: 14 + r() * 18 }));
    const treeLine = Array.from({ length: 50 }).map((_, i) => ({ x: -120 + i * 4.8 + (r() - 0.5) * 3, z: -84 - r() * 10, s: 1.6 + r() * 2.2 }));
    const village = Array.from({ length: 9 }).map(() => ({ x: -60 + r() * 120, y: 0.8 + r() * 1.5 }));
    return { far, near, farDikes, nearLines, season, palms, buffalo, roof, hills, treeLine, village };
  }, [seed, R]);
  const tx = useMemo(() => {
    const path = makeTex(256, 256, dirt(seed), [60, 1]);
    const green = makeTex(256, 256, rows("#5f9a3c", "#86c058", seed + 1));
    const gold = makeTex(256, 256, rows("#c8a83a", "#e8cf6a", seed + 2));
    const stubble = makeTex(256, 256, rows("#8a7048", "#b09468", seed + 3));
    const sprouts = makeTex(256, 256, seedlings(seed + 4));
    return { path, green, gold, stubble, sprouts };
  }, [seed]);
  const lampOn = kit.lamps > 0;
  // water mirrors the sky: high sky (deeper colour) close to the camera, the horizon colour far away
  const water = (z: number) => mix(mix(kit.skyCols[0], kit.skyCols[1], 0.45), kit.skyCols[2], Math.max(0, Math.min(1, -z / 45 + 0.25)));
  const tiled = useMemo(() => {
    const cache = new Map<string, THREE.Texture>();
    return (t: THREE.Texture, w: number, d: number, m: number) => {
      const key = `${t.uuid}${w.toFixed(1)}${d.toFixed(1)}`;
      if (!cache.has(key)) {
        const c = t.clone();
        c.wrapS = c.wrapT = THREE.RepeatWrapping;
        c.repeat.set(w / m, d / m);
        c.needsUpdate = true;
        cache.set(key, c);
      }
      return cache.get(key)!;
    };
    // a fresh cache whenever the base textures change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx]);
  const cell = (c: Cell, i: number) => {
    const w = c.x1 - c.x0;
    const d = c.z1 - c.z0;
    const p: V3 = [(c.x0 + c.x1) / 2, R.water, (c.z0 + c.z1) / 2];
    if (c.kind === "water")
      return (
        <group key={i}>
          <Ground p={p} w={w} d={d} c={water(p[2])} basic />
          <Ground p={[p[0], R.water + 0.01, p[2]]} w={w} d={d} map={tiled(tx.sprouts, w, d, 3)} opacity={0.75} />
        </group>
      );
    const m = c.kind === "green" ? tx.green : c.kind === "gold" ? tx.gold : tx.stubble;
    const top = c.kind === "stubble" ? R.water + 0.04 : R.water + 0.22;
    return <Ground key={i} p={[p[0], top, p[2]]} w={w} d={d} map={tiled(m, w, d, 4)} />;
  };

  return (
    <>
      <SkyLights kit={kit} box={40} far={110} fogMul={1.9} />
      {lampOn ? <pointLight position={salaLamp(seed)} color="#ffc070" intensity={7 * kit.lamps} distance={9} decay={1.5} /> : null}

      {/* base ground under everything, hills and tree line */}
      <Ground p={[0, R.water - 0.05, 0]} w={600} d={600} c="#6a8a4a" />
      {L.hills.map((h, i) => (
        <mesh key={i} position={[h.x, h.h / 2 - 1, h.z]}>
          <coneGeometry args={[h.rad, h.h, 7]} />
          <meshLambertMaterial color={i % 2 ? "#7f9fa0" : "#8faba6"} flatShading />
        </mesh>
      ))}
      {L.treeLine.map((t, i) => (
        <mesh key={i} position={[t.x, t.s * 1.2, t.z]} scale={[t.s * 1.3, t.s, t.s * 1.3]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={i % 3 ? "#4a7a44" : "#3f6e3e"} flatShading />
        </mesh>
      ))}
      {lampOn ? L.village.map((v, i) => <Lit key={i} p={[v.x, v.y, -84]} s={[0.6, 0.4, 0.1]} c="#ffcf7e" />) : null}

      {/* paddies */}
      {L.far.map(cell)}
      {L.near.map((c, i) => cell(c, 1000 + i))}

      {/* dikes: the path across the frame, the far dikes parallel to it, and the ones running away */}
      <B p={[0, -0.22, (R.path.z0 + R.path.z1) / 2]} s={[300, 0.44, R.path.z1 - R.path.z0]} c="#ffffff" map={tx.path} />
      {R.backDikes.map((z) => <B key={z} p={[0, R.water + 0.12, z]} s={[300, 0.3, 0.6]} c="#7a8a4a" sh={false} />)}
      {[...L.farDikes, ...L.nearLines.map((l) => ({ ...l, z1: 40 }))].map((d, i) => (
        <B key={i} p={[d.x, R.water + 0.12, (d.z0 + d.z1) / 2]} s={[0.5, 0.3, d.z1 - d.z0]} c={i % 2 ? "#7a8a4a" : "#6f8446"} sh={false} />
      ))}
      {/* grass along the back edge of the path */}
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={i} position={[-15 + i + ((i * 37) % 7) * 0.1, 0.1, R.path.z0 + 0.05]} rotation={[0, i, 0]}>
          <coneGeometry args={[0.12, 0.35, 4]} />
          <meshLambertMaterial color="#6f9a46" flatShading />
        </mesh>
      ))}

      {/* sala on stilts, ladder down to the path */}
      <group position={[sx, 0, R.sala.z]}>
        {[[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].map(([x, z], i) => (
          <Rod key={i} a={[x, R.water, z]} b={[x, 3.0, z]} r={0.07} c="#6a5038" />
        ))}
        <B p={[0, R.sala.floor, 0]} s={[2.5, 0.1, 2.5]} c="#8a6a48" />
        {[-1.2, 1.2].map((z) => <B key={z} p={[0, R.sala.floor + 0.45, z]} s={[2.4, 0.06, 0.06]} c="#6a5038" sh={false} />)}
        {[-1, 1].map((k) => (
          <group key={k} position={[0, 3.4, k * 0.8]} rotation={[k * 0.68, 0, 0]}>
            <B p={[0, 0, 0]} s={[3.0, 0.1, 2.0]} c={L.roof} />
          </group>
        ))}
        {/* ladder */}
        {[-0.25, 0.25].map((x) => <Rod key={x} a={[x, R.water, 2.3]} b={[x, R.sala.floor, 1.25]} r={0.03} c="#6a5038" />)}
        {[0.25, 0.5, 0.75].map((f) => <B key={f} p={[0, R.water + (R.sala.floor - R.water) * f, 2.3 - 1.05 * f]} s={[0.5, 0.04, 0.06]} c="#6a5038" sh={false} />)}
        {/* lantern */}
        <Rod a={[0, 2.45, 0.4]} b={[0, 3.1, 0.4]} r={0.006} c="#333" seg={3} sh={false} />
        <Lit p={[0, 2.35, 0.4]} s={[0.16, 0.22, 0.16]} c={lampOn ? "#ffd890" : "#c8c0a8"} />
      </group>

      {L.palms.map((t, i) => <SugarPalm key={i} {...t} />)}
      {L.buffalo ? <Buffalo {...L.buffalo} /> : null}

      <Blobs blobs={blobs} y={0.005} c="#3a2a18" o={0.3} />
    </>
  );
};
