import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Character, EmotionName, GAITS, gaitSpeed, OUTFITS, PHONE_ANCHOR } from "./Character";
import { Blob, CameraRig, Village } from "./Village";
import { buildCam, Cam, clamp01, easeInOut, easeOut, easeOutBack, ensureFonts, lerp, lerp3, project, V3 } from "./lib";

ensureFonts();

const FPS = 30;
export const SHOTS = [
  { from: 0, dur: 72, tag: "ฉากมุมสูง" },
  { from: 72, dur: 78, tag: "ท่าเดิน + ชุด" },
  { from: 150, dur: 72, tag: "สีหน้า" },
  { from: 222, dur: 78, tag: "ซูมเข้าจอมือถือ" },
];
export const TOTAL = 300;

type Actor = {
  pos: V3;
  facing?: 1 | -1;
  node: React.ReactNode;
  label?: { title: string; sub: string; color: string; dx: number; dy: number };
  pop?: number;
  blob?: number;
};
type Part = { t: string; hi?: boolean };
type Shot = {
  cam: Cam;
  actors: Actor[];
  blur: number;
  caption: Part[];
  captionY?: number;
  extra?: React.ReactNode;
};

// ---------------- phone screen (designed on 230 x 470) ----------------
const PhoneScreen: React.FC<{ f: number }> = ({ f }) => {
  const bubble = (y: number, w: number, text: string, at: number, mine = false) => {
    const k = easeOutBack((f - at) / 8);
    if (f < at) return null;
    const x = mine ? 230 - 14 - w : 14;
    return (
      <g transform={`translate(${x + w / 2} ${y + 19}) scale(${k}) translate(${-w / 2} -19)`}>
        <rect width={w} height={38} rx={15} fill={mine ? "#3fae7c" : "#ffffff"} />
        <text x={w / 2} y={26} textAnchor="middle" fontFamily="Kanit" fontWeight={500} fontSize={17} fill={mine ? "#fff" : "#2a2220"}>
          {text}
        </text>
      </g>
    );
  };
  const nk = easeOutBack((f - 44) / 10);
  const amount = Math.round(500 * easeOut((f - 50) / 16));
  return (
    <g>
      <rect width={230} height={470} fill="#efe7da" />
      <rect width={230} height={66} fill="#2f6f5a" />
      <text x={16} y={22} fontFamily="Kanit" fontWeight={500} fontSize={12} fill="#cfe7dd">
        17:42
      </text>
      <circle cx={30} cy={45} r={13} fill="#f3c044" />
      <text x={30} y={50} textAnchor="middle" fontFamily="Kanit" fontWeight={700} fontSize={14} fill="#2a2220">
        ม
      </text>
      <text x={52} y={51} fontFamily="Kanit" fontWeight={700} fontSize={19} fill="#fff">
        แม่
      </text>
      {bubble(84, 122, "ถึงบ้านยังลูก", -99)}
      {bubble(132, 168, "โอนค่าขนมให้แล้วนะ", 8)}
      {bubble(332, 150, "รักแม่ที่สุดเลย", 62, true)}
      {f >= 44 && (
        <g transform={`translate(115 ${lerp(150, 246, nk)}) scale(${lerp(0.7, 1, nk)})`}>
          <rect x={-101} y={-52} width={202} height={104} rx={18} fill="#fffdf8" stroke="#e0b23a" strokeWidth={3} />
          <circle cx={-70} cy={-22} r={15} fill="#f3c044" />
          <text x={-70} y={-16} textAnchor="middle" fontFamily="Kanit" fontWeight={800} fontSize={17} fill="#7a5200">
            ฿
          </text>
          <text x={-46} y={-16} fontFamily="Kanit" fontWeight={700} fontSize={18} fill="#2a2220">
            เงินเข้าบัญชี
          </text>
          <text x={0} y={34} textAnchor="middle" fontFamily="Kanit" fontWeight={800} fontSize={44} fill="#1f9a5f">
            +{amount} บาท
          </text>
        </g>
      )}
    </g>
  );
};

