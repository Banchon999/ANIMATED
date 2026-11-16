import React, { useMemo } from "react";
import * as THREE from "three";
import { makeTex } from "./NightRoom";
import type { Blob } from "./Village";
import { rng, V3 } from "./lib";
import { TimeOfDay } from "./Light";
import { B, Blobs, Lit, Rod, shade, useKanit } from "./SetKit";

// Thai shophouse grocery (โชห่วย) seen from inside, real-world scale. The open shop front is the back of the
// frame (z 0): folding doors pushed to both sides, the street in daylight beyond. Room x ±2.1, ceiling 3.0,
// walls run on to z 12 so wide cameras stay inside. Fridge of drinks left of the opening (glass door to the
// camera), glass-front counter with the cash register and a jar of sweets on the right, shelves of goods
// along both walls, rice sacks, a wall fan, a calendar. The actors stand in the aisle in front of the counter.
// Goods, colours, sacks, signs, the calendar and the street outside come from the clip seed.

export const SHOP = {
  halfW: 2.1,
  ceiling: 3.0,
  opening: { x0: -1.25, x1: 1.6, h: 2.5 }, // shop front at z 0; folded doors stand at its two edges
  sign: [0.18, 2.76, 0.03] as V3, // shop-name board on the lintel above the opening
  fridge: { x0: -2.05, x1: -1.4, z0: 0.08, z1: 0.76, h: 1.95 }, // glass door faces the camera
  counter: { x0: 0.75, x1: 2.05, z0: 1.25, z1: 1.9, top: 0.95 }, // glass front faces the camera
  register: [1.6, 0.95, 1.55] as V3,
  jar: [1.0, 0.95, 1.62] as V3,
  shelves: { left: { z0: 1.0, z1: 6.5 }, right: { z0: 2.2, z1: 6.5 }, depth: 0.38, h: 2.25 }, // along both walls
  calendar: [-1.72, 2.45, 0.02] as V3, // on the front wall above the fridge
  fan: [1.85, 2.38, 0.0] as V3, // wall fan on the front wall right of the opening, facing the room, sweeping
  tubes: [[0, 2.96, 1.8], [0, 2.96, 4.6]] as V3[], // fluorescent tubes (lit at evening / night)
  sacks: [-0.85, 0, 1.15] as V3, // stacked rice sacks
  actorZone: { x: [-1.3, 0.5], z: [2.4, 3.8] },
};

/** Room light per time; "day" is the default. */
const SHOP_LIGHT: Record<TimeOfDay, { amb: string; ambI: number; hemi: [string, string, number]; sun: string; sunI: number; lamp: number }> = {
  day: { amb: "#f2ece2", ambI: 1.05, hemi: ["#fff6ea", "#8a7a68", 0.75], sun: "#fff2dc", sunI: 2.2, lamp: 0 },
  morning: { amb: "#f2e6da", ambI: 0.95, hemi: ["#ffeedd", "#8a7a68", 0.7], sun: "#ffd8a8", sunI: 2.3, lamp: 0 },
  evening: { amb: "#e8d6c6", ambI: 0.75, hemi: ["#f0d0b8", "#6a5a50", 0.55], sun: "#ffa868", sunI: 1.4, lamp: 0.85 },
  night: { amb: "#c8c6d8", ambI: 0.6, hemi: ["#c8d0ec", "#4a4440", 0.4], sun: "#8fa8ff", sunI: 0.2, lamp: 1 },
};

/** The street outside is unlit by the room: colours are graded per time instead. */
const outside = (time: TimeOfDay) => (hex: string, glow = false) => {
  const c = new THREE.Color(hex);
  if (glow && (time === "night" || time === "evening")) return `#${c.getHexString()}`;
  if (time === "day") c.lerp(new THREE.Color("#ffffff"), 0.2);
  if (time === "morning") c.lerp(new THREE.Color("#ffe8d0"), 0.3);
  if (time === "evening") c.multiply(new THREE.Color("#e0a880"));
  if (time === "night") c.multiply(new THREE.Color("#28324e"));
  return `#${c.getHexString()}`;
};

