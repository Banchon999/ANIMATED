import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { continueRender, delayRender } from "remotion";
import { rng } from "./lib";
import { useKanit } from "./SetKit";

// Story paper artwork, drawn once on a canvas with Kanit and shared by the 3D paper props (Props.tsx, as a
// texture) and the hand-held items of the 2D actors (Held.tsx, as an SVG image), so a close-up of a prop and
// the same paper in a hand always match. Nothing real: no hospital name, no real person.

export type PaperKind = "slip" | "drawing" | "notebook" | "letter";
/** Real size in metres (width, height of the sheet as it is read). notebook = the open two-page spread. */
export const PAPER_SIZE: Record<PaperKind, [number, number]> = {
  slip: [0.148, 0.21], // A5
  drawing: [0.297, 0.21], // A4 landscape
  notebook: [0.3, 0.21], // two 15 x 21 cm pages
  letter: [0.15, 0.21],
};
const PPM = 5000; // canvas pixels per metre: sharp enough for a full-frame close-up

const graphemes = (s: string) => {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  return Seg ? Array.from(new Seg("th", { granularity: "grapheme" }).segment(s), (x) => x.segment) : Array.from(s);
};

/** Handwriting: each grapheme cluster slightly turned, lifted and resized. jit 0 = neat, 1 = a child's hand. */
const hand = (c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, r: () => number, jit = 0.3, weight = 500) => {
  c.fillStyle = color;
  c.textBaseline = "alphabetic";
  let cx = x;
  for (const g of graphemes(text)) {
    const s = size * (1 + (r() - 0.5) * 0.22 * jit);
    c.font = `${weight} ${s}px Kanit`;
    const w = c.measureText(g).width;
    c.save();
    c.translate(cx, y + (r() - 0.5) * size * 0.16 * jit);
    c.rotate((r() - 0.5) * 0.22 * jit);
    c.fillText(g, 0, 0);
    if (jit > 0.6) c.fillText(g, 1.5, 0.8); // crayon: a second, slightly offset pass
    c.restore();
    cx += w * (1 + (r() - 0.5) * 0.12 * jit) + (g === " " ? size * 0.05 : 0);
  }
  return cx;
};
/** Crayon stroke: a wobbly polyline drawn three times with low alpha. */
const crayon = (c: CanvasRenderingContext2D, pts: [number, number][], color: string, w: number, r: () => number, close = false) => {
  c.strokeStyle = color;
  c.lineCap = "round";
  c.lineJoin = "round";
  for (let k = 0; k < 3; k++) {
    c.globalAlpha = 0.55;
    c.lineWidth = w * (0.8 + r() * 0.4);
    c.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = x + (r() - 0.5) * w * 0.9, jy = y + (r() - 0.5) * w * 0.9;
      if (i) c.lineTo(jx, jy);
      else c.moveTo(jx, jy);
    });
    if (close) c.closePath();
    c.stroke();
  }
  c.globalAlpha = 1;
};
/** Crayon fill: dense hatching clipped to a path. */
const hatch = (c: CanvasRenderingContext2D, path: Path2D, color: string, r: () => number, step = 9, angle = -0.5) => {
  c.save();
  c.clip(path);
  c.strokeStyle = color;
  c.globalAlpha = 0.5;
  c.lineWidth = step * 0.9;
  c.lineCap = "round";
  const n = 260;
  for (let i = -n; i < n; i++) {
    const o = i * step + (r() - 0.5) * step * 0.6;
    c.beginPath();
    c.moveTo(o - Math.cos(angle) * 3000, -Math.sin(angle) * 3000 + o * 0.0);
    c.lineTo(o + Math.cos(angle) * 3000, Math.sin(angle) * 3000);
    c.stroke();
  }
  c.restore();
  c.globalAlpha = 1;
};
const paperGrain = (c: CanvasRenderingContext2D, w: number, h: number, base: string, r: () => number) => {
  c.fillStyle = base;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = r() < 0.5 ? "rgba(120,100,70,0.05)" : "rgba(255,255,255,0.08)";
    c.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 6);
  }
};

