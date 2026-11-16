import React, { useMemo } from "react";
import * as THREE from "three";
import { makeTex } from "./NightRoom";
import type { Era } from "./People";
import { V3 } from "./lib";
import { PaperKind, PAPER_SIZE, usePaperTex } from "./Paper";

// Shared prop library: low-poly props at real-world scale that any set can hold, placed by the script
// (ShotScript.props, ClipScript.setProps). Every model is built around its own origin: the centre of its
// footprint on the surface it stands on, front facing +z (towards the camera when rot = 0), long side along x.
// No brands, logos, real banknotes or real people: screens are plain, money is plain coloured paper,
// the photo is a blank silhouette.

export type PropCue = {
  kind: PropKind;
  at: [number, number]; // x, z of the footprint centre
  rot?: number; // degrees around the vertical axis, 0 = front towards +z
  scale?: number; // 1 = real size
  on?: number; // height of the surface it stands on (floor 0, table 0.75)
};

type PropDef = {
  label: string; // Thai name for sheets
  eras: Era[]; // eras it belongs to
  size: V3; // bounding box at scale 1: width (x), height (y), depth (z)
  focus: number; // height of the point the camera aims at ("prop:N")
  flat?: boolean; // lies flat: close-ups look down on it
  /** close-up framing for readable things: frame width in metres at the end of the push-in, camera elevation in degrees */
  close?: { w: number; el: number };
  Model: React.FC;
};

const ALL: Era[] = ["old", "rural", "city"];

// ---------- small helpers (Lambert, flat shaded) ----------
const M: React.FC<{ c: string; flat?: boolean }> = ({ c, flat = true }) => <meshLambertMaterial color={c} flatShading={flat} />;
const Bx: React.FC<{ p: V3; s: V3; c: string; r?: V3 }> = ({ p, s, c, r }) => (
  <mesh position={p} rotation={r} castShadow receiveShadow>
    <boxGeometry args={s} />
    <M c={c} />
  </mesh>
);
const Cy: React.FC<{ p: V3; r0: number; r1?: number; h: number; c: string; seg?: number; rot?: V3; open?: boolean }> = ({ p, r0, r1, h, c, seg = 10, rot, open }) => (
  <mesh position={p} rotation={rot} castShadow receiveShadow>
    <cylinderGeometry args={[r0, r1 ?? r0, h, seg, 1, open]} />
    <meshLambertMaterial color={c} flatShading side={open ? THREE.DoubleSide : THREE.FrontSide} />
  </mesh>
);
const Sp: React.FC<{ p: V3; r: number; c: string; s?: V3; seg?: number }> = ({ p, r, c, s, seg = 8 }) => (
  <mesh position={p} scale={s} castShadow receiveShadow>
    <sphereGeometry args={[r, seg, Math.max(4, seg - 2)]} />
    <M c={c} />
  </mesh>
);
/** Unlit part: flames, screens, embers. */
const Glowy: React.FC<{ p: V3; s: V3; c: string; r?: V3; cone?: boolean }> = ({ p, s, c, r, cone }) => (
  <mesh position={p} rotation={r}>
    {cone ? <coneGeometry args={[s[0], s[1], 8]} /> : <boxGeometry args={s} />}
    <meshBasicMaterial color={c} toneMapped={false} />
  </mesh>
);
/** Rod between two points. */
const Rd: React.FC<{ a: V3; b: V3; r?: number; c: string }> = ({ a, b, r = 0.012, c }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rotation={[e.x, e.y, e.z]} castShadow>
      <cylinderGeometry args={[r, r, d.length(), 6]} />
      <M c={c} />
    </mesh>
  );
};
/** Wheel standing in the x-y plane (axle along z). */
const Wheel: React.FC<{ p: V3; r: number; w?: number; tyre?: string; hub?: string; spokes?: boolean }> = ({ p, r, w = 0.05, tyre = "#1e1e22", hub = "#9aa0a6", spokes }) => (
  <group position={p}>
    <mesh rotation={[0, 0, 0]} castShadow>
      <torusGeometry args={[r - w * 0.45, w * 0.45, 6, 16]} />
      <M c={tyre} />
    </mesh>
    {spokes ? (
      [0, 1, 2, 3, 4, 5].map((i) => <Rd key={i} a={[0, 0, 0]} b={[Math.cos((i * Math.PI) / 3) * (r - w), Math.sin((i * Math.PI) / 3) * (r - w), 0]} r={0.004} c={hub} />)
    ) : (
      <Cy p={[0, 0, 0]} r0={r * 0.55} h={w * 0.8} c={hub} rot={[Math.PI / 2, 0, 0]} />
    )}
    <Cy p={[0, 0, 0]} r0={r * 0.12} h={w * 1.4} c="#55585e" rot={[Math.PI / 2, 0, 0]} />
  </group>
);
/** Lathe (turned) shape from [radius, height] points. */
const Lathe: React.FC<{ pts: [number, number][]; c: string; seg?: number; p?: V3 }> = ({ pts, c, seg = 14, p }) => {
  const g = useMemo(() => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), [pts, seg]);
  return (
    <mesh geometry={g} position={p} castShadow receiveShadow>
      <meshLambertMaterial color={c} flatShading side={THREE.DoubleSide} />
    </mesh>
  );
};

// ---------- the models ----------
const WOOD = "#8a5a34";
const WOOD_D = "#5e3b20";

const Table: React.FC = () => (
  <group>
    <Bx p={[0, 0.73, 0]} s={[1.0, 0.04, 0.6]} c={WOOD} />
    <Bx p={[0, 0.66, 0]} s={[0.9, 0.08, 0.5]} c={WOOD_D} />
    {[[-0.45, -0.25], [0.45, -0.25], [-0.45, 0.25], [0.45, 0.25]].map(([x, z], i) => <Bx key={i} p={[x, 0.355, z]} s={[0.05, 0.71, 0.05]} c={WOOD_D} />)}
  </group>
);

