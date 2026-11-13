// toon.js: vector cartoon characters drawn in Canvas2D (thick ink line, round big head, hoodie, tube limbs),
// one canvas per pose, shown as a lit billboard that casts a cut-out shadow.
import * as THREE from 'three';

export const INK = '#22160f';
const CW = 640, CH = 1000, GROUND = 985, PPM = 800;   // canvas px, ground line, px per metre
const LW = 13;                                          // ink line width (px)

export const CAST = {
  yai: { skin: '#f4e8df', shade: '#dccbc0', hood: '#6b4a9e', hoodDk: '#4f3577', headR: 168, hair: 'bun', eyes: 'line', skirt: ['#3a2a5a', '#d9a63a'], scale: 1 },
  dek: { skin: '#f4e8df', shade: '#dccbc0', hood: '#2f6db3', hoodDk: '#22528a', headR: 182, hair: 'boy', eyes: 'dot', scale: 1 },
  pop: { skin: '#c9d0c2', shade: '#aeb6a7', hood: '#e9e4dc', hoodDk: '#c9c2b6', headR: 196, hair: 'ghost', eyes: 'ghost', scale: 1.14 },
};

// default pose; a pose is data, a new pose is a new object
const BASE = { L: [-40, 215], R: [40, 215], bendL: -18, bendR: 18, eyes: null, mouth: 'smile', blink: 0, tilt: 0, lamp: 0, lampOn: 0, sq: 1, horns: 0 };

function rr(x, y, w, h, r) { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }
function fs(c, path, fill, lw = LW) { c.fillStyle = fill; c.fill(path); c.lineWidth = lw; c.strokeStyle = INK; c.stroke(path); }
function circ(x, y, r) { const p = new Path2D(); p.arc(x, y, r, 0, Math.PI * 2); return p; }
function ell(x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); return p; }

// shoulder and hand positions in canvas px (shared by drawing and by the 3D lamp)
function shoulder(side) { return [320 + (side === 'L' ? -112 : 112), 505]; }
function hand(P, side) { const s = shoulder(side), d = P[side]; return [s[0] + d[0], s[1] + d[1]]; }

function drawArm(c, P, side, skin) {
  const [sx, sy] = shoulder(side), [hx, hy] = hand(P, side), b = side === 'L' ? P.bendL : P.bendR;
  const mx = (sx + hx) / 2, my = (sy + hy) / 2, len = Math.hypot(hx - sx, hy - sy) || 1;
  const nx = -(hy - sy) / len, ny = (hx - sx) / len, cx = mx + nx * b * 2, cy = my + ny * b * 2;
  const p = new Path2D(); p.moveTo(sx, sy); p.quadraticCurveTo(cx, cy, hx, hy);
  c.lineCap = 'round'; c.lineWidth = 64 + LW * 2; c.strokeStyle = INK; c.stroke(p);
  c.lineWidth = 64; c.strokeStyle = skin; c.stroke(p);
  fs(c, circ(hx, hy, 40), skin);
}

function drawLamp(c, e, P, x, y) {   // Thai oil lamp hanging from the hand: wire bail, glass chimney, tin base
  const lv = P.lampOn;
  c.lineWidth = 7; c.strokeStyle = INK; c.beginPath(); c.moveTo(x - 30, y + 70); c.quadraticCurveTo(x, y - 22, x + 30, y + 70); c.stroke();
  fs(c, rr(x - 34, y + 60, 68, 14, 6), '#6f6a5f', 8);
  fs(c, ell(x, y + 112, 36, 42), lv > .05 ? '#fff1c4' : '#d9e4e6', 8);
  fs(c, rr(x - 44, y + 148, 88, 38, 12), '#a9873f', 8);
  if (lv > .02) {   // flame, drawn in both the colour and the emissive canvas
    const h = 30 + lv * 22, fl = (g, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + 128 - h); g.quadraticCurveTo(x + 16, y + 118, x, y + 132); g.quadraticCurveTo(x - 16, y + 118, x, y + 128 - h); g.fill(); };
    fl(c, '#ffb43a'); fl(e, '#ffd26a');
    e.fillStyle = 'rgba(255,220,140,.55)'; e.fill(ell(x, y + 112, 33, 39));
    c.fillStyle = '#fff6d8'; c.beginPath(); c.ellipse(x, y + 120, 6, 12, 0, 0, 7); c.fill();
  }
}

