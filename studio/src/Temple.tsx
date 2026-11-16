import React, { useMemo } from "react";
import * as THREE from "three";
import { makeTex } from "./NightRoom";
import type { Blob } from "./Village";
import { rng, V3 } from "./lib";
import { Kit, KITS, SkyLights } from "./Light";
import { B, Blobs, Ground, Lit, Rod, shade } from "./SetKit";

// Thai wat courtyard, real-world scale (1 unit = 1 m). The ordination hall (ubosot) stands on a raised white
// base whose front steps end at z -0.4; a low white wall with a gate runs along z 0.2; the actors stand in
// the stone courtyard in front of it. The layout (roof colours, bodhi tree side, chedi, pots, flags) comes
// from the clip seed; the anchors below never move.

export const TEMPLE = {
  base: { x: 5.6, z0: -15.5, z1: -2.4, h: 1.0 }, // raised white base, x ±5.6, front edge z -2.4
  steps: { x: 1.4, z0: -2.4, z1: -0.4, n: 5 }, // five 0.2 m steps, 0.4 m treads, x ±1.4
  door: [0, 2.4, -4.15] as V3, // centre of the hall door (1.4 wide, 2.8 high)
  ridge: 8.8, // main roof ridge; chofa tips reach about 9.7
  porchRidge: 7.4,
  wall: { z: 0.2, h: 0.75, x: 7.0, gate: 1.8 }, // low wall along z 0.2, x ±7, gate opening x ±1.8
  sema: [[-2.6, 0.9], [2.6, 0.9], [-7.6, 0.8], [7.6, 0.8]] as [number, number][], // boundary stones (x, z)
  lamps: [[-1.8, 1.62, 0.2], [1.8, 1.62, 0.2]] as V3[], // lanterns on the gate posts
  actorZone: { x: [-2.0, 2.0], z: [2.0, 4.0] },
};

const slabs = (seed: number, hue: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  const S = 512;
  const n = 8;
  const q = S / n;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      c.fillStyle = `hsl(${hue + (r() - 0.5) * 8} ${10 + r() * 6}% ${64 + (r() - 0.5) * 10}%)`;
      c.fillRect(x * q, y * q, q, q);
      for (let i = 0; i < 30; i++) {
        c.fillStyle = `rgba(${r() > 0.5 ? "60,55,45" : "255,250,235"},${0.05 + r() * 0.08})`;
        c.fillRect(x * q + r() * q, y * q + r() * q, 2 + r() * 5, 2 + r() * 5);
      }
    }
  c.fillStyle = "rgba(70,62,50,0.55)";
  for (let i = 0; i <= n; i++) {
    c.fillRect(i * q - 1, 0, 3, S);
    c.fillRect(0, i * q - 1, S, 3);
  }
};

const tiles = (main: string) => (c: CanvasRenderingContext2D) => {
  c.fillStyle = main;
  c.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const ox = (y % 2) * 8;
      c.fillStyle = "rgba(0,0,0,0.22)";
      c.beginPath();
      c.arc(x * 16 + ox + 8, y * 16 + 16, 8, Math.PI, 0);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.12)";
      c.fillRect(x * 16 + ox + 3, y * 16 + 3, 5, 6);
    }
};

const SCHEMES = [
  { main: "#b8322a", edge: "#2d7a4a" }, // red with green border
  { main: "#d8702a", edge: "#2d7a4a" }, // orange with green border
  { main: "#b8322a", edge: "#d8802a" }, // red with orange border
  { main: "#d8702a", edge: "#1f5d86" }, // orange with blue border
];
const GOLD = "#d9a630";
const WHITE = "#efece4";