const PlasticChair: React.FC = () => {
  const c = "#c8262a";
  return (
    <group>
      <Bx p={[0, 0.44, 0.01]} s={[0.44, 0.04, 0.42]} c={c} />
      {[[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.18], [0.19, 0.18]].map(([x, z], i) => (
        <Rd key={i} a={[x * 1.15, 0, z * 1.18]} b={[x, 0.43, z]} r={0.022} c={c} />
      ))}
      <Bx p={[0, 0.66, -0.2]} s={[0.42, 0.34, 0.03]} c={c} r={[-0.12, 0, 0]} />
      <Bx p={[-0.21, 0.56, -0.02]} s={[0.03, 0.03, 0.38]} c={c} />
      <Bx p={[0.21, 0.56, -0.02]} s={[0.03, 0.03, 0.38]} c={c} />
      <Rd a={[-0.21, 0.44, 0.16]} b={[-0.21, 0.56, 0.16]} r={0.015} c={c} />
      <Rd a={[0.21, 0.44, 0.16]} b={[0.21, 0.56, 0.16]} r={0.015} c={c} />
    </group>
  );
};

const Stool: React.FC = () => (
  <group>
    <Cy p={[0, 0.43, 0]} r0={0.16} h={0.04} c={WOOD} seg={12} />
    {[0, 1, 2, 3].map((i) => {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      return <Rd key={i} a={[Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15]} b={[Math.cos(a) * 0.1, 0.42, Math.sin(a) * 0.1]} r={0.018} c={WOOD_D} />;
    })}
    {[0, 1].map((i) => <Bx key={i} p={[0, 0.16, 0]} s={i ? [0.02, 0.02, 0.25] : [0.25, 0.02, 0.02]} c={WOOD_D} />)}
  </group>
);

const Mat: React.FC = () => {
  const tex = useMemo(
    () =>
      makeTex(256, 128, (c) => {
        c.fillStyle = "#d8c08a";
        c.fillRect(0, 0, 256, 128);
        for (let y = 0; y < 128; y += 4) {
          c.fillStyle = y % 8 ? "rgba(120,90,40,0.25)" : "rgba(255,240,200,0.25)";
          c.fillRect(0, y, 256, 2);
        }
        c.fillStyle = "#a8382a";
        for (const y of [14, 22, 106, 114]) c.fillRect(0, y, 256, 4);
        c.fillStyle = "#2f6a4a";
        for (let x = 20; x < 256; x += 36) c.fillRect(x, 50, 14, 28);
      }),
    [],
  );
  return (
    <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <boxGeometry args={[1.8, 0.9, 0.012]} />
      <meshLambertMaterial map={tex} />
    </mesh>
  );
};

const Bicycle: React.FC = () => {
  const f = "#22262c";
  const r = 0.34;
  const A: V3 = [-0.52, r, 0]; // rear axle
  const F: V3 = [0.55, r, 0]; // front axle
  const crank: V3 = [-0.05, 0.3, 0];
  const seat: V3 = [-0.2, 0.86, 0];
  const head: V3 = [0.42, 0.88, 0];
  return (
    <group>
      <Wheel p={A} r={r} w={0.04} spokes />
      <Wheel p={F} r={r} w={0.04} spokes />
      <Rd a={A} b={crank} c={f} r={0.014} />
      <Rd a={A} b={seat} c={f} r={0.014} />
      <Rd a={crank} b={seat} c={f} r={0.016} />
      <Rd a={crank} b={head} c={f} r={0.018} />
      <Rd a={[seat[0] + 0.03, seat[1] - 0.06, 0]} b={head} c={f} r={0.016} />
      <Rd a={F} b={head} c={f} r={0.016} />
      <Rd a={head} b={[0.38, 1.0, 0]} c={f} r={0.014} />
      <Rd a={[0.36, 1.0, -0.24]} b={[0.36, 1.0, 0.24]} c={f} r={0.012} />
      <Bx p={[seat[0] - 0.01, seat[1] + 0.03, 0]} s={[0.22, 0.05, 0.11]} c="#4a2e1c" />
      <Cy p={crank} r0={0.07} h={0.02} c="#8a8f96" rot={[Math.PI / 2, 0, 0]} />
      <Bx p={[-0.45, 0.7, 0]} s={[0.36, 0.02, 0.14]} c={f} />
    </group>
  );
};

const Motorbike: React.FC = () => {
  const body = "#2b5fa8";
  const r = 0.29;
  return (
    <group>
      <Wheel p={[-0.62, r, 0]} r={r} w={0.09} />
      <Wheel p={[0.64, r, 0]} r={r} w={0.08} />
      <Bx p={[-0.4, 0.55, 0]} s={[0.62, 0.32, 0.3]} c={body} />
      <Bx p={[-0.3, 0.76, 0]} s={[0.66, 0.1, 0.28]} c="#1c1c1e" />
      <Bx p={[0.0, 0.36, 0]} s={[0.5, 0.08, 0.26]} c="#2a2a2e" />
      <Bx p={[0.32, 0.62, 0]} s={[0.2, 0.62, 0.3]} c={body} r={[0, 0, -0.35]} />
      <Rd a={[0.64, r, 0]} b={[0.46, 0.95, 0]} c="#9aa0a6" r={0.022} />
      <Bx p={[0.47, 0.98, 0]} s={[0.16, 0.14, 0.26]} c={body} />
      <Rd a={[0.44, 1.02, -0.36]} b={[0.44, 1.02, 0.36]} c="#2a2a2e" r={0.014} />
      <Glowy p={[0.56, 0.98, 0]} s={[0.02, 0.08, 0.1]} c="#fff3c8" />
      <Bx p={[0.64, 0.6, 0]} s={[0.34, 0.04, 0.14]} c="#2a2a2e" />
      <Bx p={[-0.74, 0.56, 0]} s={[0.3, 0.04, 0.14]} c="#2a2a2e" />
      <Bx p={[-0.88, 0.62, 0]} s={[0.04, 0.05, 0.12]} c="#c8262a" />
      <Rd a={[-0.2, 0.25, 0.13]} b={[-0.75, 0.25, 0.13]} c="#b0b4b8" r={0.03} />
    </group>
  );
};

