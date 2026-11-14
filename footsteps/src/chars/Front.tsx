import React, { useMemo } from "react";
import * as THREE from "three";
import { C, F, INK_W as O, Mat, useLit } from "../lib/draw";
import { mix } from "../lib/anim";
import { capsule, roundRect } from "../lib/shapes";
import { Expr, FrontBody, HERO } from "./Person";

// toon rope: a tube with an inverted-hull ink outline
export const RopeTube: React.FC<{ pts: THREE.Vector3[]; r?: number; closed?: boolean; k?: string }> = ({ pts, r = 0.028, closed = false, k = "" }) => {
  const { shadows } = useLit();
  const geos = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(pts, closed);
    return [new THREE.TubeGeometry(curve, 48, r, 8, closed), new THREE.TubeGeometry(curve, 48, r + 0.013, 8, closed)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, r, closed, pts.map((p) => p.toArray().join(",")).join("|")]);
  return (
    <group>
      <mesh geometry={geos[1]}>
        <meshBasicMaterial color={C.ink} side={THREE.BackSide} toneMapped={false} />
      </mesh>
      <mesh geometry={geos[0]} castShadow={shadows}>
        <Mat color={C.rope} />
      </mesh>
      {/* twist stripes */}
    </group>
  );
};

// a loop of rope around the torso (ellipse in the xz plane)
export const loopPts = (rx: number, rz: number, y: number, wob = 0, n = 14) =>
  Array.from({ length: n }).map((_, i) => {
    const a = (i / n) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * rx, y + Math.sin(a * 3) * wob, Math.sin(a) * rz);
  });

// legs seen from the front; sit = 1 seated (thighs foreshortened toward camera), 0 standing
export const FrontLegs: React.FC<{ sit: number; hipY: number; spread?: number }> = ({ sit, hipY, spread = 0.12 }) => {
  const thigh = mix(0.32, 0.1, sit);
  const shin = 0.36;
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * spread, hipY, 0.02 + sit * 0.25]}>
          <F g={capsule(0.09, thigh)} outline={capsule(0.09 + O, thigh)} c={HERO.pants} />
          <group position={[s * sit * 0.03, -thigh, 0.01]}>
            <F g={capsule(0.082, shin)} outline={capsule(0.082 + O, shin)} c={HERO.pants} />
            <F g={roundRect(0.2, 0.13, 0.065)} outline={roundRect(0.2 + O * 2, 0.13 + O * 2, 0.08)} c={HERO.shoe} pos={[s * 0.02, -shin - 0.03, 0.02]} />
          </group>
        </group>
      ))}
    </group>
  );
};

// the hero sitting (sit=1) or standing (sit=0), seen from the front
export const FrontHero: React.FC<{
  x?: number;
  z?: number;
  sit: number;
  e: Expr;
  tied?: number; // 1 = ropes snug around torso, 0 = fallen off
  armsBehind?: boolean;
  breathe?: number;
  headTilt?: number;
  headTurn?: number;
  sway?: number;
}> = ({ x = 0, z = 0, sit, e, tied = 0, armsBehind = true, breathe = 0, headTilt = 0, headTurn = 0, sway = 0 }) => {
  const hipY = mix(0.66, 0.56, sit);
  const legsHip = mix(0.66, 0.48, sit);
  const ropeDrop = 1 - tied;
  return (
    <group position={[x, 0, z]}>
      <FrontLegs sit={sit} hipY={legsHip} />
      <group position={[0, hipY, 0.0]} rotation={[0, 0, sway]}>
        <FrontBody e={e} armsBehind={armsBehind} breathe={breathe} headTilt={headTilt} headTurn={headTurn} />
        {tied > 0.01 &&
          [0.16, 0.34].map((y, i) => (
            <group key={y} position={[0, -ropeDrop * (y + 0.5 + i * 0.1), 0]} rotation={[ropeDrop * 0.5 * (i ? 1 : -1), 0, ropeDrop * 0.3]}>
              <RopeTube pts={loopPts(0.29 + ropeDrop * 0.1 - i * 0.02, 0.16 + ropeDrop * 0.05, y, 0.012)} closed k={`torso${i}`} />
            </group>
          ))}
      </group>
    </group>
  );
};
