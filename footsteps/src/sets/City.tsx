import React, { useMemo } from "react";
import * as THREE from "three";
import { C, F, INK_W as O, Mat } from "../lib/draw";
import { mulberry } from "../lib/anim";
import { circle, linearTex, radialTex, roundRect } from "../lib/shapes";

export const FACADE_Z = -4;
export const CURB_Z = 0.8;
export const SIDEWALK_Z = -1.2; // where the hero walks
export const VAN_Z = 2.3;

const signTex = new Map<string, THREE.Texture>();
const useSign = (text: string, bg: string, fg: string) =>
  useMemo(() => {
    const key = text + bg;
    let t = signTex.get(key);
    if (!t) {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 128;
      const ctx = cv.getContext("2d")!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = fg;
      ctx.font = "800 74px Kanit";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 70);
      t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      signTex.set(key, t);
    }
    return t;
  }, [text, bg, fg]);

const Sign: React.FC<{ text: string; bg: string; fg: string; w: number; pos: [number, number, number] }> = ({ text, bg, fg, w, pos }) => {
  const tex = useSign(text, bg, fg);
  return (
    <group position={pos}>
      <F g={roundRect(w + O * 2, w / 4 + O * 2, 0.06)} c={C.ink} pos={[0, 0, -0.005]} />
      <mesh>
        <planeGeometry args={[w, w / 4]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

export const Sky: React.FC<{ top?: string; mid?: string; bottom?: string; moon?: boolean }> = ({
  top = "#2f3f4f",
  mid = "#6e7f86",
  bottom = "#d9a77c",
  moon = true,
}) => {
  const tex = useMemo(() => linearTex([[0, top], [0.55, mid], [1, bottom]]), [top, mid, bottom]);
  return (
    <group>
      <mesh position={[10, 40, -250]}>
        <planeGeometry args={[700, 160]} />
        <meshBasicMaterial map={tex} toneMapped={false} fog={false} />
      </mesh>
      {moon && (
        <group position={[18, 62, -240]}>
          <mesh position={[0, 0, -1]}>
            <planeGeometry args={[44, 44]} />
            <meshBasicMaterial map={radialTex("rgba(255,240,205,0.55)", "rgba(255,240,205,0)")} transparent depthWrite={false} toneMapped={false} fog={false} />
          </mesh>
          <mesh>
            <circleGeometry args={[6, 48]} />
            <meshBasicMaterial color="#f3ead2" toneMapped={false} fog={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const Skyline: React.FC<{ z: number; color: string; seed: number; hMin: number; hMax: number; lit?: number }> = ({
  z,
  color,
  seed,
  hMin,
  hMax,
  lit = 0,
}) => {
  const { blocks, wins } = useMemo(() => {
    const r = mulberry(seed);
    const blocks: { x: number; w: number; h: number }[] = [];
    const wins: { x: number; y: number }[] = [];
    let x = -160;
    while (x < 220) {
      const w = 4 + r() * 9;
      const h = hMin + r() * (hMax - hMin);
      blocks.push({ x, w, h });
      if (lit)
        for (let i = 0; i < (w * h) / 12; i++)
          if (r() < lit) wins.push({ x: x - w / 2 + 0.8 + r() * (w - 1.6), y: 1 + r() * (h - 2) });
      x += w + r() * 2;
    }
    return { blocks, wins };
  }, [seed, hMin, hMax, lit]);
  return (
    <group position={[0, 0, z]}>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, 0]}>
          <planeGeometry args={[b.w, b.h]} />
          <Mat color={color} />
        </mesh>
      ))}
      {wins.map((w, i) => (
        <mesh key={`w${i}`} position={[w.x, w.y, 0.05]}>
          <planeGeometry args={[0.5, 0.7]} />
          <meshBasicMaterial color="#e9c98f" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

type Shop = { x: number; w: number; h: number; c: string; open: boolean; sign?: [string, string, string]; seed: number };

const SHOP_COLORS = ["#c9bba0", "#a9b59f", "#c7a99a", "#b5aea0", "#bfb08c", "#9fb0aa"];
const SIGNS: [string, string, string][] = [
  ["ข้าวแกง", "#c4553f", "#f6ecd6"],
  ["ร้านซ่อม", "#3f6e6a", "#f6ecd6"],
  ["โชห่วย", "#d9b25c", "#2f2a24"],
  ["ร้านตัดผม", "#6c5a8a", "#f6ecd6"],
  ["ก๋วยเตี๋ยว", "#b8473a", "#f6ecd6"],
];

const Shophouse: React.FC<{ s: Shop }> = ({ s }) => {
  const r = mulberry(s.seed);
  const floors = 3;
  const fh = s.h / floors;
  return (
    <group position={[s.x, 0, FACADE_Z]}>
      <F g={roundRect(s.w, s.h, 0.05, 0, s.h / 2)} outline={roundRect(s.w + O * 2, s.h + O * 2, 0.06, 0, s.h / 2)} c={s.c} />
      {/* ground floor */}
      {s.open ? (
        <>
          <F g={roundRect(s.w - 0.6, fh - 0.5, 0.05, 0, (fh - 0.5) / 2)} c="#e8c98d" pos={[0, 0, 0.01]} unlit />
          {/* interior silhouettes: shelves */}
          {[0.6, 1.3].map((y) => (
            <F key={y} g={roundRect(s.w - 1.2, 0.08, 0.02)} c="#a98b62" pos={[0, y, 0.015]} />
          ))}
          {/* awning */}
          <F g={roundRect(s.w + 0.2, 0.35, 0.08)} outline={roundRect(s.w + 0.2 + O * 2, 0.35 + O * 2, 0.09)} c="#b4574a" pos={[0, fh - 0.25, 0.25]} />
          {Array.from({ length: Math.floor(s.w / 0.5) }).map((_, i) => (
            <F key={i} g={roundRect(0.22, 0.35, 0.02)} c="#e9dcc2" pos={[-s.w / 2 + 0.3 + i * 0.5, fh - 0.25, 0.26]} />
          ))}
        </>
      ) : (
        <>
          <F g={roundRect(s.w - 0.6, fh - 0.4, 0.04, 0, (fh - 0.4) / 2)} outline={roundRect(s.w - 0.6 + O * 2, fh - 0.4 + O * 2, 0.05, 0, (fh - 0.4) / 2)} c="#a7a596" pos={[0, 0, 0.01]} />
          {Array.from({ length: 9 }).map((_, i) => (
            <F key={i} g={roundRect(s.w - 0.6, 0.025, 0.01)} c="#8a887b" pos={[0, 0.25 + i * ((fh - 0.6) / 9), 0.015]} />
          ))}
        </>
      )}
      {s.sign && <Sign text={s.sign[0]} bg={s.sign[1]} fg={s.sign[2]} w={Math.min(2.6, s.w - 0.6)} pos={[0, fh + 0.25, 0.08]} />}
      {/* upper floors */}
      {Array.from({ length: floors - 1 }).map((_, fl) =>
        [-1, 1].map((side) => {
          const lit = r() < 0.4;
          const y = fh * (fl + 1) + fh * 0.55;
          return (
            <group key={`${fl}${side}`} position={[side * s.w * 0.24, y, 0.01]}>
              <F g={roundRect(s.w * 0.32, fh * 0.5, 0.04)} outline={roundRect(s.w * 0.32 + O * 2, fh * 0.5 + O * 2, 0.05)} c={lit ? "#ecd29a" : "#56626a"} unlit={lit} />
              <F g={roundRect(0.03, fh * 0.5, 0.01)} c={C.ink} pos={[0, 0, 0.005]} />
              {lit && r() < 0.5 && <F g={roundRect(s.w * 0.12, fh * 0.32, 0.03)} c="#9b7f57" pos={[s.w * 0.06, -fh * 0.09, 0.006]} />}
            </group>
          );
        }),
      )}
      {/* AC unit */}
      {r() < 0.6 && (
        <F g={roundRect(0.7, 0.45, 0.06)} outline={roundRect(0.7 + O * 2, 0.45 + O * 2, 0.07)} c="#d8d4c8" pos={[s.w * 0.33, fh * 1.25, 0.12]} />
      )}
      {/* roof ledge */}
      <F g={roundRect(s.w + 0.2, 0.25, 0.04)} outline={roundRect(s.w + 0.2 + O * 2, 0.25 + O * 2, 0.05)} c="#8f897a" pos={[0, s.h, 0.05]} />
    </group>
  );
};

export const useShops = (from = -60, to = 80, seed = 5) =>
  useMemo(() => {
    const r = mulberry(seed);
    const out: Shop[] = [];
    let x = from;
    let i = 0;
    while (x < to) {
      const w = 4 + Math.floor(r() * 3) * 0.5;
      out.push({
        x: x + w / 2,
        w,
        h: 7 + r() * 2,
        c: SHOP_COLORS[Math.floor(r() * SHOP_COLORS.length)],
        open: r() < 0.45,
        sign: r() < 0.55 ? SIGNS[i++ % SIGNS.length] : undefined,
        seed: Math.floor(r() * 1e6),
      });
      x += w + 0.08;
    }
    return out;
  }, [from, to, seed]);

const Wires: React.FC<{ poles: number[] }> = ({ poles }) => {
  const geos = useMemo(() => {
    const out: THREE.TubeGeometry[] = [];
    for (let i = 0; i < poles.length - 1; i++) {
      for (let k = 0; k < 4; k++) {
        const a = new THREE.Vector3(poles[i], 6.2 - k * 0.22, -3.55);
        const b = new THREE.Vector3(poles[i + 1], 6.2 - k * 0.22 + (k % 2 ? 0.1 : -0.05), -3.55);
        const m = a.clone().lerp(b, 0.5);
        m.y -= 0.6 + k * 0.15;
        m.z += 0.15 * k;
        out.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 24, 0.018, 4, false));
      }
    }
    return out;
  }, [poles]);
  return (
    <>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color={C.ink} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
};

export const StreetLamp: React.FC<{ x: number; on?: number }> = ({ x, on = 1 }) => (
  <group position={[x, 0, CURB_Z - 0.3]}>
    <F g={roundRect(0.14, 5.2, 0.05, 0, 2.6)} outline={roundRect(0.14 + O * 2, 5.2 + O * 2, 0.06, 0, 2.6)} c="#6f7470" />
    <F g={roundRect(1.1, 0.1, 0.05, -0.5, 5.15)} outline={roundRect(1.1 + O * 2, 0.1 + O * 2, 0.06, -0.5, 5.15)} c="#6f7470" />
    <F g={roundRect(0.55, 0.22, 0.1)} outline={roundRect(0.55 + O * 2, 0.22 + O * 2, 0.11)} c="#5b605c" pos={[-1.0, 5.05, 0.01]} />
    <F g={roundRect(0.4, 0.06, 0.03)} c="#fff1c8" pos={[-1.0, 4.94, 0.02]} unlit />
    {/* glow */}
    <mesh position={[-1.0, 4.95, 0.1]}>
      <planeGeometry args={[3.2, 3.2]} />
      <meshBasicMaterial map={radialTex("rgba(255,226,160,0.8)", "rgba(255,226,160,0)")} transparent opacity={on} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    {/* light pool on the sidewalk */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.0, 0.015, -1.4]} scale={[1, 0.55, 1]}>
      <planeGeometry args={[6, 6]} />
      <meshBasicMaterial map={radialTex("rgba(255,214,150,0.45)", "rgba(255,214,150,0)")} transparent opacity={on} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>
);

export const LAMPS = [-24, -12, 0, 12, 24, 36];
export const POLES = [-31, -22, -13, -4, 5, 14, 23, 32, 41];

export const City: React.FC<{ far?: boolean; street?: boolean }> = ({ far = true, street = true }) => {
  const shops = useShops();
  return (
    <group>
      {far && (
        <>
          <Sky />
          <Skyline z={-150} color="#7f8c8f" seed={3} hMin={14} hMax={45} lit={0.12} />
          <Skyline z={-70} color="#69767a" seed={8} hMin={10} hMax={26} lit={0.18} />
        </>
      )}
      {street && (
        <>
          {/* back alley gap tint */}
          <mesh position={[10, 6, FACADE_Z - 3]}>
            <planeGeometry args={[200, 12]} />
            <Mat color="#56636a" />
          </mesh>
          {shops.map((s, i) => (
            <Shophouse key={i} s={s} />
          ))}
          {/* sidewalk */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0, (FACADE_Z + CURB_Z) / 2]}>
            <planeGeometry args={[200, CURB_Z - FACADE_Z]} />
            <Mat color="#bdb39c" />
          </mesh>
          {Array.from({ length: 140 }).map((_, i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-60 + i * 1.2, 0.004, (FACADE_Z + CURB_Z) / 2]}>
              <planeGeometry args={[0.03, CURB_Z - FACADE_Z]} />
              <Mat color="#a59c86" />
            </mesh>
          ))}
          {/* curb (front face visible) */}
          <mesh position={[10, 0.07, CURB_Z]}>
            <planeGeometry args={[200, 0.18]} />
            <Mat color="#d9d2c0" />
          </mesh>
          {Array.from({ length: 100 }).map((_, i) => (
            <mesh key={`k${i}`} position={[-60 + i * 2 + 1, 0.07, CURB_Z + 0.002]}>
              <planeGeometry args={[1, 0.18]} />
              <Mat color="#3e3a35" />
            </mesh>
          ))}
          {/* road */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, -0.02, CURB_Z + 15]}>
            <planeGeometry args={[200, 30]} />
            <Mat color="#5e5b54" />
          </mesh>
          {Array.from({ length: 50 }).map((_, i) => (
            <mesh key={`d${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-60 + i * 4, -0.015, 7]}>
              <planeGeometry args={[2, 0.14]} />
              <Mat color="#d8cfb4" />
            </mesh>
          ))}
          {/* utility poles + sagging wires — very Bangkok */}
          {POLES.map((x) => (
            <group key={x} position={[x, 0, -3.6]}>
              <F g={roundRect(0.22, 7, 0.06, 0, 3.5)} outline={roundRect(0.22 + O * 2, 7 + O * 2, 0.07, 0, 3.5)} c="#a19c8e" />
              <F g={roundRect(1.2, 0.1, 0.04, 0, 6.3)} c={C.ink} pos={[0, 0, 0.02]} />
              <F g={circle(0.12)} c="#6f6b60" pos={[0.3, 5.6, 0.03]} />
            </group>
          ))}
          <Wires poles={POLES} />
          {LAMPS.map((x) => (
            <StreetLamp key={x} x={x} />
          ))}
        </>
      )}
    </group>
  );
};