function drawFace(c, ch, P, cx, cy, r) {
  const eyes = P.eyes || ch.eyes, ex = r * .34, ey = cy + r * .06;
  c.fillStyle = INK; c.strokeStyle = INK; c.lineCap = 'round';
  if (P.blink > .5 && eyes !== 'line') { c.lineWidth = 10; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * ex - 20, ey); c.lineTo(cx + s * ex + 20, ey); c.stroke(); } }
  else if (eyes === 'dot' || eyes === 'ghost') {
    if (eyes === 'ghost') {
      c.fillStyle = 'rgba(60,50,45,.28)'; for (const s of [-1, 1]) c.fill(circ(cx + s * ex, ey + 4, 46));
      c.lineWidth = 10; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * ex * 1.55, ey - 50); c.lineTo(cx + s * ex * .45, ey - 30); c.stroke(); }
      c.lineWidth = 8; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * ex * 1.5, ey + 38); c.quadraticCurveTo(cx + s * ex, ey + 60, cx + s * ex * .5, ey + 38); c.stroke(); }
      c.fillStyle = INK;
    }
    for (const s of [-1, 1]) { c.fill(circ(cx + s * ex, ey, 25)); c.fillStyle = '#fff'; c.fill(circ(cx + s * ex - 8, ey - 9, 8)); c.fillStyle = INK; }
  } else if (eyes === 'wide') {
    for (const s of [-1, 1]) { fs(c, circ(cx + s * ex, ey, 40), '#fff', 9); c.fillStyle = INK; c.fill(circ(cx + s * ex + s * 4, ey + 4, 13)); }
    c.lineWidth = 9; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * ex * 1.45, ey - 62); c.quadraticCurveTo(cx + s * ex, ey - 82, cx + s * ex * .5, ey - 60); c.stroke(); }
  } else if (eyes === 'line') {   // grandma: calm "| |" eyes with soft lines under
    c.lineWidth = 12; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * ex, ey - 22); c.lineTo(cx + s * ex, ey + 18); c.stroke(); }
    c.strokeStyle = 'rgba(34,22,15,.3)'; c.lineWidth = 5; for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * ex, ey + 22, 26, .25 * Math.PI, .75 * Math.PI); c.stroke(); }
    c.strokeStyle = INK;
  } else if (eyes === 'closed') {
    c.lineWidth = 11; for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * ex, ey + 8, 22, 1.1 * Math.PI, 1.9 * Math.PI); c.stroke(); }
  }
  const my = cy + r * .5, m = P.mouth; c.lineWidth = 10; c.strokeStyle = INK;
  if (m === 'smile') { c.beginPath(); c.arc(cx, my - 22, 26, .2 * Math.PI, .8 * Math.PI); c.stroke(); }
  else if (m === 'flat') { c.beginPath(); c.moveTo(cx - 20, my); c.lineTo(cx + 20, my); c.stroke(); }
  else if (m === 'o') fs(c, ell(cx, my, 17, 21), '#8a2323', 9);
  else if (m === 'small') fs(c, ell(cx, my, 15, 9), '#8a2323', 8);
  else if (m === 'open') fs(c, ell(cx, my + 6, 30, 50), ch.hair === 'ghost' ? '#6b3b2a' : '#8a2323', 10);
  else if (m === 'grin') { const p = new Path2D(); p.moveTo(cx - 44, my - 14); p.quadraticCurveTo(cx, my + 50, cx + 44, my - 14); p.closePath(); fs(c, p, '#8a2323', 9); }
}