const Buffalo: React.FC = () => {
  const c = "#5a5a62";
  const d = "#45454c";
  return (
    <group>
      <Bx p={[-0.05, 1.0, 0]} s={[1.75, 0.72, 0.78]} c={c} />
      <Bx p={[0.62, 1.12, 0]} s={[0.5, 0.62, 0.74]} c={c} r={[0, 0, 0.12]} />
      <Bx p={[-0.75, 1.02, 0]} s={[0.4, 0.62, 0.7]} c={c} />
      {[[-0.68, -0.24], [-0.68, 0.24], [0.55, -0.24], [0.55, 0.24]].map(([x, z], i) => (
        <group key={i}>
          <Bx p={[x, 0.38, z]} s={[0.15, 0.76, 0.15]} c={d} />
          <Bx p={[x, 0.04, z]} s={[0.17, 0.08, 0.17]} c="#222226" />
        </group>
      ))}
      <group position={[1.12, 1.08, 0]} rotation={[0, 0, -0.35]}>
        <Bx p={[0, 0, 0]} s={[0.46, 0.34, 0.38]} c={c} />
        <Bx p={[0.22, -0.08, 0]} s={[0.12, 0.2, 0.28]} c="#5c5c62" />
        {[-1, 1].map((s) => {
          // swept-back crescent horns: out, back and up, tips curling in
          const h: V3[] = [[-0.05, 0.14, s * 0.12], [-0.08, 0.2, s * 0.34], [-0.26, 0.3, s * 0.46], [-0.46, 0.34, s * 0.38], [-0.56, 0.3, s * 0.24]];
          return h.slice(1).map((q, j) => <Rd key={`${s}${j}`} a={h[j]} b={q} r={0.045 - j * 0.009} c="#d8cdb4" />);
        })}
        {[-1, 1].map((s) => <Bx key={s} p={[-0.08, 0.06, s * 0.24]} s={[0.1, 0.05, 0.12]} c={d} />)}
      </group>
      <Rd a={[-0.95, 1.25, 0]} b={[-1.0, 0.65, 0]} c={d} r={0.025} />
    </group>
  );
};

const Dog: React.FC = () => {
  const c = "#c89a5a";
  return (
    <group>
      <Bx p={[0, 0.4, 0]} s={[0.5, 0.2, 0.2]} c={c} />
      {[[-0.18, -0.07], [-0.18, 0.07], [0.18, -0.07], [0.18, 0.07]].map(([x, z], i) => <Bx key={i} p={[x, 0.16, z]} s={[0.05, 0.32, 0.05]} c={c} />)}
      <Bx p={[0.3, 0.55, 0]} s={[0.16, 0.16, 0.15]} c={c} />
      <Bx p={[0.41, 0.52, 0]} s={[0.1, 0.07, 0.08]} c="#e2c08a" />
      <Bx p={[0.46, 0.54, 0]} s={[0.02, 0.03, 0.03]} c="#1e1a18" />
      {[-1, 1].map((s) => <Bx key={s} p={[0.27, 0.66, s * 0.05]} s={[0.04, 0.08, 0.03]} c="#8a6236" r={[0, 0, -0.2]} />)}
      <Rd a={[-0.24, 0.45, 0]} b={[-0.36, 0.6, 0]} c={c} r={0.02} />
    </group>
  );
};

const Cat: React.FC = () => {
  const c = "#d88a3a";
  return (
    <group>
      <Sp p={[0, 0.11, 0]} r={0.11} s={[1, 1.1, 0.85]} c={c} />
      <Sp p={[0.02, 0.27, 0.02]} r={0.075} c={c} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.02 + s * 0.04, 0.35, 0.02]} castShadow>
          <coneGeometry args={[0.025, 0.05, 4]} />
          <M c={c} />
        </mesh>
      ))}
      {[-1, 1].map((s) => <Bx key={s} p={[0.02 + s * 0.028, 0.28, 0.09]} s={[0.012, 0.016, 0.01]} c="#1e1a18" />)}
      <Rd a={[-0.08, 0.03, -0.02]} b={[-0.2, 0.02, 0.1]} c={c} r={0.016} />
      <Bx p={[0.02, 0.03, 0.08]} s={[0.12, 0.05, 0.06]} c="#f2e6d0" />
    </group>
  );
};

const Chicken: React.FC = () => {
  const c = "#b0502a";
  return (
    <group>
      <Sp p={[0, 0.26, 0]} r={0.13} s={[1.25, 0.9, 0.8]} c={c} />
      <Sp p={[0.14, 0.38, 0]} r={0.06} c={c} />
      <Bx p={[0.14, 0.45, 0]} s={[0.06, 0.04, 0.012]} c="#d8202a" />
      <Bx p={[0.13, 0.33, 0]} s={[0.02, 0.04, 0.01]} c="#d8202a" />
      <mesh position={[0.21, 0.38, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.015, 0.04, 4]} />
        <M c="#e8b030" />
      </mesh>
      <Bx p={[-0.16, 0.36, 0]} s={[0.08, 0.16, 0.05]} c="#1e3a2a" r={[0, 0, 0.5]} />
      {[-1, 1].map((s) => <Rd key={s} a={[0.0, 0.0, s * 0.04]} b={[0.0, 0.17, s * 0.04]} c="#e8b030" r={0.008} />)}
    </group>
  );
};

const Tuktuk: React.FC = () => {
  const body = "#2a6ab8";
  const trim = "#f2c230";
  return (
    <group>
      <Wheel p={[1.0, 0.24, 0]} r={0.24} w={0.1} />
      <Wheel p={[-0.85, 0.24, -0.55]} r={0.24} w={0.1} />
      <Wheel p={[-0.85, 0.24, 0.55]} r={0.24} w={0.1} />
      <Bx p={[-0.45, 0.48, 0]} s={[1.55, 0.18, 1.25]} c="#2a2a2e" />
      <Bx p={[-0.7, 0.75, 0]} s={[0.9, 0.36, 1.2]} c={body} />
      <Bx p={[-0.75, 0.98, 0]} s={[0.55, 0.1, 1.1]} c="#7a1e22" />
      <Bx p={[-1.12, 1.25, 0]} s={[0.08, 0.5, 1.15]} c="#7a1e22" />
      <Bx p={[0.35, 0.72, 0]} s={[0.75, 0.42, 0.9]} c={body} />
      <Bx p={[0.82, 0.62, 0]} s={[0.3, 0.6, 0.5]} c={body} r={[0, 0, -0.3]} />
      <Bx p={[0.62, 1.05, 0]} s={[0.05, 0.4, 0.9]} c="#cfe2ea" />
      <Bx p={[0.2, 0.96, 0]} s={[0.25, 0.1, 0.4]} c="#1c1c1e" />
      {[[0.64, -0.6], [0.64, 0.6], [-1.12, -0.6], [-1.12, 0.6]].map(([x, z], i) => <Rd key={i} a={[x, 0.85, z]} b={[x, 1.65, z]} c={trim} r={0.02} />)}
      <Bx p={[-0.25, 1.69, 0]} s={[1.95, 0.08, 1.3]} c={body} />
      <Bx p={[-0.25, 1.62, 0]} s={[1.95, 0.08, 1.32]} c={trim} />
      <Glowy p={[1.0, 0.95, 0]} s={[0.04, 0.12, 0.16]} c="#fff3c8" />
    </group>
  );
};

