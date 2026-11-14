import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Cam, rng, V3 } from "./lib";

/** Copies the per-frame camera into the R3F camera (driven by useCurrentFrame upstream). */
export const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...cam.pos);
  camera.fov = cam.fov;
  camera.near = 0.05;
  camera.far = 500;
  camera.lookAt(...cam.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return null;
};

const Mat: React.FC<{ color: string }> = ({ color }) => (
  <meshLambertMaterial color={color} flatShading />
);

const Box: React.FC<{
  p: V3;
  s: V3;
  color: string;
  r?: V3;
  shadow?: boolean;
}> = ({ p, s, color, r, shadow = true }) => (
  <mesh position={p} rotation={r} castShadow={shadow} receiveShadow>
    <boxGeometry args={s} />
    <Mat color={color} />
  </mesh>
);

type HouseSpec = {
  x: number;
  z: number;
  rot: number;
  w: number;
  d: number;
  h: number;
  stilt: number;
  wall: string;
  roof: string;
  trim: string;
};

const WALLS = ["#c98f5a", "#b97a4b", "#d9a871", "#a8744a", "#cfa07a", "#8fa7b5"];
const ROOFS = ["#8c4a3c", "#5f6f7a", "#a85a3a", "#6d5a4a", "#3f7f78", "#b0473f"];

const House: React.FC<{ spec: HouseSpec }> = ({ spec }) => {
  const { w, d, h, stilt, wall, roof, trim } = spec;
  const rh = w * 0.38;
  const roofGeo = useMemo(() => {
    const ow = w / 2 + 0.45;
    const shape = new THREE.Shape();
    shape.moveTo(-ow, 0);
    shape.lineTo(ow, 0);
    shape.lineTo(0, rh);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: d + 0.8, bevelEnabled: false });
    g.translate(0, 0, -(d + 0.8) / 2);
    return g;
  }, [w, d, rh]);
  const posts: V3[] = [
    [-w / 2 + 0.15, stilt / 2, -d / 2 + 0.15],
    [w / 2 - 0.15, stilt / 2, -d / 2 + 0.15],
    [-w / 2 + 0.15, stilt / 2, d / 2 - 0.15],
    [w / 2 - 0.15, stilt / 2, d / 2 - 0.15],
    [0, stilt / 2, d / 2 - 0.15],
    [0, stilt / 2, -d / 2 + 0.15],
  ];
  const steps = 5;
  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rot, 0]}>
      {posts.map((p, i) => (
        <Box key={i} p={p} s={[0.18, stilt, 0.18]} color="#6b4a33" />
      ))}
      {/* floor + porch */}
      <Box p={[0, stilt, 0.35]} s={[w + 0.3, 0.14, d + 1.0]} color="#7a5539" />
      {/* body */}
      <Box p={[0, stilt + h / 2 + 0.07, 0]} s={[w, h, d]} color={wall} />
      {/* roof */}
      <mesh position={[0, stilt + h + 0.07, 0]} castShadow receiveShadow geometry={roofGeo}>
        <Mat color={roof} />
      </mesh>
      {/* door + windows on the front (+z) */}
      <Box p={[-w * 0.2, stilt + 0.62, d / 2 + 0.02]} s={[0.6, 1.1, 0.05]} color="#4a3324" shadow={false} />
      <Box p={[w * 0.22, stilt + 0.85, d / 2 + 0.02]} s={[0.7, 0.6, 0.05]} color="#3b4a55" shadow={false} />
      <Box p={[w * 0.22, stilt + 0.85, d / 2 + 0.05]} s={[0.8, 0.07, 0.05]} color={trim} shadow={false} />
      <Box p={[w * 0.22, stilt + 0.85, d / 2 + 0.05]} s={[0.07, 0.7, 0.05]} color={trim} shadow={false} />
      {/* side windows */}
      <Box p={[w / 2 + 0.02, stilt + 0.85, 0]} s={[0.05, 0.6, 0.8]} color="#3b4a55" shadow={false} />
      <Box p={[-w / 2 - 0.02, stilt + 0.85, 0]} s={[0.05, 0.6, 0.8]} color="#3b4a55" shadow={false} />
      {/* porch rail */}
      <Box p={[w * 0.25, stilt + 0.45, d / 2 + 0.8]} s={[w * 0.5, 0.08, 0.08]} color={trim} />
      <Box p={[w * 0.48, stilt + 0.25, d / 2 + 0.8]} s={[0.08, 0.5, 0.08]} color={trim} />
      {/* stairs */}
      {Array.from({ length: steps }).map((_, i) => (
        <Box
          key={i}
          p={[-w * 0.2, stilt - ((i + 0.5) * stilt) / steps, d / 2 + 0.95 + i * 0.26]}
          s={[0.8, 0.08, 0.28]}
          color="#8a6444"
        />
      ))}
      {/* sandy yard */}
      <mesh position={[0, 0.015, 0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[Math.max(w, d) * 0.95, 24]} />
        <meshLambertMaterial color="#d8b983" />
      </mesh>
    </group>
  );
};

