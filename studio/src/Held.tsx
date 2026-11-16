import React from "react";
import { PaperImage, PaperKind } from "./Paper";

// Hand-held items of the 2D actors (ActorCue.hold). Drawn in the actor's own units (1 unit = 1 cm), each
// around its own centre; People.tsx places them in the hand(s) and bends the forearm to them.
// The paper ones reuse the canvas artwork of the paper props (Paper.tsx), so close-ups match.

export type HoldItem = "slip" | "drawing" | "notebook" | "letter" | "phone" | "ladle" | "bowl" | "pot";
export type HoldHand = "left" | "right" | "both";
export const HOLD_ITEMS: HoldItem[] = ["slip", "drawing", "notebook", "letter", "phone", "ladle", "bowl", "pot"];
export const HOLD_HANDS: HoldHand[] = ["left", "right", "both"];
/** Items that may rest on the chest of a lying actor. */
export const LIE_ITEMS: HoldItem[] = ["phone", "slip"];

type ItemDef = {
  w: number; h: number; // front-view size in cm
  paper?: PaperKind;
  /** one hand: where the hand grips, from the item's centre, for a hand on the +x side (mirrored for -x) */
  grip: [number, number];
  /** both hands: the right hand's grip (the left one is mirrored) */
  grip2: [number, number];
  tilt: number; // degrees in one hand, for a hand on the +x side
  depth: number; // front-to-back size, for the side view
  th: string; // Thai name for sheets
};
export const ITEMS: Record<HoldItem, ItemDef> = {
  slip: { w: 14.8, h: 21, paper: "slip", grip: [5.8, 6.5], grip2: [6.2, 2], tilt: -5, depth: 0.2, th: "ใบนัด" },
  letter: { w: 15, h: 21, paper: "letter", grip: [5.9, 6.5], grip2: [6.3, 2], tilt: -5, depth: 0.2, th: "จดหมาย" },
  notebook: { w: 15, h: 21, paper: "notebook", grip: [6.0, 6.0], grip2: [6.4, 2], tilt: -4, depth: 1.4, th: "สมุดจด" },
  drawing: { w: 29.7, h: 21, paper: "drawing", grip: [12.8, -7.5], grip2: [13.6, -1], tilt: 0, depth: 0.2, th: "ภาพวาด" },
  phone: { w: 7, h: 15, grip: [1.4, 4.4], grip2: [3.0, 3.5], tilt: -3, depth: 0.9, th: "โทรศัพท์" },
  ladle: { w: 9, h: 31, grip: [0, -11], grip2: [0, -11], tilt: 10, depth: 9, th: "ทัพพี" },
  bowl: { w: 15, h: 6.5, grip: [0, 5.6], grip2: [7.4, 1], tilt: 0, depth: 15, th: "ชาม" },
  pot: { w: 22, h: 16, grip: [14.4, -1.6], grip2: [14.4, -1.6], tilt: 0, depth: 22, th: "หม้อ" },
};
/** Items that need both hands when the pose allows it. */
export const TWO_HANDED: HoldItem[] = ["pot", "drawing"];

const PAPER_EDGE = "#c9c2b0";
const METAL = "#b4bac0";
const METAL_D = "#7e868e";
const METAL_L = "#dde2e6";

/** A sheet of paper with its artwork (front) or its plain back. crop shows part of the artwork. */
const Sheet: React.FC<{ kind: PaperKind; w: number; h: number; back?: boolean; mirror?: boolean; crop?: [number, number] }> = ({ kind, w, h, back, mirror, crop }) => (
  <g>
    <rect x={-w / 2 + 0.35} y={-h / 2 + 0.5} width={w} height={h} fill="rgba(0,0,0,.18)" />
    {back ? (
      <>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#efebe0" stroke={PAPER_EDGE} strokeWidth={0.25} />
        {/* ink showing faintly through the paper */}
        {[0.3, 0.42, 0.54, 0.66].map((f) => <rect key={f} x={-w * 0.32} y={-h / 2 + h * f} width={w * 0.62} height={0.35} fill="rgba(60,60,120,.08)" />)}
      </>
    ) : (
      <>
        <PaperImage kind={kind} w={w} h={h} mirror={mirror} crop={crop} />
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke={PAPER_EDGE} strokeWidth={0.25} />
      </>
    )}
  </g>
);