function drawHead(c, ch, P) {
  const r = ch.headR, cx = 320, cy = 455 - r * .78;
  if (ch.hair === 'bun') fs(c, circ(cx, cy - r - 22, 46), '#e3dfda');
  if (P.horns) for (const s of [-1, 1]) { const p = new Path2D(); p.moveTo(cx + s * r * .45, cy - r * .8); p.lineTo(cx + s * r * .75, cy - r * 1.35); p.lineTo(cx + s * r * .78, cy - r * .55); p.closePath(); fs(c, p, '#3a2b25'); }
  const head = circ(cx, cy, r);
  c.save(); c.clip(head);
  c.fillStyle = ch.shade; c.fill(head);
  c.fillStyle = ch.skin; c.fill(circ(cx - r * .1, cy - r * .1, r * .97));
  if (ch.hair === 'boy') { c.fillStyle = '#211a17'; c.beginPath(); c.ellipse(cx + 20, cy - r * .62, r * 1.08, r * .62, -.08, 0, 7); c.fill(); }
  if (ch.hair === 'bun') { c.fillStyle = '#e3dfda'; c.beginPath(); c.ellipse(cx, cy - r * .72, r * 1.05, r * .56, 0, 0, 7); c.fill(); }
  if (ch.hair === 'ghost') {
    c.fillStyle = '#2b2522'; c.beginPath(); c.moveTo(cx - r, cy - r * .2);
    for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI, rr2 = r * (i % 2 ? .62 : .78); c.lineTo(cx + Math.cos(a) * r * 1.02, cy + Math.sin(a) * r * 1.02 * (i % 2 ? .72 : 1) + (i % 2 ? r * .12 : 0)); }
    c.lineTo(cx + r, cy - r * .2); c.lineTo(cx + r, cy - r); c.lineTo(cx - r, cy - r); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.55)'; c.fill(ell(cx - r * .52, cy - r * .42, r * .13, r * .08, -.7));
  c.restore();
  c.lineWidth = LW; c.strokeStyle = INK; c.stroke(head);
  drawFace(c, ch, P, cx, cy, r);
}

function drawBody(c, ch, P) {
  const cx = 320;
  // legs and feet
  for (const s of [-1, 1]) { fs(c, rr(cx + s * 72 - 35, 740, 70, 200, 34), ch.skin); }
  for (const s of [-1, 1]) fs(c, ell(cx + s * 86, 948, 72, 36), ch.skin);
  if (ch.skirt) {   // pha-sin: dark tube skirt with a gold hem band
    const p = new Path2D(); p.moveTo(cx - 140, 690); p.lineTo(cx + 140, 690); p.lineTo(cx + 150, 900); p.lineTo(cx - 150, 900); p.closePath(); fs(c, p, ch.skirt[0]);
    c.fillStyle = ch.skirt[1]; c.fillRect(cx - 147, 862, 294, 18); c.lineWidth = 6; c.strokeStyle = INK; c.strokeRect(cx - 147, 862, 294, 18);
  }
  // hood collar behind the head, hoodie body
  fs(c, ell(cx, 462, 148, 46), ch.hoodDk);
  const body = new Path2D(); body.moveTo(cx - 128, 470); body.quadraticCurveTo(cx - 150, 600, cx - 158, 770); body.lineTo(cx + 158, 770); body.quadraticCurveTo(cx + 150, 600, cx + 128, 470); body.closePath();
  c.save(); c.clip(body); c.fillStyle = ch.hood; c.fill(body); c.fillStyle = 'rgba(0,0,0,.13)'; c.fillRect(cx + 70, 440, 120, 360);
  c.fillStyle = ch.hoodDk; c.fillRect(cx - 170, 728, 340, 50);
  c.strokeStyle = 'rgba(34,22,15,.45)'; c.lineWidth = 4; for (let x = cx - 150; x < cx + 160; x += 18) { c.beginPath(); c.moveTo(x, 734); c.lineTo(x, 770); c.stroke(); }
  c.restore();
  c.lineWidth = LW; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke(body);
  c.lineWidth = 6; c.beginPath(); c.moveTo(cx - 162, 728); c.lineTo(cx + 162, 728); c.stroke();
  const pk = new Path2D(); pk.moveTo(cx - 88, 612); pk.lineTo(cx + 88, 612); pk.lineTo(cx + 122, 712); pk.lineTo(cx - 122, 712); pk.closePath();
  c.lineWidth = 7; c.strokeStyle = 'rgba(34,22,15,.75)'; c.stroke(pk);
  // drawstrings
  c.strokeStyle = INK; c.lineWidth = 6; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * 32, 480); c.lineTo(cx + s * 38, 580); c.stroke(); c.fillStyle = INK; c.fill(ell(cx + s * 38, 590, 8, 13)); }
}