const Songthaew: React.FC = () => {
  const body = "#b8262a";
  const r = 0.33;
  return (
    <group>
      {[[1.45, -0.72], [1.45, 0.72], [-1.3, -0.72], [-1.3, 0.72]].map(([x, z], i) => <Wheel key={i} p={[x, r, z]} r={r} w={0.2} />)}
      <Bx p={[0, 0.5, 0]} s={[4.5, 0.3, 1.6]} c="#2a2a2e" />
      {/* cab */}
      <Bx p={[1.55, 0.88, 0]} s={[1.35, 0.6, 1.7]} c={body} />
      <Bx p={[1.38, 1.38, 0]} s={[0.95, 0.5, 1.62]} c={body} />
      <Bx p={[1.97, 1.4, 0]} s={[0.05, 0.52, 1.5]} c="#bcd2dc" r={[0, 0, -0.5]} />
      <Bx p={[1.4, 1.36, 0.82]} s={[0.6, 0.32, 0.02]} c="#bcd2dc" />
      <Bx p={[1.4, 1.36, -0.82]} s={[0.6, 0.32, 0.02]} c="#bcd2dc" />
      <Bx p={[2.23, 0.68, 0]} s={[0.06, 0.24, 1.6]} c="#b0b4b8" />
      {[-0.6, 0.6].map((z) => <Glowy key={z} p={[2.24, 0.88, z]} s={[0.02, 0.1, 0.22]} c="#fff3c8" />)}
      {/* covered bed with two benches */}
      <Bx p={[-0.75, 0.78, 0]} s={[2.4, 0.26, 1.72]} c={body} />
      <Bx p={[-0.75, 2.2, 0]} s={[2.5, 0.1, 1.8]} c={body} />
      <Bx p={[-0.75, 2.12, 0]} s={[2.5, 0.06, 1.82]} c="#f2f2ee" />
      {[[0.45, -0.85], [0.45, 0.85], [-1.95, -0.85], [-1.95, 0.85], [-0.75, -0.85], [-0.75, 0.85]].map(([x, z], i) => <Rd key={i} a={[x, 0.9, z]} b={[x, 2.15, z]} c="#d8d8d4" r={0.025} />)}
      <Rd a={[0.45, 1.5, 0.86]} b={[-1.95, 1.5, 0.86]} c="#d8d8d4" r={0.02} />
      <Rd a={[0.45, 1.5, -0.86]} b={[-1.95, 1.5, -0.86]} c="#d8d8d4" r={0.02} />
      <Bx p={[-0.75, 1.12, 0.62]} s={[2.2, 0.08, 0.32]} c="#5a3a2a" />
      <Bx p={[-0.75, 1.12, -0.62]} s={[2.2, 0.08, 0.32]} c="#5a3a2a" />
      <Bx p={[-2.05, 0.62, 0]} s={[0.2, 0.06, 0.8]} c="#9aa0a6" />
    </group>
  );
};

const SpiritHouse: React.FC = () => {
  const gold = "#d8a83a";
  const red = "#b8262a";
  const white = "#efe8da";
  return (
    <group>
      <Bx p={[0, 0.03, 0]} s={[0.4, 0.06, 0.4]} c="#9a9a92" />
      <Bx p={[0, 0.65, 0]} s={[0.16, 1.2, 0.16]} c={white} />
      <Bx p={[0, 1.28, 0]} s={[0.66, 0.05, 0.66]} c={gold} />
      <Bx p={[0, 1.31, 0]} s={[0.6, 0.02, 0.6]} c={red} />
      <Bx p={[0, 1.48, -0.04]} s={[0.36, 0.32, 0.3]} c={white} />
      <Bx p={[0, 1.44, 0.115]} s={[0.12, 0.2, 0.02]} c={red} />
      {[-0.16, 0.16].map((x) => <Bx key={x} p={[x, 1.48, 0.16]} s={[0.035, 0.32, 0.035]} c={gold} />)}
      {/* layered roof: two tiers of steep gables, ridge running front to back, spire on top */}
      {[[0.23, 0.44, 1.72, "#b8262a"], [0.16, 0.34, 1.88, "#d8a83a"]].map(([r, len, y, c], k) => (
        <mesh key={k} position={[0, y as number, -0.04]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 1.25]} castShadow>
          <cylinderGeometry args={[r as number, r as number, len as number, 3]} />
          <M c={c as string} />
        </mesh>
      ))}
      <mesh position={[0, 2.1, -0.04]} castShadow>
        <coneGeometry args={[0.035, 0.18, 6]} />
        <M c={gold} />
      </mesh>
      {/* small offerings on the platform */}
      <Bx p={[-0.22, 1.36, 0.22]} s={[0.06, 0.08, 0.06]} c="#e8e2d0" />
      <Bx p={[0.22, 1.36, 0.22]} s={[0.05, 0.1, 0.05]} c="#d84a30" />
      <mesh position={[0, 1.33, 0.24]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.018, 5, 12]} />
        <M c="#f4f0e2" />
      </mesh>
    </group>
  );
};