/** One gable roof tier: two tiled slopes with a coloured border, a gilded front gable with bai raka and a chofa. */
const Gable: React.FC<{ half: number; rise: number; y: number; z0: number; z1: number; tile: THREE.Texture; edge: string; gable: string; lit: boolean }> = ({ half, rise, y, z0, z1, tile, edge, gable }) => {
  const len = Math.hypot(half, rise);
  const a = Math.atan2(rise, half);
  const dz = z1 - z0;
  const zc = (z0 + z1) / 2;
  const tri = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-half + 0.35, 0);
    s.lineTo(half - 0.35, 0);
    s.lineTo(0, rise - 0.3);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [half, rise]);
  const inner = useMemo(() => {
    const s = new THREE.Shape();
    const k = 0.55;
    s.moveTo(-half * k, 0.35);
    s.lineTo(half * k, 0.35);
    s.lineTo(0, 0.35 + (rise - 0.3) * k * 0.95);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [half, rise]);
  return (
    <group>
      {[-1, 1].map((k) => (
        <group key={k} position={[(k * half) / 2, y + rise / 2, zc]} rotation={[0, 0, -k * a]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[len, 0.14, dz]} />
            <meshLambertMaterial map={tile} />
          </mesh>
          {/* border band along the eave */}
          <B p={[k * (len / 2 - 0.3), 0.02, 0]} s={[0.6, 0.15, dz + 0.02]} c={edge} sh={false} />
          {/* bai raka: gilded barge board along the front edge */}
          <B p={[0, 0.12, dz / 2 + 0.04]} s={[len + 0.2, 0.26, 0.1]} c={GOLD} sh={false} />
          {/* hang hong: upturned tip at the lower end */}
          <mesh position={[k * (len / 2 + 0.12), 0.32, dz / 2 + 0.04]} rotation={[0, 0, k * (a - 0.5)]}>
            <coneGeometry args={[0.09, 0.55, 5]} />
            <meshLambertMaterial color={GOLD} />
          </mesh>
        </group>
      ))}
      {/* na ban: front gable, red with a gilded panel */}
      <mesh geometry={tri} position={[0, y, z1 - 0.08]}>
        <meshLambertMaterial color={gable} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={inner} position={[0, y, z1 - 0.05]}>
        <meshLambertMaterial color={GOLD} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, y + rise * 0.42, z1 - 0.03]}>
        <circleGeometry args={[Math.min(0.55, rise * 0.12), 12]} />
        <meshLambertMaterial color="#f4d36a" />
      </mesh>
      {/* chofa: the slender gold finial curling up at the ridge end */}
      <group position={[0, y + rise + 0.05, z1 + 0.04]}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.05, 0.11, 0.7, 5]} />
          <meshLambertMaterial color={GOLD} />
        </mesh>
        <mesh position={[0.2, 0.7, 0]} rotation={[0, 0, Math.PI * 0.05]}>
          <torusGeometry args={[0.22, 0.045, 4, 8, Math.PI * 0.9]} />
          <meshLambertMaterial color={GOLD} />
        </mesh>
      </group>
      {/* ridge */}
      <B p={[0, y + rise + 0.02, zc]} s={[0.18, 0.18, dz]} c={edge} sh={false} />
    </group>
  );
};

const Sema: React.FC<{ p: [number, number] }> = ({ p }) => {
  const leaf = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.22, 0);
    s.lineTo(0.22, 0);
    s.bezierCurveTo(0.26, 0.35, 0.14, 0.62, 0, 0.82);
    s.bezierCurveTo(-0.14, 0.62, -0.26, 0.35, -0.22, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false });
  }, []);
  return (
    <group position={[p[0], 0, p[1]]}>
      <B p={[0, 0.12, 0]} s={[0.7, 0.24, 0.7]} c={WHITE} />
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.3, 0.22, 0.14, 8]} />
        <meshLambertMaterial color={GOLD} />
      </mesh>
      <mesh geometry={leaf} position={[0, 0.37, -0.05]} castShadow>
        <meshLambertMaterial color="#e6e1d4" />
      </mesh>
    </group>
  );
};