/** The item seen from the front (the side shown to the camera) or from behind. */
export const HeldFront: React.FC<{ kind: HoldItem; back?: boolean; mirror?: boolean; noHandles?: boolean }> = ({ kind, back, mirror, noHandles }) => {
  const d = ITEMS[kind];
  const { w, h } = d;
  switch (kind) {
    case "slip":
    case "letter":
    case "drawing":
      return <Sheet kind={d.paper!} w={w} h={h} back={back} mirror={mirror} />;
    case "notebook":
      // held open and folded back: one page facing out, the cover and page block peeking at the edge
      return (
        <g>
          <rect x={-w / 2 - 0.2} y={-h / 2 - 0.4} width={w + 1.2} height={h + 0.8} rx={0.5} fill="#24406e" />
          <rect x={-w / 2 + 0.6} y={-h / 2 + 0.1} width={w} height={h} fill="#e6e0d0" />
          {back ? <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#2c4a7c" /> : <Sheet kind="notebook" w={w} h={h} mirror={mirror} crop={[0.5, 1]} />}
          <rect x={-w / 2 - 0.4} y={-h / 2 - 0.4} width={0.9} height={h + 0.8} fill="#1a2f52" />
        </g>
      );
    case "phone":
      return back ? (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.9} fill="#2b2d33" />
          <rect x={-w / 2 + 0.7} y={-h / 2 + 0.7} width={2} height={3} rx={0.7} fill="#16171b" />
          <circle cx={-w / 2 + 1.7} cy={-h / 2 + 1.6} r={0.55} fill="#3a4a5a" />
        </g>
      ) : (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.9} fill="#1c1c20" />
          <rect x={-w / 2 + 0.35} y={-h / 2 + 0.35} width={w - 0.7} height={h - 0.7} rx={0.6} fill="#6a8ab8" />
          <rect x={-w / 2 + 0.35} y={-h / 2 + 0.35} width={w - 0.7} height={(h - 0.7) * 0.45} rx={0.6} fill="#86a6d2" />
          <rect x={-1.1} y={-h / 2 + 0.6} width={2.2} height={0.5} rx={0.25} fill="#1c1c20" />
        </g>
      );
    case "ladle":
      // handle up, bowl down; local y: handle end -15.5, rim +10.5, bottom +15.5
      return (
        <g>
          <path d="M -0.7 -15.5 L 0.7 -15.5 L 0.75 8.5 Q 0.8 10.2 3.4 10.6 L -3.6 10.6 Q -0.7 10 -0.75 8.5 Z" fill={METAL} stroke={METAL_D} strokeWidth={0.2} />
          <circle cx={0} cy={-14.3} r={0.45} fill={METAL_D} />
          <path d="M -4.4 10.5 L 4.4 10.5 Q 4.2 15.5 0 15.5 Q -4.2 15.5 -4.4 10.5 Z" fill={METAL} stroke={METAL_D} strokeWidth={0.25} />
          <path d="M -3.4 11.6 Q -2.6 14.3 0 14.5" fill="none" stroke={METAL_L} strokeWidth={0.6} strokeLinecap="round" />
          <ellipse cx={0} cy={10.5} rx={4.4} ry={0.7} fill={METAL_D} />
        </g>
      );
    case "bowl":
      return (
        <g>
          <path d="M -7.5 -3.25 L 7.5 -3.25 Q 7 1.8 3 2.6 L 2.9 3.25 L -2.9 3.25 L -3 2.6 Q -7 1.8 -7.5 -3.25 Z" fill="#f4f1ea" stroke="#b9b2a2" strokeWidth={0.25} />
          <path d="M -7.35 -2.1 L 7.35 -2.1" stroke="#3a6ab0" strokeWidth={0.7} />
          <path d="M -5.6 0.4 Q 0 1.6 5.6 0.4" fill="none" stroke="#3a6ab0" strokeWidth={0.35} />
          <ellipse cx={0} cy={-3.25} rx={7.5} ry={0.7} fill="#e2ddd2" />
        </g>
      );
    case "pot":
      // aluminium pot 22 cm across with a domed lid and two side handles
      return (
        <g>
          {!noHandles && [-1, 1].map((k) => <rect key={k} x={k > 0 ? 10.6 : -14.4} y={-2.6} width={3.8} height={1.9} rx={0.9} fill="#2a2a2e" />)}
          <path d="M -11 -4 L 11 -4 L 11 6 Q 11 8.5 8 8.6 L -8 8.6 Q -11 8.5 -11 6 Z" fill={METAL} stroke={METAL_D} strokeWidth={0.3} />
          <rect x={-11.3} y={-4.6} width={22.6} height={1.2} rx={0.5} fill={METAL_L} stroke={METAL_D} strokeWidth={0.2} />
          <path d="M -10.8 -4.6 Q -9 -7.4 0 -7.6 Q 9 -7.4 10.8 -4.6 Z" fill={METAL_L} stroke={METAL_D} strokeWidth={0.25} />
          <rect x={-1.6} y={-9.2} width={3.2} height={1.8} rx={0.8} fill="#2a2a2e" />
          <path d="M -8.6 -2 L -8.6 6.4" stroke={METAL_L} strokeWidth={0.9} strokeLinecap="round" />
        </g>
      );
  }
};