const tiles = (a: string, b: string) => (c: CanvasRenderingContext2D) => {
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      c.fillStyle = (x + y) % 2 ? a : b;
      c.fillRect(x * 64, y * 64, 64, 64);
    }
  c.strokeStyle = "rgba(80,70,60,0.35)";
  c.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    c.beginPath();
    c.moveTo(i * 64, 0);
    c.lineTo(i * 64, 256);
    c.moveTo(0, i * 64);
    c.lineTo(256, i * 64);
    c.stroke();
  }
};

const text = (w: number, h: number, lines: { t: string; size: number; y: number; c: string }[], bg: string, border?: string) =>
  makeTex(w, h, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    if (border) {
      c.strokeStyle = border;
      c.lineWidth = 8;
      c.strokeRect(6, 6, w - 12, h - 12);
    }
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (const l of lines) {
      c.fillStyle = l.c;
      c.font = `700 ${l.size}px Kanit`;
      c.fillText(l.t, w / 2, l.y, w - 24);
    }
  });

const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const calendar = (seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  c.fillStyle = "#fbf8f0";
  c.fillRect(0, 0, 256, 352);
  // picture: hills, sky, a field (no people)
  const sky = ["#7ab8e8", "#f2b27a", "#9ad0e0"][Math.floor(r() * 3)];
  c.fillStyle = sky;
  c.fillRect(12, 12, 232, 140);
  c.fillStyle = "#5a9a5a";
  c.beginPath();
  c.moveTo(12, 152);
  c.lineTo(12, 100);
  c.quadraticCurveTo(90, 50 + r() * 30, 160, 110);
  c.quadraticCurveTo(200, 80, 244, 96);
  c.lineTo(244, 152);
  c.fill();
  c.fillStyle = "#e8c84a";
  c.fillRect(12, 130, 232, 22);
  c.fillStyle = "#c0302a";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = "700 40px Kanit";
  c.fillText(MONTHS[Math.floor(r() * 12)], 128, 182);
  c.font = "700 20px Kanit";
  for (let i = 0; i < 31; i++) {
    const x = 26 + (i % 7) * 34;
    const y = 222 + Math.floor(i / 7) * 28;
    c.fillStyle = i % 7 === 0 ? "#c0302a" : "#2a2a2a";
    c.fillText(String(i + 1), x, y);
  }
};

const NAMES = ["ร้านป้าศรี", "ร้านเจ๊หมวย", "ร้านลุงชัย", "ร้านยายพร", "ร้านน้าแดง", "ร้านพี่ต้อม"];
const GOODS = ["#d8382c", "#f2c230", "#2f6fb0", "#3f9a5a", "#e86a2a", "#e85a8a", "#f2f0e8", "#7a4ab0", "#2ab0c8", "#8a5a2a", "#e8e4dc", "#c8302a"];

/** Instanced packets: one mesh for many coloured boxes. */
const Packs: React.FC<{ items: { p: V3; s: V3; c: string }[] }> = ({ items }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), items.length);
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.scale.set(...it.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, new THREE.Color(it.c));
    });
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }, [items]);
  return <primitive object={mesh} />;
};
const Bottles: React.FC<{ items: { p: V3; h: number; c: string }[]; basic?: boolean }> = ({ items, basic }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 7), basic ? new THREE.MeshBasicMaterial() : new THREE.MeshLambertMaterial(), items.length);
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(it.p[0], it.p[1] + it.h / 2, it.p[2]);
      o.scale.set(0.065, it.h, 0.065);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, new THREE.Color(it.c));
    });
    return m;
  }, [items, basic]);
  return <primitive object={mesh} />;
};