const Umbrella: React.FC = () => {
  const cols = ["#d8382c", "#f2f2ee"];
  const panels = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => {
        const a0 = (i / 8) * Math.PI * 2;
        const a1 = ((i + 1) / 8) * Math.PI * 2;
        const R = 1.05;
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute([0, 2.25, 0, Math.cos(a0) * R, 1.85, Math.sin(a0) * R, Math.cos(a1) * R, 1.85, Math.sin(a1) * R], 3));
        g.computeVertexNormals();
        return g;
      }),
    [],
  );
  return (
    <group>
      <Cy p={[0, 0.05, 0]} r0={0.2} r1={0.24} h={0.1} c="#3a3a3e" />
      <Rd a={[0, 0.1, 0]} b={[0, 2.25, 0]} c="#c8c8c4" r={0.022} />
      {panels.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshLambertMaterial color={cols[i % 2]} side={THREE.DoubleSide} flatShading />
        </mesh>
      ))}
    </group>
  );
};

const WaterJar: React.FC = () => (
  <group>
    <Lathe pts={[[0.0, 0.0], [0.2, 0.0], [0.3, 0.12], [0.35, 0.34], [0.33, 0.55], [0.24, 0.7], [0.22, 0.74], [0.24, 0.76], [0.2, 0.76]]} c="#6a3a1c" seg={16} />
    <Cy p={[0, 0.72, 0]} r0={0.2} h={0.02} c="#24303a" seg={16} />
    <Lathe pts={[[0.336, 0.4], [0.352, 0.43], [0.35, 0.47], [0.336, 0.5]]} c="#d8a83a" seg={16} />
  </group>
);

const CharcoalStove: React.FC = () => (
  <group>
    <Lathe pts={[[0, 0], [0.14, 0], [0.16, 0.06], [0.18, 0.26], [0.17, 0.28], [0, 0.28]]} c="#b8683a" seg={12} />
    <Bx p={[0, 0.07, 0.15]} s={[0.1, 0.07, 0.04]} c="#3a1c10" />
    <Glowy p={[0, 0.065, 0.17]} s={[0.06, 0.03, 0.01]} c="#ff7a2a" />
    <Lathe pts={[[0, 0.28], [0.13, 0.28], [0.16, 0.32], [0.17, 0.44], [0.18, 0.45], [0, 0.45]]} c="#a8acb0" seg={14} />
    <Cy p={[0, 0.465, 0]} r0={0.16} r1={0.17} h={0.03} c="#9a9ea2" seg={14} />
    <Cy p={[0, 0.49, 0]} r0={0.025} h={0.025} c="#2a2a2e" seg={8} />
    {[-1, 1].map((s) => <Bx key={s} p={[s * 0.19, 0.41, 0]} s={[0.04, 0.015, 0.03]} c="#2a2a2e" />)}
  </group>
);

const CrtTv: React.FC = () => (
  <group>
    <Bx p={[0, 0.22, -0.04]} s={[0.56, 0.44, 0.42]} c="#6a4a2e" />
    <Bx p={[0, 0.2, -0.27]} s={[0.4, 0.32, 0.12]} c="#3a3a3a" />
    <Bx p={[-0.06, 0.24, 0.175]} s={[0.36, 0.3, 0.01]} c="#2e3a3e" />
    <Glowy p={[-0.06, 0.24, 0.181]} s={[0.32, 0.26, 0.002]} c="#5a7a86" />
    <Bx p={[0.2, 0.24, 0.175]} s={[0.1, 0.34, 0.01]} c="#cfc8b8" />
    {[0.32, 0.25].map((y) => <Cy key={y} p={[0.2, y, 0.185]} r0={0.018} h={0.02} c="#2a2a2a" rot={[Math.PI / 2, 0, 0]} />)}
    <Rd a={[0, 0.44, -0.08]} b={[-0.18, 0.72, -0.12]} c="#b0b4b8" r={0.005} />
    <Rd a={[0, 0.44, -0.08]} b={[0.16, 0.74, -0.12]} c="#b0b4b8" r={0.005} />
  </group>
);

const FlatTv: React.FC = () => (
  <group>
    <Bx p={[0, 0.01, 0]} s={[0.36, 0.02, 0.2]} c="#2a2a2e" />
    <Bx p={[0, 0.07, -0.02]} s={[0.06, 0.12, 0.03]} c="#2a2a2e" />
    <Bx p={[0, 0.41, 0]} s={[1.0, 0.58, 0.05]} c="#16161a" />
    <Glowy p={[0, 0.415, 0.026]} s={[0.96, 0.54, 0.002]} c="#2e4a66" />
  </group>
);

const Radio: React.FC = () => (
  <group>
    <Bx p={[0, 0.09, 0]} s={[0.3, 0.18, 0.09]} c="#8a2a24" />
    <Bx p={[-0.06, 0.09, 0.046]} s={[0.15, 0.13, 0.004]} c="#d8cfb8" />
    {[0, 1, 2, 3, 4].map((i) => <Bx key={i} p={[-0.06, 0.04 + i * 0.025, 0.049]} s={[0.14, 0.006, 0.002]} c="#8a8270" />)}
    <Bx p={[0.08, 0.13, 0.046]} s={[0.1, 0.04, 0.004]} c="#f0e8c8" />
    <Cy p={[0.08, 0.06, 0.05]} r0={0.022} h={0.012} c="#2a2a2a" rot={[Math.PI / 2, 0, 0]} />
    <Rd a={[0.12, 0.18, -0.02]} b={[0.2, 0.46, -0.04]} c="#c8ccd0" r={0.004} />
    <Bx p={[0, 0.195, 0]} s={[0.16, 0.012, 0.02]} c="#2a2a2a" />
  </group>
);

const Phone: React.FC = () => (
  <group>
    <Bx p={[0, 0.004, 0]} s={[0.075, 0.008, 0.155]} c="#1c1c20" />
    <Glowy p={[0, 0.0085, 0]} s={[0.068, 0.001, 0.146]} c="#6a8ab8" />
  </group>
);

const Laptop: React.FC = () => (
  <group>
    <Bx p={[0, 0.009, 0]} s={[0.33, 0.018, 0.23]} c="#8e9298" />
    <Bx p={[0, 0.0185, 0.03]} s={[0.29, 0.002, 0.1]} c="#2e3034" />
    <group position={[0, 0.018, -0.112]} rotation={[-0.25, 0, 0]}>
      <Bx p={[0, 0.11, 0]} s={[0.33, 0.22, 0.008]} c="#8e9298" />
      <Glowy p={[0, 0.112, 0.005]} s={[0.3, 0.19, 0.001]} c="#cfe0f4" />
    </group>
  </group>
);

