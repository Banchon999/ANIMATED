import React, { useMemo } from "react";
import * as THREE from "three";
import { rng, V3 } from "./lib";
import { KITS, paintSky, TimeOfDay } from "./Light";

// Old wooden house bedroom at night. Rendered in two passes ("back" / "front")
// so 2D characters can be sandwiched between the bed and its front posts.

export const makeTex = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
  }
  t.anisotropy = 4;
  return t;
};

const planks = (vertical: boolean, n: number, base: [number, number, number], seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  const S = 1024;
  const pw = S / n;
  for (let i = 0; i < n; i++) {
    const l = base[2] + (r() - 0.5) * 7;
    const hue = base[0] + (r() - 0.5) * 6;
    c.fillStyle = `hsl(${hue} ${base[1]}% ${l}%)`;
    if (vertical) c.fillRect(i * pw, 0, pw, S);
    else c.fillRect(0, i * pw, S, pw);
    // grain
    for (let g = 0; g < 26; g++) {
      c.strokeStyle = `rgba(${r() > 0.5 ? "20,10,5" : "255,220,180"},${0.03 + r() * 0.07})`;
      c.lineWidth = 1 + r() * 2;
      c.beginPath();
      const o = i * pw + r() * pw;
      const wob = (r() - 0.5) * 10;
      if (vertical) {
        c.moveTo(o, 0);
        c.bezierCurveTo(o + wob, S * 0.3, o - wob, S * 0.7, o, S);
      } else {
        c.moveTo(0, o);
        c.bezierCurveTo(S * 0.3, o + wob, S * 0.7, o - wob, S, o);
      }
      c.stroke();
    }
    // seam
    c.fillStyle = "rgba(12,6,3,0.75)";
    if (vertical) c.fillRect(i * pw, 0, 4, S);
    else c.fillRect(0, i * pw, S, 4);
    c.fillStyle = "rgba(255,225,190,0.07)";
    if (vertical) c.fillRect(i * pw + 4, 0, 3, S);
    else c.fillRect(0, i * pw + 4, S, 3);
    // butt joints on horizontal boards
    if (!vertical) {
      c.fillStyle = "rgba(12,6,3,0.6)";
      c.fillRect(r() * S, i * pw, 4, pw);
    }
  }
};

const useTextures = () =>
  useMemo(() => {
    const wall = makeTex(1024, 1024, planks(true, 16, [22, 32, 27], 3), [4.9, 3.5]);
    const lower = makeTex(1024, 1024, planks(false, 6, [20, 32, 23], 5), [11.7, 0.85]);
    const floor = makeTex(1024, 1024, planks(false, 8, [24, 30, 25], 9), [8.75, 6.25]);
    const night = makeTex(512, 640, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 640);
      g.addColorStop(0, "#0a1230");
      g.addColorStop(1, "#22366f");
      c.fillStyle = g;
      c.fillRect(0, 0, 512, 640);
      const r = rng(21);
      for (let i = 0; i < 70; i++) {
        c.fillStyle = `rgba(220,230,255,${0.3 + r() * 0.6})`;
        c.fillRect(r() * 512, r() * 420, 2 + r() * 2, 2 + r() * 2);
      }
      const mg = c.createRadialGradient(330, 170, 20, 330, 170, 190);
      mg.addColorStop(0, "rgba(200,220,255,0.75)");
      mg.addColorStop(1, "rgba(200,220,255,0)");
      c.fillStyle = mg;
      c.fillRect(0, 0, 512, 640);
      c.fillStyle = "#eef2ff";
      c.beginPath();
      c.arc(330, 170, 58, 0, 7);
      c.fill();
      c.fillStyle = "rgba(170,185,225,0.5)";
      [[312, 150, 14], [350, 185, 10], [330, 200, 7]].forEach(([x, y, q]) => {
        c.beginPath();
        c.arc(x, y, q, 0, 7);
        c.fill();
      });
      // tree line + banana leaves
      c.fillStyle = "#050a1c";
      c.beginPath();
      c.moveTo(0, 640);
      for (let x = 0; x <= 512; x += 32) c.lineTo(x, 520 - Math.sin(x * 0.05) * 22 - r() * 40);
      c.lineTo(512, 640);
      c.fill();
      const leaf = (x: number, y: number, a: number, L: number) => {
        c.save();
        c.translate(x, y);
        c.rotate(a);
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(L * 0.5, -L * 0.22, L, 0);
        c.quadraticCurveTo(L * 0.5, L * 0.22, 0, 0);
        c.fill();
        c.restore();
      };
      c.fillStyle = "#070d22";
      c.fillRect(96, 300, 12, 340);
      [-2.6, -2.0, -1.2, -0.5, 0.2].forEach((a, i) => leaf(102, 310, a, 190 - i * 12));
      c.fillStyle = "#16306a";
      [-0.9, -0.3, 0.3].forEach((a) => leaf(170, 560, a - 1.1, 170));
    });
    const mat = makeTex(256, 256, (c) => {
      c.fillStyle = "#8f7a3c";
      c.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          c.fillStyle = (x + y) % 2 ? "rgba(60,45,15,0.35)" : "rgba(230,205,120,0.25)";
          c.fillRect(x * 16, y * 16, 16, 16);
        }
      c.strokeStyle = "#5c2420";
      c.lineWidth = 14;
      c.strokeRect(7, 7, 242, 242);
    });
    const pillow = makeTex(256, 128, (c) => {
      c.fillStyle = "#7a2530";
      c.fillRect(0, 0, 256, 128);
      c.strokeStyle = "rgba(240,200,170,0.55)";
      c.lineWidth = 3;
      for (let i = -8; i < 20; i++) {
        c.beginPath();
        c.moveTo(i * 24, 0);
        c.lineTo(i * 24 + 128, 128);
        c.moveTo(i * 24 + 128, 0);
        c.lineTo(i * 24, 128);
        c.stroke();
      }
    });
    return { wall, lower, floor, night, mat, pillow };
  }, []);

