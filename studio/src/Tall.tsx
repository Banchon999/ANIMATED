import React, { useId } from "react";

// Slender paper-doll figures for the night scene. 100 units = 1 m, origin at the feet.
const INK = "#1a1622";

const ClosedEye: React.FC<{ x: number; y: number; s: 1 | -1; c?: string }> = ({ x, y, s, c = INK }) => (
  <g stroke={c} strokeLinecap="round" fill="none">
    <path d={`M ${x - 2.6} ${y} Q ${x} ${y + 1.8} ${x + 2.6} ${y}`} strokeWidth={0.9} />
    <path d={`M ${x - s * 2.6} ${y + 0.2} l ${-s * 1.1} 1 M ${x - s * 1.4} ${y + 0.9} l ${-s * 0.7} 1.2 M ${x} ${y + 1.1} l 0 1.2`} strokeWidth={0.5} />
  </g>
);

/** Spirit: translucent, moon-blue, fades out toward the floor. open = 0..1 eyelids. */
export const Spirit: React.FC<{ t: number; open?: number; alpha?: number }> = ({ t, open = 0, alpha = 1 }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const sway = Math.sin(t * 1.1) * 1.2;
  const skin = "#a9c0ea";
  const eye = (x: number, s: 1 | -1) =>
    open < 0.15 ? (
      <ClosedEye x={x} y={-146} s={s} c="#2a3350" />
    ) : (
      <g>
        <ellipse cx={x} cy={-146.2} rx={2.7} ry={1.9 * open} fill="#eef3ff" stroke="#2a3350" strokeWidth={0.6} />
        <circle cx={x} cy={-146.2} r={Math.min(1.5, 1.8 * open)} fill="#10162e" />
        <circle cx={x + 0.5} cy={-146.8} r={0.4} fill="#fff" />
      </g>
    );
  return (
    <g opacity={alpha * 0.9} style={{ filter: "drop-shadow(0 0 7px rgba(120,165,255,0.6))" }}>
      <defs>
        <linearGradient id={`f${id}`} gradientUnits="userSpaceOnUse" x1={0} y1={-52} x2={0} y2={2}>
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x={-70} y={-180} width={140} height={190}>
          <rect x={-70} y={-180} width={140} height={190} fill={`url(#f${id})`} />
        </mask>
        <pattern id={`p${id}`} width={8} height={10} patternUnits="userSpaceOnUse">
          <rect width={8} height={10} fill="#3f62a6" />
          <rect y={0} width={8} height={1.6} fill="#9fb6da" opacity={0.75} />
          <circle cx={4} cy={5.6} r={1} fill="#c7d6ee" opacity={0.7} />
        </pattern>
      </defs>
      <g mask={`url(#m${id})`} transform={`translate(0 ${Math.sin(t * 0.9) * 1.6 - 3})`}>
        {/* long hair behind the body */}
        <path d={`M -12.5 -150 Q -13 -166 0 -166 Q 13 -166 12.5 -150 L ${15 + sway * 0.6} -78 Q 0 -72 ${-15 + sway * 0.6} -78 Z`} fill="#0f1a40" />
        {/* long skirt */}
        <path d={`M -14 -90 L 14 -90 Q 19 -40 ${17 + sway} -2 L ${-17 + sway} -2 Q -19 -40 -14 -90 Z`} fill={`url(#p${id})`} />
        {/* arms */}
        <path d="M -16 -126 Q -21 -100 -19 -72" stroke="#6f90d0" strokeWidth={6.5} strokeLinecap="round" fill="none" />
        <path d="M 16 -126 Q 21 -100 19 -72" stroke="#6f90d0" strokeWidth={6.5} strokeLinecap="round" fill="none" />
        <ellipse cx={-19} cy={-68} rx={3} ry={4.6} fill={skin} />
        <ellipse cx={19} cy={-68} rx={3} ry={4.6} fill={skin} />
        {/* blouse + shoulder cloth */}
        <path d="M -17 -128 Q -18 -131 -9 -133 L 9 -133 Q 18 -131 17 -128 L 14.5 -88 L -14.5 -88 Z" fill="#6f90d0" />
        <path d="M 6 -133 L 16 -129 L -6 -88 L -14.5 -88 L -13 -98 Z" fill="#a8c0ee" opacity={0.85} />
        <rect x={-3.2} y={-138} width={6.4} height={7} fill={skin} />
        {/* front locks */}
        <path d={`M -11 -140 Q -13 -120 ${-11 + sway * 0.3} -104 L -8 -106 Q -9 -122 -8.6 -138 Z`} fill="#0f1a40" />
        <path d={`M 11 -140 Q 13 -120 ${11 + sway * 0.3} -104 L 8 -106 Q 9 -122 8.6 -138 Z`} fill="#0f1a40" />
        {/* face */}
        <ellipse cx={0} cy={-147} rx={10.2} ry={12.6} fill={skin} />
        <path d="M 0 -162 Q -11 -161 -10.6 -146 L -10.8 -136 L -13.4 -136 L -13.4 -152 Q -13 -166.5 0 -166.5 Q 13 -166.5 13.4 -152 L 13.4 -136 L 10.8 -136 L 10.6 -146 Q 11 -161 0 -162 Z" fill="#0f1a40" />
        <path d="M -7.4 -150.6 Q -4.4 -152.2 -1.6 -150.8 M 1.6 -150.8 Q 4.4 -152.2 7.4 -150.6" stroke="#2a3350" strokeWidth={0.8} fill="none" strokeLinecap="round" />
        {eye(-4.4, -1)}
        {eye(4.4, 1)}
        <path d="M 0 -145 L -0.9 -141.2 L 0.7 -141" stroke="#8b9cc0" strokeWidth={0.7} fill="none" strokeLinecap="round" />
        <path d="M -2.6 -138 Q 0 -137 2.6 -138" stroke="#6d7ea6" strokeWidth={1.1} fill="none" strokeLinecap="round" />
        {/* flower in the hair */}
        <g transform="translate(9.5 -158)">
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={2 * Math.cos((a * Math.PI) / 180)} cy={2 * Math.sin((a * Math.PI) / 180)} r={1.5} fill="#eef3ff" />
          ))}
          <circle r={0.9} fill="#b6c6ea" />
        </g>
      </g>
    </g>
  );
};

