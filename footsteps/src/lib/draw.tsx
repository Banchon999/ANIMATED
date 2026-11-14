import React, { createContext, useContext } from "react";
import * as THREE from "three";

// Palette lifted from the "flat vector educational cartoon" reference:
// muted, warm, desaturated, with a thick dark-brown ink line.
export const C = {
  ink: "#2f2a24",
  skin: "#ecdcc2",
  skinShade: "#d6c0a0",
  cheek: "#e3b9a0",
  hair: "#3a342d",
  shirt: "#6d9b93",
  shirtDark: "#557d76",
  pants: "#d9c8a6",
  pantsDark: "#bfae8c",
  shoe: "#8a7560",
  wood: "#b98d62",
  woodDark: "#8e6a48",
  wall: "#d6ccb4",
  wallLine: "#c3b89e",
  concrete: "#b8b2a2",
  concreteDark: "#9c9686",
  blood: "#7d2b24",
  bloodDark: "#5a1d18",
  rope: "#c9a86a",
  thug: "#24211e",
  van: "#5d6662",
  vanDark: "#3f4643",
  glass: "#2b3436",
  light: "#ffe7b0",
};

export const INK_W = 0.035; // outline thickness in world units

type Lit = { lit: boolean; shadows: boolean };
const LitCtx = createContext<Lit>({ lit: false, shadows: false });
export const LitScope: React.FC<{ lit?: boolean; shadows?: boolean; children: React.ReactNode }> = ({
  lit = false,
  shadows = false,
  children,
}) => <LitCtx.Provider value={{ lit, shadows }}>{children}</LitCtx.Provider>;
export const useLit = () => useContext(LitCtx);

export const Mat: React.FC<{
  color: string;
  opacity?: number;
  unlit?: boolean;
  additive?: boolean;
  map?: THREE.Texture;
  fog?: boolean;
  depthWrite?: boolean;
}> = ({ color, opacity = 1, unlit, additive, map, fog = true, depthWrite }) => {
  const { lit } = useLit();
  const common = {
    color,
    toneMapped: false,
    transparent: opacity < 1 || additive || !!map,
    opacity,
    side: THREE.DoubleSide,
    map,
    fog,
    depthWrite: depthWrite ?? !(additive || opacity < 1),
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  };
  if (lit && !unlit && !additive) return <meshLambertMaterial {...common} />;
  return <meshBasicMaterial {...common} />;
};

// a flat shape, optionally with an ink outline drawn behind it
export const F: React.FC<{
  g: THREE.BufferGeometry;
  c: string;
  pos?: [number, number, number?];
  rot?: number;
  scale?: [number, number] | number;
  opacity?: number;
  unlit?: boolean;
  additive?: boolean;
  map?: THREE.Texture;
  outline?: THREE.BufferGeometry;
  renderOrder?: number;
}> = ({ g, c, pos = [0, 0, 0], rot = 0, scale = 1, opacity = 1, unlit, additive, map, outline, renderOrder }) => {
  const { shadows } = useLit();
  const s: [number, number, number] = typeof scale === "number" ? [scale, scale, 1] : [scale[0], scale[1], 1];
  return (
    <group position={[pos[0], pos[1], pos[2] ?? 0]} rotation={[0, 0, rot]} scale={s}>
      {outline && (
        <mesh geometry={outline} position={[0, 0, -0.004]} castShadow={shadows} renderOrder={renderOrder}>
          <Mat color={C.ink} opacity={opacity} unlit />
        </mesh>
      )}
      <mesh geometry={g} castShadow={shadows && !additive && opacity > 0.5} renderOrder={renderOrder}>
        <Mat color={c} opacity={opacity} unlit={unlit} additive={additive} map={map} />
      </mesh>
    </group>
  );
};
