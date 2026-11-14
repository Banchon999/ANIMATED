import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FrontBody, HERO, SideFigure, THUG } from "../chars/Person";
import { P, lerpPose, walkPose } from "../chars/rig";
import { C, F } from "../lib/draw";
import { kf, lin, range, shake } from "../lib/anim";
import { Black, Caption, Grade } from "../lib/Overlays";
import { capsule, circle, roundRect } from "../lib/shapes";
import { Cam, Layer, Stage } from "../lib/Stage";
import { City, SIDEWALK_Z, VAN_Z } from "../sets/City";
import { SpilledTea, TeaBag, VanFront, VanSide } from "../sets/Props";

export const ACT1_LEN = 700;

const STOP_T = 500;
const heroX = (t: number) => -7 + 0.03 * Math.min(t, STOP_T);
const SX = heroX(STOP_T) + 0.3;
const vanX = (t: number) => {
  if (t < 470) return SX - 18 - (470 - t) * 0.34;
  if (t < 528) {
    const u = (t - 470) / 58;
    return SX - 18 * (1 - u) * (1 - u);
  }
  if (t < 600) return SX;
  return SX + 0.5 * 0.012 * (t - 600) * (t - 600);
};
const FOG: [string, number, number] = ["#8f8d86", 30, 180];

const Note: React.FC<{ t: number; i: number; x: number }> = ({ t, i, x }) => {
  const k = ((t * 0.012 + i * 0.37) % 1 + 1) % 1;
  return (
    <group position={[x + 0.15 + k * 0.4 + Math.sin(k * 9 + i) * 0.06, 1.95 + k * 0.7, SIDEWALK_Z + 0.2]} scale={[0.7, 0.7, 1]}>
      <F g={circle(0.06)} c={C.ink} opacity={Math.sin(k * Math.PI)} />
      <F g={roundRect(0.02, 0.22, 0.01, 0.05, 0.1)} c={C.ink} opacity={Math.sin(k * Math.PI)} />
      <F g={roundRect(0.1, 0.03, 0.01, 0.09, 0.2)} c={C.ink} opacity={Math.sin(k * Math.PI)} rot={-0.4} />
    </group>
  );
};

const walkingHero = (t: number, e = {}) => (
  <SideFigure
    x={heroX(t)}
    z={SIDEWALK_Z}
    pose={walkPose(t * 0.21, 1)}
    e={{ mouth: "hum", ...e }}
    holdN={<TeaBag scale={1.1} />}
  />
);

const ShotCrane: React.FC<{ t: number }> = ({ t }) => {
  const x0 = -2.5;
  const c = kf(t, [
    [0, [x0, 18, 11, x0 + 4, 40, -120]],
    [40, [x0, 17, 11, x0 + 4, 38, -120]],
    [135, [x0, 1.7, 10.5, x0, 2.4, -2]],
    [150, [x0 + 0.2, 1.65, 10.2, x0 + 0.2, 2.35, -2]],
  ]);
  const cam: Cam = { pos: [c[0], c[1], c[2]], look: [c[3], c[4], c[5]], fov: 46 };
  return (
    <>
      <Stage cam={cam} bg="#2f3f4f" fog={FOG} layers={[{ key: "city", node: <><City />{walkingHero(t)}</> }]} />
      <Caption text="19:42 น. · ซอยเล็ก ๆ ย่านฝั่งธนฯ" start={70} out={140} top={1500} />
    </>
  );
};

const ShotTrack: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const hx = heroX(t);
  const sh = shake(t, 0.03, 2);
  const cam: Cam = { pos: [hx + 0.15 + sh[0], 1.3 + sh[1], 5.6], look: [hx + 0.15, 1.7, SIDEWALK_Z], fov: 46 };
  const layers: Layer[] = [
    {
      key: "world",
      node: (
        <>
          <City />
          {walkingHero(t, { eye: lt % 70 > 50 ? "closed" : "dot" })}
          {[0, 1, 2].map((i) => (
            <Note key={i} t={t} i={i} x={hx} />
          ))}
        </>
      ),
    },
    {
      key: "fg",
      blur: 10,
      node: (
        <>
          {/* foreground: posts and a parked motorbike on the road edge sliding past */}
          {[-3, 3.5, 10, 16.5].map((x) => (
            <group key={x} position={[x, 0, 2.6]}>
              <F g={roundRect(0.22, 4, 0.08, 0, 2)} c="#4b4a44" />
              <F g={roundRect(0.6, 0.2, 0.08, 0, 1.2)} c="#c4553f" pos={[0, 0, 0.01]} />
            </group>
          ))}
          <group position={[6.5, 0, 2.2]}>
            <F g={circle(0.32)} c="#2b2926" pos={[-0.55, 0.32, 0]} />
            <F g={circle(0.32)} c="#2b2926" pos={[0.6, 0.32, 0]} />
            <F g={roundRect(1.5, 0.45, 0.2, 0, 0.75)} c="#a8443a" pos={[0, 0, 0.01]} />
          </group>
        </>
      ),
    },
  ];
  return <Stage cam={cam} bg="#2f3f4f" fog={FOG} layers={layers} />;
};

