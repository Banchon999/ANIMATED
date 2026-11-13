// ตะเกียงยาย — demo film of the Thai Toon Diorama style (1080×1920)
import * as THREE from 'three';
import { makePost } from './post.js';
import { buildSet, glowSprite, smoke } from './set.js';
import { makeToon } from './toon.js';
import { drawOverlay, overlayReady, TEXTS } from './ui.js';
import { track, seg, ss, eo, clamp, lerp } from '/core/lib.js';

const W = 1080, H = 1920, Q = new URLSearchParams(location.search), SS = +(Q.get('ss') ?? 2);
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .98;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);
renderer.domElement.style.width = W + 'px'; renderer.domElement.style.height = H + 'px';
const cam = new THREE.PerspectiveCamera(42, W / H, .1, 1200);

const S = buildSet(), scene = S.scene;
const yai = makeToon('yai'), dek = makeToon('dek'), pop = makeToon('pop');
yai.root.position.set(-.75, 0, 0); dek.root.position.set(-.05, 0, .35); pop.root.position.set(.85, 0, 1.3);
scene.add(yai.root, dek.root, pop.root);
const lamp = new THREE.PointLight('#ffb85a', 0, 11, 2); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -.004; lamp.shadow.camera.near = .1;
const halo = glowSprite('#ffc46a', 1.1); scene.add(lamp, halo);
const smk = smoke(28); scene.add(smk);

const post = makePost(renderer, scene, cam, W, H, { ssaa: SS });
post.bloom.strength = .32; post.bloom.radius = .5; post.bloom.threshold = .92;
const V = post.vig.uniforms; V.amt.value = .28; V.warm.value = .05; V.contrast.value = .12; V.sat.value = 1.05;
post.dof.inkW = 2.4;

// —— timeline (single source of truth) ——
export const T = { coverEnd: 3.4, wide: 3.4, light: 5.2, shadow: 7.2, two: 10.8, reveal: 14.0, cool: 14.2, snap: 18.6, push: 19.2, endA: 21.6, dur: 24.8 };
const SHOTS = [['cover', 0, T.coverEnd], ['wide', T.wide, T.shadow], ['shadow', T.shadow, T.two], ['two', T.two, T.reveal], ['reveal', T.reveal, T.snap], ['snap', T.snap, T.dur]];
const shotAt = t => SHOTS.find(s => t >= s[1] && t < s[2]) || SHOTS[SHOTS.length - 1];
const _v = new THREE.Vector3();
function headTip(ch, up = .93) { ch.root.getWorldPosition(_v); _v.y += ch.height * up; _v.project(cam); return [(_v.x * .5 + .5) * W, (1 - (_v.y * .5 + .5)) * H]; }
const BUB = [
  { id: 'b1', who: dek, text: 'ยาย... เงายายมีเขา!!', a: 7.6, b: 10.6, side: 1 },
  { id: 'b2', who: yai, text: 'ไม่ใช่เงายายหรอกลูก', a: 11.05, b: 13.95, side: 1 },
  { id: 'b3', who: pop, text: 'ขอไฟหน่อยจ้า~', a: 15.2, b: 18.4, side: -1 },
  { id: 'b4', who: dek, text: 'ยายยยย!!!', a: 19.3, b: 21.6, side: 1 },
].map(B => ({ ...B, tip: () => headTip(B.who) }));
const talking = (who, t) => BUB.some(B => B.who === who && t > B.a + .1 && t < B.b - .4);
const flap = t => ['small', 'open', 'small', 'flat'][Math.floor(t * 9) % 4];
const blink = (t, s) => ((t + s * 1.37) % 3.3) < .11 ? 1 : 0;
const flick = (t, s = 1) => 1 + .09 * Math.sin(t * 11.3 + s) + .06 * Math.sin(t * 17.9 + 2 * s) + .04 * Math.sin(t * 29.1 + 3 * s);

const CAM = {
  wide: { p: track([[0, [.4, 2.1, 12.5]], [3.8, [.2, 1.8, 10.2]]]), l: track([[0, [0, 2.6, -2]], [3.8, [-.1, 2.3, -2]]]), fov: 42 },
  shadow: { p: track([[0, [.35, .75, 1.5]], [3.6, [.4, .78, 1.15]]]), l: track([[0, [.55, .82, -1.6]], [3.6, [.6, .85, -1.6]]]), fov: 44 },
  two: { p: track([[0, [-.35, 1.05, 2.75]], [3.2, [-.4, 1.02, 2.55]]]), l: track([[0, [-.4, .95, 0]], [3.2, [-.42, .95, 0]]]), fov: 38 },
  reveal: { p: track([[0, [-.4, 1.02, 2.55]], [1.6, [.3, 1.45, 5.6]], [4.6, [.35, 1.47, 5.4]]]), l: track([[0, [-.42, .95, 0]], [1.6, [.25, 1.6, -.6]], [4.6, [.25, 1.62, -.6]]]), fov: 44 },
  snap: { p: t => { const k = eo(seg(t, T.push - T.snap, T.push - T.snap + .2)); return [lerp(.05, -.02, k), lerp(1.05, .98, k), lerp(3.4, 1.55, k)]; }, l: () => [-.05, .95, .35], fov: 40 },
};
CAM.cover = { p: () => CAM.reveal.p(4.6), l: () => CAM.reveal.l(4.6), fov: 44 };