// ---------------- the four shots ----------------
const shotA = (f: number): Shot => {
  const t = f / FPS;
  const p = easeInOut(f / 72);
  const az = lerp(0.72, 0.2, p);
  const R = lerp(38, 30, p);
  const target: V3 = [0.5, 1.2, -3.5];
  const cam: Cam = {
    pos: [target[0] + R * Math.sin(az), lerp(27, 18, p), target[2] + R * Math.cos(az)],
    target,
    fov: 40,
  };
  return {
    cam,
    blur: 0,
    actors: [
      {
        pos: [-2.4 + gaitSpeed(GAITS.stroll) * t, 0, 2.2],
        node: <Character t={t} outfit={OUTFITS[0]} gait={GAITS.stroll} emotion="happy" />,
      },
      {
        pos: [-8 + gaitSpeed(GAITS.hurry) * t, 0, 0.2],
        node: <Character t={t} outfit={OUTFITS[2]} gait={GAITS.hurry} emotion="shocked" />,
      },
      {
        pos: [5.2 - gaitSpeed(GAITS.tired) * t, 0, 3.6],
        facing: -1,
        node: <Character t={t} outfit={OUTFITS[1]} gait={GAITS.tired} emotion="tired" />,
      },
    ],
    caption: [{ t: "บ้าน" }, { t: "สามมิติจริง", hi: true }, { t: " มีเงา มีด้านข้าง" }],
  };
};

const shotB = (f: number): Shot => {
  const t = f / FPS;
  const p = easeInOut(f / 78);
  const cx = lerp(-0.45, 0.45, p);
  const cam: Cam = { pos: [cx, 8.4, 13.8], target: [cx, 0.9, 2.3], fov: 36 };
  const mk = (
    i: number,
    gait: keyof typeof GAITS,
    emo: EmotionName,
    x0: number,
    z: number,
    dir: 1 | -1,
    title: string,
    color: string,
    at: number,
  ): Actor => ({
    pos: [x0 + dir * gaitSpeed(GAITS[gait]) * t, 0, z],
    facing: dir,
    node: <Character t={t + i * 0.37} outfit={OUTFITS[i]} gait={GAITS[gait]} emotion={emo} blink={(f + i * 9) % 40 < 3} />,
    label: { title, sub: `ชุดที่ ${i + 1}`, color, dx: dir * Math.sin((GAITS[gait].lean * Math.PI) / 180) * 1.25, dy: 0.62 + 1.33 * Math.cos((GAITS[gait].lean * Math.PI) / 180) - GAITS[gait].k0 * 0.004 },
    pop: easeOutBack((f - at) / 9),
  });
  return {
    cam,
    blur: 0,
    actors: [
      mk(2, "hurry", "shocked", -5.2, -1.0, 1, "วิ่งรีบ", "#3aa57c", 22),
      mk(0, "stroll", "happy", -2.0, 1.2, 1, "เดินเล่น", "#e4573f", 4),
      mk(1, "sneak", "smug", 1.9, 3.4, -1, "ย่อง", "#7b4fa3", 10),
      mk(3, "tired", "tired", -1.25, 5.6, 1, "หมดแรง", "#5b8cf0", 16),
    ],
    caption: [{ t: "ท่าเดิน " }, { t: "4 แบบ", hi: true }, { t: " ชุดไม่ซ้ำ" }],
    captionY: 1690,
  };
};