const drawSlip = (c: CanvasRenderingContext2D, W: number, H: number) => {
  const r = rng(4021);
  paperGrain(c, W, H, "#fbfaf4", r);
  const u = W / 148; // px per mm
  // printed header: plain cross emblem, no hospital name
  c.fillStyle = "#2a6a9a";
  c.fillRect(0, 0, W, 34 * u);
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(18 * u, 17 * u, 10 * u, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#2a6a9a";
  c.fillRect(16.2 * u, 10.5 * u, 3.6 * u, 13 * u);
  c.fillRect(11.5 * u, 15.2 * u, 13 * u, 3.6 * u);
  c.fillStyle = "#ffffff";
  c.font = `800 ${11.5 * u}px Kanit`;
  c.fillText("ใบนัดพบแพทย์", 33 * u, 18.5 * u);
  c.font = `500 ${5.6 * u}px Kanit`;
  c.fillText("แผนกผู้ป่วยนอก · โปรดนำใบนี้มาทุกครั้ง", 33 * u, 28 * u);
  // form lines with handwritten entries
  const rows: [string, string][] = [
    ["ชื่อ-สกุล", "นางมาลี ศรีสุข"],
    ["HN", "48-1123"],
    ["วันที่นัด", "15 ธ.ค."],
    ["เวลา", "09.00 น."],
    ["แผนก", "อายุรกรรม"],
    ["พบแพทย์", "ตรวจเลือดก่อนพบ"],
  ];
  let y = 54 * u;
  for (const [label, val] of rows) {
    c.fillStyle = "#3a3a40";
    c.font = `700 ${6.6 * u}px Kanit`;
    c.fillText(label, 10 * u, y);
    const lx = 10 * u + c.measureText(label).width + 3 * u;
    c.strokeStyle = "#9a9aa4";
    c.lineWidth = 0.35 * u;
    c.setLineDash([1.2 * u, 1.2 * u]);
    c.beginPath();
    c.moveTo(lx, y + 1.2 * u);
    c.lineTo(138 * u, y + 1.2 * u);
    c.stroke();
    c.setLineDash([]);
    hand(c, val, lx + 3 * u, y - 0.4 * u, 8.2 * u, "#1f3f9a", r, 0.35);
    y += 15 * u;
  }
  // printed note box
  c.strokeStyle = "#2a6a9a";
  c.lineWidth = 0.5 * u;
  c.strokeRect(10 * u, 158 * u, 128 * u, 22 * u);
  c.fillStyle = "#2a6a9a";
  c.font = `500 ${5.2 * u}px Kanit`;
  c.fillText("งดน้ำและอาหารหลังเที่ยงคืน", 14 * u, 166.5 * u);
  c.fillText("กรุณามาก่อนเวลานัด 30 นาที", 14 * u, 175 * u);
  // signature
  c.strokeStyle = "#1f3f9a";
  c.lineWidth = 0.6 * u;
  c.beginPath();
  c.moveTo(80 * u, 197 * u);
  c.bezierCurveTo(88 * u, 186 * u, 92 * u, 200 * u, 99 * u, 191 * u);
  c.bezierCurveTo(104 * u, 185 * u, 108 * u, 199 * u, 118 * u, 192 * u);
  c.stroke();
  c.fillStyle = "#3a3a40";
  c.font = `500 ${4.8 * u}px Kanit`;
  c.fillText("ผู้นัด", 70 * u, 201 * u);
  // round rubber stamp, a little crooked and faded
  c.save();
  c.translate(114 * u, 148 * u);
  c.rotate(-0.28);
  c.globalAlpha = 0.72;
  c.strokeStyle = "#c8283a";
  c.fillStyle = "#c8283a";
  c.lineWidth = 1.3 * u;
  c.beginPath();
  c.arc(0, 0, 17 * u, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 0.5 * u;
  c.beginPath();
  c.arc(0, 0, 13.5 * u, 0, Math.PI * 2);
  c.stroke();
  c.font = `800 ${7.2 * u}px Kanit`;
  c.textAlign = "center";
  c.fillText("นัดแล้ว", 0, 1.2 * u);
  c.font = `700 ${4 * u}px Kanit`;
  c.fillText("15 ธ.ค.", 0, 7.6 * u);
  c.textAlign = "left";
  c.restore();
  c.globalAlpha = 1;
};

const drawDrawing = (c: CanvasRenderingContext2D, W: number, H: number) => {
  const r = rng(7313);
  paperGrain(c, W, H, "#fdfcf6", r);
  const u = W / 297;
  const P = (x: number, y: number): [number, number] => [x * u, y * u];
  // sun in the corner with rays
  const sun = new Path2D();
  sun.arc(38 * u, 36 * u, 18 * u, 0, Math.PI * 2);
  hatch(c, sun, "#f4c21a", r, 2.2 * u, -0.6);
  crayon(c, Array.from({ length: 21 }, (_, i) => P(38 + Math.cos((i / 20) * Math.PI * 2) * 18, 36 + Math.sin((i / 20) * Math.PI * 2) * 18)), "#e89a10", 1.6 * u, r);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    crayon(c, [P(38 + Math.cos(a) * 23, 36 + Math.sin(a) * 23), P(38 + Math.cos(a) * 33, 36 + Math.sin(a) * 33)], "#e8a812", 1.5 * u, r);
  }
  // cloud
  crayon(c, [P(120, 30), P(128, 20), P(140, 22), P(148, 16), P(160, 24), P(166, 32), P(150, 36), P(130, 36), P(120, 30)], "#6aa8e8", 1.3 * u, r);
  // ground
  const ground = new Path2D();
  ground.moveTo(0, 168 * u);
  ground.bezierCurveTo(80 * u, 160 * u, 200 * u, 172 * u, 297 * u, 164 * u);
  ground.lineTo(297 * u, 210 * u);
  ground.lineTo(0, 210 * u);
  ground.closePath();
  hatch(c, ground, "#52b03a", r, 2.6 * u, 0.2);
  for (let i = 0; i < 26; i++) {
    const x = 6 + i * 11.3 + r() * 4;
    crayon(c, [P(x, 168 - (x > 150 ? 2 : 0)), P(x + 2, 158)], "#3a9a2a", 1.0 * u, r);
  }
  // house: walls, red roof, door, window
  const walls = new Path2D();
  walls.rect(200 * u, 104 * u, 66 * u, 62 * u);
  hatch(c, walls, "#c8884a", r, 2.4 * u, 1.1);
  crayon(c, [P(200, 104), P(266, 104), P(266, 166), P(200, 166), P(200, 104)], "#8a4a1a", 1.4 * u, r);
  const roof = new Path2D();
  roof.moveTo(192 * u, 106 * u);
  roof.lineTo(233 * u, 70 * u);
  roof.lineTo(274 * u, 106 * u);
  roof.closePath();
  hatch(c, roof, "#e0302a", r, 2.2 * u, -0.3);
  crayon(c, [P(192, 106), P(233, 70), P(274, 106), P(192, 106)], "#b01818", 1.4 * u, r);
  const door = new Path2D();
  door.rect(225 * u, 132 * u, 16 * u, 34 * u);
  hatch(c, door, "#6a3a1a", r, 2 * u, 0.9);
  crayon(c, [P(207, 116), P(220, 116), P(220, 128), P(207, 128), P(207, 116)], "#2a6ac8", 1.2 * u, r);
  crayon(c, [P(213.5, 116), P(213.5, 128)], "#2a6ac8", 0.9 * u, r);
  // a flower
  crayon(c, [P(176, 170), P(176, 150)], "#3a9a2a", 1.0 * u, r);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const pet = new Path2D();
    pet.arc((176 + Math.cos(a) * 4.5) * u, (146 + Math.sin(a) * 4.5) * u, 3.4 * u, 0, Math.PI * 2);
    hatch(c, pet, "#e84a9a", r, 1.4 * u, 0.4);
  }
  // mother: long hair, triangle dress, arms; little girl: pigtails; holding hands
  const person = (cx: number, top: number, s: number, dress: string, hair: string, pig: boolean) => {
    const head = new Path2D();
    head.arc(cx * u, (top + 10 * s) * u, 10 * s * u, 0, Math.PI * 2);
    hatch(c, head, "#f2c8a0", r, 1.6 * u, 0.3);
    crayon(c, Array.from({ length: 17 }, (_, i) => P(cx + Math.cos((i / 16) * Math.PI * 2) * 10 * s, top + 10 * s + Math.sin((i / 16) * Math.PI * 2) * 10 * s)), "#a8683a", 1.0 * u, r);
    // hair
    if (pig) {
      crayon(c, [P(cx - 10 * s, top + 8 * s), P(cx - 4 * s, top + 1 * s), P(cx + 4 * s, top + 1 * s), P(cx + 10 * s, top + 8 * s)], hair, 2.2 * u, r);
      for (const k of [-1, 1]) crayon(c, [P(cx + k * 10 * s, top + 8 * s), P(cx + k * 17 * s, top + 4 * s), P(cx + k * 18 * s, top + 14 * s)], hair, 2.4 * u, r);
    } else {
      crayon(c, [P(cx - 11 * s, top + 26 * s), P(cx - 12 * s, top + 6 * s), P(cx - 4 * s, top - 0.5 * s), P(cx + 4 * s, top - 0.5 * s), P(cx + 12 * s, top + 6 * s), P(cx + 11 * s, top + 26 * s)], hair, 2.6 * u, r);
    }
    // face
    c.fillStyle = "#2a1a10";
    for (const k of [-1, 1]) {
      c.beginPath();
      c.arc((cx + k * 3.6 * s) * u, (top + 8.5 * s) * u, 1.2 * s * u, 0, Math.PI * 2);
      c.fill();
    }
    crayon(c, [P(cx - 4 * s, top + 13 * s), P(cx, top + 15.5 * s), P(cx + 4 * s, top + 13 * s)], "#d02a2a", 0.9 * u, r);
    // dress
    const d = new Path2D();
    d.moveTo(cx * u, (top + 20 * s) * u);
    d.lineTo((cx + 14 * s) * u, (top + 52 * s) * u);
    d.lineTo((cx - 14 * s) * u, (top + 52 * s) * u);
    d.closePath();
    hatch(c, d, dress, r, 2 * u, 0.8);
    crayon(c, [P(cx, top + 20 * s), P(cx + 14 * s, top + 52 * s), P(cx - 14 * s, top + 52 * s), P(cx, top + 20 * s)], dress, 1.2 * u, r);
    // legs
    for (const k of [-1, 1]) crayon(c, [P(cx + k * 5 * s, top + 52 * s), P(cx + k * 5.5 * s, top + 66 * s), P(cx + k * 9 * s, top + 66 * s)], "#5a3a2a", 1.4 * u, r);
  };
  const mx = 92, gx = 140;
  person(mx, 82, 1.25, "#7a3ac8", "#2a1a1a", false);
  person(gx, 112, 0.82, "#f07a2a", "#3a2216", true);
  // arms: mother's free arm, the joined hands, girl's free arm
  crayon(c, [P(mx - 6, 112), P(mx - 22, 130)], "#c8885a", 1.5 * u, r);
  crayon(c, [P(mx + 6, 112), P(116, 132), P(gx - 4, 133)], "#c8885a", 1.5 * u, r);
  crayon(c, [P(gx + 4, 131), P(gx + 16, 142)], "#c8885a", 1.4 * u, r);
  c.fillStyle = "#e8b080";
  c.beginPath();
  c.arc(118 * u, 132.5 * u, 3.2 * u, 0, Math.PI * 2);
  c.fill();
  // a heart between them
  const heart = new Path2D();
  heart.moveTo(116 * u, 100 * u);
  heart.bezierCurveTo(108 * u, 92 * u, 112 * u, 84 * u, 116 * u, 90 * u);
  heart.bezierCurveTo(120 * u, 84 * u, 124 * u, 92 * u, 116 * u, 100 * u);
  hatch(c, heart, "#e0283a", r, 1.4 * u, 0.5);
  // caption in a child's hand: uneven letters in crayon
  hand(c, "แม่กับหนู", 24 * u, 200 * u, 21 * u, "#2a4ac8", r, 1.0, 700);
};