const Books: React.FC = () => {
  const b: [number, number, number, number, string][] = [
    [0.26, 0.035, 0.19, 0.0, "#2a4a7a"],
    [0.24, 0.03, 0.17, 0.08, "#b8382a"],
    [0.25, 0.04, 0.18, -0.06, "#3a6a3a"],
    [0.22, 0.028, 0.16, 0.14, "#d8b03a"],
  ];
  let y = 0;
  return (
    <group>
      {b.map(([w, h, d, r, c], i) => {
        const yy = y + h / 2;
        y += h;
        return (
          <group key={i} position={[0, yy, 0]} rotation={[0, r, 0]}>
            <Bx p={[0, 0, 0]} s={[w, h, d]} c={c} />
            <Bx p={[0.004, 0, 0]} s={[w - 0.012, h - 0.008, d + 0.002]} c="#f2ecdc" />
          </group>
        );
      })}
    </group>
  );
};

const Money: React.FC = () => {
  // plain coloured paper bundles with a paper band; no banknote design
  const stacks: [number, number, number, string][] = [
    [-0.09, 0, 0.05, "#c9d6b0"],
    [0.09, 0.02, 0.04, "#d8c0c8"],
    [0.0, -0.01, 0.03, "#c9d6b0"],
  ];
  return (
    <group>
      {stacks.map(([x, z, h, c], i) => (
        <group key={i} position={[x, i === 2 ? 0.05 : 0, z]} rotation={[0, i * 0.3 - 0.2, 0]}>
          <Bx p={[0, h / 2, 0]} s={[0.156, h, 0.072]} c={c} />
          <Bx p={[0, h / 2, 0]} s={[0.03, h + 0.003, 0.075]} c="#f4eedc" />
        </group>
      ))}
    </group>
  );
};

const Lantern: React.FC = () => (
  <group>
    <Cy p={[0, 0.04, 0]} r0={0.07} r1={0.08} h={0.08} c="#6a6a3a" seg={10} />
    <mesh position={[0, 0.15, 0]}>
      <sphereGeometry args={[0.065, 10, 8]} />
      <meshLambertMaterial color="#f4e6c0" transparent opacity={0.45} />
    </mesh>
    <Glowy p={[0, 0.15, 0]} s={[0.014, 0.05, 0]} c="#ffb84a" cone />
    <Cy p={[0, 0.235, 0]} r0={0.03} r1={0.06} h={0.04} c="#6a6a3a" seg={10} />
    {[-1, 1].map((s) => <Rd key={s} a={[s * 0.07, 0.08, 0]} b={[s * 0.06, 0.22, 0]} c="#4a4a2a" r={0.004} />)}
    <mesh position={[0, 0.27, 0]} rotation={[0, 0, 0]} castShadow>
      <torusGeometry args={[0.06, 0.004, 4, 12, Math.PI]} />
      <M c="#4a4a2a" />
    </mesh>
  </group>
);

const Candle: React.FC = () => (
  <group>
    <Cy p={[0, 0.005, 0]} r0={0.05} h={0.01} c="#c8b070" seg={12} />
    <Cy p={[0, 0.085, 0]} r0={0.018} h={0.15} c="#f4efe2" seg={8} />
    <Glowy p={[0, 0.18, 0]} s={[0.009, 0.035, 0]} c="#ffc060" cone />
  </group>
);

const Garland: React.FC = () => (
  // phuang malai lying flat: a ring of jasmine with a rose knot and tassels
  <group>
    <mesh position={[0, 0.02, -0.02]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[0.09, 0.02, 6, 14]} />
      <M c="#f4f2e6" />
    </mesh>
    <Sp p={[0, 0.03, 0.075]} r={0.03} c="#c8202a" />
    <Sp p={[0, 0.025, 0.115]} r={0.022} c="#3a7a3a" />
    {[-1, 0, 1].map((s) => <Bx key={s} p={[s * 0.02, 0.008, 0.17]} s={[0.012, 0.012, 0.09]} c={s ? "#f2c230" : "#d84a6a"} r={[0, s * 0.25, 0]} />)}
  </group>
);

const AlmsBowl: React.FC = () => (
  <group>
    <Cy p={[0, 0.03, 0]} r0={0.1} r1={0.12} h={0.06} c="#2a2420" seg={12} />
    <Lathe pts={[[0, 0.06], [0.08, 0.06], [0.14, 0.12], [0.15, 0.18], [0.13, 0.23], [0, 0.23]]} c="#1a1816" seg={16} />
    <Lathe pts={[[0, 0.26], [0.04, 0.26], [0.12, 0.235], [0.135, 0.225], [0, 0.225]]} c="#3a3430" seg={16} />
    <Cy p={[0, 0.27, 0]} r0={0.02} h={0.02} c="#8a6a3a" seg={8} />
  </group>
);

const Broom: React.FC = () => (
  // Thai grass broom standing on its bristles
  <group>
    <mesh position={[0, 0.2, 0]} castShadow>
      <coneGeometry args={[0.18, 0.4, 8, 1, true]} />
      <meshLambertMaterial color="#c8a868" flatShading side={THREE.DoubleSide} />
    </mesh>
    <Cy p={[0, 0.48, 0]} r0={0.028} r1={0.04} h={0.18} c="#8a2a24" seg={8} />
    <Rd a={[0, 0.56, 0]} b={[0, 1.15, 0]} c="#b08a5a" r={0.016} />
  </group>
);

const Bucket: React.FC = () => (
  <group>
    <Lathe pts={[[0, 0], [0.13, 0], [0.165, 0.3], [0.175, 0.31], [0.17, 0.3], [0.13, 0.01]]} c="#2a7ac8" seg={16} />
    <Cy p={[0, 0.24, 0]} r0={0.15} h={0.004} c="#3a5a6a" seg={16} />
    <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0]} castShadow>
      <torusGeometry args={[0.17, 0.006, 4, 16, Math.PI]} />
      <M c="#2a5a98" />
    </mesh>
  </group>
);

