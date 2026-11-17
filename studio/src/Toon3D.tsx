import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FEELS, FeelName, makePerson, PersonSpec, Pose, POSES, PoseName } from "./People";
import { SetStage } from "./Sets";
import { buildCam, Cam, rad } from "./lib";

// Real 3D cel-shaded people with an ink outline, built from the same PersonSpec as the 2D People.
// Toon shading = 3 flat light bands; outline = the "inverted hull": a slightly bigger copy drawn from the back in ink.

const INK = "#2a1f1a";
const OUTLINE = 0.012; // metres

let ramp: THREE.DataTexture | null = null;
const toonRamp = () => {
  if (ramp) return ramp;
  const d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  return ramp;
};

type GeoKind = { k: "sphere"; r: number; sy?: number } | { k: "capsule"; r: number; len: number } | { k: "cone"; r0: number; r1: number; len: number } | { k: "box"; s: [number, number, number] };

const geo = (g: GeoKind, grow = 0): THREE.BufferGeometry => {
  if (g.k === "sphere") return new THREE.SphereGeometry(g.r + grow, 28, 20);
  if (g.k === "capsule") return new THREE.CapsuleGeometry(g.r + grow, g.len, 8, 18);
  if (g.k === "cone") return new THREE.CylinderGeometry(g.r1 + grow, g.r0 + grow, g.len + grow * 2, 24, 1);
  return new THREE.BoxGeometry(g.s[0] + grow * 2, g.s[1] + grow * 2, g.s[2] + grow * 2);
};

/** One toon part with its ink outline. */
const Part: React.FC<{ g: GeoKind; c: string; p?: [number, number, number]; r?: [number, number, number]; sc?: [number, number, number]; line?: boolean }> = ({ g, c, p, r, sc, line = true }) => {
  const [a, b] = useMemo(() => [geo(g), geo(g, OUTLINE)], [JSON.stringify(g)]);
  return (
    <group position={p} rotation={r} scale={sc}>
      <mesh geometry={a} castShadow>
        <meshToonMaterial color={c} gradientMap={toonRamp()} />
      </mesh>
      {line ? (
        <mesh geometry={b}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      ) : null}
    </group>
  );
};

/** Flat ink on the face (eyes, brows, mouth): unlit, no outline. */
const Ink: React.FC<{ p: [number, number, number]; s: [number, number, number]; r?: number; c?: string; round?: boolean }> = ({ p, s, r = 0, c = INK, round }) => (
  <mesh position={p} rotation={[0, 0, r]} scale={s}>
    {round ? <sphereGeometry args={[1, 16, 12]} /> : <boxGeometry args={[1, 1, 1]} />}
    <meshBasicMaterial color={c} />
  </mesh>
);

const SKIRTS = /sin|phathung|skirt|sarong|pha|dress|jong/;

/** A limb hanging from a joint: rotate the group, the capsule hangs down along -y. */
const Limb: React.FC<{ at: [number, number, number]; z: number; x?: number; len: number; r: number; c: string; end?: React.ReactNode; bend?: number; len2?: number; c2?: string }> = ({ at, z, x = 0, len, r, c, end, bend = 0, len2, c2 }) => (
  <group position={at} rotation={[rad(x), 0, rad(z)]}>
    <Part g={{ k: "capsule", r, len }} c={c} p={[0, -len / 2, 0]} />
    <group position={[0, -len, 0]} rotation={[rad(-bend), 0, 0]}>
      {len2 ? <Part g={{ k: "capsule", r: r * 0.92, len: len2 }} c={c2 ?? c} p={[0, -len2 / 2, 0]} /> : null}
      <group position={[0, -(len2 ?? 0), 0]}>{end}</group>
    </group>
  </group>
);