/** Window view by day, morning or evening: sky, the tree line and the banana plant in daylight colours. */
const useDayView = (time: TimeOfDay) =>
  useMemo(() => {
    if (time === "night") return null;
    const kit = KITS[time];
    return makeTex(512, 640, (c) => {
      paintSky(c, 512, 640, kit, 21);
      const r = rng(21);
      const far = time === "evening" ? "#4a3a4a" : "#5f8a5a";
      const near = time === "evening" ? "#2e2630" : "#3f6e3e";
      c.fillStyle = far;
      c.beginPath();
      c.moveTo(0, 640);
      for (let x = 0; x <= 512; x += 32) c.lineTo(x, 520 - Math.sin(x * 0.05) * 22 - r() * 40);
      c.lineTo(512, 640);
      c.fill();
      const leaf = (x: number, y: number, a: number, L: number) => {
        c.save();
        c.translate(x, y);
        c.rotate(a);
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(L * 0.5, -L * 0.22, L, 0);
        c.quadraticCurveTo(L * 0.5, L * 0.22, 0, 0);
        c.fill();
        c.restore();
      };
      c.fillStyle = near;
      c.fillRect(96, 300, 12, 340);
      [-2.6, -2.0, -1.2, -0.5, 0.2].forEach((a, i) => leaf(102, 310, a, 190 - i * 12));
      c.fillStyle = time === "evening" ? "#3a3040" : "#4f8a48";
      [-0.9, -0.3, 0.3].forEach((a) => leaf(170, 560, a - 1.1, 170));
    });
  }, [time]);

/** Room light per time of day; "night" is the original look. lamp = lantern and candles lit (0..1). */
export const ROOM_LIGHT: Record<TimeOfDay, { amb: string; ambI: number; hemi: [string, string, number]; sun: string; sunI: number; lamp: number; shaft: string }> = {
  night: { amb: "#c2ab9a", ambI: 2.5, hemi: ["#7f8db8", "#4a3424", 0.9], sun: "#9db6ff", sunI: 1.5, lamp: 1, shaft: "#bcd0ff" },
  evening: { amb: "#d8b49a", ambI: 3.0, hemi: ["#c09ab0", "#4a3424", 1.0], sun: "#ff9a5a", sunI: 2.4, lamp: 0.85, shaft: "#ffb27a" },
  morning: { amb: "#efd8c4", ambI: 4.4, hemi: ["#e0d8f0", "#6a4a34", 1.3], sun: "#ffd29e", sunI: 3.4, lamp: 0, shaft: "#ffe2b8" },
  day: { amb: "#eadfd2", ambI: 5.0, hemi: ["#d6e4ff", "#6a4a34", 1.6], sun: "#fff3dc", sunI: 3.3, lamp: 0, shaft: "#fff6e0" },
};

