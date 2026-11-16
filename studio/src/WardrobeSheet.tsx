import React from "react";
import { AbsoluteFill } from "remotion";
import { GAITS } from "./Character";
import { Age, Era, makePerson, Person, PersonBack, PersonSide, PersonSpec, POSES, Stool } from "./People";
import { ERA_TH, pieceShort, WearSpec } from "./Wardrobe";

// Batch 2 review sheet: one band per era, 6 seeded outfits on mixed sexes and ages, then one person in every view.
type Who = { seed: number; age: Age; female: boolean; wear?: WearSpec };
type Band = { era: Era; mix: { age: Age; female: boolean }[]; focus: Who };
const MIX: { age: Age; female: boolean }[] = [
  { age: "adult", female: true }, { age: "adult", female: false }, { age: "elder", female: true },
  { age: "elder", female: false }, { age: "teen", female: true }, { age: "child", female: false },
];
const BANDS: Band[] = [
  { era: "old", mix: MIX, focus: { seed: 40, age: "adult", female: false, wear: { top: "mohom", bottom: "kuay", head: "ngob", acc: ["pakhaoma", "bag"], feet: "barefoot" } } },
  { era: "rural", mix: MIX, focus: { seed: 41, age: "adult", female: true, wear: { top: "workshirt", bottom: "phathung", head: "scarf", acc: ["necklace"], feet: "flipflops", pattern: "check" } } },
  { era: "city", mix: MIX, focus: { seed: 42, age: "teen", female: true, wear: { top: "blouse", bottom: "pleated", outer: "cardigan", head: "cap", acc: ["glasses", "backpack", "watch"], feet: "sneakers" } } },
];

/** Six people of an era whose tops all differ (seeded, so the sheet is the same every render). */
const sixOf = (b: Band): PersonSpec[] => {
  const out: PersonSpec[] = [];
  const tops = new Set<string>();
  for (let i = 0; out.length < b.mix.length && i < 400; i++) {
    const m = b.mix[out.length];
    const p = makePerson(1000 + i * 7 + b.era.length * 131, { era: b.era, age: m.age, female: m.female });
    if (tops.has(p.wear.top) && i < 300) continue;
    tops.add(p.wear.top);
    out.push(p);
  }
  return out;
};

const labels = (p: PersonSpec) => {
  const w = p.wear;
  const extra = [w.outer, w.head, ...w.acc].filter(Boolean).map((id) => pieceShort(id!));
  return [pieceShort(w.top), pieceShort(w.bottom), ...extra.slice(0, 2), pieceShort(w.feet)];
};

export const WardrobeSheet: React.FC<{ focus?: Partial<Record<Era, Who>> }> = ({ focus = {} }) => {
  const k = 1; // px per unit (cm)
  const bandH = 610;
  const txt = (x: number, y: number, s: string, size = 26, fill = "#5a4f46", weight = 500, anchor: "middle" | "start" | "end" = "middle") => (
    <text key={`${x}-${y}-${s}`} x={x} y={y} textAnchor={anchor} fontFamily="Kanit" fontWeight={weight} fontSize={size} fill={fill}>{s}</text>
  );
  const ref = (x0: number, x1: number, gy: number) => (
    <g>
      <line x1={x0} x2={x1} y1={gy} y2={gy} stroke="#cbbfae" strokeWidth={3} />
      <line x1={x0} x2={x1} y1={gy - 170 * k} y2={gy - 170 * k} stroke="#c9bca8" strokeWidth={2} strokeDasharray="6 8" />
    </g>
  );
  return (
    <AbsoluteFill style={{ background: "#efe8dc", fontFamily: "Kanit" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {txt(40, 62, "ชุด 2 · เสื้อผ้า 3 ยุค", 44, "#231c1a", 800, "start")}
        {txt(1040, 58, "เส้นประ = 1.7 ม.", 28, "#6b5f55", 500, "end")}
        {BANDS.map((b, bi) => {
          const top = 88 + bi * bandH;
          const people = sixOf(b);
          const f = focus[b.era] ?? b.focus;
          const fp = makePerson(f.seed, { era: b.era, age: f.age, female: f.female, wear: f.wear });
          const g1 = top + 246, g2 = top + 572;
          const cw = 1080 / 6;
          const views: { label: string; el: React.ReactNode }[] = [
            { label: "หน้า", el: <Person spec={fp} feel="happy" /> },
            { label: "หลัง", el: <PersonBack spec={fp} /> },
            { label: "ข้าง · เดิน", el: <PersonSide spec={fp} gait={GAITS.stroll} phase={0.2} feel="happy" /> },
            { label: "นั่งเก้าอี้", el: <><Stool /><Person spec={fp} pose={POSES.sit} /></> },
            { label: "นั่งพื้น", el: <Person spec={fp} pose={POSES.sitfloor} feel="calm" /> },
          ];
          return (
            <g key={b.era}>
              {bi % 2 === 1 && <rect x={0} y={top} width={1080} height={bandH} fill="#e7dfd1" />}
              {txt(40, top + 44, ERA_TH[b.era], 38, "#231c1a", 800, "start")}
              {ref(14, 1066, g1)}
              {people.map((p, i) => {
                const x = cw * i + cw / 2;
                return (
                  <g key={i}>
                    <g transform={`translate(${x} ${g1}) scale(${k})`}><Person spec={p} feel={i % 2 ? "happy" : "neutral"} /></g>
                    {labels(p).map((s, j) => txt(x, g1 + 30 + j * 28, s, 26, j < 2 ? "#3a302a" : "#7a6e64"))}
                  </g>
                );
              })}
              {ref(14, 1066, g2)}
              {views.map((v, i) => {
                const x = 108 + i * 216;
                return (
                  <g key={v.label}>
                    <g transform={`translate(${x} ${g2}) scale(${k})`}>{v.el}</g>
                    {txt(x, g2 + 28, v.label, 26, "#3a302a")}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
