import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { ClipScript, ClipView } from "./Clip";
import { CameraRig } from "./Village";
import { MOODS, MoodCue } from "./Mood";
import { makePerson, Person, POSES } from "./People";
import { PROP_KINDS, propDef, PropCue, PropModels, PropKind } from "./Props";
import { buildCam, Cam, ensureFonts, project, rad, V3 } from "./lib";
import type { Era } from "./People";

ensureFonts();

// Review sheets for batch 4.
// MoodSheet: the same market "mid" shot with two people in every mood and as a flashback (3 x 3 cells of
//   360 x 640, each a full 1080 x 1920 clip frame scaled down). `only` renders one cell full size.
// PropSheet + PropCell: every prop of the library next to a 1.7 m person. One still cannot hold 32 WebGL
//   canvases, so PropCell renders one prop at a time and scripts/propsheet.sh stitches the cells into the
//   PropSheet frame (title, Thai labels, era dots) with ffmpeg.

type MoodCell = { label: string; mood?: MoodCue; flashback?: boolean; card?: boolean };
export const MOOD_CELLS: MoodCell[] = [
  { label: "ปกติ (ไม่ใส่ mood)" },
  { label: MOODS.horror.label, mood: "horror" },
  { label: MOODS.comedy.label, mood: "comedy", card: true },
  { label: MOODS.drama.label, mood: "drama" },
  { label: MOODS.explainer.label, mood: "explainer", card: true },
  { label: "ย้อนอดีต (flashback)", flashback: true },
  { label: "สยองขวัญ + time: true", mood: { kind: "horror", time: true } },
  { label: "ดราม่า + ย้อนอดีต", mood: "drama", flashback: true },
];
const FRAME = 50; // 1.67 s into the shot: second caption line is up, the card has counted

const moodScript = (c: MoodCell): ClipScript => ({
  id: "moodsheet",
  seed: 11,
  mood: c.mood,
  cast: {
    fon: { seed: 33, age: "adult", female: true, era: "rural" },
    tae: { seed: 18, age: "adult", female: false, era: "city" },
  },
  shots: [
    {
      set: "market", cam: "mid", dur: 2.5, focus: "fon+tae", say: "tae", flashback: c.flashback,
      actors: [
        { who: "fon", at: [-0.45, 3.0], pose: "think", feel: "neutral" },
        { who: "tae", at: [0.45, 3.0], pose: "point", feel: "happy", face: -1 },
      ],
      caption: ["วันนั้นที่ตลาด", "เธอ*ได้ยินข่าวลือ*"],
      ...(c.card ? { card: { title: "ราคาผักวันนี้", value: 35, unit: "บาท" } } : {}),
    },
  ],
});

const CW = 360;
const CH = 640;
const Label: React.FC<{ text: string; k: number }> = ({ text, k }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 12 * k, textAlign: "center" }}>
    <span style={{ fontFamily: "Kanit", fontWeight: 700, fontSize: 28 * k, color: "#fff", background: "rgba(0,0,0,0.62)", borderRadius: 14 * k, padding: `${3 * k}px ${14 * k}px ${7 * k}px` }}>{text}</span>
  </div>
);

export const MoodCellView: React.FC<{ c: MoodCell; full?: boolean }> = ({ c, full }) => {
  const k = full ? 3 : 1;
  return (
    <div style={{ position: "relative", width: CW * k, height: CH * k, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transform: full ? undefined : `scale(${1 / 3})`, transformOrigin: "0 0" }}>
        <ClipView script={moodScript(c)} frame={FRAME} width={1080} height={1920} audio={false} />
      </div>
      <Label text={c.label} k={k} />
    </div>
  );
};

