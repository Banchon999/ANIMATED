import React from "react";
import * as THREE from "three";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FrontHead, SideFigure } from "../chars/Person";
import { FrontHero, RopeTube } from "../chars/Front";
import { P, lerpPose, tiptoePose } from "../chars/rig";
import { C, F, INK_W as O, LitScope } from "../lib/draw";
import { kf, lin, mix, range, shake } from "../lib/anim";
import { Black, Eyelids, FONT, Grade } from "../lib/Overlays";
import { capsule, roundRect } from "../lib/shapes";
import { Cam, Layer, Stage } from "../lib/Stage";
import { Bulb, CHAIR2_X, CutRope, DOOR_X, Door, Dust, ROOM, Room, WoodChair, bulbState } from "../sets/Room";

export const ACT2_LEN = 1460;
const CHAIR_Z = -1.0;
const clampE = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// footsteps behind the door (local act-2 frames) — shared with the sound design
export const STEPS = [1150, 1178, 1204, 1228, 1250, 1300];

const Lights: React.FC<{ t: number; amb?: number; intensity?: number; dead?: boolean }> = ({ t, amb = 0.55, intensity = 9, dead }) => (
  <>
    <ambientLight intensity={dead ? 0.05 : amb} color="#9fa7a0" />
    <directionalLight position={[1.5, 2.5, 6]} intensity={dead ? 0 : 0.9} color="#b8c4c8" />
    <Bulb t={t} intensity={dead ? 0 : intensity} forceOn={dead ? 0 : undefined} />
  </>
);

const RoomScene: React.FC<{ t: number; children?: React.ReactNode; amb?: number; dust?: boolean; dead?: boolean; feet?: [number, number][] }> = ({
  t,
  children,
  amb,
  dust = true,
  dead,
  feet,
}) => (
  <LitScope lit shadows>
    <Lights t={t} amb={amb} dead={dead} />
    <Room />
    <Door feet={feet} />
    <WoodChair x={CHAIR2_X} z={-1.6} stained />
    <CutRope x={CHAIR2_X + 0.15} z={-1.1} />
    {dust && !dead && <Dust t={t} />}
    {children}
  </LitScope>
);

const STAGE = { bg: "#120e0a", shadows: true } as const;

const seated = (t: number, e: Parameters<typeof FrontHero>[0]["e"], extra: Partial<Parameters<typeof FrontHero>[0]> = {}) => (
  <>
    <WoodChair x={0} z={CHAIR_Z} />
    <FrontHero x={0} z={CHAIR_Z + 0.02} sit={1} tied={1} e={e} breathe={Math.sin(t * 0.12)} {...extra} />
  </>
);

/* --- W: waking up, POV --------------------------------------------------- */
const ShotWake: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const open = kf(lt, [
    [0, [0]],
    [20, [0.35]],
    [28, [0.3]],
    [36, [0]],
    [44, [0]],
    [64, [0.7]],
    [72, [0.65]],
    [77, [0.05]],
    [82, [0.1]],
    [110, [1]],
  ])[0];
  const blur = mix(16, 0, range(lt, 40, 115));
  const sw = shake(t, 0.05, 11);
  const cam: Cam = { pos: [0.05 + sw[0], 1.3 + sw[1], CHAIR_Z + 0.9], look: [0.25 + sw[0] * 3, 2.35, CHAIR_Z - 0.6], fov: 66, roll: 0.25 - range(lt, 30, 115) * 0.2 };
  return (
    <>
      <Stage cam={cam} {...STAGE} layers={[{ key: "room", blur, node: <RoomScene t={t} /> }]} />
      <Eyelids open={open} />
    </>
  );
};

