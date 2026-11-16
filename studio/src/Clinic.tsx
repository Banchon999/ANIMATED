import React, { useMemo } from "react";
import * as THREE from "three";
import { makeTex } from "./NightRoom";
import type { Blob } from "./Village";
import { rng, V3 } from "./lib";

// 1970s hospital room, real-world scale (1 unit = 1 m). Back wall at z = 0, room x -3.4..3.4,
// ceiling 2.8. Floor, ceiling and side walls run on to z = 15 so wide cameras stay "inside".

export const CLINIC = {
  halfW: 3.4,
  ceiling: 2.8,
  dado: 1.25, // top of the darker lower wall band
  bed: { x0: 0.2, x1: 2.1, z0: 0.5, z1: 1.5, top: 0.55 }, // head end at x1
  pillow: [1.85, 0.62, 1.0] as V3,
  cabinet: [-1.5, 0, 0.4] as V3, // medicine cabinet (floor point, front at z 0.6)
  chart: [-0.5, 1.6, 0.01] as V3, // eye chart centre on the back wall
  window: { x: 1.15, y: 1.55, w: 1.1, h: 1.3 }, // sill at 0.9
  door: { x: -2.75, w: 0.85, h: 1.95 },
  lamp: [0.2, 2.42, 2.2] as V3, // ceiling lamp bulb
  actorZone: { x: [-1.6, 1.4], z: [2.0, 3.6] },
};

const paint = (h: number, s: number, l: number, seed: number) => (c: CanvasRenderingContext2D) => {
  const S = 256;
  const r = rng(seed);
  c.fillStyle = `hsl(${h} ${s}% ${l}%)`;
  c.fillRect(0, 0, S, S);
  for (let i = 0; i < 700; i++) {
    c.fillStyle = `hsla(${h} ${s}% ${l + (r() - 0.5) * 8}% / 0.35)`;
    c.fillRect(r() * S, r() * S, 2 + r() * 4, 2 + r() * 4);
  }
};

const useTextures = () =>
  useMemo(() => {
    const wall = makeTex(256, 256, paint(135, 22, 79, 2), [4, 2]);
    const dado = makeTex(256, 256, paint(145, 18, 58, 3), [4, 1]);
    const floor = makeTex(512, 512, (c) => {
      const r = rng(8);
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          const l = ((x + y) % 2 ? 70 : 58) + (r() - 0.5) * 3;
          c.fillStyle = `hsl(48 12% ${l}%)`;
          c.fillRect(x * 64, y * 64, 64, 64);
        }
      c.fillStyle = "rgba(60,55,40,0.25)";
      for (let i = 0; i < 9; i++) {
        c.fillRect(i * 64, 0, 1, 512);
        c.fillRect(0, i * 64, 512, 1);
      }
    }, [6.8 / 2.4, 15 / 2.4]);
    const day = makeTex(256, 320, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 320);
      g.addColorStop(0, "#bfdcf3");
      g.addColorStop(1, "#eef6fa");
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 320);
      c.fillStyle = "#d9dcd6";
      c.fillRect(150, 150, 120, 170); // building across the yard
      c.fillStyle = "#b9c2c6";
      for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) c.fillRect(162 + x * 34, 165 + y * 38, 20, 24);
      const r = rng(4);
      c.fillStyle = "#8fb383";
      for (let i = 0; i < 14; i++) {
        c.beginPath();
        c.arc(r() * 160, 210 + r() * 60, 28 + r() * 26, 0, 7);
        c.fill();
      }
      c.fillStyle = "#e9eee6";
      c.fillRect(40, 200, 4, 120);
      c.fillRect(100, 215, 4, 105);
    });
    const chart = makeTex(192, 320, (c) => {
      c.fillStyle = "#f6f5ef";
      c.fillRect(0, 0, 192, 320);
      c.fillStyle = "#151515";
      c.textAlign = "center";
      const rows = ["Ш Б", "М Н К", "Ы М Б Ш", "Б Ы Н К М", "И Н Ш М К", "Н Ш Ы И К Б", "Ш И Н Б К Ы"];
      rows.forEach((t, i) => {
        const size = 48 - i * 6;
        c.font = `bold ${size}px sans-serif`;
        c.fillText(t, 96, 52 + i * 40 - i * i * 1.2);
      });
      c.fillStyle = "#b02a20";
      c.fillRect(14, 300, 164, 4);
    });
    return { wall, dado, floor, day, chart };
  }, []);