const Tree: React.FC<{ p: V3; s: number; seed: number }> = ({ p, s, seed }) => {
  const r = useMemo(() => rng(seed), [seed]);
  const blobs = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, i) => ({
        pos: [(r() - 0.5) * 1.3, 2.3 + r() * 1.0 + i * 0.15, (r() - 0.5) * 1.3] as V3,
        sc: 0.8 + r() * 0.6,
        c: ["#4f9a4a", "#5fae52", "#3f8a45", "#6dbb58"][Math.floor(r() * 4)],
      })),
    [r],
  );
  return (
    <group position={p} scale={s}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 2.2, 6]} />
        <Mat color="#6b4a33" />
      </mesh>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.pos} scale={b.sc} castShadow>
          <icosahedronGeometry args={[1, 0]} />
          <Mat color={b.c} />
        </mesh>
      ))}
    </group>
  );
};

const Palm: React.FC<{ p: V3; s: number; seed: number }> = ({ p, s, seed }) => {
  const lean = (rng(seed)() - 0.5) * 0.25;
  return (
    <group position={p} scale={s} rotation={[0, seed, lean]}>
      <mesh position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.17, 5.2, 6]} />
        <Mat color="#7a6248" />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={i} position={[0, 5.2, 0]} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
          <mesh position={[0.95, -0.22, 0]} rotation={[0, 0, -0.42]} castShadow>
            <boxGeometry args={[2.0, 0.06, 0.5]} />
            <Mat color={i % 2 ? "#4c9a4f" : "#3d8747"} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 5.15, 0]}>
        <icosahedronGeometry args={[0.28, 0]} />
        <Mat color="#3d7a40" />
      </mesh>
    </group>
  );
};

const Hay: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <mesh position={[0, 0.7, 0]} castShadow>
      <coneGeometry args={[0.95, 1.5, 8]} />
      <Mat color="#e0bf62" />
    </mesh>
    <mesh position={[0, 0.9, 0]}>
      <cylinderGeometry args={[0.05, 0.05, 1.9, 5]} />
      <Mat color="#6b4a33" />
    </mesh>
  </group>
);

const Jar: React.FC<{ p: V3 }> = ({ p }) => (
  <mesh position={[p[0], 0.4, p[2]]} scale={[1, 1.15, 1]} castShadow>
    <sphereGeometry args={[0.38, 8, 6]} />
    <Mat color="#a1583c" />
  </mesh>
);

export type Blob = { x: number; z: number; r?: number };