const LotusPot: React.FC<{ p: V3; glaze: string; s: number; bloom: boolean }> = ({ p, glaze, s, bloom }) => {
  const pot = useMemo(() => new THREE.LatheGeometry([[0.2, 0], [0.34, 0.08], [0.4, 0.3], [0.36, 0.5], [0.38, 0.54]].map(([x, y]) => new THREE.Vector2(x, y)), 10), []);
  return (
    <group position={p} scale={s}>
      <mesh geometry={pot} castShadow>
        <meshLambertMaterial color={glaze} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 10]} />
        <meshLambertMaterial color="#3b5a52" />
      </mesh>
      {[[0.12, 0.1, 0.16], [-0.14, 0.04, 0.13], [0.02, -0.15, 0.12]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.53 + i * 0.01, z]} rotation={[-Math.PI / 2, 0, i]}>
          <circleGeometry args={[r, 8]} />
          <meshLambertMaterial color={i % 2 ? "#4f9a4a" : "#3f8a45"} />
        </mesh>
      ))}
      <Rod a={[-0.05, 0.5, 0]} b={[-0.05, 0.95, 0.02]} r={0.012} c="#4f8a3a" sh={false} />
      <mesh position={[-0.05, 1.0, 0.02]} scale={bloom ? [1.4, 0.8, 1.4] : [1, 1, 1]}>
        <coneGeometry args={[0.07, 0.18, 6]} />
        <meshLambertMaterial color="#f08aa8" />
      </mesh>
    </group>
  );
};