const ShotRack: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const hx = heroX(t);
  const pull = range(lt, 52, 74);
  const lights = lt > 92 ? 1 : 0;
  const vx = hx - 24 + lt * 0.08;
  const bob = Math.abs(Math.sin(t * 0.21)) * 0.03;
  const sh = shake(t, 0.025, 4);
  const cam: Cam = { pos: [hx + 3.2 + sh[0], 1.5 + sh[1], SIDEWALK_Z + 0.4], look: [hx - 8, 1.25, SIDEWALK_Z + 0.4], fov: 50 };
  const layers: Layer[] = [
    {
      key: "bg",
      blur: 9 * (1 - pull),
      node: (
        <>
          <City />
          <group position={[vx, 0, VAN_Z]} rotation={[0, Math.PI / 2, 0]}>
            <VanFront x={0} z={0} lights={lights} flare={1.6} />
          </group>
        </>
      ),
    },
    {
      key: "hero",
      blur: 11 * pull,
      node: (
        <group position={[hx, 0.42 + bob, SIDEWALK_Z]} rotation={[0, Math.PI / 2, 0]}>
          <FrontBody
            e={{ mouth: "hum", eye: lt % 60 > 44 ? "closed" : "dot", lookX: 0.3 }}
            headTilt={Math.sin(t * 0.105) * 0.06}
          />
          <group position={[0.31, 0.02, 0.06]}>
            <TeaBag scale={1.1} />
          </group>
        </group>
      ),
    },
  ];
  return <Stage cam={cam} bg="#2f3f4f" fog={FOG} layers={layers} />;
};

const ShotTires: React.FC<{ t: number }> = ({ t }) => {
  const vx = vanX(t + 48);
  const brake = t > 495 ? 1 : 0;
  const cam: Cam = { pos: [SX + 2.6, 0.3, VAN_Z + 1.9], look: [SX + 1.3, 0.5, VAN_Z], fov: 44, roll: -0.07 };
  return (
    <Stage
      cam={cam}
      bg="#2f3f4f"
      fog={FOG}
      layers={[
        { key: "bg", blur: 5, node: <City /> },
        { key: "van", node: <VanSide x={vx} z={VAN_Z} spin={vx / 0.4} lights={1} brake={brake} /> },
      ]}
    />
  );
};

const ShotWide: React.FC<{ t: number }> = ({ t }) => {
  const vx = vanX(t);
  const rock = t > 548 && t < 592 ? Math.sin(t * 1.3) * 0.012 + Math.sin(t * 0.47) * 0.008 : 0;
  const slam = t >= 590 && t < 600 ? Math.sin((t - 590) * 2.5) * 0.06 * (1 - (t - 590) / 10) : 0;
  const hidden = t > 532;
  const startled = range(t, STOP_T - 6, STOP_T + 6);
  const hx = heroX(t);
  const cam: Cam = { pos: [SX - 0.3, 1.75 + slam, 13.5], look: [SX - 0.3, 1.9, -1.0], fov: 40 };
  return (
    <Stage
      cam={cam}
      bg="#2f3f4f"
      fog={FOG}
      layers={[
        {
          key: "world",
          node: (
            <>
              <City />
              {!hidden && (
                <SideFigure
                  x={hx}
                  z={SIDEWALK_Z}
                  pose={lerpPose(walkPose(Math.min(t, STOP_T) * 0.21, 1), P.startled, startled)}
                  e={startled > 0.5 ? { eye: "wide", pupil: 0.6, mouth: "o", brow: 0.6 } : { mouth: "hum" }}
                  holdN={startled < 0.5 ? <TeaBag scale={1.1} /> : undefined}
                />
              )}
              {t > 600 && (
                <group position={[SX, 0, SIDEWALK_Z + 0.4]}>
                  <SpilledTea spread={lin(t, 600, 680)} />
                </group>
              )}
              <VanSide x={vx} z={VAN_Z - 1.4} spin={vx / 0.4} rock={rock + slam * 0.2} lights={1} brake={t > 500 && t < 600 ? 1 : 0} shadows={range(t, 545, 556) * (1 - range(t, 584, 592))} f={t} />
            </>
          ),
        },
      ]}
    />
  );
};

