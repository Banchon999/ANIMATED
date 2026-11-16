import React, { useMemo } from "react";
import * as THREE from "three";
import { makeTex } from "./NightRoom";
import type { Blob } from "./Village";
import { rng, V3 } from "./lib";
import { KITS, paintSky, TimeOfDay } from "./Light";
import { B, Blobs, Lit, Rod, shade, useKanit } from "./SetKit";

// Thai school classroom, real-world scale. Front wall (z 0) with the chalkboard, a framed motto (no portrait)
// and a Thai flag above it, louvred windows on both sides of the board. Room x ±3.6, ceiling 3.0; walls run
// on to z 12 so wide cameras stay inside. Wooden desks and chairs stand in two blocks either side of a
// central aisle (x ±1.15) from z 3.6 back; the teacher's desk is at the front left. Louvred windows along the
// left wall look onto the sports field, the right wall has the corridor windows and the door. Ceiling fans
// turn. The actors stand at the front of the class or in the aisle. Board writing, paint, desk wood, bags on
// the desks, chairs left askew and the field outside come from the clip seed.

export const SCHOOL = {
  halfW: 3.6,
  ceiling: 3.0,
  board: { x0: -1.6, x1: 1.6, y0: 0.85, y1: 2.1 }, // chalkboard on the front wall (z 0)
  motto: [0, 2.5, 0.02] as V3, // framed motto above the board
  flag: [-2.05, 2.35, 0.02] as V3, // Thai flag on a short wall pole, left of the motto
  clock: [1.35, 2.5, 0.03] as V3,
  windows: { x: [-3.2, -1.85], x2: [1.85, 3.2], y0: 0.9, y1: 2.4 }, // louvred windows either side of the board
  teacher: { x0: -3.1, x1: -1.9, z0: 1.0, z1: 1.65, top: 0.75 }, // teacher's desk, front left
  aisle: 1.15, // desks stand at |x| > 1.15 from z 3.6 back
  rows: [3.6, 4.6, 5.6, 6.6, 7.6],
  cols: [1.55, 2.3, 3.05], // desk centres at ±these x
  fans: [[-1.8, 2.72, 3.6], [1.8, 2.72, 3.6], [-1.8, 2.72, 9.8], [1.8, 2.72, 9.8]] as V3[], // kept clear of the corner cameras
  door: { z: 2.0, w: 0.9, h: 2.0 }, // on the right wall (x 3.6)
  actorZone: { x: [-1.4, 1.4], z: [1.6, 3.2] }, // and the aisle x ±0.8 back to z 6
};

/** Room light per time; "day" is the default. */
const SCHOOL_LIGHT: Record<TimeOfDay, { amb: string; ambI: number; hemi: [string, string, number]; sun: string; sunI: number; lamp: number }> = {
  day: { amb: "#f2f0ea", ambI: 1.15, hemi: ["#f4f8ff", "#8a8070", 0.8], sun: "#fff6e4", sunI: 1.6, lamp: 0 },
  morning: { amb: "#f2e8dc", ambI: 1.05, hemi: ["#fff0e0", "#8a7a68", 0.75], sun: "#ffd8a8", sunI: 1.8, lamp: 0 },
  evening: { amb: "#e6d4c4", ambI: 0.8, hemi: ["#f0d0b8", "#6a5a50", 0.6], sun: "#ffa868", sunI: 1.3, lamp: 0.85 },
  night: { amb: "#c4c4d8", ambI: 0.62, hemi: ["#c8d0ec", "#4a4440", 0.42], sun: "#8fa8ff", sunI: 0.2, lamp: 1 },
};

