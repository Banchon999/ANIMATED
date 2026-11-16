import React, { useMemo } from "react";
import * as THREE from "three";
import { makeTex } from "./NightRoom";
import type { Blob } from "./Village";
import { rng, V3 } from "./lib";
import { INDOOR, TimeOfDay } from "./Light";

// Hall of a 1970s Soviet proton synchrotron. Built to real-world scale (1 unit = 1 m).
// The ring is a circle of radius R whose nearest point is at x=0, z=pipeZ; it curves away
// on both sides, so a high camera reads it as a segment of a very large ring.

const R = 28;
export const ACCEL = {
  ringR: R,
  pipeY: 1.2, // beam-pipe centre height
  pipeZ: 0.85, // beam-pipe depth at x = 0 (magnets span z 0.3..1.4 there)
  ringCentre: [0, 1.2, 0.85 - R] as V3,
  back: -5, // back wall
  halfW: 18, // side walls at x = ±18 (hall 36 m wide)
  height: 9, // walls; roof trusses and crane girder at 7.4..8.6
  panel: [-1.4, 0, 1.6] as V3, // control console (floor point)
  lamp: [-1.4, 1.5, 1.52] as V3, // red warning lamp (unlit) on top of the console
  sparkPoint: [-0.88, 1.08, 1.72] as V3, // corner of the console face, for "sparks"
  stripeZ: 1.95, // yellow-black floor band in front of the magnets (at x = 0)
  truss: 8.0, // roof-truss height (the hall is 8 m high; walls rise to 9)
  lamps: [-9, -3, 3, 9].flatMap((x) => [[x, 5.6, 1.0], [x + 3, 5.8, -2.2]] as V3[]),
  actorZone: { x: [-1.8, 1.8], z: [2.0, 4.0] },
};
/** Depth of the beam pipe at a given x. */
export const pipeZAt = (x: number) => ACCEL.ringCentre[2] + Math.sqrt(R * R - x * x);

const concrete = (base: number, seed: number, joints: { w: number; h: number }) => (c: CanvasRenderingContext2D) => {
  const S = 512;
  const r = rng(seed);
  c.fillStyle = `hsl(140 5% ${base}%)`;
  c.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const l = base + (r() - 0.5) * 16;
    c.fillStyle = `hsla(${120 + r() * 40} 6% ${l}% / ${0.25 + r() * 0.35})`;
    const s = 1 + r() * 3;
    c.fillRect(r() * S, r() * S, s, s);
  }
  for (let i = 0; i < 10; i++) {
    const gx = r() * S, gy = r() * S;
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, 40 + r() * 120);
    g.addColorStop(0, `rgba(40,50,44,${0.05 + r() * 0.07})`);
    g.addColorStop(1, "rgba(40,50,44,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
  }
  c.fillStyle = "rgba(30,36,32,0.45)";
  for (let x = 0; x < S; x += S / joints.w) c.fillRect(x, 0, 3, S);
  for (let y = 0; y < S; y += S / joints.h) c.fillRect(0, y, S, 3);
};

const useTextures = () =>
  useMemo(() => {
    const wall = makeTex(512, 512, concrete(66, 3, { w: 2, h: 2 }), [10, 2]);
    const dado = makeTex(512, 512, concrete(56, 4, { w: 2, h: 1 }), [10, 1]);
    const side = makeTex(512, 512, concrete(64, 5, { w: 2, h: 2 }), [6.5, 2]);
    const floor = makeTex(512, 512, concrete(60, 9, { w: 2, h: 2 }), [10, 10]);
    const hazard = makeTex(256, 64, (c) => {
      c.fillStyle = "#f2c230";
      c.fillRect(0, 0, 256, 64);
      c.fillStyle = "#1d1d1b";
      for (let i = -2; i < 8; i++) {
        c.beginPath();
        c.moveTo(i * 48, 64);
        c.lineTo(i * 48 + 24, 64);
        c.lineTo(i * 48 + 88, 0);
        c.lineTo(i * 48 + 64, 0);
        c.fill();
      }
    }, [1, 1]);
    const console = makeTex(256, 160, (c) => {
      c.fillStyle = "#56685f";
      c.fillRect(0, 0, 256, 160);
      c.fillStyle = "#3e4d46";
      c.fillRect(8, 8, 240, 144);
      // gauges
      [40, 104, 168, 222].forEach((x, i) => {
        c.fillStyle = "#e9e6d6";
        c.beginPath();
        c.arc(x, 46, 22, 0, 7);
        c.fill();
        c.strokeStyle = "#222";
        c.lineWidth = 2;
        c.stroke();
        c.strokeStyle = "#b02a20";
        c.beginPath();
        c.moveTo(x, 50);
        const a = -2.4 + i * 0.7;
        c.lineTo(x + Math.cos(a) * 17, 50 + Math.sin(a) * 17);
        c.stroke();
      });
      // switches + small unlit lamps
      for (let i = 0; i < 12; i++) {
        c.fillStyle = "#1e2622";
        c.fillRect(20 + i * 19, 92, 9, 16);
        c.fillStyle = "#c8c8c0";
        c.fillRect(22 + i * 19, 94, 5, 7);
        c.fillStyle = ["#6b2a22", "#2f5a34", "#7a6a2a"][i % 3];
        c.beginPath();
        c.arc(24 + i * 19, 124, 4, 0, 7);
        c.fill();
      }
      c.fillStyle = "#d8d4c2";
      c.fillRect(20, 136, 90, 8);
      c.fillRect(140, 136, 90, 8);
    });
    return { wall, dado, side, floor, hazard, console };
  }, []);