/** The item seen from the side of a walking actor (facing +x): papers and the phone are nearly edge-on. */
export const HeldSide: React.FC<{ kind: HoldItem }> = ({ kind }) => {
  const d = ITEMS[kind];
  if (kind === "pot")
    // in profile both side handles line up in the middle: draw the near one there
    return (
      <g>
        <HeldFront kind="pot" noHandles />
        <rect x={-1.6} y={-3.0} width={3.2} height={2.6} rx={1} fill="#2a2a2e" />
      </g>
    );
  if (kind === "ladle" || kind === "bowl") return <HeldFront kind={kind} />;
  if (kind === "phone")
    return (
      <g>
        <rect x={-0.45} y={-d.h / 2} width={0.9} height={d.h} rx={0.4} fill="#1c1c20" />
        <rect x={-0.9} y={-d.h / 2 + 0.3} width={0.45} height={d.h - 0.6} fill="#86a6d2" opacity={0.9} />
      </g>
    );
  // a sheet turned towards its holder: a thin sliver of the face, edge towards the camera
  const sl = kind === "drawing" ? 9 : kind === "notebook" ? 6 : 6;
  return (
    <g>
      <path d={`M ${-sl} ${-d.h / 2 + 0.8} L 0.3 ${-d.h / 2} L 0.3 ${d.h / 2} L ${-sl} ${d.h / 2 - 0.8} Z`} fill={kind === "notebook" ? "#2c4a7c" : "#f4f1e6"} stroke={PAPER_EDGE} strokeWidth={0.25} />
      {kind !== "notebook" && [0.25, 0.4, 0.55, 0.7].map((f) => <line key={f} x1={-sl + 0.5} x2={-0.3} y1={-d.h / 2 + d.h * f} y2={-d.h / 2 + d.h * f - 0.2} stroke="rgba(40,60,140,.25)" strokeWidth={0.3} />)}
      {kind === "notebook" && <rect x={-0.4} y={-d.h / 2} width={1.4} height={d.h} fill="#e6e0d0" />}
    </g>
  );
};
