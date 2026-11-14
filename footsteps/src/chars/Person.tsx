import React from "react";
import { C, F, INK_W as O } from "../lib/draw";
import { arc, capsule, chord, circle, drop, roundRect, taper, trap } from "../lib/shapes";
import { DIM, Pose, groundHeight } from "./rig";

export type Look = {
  skin: string;
  skinShade: string;
  hair: string;
  shirt: string;
  shirtDark: string;
  pants: string;
  pantsDark: string;
  shoe: string;
  mask?: boolean; // balaclava silhouette (kidnappers)
};

export const HERO: Look = {
  skin: C.skin,
  skinShade: C.skinShade,
  hair: C.hair,
  shirt: C.shirt,
  shirtDark: C.shirtDark,
  pants: C.pants,
  pantsDark: C.pantsDark,
  shoe: C.shoe,
};

export const THUG: Look = {
  skin: C.thug,
  skinShade: "#1a1816",
  hair: C.thug,
  shirt: "#2a2724",
  shirtDark: "#1c1a18",
  pants: "#262320",
  pantsDark: "#1a1816",
  shoe: "#151311",
  mask: true,
};

export type Expr = {
  eye?: "dot" | "wide" | "closed" | "squint";
  eyeScale?: number; // wide eyes
  pupil?: number; // pupil size for "wide"
  lookX?: number; // -1..1
  lookY?: number;
  brow?: number; // + = worried (inner up), - = angry
  browY?: number;
  mouth?: "smile" | "line" | "o" | "wobble" | "open" | "hum" | "grit";
  mouthOpen?: number;
  sweat?: number;
  blush?: number;
  blink?: number; // 0..1 (1 = shut)
};

/* ---------------------------------- side view ---------------------------------- */

const Seg: React.FC<{ r: number; len: number; c: string; r1?: number }> = ({ r, len, c, r1 }) => (
  <F g={r1 ? taper(r, r1, len) : capsule(r, len)} outline={r1 ? taper(r + O, r1 + O, len) : capsule(r + O, len)} c={c} />
);

const SideArm: React.FC<{ L: Look; a: number; f: number; z: number; far: boolean; hold?: React.ReactNode }> = ({ L, a, f, z, far, hold }) => {
  const skin = far ? L.skinShade : L.skin;
  return (
    <group position={[0, DIM.torso - 0.08, z]} rotation={[0, 0, a]}>
      <Seg r={0.058} len={DIM.upperArm} c={skin} />
      <group position={[0, 0, 0.003]}>
        <F g={capsule(0.085, 0.06)} outline={capsule(0.085 + O, 0.06)} c={far ? L.shirtDark : L.shirt} />
      </group>
      <group position={[0, -DIM.upperArm, 0.006]} rotation={[0, 0, f]}>
        <Seg r={0.054} len={DIM.foreArm} c={skin} />
        <F g={circle(0.07)} outline={circle(0.07 + O)} c={skin} pos={[0, -DIM.foreArm - 0.02, 0.002]} />
        {hold && (
          <group position={[0, -DIM.foreArm - 0.04, -0.01]} rotation={[0, 0, -(a + f)]}>
            {hold}
          </group>
        )}
      </group>
    </group>
  );
};

const SideLeg: React.FC<{ L: Look; t: number; s: number; z: number; far: boolean; tip?: number }> = ({
  L,
  t,
  s,
  z,
  far,
  tip = 0,
}) => {
  const c = far ? L.pantsDark : L.pants;
  return (
    <group position={[0, 0, z]} rotation={[0, 0, t]}>
      <Seg r={0.085} len={DIM.thigh} c={c} />
      <group position={[0, -DIM.thigh, 0.004]} rotation={[0, 0, s]}>
        <Seg r={0.08} r1={0.07} len={DIM.shin} c={c} />
        {/* shoe: big rounded oval like the reference */}
        <group position={[0.04, -DIM.shin - 0.035, 0.004]} rotation={[0, 0, -(t + s) + tip]}>
          <F g={roundRect(0.26, 0.13, 0.065)} outline={roundRect(0.26 + O * 2, 0.13 + O * 2, 0.08)} c={far ? "#6f5d4b" : L.shoe} />
        </group>
      </group>
    </group>
  );
};