const board = (seed: number, green: boolean) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  const W = 1024, H = 400;
  c.fillStyle = green ? "#2f4a3a" : "#24302c";
  c.fillRect(0, 0, W, H);
  for (let i = 0; i < 400; i++) {
    c.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`;
    c.fillRect(r() * W, r() * H, 10 + r() * 60, 2 + r() * 6);
  }
  const days = ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์"];
  const subjects = [
    { t: "วิชาภาษาไทย", lines: ["มาตราตัวสะกด แม่กก", "นก  ปาก  มาก  จาก"] },
    { t: "วิชาคณิตศาสตร์", lines: ["12 + 35 = 47", "8 x 7 = 56"] },
    { t: "วิชาวิทยาศาสตร์", lines: ["พืชต้องการ น้ำ แสง อากาศ", "การสังเคราะห์แสง"] },
    { t: "วิชาสังคมศึกษา", lines: ["ภาคเหนือ ภาคกลาง ภาคใต้", "ภาคตะวันออกเฉียงเหนือ"] },
  ];
  const s = subjects[Math.floor(r() * subjects.length)];
  c.fillStyle = "rgba(248,248,240,0.92)";
  c.textBaseline = "middle";
  c.textAlign = "left";
  c.font = "700 46px Kanit";
  c.fillText(`${days[Math.floor(r() * days.length)]}ที่ ${1 + Math.floor(r() * 28)}`, 40, 56);
  c.textAlign = "center";
  c.font = "700 76px Kanit";
  c.fillStyle = "rgba(255,236,150,0.95)";
  c.fillText(s.t, W / 2, 150);
  c.fillStyle = "rgba(248,248,240,0.9)";
  c.font = "700 60px Kanit";
  s.lines.forEach((l, i) => c.fillText(l, W / 2, 244 + i * 80, W - 80));
  c.strokeStyle = "rgba(255,236,150,0.8)";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(W / 2 - 220, 192);
  c.lineTo(W / 2 + 220, 192);
  c.stroke();
};

const thaiFlag = (c: CanvasRenderingContext2D) => {
  // red, white, blue (double), white, red
  const H = 120;
  const band = H / 6;
  [["#c8202a", 0, 1], ["#f4f4f4", 1, 1], ["#23305e", 2, 2], ["#f4f4f4", 4, 1], ["#c8202a", 5, 1]].forEach(([col, y, h]) => {
    c.fillStyle = col as string;
    c.fillRect(0, (y as number) * band, 180, (h as number) * band);
  });
};

const louvres = (time: TimeOfDay, seed: number, field: boolean) => (c: CanvasRenderingContext2D) => {
  const kit = KITS[time];
  const W = 256, H = 320;
  paintSky(c, W, H, kit, seed);
  const r = rng(seed);
  const dim = time === "night" ? 0.25 : time === "evening" ? 0.7 : time === "morning" ? 0.9 : 1;
  const col = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l * dim}%)`;
  if (field) {
    // trees on the far side, the field, a goalpost
    for (let i = 0; i < 9; i++) {
      c.fillStyle = col(110 + r() * 20, 35, 30 + r() * 10);
      c.beginPath();
      c.arc(r() * W, H * 0.5, 18 + r() * 24, 0, 7);
      c.fill();
    }
    c.fillStyle = col(95, 45, 48);
    c.fillRect(0, H * 0.52, W, H * 0.48);
    c.fillStyle = col(0, 0, 92);
    c.fillRect(W * 0.3, H * 0.4, 4, H * 0.14);
    c.fillRect(W * 0.62, H * 0.4, 4, H * 0.14);
    c.fillRect(W * 0.3, H * 0.4, W * 0.32 + 4, 4);
  } else {
    c.fillStyle = col(40, 15, 70);
    c.fillRect(0, H * 0.45, W, H * 0.55);
    c.fillStyle = col(30, 20, 55);
    for (let x = 10; x < W; x += 50) c.fillRect(x, H * 0.45, 8, H * 0.55);
  }
  // glass louvre slats
  for (let y = 6; y < H; y += 22) {
    c.fillStyle = "rgba(230,240,245,0.22)";
    c.fillRect(0, y, W, 14);
    c.fillStyle = "rgba(60,70,80,0.45)";
    c.fillRect(0, y + 14, W, 3);
  }
};

