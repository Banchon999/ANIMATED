// ui.js: cover card, speech bubbles, end card — Canvas2D overlay at 1080×1920
import { clamp, seg, eo, back } from '/core/lib.js';
import { INK } from './toon.js';

const W = 1080, H = 1920, cv = document.getElementById('ov'), g = cv.getContext('2d');
export async function overlayReady() {
  await Promise.all(['900 120px Kanit', '700 60px Kanit', '500 40px Mitr'].map(f => document.fonts.load(f, 'ตะเกียงยายเงา EP')));
}
let texts = [];
export const TEXTS = () => texts;

function outlined(txt, x, y, size, fill, { weight = 900, stroke = .14, shadow = .07, font = 'Kanit', align = 'center' } = {}) {
  g.font = `${weight} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  g.lineWidth = size * stroke * 2; g.strokeStyle = INK;
  g.save(); g.translate(0, size * shadow); g.strokeText(txt, x, y); g.restore();
  g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y);
  const m = g.measureText(txt), w = m.width;
  return { x0: align === 'center' ? x - w / 2 : x, x1: align === 'center' ? x + w / 2 : x + w, y0: y - size * 1.05, y1: y + size * .35 };
}

function pill(txt, cx, cy, size, a = 1) {
  g.font = `700 ${size}px Kanit`; const w = g.measureText(txt).width + size * 1.4, h = size * 1.55;
  g.globalAlpha = a; g.fillStyle = INK; g.beginPath(); g.roundRect(cx - w / 2, cy - h / 2 + 8, w, h, h / 2); g.fill();
  g.fillStyle = '#c4252a'; g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, cx, cy + size * .06); g.globalAlpha = 1;
  return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
}

// speech bubble anchored to a screen point (tail tip), popping in with a small overshoot
function bubble(id, txt, tip, t, a, b, side = 1) {
  if (t < a || t > b) return;
  const k = t < b - .12 ? back(seg(t, a, a + .18), 2.2) : 1 - seg(t, b - .12, b);
  if (k <= .01) return;
  const size = 60; g.font = `700 ${size}px Kanit`;
  const tw = g.measureText(txt).width, bw = tw + 90, bh = size * 1.9;
  let cx = clamp(tip[0] + side * 120, 90 + bw / 2, W - 90 - bw / 2), cy = clamp(tip[1] - 230, 240 + bh / 2, H - 400);
  g.save(); g.translate(tip[0], tip[1]); g.scale(k, k); g.translate(-tip[0], -tip[1]);
  const p = new Path2D(); p.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, bh / 2);
  const tl = new Path2D(); tl.moveTo(cx - 34 * side + side * 10, cy + bh / 2 - 6); tl.lineTo(tip[0], tip[1]); tl.lineTo(cx + 30 * side + side * 10, cy + bh / 2 - 6); tl.closePath();
  g.fillStyle = INK; g.save(); g.translate(0, 8); g.fill(p); g.fill(tl); g.restore();
  g.lineWidth = 12; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(p); g.stroke(tl);
  g.fillStyle = '#fff'; g.fill(p); g.fill(tl);
  g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, cx, cy + 4);
  g.restore();
  texts.push({ id, text: txt, x0: cx - bw / 2, x1: cx + bw / 2, y0: cy - bh / 2, y1: cy + bh / 2 });
}

export function drawOverlay(t, S) {
  texts = []; g.clearRect(0, 0, W, H);
  // cover card
  if (t < S.coverEnd) {
    const out = 1 - seg(t, S.coverEnd - .25, S.coverEnd), pop = back(seg(t, .1, .45), 2);
    g.globalAlpha = out;
    const r1 = outlined('เงาของใครกัน...', W / 2, 330, 86, '#ffffff');
    g.save(); g.translate(W / 2, 520); g.scale(pop, pop); const r2 = outlined('ตะเกียงยาย', 0, 0, 176, '#ffd23a'); g.restore();
    const r3 = pill('ยายเป็นปอบ · ตอนทดลอง', W / 2, 660, 54, out);
    g.globalAlpha = 1;
    texts.push({ id: 'c1', text: 'เงาของใครกัน...', ...r1 }, { id: 'c2', text: 'ตะเกียงยาย', x0: W / 2 + r2.x0, x1: W / 2 + r2.x1, y0: 520 + r2.y0, y1: 520 + r2.y1 }, { id: 'c3', text: 'ยายเป็นปอบ · ตอนทดลอง', ...r3 });
  }
  for (const B of S.bubbles) bubble(B.id, B.text, B.tip(), t, B.a, B.b, B.side ?? 1);
  // end card
  if (t > S.endA) {
    const k = seg(t, S.endA, S.endA + .3); g.globalAlpha = k;
    g.fillStyle = 'rgba(20,12,8,.45)'; g.fillRect(0, 0, W, H);
    const r = outlined('ติดตามตอนต่อไป', W / 2, 1000, 104, '#ffd23a');
    g.globalAlpha = 1; texts.push({ id: 'end', text: 'ติดตามตอนต่อไป', ...r });
  }
}