const EMO_SEQ: { e: EmotionName; th: string; c: string }[] = [
  { e: "happy", th: "ดีใจ", c: "#f3a024" },
  { e: "shocked", th: "ตกใจ", c: "#5b8cf0" },
  { e: "angry", th: "โกรธ", c: "#e23b3b" },
  { e: "crying", th: "ร้องไห้", c: "#3d9fd6" },
  { e: "smug", th: "เจ้าเล่ห์", c: "#7b4fa3" },
  { e: "shy", th: "เขิน", c: "#ef6f95" },
];
const shotC = (f: number): Shot => {
  const t = f / FPS;
  const i = Math.min(EMO_SEQ.length - 1, Math.floor(f / 12));
  const k = f - i * 12;
  const pop = 1 + 0.09 * (1 - easeOut(k / 6));
  const cam: Cam = { pos: [0.22 * Math.sin(t * 1.3), 1.44, 4.9], target: [0, 1.2, 1.5], fov: 30 };
  const cur = EMO_SEQ[i];
  return {
    cam,
    blur: 7,
    actors: [
      {
        pos: [0, 0, 1.5],
        node: (
          <g transform={`translate(0 -138) scale(${pop}) translate(0 138)`}>
            <Character t={t} outfit={OUTFITS[0]} view="front" emotion={cur.e} />
          </g>
        ),
        blob: 0,
      },
    ],
    caption: [{ t: "สีหน้า " }, { t: "เปลี่ยนได้ทุกคำพูด", hi: true }],
    captionY: 1690,
    extra: (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1330,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${easeOutBack(k / 7)})`,
            background: cur.c,
            color: "#fff",
            fontFamily: "Kanit",
            fontWeight: 800,
            fontSize: 110,
            lineHeight: 1,
            padding: "22px 64px 30px",
            borderRadius: 40,
            boxShadow: "0 12px 0 rgba(0,0,0,0.22)",
          }}
        >
          {cur.th}
        </div>
      </div>
    ),
  };
};

const shotD = (f: number): Shot => {
  const t = f / FPS;
  const who: V3 = [0.35, 0, 1.8];
  const phone: V3 = [who[0] + PHONE_ANCHOR.x / 100, -PHONE_ANCHOR.y / 100, who[2]];
  const p = easeInOut((f - 12) / 36);
  const drift = f / 78;
  const start: Cam = { pos: [-1.3 + drift * 0.25, 2.25, 7.1], target: [0.55, 1.12, 1.8], fov: 34 };
  const end: Cam = { pos: [phone[0], phone[1], phone[2] + 1.08 - 0.05 * drift], target: phone, fov: 34 };
  const cam: Cam = { pos: lerp3(start.pos, end.pos, p), target: lerp3(start.target, end.target, p), fov: 34 };
  return {
    cam,
    blur: lerp(0, 9, p),
    actors: [
      {
        pos: who,
        node: <Character t={t} outfit={OUTFITS[3]} view="back" phone={<PhoneScreen f={f} />} />,
      },
    ],
    caption: [{ t: "กล้อง" }, { t: "ซูมเข้าจอ", hi: true }, { t: "เองตามจุดโฟกัส" }],
    captionY: 1730,
  };
};

const describe = (frame: number) => {
  const idx = Math.max(0, SHOTS.findIndex((s) => frame >= s.from && frame < s.from + s.dur));
  const lf = frame - SHOTS[idx].from;
  const shot = [shotA, shotB, shotC, shotD][idx](lf);
  return { idx, lf, shot };
};

// ---------------- overlay pieces ----------------
const outline = "0 0 10px rgba(0,0,0,.55), 0 4px 0 rgba(0,0,0,.55), 3px 0 0 rgba(0,0,0,.45), -3px 0 0 rgba(0,0,0,.45), 0 -3px 0 rgba(0,0,0,.45)";

const Caption: React.FC<{ parts: Part[]; lf: number; y: number }> = ({ parts, lf, y }) => (
  <div style={{ position: "absolute", left: 80, right: 80, top: y, textAlign: "center" }}>
    <div
      style={{
        display: "inline-block",
        transform: `scale(${lerp(0.7, 1, easeOutBack(lf / 9))})`,
        opacity: clamp01(lf / 4),
        fontFamily: "Kanit",
        fontWeight: 800,
        fontSize: 68,
        lineHeight: 1.2,
        color: "#fff",
        textShadow: outline,
      }}
    >
      {parts.map((p, i) => (
        <span key={i} style={{ color: p.hi ? "#ffd84a" : "#fff" }}>
          {p.t}
        </span>
      ))}
    </div>
  </div>
);

const TopBar: React.FC<{ idx: number; lf: number; frame: number }> = ({ idx, lf, frame }) => (
  <>
    <div style={{ position: "absolute", left: 80, right: 80, top: 100, display: "flex", gap: 12 }}>
      {SHOTS.map((s, i) => (
        <div key={i} style={{ flex: 1, height: 10, borderRadius: 5, background: "rgba(255,255,255,.45)", overflow: "hidden" }}>
          <div style={{ width: `${clamp01((frame - s.from) / s.dur) * 100}%`, height: "100%", background: "#fff" }} />
        </div>
      ))}
    </div>
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 134,
        display: "flex",
        alignItems: "center",
        transform: `translateX(${lerp(-60, 0, easeOut(lf / 8))}px)`,
        opacity: clamp01(lf / 4),
        fontFamily: "Kanit",
        boxShadow: "0 8px 0 rgba(0,0,0,.18)",
        borderRadius: 26,
      }}
    >
      <div style={{ background: "#ffd84a", color: "#1d2a44", fontWeight: 800, fontSize: 46, padding: "8px 24px 12px", borderRadius: "26px 0 0 26px" }}>
        {idx + 1}/4
      </div>
      <div style={{ background: "#1d2a44", color: "#fff", fontWeight: 700, fontSize: 46, padding: "8px 30px 12px 24px", borderRadius: "0 26px 26px 0" }}>
        {SHOTS[idx].tag}
      </div>
    </div>
  </>
);

// ---------------- composition ----------------
export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { idx, lf, shot } = describe(frame);
  const cam3 = buildCam(shot.cam, width / height);

  const placed = shot.actors
    .map((a) => ({ a, pr: project(cam3, a.pos, width, height) }))
    .sort((m, n) => n.pr.depth - m.pr.depth);
  const blobs: Blob[] = shot.actors.filter((a) => a.blob !== 0).map((a) => ({ x: a.pos[0], z: a.pos[2] }));
  const punch = 1 + 0.05 * (1 - easeOut(lf / 7));

  return (
    <AbsoluteFill style={{ background: "#d9ecf2", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${punch})` }}>
        {/* sky */}
        <AbsoluteFill style={{ background: "linear-gradient(#63b1e6 0%, #a9d8f0 30%, #d9ecf2 52%)" }} />
        <div
          style={{
            position: "absolute",
            right: 150,
            top: 210,
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "#fff6cf",
            boxShadow: "0 0 90px 50px rgba(255,246,207,.55)",
          }}
        />
        {/* 3D set */}
        <AbsoluteFill style={{ filter: shot.blur > 0.2 ? `blur(${shot.blur}px)` : undefined }}>
          <ThreeCanvas width={width} height={height} shadows gl={{ antialias: true, alpha: true }}>
            <CameraRig cam={shot.cam} />
            <Village seed={7} blobs={blobs} />
          </ThreeCanvas>
        </AbsoluteFill>
        {/* 2D characters standing in the set */}
        <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {placed.map(({ a, pr }, i) => (
            <g key={i} transform={`translate(${pr.x} ${pr.y}) scale(${(pr.ppu / 100) * (a.facing ?? 1)} ${pr.ppu / 100})`}>
              {a.node}
            </g>
          ))}
        </svg>
        {/* name chips that follow the characters */}
        {placed.map(({ a, pr }, i) =>
          a.label ? (
            <div
              key={i}
              style={{
                position: "absolute",
                left: pr.x + a.label.dx * pr.ppu,
                top: pr.y - a.label.dy * pr.ppu,
                transform: `translate(-50%, -100%) scale(${a.pop ?? 1})`,
                transformOrigin: "50% 100%",
                opacity: (a.pop ?? 1) > 0.05 ? 1 : 0,
                fontFamily: "Kanit",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ background: a.label.color, color: "#fff", lineHeight: 1, padding: "10px 24px 14px", borderRadius: 24, boxShadow: "0 6px 0 rgba(0,0,0,.2)" }}>
                <div style={{ fontWeight: 800, fontSize: 48 }}>{a.label.title}</div>
                <div style={{ fontWeight: 500, fontSize: 30, marginTop: 6, opacity: 0.92 }}>{a.label.sub}</div>
              </div>
            </div>
          ) : null,
        )}
      </AbsoluteFill>

      {/* soft vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,16,10,.38) 100%)" }} />
      {shot.extra}
      <TopBar idx={idx} lf={lf} frame={frame} />
      <Caption parts={shot.caption} lf={lf} y={shot.captionY ?? 1500} />
    </AbsoluteFill>
  );
};