/* --- R: reveal wide --------------------------------------------------------- */
const ShotReveal: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const z = mix(5.6, 3.9, lin(lt, 0, 160));
  const cam: Cam = { pos: [0.15, 1.55, z], look: [0.0, 1.3, -1.6], fov: 52 };
  const head = Math.sin(lt * 0.05) * 0.12;
  return (
    <Stage
      cam={cam}
      {...STAGE}
      layers={[
        {
          key: "room",
          node: (
            <RoomScene t={t}>
              {seated(t, { eye: lt < 50 ? "squint" : "dot", mouth: "line", brow: 0.3, lookX: Math.sin(lt * 0.05) }, { headTilt: head * 0.4, headTurn: head })}
            </RoomScene>
          ),
        },
      ]}
    />
  );
};

/* --- F: face, eyes darting ---------------------------------------------------- */
const ShotFace: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const lookX = kf(lt, [
    [0, [0]],
    [18, [0]],
    [24, [-1]],
    [52, [-1]],
    [58, [1]],
    [88, [1]],
    [96, [0]],
  ])[0];
  const sw = shake(t, 0.012, 5);
  const cam: Cam = { pos: [sw[0], 1.38 + sw[1], CHAIR_Z + 1.55], look: [0, 1.32, CHAIR_Z], fov: 36 };
  return (
    <Stage
      cam={cam}
      {...STAGE}
      layers={[
        { key: "bg", blur: 7, node: <RoomScene t={t} dust={false} /> },
        {
          key: "hero",
          node: (
            <LitScope lit shadows>
              <Lights t={t} />
              {seated(t, { eye: "wide", pupil: 0.9, lookX, brow: 0.5, mouth: "line", sweat: lin(lt, 20, 110) }, { headTilt: lookX * 0.05 })}
              <Dust t={t} around={[0, 1.4, CHAIR_Z + 0.4]} spread={0.7} n={30} />
            </LitScope>
          ),
        },
      ]}
    />
  );
};

/* --- P: pan across the wall to the empty chair -------------------------------- */
const ShotPan: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const c = kf(lt, [
    [0, [1.7, 1.55]],
    [70, [-0.4, 1.45]],
    [120, [-2.3, 1.05]],
    [180, [-2.25, 0.85]],
  ]);
  const push = range(lt, 120, 180);
  const pull = range(lt, 110, 135);
  const sw = shake(t, 0.02, 7);
  const cam: Cam = { pos: [mix(0.3, -0.9, push) + sw[0], 1.3 + sw[1], mix(0.6, -0.1, push)], look: [c[0], c[1], ROOM.back], fov: 46 };
  const layers: Layer[] = [
    { key: "wall", blur: 6 * pull, node: <RoomScene t={t} /> },
  ];
  return <Stage cam={cam} {...STAGE} layers={layers} />;
};

/* --- D: dolly zoom on the face --------------------------------------------- */
const ShotVertigo: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const k = range(lt, 6, 80);
  const d = mix(1.35, 3.6, k);
  const fov = (2 * Math.atan(0.5 / d) * 180) / Math.PI;
  const cam: Cam = { pos: [0, 1.38, CHAIR_Z + d], look: [0, 1.36, CHAIR_Z], fov };
  return (
    <Stage
      cam={cam}
      {...STAGE}
      layers={[
        {
          key: "room",
          node: (
            <RoomScene t={t}>
              {seated(t, {
                eye: "wide",
                eyeScale: 1 + k * 0.35,
                pupil: mix(0.9, 0.35, k),
                brow: 0.9,
                browY: 0.03 * k,
                mouth: "wobble",
                sweat: 1,
              })}
            </RoomScene>
          ),
        },
      ]}
    />
  );
};

