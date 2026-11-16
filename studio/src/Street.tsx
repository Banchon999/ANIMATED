import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeTex } from "./NightRoom";
import type { Blob } from "./Village";
import { rng, V3 } from "./lib";
import { Kit, KITS, SkyLights } from "./Light";
import { B, Blobs, Lit, Rod, shade, useKanit } from "./SetKit";

// Bangkok soi, real-world scale. The lane runs away from the camera along -z: asphalt x ±2.5, kerbs 0.15 high,
// footpaths to x ±4.0 where the shophouse fronts stand (4 m units, 2-4 storeys). Concrete poles at the kerb
// carry tangled wires overhead; a few carry street lamps. A convenience store, a food cart with an umbrella
// and parked motorbikes stand behind the actors (z < 1.2) or beside them on the footpaths. The actors stand
// on the road. Shop colours, signs, the store's side and colours, the cart, the bikes, the wiring and the
// rooftops come from the clip seed; the anchors below never move.

export const STREET = {
  road: 2.5, // asphalt x ±2.5
  kerb: 0.15, // footpath height
  facade: 4.0, // shopfronts at x ±4.0
  unit: 4.0, // shophouse width along z
  poles: { x: 2.75, z: [7, -5, -17, -29, -41] }, // concrete poles on both footpath edges
  lamps: [[-1.5, 6.95, -5], [1.5, 6.95, -17], [-1.5, 6.95, -29], [1.5, 6.95, 7]] as V3[], // street lamp heads
  actorZone: { x: [-1.8, 1.8], z: [1.6, 4.4] },
};

/** Which side the convenience store is on (1 = right, -1 = left) and its z range, from the clip seed. */
export const streetStore = (seed: number) => {
  const r = rng(seed * 523 + 11);
  const side = r() > 0.5 ? 1 : -1;
  const z1 = -2 - Math.floor(r() * 2) * STREET.unit; // front edge -2 or -6
  return { side, z0: z1 - 2 * STREET.unit, z1, glass: [side * (STREET.facade - 0.05), 1.5, z1 - STREET.unit] as V3 };
};
/** Food cart position (umbrella centre above it, bulb under the umbrella). */
export const streetCart = (seed: number) => {
  const st = streetStore(seed);
  const r = rng(seed * 61 + 5);
  const side = -st.side; // across from the store
  return { x: side * 2.1, z: -0.4 - r() * 1.4, side, bulb: [side * 2.1, 2.05, -0.4] as V3 };
};

const WORDS = ["ก๋วยเตี๋ยว", "ข้าวมันไก่", "ร้านตัดผม", "ซ่อมรถ", "ร้านยา", "ซักรีด", "กาแฟสด", "ถ่ายเอกสาร", "ร้านทอง", "ข้าวแกง", "ขายส่ง", "ห้องเช่า", "โจ๊ก", "ร้านมือถือ"];
const STORE = [
  { band: "#1f6fb0", stripe: "#f2c230", text: "#ffffff" },
  { band: "#2a9a7a", stripe: "#ffffff", text: "#ffffff" },
  { band: "#f2f0e8", stripe: "#1f6fb0", text: "#1f4f86" },
  { band: "#7a3aa8", stripe: "#f2c230", text: "#ffffff" },
];