/** Man sitting cross-legged with palms pressed together, lit warm from the candles. */
export const Kneeler: React.FC<{ t: number; warm?: number }> = ({ t, warm = 1 }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const br = Math.sin(t * 1.6) * 0.5;
  const skin = "#a97b58";
  return (
    <g>
      <defs>
        <pattern id={`k${id}`} width={6} height={6} patternUnits="userSpaceOnUse">
          <rect width={6} height={6} fill="#2f4a7a" />
          <rect width={3} height={3} fill="#e6dccb" />
          <rect x={3} y={3} width={3} height={3} fill="#e6dccb" />
        </pattern>
        <radialGradient id={`w${id}`} cx="0.75" cy="0.95" r="0.9">
          <stop offset="0" stopColor="#ffb866" stopOpacity={0.55 * warm} />
          <stop offset="1" stopColor="#ffb866" stopOpacity={0} />
        </radialGradient>
        <clipPath id={`c${id}`}>
          <path d="M -40 2 L -38 -24 L -20 -64 L -12 -92 L 12 -92 L 20 -64 L 38 -24 L 40 2 Z" />
        </clipPath>
      </defs>
      <path d="M -37 -5 Q -35 -22 -12 -24 L 12 -24 Q 35 -22 37 -5 Q 22 4 0 1.5 Q -22 4 -37 -5 Z" fill="#232a3f" />
      <path d="M -26 -6 Q -8 -16 12 -9 M 26 -6 Q 10 -14 -6 -10" stroke="#161b2b" strokeWidth={1.4} fill="none" />
      <g transform={`translate(0 ${br})`}>
        <path d="M -18 -62 Q -19 -66 -9 -68 L 9 -68 Q 19 -66 18 -62 L 17 -22 L -17 -22 Z" fill="#d8cdbb" />
        <path d="M 0 -68 L 0 -22" stroke="#a89c88" strokeWidth={1} />
        <path d="M -17 -64 L -8 -68 L 13 -22 L 3 -22 Z" fill={`url(#k${id})`} />
        {/* arms meeting at the chest */}
        <path d="M -17 -62 Q -25 -46 -19 -36 L -2 -48" stroke="#d8cdbb" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M 17 -62 Q 25 -46 19 -36 L 2 -48" stroke="#d8cdbb" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M -2.4 -44 Q -3.6 -54 0 -60 Q 3.6 -54 2.4 -44 Z" fill={skin} stroke="#7a573c" strokeWidth={0.5} />
        <path d="M 0 -59 L 0 -45" stroke="#7a573c" strokeWidth={0.5} />
        <rect x={-3.2} y={-73} width={6.4} height={6.5} fill={skin} />
        <ellipse cx={0} cy={-81} rx={10} ry={12} fill={skin} />
        <ellipse cx={-10} cy={-80} rx={1.8} ry={3} fill={skin} />
        <ellipse cx={10} cy={-80} rx={1.8} ry={3} fill={skin} />
        <path d="M -10.4 -83 Q -11.5 -95 0 -94.5 Q 11.5 -95 10.4 -83 Q 8 -89.5 0 -89.5 Q -8 -89.5 -10.4 -83 Z" fill="#17120f" />
        <path d="M -7.2 -84.6 Q -4.4 -85.8 -1.8 -84.6 M 1.8 -84.6 Q 4.4 -85.8 7.2 -84.6" stroke={INK} strokeWidth={1} fill="none" strokeLinecap="round" />
        <ClosedEye x={-4.3} y={-80.6} s={-1} />
        <ClosedEye x={4.3} y={-80.6} s={1} />
        <path d="M 0 -79.5 L -0.9 -75.6 L 0.8 -75.4" stroke="#7a573c" strokeWidth={0.7} fill="none" strokeLinecap="round" />
        <path d="M -2.4 -72.4 L 2.4 -72.4" stroke="#5c3c2a" strokeWidth={1} strokeLinecap="round" />
      </g>
      <g clipPath={`url(#c${id})`}>
        <rect x={-42} y={-96} width={84} height={100} fill={`url(#w${id})`} />
      </g>
    </g>
  );
};