/* --- K: the knot behind the chair loosens ----------------------------------------- */
const Wrists: React.FC<{ lt: number }> = ({ lt }) => {
  const wrig = Math.sin(lt * 0.55) * 0.12 * (1 - range(lt, 95, 105));
  const loose = range(lt, 40, 100);
  const slip = range(lt, 96, 118);
  const free = range(lt, 104, 126);
  const loops = [0, 1, 2].map((i) => {
    const r = mix(0.075, 0.13, loose) + i * 0.004;
    const y = -0.02 + i * 0.045 - slip * (0.45 + i * 0.1);
    return Array.from({ length: 12 }).map((_, j) => {
      const a = (j / 12) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * (r + 0.07), y + Math.sin(a) * 0.012 * i, Math.sin(a) * r * 0.7);
    });
  });
  return (
    <group>
      {/* forearms coming down from the shoulders, crossed at the wrists */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (0.26 + free * 0.25), 0.62, 0]} rotation={[0, 0, -s * (0.38 + wrig * s - free * 0.9)]}>
          <F g={capsule(0.075, 0.66)} outline={capsule(0.075 + O, 0.66)} c={C.skinShade} />
          <group position={[0, -0.7, 0.02]} rotation={[0, 0, s * (Math.sin(lt * 0.9) * 0.2 * (1 - free))]}>
            <F g={roundRect(0.17, 0.2, 0.08)} outline={roundRect(0.17 + O * 2, 0.2 + O * 2, 0.09)} c={C.skinShade} />
            {[-0.05, 0, 0.05].map((fx) => (
              <F key={fx} g={capsule(0.024, 0.08)} outline={capsule(0.024 + O, 0.08)} c={C.skinShade} pos={[fx, -0.09, 0.005]} />
            ))}
          </group>
        </group>
      ))}
      {loops.map((pts, i) => (
        <group key={i} rotation={[0, 0, slip * (i - 1) * 0.4]}>
          <RopeTube pts={pts} closed r={0.022} k={`w${i}`} />
        </group>
      ))}
    </group>
  );
};

const ShotRope: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const sw = shake(t, 0.015, 3);
  const cam: Cam = { pos: [0.12 + sw[0], 0.85 + sw[1], CHAIR_Z - 2.0], look: [0, 0.6, CHAIR_Z], fov: 40 };
  return (
    <Stage
      cam={cam}
      bg="#120e0a"
      shadows
      layers={[
        {
          key: "close",
          node: (
            <LitScope lit shadows>
              <ambientLight intensity={0.6} color="#9fa7a0" />
              <Bulb t={t} intensity={7} cone={false} />
              {/* the room behind the camera is the far side wall; use a dark backdrop */}
              <mesh position={[0, 1.5, CHAIR_Z + 3.5]} receiveShadow>
                <planeGeometry args={[12, 8]} />
                <meshLambertMaterial color={C.concreteDark} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, CHAIR_Z]} receiveShadow>
                <planeGeometry args={[12, 12]} />
                <meshLambertMaterial color="#8f8a7c" />
              </mesh>
              {/* back of the shirt + chair back, seen from behind */}
              <group position={[0, 0, CHAIR_Z + 0.25]} rotation={[0, Math.PI, 0]}>
                <F g={roundRect(0.55, 0.62, 0.12, 0, 0.88)} outline={roundRect(0.55 + O * 2, 0.62 + O * 2, 0.13, 0, 0.88)} c={C.shirt} pos={[0, 0, 0.0]} />
              </group>
              <group position={[0, 0, CHAIR_Z - 0.15]} rotation={[0, Math.PI, 0]}>
                {[-0.3, 0.3].map((s) => (
                  <F key={s} g={roundRect(0.08, 1.35, 0.03, s, 0.68)} outline={roundRect(0.08 + O * 2, 1.35 + O * 2, 0.04, s, 0.68)} c={C.woodDark} />
                ))}
                {[1.05, 1.25].map((y) => (
                  <F key={y} g={roundRect(0.66, 0.1, 0.03, 0, y)} outline={roundRect(0.66 + O * 2, 0.1 + O * 2, 0.04, 0, y)} c={C.wood} pos={[0, 0, 0.01]} />
                ))}
              </group>
              <LitScope lit={false}>
                <group position={[0, 0.47, CHAIR_Z - 0.36]} rotation={[0, Math.PI, 0]}>
                  <Wrists lt={lt} />
                </group>
              </LitScope>
              {lt > 112 && <CutRope x={0.1} z={CHAIR_Z - 0.4} seed={9} />}
            </LitScope>
          ),
        },
      ]}
    />
  );
};