const asphalt = (seed: number) => (c: CanvasRenderingContext2D) => {
  const r = rng(seed);
  c.fillStyle = "#5a5a5c";
  c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "40,40,42" : "130,130,128"},${0.1 + r() * 0.2})`;
    c.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2);
  }
  for (let i = 0; i < 6; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "70,70,72" : "48,48,50"},0.5)`;
    c.fillRect(r() * 512, r() * 512, 40 + r() * 120, 30 + r() * 90);
  }
};
const pavers = (c: CanvasRenderingContext2D) => {
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 4; x++) {
      c.fillStyle = (x + y) % 3 === 0 ? "#a8665a" : "#b8b2a8";
      c.fillRect(x * 32, y * 32, 32, 32);
      c.strokeStyle = "rgba(60,50,40,0.45)";
      c.strokeRect(x * 32 + 0.5, y * 32 + 0.5, 31, 31);
    }
};
const kerbPaint = (c: CanvasRenderingContext2D) => {
  for (let i = 0; i < 4; i++) {
    c.fillStyle = i % 2 ? "#f2f0ea" : "#c8342c";
    c.fillRect(i * 32, 0, 32, 16);
  }
};
const shutter = (c: CanvasRenderingContext2D) => {
  for (let y = 0; y < 64; y++) {
    const v = 0.5 + 0.5 * Math.sin(y * 1.6);
    c.fillStyle = `rgb(${150 + v * 40},${152 + v * 40},${150 + v * 38})`;
    c.fillRect(0, y, 64, 1);
  }
};
const signTex = (text: string, bg: string, fg: string, w = 384, h = 160, sub?: string) =>
  makeTex(w, h, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = fg;
    c.lineWidth = 7;
    c.strokeRect(9, 9, w - 18, h - 18);
    c.fillStyle = fg;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `700 ${Math.round(h * (sub ? 0.42 : 0.5))}px Kanit`;
    c.fillText(text, w / 2, h * (sub ? 0.4 : 0.52), w - 36);
    if (sub) {
      c.font = `700 ${Math.round(h * 0.24)}px Kanit`;
      c.fillText(sub, w / 2, h * 0.76, w - 36);
    }
  });

/** Parked motorbike (about 1.9 m long, seat 0.78), facing +z before rotation. */
const Bike: React.FC<{ p: V3; ry: number; c: string }> = ({ p, ry, c }) => (
  <group position={p} rotation={[0, ry, 0]}>
    {[-0.65, 0.62].map((z) => (
      <mesh key={z} position={[0, 0.29, z]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.24, 0.06, 4, 9]} />
        <meshLambertMaterial color="#222224" />
      </mesh>
    ))}
    <B p={[0, 0.5, -0.1]} s={[0.26, 0.26, 0.9]} c={c} />
    <B p={[0, 0.74, -0.25]} s={[0.28, 0.1, 0.62]} c="#2a2624" />
    <B p={[0, 0.72, 0.42]} s={[0.3, 0.6, 0.12]} r={[-0.25, 0, 0]} c={c} />
    <Rod a={[0, 0.3, 0.62]} b={[0, 1.02, 0.5]} r={0.025} c="#9a9a98" />
    <Rod a={[-0.32, 1.04, 0.5]} b={[0.32, 1.04, 0.5]} r={0.018} c="#2a2a2a" />
    <B p={[0, 0.98, 0.58]} s={[0.16, 0.1, 0.06]} c="#f2f0e0" sh={false} />
    <B p={[0.08, 0.25, -0.5]} s={[0.07, 0.07, 0.5]} c="#8a8a88" sh={false} />
  </group>
);