const lined = (c: CanvasRenderingContext2D, x0: number, x1: number, y0: number, H: number, gap: number, u: number, margin?: number) => {
  c.strokeStyle = "rgba(90,130,200,0.42)";
  c.lineWidth = 0.3 * u;
  for (let y = y0; y < H - 4 * u; y += gap) {
    c.beginPath();
    c.moveTo(x0, y);
    c.lineTo(x1, y);
    c.stroke();
  }
  if (margin !== undefined) {
    c.strokeStyle = "rgba(210,70,70,0.55)";
    c.beginPath();
    c.moveTo(margin, 0);
    c.lineTo(margin, H);
    c.stroke();
  }
};

const drawNotebook = (c: CanvasRenderingContext2D, W: number, H: number) => {
  const r = rng(5507);
  paperGrain(c, W, H, "#fbf8ee", r);
  const u = W / 300;
  const gap = 13 * u;
  // two pages, gutter shadow in the middle
  lined(c, 6 * u, 146 * u, 24 * u, H, gap, u, 20 * u);
  lined(c, 154 * u, 294 * u, 24 * u, H, gap, u, 168 * u);
  const g = c.createLinearGradient(140 * u, 0, 160 * u, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, "rgba(60,40,20,0.28)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g;
  c.fillRect(140 * u, 0, 20 * u, H);
  const ink = "#1f3a8a";
  hand(c, "คนในซอยของเรา", 24 * u, 18 * u, 11 * u, ink, r, 0.3, 700);
  c.strokeStyle = ink;
  c.lineWidth = 0.6 * u;
  c.beginPath();
  c.moveTo(24 * u, 19.5 * u);
  c.lineTo(96 * u, 19.2 * u);
  c.stroke();
  const left = ["ป้าแดง - ความดัน", "ลุงหมาน - ชอบแกงเผ็ด", "ยายสาย - เบาหวาน", "น้องมด - แพ้กุ้ง", "ตาเปลี่ยน - ปวดเข่า", "ป้าศรี - ไม่กินเผ็ด", "ลุงทอง - ชอบกาแฟดำ", "ยายบุญ - หูไม่ค่อยดี", "พี่ต้อย - ทำงานกะดึก", "ลุงเสือ - ชอบปลูกผัก", "ยายจันทร์ - อยู่คนเดียว", "ป้านวล - ขายข้าวแกง"];
  left.forEach((s, i) => hand(c, s, 23 * u, 24 * u + gap * (i + 1) - 2.2 * u, 9.6 * u, ink, r, 0.3));
  hand(c, "ต้องจำ", 171 * u, 18 * u, 11 * u, "#b02a2a", r, 0.3, 700);
  const right = ["✓ ซื้อยาให้ยายสาย", "✓ ถามป้าแดงเรื่องหมอ", "- แกงเผ็ดให้ลุงหมาน", "- กับข้าวน้องมดไม่ใส่กุ้ง", "- พาตาเปลี่ยนไปนวด", "- โทรหายายจันทร์ทุกเย็น", "", "วันเกิด", "ป้าศรี 3 มี.ค.", "ลุงทอง 18 มิ.ย.", "ยายบุญ 9 ต.ค."];
  right.forEach((s, i) => {
    if (!s) return;
    const y = 24 * u + gap * (i + 1) - 2.2 * u;
    if (s.startsWith("✓ ")) {
      // ticked: a hand-drawn check mark in green
      c.strokeStyle = "#2a7a3a";
      c.lineWidth = 0.9 * u;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(171 * u, y - 3.5 * u);
      c.lineTo(174 * u, y - 0.5 * u);
      c.lineTo(179 * u, y - 8 * u);
      c.stroke();
      hand(c, s.slice(2), 182 * u, y, 9.6 * u, "#2a6a3a", r, 0.3);
    } else hand(c, s, 171 * u, y, 9.6 * u, ink, r, 0.3);
  });
};

const drawLetter = (c: CanvasRenderingContext2D, W: number, H: number) => {
  const r = rng(6619);
  paperGrain(c, W, H, "#fbf7ea", r);
  const u = W / 150;
  const gap = 10 * u;
  lined(c, 8 * u, 142 * u, 34 * u, H, gap, u);
  // fold creases
  c.fillStyle = "rgba(120,100,70,0.12)";
  c.fillRect(0, 69 * u, W, 0.8 * u);
  c.fillRect(0, 139 * u, W, 0.8 * u);
  const ink = "#2a2a6a";
  hand(c, "ถึง แม่ที่รัก", 12 * u, 26 * u, 9 * u, ink, r, 0.4, 700);
  ["หนูสบายดีนะแม่ ไม่ต้องห่วง", "งานที่นี่เหนื่อยแต่หนูไหว", "เดือนหน้าจะส่งเงินไปให้อีก", "แม่กินยาให้ตรงเวลานะ", "อย่าลืมไปหาหมอตามนัด", "หนูคิดถึงบ้านทุกวันเลย", "ปีใหม่หนูจะกลับไปหา", "", "รักแม่ที่สุด", "      ลูกสาวของแม่"].forEach((s, i) =>
    s && hand(c, s, 14 * u, 34 * u + gap * (i + 1) - 1.8 * u, 7.6 * u, ink, r, 0.4),
  );
};

const DRAW: Record<PaperKind, (c: CanvasRenderingContext2D, w: number, h: number) => void> = { slip: drawSlip, drawing: drawDrawing, notebook: drawNotebook, letter: drawLetter };
const canvases: Partial<Record<PaperKind, HTMLCanvasElement>> = {};
const urls: Partial<Record<PaperKind, string>> = {};
/** The artwork canvas (built once; call only after Kanit is loaded). */
export const paperCanvas = (kind: PaperKind) => {
  if (!canvases[kind]) {
    const [w, h] = PAPER_SIZE[kind];
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * PPM);
    cv.height = Math.round(h * PPM);
    DRAW[kind](cv.getContext("2d")!, cv.width, cv.height);
    canvases[kind] = cv;
  }
  return canvases[kind]!;
};
const paperUrl = (kind: PaperKind) => (urls[kind] ??= paperCanvas(kind).toDataURL("image/jpeg", 0.9));