const W: React.FC<{ p: V3; s: V3; c: string; r?: V3; sh?: boolean }> = ({ p, s, c, r, sh = true }) => (
  <mesh position={p} rotation={r} castShadow={sh} receiveShadow>
    <boxGeometry args={s} />
    <meshLambertMaterial color={c} />
  </mesh>
);

// ---- positions shared with the 2D layer ----
export const ROOM = {
  window: { x: -0.6, y: 1.5, w: 1.0, h: 1.2 },
  bed: { x0: -0.2, x1: 1.7, z0: 0.6, z1: 1.9, top: 0.55, post: 2.0 },
  lantern: [0.15, 0, 3.3] as V3,
  candles: [-0.7, 0, 3.65] as V3,
  sleeperHead: [1.3, 0.74, 1.25] as V3,
};

const scallop = (len: number, h: number, n: number) => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(len, 0);
  s.lineTo(len, -h * 0.45);
  const step = len / n;
  for (let i = n; i > 0; i--) {
    const x1 = i * step;
    const x0 = (i - 1) * step;
    s.quadraticCurveTo((x0 + x1) / 2, -h * 1.5, x0, -h * 0.45);
  }
  s.lineTo(0, 0);
  return new THREE.ShapeGeometry(s);
};

const Net: React.FC<{ p: V3; h: number }> = ({ p, h }) => (
  <group position={p}>
    <mesh position={[0, h * 0.72, 0]}>
      <cylinderGeometry args={[0.15, 0.055, h * 0.52, 10, 1, true]} />
      <meshLambertMaterial color="#d9dde8" transparent opacity={0.62} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, h * 0.23, 0]}>
      <cylinderGeometry args={[0.055, 0.18, h * 0.46, 10, 1, true]} />
      <meshLambertMaterial color="#d9dde8" transparent opacity={0.62} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, h * 0.46, 0]}>
      <cylinderGeometry args={[0.068, 0.068, 0.05, 10]} />
      <meshLambertMaterial color="#b5485a" />
    </mesh>
  </group>
);