export const Street: React.FC<{ seed: number; kit?: Kit; blobs?: Blob[] }> = ({ seed, kit = KITS.day, blobs = [] }) => {
  const S = STREET;
  const fontReady = useKanit();
  const lampOn = kit.lamps > 0;
  const store = streetStore(seed);
  const cart = streetCart(seed);
  const L = useMemo(() => {
    const r = rng(seed * 941 + 7);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
    const words = [...WORDS].sort(() => r() - 0.5);
    let w = 0;
    const units = [-1, 1].flatMap((side) =>
      Array.from({ length: 12 }).map((_, i) => {
        const z1 = 10 - i * S.unit; // front edge of the unit (towards the camera)
        const inStore = side === store.side && z1 <= store.z1 && z1 > store.z0;
        return {
          side,
          z: z1 - S.unit / 2,
          floors: 1 + Math.floor(r() * 3),
          c: pick(["#e8dcc0", "#d8c8a8", "#c8d4d8", "#e0c8b8", "#d4d8c0", "#ece6d8", "#c8b8a0", "#b8c8b8", "#e8d0a0"]),
          shut: r(),
          interior: pick(["#4a3a30", "#3a4048", "#5a4a3a", "#3a3a32"]),
          awn: r() < 0.6 ? pick(["#2f6fb0", "#d8382c", "#3f9a5a", "#e8b030", "#f2f0e8"]) : null,
          blade: !inStore && z1 < 4 && r() < 0.65 ? { text: words[w++ % words.length], bg: pick(["#f2d23a", "#ffffff", "#d8382c", "#1f4f86", "#2d7a4a", "#e86a2a"]), neon: r() < 0.4 ? pick(["#ff5ab8", "#4ae8ff", "#ff7a3a"]) : null } : null,
          band: !inStore && r() < 0.5 ? { text: words[w++ % words.length], bg: pick(["#c0302a", "#1f4f86", "#2d7a4a", "#f2d23a", "#ffffff"]) } : null,
          lit: [r(), r(), r(), r(), r(), r()],
          ac: r() < 0.6,
          tank: r() < 0.35,
          rail: r() < 0.5,
          inStore,
        };
      }),
    );
    const scheme = pick(STORE);
    const bikes = Array.from({ length: 1 + Math.floor(r() * 3) }).map((_, i) => {
      const side = i === 0 ? store.side : r() > 0.5 ? 1 : -1;
      return { p: [side * (2.1 + r() * 0.15), 0, -2.5 - i * 2.2 - r() * 3] as V3, ry: side * (0.35 + r() * 0.3) + (r() < 0.5 ? Math.PI : 0), c: pick(["#c0302a", "#1f4f86", "#2a2a2c", "#e8e4dc", "#3f8a5a", "#e8b030"]) };
    });
    const umbrella = [pick(["#d8382c", "#2f6fb0", "#3f9a5a", "#e8b030"]), pick(["#ffffff", "#f2d23a"])];
    const cartC = pick(["#c0302a", "#1f6fb0", "#e8e4dc", "#3f8a5a"]);
    const cartWord = pick(["ลูกชิ้นปิ้ง", "ผลไม้", "ไก่ทอด", "หมูปิ้ง", "น้ำปั่น"]);
    // wires: per side between consecutive poles, plus spans across the soi; random sag and offsets
    const wires: { a: V3; b: V3; sag: number; r: number }[] = [];
    const P = S.poles;
    for (const side of [-1, 1])
      for (let i = 0; i < P.z.length - 1; i++) {
        for (let k = 0; k < 3; k++) wires.push({ a: [side * P.x + (k - 1) * 0.45, 8.55, P.z[i]], b: [side * P.x + (k - 1) * 0.45, 8.55, P.z[i + 1]], sag: 0.35 + r() * 0.2, r: 0.012 });
        const n = 3 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) wires.push({ a: [side * (P.x + 0.1 + r() * 0.15), 6.2 + r() * 0.5, P.z[i]], b: [side * (P.x + 0.1 + r() * 0.15), 6.2 + r() * 0.5, P.z[i + 1]], sag: 0.6 + r() * 0.9, r: 0.014 + r() * 0.02 });
      }
    for (let i = 0; i < P.z.length; i++)
      if (r() < 0.75) {
        const n = 1 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) wires.push({ a: [-P.x, 6.4 + r() * 1.8, P.z[i]], b: [P.x, 6.4 + r() * 1.8, P.z[Math.min(P.z.length - 1, i + (r() < 0.5 ? 1 : 0))]], sag: 0.4 + r() * 0.8, r: 0.012 });
      }
    const tangles = P.z.flatMap((z) => [-1, 1].filter(() => r() < 0.6).map((side) => ({ p: [side * (P.x + 0.15), 6.4, z] as V3, s: 0.5 + r() * 0.5 })));
    const transformers = P.z.flatMap((z) => [-1, 1].filter(() => r() < 0.25).map((side) => [side * P.x, 7.2, z] as V3));
    const tower = { x: (r() - 0.5) * 30, h: 40 + r() * 50, c: pick(["#a8b4bc", "#c8c0b0", "#8a9aa8"]) };
    return { units, scheme, bikes, umbrella, cartC, cartWord, wires, tangles, transformers, tower };
  }, [seed, S, store.side, store.z0, store.z1]);

  const wireGeo = useMemo(() => {
    const geos = L.wires.map((w) => {
      const pts = Array.from({ length: 9 }).map((_, k) => {
        const u = k / 8;
        return new THREE.Vector3(w.a[0] + (w.b[0] - w.a[0]) * u, w.a[1] + (w.b[1] - w.a[1]) * u - w.sag * 4 * u * (1 - u), w.a[2] + (w.b[2] - w.a[2]) * u);
      });
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, w.r, 3, false);
    });
    return mergeGeometries(geos);
  }, [L]);

  const tx = useMemo(() => {
    const road = makeTex(512, 512, asphalt(seed + 3), [1.2, 20]);
    const path = makeTex(128, 256, pavers, [1.5 * 0.75, 80 * 0.75]);
    const kerb = makeTex(128, 16, kerbPaint, [60, 1]);
    const shut = makeTex(64, 64, shutter, [1, 1]);
    const blades = L.units.map((u) => (u.blade ? signTex(u.blade.text, u.blade.bg, u.blade.bg === "#ffffff" || u.blade.bg === "#f2d23a" ? "#c0302a" : "#ffffff") : null));
    const bands = L.units.map((u) => (u.band ? signTex(u.band.text, u.band.bg, u.band.bg === "#ffffff" || u.band.bg === "#f2d23a" ? "#1f4f86" : "#ffffff", 512, 112) : null));
    const storeSign = signTex("ร้านสะดวกซื้อ", L.scheme.band, L.scheme.text, 768, 160, "เปิด 24 ชั่วโมง");
    const storeBlade = signTex("สะดวกซื้อ", L.scheme.band, L.scheme.text, 384, 200, "24 ชม.");
    const cartSign = signTex(L.cartWord, "#ffffff", "#c0302a", 256, 96);
    const umb = makeTex(128, 16, (c) => {
      for (let k = 0; k < 8; k++) {
        c.fillStyle = k % 2 ? L.umbrella[0] : L.umbrella[1];
        c.fillRect(k * 16, 0, 16, 16);
      }
    });
    return { road, path, kerb, shut, blades, bands, storeSign, storeBlade, cartSign, umb };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, L, fontReady]);

  const len = 140;
  const signMat = (map: THREE.Texture, glow: boolean) =>
    glow ? <meshBasicMaterial map={map} toneMapped={false} color="#e8e0d0" side={THREE.DoubleSide} /> : <meshLambertMaterial map={map} side={THREE.DoubleSide} />;

  return (
    <>
      <SkyLights kit={kit} box={30} far={90} />
      {lampOn ? (
        <>
          {S.lamps.slice(0, 2).map((p, i) => <pointLight key={i} position={[p[0], p[1] - 0.3, p[2]]} color="#ffd8a0" intensity={14 * kit.lamps} distance={16} decay={1.3} />)}
          {[-1, 1].map((k) => <pointLight key={k} position={[k * 3.4, 2.6, -9]} color="#ffc890" intensity={5 * kit.lamps} distance={9} decay={1.4} />)}
          <pointLight position={[S.lamps[3][0], S.lamps[3][1] - 0.3, S.lamps[3][2]]} color="#ffd8a0" intensity={10 * kit.lamps} distance={14} decay={1.3} />
          <pointLight position={[store.side * 3.0, 2.0, store.z1 - S.unit]} color="#dff0ff" intensity={8 * kit.lamps} distance={9} decay={1.4} />
          <pointLight position={cart.bulb} color="#ffd090" intensity={3 * kit.lamps} distance={5} decay={1.5} />
        </>
      ) : null}

      {/* road, kerbs, footpaths */}
      <mesh position={[0, 0, 10 - len / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[S.road * 2, len]} />
        <meshLambertMaterial map={tx.road} />
      </mesh>
      {[-1, 1].map((k) => (
        <group key={k}>
          <mesh position={[k * (S.road + S.facade) / 2, S.kerb, 10 - len / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[S.facade - S.road, len]} />
            <meshLambertMaterial map={tx.path} />
          </mesh>
          <mesh position={[k * S.road, S.kerb / 2, 10 - len / 2]} rotation={[0, -k * Math.PI / 2, 0]}>
            <planeGeometry args={[len, S.kerb]} />
            <meshLambertMaterial map={tx.kerb} />
          </mesh>
          {/* drain grates along the kerb */}
          {[4, -3, -10, -16].map((z) => <B key={z} p={[k * (S.road - 0.25), 0.006, z]} s={[0.35, 0.01, 0.6]} c="#3a3a3a" sh={false} />)}
        </group>
      ))}
      <mesh position={[0.6, 0.008, -7]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 12]} />
        <meshLambertMaterial color="#4a4a48" />
      </mesh>
      {/* the rows run on as plain blocks to the cross street */}
      {[-1, 1].map((k) => <B key={k} p={[k * (S.facade + 5), 5, -49]} s={[10, 10, 22]} c={k > 0 ? "#d8c8a8" : "#c8d0d0"} sh={false} />)}
      {/* cross street and a tall block at the far end */}
      <mesh position={[0, 0.004, -62]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 10]} />
        <meshLambertMaterial color="#626264" />
      </mesh>
      <B p={[L.tower.x, L.tower.h / 2, -80]} s={[16, L.tower.h, 12]} c={L.tower.c} />

      {/* shophouses */}
      {L.units.map((u, i) => {
        const h = 3.6 + 3.2 * u.floors;
        const fx = u.side * S.facade; // facade plane
        const n = -u.side; // facade normal (towards the road)
        const doorH = 2.9;
        const shutH = u.inStore ? 0 : u.shut < 0.3 ? doorH - 0.6 : u.shut < 0.55 ? 0.9 : 0.25;
        const litHere = lampOn && u.lit[0] < 0.8;
        return (
          <group key={i}>
            <B p={[fx + u.side * 5, h / 2, u.z]} s={[10, h, S.unit - 0.04]} c={u.c} />
            <B p={[fx + u.side * 0.1 + n * 0.12, h + 0.15, u.z]} s={[0.5, 0.3, S.unit]} c={shade(u.c, 0.8)} sh={false} />

            {/* ground floor: open shop or shutter */}
            {u.inStore ? null : (
              <>
                {litHere ? (
                  <Lit p={[fx + n * 0.02, doorH / 2, u.z]} s={[0.02, doorH, S.unit - 0.6]} c={shade("#ffd9a0", 0.8 + u.lit[1] * 0.2)} />
                ) : (
                  <B p={[fx + n * 0.02, doorH / 2, u.z]} s={[0.02, doorH, S.unit - 0.6]} c={u.interior} sh={false} />
                )}
                {shutH > 0 ? (
                  <mesh position={[fx + n * 0.05, doorH - shutH / 2, u.z]} rotation={[0, n * Math.PI / 2, 0]}>
                    <planeGeometry args={[S.unit - 0.6, shutH]} />
                    <meshLambertMaterial map={tx.shut} />
                  </mesh>
                ) : null}
                {u.awn ? (
                  <B p={[fx + n * 0.55, 2.95, u.z]} s={[1.15, 0.04, S.unit - 0.2]} r={[0, 0, n * 0.3]} c={u.awn} />
                ) : null}
                {tx.bands[i] ? (
                  <mesh position={[fx + n * 0.06, 3.3, u.z]} rotation={[0, n * Math.PI / 2, 0]}>
                    <planeGeometry args={[S.unit - 0.4, 0.55]} />
                    {signMat(tx.bands[i]!, lampOn)}
                  </mesh>
                ) : null}
              </>
            )}
            {/* upper floors: windows, AC units, rails */}
            {Array.from({ length: u.floors }).flatMap((_, f) =>
              [-0.95, 0.95].map((dz, k) => {
                const y = 3.6 + f * 3.2 + 1.55;
                const v = u.lit[(f * 2 + k + 1) % 6];
                return (
                  <group key={`${f}${k}`}>
                    <mesh position={[fx + n * 0.012, y, u.z + dz]} rotation={[0, n * Math.PI / 2, 0]}>
                      <planeGeometry args={[1.1, 1.25]} />
                      <meshBasicMaterial color={v < kit.litWindows ? (v < 0.12 ? "#d8e6ff" : "#ffd590") : shade("#4a5a66", 0.9 + v * 0.35)} toneMapped={false} />
                    </mesh>
                    {u.ac && k === 0 && f === 0 ? <B p={[fx + n * 0.25, y - 1.05, u.z + dz]} s={[0.3, 0.5, 0.75]} c="#e8e8e2" /> : null}
                  </group>
                );
              }),
            )}
            {u.rail && u.floors > 1 ? <B p={[fx + n * 0.45, 3.6 + 3.2 + 0.5, u.z]} s={[0.05, 1.0, S.unit - 0.3]} c="#5a5a58" sh={false} /> : null}
            {u.tank ? (
              <mesh position={[fx + u.side * 2, h + 0.9, u.z]}>
                <cylinderGeometry args={[0.6, 0.6, 1.5, 10]} />
                <meshLambertMaterial color="#d8d8d4" />
              </mesh>
            ) : null}
            {/* blade sign sticking out over the footpath, facing the camera */}
            {tx.blades[i] && u.blade ? (
              <group position={[fx + n * 0.75, 4.55, u.z + 1.2]}>
                <B p={[u.side * 0.05, 0.3, 0]} s={[1.3, 0.03, 0.03]} c="#3a3a3a" sh={false} />
                <mesh>
                  <planeGeometry args={[1.25, 0.52]} />
                  {signMat(tx.blades[i]!, lampOn)}
                </mesh>
                {lampOn && u.blade.neon ? <Lit p={[0, 0, 0.02]} s={[1.34, 0.6, 0.005]} c={u.blade.neon} opacity={0.75} /> : null}
              </group>
            ) : null}
          </group>
        );
      })}

      {/* convenience store: glass front, lit sign band, blade sign */}
      <group>
        {(() => {
          const fx = store.side * S.facade;
          const n = -store.side;
          const zc = (store.z0 + store.z1) / 2;
          const w = store.z1 - store.z0 - 0.3;
          return (
            <>
              <Lit p={[fx + n * 0.03, 1.4, zc]} s={[0.02, 2.6, w]} c={lampOn ? "#f2f8ff" : "#c8dce8"} />
              {[-0.5, 0, 0.5].map((k) => <B key={k} p={[fx + n * 0.05, 1.4, zc + k * w]} s={[0.05, 2.6, 0.08]} c="#d8d8d4" sh={false} />)}
              {/* shelves seen through the glass */}
              {[0.5, 1.0, 1.5].map((y) => <B key={y} p={[fx + n * 0.0 + store.side * 0.4, y, zc]} s={[0.05, 0.25, w - 0.4]} c={["#d8382c", "#2f6fb0", "#f2c230"][Math.round(y * 2) % 3]} sh={false} />)}
              <B p={[fx + n * 0.08, 2.86, zc]} s={[0.1, 0.12, w + 0.2]} c={L.scheme.stripe} sh={false} />
              <mesh position={[fx + n * 0.1, 3.3, zc]} rotation={[0, n * Math.PI / 2, 0]}>
                <planeGeometry args={[w, 0.8]} />
                <meshBasicMaterial map={tx.storeSign} toneMapped={false} color={lampOn ? "#ffffff" : "#e8e8e8"} side={THREE.DoubleSide} />
              </mesh>
              <group position={[fx + n * 0.8, 4.5, store.z1 - 0.3]}>
                <Rod a={[store.side * 0.8, 0.4, 0]} b={[-store.side * 0.65, 0.4, 0]} r={0.02} c="#3a3a3a" sh={false} />
                <mesh>
                  <planeGeometry args={[1.35, 0.7]} />
                  <meshBasicMaterial map={tx.storeBlade} toneMapped={false} color={lampOn ? "#ffffff" : "#ececec"} side={THREE.DoubleSide} />
                </mesh>
              </group>
            </>
          );
        })()}
      </group>

      {/* poles, lamps, transformers, wires */}
      {S.poles.z.map((z) =>
        [-1, 1].map((side) => (
          <group key={`${z}${side}`}>
            <mesh position={[side * S.poles.x, 4.75, z]} castShadow>
              <cylinderGeometry args={[0.1, 0.14, 9.5, 6]} />
              <meshLambertMaterial color="#a8a8a2" />
            </mesh>
            <B p={[side * S.poles.x, 8.55, z]} s={[1.6, 0.1, 0.1]} c="#8a8a84" sh={false} />
            <B p={[side * S.poles.x, 1.4, z]} s={[0.3, 0.25, 0.02]} c="#f2f0e8" sh={false} />
          </group>
        )),
      )}
      {S.lamps.map((p, i) => {
        const side = Math.sign(p[0]);
        return (
          <group key={i}>
            <Rod a={[side * S.poles.x, 6.7, p[2]]} b={[p[0], p[1], p[2]]} r={0.035} c="#8a8a84" sh={false} />
            <B p={[p[0], p[1] - 0.04, p[2]]} s={[0.5, 0.1, 0.22]} c="#6a6a66" sh={false} />
            <Lit p={[p[0], p[1] - 0.11, p[2]]} s={[0.42, 0.03, 0.16]} c={lampOn ? "#fff0c8" : "#d8d8d0"} />
          </group>
        );
      })}
      {L.transformers.map((p, i) => (
        <group key={i} position={p}>
          {[-0.25, 0.25].map((dz) => (
            <mesh key={dz} position={[0, 0, dz]}>
              <cylinderGeometry args={[0.22, 0.22, 0.8, 8]} />
              <meshLambertMaterial color="#8a9094" />
            </mesh>
          ))}
          <B p={[0, -0.45, 0]} s={[0.6, 0.06, 0.9]} c="#6a6a66" sh={false} />
        </group>
      ))}
      <mesh geometry={wireGeo}>
        <meshLambertMaterial color="#1e1e20" />
      </mesh>
      {L.tangles.map((t, i) => (
        <group key={i} position={t.p}>
          {[0, 1].map((k) => (
            <mesh key={k} rotation={[k, k * 0.7, 0]} scale={t.s}>
              <torusGeometry args={[0.28, 0.025, 3, 8]} />
              <meshLambertMaterial color="#1e1e20" />
            </mesh>
          ))}
        </group>
      ))}

      {/* motorbikes parked at the kerb */}
      {L.bikes.map((b, i) => <Bike key={i} {...b} />)}

      {/* food cart with umbrella */}
      <group position={[cart.x, 0, cart.z]}>
        <B p={[0, 0.55, 0]} s={[0.75, 0.5, 1.4]} c={L.cartC} />
        <B p={[0, 0.82, 0]} s={[0.8, 0.04, 1.45]} c="#d8d8d4" sh={false} />
        <mesh position={[0, 1.02, 0.1]}>
          <boxGeometry args={[0.6, 0.36, 0.9]} />
          <meshLambertMaterial color="#e8f4f8" transparent opacity={0.45} />
        </mesh>
        {[-0.2, 0.05, 0.3].map((z, k) => <B key={z} p={[0, 0.9, z]} s={[0.4, 0.08, 0.16]} c={["#c86a3a", "#e8c070", "#a8402a"][k]} sh={false} />)}
        <mesh position={[-cart.side * 0.39, 0.55, 0]} rotation={[0, -cart.side * Math.PI / 2, 0]}>
          <planeGeometry args={[1.0, 0.38]} />
          {signMat(tx.cartSign, lampOn)}
        </mesh>
        {[-0.5, 0.5].map((z) => (
          <mesh key={z} position={[0, 0.2, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.82, 10]} />
            <meshLambertMaterial color="#2a2a2a" />
          </mesh>
        ))}
        <Rod a={[0, 0.8, 0]} b={[0, 2.3, 0]} r={0.02} c="#d8d8d0" />
        <mesh position={[0, 2.25, 0]} castShadow>
          <coneGeometry args={[1.1, 0.42, 16, 1, true]} />
          <meshLambertMaterial map={tx.umb} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 2.02, 0]}>
          <sphereGeometry args={[0.05, 6, 4]} />
          <meshBasicMaterial color={lampOn ? "#fff1c8" : "#d8d4c4"} toneMapped={false} />
        </mesh>
        {/* plastic stools */}
        {[0.6, -0.7].map((z, k) => (
          <mesh key={z} position={[-cart.side * 0.75, 0.22, z]}>
            <cylinderGeometry args={[0.15, 0.18, 0.44, 8]} />
            <meshLambertMaterial color={k ? "#d8382c" : "#2f6fb0"} />
          </mesh>
        ))}
      </group>

      <Blobs blobs={blobs} y={0.02} c="#202022" o={0.3} />
    </>
  );
};