export const MoodSheet: React.FC<{ only?: number }> = ({ only }) => {
  if (only !== undefined) return <MoodCellView c={MOOD_CELLS[only]} full />;
  return (
    <AbsoluteFill style={{ background: "#1d2230", display: "flex", flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start" }}>
      <div style={{ width: CW, height: CH, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontFamily: "Kanit", color: "#fff", textAlign: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 52, lineHeight: 1.1 }}>อารมณ์ภาพ</div>
        <div style={{ fontWeight: 500, fontSize: 30, marginTop: 18, color: "#cfd8ea", lineHeight: 1.3 }}>ตลาดสด · มุมกลาง<br />สองคน ช็อตเดียวกัน</div>
        <div style={{ fontWeight: 500, fontSize: 26, marginTop: 24, color: "#ffd84a", lineHeight: 1.3 }}>mood · flashback</div>
      </div>
      {MOOD_CELLS.map((c, i) => <MoodCellView key={i} c={c} />)}
    </AbsoluteFill>
  );
};

// ---------- props ----------
export const ERA_DOT: Record<Era, string> = { old: "#c08a4a", rural: "#5aae5a", city: "#4a8ae8" };
export const ERA_TH: Record<Era, string> = { old: "สมัยก่อน", rural: "ชนบท", city: "เมือง" };
/** Small things are shown on a table (0.75 m) with a close-up inset. */
const TABLE_TOP: PropKind[] = ["crt_tv", "radio", "phone", "laptop", "books", "money", "candle", "garland", "alms_bowl", "photo_frame", "lantern", "slip", "drawing", "notebook"];
const ROT: Partial<Record<PropKind, number>> = { bicycle: -25, motorbike: -30, buffalo: -25, dog: -25, tuktuk: -30, songthaew: -28, coffin: -20, mat: -15, plastic_chair: -30, table: -20, cat: -20, chicken: -30, laptop: -10, crt_tv: -15, radio: -10, flat_tv: -10 };

export const PCW = 540;
export const PCH = 360;
const PERSON_H = 170;

const Floor: React.FC = () => (
  <>
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshLambertMaterial color="#c9c4ba" />
    </mesh>
    <hemisphereLight args={["#f4f6ff", "#8a8070", 1.25]} />
    <directionalLight position={[-6, 10, 7]} intensity={1.9} color="#fff4e0" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-camera-near={1} shadow-camera-far={30} shadow-bias={-0.0006} />
  </>
);

/** Camera looking at a box [x0..x1] x [y0..y1] (around z = 0) from the front, a little from above. */
const frameBox = (x0: number, x1: number, y0: number, y1: number, aspect: number, el: number, fov = 30): Cam => {
  const w = x1 - x0, h = y1 - y0;
  const half = Math.max(w / 2 / aspect, h / 2) * 1.08;
  const dist = half / Math.tan(rad(fov / 2)) + 0.4;
  const c: V3 = [(x0 + x1) / 2, (y0 + y1) / 2, 0];
  return { pos: [c[0], c[1] + dist * Math.sin(rad(el)), dist * Math.cos(rad(el))], target: c, fov };
};

export const PropCell: React.FC<{ i: number }> = ({ i }) => {
  const kind = PROP_KINDS[i] ?? PROP_KINDS[0];
  const d = propDef(kind);
  const top = TABLE_TOP.includes(kind);
  const rot = ROT[kind] ?? 0;
  const prop: PropCue = { kind, at: [0, 0], rot, on: top ? 0.75 : 0 };
  const list: PropCue[] = top ? [{ kind: "table", at: [0, -0.05], rot: 0 }, prop] : [prop];
  // footprint after the turn, to place the person beside it
  const a = rad(rot);
  const halfX = top ? 0.5 : (Math.abs(Math.cos(a)) * d.size[0] + Math.abs(Math.sin(a)) * d.size[2]) / 2;
  const px = halfX + 0.38;
  const spec = { ...makePerson(15, { age: "adult", female: false, era: "rural" }), h: PERSON_H };
  const H = Math.max(PERSON_H / 100, (top ? 0.75 : 0) + d.size[1]);
  const cam = frameBox(-halfX - 0.15, px + 0.32, 0, H + 0.12, PCW / PCH, top ? 14 : 10);
  const cam3 = buildCam(cam, PCW / PCH);
  const pr = project(cam3, [px, 0, 0.1], PCW, PCH);
  // close-up inset for small things
  const IN = 170;
  const big = Math.max(...d.size);
  const inCam: Cam | null = top || big < 0.5 ? (() => {
    const f: V3 = [0, (top ? 0.75 : 0) + d.size[1] * 0.5, 0];
    const half = Math.max(big, 0.12) * 0.85;
    const el = rad(d.close ? d.close.el : d.flat ? 45 : 22);
    const dist = half / Math.tan(rad(15));
    return { pos: [0.15 * dist, f[1] + dist * Math.sin(el), dist * Math.cos(el)], target: f, fov: 30 };
  })() : null;
  return (
    <AbsoluteFill style={{ background: "#d6d2c8" }}>
      <ThreeCanvas width={PCW} height={PCH} shadows gl={{ antialias: true, alpha: true }}>
        <CameraRig cam={cam} />
        <Floor />
        <PropModels props={list} />
      </ThreeCanvas>
      <svg width={PCW} height={PCH} style={{ position: "absolute", inset: 0 }}>
        <ellipse cx={pr.x} cy={pr.y} rx={0.28 * pr.ppu} ry={0.07 * pr.ppu} fill="#2e2618" opacity={0.25} />
        <g transform={`translate(${pr.x} ${pr.y}) scale(${pr.ppu / 100} ${pr.ppu / 100})`}>
          <Person spec={spec} pose={POSES.stand} feel="neutral" />
        </g>
      </svg>
      {inCam ? (
        <div style={{ position: "absolute", left: 8, top: 8, width: IN, height: IN, borderRadius: 14, overflow: "hidden", border: "4px solid #ffffff", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", background: "#d9d4ca" }}>
          <ThreeCanvas width={IN} height={IN} shadows gl={{ antialias: true, alpha: true }}>
            <CameraRig cam={inCam} />
            <Floor />
            <PropModels props={list} />
          </ThreeCanvas>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Frame of the prop sheet: title, era legend, and one slot per prop (image 270 x 180 + Thai label). */
// 9 rows of 4 (35 props); scripts/propsheet.sh places each 540 x 360 cell, scaled to 240 x 160, in its slot
export const PROP_SLOT = { x0: 0, y0: 160, w: 270, h: 195, img: 164, cols: 4 };
export const PropSheet: React.FC = () => {
  const S = PROP_SLOT;
  return (
    <AbsoluteFill style={{ background: "#232833", fontFamily: "Kanit" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 18, textAlign: "center", color: "#fff", fontWeight: 800, fontSize: 52, lineHeight: 1.1 }}>คลังของประกอบ · {PROP_KINDS.length} ชิ้น</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 92, textAlign: "center", color: "#cfd8ea", fontWeight: 500, fontSize: 28 }}>
        คนสูง 1.7 ม. ยืนเทียบ ·
        {(["old", "rural", "city"] as Era[]).map((e) => (
          <span key={e} style={{ marginLeft: 18 }}>
            <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 9, background: ERA_DOT[e], marginRight: 6 }} />
            {ERA_TH[e]}
          </span>
        ))}
      </div>
      {PROP_KINDS.map((k, i) => {
        const x = S.x0 + (i % S.cols) * S.w;
        const y = S.y0 + Math.floor(i / S.cols) * S.h;
        const d = propDef(k);
        return (
          <div key={k} style={{ position: "absolute", left: x, top: y, width: S.w, height: S.h }}>
            <div style={{ position: "absolute", left: 13, top: 0, width: 244, height: S.img, background: "#3a4050", borderRadius: 6 }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: S.img, height: S.h - S.img, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 24, lineHeight: 1 }}>
              {d.label}
              <span style={{ marginLeft: 8, display: "inline-flex", gap: 3 }}>
                {d.eras.map((e) => <span key={e} style={{ display: "inline-block", width: 11, height: 11, borderRadius: 6, background: ERA_DOT[e] }} />)}
              </span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
