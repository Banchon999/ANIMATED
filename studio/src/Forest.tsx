import React, { useMemo } from "react";
import * as THREE from "three";
import { makeTex } from "./NightRoom";
import type { Blob } from "./Village";
import { rng, V3 } from "./lib";
import { Kit, KITS, SkyLights, TimeOfDay, TIMES } from "./Light";
import { Blobs, Rod, shade } from "./SetKit";

// Thai tropical forest, real-world scale. A narrow dirt trail (about 2 m wide, centre z 3.0) crosses the
// frame; the actors stand on it. Tall trunks with buttress roots stand behind the trail and well to the
// sides, the canopy closes 14-22 m up, bamboo clumps, ferns, broad-leaf plants, hanging vines, a fallen log
// and mossy rocks fill the undergrowth. Nothing stands between the camera and the trail: in front of the
// trail (z > 3.8) only low plants at |x| > 2.4 and trunks at |x| > 3.6. Everything except the anchors below
// is placed from the clip seed. Light shafts (day) and fireflies (night) are 2D layers in Sets.tsx.

export const FOREST = {
  trail: { z: 3.0, w: 2.0 }, // trail centre line and width (about 2 m); it wanders only away from the frame centre (|x| > 3)
  canopy: 14, // underside of the canopy
  log: { z: 0.75, r: 0.32 }, // fallen log behind the trail, lying along x; its x comes from the seed (forestLog)
  actorZone: { x: [-2.0, 2.0], z: [2.5, 3.5] },
};

/** Fallen log centre for a clip seed: behind the trail, left or right of the frame centre. */
export const forestLog = (seed: number): V3 => {
  const r = rng(seed * 457 + 3);
  const side = r() > 0.5 ? 1 : -1;
  return [side * (1.5 + r() * 1.0), FOREST.log.r * 0.8, FOREST.log.z];
};

/** Light shafts through the canopy: top and ground points (world), width at the top, strength. */
export const forestShafts = (seed: number, time: TimeOfDay) => {
  const r = rng(seed * 271 + 41);
  const lean = time === "morning" ? 1 : time === "evening" ? -1 : 0.55; // sun left in the morning, right in the evening
  return Array.from({ length: 6 }).map((_, i) => {
    const x = -4.5 + i * 1.8 + (r() - 0.5) * 1.2;
    const z = -5 + r() * 6.5;
    const w = 0.35 + r() * 0.7;
    return { top: [x, FOREST.canopy, z] as V3, foot: [x + lean * 4.2, 0, z + 1.2] as V3, w, a: 0.45 + r() * 0.55 };
  });
};

/** Fireflies: base positions in the air around the trail (none near the camera). */
export const forestFlies = (seed: number) => {
  const r = rng(seed * 89 + 17);
  return Array.from({ length: 46 }).map(() => ({ p: [-6 + r() * 12, 0.3 + r() * 2.6, -5 + r() * 10.5] as V3, ph: r() * 6.28, sp: 0.4 + r() * 0.8 }));
};

// fog of the forest per time: denser than the open sets and tinted green by the leaves
const FOG: Record<TimeOfDay, { c: string; near: number; far: number }> = {
  day: { c: "#9cb894", near: 7, far: 58 },
  morning: { c: "#c2c4a0", near: 6, far: 52 },
  evening: { c: "#b8a882", near: 6, far: 52 },
  night: { c: "#122036", near: 6, far: 44 },
};

const litter = (seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  c.fillStyle = "#6e6a3e";
  c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const k = r();
    c.fillStyle = k < 0.35 ? `rgba(120,88,48,${0.3 + r() * 0.4})` : k < 0.7 ? `rgba(70,96,46,${0.3 + r() * 0.4})` : `rgba(40,40,26,${0.2 + r() * 0.3})`;
    c.save();
    c.translate(r() * 512, r() * 512);
    c.rotate(r() * 6.28);
    c.fillRect(-4, -1.5, 5 + r() * 8, 2 + r() * 3);
    c.restore();
  }
};