export const SideHead: React.FC<{ L: Look; e: Expr }> = ({ L, e }) => {
  const R = DIM.headR;
  const blink = e.blink ?? 0;
  const eye = e.eye ?? "dot";
  return (
    <group>
      <F g={circle(R)} outline={circle(R + O)} c={L.skin} />
      {L.mask ? (
        <>
          <F g={roundRect(0.13, 0.05, 0.025)} c="#e9e2d2" pos={[R * 0.55, 0.03, 0.01]} unlit />
          <F g={circle(0.017)} c={C.ink} pos={[R * 0.6, 0.03, 0.012]} unlit />
        </>
      ) : (
        <>
          {/* hair cap over top & back, with a cowlick */}
          <F g={circle(R + 0.01, 40, 0.55, 3.25)} c={L.hair} pos={[0, 0, 0.003]} />
          <F g={capsule(0.035, 0.12, true)} c={L.hair} pos={[-0.02, R - 0.02, 0.002]} rot={0.5} />
          {/* ear */}
          <F g={circle(0.065)} outline={circle(0.065 + O)} c={L.skin} pos={[-0.04, -0.02, 0.006]} />
          {/* eye */}
          {eye === "closed" || blink > 0.6 ? (
            <F g={arc(0.04, 0.012)} c={C.ink} pos={[R * 0.55, 0.0, 0.008]} rot={Math.PI} />
          ) : eye === "wide" ? (
            <group position={[R * 0.55, 0.03, 0.008]}>
              <F g={circle(0.06)} outline={circle(0.06 + 0.015)} c="#fbf6ea" />
              <F g={circle(0.022 * (e.pupil ?? 1))} c={C.ink} pos={[0.015, 0, 0.002]} />
            </group>
          ) : (
            <group position={[R * 0.55, 0.02, 0.008]} scale={[1, 1 - blink, 1]}>
              <F g={circle(0.034)} c={C.ink} />
              <F g={circle(0.011)} c="#ffffff" pos={[0.01, 0.012, 0.002]} unlit />
            </group>
          )}
          {/* brow */}
          <F g={roundRect(0.08, 0.018, 0.009)} c={C.ink} pos={[R * 0.55, 0.11 + (e.browY ?? 0), 0.008]} rot={-(e.brow ?? 0) * 0.8} />
          {/* nose */}
          <F g={circle(0.035)} c={L.skinShade} pos={[R * 0.97, -0.04, -0.001]} />
          {/* mouth */}
          {e.mouth === "o" || e.mouth === "open" ? (
            <F g={circle(0.035 * (1 + (e.mouthOpen ?? 0.5)))} c={C.ink} pos={[R * 0.72, -0.15, 0.008]} scale={[0.8, 1]} />
          ) : e.mouth === "smile" || e.mouth === "hum" ? (
            <F g={arc(0.045, 0.011)} c={C.ink} pos={[R * 0.72, -0.12, 0.008]} rot={Math.PI} />
          ) : (
            <F g={roundRect(0.06, 0.018, 0.009)} c={C.ink} pos={[R * 0.75, -0.14, 0.008]} />
          )}
          {(e.sweat ?? 0) > 0 && <F g={drop(0.03)} c="#b9dfe8" pos={[-0.1, 0.12 - (e.sweat ?? 0) * 0.2, 0.01]} />}
        </>
      )}
    </group>
  );
};

export type SideProps = {
  L?: Look;
  x: number;
  y?: number;
  z: number;
  pose: Pose;
  e?: Expr;
  facing?: 1 | -1;
  scale?: number;
  rot?: number;
  tip?: number; // tilt shoes onto toes
  shadow?: number;
  holdN?: React.ReactNode;
};

