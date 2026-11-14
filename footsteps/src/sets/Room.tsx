import React, { useMemo } from "react";
import * as THREE from "three";
import { C, F, INK_W as O, Mat } from "../lib/draw";
import { flicker, mulberry } from "../lib/anim";
import { blob, capsule, circle, linearTex, radialTex, roundRect } from "../lib/shapes";

export const ROOM = { w: 9, back: -3, ceil: 3.8, front: 6 };
export const BULB_PIVOT: [number, number, number] = [0, ROOM.ceil, -0.8];
export const CORD = 1.15;
export const DOOR_X = 3.0;
export const CHAIR2_X = -2.15;

// the swinging bulb: pendulum angle over time, plus flicker
export const bulbState = (t: number, amp = 0.32, seed = 1) => {
  const ang = amp * Math.sin(t * 0.075) * (0.8 + 0.2 * Math.cos(t * 0.013));
  const pos: [number, number, number] = [
    BULB_PIVOT[0] + Math.sin(ang) * CORD,
    BULB_PIVOT[1] - Math.cos(ang) * CORD,
    BULB_PIVOT[2],
  ];
  return { ang, pos, on: flicker(t, seed, 1) };
};

const Wall: React.FC<{ w: number; h: number; pos: [number, number, number]; rotY?: number; c: string }> = ({ w, h, pos, rotY = 0, c }) => (
  <mesh position={pos} rotation={[0, rotY, 0]} receiveShadow>
    <planeGeometry args={[w, h, 8, 8]} />
    <Mat color={c} />
  </mesh>
);

// a stain decal: blob + optional drips running down
const Stain: React.FC<{ seed: number; r: number; pos: [number, number, number]; drips?: number; c?: string; opacity?: number; spikes?: number }> = ({
  seed,
  r,
  pos,
  drips = 0,
  c = C.blood,
  opacity = 0.9,
  spikes = 3,
}) => {
  const rnd = mulberry(seed);
  return (
    <group position={pos}>
      <F g={blob(seed, r, 0.35, spikes)} c={c} opacity={opacity} />
      {Array.from({ length: drips }).map((_, i) => {
        const x = (rnd() - 0.5) * r * 1.4;
        const len = 0.2 + rnd() * 0.7;
        return (
          <group key={i}>
            <F g={capsule(0.018 + rnd() * 0.02, len)} c={c} pos={[x, -r * 0.5, 0.001]} opacity={opacity} />
            <F g={circle(0.035)} c={c} pos={[x, -r * 0.5 - len, 0.001]} opacity={opacity} />
          </group>
        );
      })}
    </group>
  );
};

// a dragged hand smear: palm + four streaks
const Smear: React.FC<{ pos: [number, number, number]; rot?: number }> = ({ pos, rot = 0 }) => (
  <group position={pos} rotation={[0, 0, rot]}>
    <F g={blob(41, 0.12, 0.2)} c={C.blood} opacity={0.85} />
    {[-0.09, -0.03, 0.03, 0.09].map((x, i) => (
      <F key={i} g={capsule(0.025, 0.55 + i * 0.07)} c={C.blood} pos={[x, -0.05, 0.001]} opacity={0.75} />
    ))}
  </group>
);

export const WoodChair: React.FC<{ x: number; z: number; rotY?: number; stained?: boolean }> = ({ x, z, rotY = 0, stained }) => (
  <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
    {/* back posts + slats (behind the sitter) */}
    {[-0.3, 0.3].map((s) => (
      <F key={s} g={roundRect(0.08, 1.35, 0.03, s, 0.68)} outline={roundRect(0.08 + O * 2, 1.35 + O * 2, 0.04, s, 0.68)} c={C.woodDark} pos={[0, 0, -0.3]} />
    ))}
    {[1.05, 1.25].map((y) => (
      <F key={y} g={roundRect(0.66, 0.1, 0.03, 0, y)} outline={roundRect(0.66 + O * 2, 0.1 + O * 2, 0.04, 0, y)} c={C.wood} pos={[0, 0, -0.29]} />
    ))}
    {/* seat */}
    <F g={roundRect(0.72, 0.1, 0.03, 0, 0.5)} outline={roundRect(0.72 + O * 2, 0.1 + O * 2, 0.04, 0, 0.5)} c={C.wood} pos={[0, 0, 0.05]} />
    {/* front legs */}
    {[-0.3, 0.3].map((s) => (
      <F key={`l${s}`} g={roundRect(0.08, 0.5, 0.03, s, 0.25)} outline={roundRect(0.08 + O * 2, 0.5 + O * 2, 0.04, s, 0.25)} c={C.woodDark} pos={[0, 0, 0.06]} />
    ))}
    {stained && (
      <>
        <F g={blob(13, 0.17, 0.3, 2)} c={C.blood} pos={[0.05, 0.52, 0.07]} opacity={0.9} />
        <F g={capsule(0.02, 0.32)} c={C.blood} pos={[0.12, 0.47, 0.075]} opacity={0.85} />
      </>
    )}
  </group>
);

