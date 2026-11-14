export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
export const easeOut = (v: number) => 1 - Math.pow(1 - clamp01(v), 3);
export const easeIn = (v: number) => Math.pow(clamp01(v), 3);
export const range = (f: number, a: number, b: number) => smooth((f - a) / (b - a));
export const lin = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type V = number[];
// keyframe interpolation (smoothstep between keys)
export const kf = (f: number, keys: [number, V][]): V => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, a] = keys[i];
    const [f1, b] = keys[i + 1];
    if (f <= f1) {
      const t = smooth((f - f0) / (f1 - f0));
      return a.map((v, j) => v + (b[j] - v) * t);
    }
  }
  return keys[keys.length - 1][1];
};

// deterministic 1D value noise in [-1, 1]
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i + seed * 57) * (1 - u) + hash(i + 1 + seed * 57) * u;
};
// handheld camera shake (fractal noise)
export const shake = (f: number, amp: number, seed = 0): [number, number, number] => [
  (noise1(f * 0.05, seed) * 0.7 + noise1(f * 0.13, seed + 3) * 0.3) * amp,
  (noise1(f * 0.05, seed + 9) * 0.7 + noise1(f * 0.13, seed + 5) * 0.3) * amp,
  noise1(f * 0.04, seed + 17) * amp * 0.02,
];

// bulb flicker: 1 = steady, dips to ~0 in bursts
export const flicker = (f: number, seed = 0, rate = 1) => {
  const burst = noise1(f * 0.07 * rate, seed);
  if (burst < 0.45) return 1;
  const k = noise1(f * 1.7, seed + 2);
  return k > 0.1 ? 1 : 0.15 + 0.3 * (k + 1);
};

export const mulberry = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