export const Village: React.FC<{
  seed: number;
  night?: boolean;
  blobs?: Blob[];
}> = ({ seed, blobs = [] }) => {
  const data = useMemo(() => {
    const r = rng(seed);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const houses: HouseSpec[] = [];
    const rows = [
      { z: -6.5, xs: [-11.5, -4.2, 3.4, 11] },
      { z: -15.5, xs: [-15, -7.5, 0.5, 8, 15.5] },
    ];
    rows.forEach((row) =>
      row.xs.forEach((x) =>
        houses.push({
          x: x + (r() - 0.5) * 1.6,
          z: row.z + (r() - 0.5) * 2.2,
          rot: (r() - 0.5) * 0.5,
          w: 3.0 + r() * 1.4,
          d: 2.6 + r() * 1.2,
          h: 1.7 + r() * 0.5,
          stilt: 1.0 + r() * 0.7,
          wall: pick(WALLS),
          roof: pick(ROOFS),
          trim: pick(["#f1e4c8", "#e8d3a8", "#ffffff"]),
        }),
      ),
    );
    const trees = Array.from({ length: 16 }).map((_, i) => ({
      p: [-22 + i * 3 + (r() - 0.5) * 2, 0, -10.5 - r() * 14] as V3,
      s: 0.8 + r() * 0.7,
      seed: Math.floor(r() * 9999),
    }));
    const palms = Array.from({ length: 9 }).map(() => ({
      p: [-24 + r() * 48, 0, -19 - r() * 14] as V3,
      s: 0.9 + r() * 0.6,
      seed: Math.floor(r() * 9999),
    }));
    const nearTrees = [
      { p: [-8.2, 0, -3.4] as V3, s: 1.0, seed: 11 },
      { p: [7.4, 0, -3.8] as V3, s: 1.15, seed: 23 },
      { p: [-16.5, 0, -4.5] as V3, s: 1.2, seed: 31 },
      { p: [16.5, 0, -5] as V3, s: 1.0, seed: 47 },
    ];
    const tufts = Array.from({ length: 60 }).map(() => ({
      p: [-26 + r() * 52, 0.12, -30 + r() * 27] as V3,
      s: 0.5 + r() * 0.8,
      ry: r() * 3,
    }));
    return { houses, trees, palms, nearTrees, tufts };
  }, [seed]);

  return (
    <>
      <hemisphereLight args={["#eaf6ff", "#b9a37a", 1.25]} />
      <directionalLight
        position={[-17, 21, 9]}
        intensity={2.1}
        color="#fff3d6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0006}
      />
      <fog attach="fog" args={["#d9ecf2", 30, 95]} />

      {/* grass ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshLambertMaterial color="#a5c96e" />
      </mesh>
      {/* village lane (sand) */}
      <mesh position={[0, 0.02, 2.7]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 9.8]} />
        <meshLambertMaterial color="#dcbd86" />
      </mesh>
      {/* rice paddies far behind */}
      {[-30, -10, 10, 30].map((x, i) => (
        <mesh key={i} position={[x, 0.03, -42]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[18, 16]} />
          <meshLambertMaterial color={i % 2 ? "#86b85a" : "#93c765"} />
        </mesh>
      ))}
      {/* pond */}
      <mesh position={[-1.5, 0.03, -11]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.6, 1, 1]}>
        <circleGeometry args={[1.8, 20]} />
        <meshLambertMaterial color="#6fb6d1" />
      </mesh>
      {/* hills */}
      {[
        [-45, -85, 26, 15],
        [-10, -95, 34, 20],
        [30, -88, 28, 16],
        [62, -92, 30, 18],
      ].map(([x, z, r, h], i) => (
        <mesh key={i} position={[x, h / 2 - 1, z]}>
          <coneGeometry args={[r, h, 7]} />
          <Mat color={i % 2 ? "#8fb3b0" : "#9dbfb8"} />
        </mesh>
      ))}

      {/* fence along the back edge of the lane */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = -39 + i * 2;
        if (Math.abs(x + 4.2) < 1.6 || Math.abs(x - 3.4) < 1.6) return null;
        return (
          <group key={i} position={[x, 0, -2.2]}>
            <Box p={[0, 0.4, 0]} s={[0.12, 0.8, 0.12]} color="#8a6a4c" />
            <Box p={[1, 0.6, 0]} s={[2, 0.07, 0.06]} color="#a5825e" />
            <Box p={[1, 0.32, 0]} s={[2, 0.07, 0.06]} color="#a5825e" />
          </group>
        );
      })}

      {data.houses.map((h, i) => (
        <House key={i} spec={h} />
      ))}
      {[...data.trees, ...data.nearTrees].map((t, i) => (
        <Tree key={i} {...t} />
      ))}
      {data.palms.map((t, i) => (
        <Palm key={i} {...t} />
      ))}
      <Hay p={[-13.5, 0, -9.5]} />
      <Hay p={[13.8, 0, -10]} />
      <Hay p={[5.5, 0, -11.5]} />
      <Jar p={[-2.4, 0, -4.0]} />
      <Jar p={[-1.6, 0, -4.2]} />
      <Jar p={[5.6, 0, -4.4]} />
      {data.tufts.map((t, i) => (
        <mesh key={i} position={t.p} rotation={[0, t.ry, 0]} scale={t.s}>
          <coneGeometry args={[0.16, 0.5, 4]} />
          <Mat color="#7fae52" />
        </mesh>
      ))}

      {/* soft contact shadows for the 2D characters */}
      {blobs.map((b, i) => (
        <mesh key={i} position={[b.x, 0.04, b.z]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.55, 1]}>
          <circleGeometry args={[b.r ?? 0.42, 20]} />
          <meshBasicMaterial color="#3a2a14" transparent opacity={0.28} />
        </mesh>
      ))}
    </>
  );
};
