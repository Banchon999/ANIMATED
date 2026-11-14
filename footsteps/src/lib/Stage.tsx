import React from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, useVideoConfig } from "remotion";

export type Cam = {
  pos: [number, number, number];
  look: [number, number, number];
  fov?: number;
  roll?: number;
};

export const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const roll = cam.roll ?? 0;
  camera.position.set(...cam.pos);
  camera.up.set(Math.sin(roll), Math.cos(roll), 0);
  camera.lookAt(...cam.look);
  camera.fov = cam.fov ?? 35;
  camera.near = 0.05;
  camera.far = 600;
  camera.updateProjectionMatrix();
  return null;
};

export type Layer = {
  key: string;
  blur?: number; // px — multiplane depth of field
  opacity?: number;
  node: React.ReactNode;
};

// Multiplane camera: each layer is its own transparent WebGL canvas sharing one
// camera, so every plane can be focused / defocused independently (rack focus).
export const Stage: React.FC<{
  cam: Cam;
  layers: Layer[];
  bg?: string;
  filter?: string;
  shadows?: boolean;
  fog?: [string, number, number];
}> = ({ cam, layers, bg = "#000", filter, shadows, fog }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: bg, filter }}>
      {layers.map((l) => (
        <AbsoluteFill
          key={l.key}
          style={{
            filter: l.blur && l.blur > 0.05 ? `blur(${l.blur.toFixed(2)}px)` : undefined,
            opacity: l.opacity ?? 1,
          }}
        >
          <ThreeCanvas
            width={width}
            height={height}
            shadows={shadows}
            dpr={1}
            gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
          >
            <CameraRig cam={cam} />
            {fog && <fog attach="fog" args={fog} />}
            {l.node}
          </ThreeCanvas>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