/** Head of someone asleep on the pillow (origin = centre of the head). */
export const SleeperHead: React.FC<{ t: number }> = ({ t }) => {
  const skin = "#d9b49a";
  return (
    <g transform={`rotate(${84 + Math.sin(t * 1.2) * 0.6})`}>
      <path d="M -13 2 Q -19 -24 0 -26 Q 19 -24 13 2 Q 16 12 10 15 L 9 -2 Q 0 -12 -9 -2 L -10 15 Q -16 12 -13 2 Z" fill="#1b1512" />
      <ellipse cx={0} cy={0} rx={10.4} ry={12.8} fill={skin} />
      <path d="M 0 -13.5 Q -11 -13 -10.6 -1 Q -9 -9 0 -9.5 Q 9 -9 10.6 -1 Q 11 -13 0 -13.5 Z" fill="#1b1512" />
      <path d="M -7.2 -3.4 Q -4.4 -4.8 -1.8 -3.6 M 1.8 -3.6 Q 4.4 -4.8 7.2 -3.4" stroke={INK} strokeWidth={0.8} fill="none" strokeLinecap="round" />
      <ClosedEye x={-4.3} y={0.4} s={-1} />
      <ClosedEye x={4.3} y={0.4} s={1} />
      <ellipse cx={-6.2} cy={4.4} rx={2.6} ry={1.5} fill="#e08a86" opacity={0.45} />
      <ellipse cx={6.2} cy={4.4} rx={2.6} ry={1.5} fill="#e08a86" opacity={0.45} />
      <path d="M 0 1.6 L -0.9 5 L 0.8 5.2" stroke="#b08a70" strokeWidth={0.7} fill="none" strokeLinecap="round" />
      <path d="M -2.2 8.4 Q 0 9.3 2.2 8.4" stroke="#9c5a56" strokeWidth={1.1} fill="none" strokeLinecap="round" />
    </g>
  );
};