// inserted close-up: a gloved hand grabs his shoulder
const ShotGrab: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const hx = heroX(t);
  const sh = shake(t * 3, 0.06, 8);
  const reach = range(lt, 2, 9);
  const yank = range(lt, 13, 19);
  const cam: Cam = { pos: [hx + sh[0], 1.3 + sh[1], SIDEWALK_Z + 2.4], look: [hx, 1.32, SIDEWALK_Z], fov: 40, roll: 0.08 + sh[2] };
  return (
    <Stage
      cam={cam}
      bg="#2f3f4f"
      fog={FOG}
      layers={[
        { key: "bg", blur: 8, node: <City /> },
        {
          key: "hero",
          node: (
            <group position={[hx + yank * 1.6, 0.42 - yank * 0.1, SIDEWALK_Z]} rotation={[0, 0, -yank * 0.25]}>
              <FrontBody e={{ eye: "wide", eyeScale: 1.25, pupil: 0.45, mouth: "open", mouthOpen: 0.9, brow: 0.8, browY: 0.03, sweat: 0.4 }} />
              {/* the hand */}
              <group position={[0.9 - reach * 0.62, 0.62, 0.15]} rotation={[0, 0, Math.PI / 2 + 0.2]}>
                <F g={capsule(0.07, 1.4)} outline={capsule(0.07 + 0.03, 1.4)} c={THUG.skin} pos={[0, 0, 0]} />
                <F g={roundRect(0.26, 0.24, 0.09)} outline={roundRect(0.26 + 0.06, 0.24 + 0.06, 0.11)} c={THUG.skin} pos={[0, 0.02, 0.01]} />
                {[-0.09, -0.03, 0.03, 0.09].map((fx, i) => (
                  <F key={i} g={capsule(0.035, 0.16 + (i === 1 || i === 2 ? 0.04 : 0))} outline={capsule(0.035 + 0.03, 0.16 + (i === 1 || i === 2 ? 0.04 : 0))} c={THUG.skin} pos={[fx, -0.08, 0.012]} rot={(fx) * 1.5} />
                ))}
              </group>
            </group>
          ),
        },
      ]}
    />
  );
};

const ShotSpill: React.FC<{ t: number; lt: number }> = ({ t, lt }) => {
  const vx = vanX(t);
  const cam: Cam = { pos: [SX - 1.5, 0.5, SIDEWALK_Z + 0.75], look: [SX + 0.4, 0.0, SIDEWALK_Z + 0.45], fov: 42 };
  const fade = interpolate(lt, [42, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <>
      <Stage
        cam={cam}
        bg="#2f3f4f"
        fog={FOG}
        layers={[
          { key: "bg", blur: 7, node: <><City /><VanSide x={vx} z={VAN_Z} spin={vx / 0.4} lights={1} brake={Math.sin(lt * 0.4) > 0 ? 1 : 0.6} /></> },
          {
            key: "tea",
            node: (
              <group position={[SX, 0, SIDEWALK_Z + 0.4]}>
                <SpilledTea spread={lin(t, 600, 700)} />
              </group>
            ),
          },
        ]}
      />
      <Black opacity={fade} />
    </>
  );
};

export const Act1: React.FC = () => {
  const t = useCurrentFrame();
  let shot: React.ReactNode;
  if (t < 150) shot = <ShotCrane t={t} />;
  else if (t < 300) shot = <ShotTrack t={t} lt={t - 150} />;
  else if (t < 420) shot = <ShotRack t={t} lt={t - 300} />;
  else if (t < 480) shot = <ShotTires t={t} />;
  else if (t < 528) shot = <ShotWide t={t} />;
  else if (t < 548) shot = <ShotGrab t={t} lt={t - 528} />;
  else if (t < 640) shot = <ShotWide t={t} />;
  else shot = <ShotSpill t={t} lt={t - 640} />;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ filter: "saturate(0.9) contrast(1.1)" }}>{shot}</AbsoluteFill>
      <Grade tint="rgba(255,190,120,0.12)" vignette={0.55} />
    </AbsoluteFill>
  );
};

export { HERO };
