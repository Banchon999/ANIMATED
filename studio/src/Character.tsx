import React, { useId } from "react";
import { rad } from "./lib";

// 100 SVG units = 1 world unit. Origin = point on the ground between the feet.

// ---------------- outfits ----------------
export type Outfit = {
  skin: string;
  hair: string;
  hairStyle: "bun" | "bob" | "pony";
  shirt: string;
  pattern: "plain" | "stripes" | "dots" | "flower";
  patternColor: string;
  bottom: "pants" | "shorts" | "skirt";
  bottomColor: string;
  shoe: string;
  hat: "none" | "straw" | "cap" | "band";
  hatColor: string;
  accessory: "none" | "bag" | "scarf";
  accColor: string;
};

const BASE = { skin: "#eab98f", hair: "#2a2220", hairStyle: "bun" as const };
export const OUTFITS: Outfit[] = [
  { ...BASE, shirt: "#e4573f", pattern: "stripes", patternColor: "#fff1dc", bottom: "pants", bottomColor: "#33507c", shoe: "#2b2b2b", hat: "none", hatColor: "", accessory: "none", accColor: "" },
  { ...BASE, shirt: "#f3c044", pattern: "dots", patternColor: "#ffffff", bottom: "skirt", bottomColor: "#7b4fa3", shoe: "#8a4b2a", hat: "straw", hatColor: "#e6c77e", accessory: "bag", accColor: "#b5653a" },
  { ...BASE, shirt: "#3aa57c", pattern: "flower", patternColor: "#ffe07a", bottom: "shorts", bottomColor: "#f2e4c6", shoe: "#d94f70", hat: "cap", hatColor: "#d94f70", accessory: "none", accColor: "" },
  { ...BASE, shirt: "#5b8cf0", pattern: "plain", patternColor: "", bottom: "pants", bottomColor: "#4a4038", shoe: "#f4f4f4", hat: "band", hatColor: "#ff7aa8", accessory: "scarf", accColor: "#ffd15c" },
];

// ---------------- gaits ----------------
export type Gait = {
  A: number; // thigh swing (deg)
  cadence: number; // walk cycles per second
  K: number; // extra knee bend on the swing leg
  k0: number; // base knee bend (crouch)
  lean: number; // torso lean forward
  armSwing: number;
  armBase: number;
  elbow: number;
  headTilt: number;
};
export const GAITS = {
  stroll: { A: 24, cadence: 0.95, K: 38, k0: 4, lean: 3, armSwing: 24, armBase: 0, elbow: 14, headTilt: 0 },
  hurry: { A: 44, cadence: 2.0, K: 80, k0: 12, lean: 17, armSwing: 58, armBase: 8, elbow: 88, headTilt: 4 },
  sneak: { A: 30, cadence: 0.62, K: 92, k0: 30, lean: 15, armSwing: 7, armBase: 62, elbow: 98, headTilt: -14 },
  tired: { A: 11, cadence: 0.55, K: 16, k0: 9, lean: 25, armSwing: 4, armBase: 24, elbow: 3, headTilt: 20 },
} satisfies Record<string, Gait>;
const L1 = 25;
const L2 = 25;
/** World units per second that keeps the planted foot from sliding. */
export const gaitSpeed = (g: Gait) => ((4 * (L1 + L2)) / 100) * Math.sin(rad(g.A)) * g.cadence;

