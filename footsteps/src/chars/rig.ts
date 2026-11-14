// Side-view skeleton for the flat cut-out characters (facing +x).
export type Pose = {
  torso: number; // absolute lean (negative = lean forward)
  head: number; // relative to torso (positive = look up)
  aN: number; // near upper arm (relative to torso, positive = swing forward)
  fN: number; // near forearm (relative, positive = bend forward)
  aF: number;
  fF: number;
  tN: number; // near thigh (absolute, positive = forward)
  sN: number; // near shin (relative, negative = knee bends back)
  tF: number;
  sF: number;
  bob: number;
};

export const DIM = {
  torso: 0.52,
  headR: 0.3,
  upperArm: 0.24,
  foreArm: 0.22,
  thigh: 0.3,
  shin: 0.3,
  foot: 0.16,
};

const KEYS: (keyof Pose)[] = ["torso", "head", "aN", "fN", "aF", "fF", "tN", "sN", "tF", "sF", "bob"];

const pose = (p: Partial<Pose>): Pose => ({
  torso: 0,
  head: 0,
  aN: 0.08,
  fN: 0.15,
  aF: -0.08,
  fF: 0.2,
  tN: 0.04,
  sN: 0,
  tF: -0.04,
  sF: 0,
  bob: 0,
  ...p,
});

export const P = {
  stand: pose({}),
  lookUp: pose({ head: 0.3 }),
  startled: pose({ torso: 0.12, head: 0.15, aN: 0.9, fN: 1.2, aF: 0.7, fF: 1.3, tN: -0.1, tF: 0.12 }),
  grabbed: pose({ torso: 0.35, head: 0.35, aN: 2.4, fN: 0.3, aF: 2.1, fF: 0.4, tN: 0.7, sN: -0.6, tF: 0.3, sF: -0.9 }),
  rubWrist: pose({ torso: -0.05, head: -0.25, aN: 0.7, fN: 1.6, aF: 0.55, fF: 1.7 }),
  freeze: pose({ torso: -0.08, head: 0.05, aN: 0.6, fN: 1.9, aF: 0.4, fF: 2.0, tN: 0.75, sN: -1.1, tF: -0.15, sF: -0.05 }),
};

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = {} as Pose;
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
};
export const addPose = (a: Pose, d: Partial<Pose>): Pose => {
  const out = { ...a };
  for (const k of Object.keys(d) as (keyof Pose)[]) out[k] += d[k] ?? 0;
  return out;
};

// relaxed walk, p = phase radians
export const walkPose = (p: number, swagger = 0): Pose => {
  const leg = (q: number) => ({ t: 0.05 + 0.42 * Math.sin(q), s: -0.08 - 0.55 * Math.max(0, Math.cos(q)) });
  const n = leg(p);
  const f = leg(p + Math.PI);
  return {
    torso: -0.03,
    head: 0.04 + 0.05 * swagger * Math.sin(p * 2),
    aN: -0.42 * Math.sin(p),
    fN: 0.25 + 0.15 * Math.max(0, -Math.sin(p)),
    aF: 0.42 * Math.sin(p),
    fF: 0.25 + 0.15 * Math.max(0, Math.sin(p)),
    tN: n.t,
    sN: n.s,
    tF: f.t,
    sF: f.s,
    bob: 0.025 * Math.abs(Math.cos(p)),
  };
};

// cartoon tiptoe: slow, knees high, hands up like paws
export const tiptoePose = (p: number): Pose => {
  const leg = (q: number) => ({
    t: 0.1 + 0.55 * Math.max(0, Math.sin(q)) - 0.2 * Math.max(0, -Math.sin(q)),
    s: -0.15 - 1.1 * Math.max(0, Math.sin(q)),
  });
  const n = leg(p);
  const f = leg(p + Math.PI);
  return {
    torso: -0.18,
    head: 0.12,
    aN: 0.75 + 0.1 * Math.sin(p),
    fN: 1.75,
    aF: 0.6 - 0.1 * Math.sin(p),
    fF: 1.85,
    tN: n.t,
    sN: n.s,
    tF: f.t,
    sF: f.s,
    bob: 0.03 * Math.abs(Math.sin(p)),
  };
};

const dirDown = (a: number): [number, number] => [Math.sin(a), -Math.cos(a)];

// FK — returns hip height so the lowest point (sole) sits on the ground
export const groundHeight = (p: Pose) => {
  const pts: [number, number][] = [];
  const leg = (th: number, s: number) => {
    const k = dirDown(th);
    const kn: [number, number] = [k[0] * DIM.thigh, k[1] * DIM.thigh];
    const a = dirDown(th + s);
    const an: [number, number] = [kn[0] + a[0] * DIM.shin, kn[1] + a[1] * DIM.shin];
    pts.push([kn[0], kn[1] - 0.08], [an[0], an[1] - 0.075]);
  };
  leg(p.tN, p.sN);
  leg(p.tF, p.sF);
  let min = Infinity;
  for (const q of pts) min = Math.min(min, q[1]);
  return -min + p.bob;
};