export const NightRoom: React.FC<{ layer: "back" | "front"; flicker: number; moon: number; time?: TimeOfDay }> = ({ layer, flicker, moon, time = "night" }) => {
  const tx = useTextures();
  const dayView = useDayView(time);
  const RL = ROOM_LIGHT[time];
  const lampOn = RL.lamp > 0;
  const b = ROOM.bed;
  const bw = b.x1 - b.x0;
  const bd = b.z1 - b.z0;
  const bcx = (b.x0 + b.x1) / 2;
  const bcz = (b.z0 + b.z1) / 2;
  const win = ROOM.window;
  const wood = "#3c2415";
  const woodD = "#2a180e";
  const val = useMemo(() => ({ long: scallop(bw + 0.1, 0.14, 13), short: scallop(bd, 0.14, 9) }), [bw, bd]);
  const curtain = useMemo(() => {
    const L = new THREE.Shape();
    L.moveTo(-0.22, 0);
    L.lineTo(0.2, 0);
    L.bezierCurveTo(0.26, -0.8, 0.12, -1.5, 0.2, -2.35);
    L.bezierCurveTo(0.08, -2.5, -0.14, -2.5, -0.26, -2.35);
    L.bezierCurveTo(-0.2, -1.5, -0.3, -0.8, -0.22, 0);
    const R = new THREE.Shape();
    R.moveTo(-0.2, 0);
    R.lineTo(0.22, 0);
    R.bezierCurveTo(0.26, -0.5, 0.02, -0.75, 0.0, -1.0);
    R.bezierCurveTo(0.04, -1.3, 0.3, -1.7, 0.26, -2.3);
    R.bezierCurveTo(0.1, -2.42, -0.14, -2.42, -0.28, -2.3);
    R.bezierCurveTo(-0.3, -1.7, -0.12, -1.3, -0.1, -1.0);
    R.bezierCurveTo(-0.1, -0.75, -0.26, -0.5, -0.2, 0);
    return { L: new THREE.ShapeGeometry(L), R: new THREE.ShapeGeometry(R) };
  }, []);

  const lights = (
    <>
      <ambientLight color={RL.amb} intensity={RL.ambI} />
      <hemisphereLight args={RL.hemi} />
      {/* moon through the window */}
      <directionalLight
        position={[-4, 9.5, -8.6]}
        color={RL.sun}
        intensity={RL.sunI * moon}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={8}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.001}
      />
      {lampOn ? (
        <>
          <pointLight position={[ROOM.lantern[0], 0.33, ROOM.lantern[2]]} color="#ffad55" intensity={5 * flicker * RL.lamp} distance={7} decay={1.8} />
          <pointLight position={[ROOM.candles[0], 0.25, ROOM.candles[2]]} color="#ffb060" intensity={3 * (0.6 + 0.4 * flicker) * RL.lamp} distance={5} decay={1.8} />
        </>
      ) : null}
    </>
  );

  const posts: { p: V3; front: boolean }[] = [
    { p: [b.x0, 0, b.z0], front: false },
    { p: [b.x1, 0, b.z0], front: false },
    { p: [b.x0, 0, b.z1], front: true },
    { p: [b.x1, 0, b.z1], front: true },
  ];

  if (layer === "front") {
    return (
      <>
        {lights}
        {posts
          .filter((q) => q.front)
          .map((q, i) => (
            <group key={i}>
              <W p={[q.p[0], b.post / 2, q.p[2]]} s={[0.07, b.post, 0.07]} c={wood} />
              <Net p={[q.p[0], 0.42, q.p[2] + 0.05]} h={b.post - 0.46} />
            </group>
          ))}
        <W p={[bcx, b.post, b.z1]} s={[bw + 0.14, 0.07, 0.07]} c={wood} />
        <mesh geometry={val.long} position={[b.x0 - 0.05, b.post - 0.04, b.z1 + 0.06]}>
          <meshLambertMaterial color="#e2e4ee" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
        {/* front rail of the bed */}
        <W p={[bcx, b.top - 0.22, b.z1]} s={[bw, 0.2, 0.06]} c={wood} />
      </>
    );
  }

  return (
    <>
      {lights}
      {/* walls + floor */}
      <mesh position={[0, 5, 0]} receiveShadow>
        <planeGeometry args={[14, 10]} />
        <meshLambertMaterial map={tx.wall} />
      </mesh>
      <mesh position={[0, 0.5, 0.05]} receiveShadow>
        <planeGeometry args={[14, 1.0]} />
        <meshLambertMaterial map={tx.lower} />
      </mesh>
      <W p={[0, 1.03, 0.08]} s={[14, 0.08, 0.1]} c={woodD} />
      {/* ceiling + beam */}
      <mesh position={[0, 2.8, 5]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshLambertMaterial map={tx.floor} color="#8a7466" />
      </mesh>
      <W p={[0, 2.72, 0.12]} s={[14, 0.16, 0.16]} c={woodD} />
      <W p={[0, 0.06, 0.08]} s={[14, 0.12, 0.08]} c={woodD} />
      <mesh position={[0, 0, 5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 10]} />
        <meshLambertMaterial map={tx.floor} />
      </mesh>

      {/* window */}
      <group position={[win.x, win.y, 0.06]}>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[win.w, win.h]} />
          <meshBasicMaterial map={dayView ?? tx.night} toneMapped={false} />
        </mesh>
        <W p={[0, win.h / 2 + 0.045, 0.06]} s={[win.w + 0.22, 0.09, 0.1]} c={woodD} />
        <W p={[0, -win.h / 2 - 0.045, 0.06]} s={[win.w + 0.26, 0.09, 0.14]} c={woodD} />
        <W p={[-win.w / 2 - 0.045, 0, 0.06]} s={[0.09, win.h + 0.1, 0.1]} c={woodD} />
        <W p={[win.w / 2 + 0.045, 0, 0.06]} s={[0.09, win.h + 0.1, 0.1]} c={woodD} />
        <W p={[0, 0, 0.04]} s={[0.035, win.h, 0.04]} c={woodD} sh={false} />
        <W p={[0, 0.1, 0.04]} s={[win.w, 0.035, 0.04]} c={woodD} sh={false} />
        {/* curtain rod + curtains */}
        <mesh position={[0, win.h / 2 + 0.16, 0.16]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, win.w + 0.5, 8]} />
          <meshLambertMaterial color="#1c120b" />
        </mesh>
        <mesh geometry={curtain.L} position={[-win.w / 2 - 0.06, win.h / 2 + 0.16, 0.16]} scale={[0.72, 0.62, 1]}>
          <meshBasicMaterial color="#b9c2d8" transparent opacity={0.8} />
        </mesh>
        <mesh geometry={curtain.R} position={[win.w / 2 + 0.04, win.h / 2 + 0.16, 0.16]} scale={[0.72, 0.62, 1]}>
          <meshBasicMaterial color="#aab4cd" transparent opacity={0.78} />
        </mesh>
      </group>

      {/* small framed picture + wall shelf */}
      <group position={[0.55, 1.72, 0.08]} scale={0.8}>
        <W p={[0, 0, 0]} s={[0.42, 0.56, 0.05]} c="#1e130c" />
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[0.3, 0.44]} />
          <meshBasicMaterial color="#4a443f" />
        </mesh>
      </group>
      <group position={[1.25, 1.8, 0.1]} scale={0.75}>
        <W p={[0, 0, 0.08]} s={[0.9, 0.05, 0.26]} c={woodD} />
        <mesh position={[-0.22, 0.14, 0.08]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.22, 8]} />
          <meshLambertMaterial color="#6f5a3a" />
        </mesh>
        <mesh position={[0.12, 0.1, 0.08]} castShadow>
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshLambertMaterial color="#5a3a2c" />
        </mesh>
      </group>

      {/* wardrobe (1.9 m) */}
      <group position={[-1.62, 0, 0.36]}>
        <W p={[0, 0.96, 0]} s={[0.9, 1.78, 0.55]} c="#33200f" />
        <W p={[0, 1.89, 0.02]} s={[1.0, 0.09, 0.62]} c={woodD} />
        <W p={[0, 0.045, 0.02]} s={[0.96, 0.09, 0.6]} c={woodD} />
        <W p={[0, 0.96, 0.285]} s={[0.02, 1.66, 0.02]} c="#140b06" sh={false} />
        {[-0.225, 0.225].map((x) => (
          <group key={x}>
            <W p={[x, 1.32, 0.285]} s={[0.33, 0.78, 0.02]} c="#2a190c" sh={false} />
            <W p={[x, 0.5, 0.285]} s={[0.33, 0.62, 0.02]} c="#2a190c" sh={false} />
          </group>
        ))}
        <W p={[-0.045, 0.95, 0.3]} s={[0.02, 0.11, 0.02]} c="#b08a3e" sh={false} />
        <W p={[0.045, 0.95, 0.3]} s={[0.02, 0.11, 0.02]} c="#b08a3e" sh={false} />
      </group>

      {/* bed: frame, mattress, pillow, blanket, back posts + canopy */}
      <W p={[bcx, b.top - 0.3, bcz]} s={[bw, 0.12, bd]} c={wood} />
      {posts.map((q, i) => (
        <W key={i} p={[q.p[0], 0.13, q.p[2]]} s={[0.1, 0.26, 0.1]} c={woodD} />
      ))}
      <W p={[bcx, b.top - 0.12, bcz]} s={[bw - 0.06, 0.24, bd - 0.06]} c="#cfc6bb" />
      <W p={[b.x1 + 0.02, b.top + 0.2, bcz]} s={[0.06, 0.7, bd]} c={wood} />
      <mesh position={[b.x1 + 0.02, b.top + 0.55, bcz]} rotation={[0, Math.PI / 2, 0]} scale={[1, 0.4, 1]} castShadow>
        <cylinderGeometry args={[bd / 2, bd / 2, 0.06, 20, 1, false, 0, Math.PI]} />
        <meshLambertMaterial color={wood} />
      </mesh>
      <mesh position={[b.x1 - 0.36, b.top + 0.07, bcz]} castShadow receiveShadow>
        <boxGeometry args={[0.55, 0.12, bd - 0.5]} />
        <meshLambertMaterial map={tx.pillow} />
      </mesh>
      <mesh position={[bcx - 0.22, b.top + 0.05, bcz]} scale={[0.72, 0.16, 0.46]} castShadow receiveShadow>
        <sphereGeometry args={[1, 18, 12]} />
        <meshLambertMaterial color="#9c8f96" />
      </mesh>
      <mesh position={[bcx - 0.78, b.top + 0.09, bcz + 0.06]} scale={[0.2, 0.15, 0.22]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshLambertMaterial color="#9c8f96" />
      </mesh>
      {posts
        .filter((q) => !q.front)
        .map((q, i) => (
          <group key={i}>
            <W p={[q.p[0], b.post / 2, q.p[2]]} s={[0.07, b.post, 0.07]} c={wood} />
            <Net p={[q.p[0], 0.42, q.p[2] + 0.05]} h={b.post - 0.46} />
          </group>
        ))}
      <W p={[bcx, b.post, b.z0]} s={[bw + 0.14, 0.07, 0.07]} c={wood} />
      <W p={[b.x0, b.post, bcz]} s={[0.07, 0.07, bd]} c={wood} />
      <W p={[b.x1, b.post, bcz]} s={[0.07, 0.07, bd]} c={wood} />
      <mesh geometry={val.long} position={[b.x0 - 0.05, b.post - 0.04, b.z0 + 0.06]}>
        <meshLambertMaterial color="#c9cddb" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={val.short} position={[b.x0 - 0.06, b.post - 0.04, b.z1]} rotation={[0, Math.PI / 2, 0]}>
        <meshLambertMaterial color="#d5d8e4" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* woven mat */}
      <mesh position={[-0.75, 0.012, 3.15]} rotation={[-Math.PI / 2, 0, 0.06]} receiveShadow>
        <planeGeometry args={[1.5, 1.1]} />
        <meshLambertMaterial map={tx.mat} />
      </mesh>

      {/* kerosene lantern */}
      <group position={ROOM.lantern} scale={0.6}>
        <mesh position={[0, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.16, 0.18, 12]} />
          <meshLambertMaterial color="#3d5546" />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.1, 0.12, 0.36, 12, 1, true]} />
          {lampOn ? (
            <meshBasicMaterial color="#ffd9a0" transparent opacity={0.5 * flicker + 0.2} side={THREE.DoubleSide} />
          ) : (
            <meshLambertMaterial color="#c9c4b4" transparent opacity={0.45} side={THREE.DoubleSide} />
          )}
        </mesh>
        {lampOn ? (
          <mesh position={[0, 0.3, 0]} scale={[1, 1.9, 1]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshBasicMaterial color="#fff3c9" />
          </mesh>
        ) : null}
        <mesh position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.05, 0.12, 0.1, 12]} />
          <meshLambertMaterial color="#3d5546" />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.2, 0.012, 6, 20, Math.PI]} />
          <meshLambertMaterial color="#2a2f2b" />
        </mesh>
      </group>

      {/* candle tray */}
      <group position={ROOM.candles} scale={0.6}>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.3, 0.06, 16]} />
          <meshLambertMaterial color="#8a6a2c" />
        </mesh>
        {[-0.22, -0.13, -0.04, 0.05, 0.14, 0.23, 0.0].map((x, i) => {
          const h = 0.18 + ((i * 37) % 11) * 0.012;
          const z = i === 6 ? 0.14 : ((i * 13) % 5) * 0.03 - 0.06;
          return (
            <group key={i} position={[x, 0.06, z]}>
              <mesh position={[0, h / 2, 0]}>
                <cylinderGeometry args={[0.014, 0.016, h, 6]} />
                <meshLambertMaterial color="#e8dcc0" emissive={lampOn ? "#6a4a20" : "#000000"} />
              </mesh>
              {lampOn ? (
                <mesh position={[0, h + 0.03, 0]} scale={[1, 2.2 * (0.8 + 0.25 * Math.sin(i * 2.1 + flicker * 40)), 1]}>
                  <sphereGeometry args={[0.014, 6, 5]} />
                  <meshBasicMaterial color="#ffe9a8" />
                </mesh>
              ) : null}
            </group>
          );
        })}
      </group>

      {/* wooden chest */}
      <group position={[0.95, 0, 3.75]} rotation={[0, -0.25, 0]} scale={0.8}>
        <W p={[0, 0.2, 0]} s={[0.75, 0.4, 0.45]} c="#3b2413" />
        <W p={[0, 0.42, 0]} s={[0.79, 0.07, 0.49]} c="#2c1a0d" />
        <W p={[-0.25, 0.22, 0.23]} s={[0.06, 0.44, 0.02]} c="#9c7a34" sh={false} />
        <W p={[0.25, 0.22, 0.23]} s={[0.06, 0.44, 0.02]} c="#9c7a34" sh={false} />
        <W p={[0, 0.3, 0.235]} s={[0.1, 0.1, 0.02]} c="#b8923e" sh={false} />
      </group>
    </>
  );
};