/* --- S: he stands up, rubs his wrists, looks at the door ------------------------ */
const ShotStand: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const up = range(lt, 8, 38);
  const turn = range(lt, 78, 96);
  const cam: Cam = { pos: [0.4, 1.4, 3.2], look: [0.2, 1.2, -1.2], fov: 50 };
  return (
    <Stage
      cam={cam}
      {...STAGE}
      layers={[
        {
          key: "room",
          node: (
            <RoomScene t={t}>
              <WoodChair x={0} z={CHAIR_Z} />
              <FrontHero
                x={0}
                z={CHAIR_Z + 0.02 + up * 0.1}
                sit={1 - up}
                tied={1 - range(lt, 4, 30)}
                armsBehind={lt < 20}
                e={{
                  eye: turn > 0.5 ? "wide" : lt > 45 && lt < 75 ? "closed" : "dot",
                  lookX: turn * 1,
                  mouth: lt > 45 && lt < 75 ? "smile" : "line",
                  brow: turn > 0.5 ? 0.4 : 0.1,
                  sweat: 0.5,
                }}
                headTurn={turn * 0.5}
                breathe={Math.sin(t * 0.15)}
              />
              {lt > 30 && <CutRope x={0.05} z={CHAIR_Z + 0.3} seed={12} />}
            </RoomScene>
          ),
        },
      ]}
    />
  );
};

/* --- T: tiptoe to the door, freeze ------------------------------------------------ */
const ShotTiptoe: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const stopAt = 110;
  const ph = Math.min(lt, stopAt) * 0.085;
  const x = -0.3 + Math.min(lt, stopAt) * 0.017;
  const freeze = range(lt, stopAt - 4, stopAt + 4);
  const pose = lerpPose(tiptoePose(ph), P.freeze, freeze);
  const cam: Cam = { pos: [x + 0.4, 1.35, 3.3 - lt * 0.006], look: [x + 0.5, 1.15, -2.2], fov: 48 };
  return (
    <Stage
      cam={cam}
      {...STAGE}
      layers={[
        {
          key: "room",
          node: (
            <RoomScene t={t}>
              <WoodChair x={0} z={CHAIR_Z} />
              <CutRope x={0.05} z={CHAIR_Z + 0.3} seed={12} />
              <SideFigure
                x={x}
                z={-1.9}
                pose={pose}
                tip={0.35}
                shadow={0}
                e={freeze > 0.5 ? { eye: "wide", pupil: 0.5, brow: 0.8, mouth: "o", mouthOpen: 0.2, sweat: 0.6 } : { eye: "dot", brow: 0.3, mouth: "line" }}
              />
            </RoomScene>
          ),
        },
      ]}
    />
  );
};

/* --- DS: light under the door, the footsteps arrive --------------------------------- */
const feetAt = (t: number): [number, number][] => {
  const out: [number, number][] = [];
  const n = STEPS.filter((s) => t >= s).length;
  if (n >= 1) out.push([0.32 - Math.min(n, 4) * 0.06, 1]);
  if (n >= 2) out.push([0.05 - Math.min(n, 4) * 0.05, 1]);
  return out;
};

const ShotDoor: React.FC<{ t: number }> = ({ t }) => {
  const last = STEPS.filter((s) => t >= s).pop() ?? -100;
  const jolt = t - last < 6 ? (6 - (t - last)) * 0.004 : 0;
  const k = range(t, 1135, 1255);
  const cam: Cam = { pos: [DOOR_X - 0.3, 0.42 + jolt, ROOM.back + mix(2.0, 1.2, k)], look: [DOOR_X - 0.05, 0.3, ROOM.back], fov: 42, roll: -0.04 };
  return <Stage cam={cam} {...STAGE} layers={[{ key: "door", node: <RoomScene t={t} feet={feetAt(t)} /> }]} />;
};

