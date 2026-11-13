// set.js: the 3D village set in flat toon colour with drawn line detail (ink edges come from the post pass)
import * as THREE from 'three';
import { INK } from './toon.js';

const _grad = (() => { const t = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export function toon(color, map) { return new THREE.MeshToonMaterial({ color, map: map || null, gradientMap: _grad }); }
function m(geo, mat, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; }

function canvasTex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t;
}
function rnd(s) { return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

const thatchTex = () => canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#b38a52'; g.fillRect(0, 0, w, h); const r = rnd(7);
  for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, l = 40 + r() * 90; g.strokeStyle = r() < .5 ? 'rgba(34,22,15,.38)' : 'rgba(255,230,170,.25)'; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 6, y + l); g.stroke(); }
  g.strokeStyle = 'rgba(34,22,15,.6)'; g.lineWidth = 5; for (let y = 0; y < h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
}, [3, 1]);
const plankTex = (col, dir = 'h') => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = col; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(34,22,15,.65)'; g.lineWidth = 4;
  for (let i = 0; i < 4; i++) { g.beginPath(); if (dir === 'h') { g.moveTo(0, i * 64); g.lineTo(w, i * 64); } else { g.moveTo(i * 64, 0); g.lineTo(i * 64, h); } g.stroke(); }
  g.strokeStyle = 'rgba(34,22,15,.2)'; g.lineWidth = 2; const r = rnd(3); for (let i = 0; i < 14; i++) { const y = r() * h, x = r() * w; g.beginPath(); if (dir === 'h') { g.moveTo(x, y); g.lineTo(x + 50, y + 2); } else { g.moveTo(x, y); g.lineTo(x + 2, y + 50); } g.stroke(); }
});
const weaveTex = () => canvasTex(256, 256, (g, w, h) => {   // woven bamboo screen (fa khat tae)
  g.fillStyle = '#d9c497'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(34,22,15,.22)'; g.lineWidth = 3;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const x = i * 32, y = j * 32; g.beginPath(); if ((i + j) % 2) { g.moveTo(x, y + 10); g.lineTo(x + 32, y + 10); g.moveTo(x, y + 22); g.lineTo(x + 32, y + 22); } else { g.moveTo(x + 10, y); g.lineTo(x + 10, y + 32); g.moveTo(x + 22, y); g.lineTo(x + 22, y + 32); } g.stroke(); }
}, [7, 2.4]);
const groundTex = () => canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#9aab5a'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(70,90,40,.45)'; g.lineWidth = 3; for (let y = 8; y < h; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }   // paddy furrows
  const r = rnd(11); g.strokeStyle = 'rgba(60,80,30,.5)'; g.lineWidth = 3;
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y - 16); g.moveTo(x + 6, y); g.lineTo(x + 9, y - 14); g.stroke(); }
}, [10, 10]);
const pathTex = () => canvasTex(256, 1024, (g, w, h) => {
  g.fillStyle = '#b9824e'; g.fillRect(0, 0, w, h); const r = rnd(5); g.fillStyle = 'rgba(34,22,15,.22)';
  for (let i = 0; i < 160; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 5, 2 + r() * 3, 0, 0, 7); g.fill(); }
}, [1, 3]);

