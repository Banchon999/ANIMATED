import React from "react";
import { AbsoluteFill } from "remotion";
import { camPreset } from "./Clip";
import { makePerson, Person, POSES } from "./People";
import { SetName, SETS, SetStage } from "./Sets";
import { TIME_LABEL, TimeOfDay } from "./Light";
import { buildCam, ensureFonts, project, rng, V3 } from "./lib";

ensureFonts();

// Review sheet for the newer sets: each one by day and by night in the "wide" framing, with one seeded
// standing adult for scale. 3 x 3 grid of portrait cells (360 x 640); the first cell is the title.

export const SHEET_CELLS: { set: SetName; time: TimeOfDay; z: number }[] = [
  { set: "temple", time: "day", z: 3.0 },
  { set: "temple", time: "night", z: 3.0 },
  { set: "market", time: "day", z: 3.0 },
  { set: "market", time: "night", z: 3.0 },
  { set: "ricefield", time: "day", z: 3.0 },
  { set: "ricefield", time: "night", z: 3.0 },
  { set: "cityroom", time: "day", z: 2.9 },
  { set: "cityroom", time: "night", z: 2.9 },
];
const CW = 360;
const CH = 640;
const SEED = 11;

export const SetCell: React.FC<{ set: SetName; time: TimeOfDay; z: number; i: number; width?: number; height?: number }> = ({ set, time, z, i, width = CW, height = CH }) => {
  const x = set === "cityroom" ? -0.6 : 0;
  const focus: V3 = [x, 0, z];
  const { cam, blur } = camPreset("wide", focus, 0.5, rng(SEED * 131 + 1), set);
  const cam3 = buildCam(cam, width / height);
  const spec = makePerson(40 + i * 7, { age: "adult", era: i % 2 ? "city" : "rural" });
  const pr = project(cam3, focus, width, height);
  const k = width / CW;
  return (
    <div style={{ position: "relative", width, height, overflow: "hidden" }}>
      <SetStage set={set} cam={cam} cam3={cam3} width={width} height={height} frame={0} blur={blur} seed={SEED} time={time} blobs={SETS[set].dark ? [] : [{ x, z, r: 0.32 }]}>
        <g transform={`translate(${pr.x} ${pr.y}) scale(${pr.ppu / 100} ${pr.ppu / 100})`}>
          <Person spec={spec} pose={POSES.stand} feel="happy" />
        </g>
      </SetStage>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 14 * k, textAlign: "center" }}>
        <span style={{ fontFamily: "Kanit", fontWeight: 700, fontSize: 30 * k, color: "#fff", background: "rgba(0,0,0,0.55)", borderRadius: 14 * k, padding: `${4 * k}px ${16 * k}px ${8 * k}px` }}>
          {SETS[set].label} · {TIME_LABEL[time]}
        </span>
      </div>
    </div>
  );
};

/** Title cell and the eight set cells. `only` renders a single cell full size (fallback for stitching). */
export const SetSheet: React.FC<{ only?: number }> = ({ only }) => {
  if (only !== undefined) {
    const c = SHEET_CELLS[only];
    return <SetCell {...c} i={only} width={1080} height={1920} />;
  }
  return (
    <AbsoluteFill style={{ background: "#1d2230", display: "flex", flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start" }}>
      <div style={{ width: CW, height: CH, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontFamily: "Kanit", color: "#fff", textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 52, lineHeight: 1.1 }}>ฉากใหม่</div>
        <div style={{ fontWeight: 500, fontSize: 30, marginTop: 18, color: "#cfd8ea", lineHeight: 1.3 }}>วัด ตลาดสด ทุ่งนา<br />ห้องคอนโด</div>
        <div style={{ fontWeight: 500, fontSize: 26, marginTop: 24, color: "#ffd84a" }}>กลางวัน / กลางคืน · มุมกว้าง</div>
      </div>
      {SHEET_CELLS.map((c, i) => <SetCell key={i} {...c} i={i} />)}
    </AbsoluteFill>
  );
};