const B: React.FC<{ p: V3; s: V3; c: string; r?: V3; sh?: boolean; map?: THREE.Texture }> = ({ p, s, c, r, sh = true, map }) => (
  <mesh position={p} rotation={r} castShadow={sh} receiveShadow>
    <boxGeometry args={s} />
    <meshLambertMaterial color={c} map={map} />
  </mesh>
);

/** One element of the ring, placed by arc length s (0 = nearest point, x = 0). */
const OnRing: React.FC<{ s: number; children: React.ReactNode }> = ({ s, children }) => {
  const a = s / R;
  const [cx, , cz] = ACCEL.ringCentre;
  return (
    <group position={[cx + R * Math.sin(a), 0, cz + R * Math.cos(a)]} rotation={[0, a, 0]}>
      {children}
    </group>
  );
};

export const Accelerator: React.FC<{ blobs?: Blob[]; time?: TimeOfDay }> = ({ blobs = [], time = "day" }) => {
  const tx = useTextures();
  const L = INDOOR[time];
  const A = ACCEL;
  const H = A.height;
  const arc = 1.4; // radians of ring drawn (about ±19.6 m of arc)
  const ring = useMemo(() => {
    const items: { s: number; kind: "dipole" | "quad" }[] = [];
    for (let k = -5; k <= 5; k++) {
      items.push({ s: k * 4.2, kind: "dipole" });
      items.push({ s: k * 4.2 + 2.1, kind: "quad" });
    }
    return items.filter((i) => Math.abs(i.s) < 19.5); // the ring runs into the back wall near x = ±17
  }, []);
  const stripes = useMemo(() => Array.from({ length: 25 }).map((_, i) => (i - 12) * 1.6), []);
  const zMid = (A.back + 22) / 2;
  const sideLen = 22 - A.back;

  return (
    <>
      <hemisphereLight args={["#e6f0ea", "#5d6a62", 1.35 * L.amb]} />
      <ambientLight color={time === "night" ? "#b4bdc8" : "#d2ddd6"} intensity={0.85 * L.amb} />
      {/* the hall lamps light the floor around the actors once the daylight goes */}
      {L.lamp > 0
        ? ([[-3, 5.3, 1.0], [3, 5.3, 1.0], [0, 5.5, -2.2]] as V3[]).map((p, i) => (
            <pointLight key={i} position={p} color="#fff0cc" intensity={9 * L.lamp} distance={12} decay={1.4} />
          ))
        : null}
      <directionalLight
        position={[-7, 15, 11]}
        intensity={1.7 * L.sun}
        color={L.sunColor ?? "#f4f8f1"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0008}
      />

      {/* floor, walls (no roof: high cameras look in from above; the roof trusses carry the lamps) */}
      <mesh position={[0, 0, 14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshLambertMaterial map={tx.floor} />
      </mesh>
      <mesh position={[0, (H + 1.6) / 2, A.back]} receiveShadow>
        <planeGeometry args={[2 * A.halfW, H - 1.6]} />
        <meshLambertMaterial map={tx.wall} />
      </mesh>
      <mesh position={[0, 0.8, A.back + 0.01]} receiveShadow>
        <planeGeometry args={[2 * A.halfW, 1.6]} />
        <meshLambertMaterial map={tx.dado} color="#a9c0b2" />
      </mesh>
      <B p={[0, 1.6, A.back + 0.03]} s={[2 * A.halfW, 0.06, 0.04]} c="#4c5c53" sh={false} />
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * A.halfW, H / 2, zMid]} rotation={[0, -k * Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[sideLen, H]} />
          <meshLambertMaterial map={tx.side} color="#dfe6e1" />
        </mesh>
      ))}
      {/* concrete columns with hazard-striped bases */}
      {[-16.5, -11, -5.5, 5.5, 11, 16.5].map((x) => (
        <group key={x}>
          <B p={[x, H / 2, A.back + 0.3]} s={[0.8, H, 0.6]} c="#9ea8a2" />
          <B p={[x, 0.5, A.back + 0.3]} s={[0.84, 1.0, 0.64]} c="#ffffff" map={tx.hazard} sh={false} />
        </group>
      ))}
      {/* roof trusses + crane rail */}
      {/* only behind the actors, so a high camera never sees a truss cross the standing zone */}
      {[-2.2, 1.0].map((z) => (
        <group key={z}>
          <B p={[0, A.truss, z]} s={[2 * A.halfW, 0.4, 0.24]} c="#56625b" sh={false} />
          <B p={[0, A.truss - 0.4, z]} s={[2 * A.halfW, 0.07, 0.18]} c="#56625b" sh={false} />
        </group>
      ))}
      <B p={[0, 7.4, A.back + 0.5]} s={[2 * A.halfW, 0.35, 0.4]} c="#c99a2e" sh={false} />

      {/* cable trays on the back wall + vertical conduits */}
      {[4.3, 5.1].map((y, i) => (
        <group key={y}>
          <B p={[0, y, A.back + 0.22]} s={[2 * A.halfW, 0.07, 0.42]} c="#6f7a74" sh={false} />
          <B p={[0, y + 0.07, A.back + 0.42]} s={[2 * A.halfW, 0.1, 0.02]} c="#6f7a74" sh={false} />
          {[0.1, 0.2, 0.3].map((dz, j) => (
            <mesh key={j} position={[0, y + 0.075, A.back + dz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.035, 0.035, 2 * A.halfW, 6]} />
              <meshLambertMaterial color={["#1e2220", "#3a2624", "#26302c"][(i + j) % 3]} />
            </mesh>
          ))}
        </group>
      ))}
      {[-8.5, -2.9, 2.6, 8.2].map((x) => (
        <group key={x}>
          {[0, 0.14].map((dx) => (
            <mesh key={dx} position={[x + dx, 2.15, A.back + 0.1]}>
              <cylinderGeometry args={[0.04, 0.04, 4.3, 6]} />
              <meshLambertMaterial color="#59645e" />
            </mesh>
          ))}
          <B p={[x + 0.07, 1.9, A.back + 0.16]} s={[0.45, 0.55, 0.2]} c="#7c8b83" />
        </group>
      ))}
      {/* a few cables drooping from the lower tray to the floor behind the ring */}
      {[-4.2, 3.6].map((x) => (
        <mesh key={x} position={[x, 2.1, A.back + 0.5]} rotation={[0.08, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 4.3, 6]} />
          <meshLambertMaterial color="#1f2421" />
        </mesh>
      ))}

      {/* the ring: pipe + magnets on concrete pedestals */}
      <group position={A.ringCentre} rotation={[0, arc / 2 - Math.PI / 2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R, 0.085, 8, 120, arc]} />
          <meshLambertMaterial color="#a7b0b2" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.58, 0]}>
          <torusGeometry args={[R - 0.62, 0.05, 6, 120, arc]} />
          <meshLambertMaterial color="#3b3f3c" />
        </mesh>
      </group>
      {ring.map((it) => (
        <OnRing key={it.s} s={it.s}>
          {it.kind === "dipole" ? (
            <>
              <B p={[0, 0.27, 0]} s={[2.0, 0.54, 0.85]} c="#8e9792" />
              <B p={[0, 1.2, 0]} s={[2.4, 1.3, 1.1]} c="#2f62ad" />
              <B p={[0, 1.2, 0.56]} s={[2.42, 0.18, 0.02]} c="#1f467f" sh={false} />
              <B p={[0, 1.2, 0]} s={[2.62, 0.44, 0.74]} c="#b0703c" />
              <B p={[-0.7, 1.87, 0]} s={[0.5, 0.06, 0.7]} c="#d9dcd6" sh={false} />
            </>
          ) : (
            <>
              <B p={[0, 0.3, 0]} s={[0.7, 0.6, 0.8]} c="#8e9792" />
              <B p={[0, 1.2, 0]} s={[0.8, 1.0, 1.0]} c="#e0782a" />
              <B p={[0, 1.2, 0]} s={[0.9, 0.3, 0.6]} c="#9a5a2c" />
            </>
          )}
        </OnRing>
      ))}
      {/* yellow-black band on the floor, following the ring */}
      {stripes.map((s) => {
        const a = s / (R + 1.1);
        const [cx, , cz] = A.ringCentre;
        return (
          <mesh key={s} position={[cx + (R + 1.1) * Math.sin(a), 0.012, cz + (R + 1.1) * Math.cos(a)]} rotation={[-Math.PI / 2, 0, a]} receiveShadow>
            <planeGeometry args={[1.62, 0.22]} />
            <meshLambertMaterial map={tx.hazard} />
          </mesh>
        );
      })}

      {/* control console with the (unlit) red warning lamp */}
      <group position={A.panel}>
        <B p={[0, 0.45, 0]} s={[1.1, 0.9, 0.5]} c="#6c7f75" />
        <mesh position={[0, 0.98, 0.04]} rotation={[0.55, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.12, 0.06, 0.46]} />
          <meshLambertMaterial color="#5a6b62" />
        </mesh>
        <mesh position={[0, 1.007, 0.057]} rotation={[0.55 - Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.04, 0.4]} />
          <meshLambertMaterial map={tx.console} />
        </mesh>
        <B p={[0, 1.2, -0.2]} s={[1.1, 0.5, 0.1]} c="#5f7268" />
        <mesh position={[0, 1.2, -0.145]}>
          <planeGeometry args={[1.0, 0.42]} />
          <meshLambertMaterial map={tx.console} />
        </mesh>
        <mesh position={[0, 0.07, 0.252]}>
          <planeGeometry args={[1.1, 0.14]} />
          <meshLambertMaterial map={tx.hazard} />
        </mesh>
        <mesh position={[0, 1.465, -0.08]}>
          <cylinderGeometry args={[0.055, 0.065, 0.05, 10]} />
          <meshLambertMaterial color="#202422" />
        </mesh>
        <mesh position={[0, 1.49, -0.08]}>
          <sphereGeometry args={[0.065, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshLambertMaterial color="#7a1d18" />
        </mesh>
        {/* cable from the console to the ring */}
        <mesh position={[0.3, 0.03, -0.55]} rotation={[Math.PI / 2, 0, 0.3]}>
          <cylinderGeometry args={[0.035, 0.035, 0.7, 6]} />
          <meshLambertMaterial color="#1e2220" />
        </mesh>
      </group>
      {/* small hazard-striped junction box on the right */}
      <group position={[2.6, 0, 1.75]}>
        <B p={[0, 0.5, 0]} s={[0.08, 1.0, 0.08]} c="#4c5650" />
        <B p={[0, 1.05, 0]} s={[0.45, 0.4, 0.22]} c="#7c8b83" />
        <mesh position={[0, 1.05, 0.112]}>
          <planeGeometry args={[0.45, 0.1]} />
          <meshLambertMaterial map={tx.hazard} />
        </mesh>
      </group>

      {/* hanging industrial lamps */}
      {A.lamps.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, (A.truss - p[1]) / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, A.truss - p[1], 4]} />
            <meshLambertMaterial color="#2a2f2c" />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <coneGeometry args={[0.42, 0.32, 12, 1, true]} />
            <meshLambertMaterial color="#46564d" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.08, 0]}>
            <sphereGeometry args={[0.13, 10, 6]} />
            <meshBasicMaterial color="#fffbe6" />
          </mesh>
        </group>
      ))}

      {blobs.map((b, i) => (
        <mesh key={i} position={[b.x, 0.03, b.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]}>
          <circleGeometry args={[b.r ?? 0.42, 20]} />
          <meshBasicMaterial color="#1e2620" transparent opacity={0.3} />
        </mesh>
      ))}
    </>
  );
};