export const Shop: React.FC<{ seed: number; time?: TimeOfDay; frame?: number; blobs?: Blob[] }> = ({ seed, time = "day", frame = 0, blobs = [] }) => {
  const S = SHOP;
  const W2 = S.halfW * 2;
  const D = 12;
  const LT = SHOP_LIGHT[time];
  const lampOn = LT.lamp > 0;
  const out = outside(time);
  const fontReady = useKanit();
  const L = useMemo(() => {
    const r = rng(seed * 367 + 23);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const wall = pick(["#e8e2c8", "#d8e4d8", "#e4dccc", "#d4e0e8", "#ecd8c0", "#e0e8d0"]);
    // shelf goods along a wall: x of the shelf front, z range, facing direction
    const shelf = (side: number, z0: number, z1: number) => {
      const items: { p: V3; s: V3; c: string }[] = [];
      const x0 = side * (S.halfW - S.shelves.depth / 2);
      for (let lv = 0; lv < 5; lv++) {
        const y = 0.12 + lv * 0.44;
        let z = z0 + 0.04;
        while (z < z1 - 0.12) {
          const w = 0.1 + r() * 0.22;
          const h = 0.12 + r() * 0.24;
          const d = 0.12 + r() * 0.18;
          const col = pick(GOODS);
          const stack = r() < 0.35 ? 2 : 1;
          for (let k = 0; k < stack; k++) items.push({ p: [x0 - side * (0.17 - d / 2) + (r() - 0.5) * 0.02, y + h / 2 + k * h, z + w / 2], s: [d, h * 0.98, w * 0.94], c: col });
          z += w + 0.02;
        }
      }
      return items;
    };
    const packs = [...shelf(-1, S.shelves.left.z0, S.shelves.left.z1), ...shelf(1, S.shelves.right.z0, S.shelves.right.z1)];
    // strips of snack packets hanging from the lintel of the opening
    const strips = Array.from({ length: 6 }).flatMap((_, i) => {
      if (r() < 0.35) return [];
      const x = S.opening.x0 + 0.35 + i * 0.44 + (r() - 0.5) * 0.08;
      const c = pick(GOODS);
      return Array.from({ length: 2 + Math.floor(r() * 2) }).map((__, k) => ({ p: [x, S.opening.h - 0.1 - k * 0.12, 0.12] as V3, s: [0.11, 0.1, 0.02] as V3, c: k % 2 ? c : shade(c, 0.85) }));
    });
    // counter showcase goods and the fridge bottles
    const show = Array.from({ length: 2 }).flatMap((_, lv) =>
      Array.from({ length: 9 }).map((__, k) => ({ p: [S.counter.x0 + 0.12 + k * 0.14, 0.12 + lv * 0.38 + 0.08, S.counter.z1 - 0.2] as V3, s: [0.1, 0.16, 0.1] as V3, c: pick(GOODS) })),
    );
    const bottles = Array.from({ length: 4 }).flatMap((_, lv) =>
      Array.from({ length: 6 }).map((__, k) => ({ p: [S.fridge.x0 + 0.08 + k * 0.1, 0.18 + lv * 0.42, S.fridge.z1 - 0.2] as V3, h: 0.22 + (lv % 2) * 0.06, c: pick(["#d8382c", "#3f9a5a", "#f2c230", "#2f6fb0", "#e86a2a", "#f2f0e8", "#7a3a20"]) })),
    );
    const sweets = Array.from({ length: 16 }).map(() => ({ p: [(r() - 0.5) * 0.14, 0.04 + r() * 0.16, (r() - 0.5) * 0.14] as V3, c: pick(["#e85a8a", "#f2c230", "#3f9a5a", "#2ab0c8", "#d8382c", "#f2f0e8"]) }));
    const sacks = Array.from({ length: 2 + Math.floor(r() * 3) }).map((_, k) => ({ p: [S.sacks[0] + (k % 2) * 0.12 - 0.06, 0.13 + k * 0.24, S.sacks[2] + (r() - 0.5) * 0.1] as V3, ry: (r() - 0.5) * 0.3, c: pick(["#f2eee2", "#e8e0c8", "#f4f0e8"]) }));
    const houses = Array.from({ length: 4 }).map((_, i) => ({ x: -6 + i * 4, c: pick(["#e8dcc0", "#d8c8a8", "#c8d4d8", "#e0c8b8", "#d4d8c0", "#c8b8a0"]), shop: pick(["#4a3a30", "#3a4048", "#5a4a3a"]), lit: r(), awn: pick(["#2f6fb0", "#d8382c", "#3f9a5a", "#e8b030"]) }));
    const bike = r() < 0.7 ? { x: -0.6 + r() * 1.6, c: pick(["#c0302a", "#1f4f86", "#2a2a2c", "#e8e4dc"]) } : null;
    return {
      wall,
      dado: shade(wall, 0.82),
      floorA: pick(["#e8dcc8", "#d8d0c0", "#e0d8cc"]),
      floorB: pick(["#b8664a", "#8a9aa8", "#c8b89a", "#a8b8a0"]),
      wood: pick(["#8a6a4a", "#a87a50", "#6a5038", "#c0a07a"]),
      fridge: pick(["#f2f2ee", "#d8382c", "#2f6fb0"]),
      name: pick(NAMES),
      packs, strips, show, bottles, sweets, sacks, houses, bike,
    };
  }, [seed, S]);

  const tx = useMemo(() => {
    const floor = makeTex(256, 256, tiles(L.floorA, L.floorB), [W2 / 0.8, D / 0.8]);
    const cal = makeTex(256, 352, calendar(seed + 5));
    const sign = text(512, 160, [{ t: L.name, size: 70, y: 66, c: "#ffffff" }, { t: "ขายของชำ ราคาถูก", size: 34, y: 124, c: "#ffe680" }], "#c0302a", "#ffe680");
    const fridgeHead = text(256, 64, [{ t: "เครื่องดื่มเย็น", size: 38, y: 34, c: "#ffffff" }], "#1f6fb0");
    const sack = text(128, 160, [{ t: "ข้าวหอม", size: 30, y: 60, c: "#c0302a" }, { t: "5 กก.", size: 26, y: 100, c: "#2d7a4a" }], "#f4f0e6");
    return { floor, cal, sign, fridgeHead, sack };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, L, W2, fontReady]);

  const O = S.opening;
  const C = S.counter;
  const Fr = S.fridge;
  const fanA = Math.sin((frame / 30) * 0.9) * 0.7;
  const blade = (frame / 30) * 40;

  return (
    <>
      <ambientLight color={LT.amb} intensity={LT.ambI} />
      <hemisphereLight args={LT.hemi} />
      {/* daylight from the street, low through the open front: aimed through the origin */}
      <directionalLight
        position={[1.2, 4.2, -9]}
        intensity={LT.sunI}
        color={LT.sun}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.001}
      />
      <directionalLight position={[-1, 4, 9]} intensity={0.3 * LT.ambI} color="#f0f0f4" />
      {lampOn ? S.tubes.map((p, i) => <pointLight key={i} position={[p[0], p[1] - 0.25, p[2]]} color="#f4fbff" intensity={6 * LT.lamp} distance={8} decay={1.3} />) : null}
      <pointLight position={[Fr.x0 + 0.3, 1.0, Fr.z1 + 0.3]} color="#d8f0ff" intensity={0.8} distance={2.2} decay={1.6} />

      {/* floor, ceiling, walls */}
      <mesh position={[0, 0, D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W2, D]} />
        <meshLambertMaterial map={tx.floor} />
      </mesh>
      <B p={[0, S.ceiling + 0.05, D / 2 - 0.2]} s={[W2 + 0.4, 0.1, D + 0.4]} c="#f2f0ea" />
      {[-1, 1].map((k) => (
        <group key={k}>
          <B p={[k * (S.halfW + 0.05), S.ceiling / 2, D / 2]} s={[0.1, S.ceiling, D]} c={L.wall} />
          <B p={[k * (S.halfW - 0.005), 0.5, D / 2]} s={[0.01, 1.0, D]} c={L.dado} sh={false} />
        </group>
      ))}
      {/* front wall around the opening (casts the shadow that shapes the patch of daylight) */}
      <B p={[(-S.halfW + O.x0) / 2, S.ceiling / 2, -0.05]} s={[O.x0 + S.halfW, S.ceiling, 0.1]} c={L.wall} />
      <B p={[(S.halfW + O.x1) / 2, S.ceiling / 2, -0.05]} s={[S.halfW - O.x1, S.ceiling, 0.1]} c={L.wall} />
      <B p={[(O.x0 + O.x1) / 2, (S.ceiling + O.h) / 2, -0.05]} s={[O.x1 - O.x0, S.ceiling - O.h, 0.1]} c={shade(L.wall, 0.92)} />
      {/* folding doors pushed to the sides: zigzag panels */}
      {[O.x0, O.x1].map((x, k) =>
        Array.from({ length: 4 }).map((_, j) => (
          <B key={`${k}${j}`} p={[x + (k ? 1 : -1) * 0.02 + (k ? -1 : 1) * 0.0, O.h / 2, 0.06 + j * 0.0]} s={[0.04, O.h, 0.3]} r={[0, (j % 2 ? 1 : -1) * 0.6 + (k ? 0.3 : -0.3), 0]} c={shade("#6a7a86", 0.9 + (j % 2) * 0.12)} />
        )),
      )}
      <B p={[(O.x0 + O.x1) / 2, O.h + 0.02, 0.02]} s={[O.x1 - O.x0, 0.06, 0.12]} c="#5a646a" sh={false} />
      {/* shop-name board on the lintel */}
      <mesh position={S.sign}>
        <planeGeometry args={[1.45, 0.45]} />
        <meshLambertMaterial map={tx.sign} />
      </mesh>

      {/* the street outside (not lit by the room) */}
      <group>
        <mesh position={[0, -0.12, -1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[14, 2]} />
          <meshBasicMaterial color={out("#c8c2b6")} />
        </mesh>
        <mesh position={[0, -0.27, -5.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[30, 6.4]} />
          <meshBasicMaterial color={out("#7a7a7c")} />
        </mesh>
        {L.houses.map((h, i) => (
          <group key={i} position={[h.x, 0, -8.6]}>
            <mesh position={[0, 3.5, 0]}>
              <boxGeometry args={[3.96, 8, 0.4]} />
              <meshBasicMaterial color={out(h.c)} />
            </mesh>
            <mesh position={[0, 1.3, 0.22]}>
              <boxGeometry args={[3.2, 2.6, 0.02]} />
              <meshBasicMaterial color={h.lit < 0.7 && (time === "night" || time === "evening") ? out("#ffd090", true) : out(h.shop)} />
            </mesh>
            <mesh position={[0, 2.85, 0.6]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[3.6, 0.04, 1.0]} />
              <meshBasicMaterial color={out(h.awn)} />
            </mesh>
            <mesh position={[0.9, 4.9, 0.22]}>
              <boxGeometry args={[1.0, 1.1, 0.02]} />
              <meshBasicMaterial color={h.lit < 0.5 && time === "night" ? "#ffd590" : out("#5a6a76")} />
            </mesh>
          </group>
        ))}
        {L.bike ? (
          <group position={[L.bike.x, -0.27, -3.6]}>
            {[-0.65, 0.62].map((x) => (
              <mesh key={x} position={[x, 0.29, 0]}>
                <torusGeometry args={[0.24, 0.06, 5, 12]} />
                <meshBasicMaterial color={out("#222224")} />
              </mesh>
            ))}
            <mesh position={[-0.1, 0.55, 0]}>
              <boxGeometry args={[1.0, 0.3, 0.26]} />
              <meshBasicMaterial color={out(L.bike.c)} />
            </mesh>
            <mesh position={[-0.25, 0.76, 0]}>
              <boxGeometry args={[0.62, 0.1, 0.28]} />
              <meshBasicMaterial color={out("#2a2624")} />
            </mesh>
          </group>
        ) : null}
        <mesh position={[-0.6, 4, -1.8]}>
          <cylinderGeometry args={[0.1, 0.13, 8, 6]} />
          <meshBasicMaterial color={out("#a8a8a2")} />
        </mesh>
      </group>
      {/* hanging snack strips */}
      <Packs items={L.strips} />

      {/* fridge with drinks: glass door to the camera, lit inside */}
      <group>
        <B p={[(Fr.x0 + Fr.x1) / 2, Fr.h / 2, (Fr.z0 + Fr.z1) / 2]} s={[Fr.x1 - Fr.x0, Fr.h, Fr.z1 - Fr.z0]} c={L.fridge} />
        <Lit p={[(Fr.x0 + Fr.x1) / 2, 0.95, Fr.z1 - 0.32]} s={[Fr.x1 - Fr.x0 - 0.08, 1.6, 0.01]} c={lampOn || time !== "night" ? "#e8f4ff" : "#c8dcf0"} />
        <Bottles items={L.bottles} />
        {[0.15, 0.57, 0.99, 1.41].map((y) => <B key={y} p={[(Fr.x0 + Fr.x1) / 2, y, Fr.z1 - 0.2]} s={[Fr.x1 - Fr.x0 - 0.08, 0.02, 0.36]} c="#c8d0d8" sh={false} />)}
        <mesh position={[(Fr.x0 + Fr.x1) / 2, 0.95, Fr.z1 + 0.005]}>
          <planeGeometry args={[Fr.x1 - Fr.x0 - 0.06, 1.62]} />
          <meshLambertMaterial color="#d8f0ff" transparent opacity={0.22} />
        </mesh>
        <B p={[Fr.x1 - 0.06, 1.0, Fr.z1 + 0.03]} s={[0.03, 0.4, 0.03]} c="#9a9a98" sh={false} />
        <mesh position={[(Fr.x0 + Fr.x1) / 2, 1.83, Fr.z1 + 0.01]}>
          <planeGeometry args={[Fr.x1 - Fr.x0 - 0.04, 0.16]} />
          <meshBasicMaterial map={tx.fridgeHead} toneMapped={false} />
        </mesh>
      </group>

      {/* calendar above the fridge */}
      <mesh position={S.calendar}>
        <planeGeometry args={[0.42, 0.58]} />
        <meshLambertMaterial map={tx.cal} />
      </mesh>
      <Rod a={[S.calendar[0], S.calendar[1] + 0.3, 0.02]} b={[S.calendar[0], S.calendar[1] + 0.36, 0.02]} r={0.008} c="#333" sh={false} />

      {/* shelves along both walls */}
      {[-1, 1].map((side) => {
        const sh = side < 0 ? S.shelves.left : S.shelves.right;
        const x = side * (S.halfW - S.shelves.depth / 2);
        const zc = (sh.z0 + sh.z1) / 2;
        const len = sh.z1 - sh.z0;
        return (
          <group key={side}>
            {[0, 1, 2, 3, 4, 5].map((lv) => <B key={lv} p={[x, 0.1 + lv * 0.44, zc]} s={[S.shelves.depth, 0.03, len]} c={L.wood} sh={false} />)}
            {[sh.z0, (sh.z0 + sh.z1) / 2, sh.z1].map((z) => <B key={z} p={[x, S.shelves.h / 2, z]} s={[S.shelves.depth, S.shelves.h, 0.04]} c={shade(L.wood, 0.85)} />)}
          </group>
        );
      })}
      <Packs items={L.packs} />

      {/* glass-front counter, cash register, jar of sweets, sign */}
      <group>
        <B p={[(C.x0 + C.x1) / 2, 0.06, (C.z0 + C.z1) / 2]} s={[C.x1 - C.x0, 0.12, C.z1 - C.z0]} c={shade(L.wood, 0.7)} />
        <B p={[(C.x0 + C.x1) / 2, C.top - 0.02, (C.z0 + C.z1) / 2]} s={[C.x1 - C.x0 + 0.04, 0.04, C.z1 - C.z0 + 0.04]} c={L.wood} />
        <B p={[(C.x0 + C.x1) / 2, (C.top + 0.12) / 2, C.z0 + 0.03]} s={[C.x1 - C.x0, C.top - 0.12, 0.06]} c={shade(L.wood, 0.85)} />
        {[C.x0 + 0.02, C.x1 - 0.02].map((x) => <B key={x} p={[x, C.top / 2, C.z1 - 0.02]} s={[0.04, C.top, 0.04]} c={shade(L.wood, 0.8)} sh={false} />)}
        <B p={[(C.x0 + C.x1) / 2, 0.5, C.z1 - 0.2]} s={[C.x1 - C.x0 - 0.06, 0.02, 0.36]} c="#d8dcd8" sh={false} />
        <Packs items={L.show} />
        <mesh position={[(C.x0 + C.x1) / 2, (C.top + 0.12) / 2, C.z1]}>
          <planeGeometry args={[C.x1 - C.x0 - 0.06, C.top - 0.14]} />
          <meshLambertMaterial color="#d8eef4" transparent opacity={0.25} />
        </mesh>
        {/* cash register */}
        <group position={S.register}>
          <B p={[0, 0.06, 0]} s={[0.38, 0.12, 0.34]} c="#3a3c40" />
          <B p={[0, 0.16, 0.04]} s={[0.34, 0.08, 0.22]} r={[0.35, 0, 0]} c="#4a4c50" />
          {Array.from({ length: 12 }).map((_, k) => <B key={k} p={[-0.1 + (k % 4) * 0.065, 0.205 - Math.floor(k / 4) * 0.02, 0.1 - Math.floor(k / 4) * 0.05]} s={[0.04, 0.012, 0.035]} c={k === 11 ? "#d8382c" : "#e8e8e4"} sh={false} />)}
          <B p={[0, 0.3, -0.1]} s={[0.22, 0.12, 0.03]} r={[-0.2, 0, 0]} c="#2a2c30" />
          <Lit p={[0, 0.3, -0.083]} s={[0.18, 0.08, 0.005]} r={[-0.2, 0, 0]} c="#7ae0a0" />
        </group>
        {/* jar of sweets */}
        <group position={S.jar}>
          {L.sweets.map((s, k) => (
            <mesh key={k} position={s.p}>
              <sphereGeometry args={[0.028, 6, 4]} />
              <meshLambertMaterial color={s.c} />
            </mesh>
          ))}
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.24, 12, 1, true]} />
            <meshLambertMaterial color="#e8f4f8" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <cylinderGeometry args={[0.085, 0.085, 0.04, 12]} />
            <meshLambertMaterial color="#d8382c" />
          </mesh>
        </group>
      </group>

      {/* rice sacks */}
      {L.sacks.map((s, k) => (
        <group key={k} position={s.p} rotation={[0, s.ry, 0]}>
          <mesh scale={[0.46, 0.24, 0.66]} castShadow receiveShadow>
            <sphereGeometry args={[0.62, 10, 6]} />
            <meshLambertMaterial color={s.c} />
          </mesh>
          <mesh position={[0, 0.02, 0.3]} rotation={[-0.25, 0, 0]}>
            <planeGeometry args={[0.32, 0.18]} />
            <meshLambertMaterial map={tx.sack} transparent opacity={0.92} />
          </mesh>
        </group>
      ))}

      {/* wall fan over the counter, sweeping */}
      <group position={S.fan}>
        <B p={[0, 0, 0.04]} s={[0.12, 0.16, 0.08]} c="#e8e8e4" />
        <group rotation={[-0.3, fanA * 0.6 - 0.25, 0]}>
          <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.08, 0.16, 10]} />
            <meshLambertMaterial color="#e8e8e4" />
          </mesh>
          <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.12, 14, 1, true]} />
            <meshLambertMaterial color="#9ab8d8" side={THREE.DoubleSide} transparent opacity={0.6} />
          </mesh>
          <group position={[0, 0, 0.3]} rotation={[0, 0, blade]}>
            {[0, 1, 2].map((k) => <B key={k} p={[Math.cos((k * Math.PI * 2) / 3) * 0.1, Math.sin((k * Math.PI * 2) / 3) * 0.1, 0]} s={[0.16, 0.08, 0.01]} r={[0, 0, (k * Math.PI * 2) / 3]} c="#7aa0c8" sh={false} />)}
          </group>
        </group>
      </group>

      {/* fluorescent tubes */}
      {S.tubes.map((p, i) => (
        <group key={i} position={p}>
          <B p={[0, 0, 0]} s={[1.25, 0.05, 0.12]} c="#e8e8e4" sh={false} />
          <Lit p={[0, -0.04, 0]} s={[1.2, 0.03, 0.03]} c={lampOn ? "#f8fcff" : "#dcdcd8"} />
        </group>
      ))}

      <Blobs blobs={blobs} y={0.01} c="#3a3430" o={0.24} />
    </>
  );
};