const dirtTrail = (seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  const W = 512, H = 128;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(172,130,84,0)");
  g.addColorStop(0.16, "rgba(172,130,84,1)");
  g.addColorStop(0.84, "rgba(172,130,84,1)");
  g.addColorStop(1, "rgba(172,130,84,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 900; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "96,70,40" : "176,140,96"},${0.2 + r() * 0.3})`;
    c.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 3);
  }
  for (let i = 0; i < 90; i++) {
    c.fillStyle = `rgba(110,80,40,${0.5 + r() * 0.4})`;
    c.fillRect(r() * W, r() * H, 3 + r() * 5, 2);
  }
};

const bark = (seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  c.fillStyle = "#8a8070";
  c.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "60,54,44" : "170,160,140"},${0.15 + r() * 0.2})`;
    c.fillRect(r() * 128, 0, 1 + r() * 3, 256);
  }
  for (let i = 0; i < 22; i++) {
    c.fillStyle = `rgba(110,140,80,${0.25 + r() * 0.3})`;
    const x = r() * 128, y = r() * 256;
    c.beginPath();
    c.ellipse(x, y, 6 + r() * 14, 4 + r() * 10, 0, 0, 7);
    c.fill();
  }
};

const culm = (c: CanvasRenderingContext2D) => {
  const g = c.createLinearGradient(0, 0, 32, 0);
  g.addColorStop(0, "#5e8a32");
  g.addColorStop(0.5, "#86b048");
  g.addColorStop(1, "#4f7a2a");
  c.fillStyle = g;
  c.fillRect(0, 0, 32, 128);
  c.fillStyle = "rgba(40,60,20,0.75)";
  c.fillRect(0, 0, 32, 5);
  c.fillStyle = "rgba(220,230,170,0.5)";
  c.fillRect(0, 5, 32, 2);
};

const frond = (c: CanvasRenderingContext2D) => {
  // pinnate fern frond along x, alpha-cut
  c.clearRect(0, 0, 256, 64);
  c.strokeStyle = "#3f6a2a";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 32);
  c.lineTo(256, 32);
  c.stroke();
  for (let i = 0; i < 22; i++) {
    const x = 8 + i * 11;
    const L = 26 * Math.sin((Math.PI * (i + 2)) / 25);
    c.fillStyle = i % 2 ? "#4f8a36" : "#5c9a3e";
    for (const k of [-1, 1]) {
      c.beginPath();
      c.moveTo(x, 32);
      c.quadraticCurveTo(x + 5, 32 + k * L * 0.6, x + 9, 32 + k * L);
      c.quadraticCurveTo(x + 9, 32 + k * L * 0.4, x + 4, 32);
      c.fill();
    }
  }
};

const broadLeaf = (c: CanvasRenderingContext2D) => {
  // heart-shaped elephant-ear leaf, alpha-cut, veins
  c.clearRect(0, 0, 128, 128);
  c.fillStyle = "#3f7a34";
  c.beginPath();
  c.moveTo(64, 124);
  c.bezierCurveTo(4, 96, 0, 30, 34, 8);
  c.quadraticCurveTo(52, 0, 64, 22);
  c.quadraticCurveTo(76, 0, 94, 8);
  c.bezierCurveTo(128, 30, 124, 96, 64, 124);
  c.fill();
  c.strokeStyle = "rgba(170,210,120,0.6)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(64, 22);
  c.lineTo(64, 120);
  for (let i = 0; i < 5; i++) {
    c.moveTo(64, 36 + i * 17);
    c.lineTo(24 + i * 4, 26 + i * 18);
    c.moveTo(64, 36 + i * 17);
    c.lineTo(104 - i * 4, 26 + i * 18);
  }
  c.stroke();
};

/** Canopy silhouette for the far backdrop: leafy blobs, alpha holes where the sky shows. */
const canopyBack = (seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  const W = 1024, H = 512;
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#ffffff";
  c.fillRect(0, H * 0.12, W, H * 0.88);
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = H * 0.06 + r() * H * 0.1;
    c.beginPath();
    c.arc(x, y, 18 + r() * 46, 0, 7);
    c.fill();
  }
};

const Buttress: React.FC<{ r: number; seed: number }> = ({ r, seed }) => {
  const fins = useMemo(() => {
    const q = rng(seed);
    const n = 4 + Math.floor(q() * 2);
    return Array.from({ length: n }).map((_, i) => ({ a: (i / n) * Math.PI * 2 + q() * 0.6, h: 1.2 + q() * 1.3, l: 0.8 + q() * 0.9 }));
  }, [seed]);
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(1, 0);
    s.lineTo(0, 1);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  }, []);
  return (
    <>
      {fins.map((f, i) => (
        <mesh key={i} geometry={geo} rotation={[0, f.a, 0]} position={[Math.cos(f.a) * r * 0.5, 0, -Math.sin(f.a) * r * 0.5]} scale={[f.l + r * 0.5, f.h, 0.14 + r * 0.06]} castShadow receiveShadow>
          <meshLambertMaterial color="#7a7262" flatShading />
        </mesh>
      ))}
    </>
  );
};

export const Forest: React.FC<{ seed: number; kit?: Kit; blobs?: Blob[] }> = ({ seed, kit = KITS.day, blobs = [] }) => {
  const time: TimeOfDay = TIMES.find((t) => KITS[t] === kit) ?? "day";
  const night = time === "night";
  const fog = FOG[time];
  const F = FOREST;
  const L = useMemo(() => {
    const r = rng(seed * 733 + 19);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    // big trunks: behind the trail anywhere, in front of it only far to the sides
    const trunks: { x: number; z: number; r: number; tint: number }[] = [];
    const ok = (x: number, z: number, d: number) => trunks.every((t) => Math.hypot(t.x - x, t.z - z) > d);
    for (let k = 0; k < 400 && trunks.length < 16; k++) {
      const back = trunks.length < 11;
      const x = back ? -14 + r() * 28 : (r() > 0.5 ? 1 : -1) * (3.8 + r() * 6);
      const z = back ? -1.2 - r() * 26 : 4 + r() * 5;
      if (back && z > -2.2 && Math.abs(x) < 1.2) continue; // keep a little air right behind the actors
      if (!ok(x, z, 2.6)) continue;
      trunks.push({ x, z, r: 0.3 + r() * 0.45 + (z < -8 ? 0.2 : 0), tint: 0.82 + r() * 0.3 });
    }
    // leaf palette of this patch of forest: deep green, yellow-green or blue-green
    const greens = pick([
      ["#3f7a36", "#4a8a3c", "#356a30", "#5a9444", "#2f6a34"],
      ["#5a8a30", "#6a9a38", "#4f7a2a", "#7aa040", "#56802e"],
      ["#2f6a4a", "#3a7a56", "#2a5a44", "#46866a", "#356e52"],
    ]);
    const crowns = trunks.flatMap((t) => Array.from({ length: 2 }).map(() => ({ p: [t.x + (r() - 0.5) * 6, F.canopy + 1.5 + r() * 6, t.z + (r() - 0.5) * 5] as V3, s: 2.8 + r() * 2.4, c: pick(greens) })));
    // understory trees (crowns 4-9 m) behind the trail or far to the sides
    const under = Array.from({ length: 6 }).map((_, i) => {
      const back = i < 4;
      const x = back ? -9 + r() * 18 : (r() > 0.5 ? 1 : -1) * (6.5 + r() * 4);
      // crowns right behind the actors sit higher, so mid shots and close-ups keep air above the heads
      return { x, z: back ? -3 - r() * 12 : 2 + r() * 6, h: 3.5 + r() * 4 + (Math.abs(x) < 3.5 ? 3 : 0), s: 1.3 + r() * 1.2, c: pick(greens) };
    });
    const bamboo = Array.from({ length: 3 }).map((_, i) => {
      const side = i === 0 ? (r() > 0.5 ? 1 : -1) : i === 1 ? -1 : 1;
      const front = r() < 0.4;
      return {
        x: side * (front ? 4.2 + r() * 2 : 2.4 + r() * 4),
        z: front ? 4.5 + r() * 3 : -0.6 - r() * 5,
        n: 7 + Math.floor(r() * 5),
        h: 6.5 + r() * 3.5,
        seed: Math.floor(r() * 1e6),
      };
    });
    // ferns and broad leaves: behind the trail edge, and low at the sides in front of it
    const plants: { x: number; z: number; s: number; kind: "fern" | "leaf"; a: number }[] = [];
    for (let k = 0; k < 200 && plants.length < 30; k++) {
      const front = r() < 0.3;
      const x = front ? (r() > 0.5 ? 1 : -1) * (2.5 + r() * 3) : -7 + r() * 14;
      const z = front ? 4.1 + r() * 2.2 : 1.5 - r() * 5;
      if (!front && z > 1.3 && Math.abs(x) < 2.6) continue; // the trail's back edge stays clear in frame
      plants.push({ x, z, s: front ? 0.55 + r() * 0.3 : 0.7 + r() * 0.6, kind: r() < 0.62 ? "fern" : "leaf", a: r() * 6.28 });
    }
    const vines = Array.from({ length: 7 }).map(() => {
      const x = -6 + r() * 12;
      const z = -1.2 - r() * 7;
      return { x, z, end: 1.8 + r() * 3.5, sway: (r() - 0.5) * 0.7, c: pick(["#4a5a2a", "#5a6a32", "#3f4f26"]) };
    });
    const loops = Array.from({ length: 3 }).map(() => ({ x: -5 + r() * 10, z: -2 - r() * 6, y: 5.5 + r() * 3, w: 2.5 + r() * 3, sag: 0.8 + r() * 1.2 }));
    const rocks = Array.from({ length: 7 }).map((_, i) => {
      const front = i < 2;
      return { x: front ? (r() > 0.5 ? 1 : -1) * (2.6 + r() * 2) : -6 + r() * 12, z: front ? 4.2 + r() * 1.2 : 1.4 - r() * 4, s: front ? 0.18 + r() * 0.12 : 0.22 + r() * 0.35, rot: r() * 6.28 };
    }).filter((k) => !(k.z > 1.2 && Math.abs(k.x) < 2.4 && k.z < 4)); // never on the trail
    const wob = { a: 0.3 + r() * 0.5, f: 0.18 + r() * 0.15, ph: r() * 6.28 };
    const logLen = 3.2 + r() * 1.4;
    const ground = 0.9 + r() * 0.2;
    return { trunks, crowns, under, bamboo, plants, vines, loops, rocks, wob, logLen, ground };
  }, [seed, F.canopy]);
  const log = forestLog(seed);

  const tx = useMemo(() => {
    const ground = makeTex(512, 512, litter(seed + 1), [40, 40]);
    const trail = makeTex(512, 128, dirtTrail(seed + 2), [1, 1]); // the ribbon uvs already repeat it
    const barkT = makeTex(128, 256, bark(seed + 3), [2, 6]);
    const culmT = makeTex(32, 128, culm, [1, 22]);
    const frondT = makeTex(256, 64, frond);
    const leafT = makeTex(128, 128, broadLeaf);
    const back = makeTex(1024, 512, canopyBack(seed + 4), [3, 1]);
    return { ground, trail, barkT, culmT, frondT, leafT, back };
  }, [seed]);

  // the trail: a ribbon along x whose centre wanders only away from the middle of the frame
  const trailGeo = useMemo(() => {
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const N = 80;
    for (let i = 0; i <= N; i++) {
      const x = -40 + (80 * i) / N;
      const far = Math.min(1, Math.pow(Math.max(0, Math.abs(x) - 2.5) / 6, 2));
      const zc = F.trail.z + far * L.wob.a * 3 * Math.sin(x * L.wob.f + L.wob.ph);
      const w = F.trail.w * (1 + 0.15 * Math.sin(x * 0.7 + L.wob.ph));
      pos.push(x, 0.012, zc - w / 2, x, 0.012, zc + w / 2);
      uv.push(i / N * 10, 1, i / N * 10, 0);
      if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [L, F.trail]);

  const crownGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const leafPlane = useMemo(() => new THREE.PlaneGeometry(1, 0.25), []);
  const leafHeart = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const frondMat = useMemo(() => new THREE.MeshLambertMaterial({ map: tx.frondT, alphaTest: 0.4, side: THREE.DoubleSide }), [tx]);
  const leafMat = useMemo(() => new THREE.MeshLambertMaterial({ map: tx.leafT, alphaTest: 0.4, side: THREE.DoubleSide }), [tx]);
  const barkMat = useMemo(() => new THREE.MeshLambertMaterial({ map: tx.barkT }), [tx]);
  const culmMat = useMemo(() => new THREE.MeshLambertMaterial({ map: tx.culmT }), [tx]);
  const bambooMat = useMemo(() => new THREE.MeshLambertMaterial({ map: tx.frondT, alphaTest: 0.4, side: THREE.DoubleSide, color: "#b8d890" }), [tx]);

  // canopy shades the floor: weaker sun, the hemisphere carries most of the light; the moon gets through less
  const fk: Kit = { ...kit, fog: { color: fog.c, near: fog.near, far: fog.far } };
  return (
    <>
      <SkyLights kit={fk} box={22} far={70} fill={night ? 1.15 : 0.95} sunMul={night ? 0.55 : 0.8} />
      {night ? <pointLight position={[0, 3.2, 4.5]} color="#8aa6e0" intensity={2.4} distance={12} decay={1.1} /> : null}

      {/* floor: leaf litter, the dirt trail */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[220, 220]} />
        <meshLambertMaterial map={tx.ground} color={shade("#ffffff", L.ground)} />
      </mesh>
      <mesh geometry={trailGeo} receiveShadow>
        <meshLambertMaterial map={tx.trail} transparent />
      </mesh>

      {/* far backdrop: a wall of leaves in the haze with gaps of sky at the top */}
      <mesh position={[0, 16, -46]}>
        <planeGeometry args={[220, 40]} />
        <meshBasicMaterial map={tx.back} transparent alphaTest={0.3} color={fog.c} />
      </mesh>

      {/* tall trunks with buttress roots, canopy crowns */}
      {L.trunks.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, 11, 0]} material={barkMat} castShadow receiveShadow>
            <cylinderGeometry args={[t.r * 0.75, t.r, 22, 7]} />
          </mesh>
          <Buttress r={t.r} seed={seed * 7 + i} />
        </group>
      ))}
      {L.crowns.map((c, i) => (
        <mesh key={i} geometry={crownGeo} position={c.p} scale={[c.s * 1.3, c.s * 0.7, c.s * 1.3]} castShadow>
          <meshLambertMaterial color={c.c} flatShading />
        </mesh>
      ))}
      {L.under.map((u, i) => (
        <group key={i} position={[u.x, 0, u.z]}>
          <Rod a={[0, 0, 0]} b={[0.2, u.h, 0]} r={0.08} c="#6a5e4a" />
          {[0, 1, 2].map((k) => (
            <mesh key={k} geometry={crownGeo} position={[0.2 + (k - 1) * u.s * 0.6, u.h + (k % 2) * 0.5, (k - 1) * 0.3]} scale={[u.s, u.s * 0.6, u.s]} castShadow>
              <meshLambertMaterial color={shade(u.c, 0.9 + k * 0.08)} flatShading />
            </mesh>
          ))}
        </group>
      ))}

      {/* bamboo clumps */}
      {L.bamboo.map((b, i) => {
        const q = rng(b.seed);
        return (
          <group key={i} position={[b.x, 0, b.z]}>
            {Array.from({ length: b.n }).map((_, k) => {
              const a = q() * 6.28;
              const tilt = 0.06 + q() * 0.16;
              const h = b.h * (0.7 + q() * 0.3);
              const top: V3 = [Math.cos(a) * (0.25 + h * Math.sin(tilt)), h, Math.sin(a) * (0.25 + h * Math.sin(tilt))];
              const base: V3 = [Math.cos(a) * 0.25 * q(), 0, Math.sin(a) * 0.25 * q()];
              const d = new THREE.Vector3(top[0] - base[0], top[1] - base[1], top[2] - base[2]);
              const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
              const e = new THREE.Euler().setFromQuaternion(quat);
              return (
                <group key={k}>
                  <mesh material={culmMat} position={[(base[0] + top[0]) / 2, h / 2, (base[2] + top[2]) / 2]} rotation={[e.x, e.y, e.z]} castShadow>
                    <cylinderGeometry args={[0.045, 0.06, d.length(), 5, 1, true]} />
                  </mesh>
                  {[0.62, 0.8, 0.97].flatMap((f, j) =>
                    [0, 1].map((m) => (
                      <group key={`${j}${m}`} position={[base[0] + (top[0] - base[0]) * f, h * f, base[2] + (top[2] - base[2]) * f]} rotation={[0, a + j * 1.1 + m * 3.1, 0]}>
                        <mesh geometry={leafPlane} material={bambooMat} position={[0.4, -0.18, 0]} rotation={[0, 0, -0.45]} scale={[0.95, 1.1, 1]} />
                      </group>
                    )),
                  )}
                </group>
              );
            })}
          </group>
        );
      })}

      {/* ferns and broad-leaf plants */}
      {L.plants.map((p, i) =>
        p.kind === "fern" ? (
          <group key={i} position={[p.x, 0.02, p.z]} rotation={[0, p.a, 0]} scale={p.s}>
            {Array.from({ length: 8 }).map((_, k) => (
              <group key={k} rotation={[0, (k / 8) * Math.PI * 2, 0]}>
                <mesh geometry={leafPlane} material={frondMat} position={[0.42, 0.3, 0]} rotation={[0, 0, 0.55 + (k % 3) * 0.12]} />
              </group>
            ))}
          </group>
        ) : (
          <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.a, 0]} scale={p.s}>
            {Array.from({ length: 4 }).map((_, k) => {
              const a = (k / 4) * Math.PI * 2 + 0.3;
              const h = 0.55 + (k % 2) * 0.25;
              return (
                <group key={k} rotation={[0, a, 0]}>
                  <Rod a={[0, 0, 0]} b={[0.25, h, 0]} r={0.018} c="#4f7a34" sh={false} />
                  <mesh geometry={leafHeart} material={leafMat} position={[0.42, h + 0.02, 0]} rotation={[-Math.PI / 2 + 0.5, 0, -Math.PI / 2]} scale={0.55} />
                </group>
              );
            })}
          </group>
        ),
      )}

      {/* hanging vines and lianas looping between trunks */}
      {L.vines.map((v, i) => {
        const pts: V3[] = [0, 1, 2, 3].map((k) => [v.x + Math.sin(k * 1.3) * v.sway * (k / 3), F.canopy - (F.canopy - v.end) * (k / 3), v.z + v.sway * 0.3 * k]);
        return (
          <group key={i}>
            {pts.slice(0, -1).map((p, k) => <Rod key={k} a={p} b={pts[k + 1]} r={0.022 - k * 0.004} c={v.c} sh={false} seg={4} />)}
          </group>
        );
      })}
      {L.loops.map((l, i) => {
        const pts: V3[] = Array.from({ length: 7 }).map((_, k) => {
          const u = k / 6;
          return [l.x - l.w / 2 + l.w * u, l.y - l.sag * 4 * u * (1 - u), l.z];
        });
        return <group key={i}>{pts.slice(0, -1).map((p, k) => <Rod key={k} a={p} b={pts[k + 1]} r={0.035} c="#5a5236" sh={false} seg={4} />)}</group>;
      })}

      {/* fallen log with moss, behind the trail */}
      <group position={log}>
        <mesh rotation={[0, 0.12 * Math.sign(log[0]), Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[F.log.r, F.log.r * 1.1, L.logLen, 9]} />
          <meshLambertMaterial color="#6a5a44" flatShading />
        </mesh>
        {[-1, 1].map((k) => (
          <mesh key={k} position={[(k * L.logLen) / 2 + k * 0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <circleGeometry args={[F.log.r * (k > 0 ? 1.1 : 1), 9]} />
            <meshLambertMaterial color="#b89a6a" side={THREE.DoubleSide} />
          </mesh>
        ))}
        {[-0.9, -0.2, 0.5, 1.1].map((x, k) => (
          <mesh key={k} position={[x * (L.logLen / 3), F.log.r * 0.8, (k % 2) * 0.08]} scale={[0.35, 0.09, 0.22]}>
            <icosahedronGeometry args={[1, 0]} />
            <meshLambertMaterial color="#5a8a3a" flatShading />
          </mesh>
        ))}
      </group>

      {/* mossy rocks */}
      {L.rocks.map((k, i) => (
        <group key={i} position={[k.x, k.s * 0.45, k.z]} rotation={[0, k.rot, 0]}>
          <mesh scale={[k.s * 1.4, k.s, k.s * 1.1]} castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <meshLambertMaterial color="#7a7a72" flatShading />
          </mesh>
          <mesh position={[0, k.s * 0.45, 0]} scale={[k.s * 1.2, k.s * 0.55, k.s * 0.95]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshLambertMaterial color="#5f8a3c" flatShading />
          </mesh>
        </group>
      ))}

      <Blobs blobs={blobs} y={0.03} c="#1e2a14" o={0.32} />
    </>
  );
};