/** Texture of the artwork for a 3D prop; null until Kanit is ready (the render waits for it). */
export const usePaperTex = (kind: PaperKind) => {
  const ready = useKanit();
  return useMemo(() => {
    if (!ready) return null;
    const t = new THREE.CanvasTexture(paperCanvas(kind));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [ready, kind]);
};

/**
 * The artwork as an SVG image of w x h units, origin at its centre. The frame waits until the image has
 * loaded, so a still never shows a blank sheet.
 */
export const PaperImage: React.FC<{ kind: PaperKind; w: number; h: number; x?: number; y?: number; crop?: [number, number]; mirror?: boolean }> = ({ kind, w, h, x = 0, y = 0, crop = [0, 1], mirror }) => {
  const ready = useKanit();
  const url = ready ? paperUrl(kind) : null;
  const [handle] = useState(() => delayRender(`paper ${kind}`, { timeoutInMilliseconds: 20000 }));
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    continueRender(handle);
  };
  useEffect(() => {
    // safety: never hold a render forever if the load event is missed
    const id = setTimeout(finish, 8000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!url) return null;
  // crop = the part of the sheet shown, as fractions of its width (one page of the open notebook)
  const [W, H] = [1000, 1000];
  return (
    <g transform={mirror ? `translate(${2 * x} 0) scale(-1 1)` : undefined}>
      <svg x={x - w / 2} y={y - h / 2} width={w} height={h} viewBox={`${crop[0] * W} 0 ${(crop[1] - crop[0]) * W} ${H}`} preserveAspectRatio="none" overflow="hidden">
        <image href={url} x={0} y={0} width={W} height={H} preserveAspectRatio="none" onLoad={finish} onError={finish} />
      </svg>
    </g>
  );
};
