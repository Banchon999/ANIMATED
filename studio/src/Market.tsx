import React, { useMemo } from "react";
import * as THREE from "three";
import { makeTex } from "./NightRoom";
import type { Blob } from "./Village";
import { rng, V3 } from "./lib";
import { Kit, KITS, SkyLights } from "./Light";
import { B, Blobs, Ground, Lit, Rod, shade, useKanit } from "./SetKit";

// Thai fresh market, real-world scale. A row of stalls (tables 0.78 high, z 0.25..1.15) stands under a
// corrugated lean-to roof (front edge 2.7 m at z 1.7, back 3.4 m at z -2.6) in front of a row of shophouses
// (facades at z -2.7). Bulbs and signs hang from the roof edge. The actors stand in the open aisle.
// Stall goods, cloths, signs, crates, umbrellas and shophouse colours come from the clip seed.

export const MARKET = {
  table: { z0: 0.25, z1: 1.15, top: 0.78 },
  stallsX: [-7.6, -5.7, -3.8, -1.9, 0, 1.9, 3.8, 5.7, 7.6], // stall centres, 1.7 m wide
  roof: { front: 1.7, back: -2.6, yFront: 2.7, yBack: 3.4, halfW: 9.6 },
  posts: [-9.5, -5.7, 5.7, 9.5], // roof posts along z 1.65 (none near the middle of the frame)
  bulbs: [-6.65, -4.75, -2.85, -0.95, 0.95, 2.85, 4.75, 6.65].map((x) => [x, 2.18, 1.5] as V3), // hanging bulbs
  signY: 2.28, // hanging stall signs, front at z 1.62
  facade: -2.7, // shophouse fronts
  actorZone: { x: [-2.0, 2.0], z: [2.2, 3.8] },
};

const WORDS = ["ผักสด", "ผลไม้", "ปลาสด", "หมูสด", "ไก่สด", "ไข่ไก่", "พริก", "มะม่วง", "ส้มหวาน", "กล้วย", "ของสด", "ราคาถูก", "แตงโม", "มะนาว"];
const SHOPS = ["ร้านทอง", "ขายส่ง", "โชห่วย", "ร้านยา", "เครื่องครัว", "ข้าวสาร"];
const GOODS = [
  { c: "#d8382c", s: 0.05 }, // tomatoes / chillies
  { c: "#6aa83a", s: 0.06 }, // limes
  { c: "#f0a020", s: 0.065 }, // oranges
  { c: "#f2cf3a", s: 0.08 }, // mangoes
  { c: "#4f8a3a", s: 0.12 }, // cabbages
  { c: "#6a3a7a", s: 0.06 }, // eggplants
  { c: "#efe6d0", s: 0.045 }, // garlic / eggs
  { c: "#c8502a", s: 0.055 }, // shallots
];