// ---------------- emotions ----------------
type Eyes = "open" | "wide" | "happy" | "closed" | "half" | "cry";
type Mouth = "smile" | "grin" | "o" | "frown" | "grit" | "smirk" | "wail" | "flat";
export type Emotion = {
  eyes: Eyes;
  mouth: Mouth;
  brow: number; // + angry, - sad
  browY: number;
  blush?: number;
  sweat?: boolean;
  anger?: boolean;
  tears?: boolean;
  shock?: boolean;
  sparkle?: boolean;
};
export const EMOTIONS = {
  neutral: { eyes: "open", mouth: "smile", brow: 0, browY: 0 },
  happy: { eyes: "happy", mouth: "grin", brow: -4, browY: -3, blush: 0.55 },
  shocked: { eyes: "wide", mouth: "o", brow: -6, browY: -8, shock: true },
  angry: { eyes: "open", mouth: "grit", brow: 26, browY: 3, anger: true },
  crying: { eyes: "cry", mouth: "wail", brow: -22, browY: -1, tears: true },
  smug: { eyes: "half", mouth: "smirk", brow: 10, browY: -1, sparkle: true },
  tired: { eyes: "half", mouth: "flat", brow: -14, browY: 1, sweat: true },
  shy: { eyes: "closed", mouth: "smile", brow: -8, browY: -1, blush: 1 },
} satisfies Record<string, Emotion>;
export type EmotionName = keyof typeof EMOTIONS;

const INK = "#2a2220";