export function drawPose(ch, P, horns = 0) {
  const c0 = document.createElement('canvas'); c0.width = CW; c0.height = CH; const c = c0.getContext('2d');
  const e0 = document.createElement('canvas'); e0.width = CW; e0.height = CH; const e = e0.getContext('2d'); e.fillStyle = '#000'; e.fillRect(0, 0, CW, CH);
  c.lineJoin = 'round'; c.lineCap = 'round';
  drawBody(c, ch, P);
  drawHead(c, ch, horns ? { ...P, horns: 1 } : P);
  for (const s of ['L', 'R']) { drawArm(c, P, s, ch.skin); if (P.lamp && s === 'R') { const [hx, hy] = hand(P, 'R'); drawLamp(c, e, P, hx, hy); } }
  return { c0, e0 };
}

// —— 3D: the character as a lit cut-out ——
const _cache = new Map();
function texOf(cv) { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

export function makeToon(id) {
  const ch = CAST[id], k = ch.scale, w = CW / PPM * k, h = CH / PPM * k;
  const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2 - (CH - GROUND) / PPM * k, 0);
  const mat = new THREE.MeshLambertMaterial({ alphaTest: .5, side: THREE.DoubleSide, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.6 });
  mat.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight = min(outgoingLight, diffuseColor.rgb * 1.0 + totalEmissiveRadiance);\n#include <opaque_fragment>'); };
  // the visible cut-out casts no shadow; an invisible twin does, with its own map (three.js shadows take the caster's map + alphaTest),
  // so the shadow can differ from the drawing ("the shadow that lies")
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = false;
  const caster = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, alphaTest: .5, side: THREE.DoubleSide }));
  caster.castShadow = true; const cmat = caster.material;
  const root = new THREE.Group(); root.add(mesh, caster); root.userData.char = id;
  let cur = null, P = BASE, shadowHorns = 0;
  function pose(p) {
    P = { ...BASE, ...p }; const key = id + JSON.stringify(P) + shadowHorns;
    if (key === cur) return; cur = key;
    let T = _cache.get(key);
    if (!T) {
      const a = drawPose(ch, P), b = shadowHorns ? drawPose(ch, P, 1) : a;
      T = { map: texOf(a.c0), em: texOf(a.e0), sh: texOf(b.c0) }; _cache.set(key, T);
    }
    mat.map = T.map; mat.emissiveMap = T.em; cmat.map = T.sh;
    mat.needsUpdate = cmat.needsUpdate = true;
  }
  function face(cam) { root.rotation.y = Math.atan2(cam.position.x - root.position.x, cam.position.z - root.position.z); }
  function handWorld(side = 'R', dy = 112) {   // world position of a point under the hand (the lamp glass)
    const [hx, hy] = hand(P, side), v = new THREE.Vector3((hx - 320) / PPM * k, (GROUND - hy - dy) / PPM * k, .02);
    root.updateMatrixWorld(); return v.applyMatrix4(root.matrixWorld);
  }
  pose({});
  return { root, mesh, pose, face, handWorld, setShadowHorns(v) { const n = v ? 1 : 0; if (n !== shadowHorns) { shadowHorns = n; cur = null; } }, height: h };
}
