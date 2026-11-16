import React from "react";
import { AbsoluteFill } from "remotion";
import { FeelName, makePerson, Person, PersonBack, PersonSide, PersonSpec, PoseName, POSES, Stool } from "./People";
import { GAITS } from "./Character";
import { HoldItem, ITEMS } from "./Held";
import { ensureFonts } from "./lib";

ensureFonts();

// Review sheet for the hand-held items (ActorCue.hold): an adult woman (city) and an elder woman (rural)
// with every item in a suitable pose, then the back view and the side (walking) view of two items.
// 1.7 px per cm; the dashed line is 1.7 m.

type Cell = { who: 0 | 1; item: HoldItem; pose: PoseName; feel?: FeelName; view?: "back" | "side"; flip?: boolean };
const CELLS: Cell[] = [
  { who: 0, item: "slip", pose: "sit", feel: "sad" },
  { who: 0, item: "drawing", pose: "stand", feel: "happy" },
  { who: 0, item: "notebook", pose: "think", feel: "neutral" },
  { who: 0, item: "letter", pose: "cry", feel: "cry" },
  { who: 0, item: "phone", pose: "point", feel: "shock", flip: true },
  { who: 0, item: "ladle", pose: "stand", feel: "happy" },
  { who: 0, item: "bowl", pose: "sitfloor", feel: "calm" },
  { who: 0, item: "pot", pose: "carry", feel: "neutral" },
  { who: 1, item: "slip", pose: "lie", feel: "sad" },
  { who: 1, item: "drawing", pose: "cry", feel: "cry" },
  { who: 1, item: "notebook", pose: "sitfloor", feel: "happy" },
  { who: 1, item: "letter", pose: "sit", feel: "sad", flip: true },
  { who: 1, item: "phone", pose: "stand", feel: "shock" },
  { who: 1, item: "ladle", pose: "point", feel: "angry" },
  { who: 1, item: "bowl", pose: "carry", feel: "happy" },
  { who: 1, item: "pot", pose: "stand", feel: "neutral" },
  { who: 1, item: "pot", pose: "carry", view: "back" },
  { who: 0, item: "slip", pose: "stand", view: "back" },
  { who: 1, item: "pot", pose: "stand", view: "side", feel: "neutral" },
  { who: 0, item: "slip", pose: "stand", view: "side", feel: "sad" },
];
const POSE_TH: Partial<Record<PoseName, string>> = { stand: "ยืน", sit: "นั่ง", sitfloor: "นั่งพื้น", think: "คิด", cry: "ร้องไห้", point: "ชี้", carry: "ถือ", lie: "นอน" };

export const HoldSheet: React.FC = () => {
  const people: PersonSpec[] = [makePerson(12, { age: "adult", female: true, era: "city" }), makePerson(24, { age: "elder", female: true, era: "rural" })];
  const k = 1.7;
  const cw = 270, top = 132, rh = 357;
  return (
    <AbsoluteFill style={{ background: "#efe8dc", fontFamily: "Kanit" }}>
      <div style={{ position: "absolute", left: 40, top: 22, fontSize: 46, fontWeight: 800, color: "#231c1a" }}>ของในมือ · hold</div>
      <div style={{ position: "absolute", right: 40, top: 24, fontSize: 25, fontWeight: 500, color: "#6b5f55", textAlign: "right", lineHeight: 1.25 }}>
        แถว 1–2 ผู้หญิง (เมือง) · แถว 3–4 ยาย (ชนบท)
        <br />
        แถว 5 มุมหลังและมุมข้างขณะเดิน · เส้นประ 1.7 ม.
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {CELLS.map((c, i) => {
          const col = i % 4, row = Math.floor(i / 4);
          const x = col * cw + cw / 2, gy = top + row * rh + 290;
          const spec = people[c.who];
          const lie = c.pose === "lie";
          const label = `${ITEMS[c.item].th} · ${c.view === "back" ? "มุมหลัง" : c.view === "side" ? "เดิน" : POSE_TH[c.pose] ?? c.pose}`;
          return (
            <g key={i}>
              {col === 0 ? <line x1={10} x2={1070} y1={gy} y2={gy} stroke="#cbbfae" strokeWidth={3} /> : null}
              {col === 0 ? <line x1={10} x2={1070} y1={gy - 170 * k} y2={gy - 170 * k} stroke="#d4c8b6" strokeWidth={2} strokeDasharray="6 8" /> : null}
              {lie ? <rect x={x - 132} y={gy - 55 * k} width={264} height={55 * k} rx={6} fill="#8a6f58" /> : null}
              {lie ? <rect x={x - 132} y={gy - 55 * k} width={264} height={9} rx={4} fill="#d9cfc2" /> : null}
              <g transform={`translate(${x} ${gy}) scale(${k * (c.flip ? -1 : 1)} ${k})`}>
                {c.pose === "sit" ? <Stool /> : null}
                {c.view === "side" ? (
                  <PersonSide spec={spec} gait={GAITS.stroll} phase={0.3} feel={c.feel} hold={c.item} />
                ) : c.view === "back" ? (
                  <PersonBack spec={spec} pose={POSES[c.pose]} hold={c.item} poseName={c.pose} />
                ) : (
                  <Person spec={spec} pose={POSES[c.pose]} feel={c.feel} hold={c.item} poseName={c.pose} flip={c.flip} eyes={lie ? "closed" : undefined} lieOn={lie ? 0.55 : 0} headDir={lie ? (c.flip ? -1 : 1) : 1} />
                )}
              </g>
              <text x={x} y={gy + 36} textAnchor="middle" fontFamily="Kanit" fontWeight={600} fontSize={27} fill="#4a3f36">{label}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
