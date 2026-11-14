import * as THREE from "three";
import { continueRender, delayRender, staticFile } from "remotion";

// ---------- fonts (Kanit: Thai + Latin subsets, bundled locally) ----------
const THAI = "U+0E01-0E5B, U+200C-200D, U+25CC";
const LATIN = "U+0000-00FF, U+2000-206F, U+20AC, U+2190-21FF";
let fontsStarted = false;
export const ensureFonts = () => {
  if (fontsStarted || typeof document === "undefined") return;
  fontsStarted = true;
  const handle = delayRender("fonts");
  const faces: FontFace[] = [];
  for (const w of ["500", "700", "800"]) {
    faces.push(
      new FontFace("Kanit", `url(${staticFile(`kanit-thai-${w}-normal.woff2`)})`, {
        weight: w,
        unicodeRange: THAI,
      }),
      new FontFace("Kanit", `url(${staticFile(`kanit-latin-${w}-normal.woff2`)})`, {
        weight: w,
        unicodeRange: LATIN,
      }),
    );
  }
  Promise.all(faces.map((f) => f.load()))
    .then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    })
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};

// ---------- seeded random ----------
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---------- math ----------
export const rad = (d: number) => (d * Math.PI) / 180;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const easeInOut = (t: number) => {
  t = clamp01(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeOutBack = (t: number) => {
  t = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export type V3 = [number, number, number];
export const lerp3 = (a: V3, b: V3, t: number): V3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

// ---------- camera shared by the 3D set and the 2D character layer ----------
export type Cam = { pos: V3; target: V3; fov: number };

export const buildCam = (c: Cam, aspect: number) => {
  const cam = new THREE.PerspectiveCamera(c.fov, aspect, 0.05, 500);
  cam.position.set(...c.pos);
  cam.lookAt(...c.target);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
};

/** Project a world point to pixels; ppu = pixels per world unit at that depth. */
export const project = (
  cam: THREE.PerspectiveCamera,
  p: V3,
  w: number,
  h: number,
) => {
  const v = new THREE.Vector3(...p).project(cam);
  const vc = new THREE.Vector3(...p).applyMatrix4(cam.matrixWorldInverse);
  const depth = -vc.z;
  const ppu = h / 2 / (Math.tan(rad(cam.fov) / 2) * Math.max(depth, 0.01));
  return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, ppu, depth };
};
