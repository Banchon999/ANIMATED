import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export const FONT = "Kanit, sans-serif";

// film grain + vignette, warm like the reference's soft paper look
export const Grade: React.FC<{ grain?: number; vignette?: number; tint?: string }> = ({
  grain = 0.14,
  vignette = 0.6,
  tint,
}) => {
  const frame = useCurrentFrame();
  const seed = frame % 9;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {tint && <AbsoluteFill style={{ background: tint, mixBlendMode: "soft-light" }} />}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 45%, rgba(18,12,6,${vignette}) 100%)`,
        }}
      />
      <svg width="100%" height="100%" style={{ position: "absolute", opacity: grain, mixBlendMode: "overlay" }}>
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed * 7 + 1} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

// POV eyelids: open = 0 closed .. 1 fully open
export const Eyelids: React.FC<{ open: number }> = ({ open }) => {
  const h = (1 - open) * 1000;
  const lid = (top: boolean): React.CSSProperties => ({
    position: "absolute",
    left: -200,
    right: -200,
    height: 1100,
    background: "#0b0806",
    [top ? "top" : "bottom"]: -1100 + h,
    borderRadius: top ? "0 0 50% 50% / 0 0 260px 260px" : "50% 50% 0 0 / 260px 260px 0 0",
    boxShadow: "0 0 120px 80px rgba(11,8,6,0.9)",
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={lid(true)} />
      <div style={lid(false)} />
    </AbsoluteFill>
  );
};

// typewriter caption (time / place slug)
export const Caption: React.FC<{ text: string; start: number; cps?: number; out?: number; top?: number }> = ({
  text,
  start,
  cps = 0.6,
  out = 9999,
  top = 1560,
}) => {
  const f = useCurrentFrame();
  const chars = Array.from(text);
  const n = Math.max(0, Math.min(chars.length, Math.floor((f - start) * cps)));
  const op = f > out ? Math.max(0, 1 - (f - out) / 12) : 1;
  if (f < start) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        top,
        fontFamily: FONT,
        fontSize: 46,
        fontWeight: 400,
        color: "#f3ead6",
        letterSpacing: 2,
        textShadow: "0 3px 12px rgba(0,0,0,0.6)",
        opacity: op,
      }}
    >
      {chars.slice(0, n).join("")}
      <span style={{ opacity: f % 16 < 8 ? 1 : 0 }}>▍</span>
    </div>
  );
};

export const Black: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <AbsoluteFill style={{ background: "#070504", opacity }} />
);