export const SideFigure: React.FC<SideProps> = ({ L = HERO, x, y = 0, z, pose, e = {}, facing = 1, scale = 1, rot = 0, tip = 0, shadow = 0.25, holdN }) => {
  const hip = groundHeight(pose) * scale;
  return (
    <group position={[x, y, z]}>
      {shadow > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.03, 0.01, 0]} scale={[1, 0.3, 1]}>
          <circleGeometry args={[0.42 * scale, 24]} />
          <meshBasicMaterial color="#1a120c" transparent opacity={shadow} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <group scale={[facing * scale, scale, 1]} position={[0, hip, 0]} rotation={[0, 0, rot * facing]}>
        <SideLeg L={L} t={pose.tF} s={pose.sF} z={-0.1} far tip={tip} />
        <group rotation={[0, 0, pose.torso]}>
          <SideArm L={L} a={pose.aF} f={pose.fF} z={-0.14} far />
        </group>
        <group rotation={[0, 0, pose.torso]}>
          {/* shirt (side: narrower trapezoid) */}
          <F g={trap(0.3, 0.36, DIM.torso + 0.06, 0.08)} outline={trap(0.3 + O * 2, 0.36 + O * 2, DIM.torso + 0.06 + O * 2, 0.09)} c={L.shirt} pos={[0, -0.04, 0]} />
          <F g={roundRect(0.36, 0.1, 0.04, 0, -0.01)} c={L.pants} pos={[0, 0, 0.002]} />
          <group position={[0, DIM.torso + 0.02, 0.004]}>
            <F g={roundRect(0.1, 0.1, 0.03)} c={L.skinShade} pos={[0, 0.02, -0.002]} />
            <group position={[0.02, DIM.headR - 0.02, 0.002]} rotation={[0, 0, pose.head]}>
              <SideHead L={L} e={e} />
            </group>
          </group>
        </group>
        <SideLeg L={L} t={pose.tN} s={pose.sN} z={0.06} far={false} tip={tip} />
        <group rotation={[0, 0, pose.torso]}>
          <SideArm L={L} a={pose.aN} f={pose.fN} z={0.1} far={false} hold={holdN} />
        </group>
      </group>
    </group>
  );
};

/* ---------------------------------- front view ---------------------------------- */

export const FrontHead: React.FC<{ L?: Look; e: Expr; R?: number }> = ({ L = HERO, e, R = DIM.headR }) => {
  const k = R / DIM.headR;
  const lx = (e.lookX ?? 0) * 0.035;
  const ly = (e.lookY ?? 0) * 0.03;
  const eye = e.eye ?? "dot";
  const blink = e.blink ?? 0;
  const es = e.eyeScale ?? 1;
  const brow = e.brow ?? 0;
  const by = e.browY ?? 0;
  return (
    <group scale={[k, k, 1]}>
      {/* ears */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.29, -0.01, -0.02]}>
          <F g={circle(0.075)} outline={circle(0.075 + O)} c={L.skin} />
          <F g={circle(0.035)} c={L.skinShade} pos={[0, 0, 0.002]} />
        </group>
      ))}
      <F g={circle(0.3, 48)} outline={circle(0.3 + O, 48)} c={L.skin} />
      {/* hair cap with straight fringe, like the reference */}
      <F g={chord(0.31, 0.42)} c={L.hair} pos={[0, 0.0, 0.004]} />
      <F g={capsule(0.03, 0.12, true)} c={L.hair} pos={[0.06, 0.28, 0.003]} rot={-0.4} />
      {/* eyes */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.1, -0.01, 0.01]}>
          {eye === "closed" || blink > 0.85 ? (
            <F g={arc(0.035, 0.011)} c={C.ink} rot={Math.PI} pos={[0, 0.01, 0]} />
          ) : eye === "squint" ? (
            <F g={roundRect(0.07, 0.016, 0.008)} c={C.ink} rot={s * 0.25} />
          ) : eye === "wide" ? (
            <group scale={[es, es * (1 - blink), 1]}>
              <F g={circle(0.055)} outline={circle(0.055 + 0.014)} c="#fbf6ea" />
              <F g={circle(0.024 * (e.pupil ?? 1))} c={C.ink} pos={[lx, ly, 0.003]} />
            </group>
          ) : (
            <group scale={[es, es * (1 - blink), 1]}>
              <F g={circle(0.032)} c={C.ink} pos={[lx, ly, 0]} />
              <F g={circle(0.01)} c="#ffffff" pos={[lx + 0.01, ly + 0.012, 0.003]} unlit />
            </group>
          )}
        </group>
      ))}
      {/* brows */}
      <F g={roundRect(0.08, 0.018, 0.009)} c={C.ink} pos={[-0.1, 0.085 + by, 0.012]} rot={brow * 0.5} />
      <F g={roundRect(0.08, 0.018, 0.009)} c={C.ink} pos={[0.1, 0.085 + by, 0.012]} rot={-brow * 0.5} />
      {/* cheeks */}
      {(e.blush ?? 0) > 0 &&
        [-1, 1].map((s) => <F key={s} g={circle(0.045)} c={C.cheek} pos={[s * 0.18, -0.08, 0.008]} opacity={0.8 * (e.blush ?? 0)} />)}
      {/* nose */}
      <F g={circle(0.022)} c={L.skinShade} pos={[0, -0.06, 0.01]} />
      {/* mouth */}
      <group position={[0, -0.14, 0.012]}>
        {e.mouth === "smile" && <F g={arc(0.05, 0.011)} c={C.ink} rot={Math.PI} pos={[0, 0.03, 0]} />}
        {e.mouth === "hum" && <F g={arc(0.035, 0.011)} c={C.ink} rot={Math.PI} pos={[0, 0.02, 0]} />}
        {(e.mouth === "o" || e.mouth === "open") && (
          <group scale={[1, 1 + (e.mouthOpen ?? 0) * 0.8, 1]}>
            <F g={circle(0.036)} outline={circle(0.036 + 0.012)} c="#6b3a33" scale={[0.85, 1]} />
          </group>
        )}
        {e.mouth === "wobble" &&
          [-2, -1, 0, 1, 2].map((i) => (
            <F key={i} g={roundRect(0.03, 0.013, 0.006)} c={C.ink} pos={[i * 0.022, (i % 2 ? 1 : -1) * 0.006, 0]} rot={(i % 2 ? 1 : -1) * 0.5} />
          ))}
        {e.mouth === "grit" && (
          <>
            <F g={roundRect(0.11, 0.04, 0.012)} outline={roundRect(0.11 + 0.024, 0.04 + 0.024, 0.02)} c="#fbf6ea" />
            <F g={roundRect(0.11, 0.008, 0.002)} c={C.ink} pos={[0, 0, 0.002]} />
          </>
        )}
        {(e.mouth === "line" || !e.mouth) && <F g={roundRect(0.06, 0.016, 0.008)} c={C.ink} />}
      </group>
      {(e.sweat ?? 0) > 0 && (
        <F g={drop(0.028)} outline={drop(0.028 + 0.008)} c="#b9dfe8" pos={[0.24, 0.12 - (e.sweat ?? 0) * 0.22, 0.02]} unlit />
      )}
    </group>
  );
};