/* --- E: extreme close-up of the eyes, the light dies ----------------------------------- */
const ShotEyes: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const dead = t >= STEPS[5] + 3;
  const sw = shake(t * 2, 0.008, 13);
  const cam: Cam = { pos: [sw[0], 1.37 + sw[1], CHAIR_Z + 1.05 - lt * 0.003], look: [0, 1.37, CHAIR_Z], fov: 30 };
  return (
    <>
      <Stage
        cam={cam}
        {...STAGE}
        layers={[
          {
            key: "face",
            node: (
              <LitScope lit>
                <ambientLight intensity={dead ? 0.0 : 0.6} color="#9fa7a0" />
                <pointLight position={[0.3, 2.2, CHAIR_Z + 1]} intensity={dead ? 0 : 6} distance={8} decay={1.6} color="#ffe1a8" />
                <mesh position={[0, 1.4, CHAIR_Z - 1.5]}>
                  <planeGeometry args={[6, 6]} />
                  <meshLambertMaterial color={C.concreteDark} />
                </mesh>
                <group position={[0, 1.38, CHAIR_Z]}>
                  <FrontHead e={{ eye: "wide", eyeScale: 1.25, pupil: mix(0.8, 0.3, range(lt, 10, 40)), brow: 1, browY: 0.02, mouth: "line", sweat: lin(lt, 0, 60) }} />
                </group>
              </LitScope>
            ),
          },
        ]}
      />
      {dead && <Black />}
    </>
  );
};

/* --- End card ----------------------------------------------------------------------------- */
const EndCard: React.FC<{ lt: number }> = ({ lt }) => {
  const a = interpolate(lt, [30, 60], [0, 1], clampE);
  const b = interpolate(lt, [75, 95], [0, 1], clampE);
  const out = interpolate(lt, [112, 130], [1, 0], clampE);
  return (
    <AbsoluteFill style={{ background: "#070504", justifyContent: "center", alignItems: "center", flexDirection: "column", opacity: out }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 190, color: "#efe4cc", opacity: a, letterSpacing: 6, transform: `scale(${1 + lt * 0.0008})` }}>
        ฝีเท้า
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 400, fontSize: 52, color: "#bfae8c", opacity: b, marginTop: 30, letterSpacing: 10 }}>
        — จบ —
      </div>
    </AbsoluteFill>
  );
};

export const Act2: React.FC = () => {
  const t = useCurrentFrame();
  let shot: React.ReactNode;
  if (t < 60) shot = <Black />;
  else if (t < 180) shot = <ShotWake t={t} lt={t - 60} />;
  else if (t < 340) shot = <ShotReveal t={t} lt={t - 180} />;
  else if (t < 450) shot = <ShotFace t={t} lt={t - 340} />;
  else if (t < 630) shot = <ShotPan t={t} lt={t - 450} />;
  else if (t < 720) shot = <ShotVertigo t={t} lt={t - 630} />;
  else if (t < 860) shot = <ShotRope t={t} lt={t - 720} />;
  else if (t < 980) shot = <ShotStand t={t} lt={t - 860} />;
  else if (t < 1130) shot = <ShotTiptoe t={t} lt={t - 980} />;
  else if (t < 1262) shot = <ShotDoor t={t} />;
  else if (t < 1330) shot = <ShotEyes t={t} lt={t - 1262} />;
  else shot = <EndCard lt={t - 1330} />;
  const room = t >= 60 && t < 1330;
  return (
    <AbsoluteFill style={{ background: "#070504" }}>
      <AbsoluteFill style={{ filter: room ? "saturate(0.8) contrast(1.12) sepia(0.12)" : undefined }}>{shot}</AbsoluteFill>
      {room && <Grade vignette={0.75} tint="rgba(150,170,120,0.18)" />}
    </AbsoluteFill>
  );
};

export { bulbState };