export const ToonPerson: React.FC<{ spec: PersonSpec; pose?: Pose; feel?: FeelName; pos?: [number, number, number]; face?: number; t?: number; blink?: boolean }> = ({ spec, pose = POSES.stand, feel = "neutral", pos = [0, 0, 0], face = 0, t = 0, blink }) => {
  const H = spec.h / 100;
  const child = spec.age === "child";
  const C = spec.wear.colors;
  const top = C.top, bottom = C.bottom, feet = C.feet ?? "#3a2a20";
  const skirt = SKIRTS.test(spec.wear.bottom);
  // proportions: a big friendly head, like the 2D cast
  const headR = H * (child ? 0.115 : 0.085);
  const legLen = H * (child ? 0.40 : 0.45) * (1 - pose.crouch * 0.4);
  const torso = H * (child ? 0.26 : 0.30);
  const hipY = legLen + 0.04;
  const shY = hipY + torso;
  const bw = H * 0.085 * spec.wide; // half body width
  const armLen = H * 0.145, foreLen = H * 0.13;
  const fe = FEELS[feel] as { eyes: string; brow: number; browY: number; mouth: string; blush?: boolean; tears?: boolean };
  const breath = Math.sin(t * 2.2) * 0.006;
  const eyeClosed = blink || fe.eyes === "closed" || fe.eyes === "happy";
  const sit = pose.sit > 0.5 ? 0.45 : 0;
  const hy = shY + headR * 1.05 - sit * 0.95 + breath;

  const hand = <Part g={{ k: "sphere", r: H * 0.022 }} c={spec.skin} p={[0, -H * 0.012, 0]} sc={[0.9, 1.15, 0.8]} />;
  const shoe = <Part g={{ k: "box", s: [H * 0.06, H * 0.035, H * 0.11] }} c={feet} p={[0, -H * 0.012, H * 0.025]} />;
  const mouthW = fe.mouth === "O" || fe.mouth === "A" ? headR * 0.18 : headR * 0.32;
  const mouthUp = fe.mouth === "smile" ? 1 : fe.mouth === "frown" || fe.mouth === "grit" ? -1 : 0;

  return (
    <group position={pos} rotation={[0, rad(face), 0]}>
      <group position={[0, -sit * 0.95, 0]} rotation={[rad(pose.lean * 0.6), 0, 0]}>
        {/* legs (sitting: thighs forward) */}
        {skirt ? (
          <Part g={{ k: "cone", r0: bw * 1.25, r1: bw * 0.95, len: legLen * 0.86 }} c={bottom} p={[0, hipY - legLen * 0.43, 0]} />
        ) : null}
        {[-1, 1].map((sd) => (
          <Limb key={sd} at={[sd * bw * 0.5, hipY, 0]} z={sd * ((sd < 0 ? pose.legL : pose.legR) * 0.5)} x={sit ? -88 : 0} bend={sit ? -88 : pose.crouch * 80}
            len={legLen * 0.5} len2={legLen * 0.5} r={H * 0.035} c={skirt ? spec.skin : bottom} c2={skirt ? spec.skin : bottom} end={shoe} />
        ))}
        {/* torso */}
        <Part g={{ k: "capsule", r: bw, len: torso - bw }} c={top} p={[0, hipY + torso / 2, 0]} sc={[1, 1, 0.72]} />
        {/* arms: pose angles are degrees out from the body, elbow bends the forearm forward */}
        {[-1, 1].map((sd) => {
          const a = sd < 0 ? pose.armL : pose.armR, e = sd < 0 ? pose.elbowL : pose.elbowR;
          return <Limb key={sd} at={[sd * (bw + H * 0.02), shY - H * 0.02, 0]} z={sd * a} bend={Math.min(150, Math.abs(e))} len={armLen} len2={foreLen} r={H * 0.022} c={top} c2={spec.skin} end={hand} />;
        })}
        {/* neck + head */}
        <Part g={{ k: "capsule", r: H * 0.022, len: H * 0.03 }} c={spec.skin} p={[0, shY + H * 0.015, 0]} line={false} />
        <group position={[0, hy + sit * 0.95, 0]} rotation={[rad(pose.head * 0.7), 0, 0]}>
          <Part g={{ k: "sphere", r: headR }} c={spec.skin} sc={[1, 1.04, 0.96]} />
          {/* hair: a cap over the back and top, a bun for long styles */}
          <Part g={{ k: "sphere", r: headR * 1.04 }} c={spec.hair} p={[0, headR * 0.12, -headR * 0.16]} sc={[1.02, 0.94, 0.95]} />
          {spec.female && spec.hairStyle !== 5 ? <Part g={{ k: "sphere", r: headR * 0.42 }} c={spec.hair} p={[0, headR * 0.95, -headR * 0.35]} /> : null}
          {/* face ink, on the front of the head */}
          {[-1, 1].map((sd) =>
            eyeClosed ? (
              <Ink key={sd} p={[sd * headR * 0.36, -headR * 0.02, headR * 0.93]} s={[headR * 0.2, headR * 0.035, 0.004]} r={fe.eyes === "happy" ? sd * 0.0 : 0} />
            ) : (
              <group key={sd}>
                <Ink round p={[sd * headR * 0.36, -headR * 0.02, headR * 0.9]} s={[headR * 0.11, headR * (fe.eyes === "wide" ? 0.17 : fe.eyes === "half" || fe.eyes === "narrow" ? 0.07 : 0.14), headR * 0.05]} />
                <Ink round p={[sd * headR * 0.36 + headR * 0.04, headR * 0.03, headR * 0.95]} s={[headR * 0.035, headR * 0.035, 0.003]} c="#ffffff" />
              </group>
            ),
          )}
          {[-1, 1].map((sd) => (
            <Ink key={`b${sd}`} p={[sd * headR * 0.36, headR * (0.28 + fe.browY * 0.03), headR * 0.92]} s={[headR * 0.26, headR * 0.045, 0.004]} r={rad(-sd * fe.brow)} />
          ))}
          <group position={[0, -headR * 0.42, headR * 0.86]}>
            {mouthUp === 0 ? (
              <Ink round={fe.mouth === "O" || fe.mouth === "A"} p={[0, 0, 0]} s={[mouthW / 2, fe.mouth === "O" || fe.mouth === "A" ? headR * 0.12 : headR * 0.03, 0.01]} c={fe.mouth === "O" || fe.mouth === "A" ? "#6b2a2a" : INK} />
            ) : (
              <mesh rotation={[0, 0, mouthUp > 0 ? Math.PI : 0]} position={[0, mouthUp > 0 ? headR * 0.08 : -headR * 0.05, 0]}>
                <torusGeometry args={[mouthW / 2, headR * 0.022, 6, 16, Math.PI]} />
                <meshBasicMaterial color={INK} />
              </mesh>
            )}
          </group>
          {fe.blush ? [-1, 1].map((sd) => <Ink key={`k${sd}`} round p={[sd * headR * 0.55, -headR * 0.25, headR * 0.8]} s={[headR * 0.12, headR * 0.06, 0.02]} c="#e88f86" />) : null}
          {fe.tears ? [-1, 1].map((sd) => <Ink key={`t${sd}`} round p={[sd * headR * 0.36, -headR * 0.3, headR * 0.9]} s={[headR * 0.05, headR * 0.16, 0.02]} c="#7cc4ee" />) : null}
        </group>
      </group>
    </group>
  );
};