function sky() {
  const u = { top: { value: new THREE.Color('#7a6878') }, mid: { value: new THREE.Color('#c8988e') }, hor: { value: new THREE.Color('#f2b57e') }, k: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top, mid, hor; uniform float k;
      void main(){ float y = clamp(vP.y, 0., 1.); vec3 c = mix(hor, mid, smoothstep(0., .18, y)); c = mix(c, top, smoothstep(.15, .6, y)); gl_FragColor = vec4(c * k, 1.); }` });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat); mesh.renderOrder = -10; return { mesh, u };
}

export function palm(h = 6, seed = 1) {
  const g = new THREE.Group(), r = rnd(seed * 97 + 3), trunk = toon('#7a5a3c'), leaf = toon('#4f6b3a');
  const tr = m(new THREE.CylinderGeometry(.09, .16, h, 7), trunk, 0, h / 2, 0); tr.rotation.z = (r() - .5) * .12; g.add(tr);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + r(), L = 1.6 + r() * .6, lf = m(new THREE.ConeGeometry(.32, L, 3), leaf);
    lf.scale.z = .25; lf.position.set(Math.cos(a) * L * .45, h - .2 - L * .1, Math.sin(a) * L * .45); lf.rotation.set(0, -a, 0); lf.rotateZ(-Math.PI / 2 - .5); g.add(lf);
  }
  return g;
}
function bush(x, z, s, col = '#5d7a3c') { const o = m(new THREE.IcosahedronGeometry(s, 0), toon(col), x, s * .6, z); o.scale.y = .75; return o; }

function hut() {
  const g = new THREE.Group(), wood = toon('#ffffff', plankTex('#6b4528', 'v')), dark = toon('#3a2618'), floorM = toon('#ffffff', plankTex('#8a5c34')), post = toon('#5a3a22');
  const W = 5.2, D = 4, FH = 1.45, WH = 2.1;
  for (const x of [-W / 2 + .15, 0, W / 2 - .15]) for (const z of [-D / 2 + .15, D / 2 - .15]) g.add(m(new THREE.CylinderGeometry(.11, .13, FH + WH, 8), post, x, (FH + WH) / 2, z));
  g.add(m(new THREE.BoxGeometry(W + .3, .16, D + .3), floorM, 0, FH, 0));
  g.add(m(new THREE.BoxGeometry(W, WH, .1), wood, 0, FH + WH / 2, -D / 2 + .1));
  for (const s of [-1, 1]) g.add(m(new THREE.BoxGeometry(.1, WH, D), wood, s * (W / 2 - .1), FH + WH / 2, 0));
  g.add(m(new THREE.BoxGeometry(W - .4, WH - .2, .05), dark, 0, FH + WH / 2, -D / 2 + .2));   // shadowed interior read
  g.add(m(new THREE.BoxGeometry(W, .12, .12), post, 0, FH + .55, D / 2 - .1));            // front rail
  // gable roof: thatch slopes, a thatched triangle facing the front (like a Thai rice-field hut)
  const RW = W + 2.2, RH = 2.7, RD = D + 1.6, eave = FH + WH - .25, thatch = toon('#ffffff', thatchTex());
  const tri = new THREE.Shape(); tri.moveTo(-RW / 2, 0); tri.lineTo(RW / 2, 0); tri.lineTo(0, RH); tri.closePath();
  const gable = new THREE.ExtrudeGeometry(tri, { depth: RD, bevelEnabled: false }); gable.translate(0, eave, -RD / 2);
  const uv = gable.attributes.uv, pos = gable.attributes.position, nrm = (gable.computeVertexNormals(), gable.attributes.normal);
  for (let i = 0; i < uv.count; i++) { const ny = nrm.getY(i), x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); uv.setXY(i, Math.abs(ny) > .2 ? z / 2 : x / 2.5, Math.abs(ny) > .2 ? (y - eave) / 1.2 + Math.abs(x) * .1 : (y - eave) / 1.2); }
  const roof = m(gable, thatch); g.add(roof);
  const ridge = m(new THREE.BoxGeometry(.22, .22, RD + .2), toon('#7a5530'), 0, eave + RH, 0); ridge.rotation.z = Math.PI / 4; g.add(ridge);
  // ladder
  const lad = new THREE.Group(), rail = toon('#8a6a42');
  for (const s of [-1, 1]) lad.add(m(new THREE.BoxGeometry(.08, 2.2, .08), rail, s * .32, 1.1, 0));
  for (let i = 0; i < 6; i++) lad.add(m(new THREE.BoxGeometry(.64, .06, .07), rail, 0, .25 + i * .35, 0));
  lad.position.set(1.6, 0, D / 2 + .55); lad.rotation.x = -.38; g.add(lad);
  // water jar
  const jar = m(new THREE.SphereGeometry(.42, 16, 10), toon('#7a4a2a'), -2.3, .38, D / 2 + 3.2); jar.scale.y = 1.05; g.add(jar);
  g.add(m(new THREE.CylinderGeometry(.24, .28, .1, 16), toon('#5a3420'), -2.3, .8, D / 2 + 3.2));
  // woven screen under the hut: the wall that catches the shadows
  const scr = m(new THREE.BoxGeometry(4.2, 1.42, .06), toon('#ffffff', weaveTex()), .5, .71, D / 2 + .55); scr.castShadow = false; g.add(scr);
  for (const x of [-1.6, 2.6]) g.add(m(new THREE.BoxGeometry(.1, 1.45, .1), post, x, .72, D / 2 + .55));
  return g;
}

// lamp light + halo, placed each frame at the lamp glass
export function glowSprite(col, size) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(255,255,255,.5)'); gr.addColorStop(.5, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  s.scale.set(size, size, 1); return s;
}

// ghost smoke: flat dark discs rising in a swaying column (deterministic in t)
export function smoke(n = 26) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill();
  const tex = new THREE.CanvasTexture(c), g = new THREE.Group(), puffs = [];
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#2a2422', transparent: true, opacity: 0, depthWrite: false, fog: false })); s.renderOrder = 3; g.add(s); puffs.push(s); }
  g.userData.update = (t, amt, base) => {   // amt 0..1 how much smoke; base = world position of the head top
    const life = 4.2;
    puffs.forEach((s, i) => {
      const ph = ((t / life + i / n) % 1), born = t - ph * life;
      const on = amt * Math.min(1, ph * 6) * (1 - Math.pow(ph, 3)) * (born > -9 ? 1 : 0);
      const y = ph * 4.6, sway = Math.sin(t * .9 + i * 1.7) * .12 + Math.sin(y * 1.3 + i) * .18 * ph;
      s.position.set(base.x + sway - ph * .6, base.y + y, base.z - .05 - ph * .2);
      const sz = .26 + ph * .75 + (i % 3) * .06; s.scale.set(sz, sz, 1); s.material.opacity = .62 * on;
    });
  };
  return g;
}

export function buildSet() {
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#d9a58c', 28, 140);
  const SK = sky(); scene.add(SK.mesh);
  const ground = m(new THREE.PlaneGeometry(240, 240), toon('#ffffff', groundTex())); ground.rotation.x = -Math.PI / 2; ground.castShadow = false; scene.add(ground);
  const yard = m(new THREE.CircleGeometry(5.5, 40), toon('#b8966a')); yard.rotation.x = -Math.PI / 2; yard.position.set(0, .01, -1.2); yard.castShadow = false; scene.add(yard);
  const path = m(new THREE.PlaneGeometry(2.2, 30), toon('#ffffff', pathTex())); path.rotation.x = -Math.PI / 2; path.position.set(.9, .02, 12); path.rotation.z = .12; path.castShadow = false; scene.add(path);
  const H = hut(); H.position.set(0, 0, -4.2); scene.add(H);
  [[-5.2, -6.5, 6.4, 1], [5.6, -7.5, 7.2, 2], [-9, -14, 6, 3], [9.5, -16, 6.5, 4], [-3, -22, 5.5, 5], [14, -10, 7, 6], [-13, -9, 6.8, 7]].forEach(([x, z, h, s]) => { const p = palm(h, s); p.position.set(x, 0, z); scene.add(p); });
  [[-3.6, -2.2, .7], [3.4, -2.6, .8], [-6.5, -3, .9], [6.8, -4, 1], [-2.8, -6.6, .6], [11, -20, 2.2], [-12, -24, 2.6], [0, -40, 3.2], [20, -35, 3]].forEach(([x, z, s]) => scene.add(bush(x, z, s)));
  for (let i = 0; i < 14; i++) { const x = -70 + i * 11, h = 6 + (i * 37 % 9); const hill = m(new THREE.ConeGeometry(14 + (i * 13 % 7), h, 5), toon('#8e7486'), x, h / 2 - 1, -95 - (i * 7 % 15)); hill.castShadow = false; scene.add(hill); }
  // light rig: low warm sun, lilac hemisphere, warm front fill
  const sun = new THREE.DirectionalLight('#ffc89a', 1.7); sun.position.set(-6, 1.9, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -5.5, right: 5.5, top: 5, bottom: -5, near: .5, far: 30 }); sun.shadow.bias = -.0004; sun.shadow.radius = 1;
  const hemi = new THREE.HemisphereLight('#d8c4d6', '#7a6a48', .8);
  const fill = new THREE.PointLight('#ffe2c8', 6, 9, 1.6);
  scene.add(sun, sun.target, hemi, fill);
  return { scene, sky: SK, sun, hemi, fill };
}