const B: React.FC<{ p: V3; s: V3; c: string; r?: V3; sh?: boolean; map?: THREE.Texture }> = ({ p, s, c, r, sh = true, map }) => (
  <mesh position={p} rotation={r} castShadow={sh} receiveShadow>
    <boxGeometry args={s} />
    <meshLambertMaterial color={c} map={map} />
  </mesh>
);
/** White-painted iron tube between two points (vertical or along x / z). */
const Tube: React.FC<{ a: V3; b: V3; r?: number; c?: string }> = ({ a, b, r = 0.018, c = "#f1f3f1" }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rotation={[e.x, e.y, e.z]} castShadow>
      <cylinderGeometry args={[r, r, len, 6]} />
      <meshLambertMaterial color={c} />
    </mesh>
  );
};

export const Clinic: React.FC<{ blobs?: Blob[] }> = ({ blobs = [] }) => {
  const tx = useTextures();
  const C = CLINIC;
  const W = C.halfW * 2;
  const D = 15;
  const b = C.bed;
  const bw = b.x1 - b.x0;
  const bd = b.z1 - b.z0;
  const bcx = (b.x0 + b.x1) / 2;
  const bcz = (b.z0 + b.z1) / 2;
  const win = C.window;
  const frame = "#eef0ec";

  return (
    <>
      <ambientLight color="#e2ecea" intensity={1.25} />
      <hemisphereLight args={["#f3fbff", "#9aa594", 1.15]} />
      {/* daylight from the window side (behind, up, right); aimed through the origin */}
      <directionalLight
        position={[3.2, 6.5, -5.5]}
        intensity={1.1}
        color="#f6fbff"
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
      {/* fill from the room side so the back wall reads */}
      <directionalLight position={[-3, 5, 9]} intensity={0.75} color="#eef4f4" />

      {/* floor, ceiling, walls */}
      <mesh position={[0, 0, D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshLambertMaterial map={tx.floor} />
      </mesh>
      <mesh position={[0, C.ceiling, D / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, D]} />
        <meshLambertMaterial color="#eceee8" />
      </mesh>
      <mesh position={[0, (C.ceiling + C.dado) / 2, 0]} receiveShadow>
        <planeGeometry args={[W, C.ceiling - C.dado]} />
        <meshLambertMaterial map={tx.wall} />
      </mesh>
      <mesh position={[0, C.dado / 2, 0.005]} receiveShadow>
        <planeGeometry args={[W, C.dado]} />
        <meshLambertMaterial map={tx.dado} />
      </mesh>
      <B p={[0, C.dado, 0.012]} s={[W, 0.035, 0.02]} c="#4f6f5c" sh={false} />
      <B p={[0, 0.05, 0.015]} s={[W, 0.1, 0.03]} c="#4f6f5c" sh={false} />
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={[k * C.halfW, (C.ceiling + C.dado) / 2, D / 2]} rotation={[0, -k * Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[D, C.ceiling - C.dado]} />
            <meshLambertMaterial map={tx.wall} color="#e6ece8" />
          </mesh>
          <mesh position={[k * (C.halfW - 0.005), C.dado / 2, D / 2]} rotation={[0, -k * Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[D, C.dado]} />
            <meshLambertMaterial map={tx.dado} color="#e6ece8" />
          </mesh>
        </group>
      ))}
      <B p={[0, C.ceiling - 0.04, 0.04]} s={[W, 0.08, 0.08]} c="#dfe3dc" sh={false} />

      {/* window with daylight (sill 0.9) */}
      <group position={[win.x, win.y, 0]}>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[win.w, win.h]} />
          <meshBasicMaterial map={tx.day} toneMapped={false} />
        </mesh>
        <B p={[0, win.h / 2 + 0.04, 0.04]} s={[win.w + 0.16, 0.08, 0.08]} c={frame} sh={false} />
        <B p={[0, -win.h / 2 - 0.03, 0.08]} s={[win.w + 0.24, 0.06, 0.16]} c={frame} sh={false} />
        <B p={[-win.w / 2 - 0.04, 0, 0.04]} s={[0.08, win.h + 0.12, 0.08]} c={frame} sh={false} />
        <B p={[win.w / 2 + 0.04, 0, 0.04]} s={[0.08, win.h + 0.12, 0.08]} c={frame} sh={false} />
        <B p={[0, 0, 0.03]} s={[0.05, win.h, 0.05]} c={frame} sh={false} />
        <B p={[0, win.h * 0.22, 0.03]} s={[win.w, 0.05, 0.05]} c={frame} sh={false} />
        {/* half-height white curtain */}
        <mesh position={[-win.w * 0.3, -win.h * 0.12, 0.1]}>
          <planeGeometry args={[win.w * 0.38, win.h * 0.78]} />
          <meshLambertMaterial color="#f4f6f2" transparent opacity={0.82} />
        </mesh>
        <mesh position={[0, win.h * 0.27, 0.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.01, 0.01, win.w + 0.2, 6]} />
          <meshLambertMaterial color="#9aa29c" />
        </mesh>
      </group>

      {/* door (1.95 x 0.85) */}
      <group position={[C.door.x, 0, 0]}>
        <B p={[0, C.door.h / 2, 0.025]} s={[C.door.w, C.door.h, 0.04]} c="#d7e0d6" sh={false} />
        <B p={[0, C.door.h + 0.04, 0.03]} s={[C.door.w + 0.16, 0.08, 0.06]} c={frame} sh={false} />
        <B p={[-C.door.w / 2 - 0.04, C.door.h / 2, 0.03]} s={[0.08, C.door.h, 0.06]} c={frame} sh={false} />
        <B p={[C.door.w / 2 + 0.04, C.door.h / 2, 0.03]} s={[0.08, C.door.h, 0.06]} c={frame} sh={false} />
        <mesh position={[0, 1.55, 0.05]}>
          <planeGeometry args={[0.5, 0.45]} />
          <meshLambertMaterial color="#c8d6d8" />
        </mesh>
        <B p={[C.door.w / 2 - 0.1, 1.0, 0.07]} s={[0.12, 0.03, 0.04]} c="#8c8f88" sh={false} />
      </group>

      {/* medicine cabinet: white metal, glass doors, red cross */}
      <group position={C.cabinet}>
        {[-0.34, 0.34].map((x) => [-0.16, 0.16].map((z) => <B key={`${x}${z}`} p={[x, 0.07, z]} s={[0.04, 0.14, 0.04]} c="#c9cdc8" />))}
        {/* solid lower cupboard, open glass-fronted upper case */}
        <B p={[0, 0.45, 0]} s={[0.8, 0.6, 0.4]} c="#f2f4f1" />
        <B p={[0, 0.45, 0.201]} s={[0.01, 0.56, 0.01]} c="#b8bdb6" sh={false} />
        <B p={[0, 1.27, -0.185]} s={[0.8, 1.06, 0.03]} c="#e4e8e2" />
        <B p={[-0.385, 1.27, 0]} s={[0.03, 1.06, 0.4]} c="#f2f4f1" />
        <B p={[0.385, 1.27, 0]} s={[0.03, 1.06, 0.4]} c="#f2f4f1" />
        <B p={[0, 1.82, 0]} s={[0.84, 0.06, 0.42]} c="#f2f4f1" />
        {[0.82, 1.18, 1.52].map((y) => (
          <B key={y} p={[0, y, 0.12]} s={[0.72, 0.02, 0.18]} c="#d8dcd6" sh={false} />
        ))}
        {[0.82, 1.18, 1.52].flatMap((y, row) =>
          [-0.26, -0.13, 0.0, 0.12, 0.25].map((x, i) => {
            const h = 0.1 + ((row * 5 + i) % 3) * 0.04;
            return (
              <mesh key={`${row}-${i}`} position={[x, y + 0.01 + h / 2, 0.12]}>
                <cylinderGeometry args={[0.03, 0.03, h, 6]} />
                <meshLambertMaterial color={["#7a4a26", "#e8ece6", "#3e6fa0", "#a8b8a0", "#6b2a22"][(row + i) % 5]} />
              </mesh>
            );
          }),
        )}
        <mesh position={[0, 1.27, 0.204]}>
          <planeGeometry args={[0.74, 0.98]} />
          <meshLambertMaterial color="#d8eef2" transparent opacity={0.22} />
        </mesh>
        <B p={[0, 1.27, 0.205]} s={[0.02, 1.06, 0.012]} c="#e2e5e0" sh={false} />
        <B p={[0, 0.76, 0.205]} s={[0.8, 0.03, 0.012]} c="#e2e5e0" sh={false} />
        <B p={[0, 1.78, 0.205]} s={[0.17, 0.05, 0.01]} c="#c0302a" sh={false} />
        <B p={[0, 1.78, 0.205]} s={[0.05, 0.17, 0.01]} c="#c0302a" sh={false} />
      </group>

      {/* eye chart */}
      <group position={C.chart}>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[0.46, 0.76]} />
          <meshLambertMaterial map={tx.chart} />
        </mesh>
      </group>

      {/* white iron bed, head at x1 */}
      <B p={[bcx, b.top - 0.08, bcz]} s={[bw - 0.04, 0.16, bd - 0.06]} c="#f1f2ee" />
      <B p={[bcx - 0.1, b.top + 0.012, bcz]} s={[bw - 0.4, 0.04, bd - 0.02]} c="#b9c9d4" />
      <B p={[bcx - 0.1, b.top - 0.06, b.z1 - 0.01]} s={[bw - 0.4, 0.14, 0.02]} c="#a9bac6" sh={false} />
      <mesh position={C.pillow} scale={[0.22, 0.07, 0.36]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#ffffff" />
      </mesh>
      {[b.z0 + 0.03, b.z1 - 0.03].map((z) => (
        <group key={z}>
          <Tube a={[b.x0, 0, z]} b={[b.x0, 0.85, z]} r={0.022} />
          <Tube a={[b.x1, 0, z]} b={[b.x1, 1.05, z]} r={0.022} />
          <Tube a={[b.x0, 0.36, z]} b={[b.x1, 0.36, z]} />
        </group>
      ))}
      {([[b.x0, 0.85], [b.x1, 1.05]] as const).map(([x, h]) => (
        <group key={x}>
          <Tube a={[x, h, b.z0 + 0.03]} b={[x, h, b.z1 - 0.03]} r={0.022} />
          <Tube a={[x, h - 0.32, b.z0 + 0.03]} b={[x, h - 0.32, b.z1 - 0.03]} />
          {[0.2, 0.4, 0.6, 0.8].map((f) => (
            <Tube key={f} a={[x, h - 0.32, b.z0 + bd * f]} b={[x, h, b.z0 + bd * f]} r={0.012} />
          ))}
        </group>
      ))}
      {/* bedside stool with a glass */}
      <group position={[2.55, 0, 0.6]}>
        <B p={[0, 0.48, 0]} s={[0.36, 0.04, 0.36]} c="#e9ebe6" />
        {[-0.15, 0.15].map((x) => [-0.15, 0.15].map((z) => <Tube key={`${x}${z}`} a={[x, 0, z]} b={[x, 0.46, z]} r={0.012} />))}
        <mesh position={[0.05, 0.56, 0]}>
          <cylinderGeometry args={[0.035, 0.03, 0.11, 8]} />
          <meshLambertMaterial color="#d4e6ea" transparent opacity={0.7} />
        </mesh>
      </group>

      {/* ceiling lamp */}
      <group position={[C.lamp[0], 0, C.lamp[2]]}>
        <Tube a={[0, C.ceiling, 0]} b={[0, C.lamp[1] + 0.12, 0]} r={0.008} c="#8e928c" />
        <mesh position={[0, C.lamp[1] + 0.06, 0]}>
          <sphereGeometry args={[0.24, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color="#e9ece6" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, C.lamp[1], 0]}>
          <sphereGeometry args={[0.08, 10, 6]} />
          <meshBasicMaterial color="#fffbea" />
        </mesh>
      </group>

      {blobs.map((bl, i) => (
        <mesh key={i} position={[bl.x, 0.012, bl.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]}>
          <circleGeometry args={[bl.r ?? 0.42, 20]} />
          <meshBasicMaterial color="#3a4038" transparent opacity={0.26} />
        </mesh>
      ))}
    </>
  );
};