/** Review: the 2D cast rebuilt in 3D, orbiting camera, in the night room and the village. */
export const ToonTest: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 30;
  const cast = [101, 102, 103, 104].map((s, i) => makePerson(s, [{ age: "adult", female: true, era: "city" }, { age: "elder", female: true, era: "rural" }, { age: "adult", female: false, era: "rural" }, { age: "child", female: true, era: "rural" }][i] as never));
  const feels: FeelName[] = ["sad", "happy", "shock", "cry"];
  const poses: PoseName[] = ["think", "reach", "point", "stand"];
  const ang = rad(-40 + t * 18);
  const R = 4.2;
  const cam: Cam = { fov: 40, pos: [Math.sin(ang) * R, 1.7 + Math.sin(t * 0.5) * 0.3, 2.6 + Math.cos(ang) * R], target: [0, 0.85, 2.6] };
  const cam3 = buildCam(cam, width / height);
  const set = t < 5 ? "village" : "room";
  return (
    <AbsoluteFill>
      <SetStage set={set} cam={cam} cam3={cam3} width={width} height={height} frame={frame} blur={0} seed={7} time={set === "room" ? "night" : "day"} blobs={[]}
        inside={cast.map((s, i) => (
          <ToonPerson key={i} spec={s} pose={POSES[poses[i]]} feel={feels[i]} pos={[-1.2 + i * 0.8, 0, 2.6 + (i % 2) * 0.3]} t={t + i} blink={Math.floor(t * 10 + i * 7) % 37 === 0} />
        ))}
      >{null}</SetStage>
    </AbsoluteFill>
  );
};