const Face: React.FC<{ e: Emotion; off: number; blink: boolean; t: number }> = ({ e, off, blink, t }) => {
  const eye = (s: -1 | 1) => {
    const x = s * 10.5 + off;
    const y = -1;
    const kind: Eyes = blink && (e.eyes === "open" || e.eyes === "half") ? "closed" : e.eyes;
    const brow = (
      <line
        x1={-7.5}
        x2={7.5}
        y1={0}
        y2={0}
        stroke={INK}
        strokeWidth={3.2}
        strokeLinecap="round"
        transform={`translate(${x} ${y - 13 + e.browY}) rotate(${-s * e.brow})`}
      />
    );
    let body: React.ReactNode;
    if (kind === "open" || kind === "half") {
      body = (
        <>
          <ellipse cx={x} cy={y} rx={5.6} ry={7} fill="#fff" />
          <circle cx={x + off * 0.25} cy={y + 0.6} r={3.3} fill={INK} />
          <circle cx={x + off * 0.25 + 1.2} cy={y - 0.9} r={1.1} fill="#fff" />
          {kind === "half" && (
            <>
              <rect x={x - 7} y={y - 8} width={14} height={7.2} fill="currentColor" />
              <line x1={x - 6.4} x2={x + 6.4} y1={y - 0.8} y2={y - 0.8} stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
            </>
          )}
        </>
      );
    } else if (kind === "wide") {
      body = (
        <>
          <ellipse cx={x} cy={y - 1} rx={7.6} ry={9.4} fill="#fff" stroke={INK} strokeWidth={1.2} />
          <circle cx={x} cy={y - 1} r={2.1} fill={INK} />
        </>
      );
    } else if (kind === "happy") {
      body = <path d={`M ${x - 6} ${y + 2} Q ${x} ${y - 8} ${x + 6} ${y + 2}`} fill="none" stroke={INK} strokeWidth={3.2} strokeLinecap="round" />;
    } else if (kind === "closed") {
      body = <path d={`M ${x - 6} ${y - 1} Q ${x} ${y + 5} ${x + 6} ${y - 1}`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />;
    } else {
      // cry: squeezed shut
      body = (
        <path
          d={`M ${x - s * 6} ${y - 4} L ${x + s * 4} ${y} L ${x - s * 6} ${y + 4}`}
          fill="none"
          stroke={INK}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    return (
      <g key={s}>
        {body}
        {brow}
        {e.tears && (
          <path
            d={`M ${x - 3} ${y + 5} q ${s * 2} ${10 + 3 * Math.sin(t * 9)} 0 21 q -1 4 3 4 q 4 0 3 -4 q -2 -11 0 -21 z`}
            fill="#7cc6ee"
            opacity={0.9}
          />
        )}
      </g>
    );
  };
  const mx = off * 1.15;
  const my = 13;
  const mouths: Record<Mouth, React.ReactNode> = {
    smile: <path d={`M ${mx - 6} ${my} Q ${mx} ${my + 6} ${mx + 6} ${my}`} fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />,
    grin: (
      <g>
        <path d={`M ${mx - 10} ${my - 2} Q ${mx} ${my + 15} ${mx + 10} ${my - 2} Z`} fill="#7a2e2a" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <path d={`M ${mx - 8.5} ${my - 1} L ${mx + 8.5} ${my - 1} L ${mx + 7} ${my + 2.4} L ${mx - 7} ${my + 2.4} Z`} fill="#fff" />
      </g>
    ),
    o: <ellipse cx={mx} cy={my + 3} rx={5} ry={7.5} fill="#5a2320" stroke={INK} strokeWidth={2} />,
    frown: <path d={`M ${mx - 6} ${my + 4} Q ${mx} ${my - 3} ${mx + 6} ${my + 4}`} fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />,
    grit: (
      <g>
        <rect x={mx - 10} y={my - 2} width={20} height={9} rx={3.5} fill="#fff" stroke={INK} strokeWidth={2.2} />
        <path d={`M ${mx - 10} ${my + 2.5} H ${mx + 10} M ${mx - 3.5} ${my - 2} V ${my + 7} M ${mx + 3.5} ${my - 2} V ${my + 7}`} stroke={INK} strokeWidth={1.5} />
      </g>
    ),
    smirk: <path d={`M ${mx - 7} ${my + 2} Q ${mx + 1} ${my + 5} ${mx + 9} ${my - 4}`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />,
    wail: (
      <g>
        <path d={`M ${mx - 11} ${my + 10} Q ${mx} ${my - 12} ${mx + 11} ${my + 10} Z`} fill="#6a2622" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        <ellipse cx={mx} cy={my + 8} rx={5} ry={2.6} fill="#e57f86" />
      </g>
    ),
    flat: <path d={`M ${mx - 6} ${my + 2} q 3 2 6 0 t 6 0`} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />,
  };
  return (
    <g>
      {e.blush ? (
        <>
          <ellipse cx={-17 + off} cy={8} rx={6.5} ry={4} fill="#f2707a" opacity={0.45 * e.blush} />
          <ellipse cx={17 + off} cy={8} rx={6.5} ry={4} fill="#f2707a" opacity={0.45 * e.blush} />
        </>
      ) : null}
      {eye(-1)}
      {eye(1)}
      {mouths[e.mouth]}
      {e.sweat && (
        <path
          transform={`translate(${24} ${-12 + ((t * 26) % 14)})`}
          d="M 0 -7 Q 6 2 0 5 Q -6 2 0 -7 Z"
          fill="#8fd0f2"
          stroke="#4a9ccc"
          strokeWidth={1}
        />
      )}
      {e.anger && (
        <g transform={`translate(22 -25) scale(${1 + 0.12 * Math.sin(t * 22)})`} stroke="#e23b3b" strokeWidth={3.2} strokeLinecap="round" fill="none">
          <path d="M -6 -2 Q -2 -2 -2 -6 M 2 -6 Q 2 -2 6 -2 M 6 2 Q 2 2 2 6 M -2 6 Q -2 2 -6 2" />
        </g>
      )}
      {e.shock && (
        <g stroke={INK} strokeWidth={3} strokeLinecap="round">
          <line x1={-30} y1={-30} x2={-37} y2={-39} />
          <line x1={0} y1={-36} x2={0} y2={-48} />
          <line x1={30} y1={-30} x2={37} y2={-39} />
        </g>
      )}
      {e.sparkle && (
        <path
          transform={`translate(27 -18) scale(${0.8 + 0.3 * Math.abs(Math.sin(t * 7))})`}
          d="M 0 -9 Q 1 -1 9 0 Q 1 1 0 9 Q -1 1 -9 0 Q -1 -1 0 -9 Z"
          fill="#ffd84a"
          stroke="#e0a800"
          strokeWidth={0.8}
        />
      )}
    </g>
  );
};

// ---------------- phone prop ----------------
export const PHONE_W = 26;
export const PHONE_H = 50;
const Phone: React.FC<{ children?: React.ReactNode; id: string }> = ({ children, id }) => (
  <g>
    <rect x={-PHONE_W / 2} y={-PHONE_H / 2} width={PHONE_W} height={PHONE_H} rx={4} fill="#1c1c22" />
    <clipPath id={id}>
      <rect x={-PHONE_W / 2 + 1.5} y={-PHONE_H / 2 + 1.5} width={PHONE_W - 3} height={PHONE_H - 3} rx={2.8} />
    </clipPath>
    <g clipPath={`url(#${id})`}>
      {/* children are designed on a 230 x 470 canvas */}
      <g transform={`translate(${-PHONE_W / 2 + 1.5} ${-PHONE_H / 2 + 1.5}) scale(0.1)`}>{children}</g>
    </g>
  </g>
);

// Where the phone sits in the back view, relative to the feet (SVG units).
const HIP_IDLE = L1 + L2 + 6;
export const PHONE_ANCHOR = { x: 46, y: -(HIP_IDLE + 76) };

// ---------------- the rig ----------------
export type CharacterProps = {
  t: number; // seconds, drives walk phase and small loops
  outfit: Outfit;
  emotion?: EmotionName;
  gait?: Gait | null;
  view?: "side" | "front" | "back";
  blink?: boolean;
  phone?: React.ReactNode; // back view: content of the phone screen
};

export const Character: React.FC<CharacterProps> = ({ t, outfit: o, emotion = "neutral", gait = null, view = "side", blink = false, phone }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const side = view === "side";
  const phi = gait ? 2 * Math.PI * gait.cadence * t : 0;

  const leg = (ph: number, hx: number) => {
    const th = gait ? rad(gait.A * Math.sin(ph)) : 0;
    const k = gait ? rad(gait.k0 + gait.K * Math.max(0, Math.cos(ph))) : 0;
    const knee = { x: hx + L1 * Math.sin(th), y: L1 * Math.cos(th) };
    const ankle = { x: knee.x + L2 * Math.sin(th - k), y: knee.y + L2 * Math.cos(th - k) };
    return { hip: { x: hx, y: 0 }, knee, ankle };
  };
  const legB = leg(phi + Math.PI, side ? -3 : -9);
  const legF = leg(phi, side ? 3 : 9);
  const hipH = Math.max(legB.ankle.y, legF.ankle.y) + 6;
  const breathe = gait ? 0 : Math.sin(t * 2.4) * 0.8;

  const arm = (sx: number, alphaDeg: number, elbowDeg: number) => {
    const a = rad(alphaDeg);
    const b = rad(alphaDeg + elbowDeg);
    const sh = { x: sx, y: -50 };
    const el = { x: sx + 21 * Math.sin(a), y: -50 + 21 * Math.cos(a) };
    const hand = { x: el.x + 21 * Math.sin(b), y: el.y + 21 * Math.cos(b) };
    return { sh, el, hand };
  };
  let armB = arm(-5, 0, 0);
  let armF = arm(5, 0, 0);
  if (side && gait) {
    armB = arm(-5, gait.armBase + gait.armSwing * Math.sin(phi), gait.elbow);
    armF = arm(5, gait.armBase - gait.armSwing * Math.sin(phi), gait.elbow);
  } else if (!side) {
    armB = arm(-21, -7, -4);
    armF = view === "back" && phone !== undefined ? arm(21, 38, 128) : arm(21, 7, 4);
  }

  const legColor = o.bottom === "pants" ? o.bottomColor : o.skin;
  const drawLeg = (l: ReturnType<typeof leg>, dark: boolean) => (
    <g style={dark ? { filter: "brightness(0.82)" } : undefined}>
      <path
        d={`M ${l.hip.x} ${l.hip.y} L ${l.knee.x} ${l.knee.y} L ${l.ankle.x} ${l.ankle.y}`}
        fill="none"
        stroke={legColor}
        strokeWidth={13}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {o.bottom === "shorts" && (
        <path
          d={`M ${l.hip.x} ${l.hip.y} L ${(l.hip.x + l.knee.x) / 2} ${(l.hip.y + l.knee.y) / 2}`}
          stroke={o.bottomColor}
          strokeWidth={16}
          strokeLinecap="round"
        />
      )}
      <ellipse cx={l.ankle.x + (side ? 4 : 0)} cy={l.ankle.y + 2} rx={side ? 9.5 : 7.5} ry={5} fill={o.shoe} />
    </g>
  );
  const drawArm = (a: ReturnType<typeof arm>, dark: boolean) => (
    <g style={dark ? { filter: "brightness(0.82)" } : undefined}>
      <path d={`M ${a.sh.x} ${a.sh.y} L ${a.el.x} ${a.el.y} L ${a.hand.x} ${a.hand.y}`} fill="none" stroke={o.skin} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M ${a.sh.x} ${a.sh.y} L ${(a.sh.x + a.el.x) / 2} ${(a.sh.y + a.el.y) / 2}`} stroke={o.shirt} strokeWidth={13} strokeLinecap="round" />
      <circle cx={a.hand.x} cy={a.hand.y} r={6.2} fill={o.skin} />
    </g>
  );

  const torsoPath = "M -20 -56 Q -20 -60 -14 -60 L 14 -60 Q 20 -60 20 -56 L 21 -4 Q 21 4 12 4 L -12 4 Q -21 4 -21 -4 Z";
  const pattern = () => {
    if (o.pattern === "stripes")
      return [-50, -38, -26, -14, -2].map((y) => <rect key={y} x={-24} y={y} width={48} height={5} fill={o.patternColor} />);
    if (o.pattern === "dots")
      return Array.from({ length: 20 }).map((_, i) => (
        <circle key={i} cx={-16 + (i % 4) * 11 + (Math.floor(i / 4) % 2) * 5} cy={-52 + Math.floor(i / 4) * 12} r={2.6} fill={o.patternColor} />
      ));
    if (o.pattern === "flower")
      return [[-9, -44], [9, -30], [-8, -15], [10, -6], [11, -52]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={3.4 * Math.cos(rad(a))} cy={3.4 * Math.sin(rad(a))} r={2.5} fill={o.patternColor} />
          ))}
          <circle r={1.8} fill="#e8663f" />
        </g>
      ));
    return null;
  };

  const off = side ? 6 : 0;
  const e = EMOTIONS[emotion] as Emotion;
  const headTilt = side && gait ? gait.headTilt : 0;
  const lean = side && gait ? gait.lean : 0;
  const back = view === "back";

  const hairBack = (
    <g fill={o.hair}>
      {o.hairStyle === "bun" && <circle cx={side ? -12 : 0} cy={-31} r={11} />}
      {o.hairStyle === "pony" && <path d="M -20 -10 Q -42 0 -34 30 Q -24 14 -16 6 Z" />}
      {o.hairStyle === "bob" && <rect x={-29} y={-12} width={58} height={34} rx={12} />}
    </g>
  );
  const hairFront = back ? (
    <circle r={27.5} fill={o.hair} />
  ) : (
    <path
      d={
        side
          ? "M -27.5 4 Q -31 -30 0 -29 Q 27 -29 27.5 -8 Q 14 -20 -6 -14 Q -18 -10 -20 6 Z"
          : "M -27.5 2 Q -30 -30 0 -29 Q 30 -30 27.5 2 Q 24 -14 6 -15 Q -4 -22 -14 -13 Q -24 -12 -27.5 2 Z"
      }
      fill={o.hair}
    />
  );
  const hat = () => {
    if (o.hat === "straw")
      return (
        <g>
          <ellipse cx={0} cy={-19} rx={43} ry={9.5} fill={o.hatColor} stroke="#b9963f" strokeWidth={1.5} />
          <path d="M -21 -20 Q -20 -44 0 -44 Q 20 -44 21 -20 Z" fill={o.hatColor} stroke="#b9963f" strokeWidth={1.5} />
          <path d="M -21 -23 Q 0 -17 21 -23 L 21 -19 Q 0 -13 -21 -19 Z" fill="#c0503c" />
        </g>
      );
    if (o.hat === "cap")
      return (
        <g>
          <path d="M -27 -12 Q -27 -38 0 -38 Q 27 -38 27 -12 Z" fill={o.hatColor} />
          {!back && <path d={side ? "M 10 -15 Q 36 -17 44 -8 Q 30 -9 12 -9 Z" : "M -18 -14 Q 0 -4 18 -14 Q 10 -19 0 -19 Q -10 -19 -18 -14 Z"} fill={o.hatColor} style={{ filter: "brightness(0.8)" }} />}
          <circle cx={0} cy={-38} r={2.6} fill="#fff" />
        </g>
      );
    if (o.hat === "band")
      return (
        <g>
          <path d="M -27 -11 Q 0 -22 27 -11 L 26 -4 Q 0 -15 -26 -4 Z" fill={o.hatColor} />
          {!side && <circle cx={back ? 0 : 18} cy={-14} r={5} fill={o.hatColor} stroke="#fff" strokeWidth={1.5} />}
        </g>
      );
    return null;
  };

  const phoneNode =
    back && phone !== undefined ? (
      <g transform={`translate(${PHONE_ANCHOR.x} ${PHONE_ANCHOR.y + hipH}) rotate(4)`}>
        <Phone id={`ph${uid}`}>{phone}</Phone>
      </g>
    ) : null;

  return (
    <g transform={`translate(0 ${-hipH})`} color={o.skin}>
      {/* legs (in hip space) */}
      {side ? drawLeg(legB, true) : drawLeg(legB, false)}
      {drawLeg(legF, false)}
      {o.bottom === "skirt" && <path d="M -20 -4 L 20 -4 L 27 27 Q 0 33 -27 27 Z" fill={o.bottomColor} />}
      {o.bottom === "skirt" && <path d="M -26 22 Q 0 28 26 22 L 27 27 Q 0 33 -27 27 Z" fill="#fff" opacity={0.35} />}

      {/* upper body leans about the hip */}
      <g transform={`rotate(${lean}) scale(1 ${1 + breathe * 0.004})`}>
        {side ? drawArm(armB, true) : null}
        {!side && drawArm(armB, false)}
        {!side && !(back && phone !== undefined) && drawArm(armF, false)}
        {o.accessory === "bag" && <rect x={side ? -22 : 12} y={-18} width={18} height={20} rx={4} fill={o.accColor} />}
        <clipPath id={`t${uid}`}>
          <path d={torsoPath} />
        </clipPath>
        <path d={torsoPath} fill={o.shirt} />
        <g clipPath={`url(#t${uid})`}>{pattern()}</g>
        {o.bottom !== "skirt" && <path d="M -21 -6 L 21 -6 L 21 -2 Q 21 5 12 5 L -12 5 Q -21 5 -21 -2 Z" fill={o.bottomColor} />}
        {o.accessory === "bag" && <path d={side ? "M 12 -60 L -14 -6" : "M -14 -60 L 20 -8"} stroke={o.accColor} strokeWidth={4} strokeLinecap="round" />}
        {o.accessory === "scarf" && (
          <g fill={o.accColor}>
            <rect x={-19} y={-63} width={38} height={10} rx={5} />
            <path d={side ? "M -12 -56 L -24 -30 L -15 -28 L -6 -54 Z" : "M 6 -56 L 4 -30 L 13 -30 L 14 -56 Z"} />
          </g>
        )}

        {/* head */}
        <g transform={`translate(${side ? 2 : 0} -82) rotate(${headTilt})`}>
          {hairBack}
          <circle r={27} fill={o.skin} />
          {!side && (
            <>
              <circle cx={-27} cy={2} r={5} fill={o.skin} />
              <circle cx={27} cy={2} r={5} fill={o.skin} />
            </>
          )}
          {side && <circle cx={-16} cy={3} r={5} fill={o.skin} style={{ filter: "brightness(0.93)" }} />}
          {!back && <Face e={e} off={off} blink={blink} t={t} />}
          {hairFront}
          {hat()}
        </g>

        {side && drawArm(armF, false)}
        {back && phone !== undefined && (
          <>
            {phoneNode}
            {drawArm(armF, false)}
          </>
        )}
      </g>
    </g>
  );
};