const terrazzo = (seed: number, base: string) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  c.fillStyle = base;
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "60,60,60" : "255,255,255"},${0.12 + r() * 0.2})`;
    c.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3);
  }
  c.strokeStyle = "rgba(70,70,70,0.3)";
  c.lineWidth = 2;
  c.strokeRect(0, 0, 256, 256);
};

const Desk: React.FC<{ p: V3; wood: string; metal: string; chair: number; bag: string | null; book: string | null }> = ({ p, wood, metal, chair, bag, book }) => (
  <group position={p}>
    {/* desk: top 0.6 x 0.45 at 0.72, steel frame, shelf */}
    <B p={[0, 0.71, 0]} s={[0.6, 0.03, 0.45]} c={wood} />
    <B p={[0, 0.58, -0.02]} s={[0.56, 0.02, 0.38]} c={shade(wood, 0.85)} sh={false} />
    {[-0.27, 0.27].map((x) => <B key={x} p={[x, 0.35, 0]} s={[0.025, 0.7, 0.4]} c={metal} sh={false} />)}
    {book ? <B p={[0.08, 0.735, 0.02]} s={[0.22, 0.02, 0.28]} r={[0, 0.2, 0]} c={book} sh={false} /> : null}
    {/* chair behind the desk (towards +z), pushed in or askew */}
    <group position={[chair * 0.08, 0, 0.42 + Math.abs(chair) * 0.1]} rotation={[0, chair * 0.25, 0]}>
      <B p={[0, 0.43, 0]} s={[0.4, 0.025, 0.38]} c={wood} />
      <B p={[0, 0.72, 0.18]} s={[0.4, 0.18, 0.02]} c={wood} />
      {[-0.18, 0.18].map((x) => <B key={x} p={[x, 0.21, 0]} s={[0.02, 0.42, 0.34]} c={metal} sh={false} />)}
      <B p={[0, 0.6, 0.18]} s={[0.36, 0.34, 0.02]} c={metal} sh={false} />
      {bag ? <B p={[0, 0.62, 0.24]} s={[0.3, 0.34, 0.12]} c={bag} /> : null}
    </group>
  </group>
);

export const School: React.FC<{ seed: number; time?: TimeOfDay; frame?: number; blobs?: Blob[] }> = ({ seed, time = "day", frame = 0, blobs = [] }) => {
  const S = SCHOOL;
  const W2 = S.halfW * 2;
  const D = 12;
  const LT = SCHOOL_LIGHT[time];
  const lampOn = LT.lamp > 0;
  const fontReady = useKanit();
  const L = useMemo(() => {
    const r = rng(seed * 557 + 31);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const upper = pick(["#f2ecd8", "#e8ecdc", "#f0e4cc", "#e4ecf0", "#f4f0e4"]);
    const lower = pick(["#5a8a6a", "#4a6a8a", "#8a6a4a", "#6a8a9a", "#a87a5a"]);
    const wood = pick(["#c8965a", "#b07a48", "#d8a868", "#a86a40"]);
    const metal = pick(["#4a5a6a", "#2a5a8a", "#3a6a4a", "#5a4a3a"]);
    const desks = S.rows.flatMap((z, ri) =>
      [-1, 1].flatMap((side) =>
        S.cols.map((x) => ({
          p: [side * x + (r() - 0.5) * 0.06, 0, z + (r() - 0.5) * 0.08] as V3,
          chair: r() < 0.3 ? (r() - 0.5) * 2 : 0,
          bag: r() < 0.35 ? pick(["#2a3a6a", "#c0302a", "#3a6a4a", "#2a2a2c", "#e8b030", "#e86a8a"]) : null,
          book: r() < 0.4 ? pick(["#f2f0e8", "#3f7aba", "#e86a2a", "#5aa05a"]) : null,
          ri,
        })),
      ),
    );
    return {
      upper, lower, wood, metal, desks,
      green: r() < 0.6,
      floor: pick(["#c8c0b0", "#b8b4a8", "#d0c4b0", "#a8a8a0"]),
      boardSeed: Math.floor(r() * 1e6),
      motto: pick(["ขยัน อดทน ซื่อสัตย์", "รักการอ่าน ใฝ่เรียนรู้", "มีวินัย ใฝ่ดี", "ความรู้คู่คุณธรรม"]),
      mottoBg: pick(["#1f3f6a", "#7a1f2a", "#2a5a3a"]),
      bin: pick(["#2f6fb0", "#3f9a5a", "#e8b030"]),
      notice: Array.from({ length: 6 }).map(() => pick(["#f2f0e8", "#f2d23a", "#e8a0b0", "#a8d0e8", "#c8e8a0"])),
    };
  }, [seed, S]);

  const tx = useMemo(() => {
    const floor = makeTex(256, 256, terrazzo(seed + 3, L.floor), [W2 / 0.6, D / 0.6]);
    const boardT = makeTex(1024, 400, board(L.boardSeed, L.green));
    const flag = makeTex(180, 120, thaiFlag);
    const motto = makeTex(512, 128, (c) => {
      c.fillStyle = L.mottoBg;
      c.fillRect(0, 0, 512, 128);
      c.strokeStyle = "#e8c84a";
      c.lineWidth = 6;
      c.strokeRect(10, 10, 492, 108);
      c.fillStyle = "#ffffff";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = "700 58px Kanit";
      c.fillText(L.motto, 256, 66, 470);
    });
    const clock = makeTex(128, 128, (c) => {
      c.fillStyle = "#fbfaf4";
      c.beginPath();
      c.arc(64, 64, 62, 0, 7);
      c.fill();
      c.fillStyle = "#2a2a2a";
      for (let i = 0; i < 12; i++) c.fillRect(64 + Math.sin((i / 6) * Math.PI) * 50 - 2, 64 - Math.cos((i / 6) * Math.PI) * 50 - 5, 4, 10);
    });
    return { floor, boardT, flag, motto, clock };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, L, W2, fontReady]);
  const views = useMemo(() => ({ field: makeTex(256, 320, louvres(time, seed + 21, true)), hall: makeTex(256, 320, louvres(time, seed + 22, false)) }), [time, seed]);

  const bd = S.board;
  const t = frame / 30;
  const Window: React.FC<{ p: V3; w: number; ry: number; field: boolean; blades?: boolean }> = ({ p, w, ry, field, blades }) => {
    const h = S.windows.y1 - S.windows.y0;
    return (
      <group position={p} rotation={[0, ry, 0]}>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={field ? views.field : views.hall} toneMapped={false} />
        </mesh>
        {/* steel frame, mullions and louvre blades */}
        {[-1, 1].map((k) => <B key={k} p={[(k * w) / 2, 0, 0.03]} s={[0.05, h + 0.05, 0.05]} c="#e8e8e2" sh={false} />)}
        {[-1, 1].map((k) => <B key={k} p={[0, (k * h) / 2, 0.03]} s={[w + 0.05, 0.05, 0.06]} c="#e8e8e2" sh={false} />)}
        <B p={[0, 0, 0.03]} s={[0.04, h, 0.04]} c="#e8e8e2" sh={false} />
        {(blades ? Array.from({ length: Math.floor(h / 0.11) }) : []).map((_, i) => (
          <B key={i} p={[0, -h / 2 + 0.07 + i * 0.11, 0.05]} s={[w - 0.04, 0.008, 0.08]} r={[-0.6, 0, 0]} c="#d0dce0" sh={false} />
        ))}
        {/* iron grille */}
        {(blades ? Array.from({ length: Math.max(2, Math.round(w / 0.25)) }) : []).map((_, i, a) => <B key={i} p={[-w / 2 + (w / (a.length + 1)) * (i + 1), 0, 0.09]} s={[0.015, h, 0.015]} c="#4a4a48" sh={false} />)}
      </group>
    );
  };

  return (
    <>
      <ambientLight color={LT.amb} intensity={LT.ambI} />
      <hemisphereLight args={LT.hemi} />
      {/* daylight through the left windows: aimed through the origin */}
      <directionalLight
        position={[-8, 5, 2]}
        intensity={LT.sunI}
        color={LT.sun}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.001}
      />
      <directionalLight position={[2, 4, 9]} intensity={0.35 * LT.ambI} color="#f0f0f4" />
      {lampOn ? [[-1.6, 2.9, 2.0], [1.6, 2.9, 2.0], [0, 2.9, 6]].map((p, i) => <pointLight key={i} position={p as V3} color="#f6faff" intensity={6 * LT.lamp} distance={8} decay={1.3} />) : null}

      {/* floor, ceiling, walls with a painted dado */}
      <mesh position={[0, 0, D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W2, D]} />
        <meshLambertMaterial map={tx.floor} />
      </mesh>
      <mesh position={[0, S.ceiling, D / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W2, D]} />
        <meshLambertMaterial color="#f4f2ec" />
      </mesh>
      <mesh position={[0, S.ceiling / 2, 0]} receiveShadow>
        <planeGeometry args={[W2, S.ceiling]} />
        <meshLambertMaterial color={L.upper} />
      </mesh>
      <B p={[0, 0.45, 0.005]} s={[W2, 0.9, 0.01]} c={L.lower} sh={false} />
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={[k * S.halfW, S.ceiling / 2, D / 2]} rotation={[0, -k * Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[D, S.ceiling]} />
            <meshLambertMaterial color={L.upper} />
          </mesh>
          <B p={[k * (S.halfW - 0.005), 0.45, D / 2]} s={[0.01, 0.9, D]} c={L.lower} sh={false} />
        </group>
      ))}

      {/* chalkboard with writing, chalk ledge, motto, flag, clock */}
      <B p={[(bd.x0 + bd.x1) / 2, (bd.y0 + bd.y1) / 2, 0.02]} s={[bd.x1 - bd.x0 + 0.12, bd.y1 - bd.y0 + 0.12, 0.04]} c="#8a6a48" sh={false} />
      <mesh position={[(bd.x0 + bd.x1) / 2, (bd.y0 + bd.y1) / 2, 0.045]}>
        <planeGeometry args={[bd.x1 - bd.x0, bd.y1 - bd.y0]} />
        <meshLambertMaterial map={tx.boardT} />
      </mesh>
      <B p={[(bd.x0 + bd.x1) / 2, bd.y0 - 0.06, 0.08]} s={[bd.x1 - bd.x0, 0.03, 0.08]} c="#8a6a48" sh={false} />
      {[0.3, -0.6, 1.1].map((x, k) => <B key={x} p={[x, bd.y0 - 0.035, 0.08]} s={[0.07, 0.015, 0.015]} c={k === 1 ? "#f2d23a" : "#f4f4ee"} sh={false} />)}
      <B p={[S.motto[0], S.motto[1], 0.015]} s={[1.48, 0.42, 0.03]} c="#c8a040" sh={false} />
      <mesh position={[S.motto[0], S.motto[1], 0.035]}>
        <planeGeometry args={[1.4, 0.35]} />
        <meshLambertMaterial map={tx.motto} />
      </mesh>
      <group position={S.flag}>
        <Rod a={[0, -0.1, 0.02]} b={[0.25, 0.35, 0.3]} r={0.012} c="#c8a040" sh={false} />
        <mesh position={[0.25 + 0.3, 0.35 - 0.2, 0.3]} rotation={[0, -0.25, Math.sin(t * 0.6) * 0.02]}>
          <planeGeometry args={[0.6, 0.4]} />
          <meshLambertMaterial map={tx.flag} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group position={S.clock}>
        <mesh>
          <circleGeometry args={[0.16, 20]} />
          <meshLambertMaterial map={tx.clock} />
        </mesh>
        <B p={[0, 0.04, 0.01]} s={[0.012, 0.09, 0.005]} c="#2a2a2a" sh={false} />
        <B p={[0.045, 0, 0.012]} s={[0.1, 0.01, 0.005]} r={[0, 0, 0.3]} c="#2a2a2a" sh={false} />
        <mesh position={[0, 0, -0.005]}>
          <ringGeometry args={[0.16, 0.18, 20]} />
          <meshLambertMaterial color="#2a2a2a" />
        </mesh>
      </group>

      {/* louvred windows: either side of the board, along the left wall (field) and right wall (corridor) */}
      {[S.windows.x, S.windows.x2].map(([a, b], k) => (
        <Window key={k} p={[(a + b) / 2, (S.windows.y0 + S.windows.y1) / 2, 0]} w={b - a} ry={0} field={k === 0} blades />
      ))}
      {[1.2, 3.6, 6.0, 8.4].map((z) => (
        <Window key={z} p={[-S.halfW + 0.005, (S.windows.y0 + S.windows.y1) / 2, z + 0.9]} w={1.8} ry={Math.PI / 2} field />
      ))}
      {[4.4, 6.8, 9.2].map((z) => (
        <Window key={z} p={[S.halfW - 0.005, (S.windows.y0 + S.windows.y1) / 2, z]} w={1.6} ry={-Math.PI / 2} field={false} />
      ))}
      {/* door on the right wall, front */}
      <group position={[S.halfW, 0, S.door.z]}>
        <B p={[-0.025, S.door.h / 2, 0]} s={[0.04, S.door.h, S.door.w]} c={shade(L.wood, 0.75)} sh={false} />
        <B p={[-0.03, S.door.h + 0.04, 0]} s={[0.05, 0.08, S.door.w + 0.14]} c="#e8e8e2" sh={false} />
        <B p={[-0.07, 1.0, -S.door.w / 2 + 0.1]} s={[0.04, 0.04, 0.1]} c="#c8c8c0" sh={false} />
      </group>

      {/* teacher's desk and chair, front left */}
      <group>
        {(() => {
          const T = S.teacher;
          const cx = (T.x0 + T.x1) / 2;
          const cz = (T.z0 + T.z1) / 2;
          return (
            <>
              <B p={[cx, T.top - 0.02, cz]} s={[T.x1 - T.x0, 0.04, T.z1 - T.z0]} c={L.wood} />
              <B p={[cx, T.top / 2, T.z1 - 0.03]} s={[T.x1 - T.x0 - 0.04, T.top - 0.04, 0.03]} c={shade(L.wood, 0.85)} />
              {[T.x0 + 0.03, T.x1 - 0.03].map((x) => <B key={x} p={[x, T.top / 2, cz]} s={[0.04, T.top, T.z1 - T.z0]} c={shade(L.wood, 0.8)} />)}
              <B p={[cx - 0.25, T.top + 0.04, cz]} s={[0.3, 0.06, 0.22]} r={[0, 0.2, 0]} c="#3f7aba" sh={false} />
              <B p={[cx + 0.25, T.top + 0.02, cz + 0.05]} s={[0.24, 0.02, 0.32]} r={[0, -0.1, 0]} c="#f2f0e8" sh={false} />
              <mesh position={[cx + 0.45, T.top + 0.05, cz - 0.12]}>
                <cylinderGeometry args={[0.035, 0.035, 0.1, 8]} />
                <meshLambertMaterial color="#e8e4dc" />
              </mesh>
              <group position={[cx, 0, T.z0 - 0.35]} rotation={[0, Math.PI, 0]}>
                <B p={[0, 0.45, 0]} s={[0.44, 0.04, 0.42]} c={L.wood} />
                <B p={[0, 0.75, 0.2]} s={[0.44, 0.5, 0.03]} c={L.wood} />
              </group>
            </>
          );
        })()}
      </group>
      {/* notice board on the left wall near the front, rubbish bin, broom */}
      <B p={[-S.halfW + 0.02, 1.55, 2.6]} s={[0.03, 0.8, 1.2]} c="#b88a5a" sh={false} />
      {L.notice.map((c, i) => <B key={i} p={[-S.halfW + 0.04, 1.75 - Math.floor(i / 3) * 0.38, 2.2 + (i % 3) * 0.4]} s={[0.01, 0.28, 0.3]} r={[(i % 2 ? 1 : -1) * 0.06, 0, 0]} c={c} sh={false} />)}
      <mesh position={[3.2, 0.22, 0.4]}>
        <cylinderGeometry args={[0.18, 0.15, 0.44, 10]} />
        <meshLambertMaterial color={L.bin} />
      </mesh>
      <Rod a={[3.35, 0, 0.12]} b={[3.45, 1.2, 0.05]} r={0.012} c="#c89a5a" />

      {/* desks and chairs either side of the aisle */}
      {L.desks.map((d, i) => <Desk key={i} p={d.p} wood={L.wood} metal={L.metal} chair={d.chair} bag={d.bag} book={d.book} />)}

      {/* ceiling fans and tube lights */}
      {S.fans.map((p, i) => (
        <group key={i} position={p}>
          <Rod a={[0, 0.08, 0]} b={[0, S.ceiling - p[1], 0]} r={0.012} c="#e8e8e2" sh={false} />
          <mesh>
            <cylinderGeometry args={[0.1, 0.09, 0.12, 10]} />
            <meshLambertMaterial color="#e8e8e2" />
          </mesh>
          <group rotation={[0, t * 9 + i, 0]}>
            {[0, 1, 2].map((k) => (
              <B key={k} p={[Math.cos((k * Math.PI * 2) / 3) * 0.42, -0.02, Math.sin((k * Math.PI * 2) / 3) * 0.42]} s={[0.66, 0.012, 0.12]} r={[0.08, -(k * Math.PI * 2) / 3, 0]} c="#dcdcd4" sh={false} />
            ))}
          </group>
        </group>
      ))}
      {[[-1.6, 2.0], [1.6, 2.0], [-1.6, 5.4], [1.6, 5.4]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, S.ceiling - 0.03, z]}>
          <B p={[0, 0, 0]} s={[1.25, 0.05, 0.12]} c="#e8e8e4" sh={false} />
          <Lit p={[0, -0.04, 0]} s={[1.2, 0.03, 0.03]} c={lampOn ? "#f8fcff" : "#dcdcd8"} />
        </group>
      ))}

      <Blobs blobs={blobs} y={0.01} c="#3a3430" o={0.22} />
    </>
  );
};