window.DUR = T.dur;
window.TEXTS = TEXTS;
window.EV = [
  { t: T.light, type: 'match' }, { t: T.light + .22, type: 'flame' },
  ...BUB.map(B => ({ t: B.a, type: 'pop', id: B.id })),
  { t: T.reveal - .4, type: 'silence', d: .6 }, { t: T.cool, type: 'wind' },
  { t: T.push, type: 'whoosh' }, { t: T.endA, type: 'sting' },
];

window.render = t => {
  const [sid, a] = shotAt(t), lt = t - a, st = sid === 'cover' ? 16.5 : t;   // the cover holds the episode's key image
  const C = CAM[sid]; cam.position.set(...C.p(lt)); cam.fov = C.fov; cam.updateProjectionMatrix(); cam.lookAt(...C.l(lt)); cam.updateMatrixWorld();

  const ghost = st >= T.reveal, cool = ss(seg(st, T.cool, T.cool + 1.4));
  // poses
  const lampLv = clamp(seg(st, T.light, T.light + .3)) * flick(st, 2);
  yai.setShadowHorns(st > T.shadow && st < T.reveal);
  const yTalk = talking(yai, st);
  yai.pose({ lamp: 1, lampOn: Math.round(clamp(lampLv) * 4) / 4, R: [92, 92], bendR: 34, L: [-40, 215],
    eyes: st > T.two && st < T.reveal ? 'closed' : null, mouth: yTalk ? flap(st) : 'smile', blink: blink(st, 1) });
  const scared = st > T.two, shock = st > T.push;
  dek.pose(shock ? { L: [-150, -175], R: [150, -175], bendL: 30, bendR: -30, eyes: 'wide', mouth: talking(dek, st) ? (Math.floor(st * 9) % 2 ? 'open' : 'o') : 'open' }
    : st > T.shadow && st < T.two ? { R: [175, 60], bendR: -20, eyes: 'wide', mouth: talking(dek, st) ? flap(st) : 'o' }
      : { L: [-40, 215], R: [70, -160], bendR: -45, eyes: scared ? 'wide' : 'dot', mouth: scared ? 'o' : 'small', blink: scared ? 0 : blink(st, 2) });
  pop.pose({ L: [-232, -12], R: [232, -24], bendL: 10, bendR: -10, eyes: 'ghost', mouth: talking(pop, st) ? flap(st) : 'open', blink: blink(st, 3) });
  pop.root.visible = ghost;
  for (const [ch, s] of [[yai, 0], [dek, 1.3], [pop, 2.1]]) { if (sid === 'shadow') ch.root.rotation.y = 0; else ch.face(cam); ch.root.scale.set(1, 1 + .015 * Math.sin(st * 3.1 + s), 1); }
  if (sid === 'snap') { const sq = st > T.push && st < T.push + .09 ? 1.07 : 1; dek.root.scale.set(2 - sq, sq, 1); }

  // the lamp: one level drives flame drawing, point light, halo
  const lp = yai.handWorld('R'); const toCam = cam.position.clone().sub(lp).setY(0).normalize();
  lamp.position.copy(lp).addScaledVector(toCam, .4); lamp.intensity = 3.2 * Math.pow(Math.max(0, lampLv), 1.3);
  halo.position.copy(lp).addScaledVector(toCam, .05); halo.material.opacity = clamp(lampLv) * .6; halo.scale.setScalar(.7 + .5 * lampLv);

  // dusk key; the set cools and dims when the ghost shows itself
  S.sun.intensity = lerp(1.7, .8, cool); S.sun.color.lerpColors(new THREE.Color('#ffc89a'), new THREE.Color('#b7a6d6'), cool);
  S.hemi.intensity = lerp(.8, .75, cool); S.hemi.color.lerpColors(new THREE.Color('#d8c4d6'), new THREE.Color('#a49ac0'), cool);
  S.sky.u.k.value = lerp(1, .7, cool); scene.fog.color.lerpColors(new THREE.Color('#d9a58c'), new THREE.Color('#8f7f98'), cool);
  const ff = yai.root.position.clone().lerp(dek.root.position, .5); S.fill.position.set(ff.x + toCam.x * 2, 1.4, ff.z + toCam.z * 2); S.fill.intensity = 3.5;
  pop.root.getWorldPosition(_v); smk.userData.update(st, ghost ? ss(seg(st, T.reveal, T.reveal + 1)) : 0, new THREE.Vector3(_v.x, _v.y + pop.height * .9, _v.z));

  // focus on the subject of the shot
  const subj = sid === 'shadow' ? new THREE.Vector3(1.0, .7, -1.65) : sid === 'reveal' || sid === 'cover' ? pop.root.position.clone().setY(1) : dek.root.position.clone().setY(.9);
  post.dof.focus = cam.position.distanceTo(subj); post.dof.aper = 70; post.dof.maxCoc = 7;
  post.composer.render();
  drawOverlay(t, { coverEnd: T.coverEnd, endA: T.endA, bubbles: sid === 'cover' ? [] : BUB });
};
await overlayReady();
window.READY = true;