export const Temple: React.FC<{ seed: number; kit?: Kit; blobs?: Blob[] }> = ({ seed, kit = KITS.day, blobs = [] }) => {
  const T = TEMPLE;
  const L = useMemo(() => {
    const r = rng(seed * 977 + 13);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const scheme = pick(SCHEMES);
    const treeSide = r() > 0.5 ? 1 : -1;
    const chedi = { x: -treeSide * (7 + r() * 4), z: -24 - r() * 6, h: 0.9 + r() * 0.3 };
    const spots: V3[] = [[-3.2, 0, 1.2], [3.2, 0, 1.2], [-4.4, 0, 2.6], [4.4, 0, 2.6], [-3.4, 0, 4.4], [3.4, 0, 4.4], [-5.4, 0, 1.0], [5.4, 0, 1.0]];
    const pots = spots.filter(() => r() < 0.55).map((p) => ({ p: [p[0] + (r() - 0.5) * 0.5, 0, p[2] + (r() - 0.5) * 0.5] as V3, glaze: pick(["#2f5f86", "#3f7a5a", "#7a4a2a", "#5a5f62", "#a8763a"]), s: 0.9 + r() * 0.35, bloom: r() > 0.5 }));
    const flags = [-1, 1].filter(() => r() < 0.6).map((k) => ({ x: k * (5.2 + r() * 1.2), z: 1.0 + r() * 0.8, c: pick(["#f2c230", "#f2c230", "#e8e4d4"]) }));
    const hue = 30 + r() * 20;
    const bodhi = { x: treeSide * (8.6 + r() * 1.4), z: -1.5 - r() * 2.0, cloth: pick(["#f2c230", "#e0603a", "#e85a8a"]) };
    const crowns = Array.from({ length: 9 }).map((_, i) => ({ p: [(r() - 0.5) * 5.5, 5.2 + r() * 3.0 + (i % 3) * 0.4, (r() - 0.5) * 4] as V3, s: 1.6 + r() * 1.1, c: pick(["#3f7d3a", "#4a8a40", "#356f34", "#5a9648"]) }));
    const backTrees = Array.from({ length: 12 }).map((_, i) => ({ p: [-30 + i * 5.5 + (r() - 0.5) * 3, 0, -20 - r() * 14] as V3, s: 2.2 + r() * 1.6, c: pick(["#4c8a48", "#3f7a42", "#5a9650"]) }));
    const gable = ["#9c2a24", "#1f4f6a", "#2a5a3a", "#7a1f1c"][Math.floor(rng(seed * 53 + 1)() * 4)];
    const door = pick(["#8a2420", "#2a3a2e", "#3a2618", "#1f2f4a"]);
    const wall = pick([WHITE, "#f0d9a4", "#ecd2c4", "#f4eee2"]);
    return { scheme, chedi, pots, flags, hue, bodhi, crowns, backTrees, gable, door, wall };
  }, [seed]);
  const tx = useMemo(() => {
    const floor = makeTex(512, 512, slabs(seed + 5, L.hue), [10, 10]);
    const tile = makeTex(128, 128, tiles(L.scheme.main), [4, 4]);
    return { floor, tile };
  }, [seed, L]);
  const chediGeo = useMemo(
    () =>
      new THREE.LatheGeometry(
        [[2.3, 0], [2.5, 0.35], [2.55, 1.3], [2.3, 2.7], [1.7, 3.7], [0.95, 4.25], [0.95, 4.3], [1.05, 4.35], [1.05, 4.95], [0.7, 5.0], [0.62, 5.45], [0.52, 5.5], [0.5, 5.9], [0.4, 5.95], [0.38, 6.35], [0.28, 6.4], [0.12, 8.8], [0.0, 9.6]].map(([x, y]) => new THREE.Vector2(x, y)),
        12,
      ),
    [],
  );
  const lit = kit.lamps > 0;
  const winC = lit ? "#ffcf7e" : L.door;
  const bx = T.base.x;
  const bd = T.base.z1 - T.base.z0;
  const bz = (T.base.z0 + T.base.z1) / 2;
  const by = T.base.h;
  const wallY = by + 3.4; // eave of the main roof
  const st = T.steps;

  return (
    <>
      <SkyLights kit={kit} box={30} far={90} />
      {lit ? (
        <>
          {T.lamps.map((p, i) => <pointLight key={i} position={[p[0], p[1] + 0.1, p[2] + 0.3]} color="#ffc070" intensity={3.5 * kit.lamps} distance={7} decay={1.6} />)}
          <pointLight position={[0, 3.0, -1.0]} color="#ffd8a0" intensity={3 * kit.lamps} distance={8} decay={1.6} />
        </>
      ) : null}

      {/* ground: stone courtyard, sand and grass beyond */}
      <Ground p={[0, 0, 0]} w={400} d={400} c="#9ab866" />
      <Ground p={[0, 0.01, -6]} w={60} d={46} c="#d9c39a" />
      <Ground p={[0, 0.02, -2]} w={17} d={16} map={tx.floor} />

      {/* background trees and chedi */}
      {L.backTrees.map((t, i) => (
        <group key={i} position={t.p}>
          <mesh position={[0, 1.4 * t.s, 0]}>
            <cylinderGeometry args={[0.15 * t.s, 0.22 * t.s, 2.8 * t.s, 5]} />
            <meshLambertMaterial color="#6b4a33" flatShading />
          </mesh>
          <mesh position={[0, 3.4 * t.s, 0]} scale={t.s * 1.5}>
            <icosahedronGeometry args={[1, 0]} />
            <meshLambertMaterial color={t.c} flatShading />
          </mesh>
        </group>
      ))}
      <group position={[L.chedi.x, 0, L.chedi.z]} scale={[1, L.chedi.h, 1]}>
        <B p={[0, 0.4, 0]} s={[7, 0.8, 7]} c={WHITE} />
        <B p={[0, 1.15, 0]} s={[6, 0.7, 6]} c={WHITE} />
        <B p={[0, 1.8, 0]} s={[5.2, 0.6, 5.2]} c={WHITE} />
        <mesh geometry={chediGeo} position={[0, 2.1, 0]} castShadow>
          <meshLambertMaterial color={WHITE} flatShading />
        </mesh>
        <mesh position={[0, 2.1 + 8.4, 0]}>
          <coneGeometry args={[0.2, 2.6, 8]} />
          <meshLambertMaterial color={GOLD} />
        </mesh>
      </group>

      {/* raised white base of the ubosot with a moulded plinth */}
      <B p={[0, by / 2, bz]} s={[bx * 2, by, bd]} c={WHITE} />
      <B p={[0, 0.12, bz]} s={[bx * 2 + 0.2, 0.24, bd + 0.2]} c={shade(WHITE, 0.86)} />
      <B p={[0, by - 0.06, bz]} s={[bx * 2 + 0.12, 0.12, bd + 0.12]} c={shade(WHITE, 0.92)} />
      {/* steps with naga balustrades */}
      {Array.from({ length: st.n }).map((_, i) => {
        const h = by - (i + 1) * (by / st.n);
        const z = st.z1 - (st.n - 1 - i) * ((st.z1 - st.z0) / st.n);
        return <B key={i} p={[0, h + by / st.n / 2, z - 0.2]} s={[st.x * 2, by / st.n, 0.4]} c={shade(WHITE, i % 2 ? 0.96 : 0.92)} />;
      })}
      {[-1, 1].map((k) => (
        <group key={k}>
          <B p={[k * (st.x + 0.15), 0.75, (st.z0 + st.z1) / 2]} s={[0.26, 0.3, Math.hypot(2.0, 0.9)]} r={[Math.atan2(0.9, 2.0), 0, 0]} c={GOLD} />
          <mesh position={[k * (st.x + 0.15), 0.6, st.z1 + 0.15]} rotation={[-0.4, 0, 0]}>
            <coneGeometry args={[0.2, 0.9, 5]} />
            <meshLambertMaterial color={GOLD} />
          </mesh>
        </group>
      ))}

      {/* hall walls, door and windows */}
      <B p={[0, by + 1.7, -9.8]} s={[8.8, 3.4, 11.2]} c={L.wall} />
      <B p={[0, by + 1.4, -4.19]} s={[1.65, 3.05, 0.02]} c={GOLD} sh={false} />
      <Lit p={[0, by + 1.4, -4.17]} s={[1.4, 2.8, 0.02]} c={lit ? "#ffcf7e" : L.door} />
      {lit ? null : <B p={[0, by + 1.4, -4.15]} s={[0.05, 2.8, 0.02]} c={GOLD} sh={false} />}
      {[-2.9, 2.9].map((x) => (
        <group key={x}>
          <B p={[x, by + 1.7, -4.17]} s={[0.95, 1.55, 0.03]} c={GOLD} sh={false} />
          <Lit p={[x, by + 1.7, -4.13]} s={[0.75, 1.35, 0.03]} c={winC} />
        </group>
      ))}
      {/* porch columns with gilded lotus capitals */}
      {[-3.6, -1.5, 1.5, 3.6].map((x) => (
        <group key={x}>
          <B p={[x, by + 1.45, -2.85]} s={[0.36, 2.9, 0.36]} c={L.wall} />
          <B p={[x, by + 2.85, -2.85]} s={[0.46, 0.22, 0.46]} c={GOLD} sh={false} />
        </group>
      ))}
      {/* outer side colonnade under the lower roof tier */}
      {[-1, 1].map((k) => [-6, -9, -12, -14.8].map((z) => <B key={`${k}${z}`} p={[k * 5.25, by + 1.15, z]} s={[0.3, 2.3, 0.3]} c={WHITE} />))}

      {/* roofs: main tier, lower side tier, porch tier */}
      <Gable half={4.6} rise={4.4} y={wallY} z0={-15.6} z1={-4.0} tile={tx.tile} edge={L.scheme.edge} gable={L.gable} lit={lit} />
      {[-1, 1].map((k) => {
        const len = Math.hypot(1.9, 1.3);
        return (
          <group key={k} position={[k * 5.0, by + 2.95, -9.6]} rotation={[0, 0, k * -Math.atan2(1.3, 1.9)]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[len, 0.12, 11.8]} />
              <meshLambertMaterial map={tx.tile} />
            </mesh>
            <B p={[k * (len / 2 - 0.25), 0.02, 0]} s={[0.5, 0.13, 11.82]} c={L.scheme.edge} sh={false} />
          </group>
        );
      })}
      <Gable half={3.9} rise={3.5} y={by + 2.95} z0={-4.4} z1={-2.45} tile={tx.tile} edge={L.scheme.edge} gable={L.gable} lit={lit} />

      {/* low boundary wall with the gate, sema stones */}
      {[-1, 1].map((k) => (
        <group key={k}>
          <B p={[k * (T.wall.gate + T.wall.x) / 2, T.wall.h / 2, T.wall.z]} s={[T.wall.x - T.wall.gate, T.wall.h, 0.3]} c={WHITE} />
          <B p={[k * (T.wall.gate + T.wall.x) / 2, T.wall.h + 0.04, T.wall.z]} s={[T.wall.x - T.wall.gate + 0.06, 0.08, 0.38]} c={shade(WHITE, 0.82)} sh={false} />
          <B p={[k * T.wall.x, T.wall.h / 2, -8.4]} s={[0.3, T.wall.h, 17.2]} c={WHITE} />
          <B p={[k * T.wall.gate, 0.65, T.wall.z]} s={[0.42, 1.3, 0.42]} c={WHITE} />
          <B p={[k * T.wall.gate, 1.33, T.wall.z]} s={[0.5, 0.08, 0.5]} c={GOLD} sh={false} />
          {/* lantern on the gate post */}
          <B p={[k * T.wall.gate, 1.4, T.wall.z]} s={[0.16, 0.06, 0.16]} c="#3a3026" sh={false} />
          <Lit p={[k * T.wall.gate, 1.58, T.wall.z]} s={[0.18, 0.28, 0.18]} c={lit ? "#ffe0a0" : "#e9e2cc"} />
          <B p={[k * T.wall.gate, 1.76, T.wall.z]} s={[0.26, 0.08, 0.26]} c="#3a3026" sh={false} />
        </group>
      ))}
      {T.sema.map((p, i) => <Sema key={i} p={p} />)}

      {/* bodhi tree with cloth sashes and wooden props under its branches */}
      <group position={[L.bodhi.x, 0, L.bodhi.z]}>
        <mesh position={[0, 2.2, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.62, 4.4, 7]} />
          <meshLambertMaterial color="#7a6a58" flatShading />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 0.28, 7]} />
          <meshLambertMaterial color={L.bodhi.cloth} />
        </mesh>
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.57, 0.57, 0.12, 7]} />
          <meshLambertMaterial color="#e85a8a" />
        </mesh>
        <Rod a={[0, 3.8, 0]} b={[1.9, 5.6, 0.6]} r={0.18} c="#7a6a58" />
        <Rod a={[0, 3.6, 0]} b={[-2.0, 5.3, -0.4]} r={0.18} c="#7a6a58" />
        {[[1.6, 0.9], [-1.8, 0.4], [0.6, 1.9]].map(([x, z], i) => (
          <Rod key={i} a={[x * 1.5, 0, z * 1.2]} b={[x, 4.6, z * 0.5]} r={0.06} c="#a0805a" />
        ))}
        <B p={[0, 0.2, 0]} s={[2.2, 0.4, 2.2]} c={WHITE} />
        {L.crowns.map((c, i) => (
          <mesh key={i} position={c.p} scale={c.s} castShadow>
            <icosahedronGeometry args={[1, 0]} />
            <meshLambertMaterial color={c.c} flatShading />
          </mesh>
        ))}
      </group>

      {/* lotus pots and flags */}
      {L.pots.map((p, i) => <LotusPot key={i} {...p} />)}
      {L.flags.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]}>
          <Rod a={[0, 0, 0]} b={[0, 4.2, 0]} r={0.035} c="#d8d4c8" />
          <mesh position={[0.45, 3.7, 0]}>
            <planeGeometry args={[0.9, 0.6]} />
            <meshLambertMaterial color={f.c} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.45, 3.7, 0.01]}>
            <ringGeometry args={[0.12, 0.17, 8]} />
            <meshLambertMaterial color="#b0362a" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      <Blobs blobs={blobs} y={0.03} />
    </>
  );
};
