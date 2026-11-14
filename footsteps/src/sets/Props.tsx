import React from "react";
import * as THREE from "three";
import { C, F, INK_W as O } from "../lib/draw";
import { blob, circle, poly, radialTex, roundRect } from "../lib/shapes";

const VAN_BODY: [number, number][] = [
  [-2.45, 0.32],
  [2.42, 0.32],
  [2.5, 0.95],
  [2.25, 1.22],
  [1.55, 1.3],
  [1.15, 2.08],
  [-2.3, 2.12],
  [-2.48, 1.9],
];
const grow = (pts: [number, number][], d: number): [number, number][] => {
  const cx = 0;
  const cy = 1.2;
  return pts.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const l = Math.hypot(dx, dy);
    return [x + (dx / l) * d, y + (dy / l) * d];
  });
};

const Wheel: React.FC<{ x: number; spin: number }> = ({ x, spin }) => (
  <group position={[x, 0.38, 0.05]}>
    <F g={circle(0.4)} outline={circle(0.4 + O)} c="#2a2826" />
    <F g={circle(0.2)} c="#9a9b94" pos={[0, 0, 0.005]} />
    <group rotation={[0, 0, spin]} position={[0, 0, 0.01]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <F key={i} g={circle(0.035)} c="#5b5c57" pos={[Math.cos((i * Math.PI * 2) / 5) * 0.12, Math.sin((i * Math.PI * 2) / 5) * 0.12, 0]} />
      ))}
    </group>
  </group>
);

// Side view of a grey Thai minivan (รถตู้), facing +x
export const VanSide: React.FC<{
  x: number;
  z: number;
  facing?: 1 | -1;
  spin?: number;
  rock?: number;
  lights?: number;
  brake?: number;
  shadows?: number; // 0..1 struggling silhouettes behind the glass
  f?: number;
}> = ({ x, z, facing = 1, spin = 0, rock = 0, lights = 1, brake = 0, shadows = 0, f = 0 }) => (
  <group position={[x, 0, z]} scale={[facing, 1, 1]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.2]} scale={[1, 0.25, 1]}>
      <circleGeometry args={[2.8, 32]} />
      <meshBasicMaterial color="#1a1612" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
    </mesh>
    <group rotation={[0, 0, rock]} position={[0, 0, 0]}>
      <F g={poly("vanO", grow(VAN_BODY, O * 1.4))} c={C.ink} pos={[0, 0, -0.01]} />
      <F g={poly("van", VAN_BODY)} c={C.van} />
      {/* lower body trim */}
      <F g={roundRect(4.8, 0.32, 0.08, 0, 0.55)} c={C.vanDark} pos={[0, 0, 0.004]} />
      {/* windows */}
      <F g={poly("wind", [[1.45, 1.38], [1.1, 1.95], [0.35, 1.95], [0.35, 1.38]])} c={C.glass} pos={[0, 0, 0.006]} />
      {[[-0.8, 0.95], [-2.0, 0.95]].map(([cx, w], i) => (
        <F key={i} g={roundRect(w, 0.56, 0.08, cx + w / 2 + 0.05, 1.67)} outline={roundRect(w + O * 2, 0.56 + O * 2, 0.09, cx + w / 2 + 0.05, 1.67)} c={C.glass} pos={[0, 0, 0.006]} />
      ))}
      {/* struggle silhouettes inside */}
      {shadows > 0 &&
        [
          [-0.35, 0.0],
          [-1.35, 1.7],
          [0.7, 3.1],
        ].map(([px, ph], i) => (
          <group key={i} position={[px + Math.sin(f * 0.6 + ph) * 0.25 * shadows, 1.62 + Math.sin(f * 0.9 + ph * 2) * 0.12 * shadows, 0.008]}>
            <F g={circle(0.2)} c="#121110" opacity={0.85 * shadows} />
            <F g={roundRect(0.5, 0.3, 0.12, 0, -0.3)} c="#121110" opacity={0.85 * shadows} />
          </group>
        ))}
      {/* sliding door seams + handle */}
      <F g={roundRect(0.025, 1.5, 0.01, 0.3, 1.05)} c={C.ink} pos={[0, 0, 0.007]} />
      <F g={roundRect(0.025, 1.5, 0.01, -1.0, 1.05)} c={C.ink} pos={[0, 0, 0.007]} />
      <F g={roundRect(0.22, 0.06, 0.03, 0.12, 1.2)} c={C.ink} pos={[0, 0, 0.008]} />
      {/* mirror, lights */}
      <F g={roundRect(0.14, 0.22, 0.05, 1.5, 1.45)} outline={roundRect(0.14 + O * 2, 0.22 + O * 2, 0.06, 1.5, 1.45)} c={C.vanDark} pos={[0, 0, 0.01]} />
      <F g={roundRect(0.16, 0.18, 0.06, 2.38, 1.02)} c={lights > 0.5 ? "#fff3cf" : "#c9c3ad"} pos={[0, 0, 0.008]} unlit />
      <F g={roundRect(0.1, 0.32, 0.04, -2.42, 1.15)} c={brake > 0.5 ? "#ff5a4a" : "#9b3b33"} pos={[0, 0, 0.008]} unlit />
      {lights > 0 && (
        <mesh position={[3.6, 0.95, 0.02]} rotation={[0, 0, 0]}>
          <planeGeometry args={[3, 1.4]} />
          <meshBasicMaterial map={radialTex("rgba(255,236,190,0.6)", "rgba(255,236,190,0)")} transparent opacity={lights} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {brake > 0 && (
        <mesh position={[-2.6, 1.15, 0.02]}>
          <planeGeometry args={[1.4, 1.4]} />
          <meshBasicMaterial map={radialTex("rgba(255,80,60,0.7)", "rgba(255,80,60,0)")} transparent opacity={brake} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
    <Wheel x={1.55} spin={-spin} />
    <Wheel x={-1.55} spin={-spin} />
  </group>
);

// Front view of the van (coming toward camera)
export const VanFront: React.FC<{ x: number; z: number; lights?: number; flare?: number }> = ({ x, z, lights = 0, flare = 1 }) => (
  <group position={[x, 0, z]}>
    {[-1, 1].map((s) => (
      <F key={s} g={roundRect(0.3, 0.55, 0.1)} c="#2a2826" pos={[s * 0.8, 0.3, -0.05]} />
    ))}
    <F g={roundRect(2.0, 1.75, 0.25, 0, 1.2)} outline={roundRect(2.0 + O * 2, 1.75 + O * 2, 0.27, 0, 1.2)} c={C.van} />
    <F g={poly("wsF", [[-0.85, 1.45], [0.85, 1.45], [0.72, 2.0], [-0.72, 2.0]])} c={C.glass} pos={[0, 0, 0.01]} />
    <F g={roundRect(0.9, 0.22, 0.06, 0, 0.82)} c={C.vanDark} pos={[0, 0, 0.01]} />
    <F g={roundRect(2.05, 0.22, 0.08, 0, 0.45)} outline={roundRect(2.05 + O * 2, 0.22 + O * 2, 0.09, 0, 0.45)} c={C.vanDark} pos={[0, 0, 0.012]} />
    <F g={roundRect(0.5, 0.14, 0.02, 0, 0.45)} c="#ece6d6" pos={[0, 0, 0.016]} />
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.72, 0.95, 0.015]}>
        <F g={roundRect(0.36, 0.2, 0.08)} outline={roundRect(0.36 + O * 2, 0.2 + O * 2, 0.09)} c={lights > 0.5 ? "#fff6dc" : "#c9c3ad"} unlit />
        {lights > 0 && (
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[2.6 * flare, 2.6 * flare]} />
            <meshBasicMaterial map={radialTex("rgba(255,240,200,0.9)", "rgba(255,240,200,0)")} transparent opacity={lights} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        )}
      </group>
    ))}
  </group>
);