const concrete = (seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  c.fillStyle = "#9a9a92";
  c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "60,60,55" : "200,200,190"},${0.08 + r() * 0.12})`;
    c.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3);
  }
  for (let i = 0; i < 7; i++) {
    const x = r() * 512, y = r() * 512;
    const g = c.createRadialGradient(x, y, 0, x, y, 40 + r() * 70);
    g.addColorStop(0, "rgba(50,55,60,0.28)");
    g.addColorStop(1, "rgba(50,55,60,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 512);
  }
};

const corrugated = (c: CanvasRenderingContext2D) => {
  for (let x = 0; x < 128; x++) {
    const v = 0.5 + 0.5 * Math.sin((x / 128) * Math.PI * 16);
    c.fillStyle = `rgb(${150 + v * 50},${150 + v * 48},${146 + v * 44})`;
    c.fillRect(x, 0, 1, 128);
  }
  c.fillStyle = "rgba(140,80,40,0.25)";
  c.fillRect(0, 100, 128, 28);
};

const crateTex = (c: CanvasRenderingContext2D) => {
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, 64, 64);
  c.fillStyle = "rgba(0,0,0,0.45)";
  for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) c.fillRect(6 + x * 14, 8 + y * 18, 9, 11);
};

const signTex = (text: string, bg: string, fg: string, w = 384, h = 144) =>
  makeTex(w, h, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = fg;
    c.lineWidth = 8;
    c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = fg;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `700 ${Math.round(h * 0.52)}px Kanit`;
    c.fillText(text, w / 2, h / 2 + 4, w - 40);
  });

const Pile: React.FC<{ p: V3; c: string; s: number; seed: number; basket: string }> = ({ p, c, s, seed, basket }) => {
  const bits = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: 7 }).map(() => [(r() - 0.5) * 0.26, 0.13 + r() * 0.06, (r() - 0.5) * 0.22] as V3);
  }, [seed]);
  return (
    <group position={p}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.23, 0.18, 0.12, 8]} />
        <meshLambertMaterial color={basket} />
      </mesh>
      <mesh position={[0, 0.1, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.21, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshLambertMaterial color={c} />
      </mesh>
      {bits.map((b, i) => (
        <mesh key={i} position={b} scale={s}>
          <icosahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={shade(c, 0.85 + (i % 3) * 0.12)} flatShading />
        </mesh>
      ))}
    </group>
  );
};

const Scale: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <B p={[0, 0.1, 0]} s={[0.24, 0.2, 0.2]} c="#e8e4dc" />
    <mesh position={[0, 0.12, 0.101]}>
      <circleGeometry args={[0.08, 12]} />
      <meshBasicMaterial color="#fbfaf4" />
    </mesh>
    <mesh position={[0, 0.12, 0.1]}>
      <ringGeometry args={[0.08, 0.095, 12]} />
      <meshLambertMaterial color="#c0302a" />
    </mesh>
    <B p={[0.02, 0.14, 0.104]} s={[0.05, 0.008, 0.004]} c="#c0302a" r={[0, 0, 0.6]} sh={false} />
    <mesh position={[0, 0.22, 0]}>
      <cylinderGeometry args={[0.16, 0.13, 0.03, 12]} />
      <meshLambertMaterial color="#c8ccd0" />
    </mesh>
  </group>
);

export const Market: React.FC<{ seed: number; kit?: Kit; blobs?: Blob[] }> = ({ seed, kit = KITS.day, blobs = [] }) => {
  const M = MARKET;
  const fontReady = useKanit();
  const L = useMemo(() => {
    const r = rng(seed * 613 + 29);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const words = [...WORDS].sort(() => r() - 0.5);
    const stalls = M.stallsX.map((x, i) => ({
      x: x + (r() - 0.5) * 0.1,
      cloth: pick(["#2f6fb0", "#e86a8a", "#3f9a5a", "#f2f0e8", "#e8b030", "#7a4ab0"]),
      goods: Array.from({ length: 3 + Math.floor(r() * 2) }).map(() => pick(GOODS)),
      scale: r() < 0.3,
      bananas: r() < 0.25,
      sign: r() < 0.7 ? { text: words[i % words.length], bg: pick(["#f2d23a", "#ffffff", "#d8382c", "#2f6fb0", "#3f9a5a"]) } : null,
      crates: Array.from({ length: Math.floor(r() * 3) }).map((_, k) => ({ x: (r() - 0.5) * 1.2, k, c: pick(["#d8382c", "#2f6fb0", "#3f9a5a", "#e8b030"]) })),
    }));
    const front = Array.from({ length: 4 }).map((_, i) => ({ x: (i < 2 ? -1 : 1) * (3.4 + (i % 2) * 2.0 + r() * 0.6), z: 1.9 + r() * 0.5, c: pick(["#d8382c", "#2f6fb0", "#3f9a5a", "#e8b030"]), h: 1 + Math.floor(r() * 3) }));
    const umbrellas = [-1, 1].flatMap((k) => (r() < 0.8 ? [{ x: k * (3.8 + r() * 1.8), z: 5.4 + r() * 1.2, c: pick(["#d8382c", "#2f6fb0", "#3f9a5a", "#e8b030", "#e86a8a"]), c2: pick(["#ffffff", "#f2d23a"]) }] : []));
    const houses = Array.from({ length: 8 }).map((_, i) => ({
      x: -14 + i * 4,
      h: 3.6 + 3.2 * (2 + Math.floor(r() * 2)),
      c: pick(["#e8dcc0", "#d8c8a8", "#c8d4d8", "#e0c8b8", "#d4d8c0", "#e8e0d0", "#c0a890"]),
      shop: r() < 0.6 ? { text: pick(SHOPS), bg: pick(["#c0302a", "#1f4f86", "#2d7a4a", "#f2d23a"]) } : null,
      lit: [r(), r(), r(), r(), r(), r()],
      shade: r() < 0.5,
    }));
    const shades = M.bulbs.map(() => r() < 0.5);
    return { stalls, front, umbrellas, houses, shades };
  }, [seed, M.stallsX, M.bulbs]);
  const tx = useMemo(() => {
    const floor = makeTex(512, 512, concrete(seed + 3), [12, 12]);
    const roof = makeTex(128, 128, corrugated, [10, 2]);
    const crate = makeTex(64, 64, crateTex);
    const signs = L.stalls.map((s) => (s.sign ? signTex(s.sign.text, s.sign.bg, s.sign.bg === "#ffffff" || s.sign.bg === "#f2d23a" ? "#c0302a" : "#ffffff") : null));
    const shops = L.houses.map((h) => (h.shop ? signTex(h.shop.text, h.shop.bg, "#ffffff", 512, 128) : null));
    const umbrellas = L.umbrellas.map((u) =>
      makeTex(128, 16, (c) => {
        for (let k = 0; k < 8; k++) {
          c.fillStyle = k % 2 ? u.c : u.c2;
          c.fillRect(k * 16, 0, 16, 16);
        }
      }),
    );
    return { floor, roof, crate, signs, shops, umbrellas };
    // fontReady: redraw the signs once Kanit is in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, L, fontReady]);
  const lampOn = kit.lamps > 0;
  const R = M.roof;
  const roofLen = Math.hypot(R.front - R.back, R.yBack - R.yFront);
  const roofA = Math.atan2(R.yBack - R.yFront, R.front - R.back);
  const T = M.table;

  return (
    <>
      <SkyLights kit={kit} box={24} far={70} />
      {lampOn
        ? [-4.75, 0, 4.75].map((x) => <pointLight key={x} position={[x, 2.1, 1.9]} color="#ffcf8a" intensity={7 * kit.lamps} distance={7} decay={1.4} />)
        : null}

      {/* floor: wet concrete with a gutter in front of the stalls */}
      <Ground p={[0, 0, 0]} w={200} d={200} map={tx.floor} />
      <Ground p={[0, 0.005, 1.55]} w={40} d={0.18} c="#4a4c4c" />

      {/* shophouses behind */}
      {L.houses.map((h, i) => (
        <group key={i} position={[h.x, 0, M.facade - 0.6]}>
          <B p={[0, h.h / 2, -1]} s={[3.96, h.h, 2]} c={h.c} />
          <B p={[0, h.h + 0.2, -1]} s={[4.0, 0.4, 2.1]} c={shade(h.c, 0.8)} />
          {Array.from({ length: Math.round((h.h - 3.6) / 3.2) }).flatMap((_, f) =>
            [-0.95, 0.95].map((x, k) => {
              const y = 3.6 + f * 3.2 + 1.5;
              const v = h.lit[(f * 2 + k) % 6];
              return (
                <group key={`${f}${k}`}>
                  <Lit p={[x, y, 0.01]} s={[1.1, 1.3, 0.04]} c={v < kit.litWindows ? "#ffd590" : shade("#4a5a66", 0.9 + v * 0.3)} />
                  <B p={[x, y - 0.72, 0.12]} s={[1.3, 0.08, 0.26]} c={shade(h.c, 0.7)} sh={false} />
                </group>
              );
            }),
          )}
          {tx.shops[i] ? (
            <mesh position={[0, 3.95, 0.08]}>
              <planeGeometry args={[3.4, 0.85]} />
              {lampOn ? <meshBasicMaterial map={tx.shops[i]!} toneMapped={false} color="#d8d0c0" /> : <meshLambertMaterial map={tx.shops[i]!} />}
            </mesh>
          ) : null}
          {h.shade ? <B p={[0, 3.4, 0.5]} s={[3.8, 0.06, 1.0]} r={[0.25, 0, 0]} c={shade(h.c, 0.6)} sh={false} /> : null}
        </group>
      ))}

      {/* lean-to roof, posts */}
      <mesh position={[0, (R.yFront + R.yBack) / 2, (R.front + R.back) / 2]} rotation={[-Math.PI / 2 + roofA, 0, 0]} castShadow receiveShadow>
        <planeGeometry args={[R.halfW * 2, roofLen]} />
        <meshLambertMaterial map={tx.roof} side={THREE.DoubleSide} />
      </mesh>
      <B p={[0, R.yFront - 0.08, R.front]} s={[R.halfW * 2, 0.16, 0.08]} c="#6a6e70" sh={false} />
      {M.posts.map((x) => (
        <group key={x}>
          <Rod a={[x, 0, R.front - 0.05]} b={[x, R.yFront, R.front - 0.05]} r={0.05} c="#5a6266" />
          <Rod a={[x, 0, R.back + 0.2]} b={[x, R.yBack, R.back + 0.2]} r={0.05} c="#5a6266" />
        </group>
      ))}
      {/* dim back of the shed */}
      <B p={[0, 1.6, R.back - 0.05]} s={[R.halfW * 2, 3.2, 0.1]} c="#a89c88" sh={false} />
      {/* shelves of stock against the back */}
      {[0.9, 1.5].map((y) => <B key={y} p={[0, y, R.back + 0.2]} s={[R.halfW * 2, 0.05, 0.4]} c="#7a6a58" sh={false} />)}
      {L.stalls.map((s, i) => [0, 1, 2].map((k) => <B key={`${i}${k}`} p={[s.x - 0.5 + k * 0.5, 1.05 + (k % 2) * 0.6, R.back + 0.2]} s={[0.36, 0.26, 0.3]} c={["#d8b878", "#c86a4a", "#e8e0c8", "#6a9a5a"][(i + k) % 4]} sh={false} />))}

      {/* stalls */}
      {L.stalls.map((s, i) => (
        <group key={i} position={[s.x, 0, 0]}>
          <B p={[0, T.top - 0.02, (T.z0 + T.z1) / 2]} s={[1.7, 0.04, T.z1 - T.z0]} c={s.cloth} />
          <B p={[0, T.top - 0.2, T.z1 + 0.005]} s={[1.7, 0.36, 0.01]} c={shade(s.cloth, 0.85)} sh={false} />
          {[-0.8, 0.8].map((x) => <B key={x} p={[x, (T.top - 0.04) / 2, T.z0 + 0.05]} s={[0.05, T.top - 0.04, 0.05]} c="#6a5a48" sh={false} />)}
          {s.goods.map((g, k) => (
            <Pile key={k} p={[-0.55 + k * (1.1 / Math.max(1, s.goods.length - 1)), T.top, 0.75 + (k % 2) * 0.12]} c={g.c} s={g.s} seed={seed * 31 + i * 7 + k} basket={k % 2 ? "#a0784a" : "#8a6a3a"} />
          ))}
          {s.scale ? <Scale p={[0.62, T.top, 1.0]} /> : null}
          {s.bananas
            ? [0, 1, 2].map((k) => (
                <mesh key={k} position={[-0.2 + k * 0.16, T.top + 0.07, 0.42]} rotation={[0, 0, 0.5]}>
                  <torusGeometry args={[0.1, 0.03, 4, 6, Math.PI * 0.8]} />
                  <meshLambertMaterial color="#e8c83a" />
                </mesh>
              ))
            : null}
          {s.crates.map((c) => (
            <mesh key={c.k} position={[c.x, 0.15, -0.2 + c.k * 0.02]} castShadow>
              <boxGeometry args={[0.5, 0.3, 0.38]} />
              <meshLambertMaterial color={c.c} map={tx.crate} />
            </mesh>
          ))}
          {/* sign hanging from the roof edge */}
          {tx.signs[i] ? (
            <group>
              <Rod a={[-0.38, M.signY + 0.2, R.front - 0.08]} b={[-0.38, R.yFront - 0.1, R.front - 0.08]} r={0.006} c="#333" seg={3} sh={false} />
              <Rod a={[0.38, M.signY + 0.2, R.front - 0.08]} b={[0.38, R.yFront - 0.1, R.front - 0.08]} r={0.006} c="#333" seg={3} sh={false} />
              <mesh position={[0, M.signY, R.front - 0.08]}>
                <planeGeometry args={[0.95, 0.36]} />
                <meshLambertMaterial map={tx.signs[i]!} side={THREE.DoubleSide} />
              </mesh>
            </group>
          ) : null}
        </group>
      ))}

      {/* bulbs on wires */}
      {M.bulbs.map((p, i) => (
        <group key={i}>
          <Rod a={[p[0], p[1] + 0.06, p[2]]} b={[p[0], R.yFront - 0.12, p[2]]} r={0.005} c="#222" seg={3} sh={false} />
          {L.shades[i] ? (
            <mesh position={[p[0], p[1] + 0.09, p[2]]}>
              <coneGeometry args={[0.13, 0.1, 8, 1, true]} />
              <meshLambertMaterial color="#e8e4d8" side={THREE.DoubleSide} />
            </mesh>
          ) : null}
          <mesh position={p}>
            <sphereGeometry args={[0.055, 8, 6]} />
            <meshBasicMaterial color={lampOn ? "#fff1c8" : "#d8d4c4"} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* crates stacked at the aisle edge, beside the frame */}
      {L.front.map((c, i) =>
        Array.from({ length: c.h }).map((_, k) => (
          <mesh key={`${i}-${k}`} position={[c.x, 0.15 + k * 0.3, c.z]} rotation={[0, (k % 2) * 0.12, 0]} castShadow>
            <boxGeometry args={[0.5, 0.3, 0.38]} />
            <meshLambertMaterial color={c.c} map={tx.crate} />
          </mesh>
        )),
      )}
      {/* umbrella stalls on the near side, outside the wide frame */}
      {L.umbrellas.map((u, i) => (
        <group key={i} position={[u.x, 0, u.z]}>
          <Rod a={[0, 0, 0]} b={[0, 2.35, 0]} r={0.025} c="#d8d8d0" />
          <mesh position={[0, 2.25, 0]} castShadow>
            <coneGeometry args={[1.3, 0.45, 16, 1, true]} />
            <meshLambertMaterial map={tx.umbrellas[i]} side={THREE.DoubleSide} />
          </mesh>
          <B p={[0, 0.72, 0]} s={[1.2, 0.04, 0.8]} c="#e8e4dc" />
          <B p={[0, 0.36, 0]} s={[1.1, 0.7, 0.7]} c="#8a8478" />
        </group>
      ))}

      <Blobs blobs={blobs} y={0.02} c="#2a2a26" o={0.3} />
    </>
  );
};