// torso + head seen from the front (arms either down or tied behind)
export const FrontBody: React.FC<{ L?: Look; e: Expr; armsBehind?: boolean; breathe?: number; headTilt?: number; headTurn?: number }> = ({
  L = HERO,
  e,
  armsBehind,
  breathe = 0,
  headTilt = 0,
  headTurn = 0,
}) => (
  <group>
    {/* arms */}
    {[-1, 1].map((s) =>
      armsBehind ? (
        <group key={s} position={[s * 0.2, 0.46, -0.03]} rotation={[0, 0, s * 0.25]}>
          <Seg r={0.058} len={0.24} c={L.skinShade} />
        </group>
      ) : (
        <group key={s} position={[s * 0.21, 0.46, 0.02]} rotation={[0, 0, s * 0.12]}>
          <Seg r={0.058} len={0.44} c={L.skin} />
          <F g={capsule(0.085, 0.06)} outline={capsule(0.085 + O, 0.06)} c={L.shirt} pos={[0, 0, 0.003]} />
          <F g={circle(0.07)} outline={circle(0.07 + O)} c={L.skin} pos={[0, -0.46, 0.002]} />
        </group>
      ),
    )}
    {/* shirt with pocket */}
    <group scale={[1 + breathe * 0.02, 1 + breathe * 0.015, 1]}>
      <F g={trap(0.4, 0.5, 0.58, 0.08)} outline={trap(0.4 + O * 2, 0.5 + O * 2, 0.58 + O * 2, 0.09)} c={L.shirt} pos={[0, -0.04, 0.01]} />
      <F g={trap(0.24, 0.3, 0.16, 0.03)} outline={trap(0.24 + 0.03, 0.3 + 0.03, 0.16 + 0.03, 0.03)} c={L.shirtDark} pos={[0, 0.06, 0.015]} />
      <F g={circle(0.07, 24, Math.PI, Math.PI)} c={L.skinShade} pos={[0, 0.54, 0.016]} />
    </group>
    <group position={[0, 0.82, 0.03]} rotation={[0, headTurn, headTilt]}>
      <FrontHead L={L} e={e} />
    </group>
  </group>
);