// ชาเย็นถุง — Thai iced tea in a plastic bag with a straw
export const TeaBag: React.FC<{ scale?: number; level?: number }> = ({ scale = 1, level = 1 }) => (
  <group scale={[scale, scale, 1]}>
    <F g={roundRect(0.02, 0.18, 0.01, 0, 0.12)} c="#e7e1d1" pos={[0, 0, -0.002]} />
    <F
      g={poly("teabag", [[-0.07, 0.02], [0.07, 0.02], [0.12, -0.2], [0.09, -0.3], [-0.09, -0.3], [-0.12, -0.2]])}
      c="#f2ead8"
      opacity={0.9}
    />
    <F g={poly(`tealiq${level}`, [[-0.11, -0.3 + 0.28 * level], [0.11, -0.3 + 0.28 * level], [0.09, -0.3], [-0.09, -0.3]])} c="#d27a3c" pos={[0, 0, 0.002]} />
    <F g={roundRect(0.022, 0.42, 0.01, 0.03, 0.06)} c="#e2524a" pos={[0, 0, 0.004]} rot={-0.15} />
  </group>
);

// spilled tea on the pavement
export const SpilledTea: React.FC<{ spread: number }> = ({ spread }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.006, 0]} scale={[0.4 + spread * 1.1, 0.4 + spread * 0.7, 1]}>
      <primitive object={blob(77, 0.5, 0.25)} attach="geometry" />
      <meshBasicMaterial color="#b9713f" transparent opacity={0.85} toneMapped={false} />
    </mesh>
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <group rotation={[0, 0, 1.4]}>
        <TeaBag scale={1.6} level={0.25} />
      </group>
    </group>
    {[
      [0.45, 0.2, 0.3],
      [0.7, -0.15, 0.9],
      [0.25, -0.3, 0.2],
      [0.9, 0.18, 0.6],
    ].map(([x, z, r], i) => (
      <mesh key={i} rotation={[-Math.PI / 2, 0, r]} position={[x * (0.5 + spread * 0.6), 0.03, z]}>
        <primitive object={roundRect(0.09, 0.09, 0.025)} attach="geometry" />
        <meshBasicMaterial color="#e3f1f2" transparent opacity={0.9} toneMapped={false} />
      </mesh>
    ))}
  </group>
);
