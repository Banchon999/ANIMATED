import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { continueRender, delayRender } from "remotion";
import type { V3 } from "./lib";

// Small building blocks shared by the newer sets (temple, market, ricefield, cityroom).

/** Lambert box. */
export const B: React.FC<{ p: V3; s: V3; c: string; r?: V3; sh?: boolean; map?: THREE.Texture; flat?: boolean }> = ({ p, s, c, r, sh = true, map, flat }) => (
  <mesh position={p} rotation={r} castShadow={sh} receiveShadow>
    <boxGeometry args={s} />
    <meshLambertMaterial color={c} map={map} flatShading={flat} />
  </mesh>
);

/** Unlit box: lamps, lit windows, screens. */
export const Lit: React.FC<{ p: V3; s: V3; c: string; r?: V3; map?: THREE.Texture; opacity?: number }> = ({ p, s, c, r, map, opacity }) => (
  <mesh position={p} rotation={r}>
    <boxGeometry args={s} />
    <meshBasicMaterial color={c} map={map} toneMapped={false} transparent={opacity !== undefined} opacity={opacity ?? 1} />
  </mesh>
);

/** Cylinder between two points. */
export const Rod: React.FC<{ a: V3; b: V3; r?: number; c: string; seg?: number; sh?: boolean }> = ({ a, b, r = 0.03, c, seg = 6, sh = true }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rotation={[e.x, e.y, e.z]} castShadow={sh}>
      <cylinderGeometry args={[r, r, len, seg]} />
      <meshLambertMaterial color={c} />
    </mesh>
  );
};

/** Flat ground plane (horizontal), optional texture. */
export const Ground: React.FC<{ p: V3; w: number; d: number; c?: string; map?: THREE.Texture; basic?: boolean; opacity?: number }> = ({ p, w, d, c = "#ffffff", map, basic, opacity }) => (
  <mesh position={p} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[w, d]} />
    {basic ? (
      <meshBasicMaterial color={c} map={map} transparent={opacity !== undefined} opacity={opacity ?? 1} />
    ) : (
      <meshLambertMaterial color={c} map={map} transparent={opacity !== undefined} opacity={opacity ?? 1} />
    )}
  </mesh>
);

/** Soft contact shadows under the 2D actors. */
export const Blobs: React.FC<{ blobs: { x: number; z: number; r?: number }[]; y?: number; c?: string; o?: number }> = ({ blobs, y = 0.02, c = "#2e2618", o = 0.28 }) => (
  <>
    {blobs.map((b, i) => (
      <mesh key={i} position={[b.x, y, b.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]}>
        <circleGeometry args={[b.r ?? 0.42, 20]} />
        <meshBasicMaterial color={c} transparent opacity={o} />
      </mesh>
    ))}
  </>
);

/** Darken / lighten a #rrggbb colour. */
export const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

/**
 * Canvas text needs Kanit to be loaded before the texture is drawn. Returns true once it is; holds the
 * render (delayRender) until then, with a timeout so a missing font never hangs a render.
 */
export const useKanit = () => {
  const has = () =>
    typeof document !== "undefined" && Array.from(document.fonts as unknown as Iterable<FontFace>).some((f) => f.family.replace(/"/g, "") === "Kanit" && f.status === "loaded");
  const [ready, setReady] = useState(has);
  useEffect(() => {
    if (ready) return;
    const h = delayRender("kanit for canvas text");
    let n = 0;
    const id = setInterval(() => {
      n++;
      if (has() || n > 100) {
        clearInterval(id);
        setReady(true);
        continueRender(h);
      }
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ready;
};