const Plant: React.FC = () => (
  <group>
    <Lathe pts={[[0, 0], [0.11, 0], [0.15, 0.27], [0.165, 0.28], [0.165, 0.31], [0, 0.31]]} c="#b8603a" seg={12} />
    <Cy p={[0, 0.3, 0]} r0={0.14} h={0.02} c="#3a2a1e" seg={12} />
    {Array.from({ length: 9 }).map((_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const tilt = 0.35 + (i % 3) * 0.15;
      return (
        <group key={i} position={[0, 0.3, 0]} rotation={[0, a, 0]}>
          <mesh position={[0, 0.22, 0.09]} rotation={[tilt, 0, 0]} scale={[0.5, 1, 0.16]} castShadow>
            <sphereGeometry args={[0.13, 6, 5]} />
            <M c={i % 2 ? "#3a8a3a" : "#2e6e34"} />
          </mesh>
        </group>
      );
    })}
  </group>
);

const Coffin: React.FC = () => (
  // plain coffin on a low stand: cream box, peaked lid, thin gold trim
  <group>
    <Bx p={[0, 0.2, 0]} s={[1.9, 0.4, 0.55]} c="#5a3a22" />
    <Bx p={[0, 0.42, 0]} s={[2.0, 0.04, 0.66]} c="#4a2e1a" />
    <Bx p={[0, 0.68, 0]} s={[1.95, 0.48, 0.6]} c="#efe8d8" />
    <Bx p={[0, 0.94, 0]} s={[2.0, 0.04, 0.65]} c="#d8b04a" />
    <mesh position={[0, 0.96, 0]} rotation={[0, 0, 0]} castShadow>
      <cylinderGeometry args={[0.001, 0.36, 0.14, 4, 1]} />
      <M c="#efe8d8" />
    </mesh>
    <Bx p={[0, 1.03, 0]} s={[1.9, 0.04, 0.04]} c="#d8b04a" />
  </group>
);

