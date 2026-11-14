import * as THREE from "three";
import { mulberry } from "./anim";

const cache = new Map<string, THREE.BufferGeometry>();
const memo = <T extends THREE.BufferGeometry>(key: string, make: () => T): T => {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g as T;
};

// Capsule from (0,0) to (0,-len) with radius r (flat), or upward when up=true
export const capsule = (r: number, len: number, up = false) =>
  memo(`cap${r}_${len}_${up}`, () => {
    const s = new THREE.Shape();
    const y1 = up ? len : -len;
    if (up) {
      s.absarc(0, 0, r, Math.PI * 2, Math.PI, true);
      s.lineTo(-r, y1);
      s.absarc(0, y1, r, Math.PI, 0, true);
      s.lineTo(r, 0);
    } else {
      s.absarc(0, 0, r, Math.PI, 0, true);
      s.lineTo(r, y1);
      s.absarc(0, y1, r, 0, Math.PI, true);
      s.lineTo(-r, 0);
    }
    return new THREE.ShapeGeometry(s, 12);
  });

// tapered limb: radius r0 at top, r1 at bottom
export const taper = (r0: number, r1: number, len: number) =>
  memo(`tap${r0}_${r1}_${len}`, () => {
    const s = new THREE.Shape();
    s.absarc(0, 0, r0, Math.PI, 0, true);
    s.lineTo(r1, -len);
    s.absarc(0, -len, r1, 0, Math.PI, true);
    s.lineTo(-r0, 0);
    return new THREE.ShapeGeometry(s, 12);
  });

export const roundRect = (w: number, h: number, r: number, cx = 0, cy = 0) =>
  memo(`rr${w}_${h}_${r}_${cx}_${cy}`, () => {
    const s = new THREE.Shape();
    const x0 = cx - w / 2;
    const y0 = cy - h / 2;
    const rr = Math.min(r, w / 2, h / 2);
    s.moveTo(x0 + rr, y0);
    s.lineTo(x0 + w - rr, y0);
    s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rr);
    s.lineTo(x0 + w, y0 + h - rr);
    s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rr, y0 + h);
    s.lineTo(x0 + rr, y0 + h);
    s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rr);
    s.lineTo(x0, y0 + rr);
    s.quadraticCurveTo(x0, y0, x0 + rr, y0);
    return new THREE.ShapeGeometry(s, 8);
  });

// rounded trapezoid: bottom width wb, top width wt, height h (from y=0 up)
export const trap = (wt: number, wb: number, h: number, r: number) =>
  memo(`trap${wt}_${wb}_${h}_${r}`, () => {
    const s = new THREE.Shape();
    const pts: [number, number][] = [
      [-wb / 2, 0],
      [wb / 2, 0],
      [wt / 2, h],
      [-wt / 2, h],
    ];
    const n = pts.length;
    const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ];
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const prev = pts[(i + n - 1) % n];
      const next = pts[(i + 1) % n];
      const dp = Math.hypot(prev[0] - p[0], prev[1] - p[1]);
      const dn = Math.hypot(next[0] - p[0], next[1] - p[1]);
      const a = lerp(p, prev, r / dp);
      const b = lerp(p, next, r / dn);
      if (i === 0) s.moveTo(a[0], a[1]);
      else s.lineTo(a[0], a[1]);
      s.quadraticCurveTo(p[0], p[1], b[0], b[1]);
    }
    s.closePath();
    return new THREE.ShapeGeometry(s, 8);
  });

export const circle = (r: number, seg = 40, start = 0, len = Math.PI * 2) =>
  memo(`c${r}_${seg}_${start}_${len}`, () => new THREE.CircleGeometry(r, seg, start, len));

export const ring = (r0: number, r1: number, seg = 40) =>
  memo(`ring${r0}_${r1}_${seg}`, () => new THREE.RingGeometry(r0, r1, seg));

export const arc = (r: number, tube: number, a = Math.PI) =>
  memo(`arc${r}_${tube}_${a}`, () => new THREE.TorusGeometry(r, tube, 8, 32, a));

export const drop = (r: number) =>
  memo(`drop${r}`, () => {
    const s = new THREE.Shape();
    s.moveTo(0, r * 2.4);
    s.quadraticCurveTo(r * 0.9, r * 0.9, r, 0);
    s.absarc(0, 0, r, 0, Math.PI, true);
    s.quadraticCurveTo(-r * 0.9, r * 0.9, 0, r * 2.4);
    return new THREE.ShapeGeometry(s, 10);
  });

// irregular organic blob (stains, splats, bushes)
export const blob = (seed: number, r: number, wobble = 0.3, spikes = 0) =>
  memo(`blob${seed}_${r}_${wobble}_${spikes}`, () => {
    const rnd = mulberry(seed);
    const n = 64;
    const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    const spikeAt = Array.from({ length: spikes }).map(() => ({ a: rnd() * Math.PI * 2, l: 0.4 + rnd() * 0.9, w: 0.08 + rnd() * 0.1 }));
    const s = new THREE.Shape();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      let k =
        1 +
        wobble * (0.5 * Math.sin(a * 3 + ph[0]) + 0.3 * Math.sin(a * 5 + ph[1]) + 0.2 * Math.sin(a * 9 + ph[2]));
      for (const sp of spikeAt) {
        let d = Math.abs(a - sp.a);
        d = Math.min(d, Math.PI * 2 - d);
        k += sp.l * Math.exp(-(d * d) / (sp.w * sp.w * 0.5));
      }
      const x = Math.cos(a) * r * k;
      const y = Math.sin(a) * r * k;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    return new THREE.ShapeGeometry(s);
  });

export const poly = (key: string, pts: [number, number][]) =>
  memo(`poly${key}`, () => {
    const s = new THREE.Shape();
    pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
    s.closePath();
    return new THREE.ShapeGeometry(s);
  });

const texCache = new Map<string, THREE.Texture>();
// soft radial gradient texture (glows, light pools, vignettes)
export const radialTex = (inner = "rgba(255,255,255,1)", outer = "rgba(255,255,255,0)", stop = 0) => {
  const key = `${inner}|${outer}|${stop}`;
  let t = texCache.get(key);
  if (!t) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(128, 128, 128 * stop, 128, 128, 128);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, t);
  }
  return t;
};

// vertical linear gradient texture (top -> bottom)
export const linearTex = (stops: [number, string][]) => {
  const key = stops.map((s) => s.join(":")).join("|");
  let t = texCache.get(key);
  if (!t) {
    const cv = document.createElement("canvas");
    cv.width = 4;
    cv.height = 256;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, t);
  }
  return t;
};

// circular segment above the chord at angle a (hair caps)
export const chord = (r: number, a: number) =>
  memo(`chord${r}_${a}`, () => {
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    s.absarc(0, 0, r, a, Math.PI - a, false);
    s.closePath();
    return new THREE.ShapeGeometry(s, 32);
  });
