// Adapted from Lemo-Opuscar hd-2d post_ts.js (MIT): adds ink edges (depth jumps + creases from 1/z) before the depth of field; tilt-shift unused.
// Original note: Local copy (tilt-shift version): adds a tilt-shift blur computed from screen height on top of the physical depth of field. With tiltAmt=0 it is identical to core/three/post.js
// Post: scene → (MSAA + depth) → [GTAO ambient occlusion] → physical depth of field (CoC∝|1/f−1/z|, spiral sampling) → bloom → grade/vignette → tone mapping
// makePost(renderer, scene, camera, w, h, { ssaa: 2, ao: true }): ssaa is the internal supersampling factor (the canvas is shown at CSS size; the browser downscales it when capturing)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const cocShader = {
  uniforms: { tColor: { value: null }, tDepth: { value: null }, tAO: { value: null }, aoAmt: { value: 0 }, aoDebug: { value: 0 }, focus: { value: .3 }, aper: { value: 4 }, maxCoc: { value: 18 }, near: { value: .01 }, far: { value: 50 }, tiltAmt: { value: 0 }, tiltC: { value: .5 }, tiltW: { value: .1 }, tiltF: { value: .3 }, px: { value: new THREE.Vector2(1/1920, 1/1080) }, inkW: { value: 1.5 }, ink: { value: new THREE.Color('#22160f').convertSRGBToLinear() }, inkFar: { value: 60 }, inkAmt: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
    #include <packing>
    varying vec2 vUv; uniform sampler2D tColor, tDepth, tAO; uniform float aoAmt, focus, aper, maxCoc, near, far, aoDebug, tiltAmt, tiltC, tiltW, tiltF, inkW, inkFar, inkAmt; uniform vec2 px; uniform vec3 ink;
    float lz(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, near, far); }
    void main(){
      float d = texture2D(tDepth, vUv).x;
      float z = -perspectiveDepthToViewZ(d, near, far);
      float c = clamp(aper * (1.0/focus - 1.0/z), -maxCoc, maxCoc);   // negative = foreground, positive = background (pixels)
      // Tilt-shift: outside the sharp band, blur grows with distance from the band; above counts as background, below as foreground (reuses gather's front/back occlusion rules)
      float dy = vUv.y - tiltC, tc = min(maxCoc, tiltAmt * smoothstep(tiltW, tiltW + tiltF, abs(dy)));
      if (tc > abs(c)) c = dy > 0. ? tc : -tc;
      vec3 col = texture2D(tColor, vUv).rgb;
      if (aoAmt > 0.) col *= mix(1., pow(texture2D(tAO, vUv).r, 1.6), aoAmt);
      // ink: silhouettes (relative depth jump) and creases (second difference of 1/z, zero on any plane)
      vec2 o = px * inkW; float zl = lz(vUv - vec2(o.x, 0.)), zr = lz(vUv + vec2(o.x, 0.)), zd = lz(vUv - vec2(0., o.y)), zu = lz(vUv + vec2(0., o.y));
      float jump = max(max(abs(zl - z), abs(zr - z)), max(abs(zd - z), abs(zu - z))) / z;
      float wc = 1. / z, lap = (abs(1./zl + 1./zr - 2.*wc) + abs(1./zu + 1./zd - 2.*wc)) / wc;
      float e = max(smoothstep(.035, .07, jump), smoothstep(.006, .016, lap)) * (1. - smoothstep(inkFar * .7, inkFar, min(z, min(min(zl, zr), min(zd, zu)))));
      col = mix(col, ink, e * inkAmt);
      if (aoDebug > .5) col = vec3(pow(texture2D(tAO, vUv).r, 1.6));
      gl_FragColor = vec4(col, c);
    }`
};
const gatherShader = {
  uniforms: { tIn: { value: null }, res: { value: new THREE.Vector2(1920, 1080) }, maxCoc: { value: 18 } },
  vertexShader: cocShader.vertexShader,
  fragmentShader: `
    varying vec2 vUv; uniform sampler2D tIn; uniform vec2 res; uniform float maxCoc;
    void main(){
      vec4 c0 = texture2D(tIn, vUv); float a0 = abs(c0.a);
      if (maxCoc < .5) { gl_FragColor = vec4(c0.rgb, 1.); return; }
      vec3 acc = c0.rgb / (a0*a0 + 1.); float wsum = 1. / (a0*a0 + 1.);
      const int N = 32;
      for (int i = 0; i < N; i++) {
        float r = maxCoc * sqrt((float(i) + .5) / float(N));
        float th = float(i) * 2.39996;
        vec2 off = vec2(cos(th), sin(th)) * r / res;
        vec4 s = texture2D(tIn, vUv + off);
        float sa = abs(s.a);
        // samples farther than the centre spread no wider than the centre's own radius (stops the background from blurring over a sharp foreground)
        if (s.a > c0.a) sa = min(sa, max(a0, 0.));
        float w = smoothstep(r - 1.5, r + .5, sa) / (sa*sa + 1.);
        acc += s.rgb * w; wsum += w;
      }
      gl_FragColor = vec4(acc / wsum, 1.);
    }`
};

class DofScenePass extends Pass {
  constructor(scene, camera, w, h, o = {}) {
    super(); this.scene = scene; this.camera = camera; this.needsSwap = true; this.s = o.ssaa || 1;
    this.rt = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(w, h, THREE.FloatType) });
    this.rtC = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
    this.coc = new FullScreenQuad(new THREE.ShaderMaterial(cocShader));
    this.gat = new FullScreenQuad(new THREE.ShaderMaterial(gatherShader));
    this.gat.material.uniforms.res.value.set(w, h);
    this.focus = .3; this.aper = 4; this.maxCoc = 16; this.aoAmt = 0;
    if (o.ao) {
      this.ao = new GTAOPass(scene, camera, w, h);
      this.ao.output = GTAOPass.OUTPUT.Off;
      this.ao.updateGtaoMaterial({ radius: o.aoRadius ?? .25, distanceExponent: 1.2, thickness: o.aoThickness ?? 1, scale: o.aoScale ?? 2.5, distanceFallOff: .6, samples: 16 });
      this.ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 * this.s, rings: 2, samples: 16 });
      this.aoAmt = o.aoAmt ?? .85;
    }
  }
  render(renderer, writeBuffer) {
    renderer.setRenderTarget(this.rt); renderer.clear(); renderer.render(this.scene, this.camera);
    if (this.ao && this.aoAmt > 0) this.ao.render(renderer, null, null);
    const u = this.coc.material.uniforms;
    u.tColor.value = this.rt.texture; u.tDepth.value = this.rt.depthTexture; u.focus.value = this.focus; u.aper.value = this.aper * this.s; u.maxCoc.value = this.maxCoc * this.s;
    u.px.value.set(1 / this.rt.width, 1 / this.rt.height); u.inkW.value = (this.inkW ?? 1.5) * this.s; u.inkFar.value = this.inkFar ?? 60; u.inkAmt.value = this.inkAmt ?? 1;
    u.near.value = this.camera.near; u.far.value = this.camera.far;
    u.tiltAmt.value = (this.tiltAmt || 0) * this.s; u.tiltC.value = this.tiltC ?? .5; u.tiltW.value = this.tiltW ?? .1; u.tiltF.value = this.tiltF ?? .3;
    u.tAO.value = this.ao ? this.ao.gtaoMap : null; u.aoDebug.value = this.aoDebug ? 1 : 0; u.aoAmt.value = this.ao ? this.aoAmt : 0;
    renderer.setRenderTarget(this.rtC); this.coc.render(renderer);
    const g = this.gat.material.uniforms; g.tIn.value = this.rtC.texture; g.maxCoc.value = this.maxCoc * this.s;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.gat.render(renderer);
  }
}

const vignetteShader = {
  uniforms: { tDiffuse: { value: null }, amt: { value: .35 }, fade: { value: 1 }, warm: { value: 0 }, contrast: { value: 0 }, sat: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float amt, fade, warm, contrast, sat;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - .5; d.x *= 1.25; float v = 1. - amt * smoothstep(.25, .85, length(d));
      c.rgb *= v * fade; c.rgb *= mix(vec3(1.), vec3(1.06, 1., .9), warm);
      float l = dot(c.rgb, vec3(.2126, .7152, .0722)); c.rgb = mix(vec3(l), c.rgb, sat);
      c.rgb = c.rgb * (1. + contrast) / (1. + contrast * c.rgb / (c.rgb + .6));   // gentle contrast in linear space
      gl_FragColor = c; }`
};

export function makePost(renderer, scene, camera, w, h, o = {}) {
  const s = o.ssaa || 1, W = w * s, H = h * s;
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType }));
  const dof = new DofScenePass(scene, camera, W, H, o);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), .2, .5, 1.6);
  const vig = new ShaderPass(vignetteShader);
  const out = new OutputPass();
  composer.addPass(dof); composer.addPass(bloom); composer.addPass(vig); composer.addPass(out);
  return { composer, dof, bloom, vig };
}