const PhotoFrame: React.FC = () => {
  // old photo frame on a stand; the picture is a blank faded silhouette, no real person
  const tex = useMemo(
    () =>
      makeTex(128, 160, (c) => {
        const g = c.createLinearGradient(0, 0, 0, 160);
        g.addColorStop(0, "#d8c8a4");
        g.addColorStop(1, "#b8a07a");
        c.fillStyle = g;
        c.fillRect(0, 0, 128, 160);
        c.fillStyle = "rgba(70,52,34,0.75)";
        c.beginPath();
        c.arc(64, 62, 24, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(18, 160);
        c.quadraticCurveTo(22, 100, 64, 96);
        c.quadraticCurveTo(106, 100, 110, 160);
        c.fill();
      }),
    [],
  );
  return (
    <group rotation={[-0.18, 0, 0]} position={[0, 0, 0.02]}>
      <Bx p={[0, 0.13, 0]} s={[0.21, 0.26, 0.02]} c="#3a2416" />
      <mesh position={[0, 0.13, 0.0105]}>
        <planeGeometry args={[0.16, 0.2]} />
        <meshLambertMaterial map={tex} />
      </mesh>
      <Bx p={[0, 0.1, -0.06]} s={[0.04, 0.2, 0.01]} c="#3a2416" r={[0.55, 0, 0]} />
    </group>
  );
};

// ---------- story papers: the artwork is shared with the hand-held items (Paper.tsx, Held.tsx) ----------
/** A sheet lying flat, its top edge away from the camera (rot 0), so it reads upright in a close-up. */
const PaperSheet: React.FC<{ kind: PaperKind; lift?: number }> = ({ kind, lift = 0 }) => {
  const tex = usePaperTex(kind);
  const [w, d] = PAPER_SIZE[kind];
  return (
    <group position={[0, lift, 0]}>
      <Bx p={[0, 0.0012, 0]} s={[w, 0.0008, d]} c="#e9e4d6" />
      <mesh position={[0, 0.0018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshLambertMaterial color={tex ? "#ffffff" : "#f4f1e8"} map={tex ?? undefined} />
      </mesh>
    </group>
  );
};
const Slip: React.FC = () => <PaperSheet kind="slip" />;
const Drawing: React.FC = () => <PaperSheet kind="drawing" />;
const Notebook: React.FC = () => (
  // open notebook: blue cover, two page blocks, the written spread on top
  <group>
    <Bx p={[0, 0.002, 0]} s={[0.312, 0.004, 0.218]} c="#24406e" />
    <Bx p={[-0.076, 0.0075, 0]} s={[0.148, 0.007, 0.208]} c="#e6e0d0" />
    <Bx p={[0.076, 0.0075, 0]} s={[0.148, 0.007, 0.208]} c="#e6e0d0" />
    <PaperSheet kind="notebook" lift={0.0095} />
  </group>
);

export const PROPS = {
  table: { label: "โต๊ะไม้", eras: ALL, size: [1.0, 0.75, 0.6], focus: 0.75, Model: Table },
  plastic_chair: { label: "เก้าอี้พลาสติก", eras: ["rural", "city"], size: [0.48, 0.84, 0.48], focus: 0.5, Model: PlasticChair },
  stool: { label: "ม้านั่งไม้เตี้ย", eras: ["old", "rural"], size: [0.32, 0.45, 0.32], focus: 0.4, Model: Stool },
  mat: { label: "เสื่อ", eras: ["old", "rural"], size: [1.8, 0.012, 0.9], focus: 0.0, flat: true, Model: Mat },
  bicycle: { label: "จักรยาน", eras: ALL, size: [1.75, 1.02, 0.5], focus: 0.6, Model: Bicycle },
  motorbike: { label: "มอเตอร์ไซค์", eras: ["rural", "city"], size: [1.9, 1.05, 0.72], focus: 0.7, Model: Motorbike },
  buffalo: { label: "ควาย", eras: ["old", "rural"], size: [2.6, 1.55, 0.95], focus: 1.1, Model: Buffalo },
  dog: { label: "สุนัข", eras: ALL, size: [0.85, 0.7, 0.22], focus: 0.45, Model: Dog },
  cat: { label: "แมว", eras: ALL, size: [0.36, 0.38, 0.24], focus: 0.22, Model: Cat },
  chicken: { label: "ไก่", eras: ["old", "rural"], size: [0.42, 0.47, 0.22], focus: 0.3, Model: Chicken },
  tuktuk: { label: "รถตุ๊กตุ๊ก", eras: ["rural", "city"], size: [2.5, 1.73, 1.32], focus: 1.0, Model: Tuktuk },
  songthaew: { label: "รถสองแถว", eras: ["rural", "city"], size: [4.6, 2.25, 1.82], focus: 1.2, Model: Songthaew },
  spirit_house: { label: "ศาลพระภูมิ", eras: ALL, size: [0.66, 2.19, 0.66], focus: 1.5, Model: SpiritHouse },
  umbrella: { label: "ร่มแม่ค้า", eras: ALL, size: [2.1, 2.25, 2.1], focus: 1.6, Model: Umbrella },
  water_jar: { label: "โอ่งน้ำ", eras: ["old", "rural"], size: [0.7, 0.76, 0.7], focus: 0.5, Model: WaterJar },
  charcoal_stove: { label: "หม้อบนเตาถ่าน", eras: ["old", "rural"], size: [0.42, 0.5, 0.36], focus: 0.35, Model: CharcoalStove },
  crt_tv: { label: "ทีวีจอตู้", eras: ["old", "rural"], size: [0.56, 0.74, 0.5], focus: 0.24, Model: CrtTv },
  flat_tv: { label: "ทีวีจอแบน", eras: ["rural", "city"], size: [1.0, 0.7, 0.2], focus: 0.42, Model: FlatTv },
  radio: { label: "วิทยุ", eras: ["old", "rural"], size: [0.3, 0.46, 0.1], focus: 0.1, Model: Radio },
  phone: { label: "สมาร์ตโฟน", eras: ["rural", "city"], size: [0.075, 0.009, 0.155], focus: 0.005, flat: true, Model: Phone },
  laptop: { label: "โน้ตบุ๊ก", eras: ["city"], size: [0.33, 0.23, 0.24], focus: 0.1, Model: Laptop },
  books: { label: "กองหนังสือ", eras: ALL, size: [0.27, 0.13, 0.2], focus: 0.08, Model: Books },
  money: { label: "ปึกเงิน", eras: ALL, size: [0.36, 0.09, 0.12], focus: 0.05, Model: Money },
  lantern: { label: "ตะเกียง", eras: ["old", "rural"], size: [0.16, 0.33, 0.16], focus: 0.16, Model: Lantern },
  candle: { label: "เทียน", eras: ALL, size: [0.1, 0.2, 0.1], focus: 0.12, Model: Candle },
  garland: { label: "พวงมาลัย", eras: ALL, size: [0.22, 0.05, 0.3], focus: 0.02, flat: true, Model: Garland },
  alms_bowl: { label: "บาตร", eras: ALL, size: [0.3, 0.28, 0.3], focus: 0.16, Model: AlmsBowl },
  broom: { label: "ไม้กวาด", eras: ALL, size: [0.36, 1.15, 0.36], focus: 0.6, Model: Broom },
  bucket: { label: "ถังน้ำ", eras: ["rural", "city"], size: [0.35, 0.31, 0.35], focus: 0.18, Model: Bucket },
  plant: { label: "ต้นไม้ในกระถาง", eras: ALL, size: [0.5, 0.75, 0.5], focus: 0.45, Model: Plant },
  coffin: { label: "โลงศพ", eras: ALL, size: [2.0, 1.05, 0.66], focus: 0.8, Model: Coffin },
  photo_frame: { label: "กรอบรูปเก่า", eras: ALL, size: [0.21, 0.26, 0.12], focus: 0.13, Model: PhotoFrame },
  slip: { label: "ใบนัดพบแพทย์", eras: ALL, size: [0.148, 0.003, 0.21], focus: 0.002, flat: true, close: { w: 0.2, el: 70 }, Model: Slip },
  drawing: { label: "ภาพวาดเด็ก", eras: ALL, size: [0.297, 0.003, 0.21], focus: 0.002, flat: true, close: { w: 0.33, el: 68 }, Model: Drawing },
  notebook: { label: "สมุดจด", eras: ALL, size: [0.312, 0.012, 0.218], focus: 0.012, flat: true, close: { w: 0.36, el: 68 }, Model: Notebook },
} satisfies Record<string, PropDef>;
export type PropKind = keyof typeof PROPS;
export const PROP_KINDS = Object.keys(PROPS) as PropKind[];
export const propDef = (k: PropKind): PropDef => PROPS[k] as PropDef;

/** World point the camera aims at for "prop:N". */
export const propFocus = (p: PropCue): V3 => {
  const d = propDef(p.kind);
  return [p.at[0], (p.on ?? 0) + d.focus * (p.scale ?? 1), p.at[1]];
};
/** The 8 corners of a prop's bounding box in world space. */
export const propCorners = (p: PropCue): V3[] => {
  const d = propDef(p.kind);
  const k = p.scale ?? 1;
  const a = ((p.rot ?? 0) * Math.PI) / 180;
  const [w, h, dz] = [d.size[0] * k, d.size[1] * k, d.size[2] * k];
  const y0 = p.on ?? 0;
  const out: V3[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [y0, y0 + h]) {
    const lx = (sx * w) / 2, lz = (sz * dz) / 2;
    out.push([p.at[0] + lx * Math.cos(a) + lz * Math.sin(a), y, p.at[1] - lx * Math.sin(a) + lz * Math.cos(a)]);
  }
  return out;
};

/** The props of a shot, drawn inside a set's ThreeCanvas (they take the set's lights). */
export const PropModels: React.FC<{ props: PropCue[]; shadow?: string }> = ({ props, shadow = "#1e1a14" }) => (
  <>
    {props.map((p, i) => {
      const d = propDef(p.kind);
      const k = p.scale ?? 1;
      const { Model } = d;
      return (
        <group key={i} position={[p.at[0], p.on ?? 0, p.at[1]]} rotation={[0, ((p.rot ?? 0) * Math.PI) / 180, 0]} scale={k}>
          {/* soft contact shadow so nothing seems to float, whatever the set's lights do */}
          {d.flat ? null : (
            <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[d.size[0] * 0.62, d.size[2] * 0.62, 1]}>
              <circleGeometry args={[1, 20]} />
              <meshBasicMaterial color={shadow} transparent opacity={0.3} depthWrite={false} />
            </mesh>
          )}
          <Model />
        </group>
      );
    })}
  </>
);