// cut rope pieces lying on the floor
export const CutRope: React.FC<{ x: number; z: number; seed?: number }> = ({ x, z, seed = 3 }) => {
  const geos = useMemo(() => {
    const r = mulberry(seed);
    return [0, 1, 2].map(() => {
      const pts = Array.from({ length: 5 }).map(
        (_, i) => new THREE.Vector3((i - 2) * 0.16 + r() * 0.06, 0.03, (r() - 0.5) * 0.25),
      );
      const curve = new THREE.CatmullRomCurve3(pts);
      return {
        g: new THREE.TubeGeometry(curve, 24, 0.025, 6, false),
        go: new THREE.TubeGeometry(curve, 24, 0.025 + 0.012, 6, false),
        off: [(r() - 0.5) * 0.7, (r() - 0.5) * 0.4, r() * 3] as [number, number, number],
      };
    });
  }, [seed]);
  return (
    <group position={[x, 0, z]}>
      {geos.map((o, i) => (
        <group key={i} position={[o.off[0], 0, o.off[1]]} rotation={[0, o.off[2], 0]}>
          <mesh geometry={o.go}>
            <meshBasicMaterial color={C.ink} side={THREE.BackSide} toneMapped={false} />
          </mesh>
          <mesh geometry={o.g} castShadow>
            <Mat color={C.rope} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export const Bulb: React.FC<{ t: number; amp?: number; light?: boolean; intensity?: number; cone?: boolean; seed?: number; forceOn?: number }> = ({
  t,
  amp,
  light = true,
  intensity = 9,
  cone = true,
  seed,
  forceOn,
}) => {
  const b = bulbState(t, amp, seed);
  const on = forceOn ?? b.on;
  return (
    <group>
      {/* cord */}
      <group position={BULB_PIVOT} rotation={[0, 0, b.ang]}>
        <mesh position={[0, -CORD / 2, 0]}>
          <planeGeometry args={[0.025, CORD]} />
          <meshBasicMaterial color={C.ink} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <group position={[0, -CORD, 0.02]}>
          <F g={roundRect(0.12, 0.12, 0.03)} outline={roundRect(0.12 + O * 2, 0.12 + O * 2, 0.04)} c="#6b665b" pos={[0, 0.06, 0]} unlit />
          <F g={circle(0.11)} outline={circle(0.11 + O)} c={on > 0.5 ? "#fff4cf" : "#8d8670"} pos={[0, -0.08, 0.005]} unlit />
          {/* glow halo */}
          <mesh position={[0, -0.08, 0.05]}>
            <planeGeometry args={[1.8, 1.8]} />
            <meshBasicMaterial map={radialTex("rgba(255,226,160,0.9)", "rgba(255,226,160,0)")} transparent opacity={on} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          {/* volumetric cone */}
          {cone && (
            <mesh position={[0, -1.35, 0]} rotation={[0, 0, 0]}>
              <coneGeometry args={[1.6, 2.6, 48, 1, true]} />
              <meshBasicMaterial
                map={coneTex()}
                transparent
                opacity={0.22 * on}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          )}
        </group>
      </group>
      {light && (
        <pointLight
          position={[b.pos[0], b.pos[1] - 0.12, b.pos[2] + 0.05]}
          intensity={intensity * on}
          distance={14}
          decay={1.6}
          color="#ffe1a8"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.002}
          shadow-radius={4}
        />
      )}
    </group>
  );
};

let _cone: THREE.Texture | null = null;
const coneTex = () => {
  if (_cone) return _cone;
  const cv = document.createElement("canvas");
  cv.width = 8;
  cv.height = 256;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(255,225,160,0)");
  g.addColorStop(0.35, "rgba(255,225,160,0.25)");
  g.addColorStop(1, "rgba(255,225,160,1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 256);
  _cone = new THREE.CanvasTexture(cv);
  return _cone;
};

// dust motes drifting in the light
export const Dust: React.FC<{ t: number; n?: number; around?: [number, number, number]; spread?: number }> = ({
  t,
  n = 60,
  around = [0, 1.5, -0.8],
  spread = 1.6,
}) => {
  const motes = useMemo(() => {
    const r = mulberry(99);
    return Array.from({ length: n }).map(() => ({ x: (r() - 0.5) * 2, y: r(), z: (r() - 0.5) * 2, s: 0.008 + r() * 0.015, sp: 0.3 + r() }));
  }, [n]);
  return (
    <group position={around}>
      {motes.map((m, i) => {
        const y = (((m.y + t * 0.0015 * m.sp) % 1) - 0.5) * 2.4;
        return (
          <mesh key={i} position={[m.x * spread + Math.sin(t * 0.02 + i) * 0.1, y, m.z * spread * 0.5]}>
            <circleGeometry args={[m.s, 6]} />
            <meshBasicMaterial color="#fff2cc" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Door: React.FC<{ slit?: number; feet?: [number, number][] }> = ({ slit = 1, feet = [] }) => (
  <group position={[DOOR_X, 0, ROOM.back + 0.02]}>
    <F g={roundRect(1.3, 2.35, 0.04, 0, 1.175)} outline={roundRect(1.3 + O * 3, 2.35 + O * 3, 0.06, 0, 1.175)} c="#5d4a3a" />
    {[0.7, 1.65].map((y) => (
      <F key={y} g={roundRect(0.9, 0.7, 0.04, 0, y)} outline={roundRect(0.9 + O, 0.7 + O, 0.05, 0, y)} c="#6c5747" pos={[0, 0, 0.005]} />
    ))}
    <F g={circle(0.06)} outline={circle(0.06 + O)} c="#b9a679" pos={[0.48, 1.12, 0.01]} />
    {/* light leaking under the door */}
    <F g={roundRect(1.22, 0.06, 0.01, 0, 0.035)} c="#fff0c4" pos={[0, 0, 0.012]} unlit opacity={slit} />
    {/* light fan spilling onto the floor, broken by the feet */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0.45]}>
      <planeGeometry args={[1.25, 0.9]} />
      <meshBasicMaterial map={linearTex([[0, "rgba(255,226,160,0)"], [1, "rgba(255,226,160,0.75)"]])} transparent opacity={slit} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    {feet.map(([x, o], i) => (
      <mesh key={`fs${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x * 1.2, 0.01, 0.45]}>
        <planeGeometry args={[0.24, 0.9]} />
        <meshBasicMaterial color="#120e0a" transparent opacity={0.85 * o} depthWrite={false} toneMapped={false} />
      </mesh>
    ))}
    {feet.map(([x, o], i) => (
      <F key={i} g={roundRect(0.2, 0.055, 0.01, x, 0.03)} c="#1b1712" pos={[0, 0, 0.014]} opacity={o} unlit />
    ))}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.25]} scale={[1, 0.35, 1]}>
      <planeGeometry args={[1.8, 1.4]} />
      <meshBasicMaterial map={radialTex("rgba(255,220,150,0.6)", "rgba(255,220,150,0)")} transparent opacity={slit} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  </group>
);

// the room: concrete walls, stains, tally marks, small barred window, door
export const Room: React.FC = () => {
  const tallies = useMemo(() => {
    const out: { x: number; y: number; r: number; h: number }[] = [];
    const r = mulberry(21);
    for (let g = 0; g < 4; g++) {
      for (let i = 0; i < 4; i++) out.push({ x: 1.0 + g * 0.32 + i * 0.055, y: 1.65 + g * 0.02, r: (r() - 0.5) * 0.08, h: 0.28 });
      out.push({ x: 1.0 + g * 0.32 + 0.085, y: 1.65 + g * 0.02, r: 1.05, h: 0.34 });
    }
    return out;
  }, []);
  return (
    <group>
      <Wall w={ROOM.w} h={ROOM.ceil} pos={[0, ROOM.ceil / 2, ROOM.back]} c={C.concrete} />
      <Wall w={10} h={ROOM.ceil} pos={[-ROOM.w / 2, ROOM.ceil / 2, ROOM.back + 5]} rotY={Math.PI / 2} c={C.concreteDark} />
      <Wall w={10} h={ROOM.ceil} pos={[ROOM.w / 2, ROOM.ceil / 2, ROOM.back + 5]} rotY={-Math.PI / 2} c={C.concreteDark} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROOM.back + 5]} receiveShadow>
        <planeGeometry args={[ROOM.w, 10, 8, 8]} />
        <Mat color="#8f8a7c" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.ceil, ROOM.back + 5]}>
        <planeGeometry args={[ROOM.w, 10]} />
        <Mat color="#4a463e" />
      </mesh>
      {/* wall panel seams + skirting */}
      {[-3, -1.5, 0, 1.5, 3].map((x) => (
        <F key={x} g={roundRect(0.025, ROOM.ceil, 0.01, x, ROOM.ceil / 2)} c="#a29c8c" pos={[0, 0, ROOM.back + 0.005]} />
      ))}
      <F g={roundRect(ROOM.w, 0.18, 0.01, 0, 0.09)} c="#7d786b" pos={[0, 0, ROOM.back + 0.008]} />
      {/* damp stains */}
      <Stain seed={5} r={0.7} pos={[-3.2, 3.1, ROOM.back + 0.01]} c="#8f8877" opacity={0.6} spikes={0} />
      <Stain seed={8} r={0.5} pos={[2.2, 0.35, ROOM.back + 0.01]} c="#8f8877" opacity={0.5} spikes={0} />
      {/* small barred window up high */}
      <group position={[-0.9, 3.05, ROOM.back + 0.015]}>
        <F g={roundRect(0.9, 0.45, 0.03)} outline={roundRect(0.9 + O * 2, 0.45 + O * 2, 0.04)} c="#33414a" unlit />
        {[-0.3, -0.1, 0.1, 0.3].map((x) => (
          <F key={x} g={roundRect(0.035, 0.45, 0.01, x)} c={C.ink} pos={[0, 0, 0.005]} unlit />
        ))}
      </group>
      {/* blood: smears, splats and drips on the back wall around the empty chair */}
      <Stain seed={31} r={0.32} pos={[-2.5, 1.25, ROOM.back + 0.012]} drips={5} />
      <Stain seed={32} r={0.16} pos={[-1.75, 1.6, ROOM.back + 0.012]} drips={2} />
      <Stain seed={33} r={0.1} pos={[-1.45, 1.1, ROOM.back + 0.012]} drips={1} spikes={2} />
      <Smear pos={[-3.2, 1.6, ROOM.back + 0.013]} rot={0.15} />
      <Stain seed={34} r={0.08} pos={[-0.9, 0.85, ROOM.back + 0.012]} spikes={4} />
      {/* scratched tally marks */}
      {tallies.map((tm, i) => (
        <F key={i} g={roundRect(0.022, tm.h, 0.01)} c="#5d574b" pos={[tm.x, tm.y, ROOM.back + 0.012]} rot={tm.r} />
      ))}
      {/* floor stains */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CHAIR2_X + 0.1, 0.006, -1.3]}>
        <primitive object={blob(55, 0.55, 0.3, 4)} attach="geometry" />
        <meshLambertMaterial color={C.bloodDark} transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.9, 0.006, -0.3]}>
        <primitive object={blob(56, 0.16, 0.35, 3)} attach="geometry" />
        <meshLambertMaterial color={C.bloodDark} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.4, 0.006, -0.2]}>
        <primitive object={blob(57, 0.1, 0.35, 2)} attach="geometry" />
        <meshLambertMaterial color={C.bloodDark} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {/* a drain in the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.9, 0.007, -1.9]}>
        <circleGeometry args={[0.16, 24]} />
        <meshLambertMaterial color="#5a564c" toneMapped={false} />
      </mesh>
      {/* bucket */}
      <group position={[3.9, 0, -2.5]}>
        <F g={roundRect(0.45, 0.5, 0.06, 0, 0.25)} outline={roundRect(0.45 + O * 2, 0.5 + O * 2, 0.07, 0, 0.25)} c="#8a958f" />
        <F g={roundRect(0.47, 0.06, 0.03, 0, 0.47)} c="#6c7570" pos={[0, 0, 0.005]} />
      </group>
      {/* hook + chain on the wall */}
      <group position={[-3.9, 2.6, ROOM.back + 0.02]}>
        <F g={circle(0.05)} c={C.ink} />
        {Array.from({ length: 8 }).map((_, i) => (
          <F key={i} g={roundRect(0.05, 0.11, 0.025)} outline={roundRect(0.05 + 0.02, 0.11 + 0.02, 0.03)} c="#7a7a72" pos={[0, -0.1 - i * 0.09, 0.005]} rot={i % 2 ? 0 : 0} />
        ))}
      </group>
    </group>
  );
};
