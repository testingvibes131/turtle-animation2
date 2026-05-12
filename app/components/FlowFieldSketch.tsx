"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Canvas, useFrame } from "@react-three/fiber";
import { folder, useControls } from "leva";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { createNoise2D } from "simplex-noise";
import * as THREE from "three";

/** Deterministic 0–1 from index (pure; avoids `Math.random` during React render). */
function hash01(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type SimState = {
  life: Float32Array;
  lifeMax: Float32Array;
};

/** World XZ under the cursor per floor slab; filled in `useFrame` before particle sim. */
type PointerRepelState = {
  active: boolean;
  xz: Float32Array;
  valid: Uint8Array;
};

/** 2D curl of a scalar field ψ = noise: v = (∂ψ/∂z, -∂ψ/∂x) → div v ≈ 0 (swirl-friendly). */
function curlXZ(
  noise2D: (x: number, z: number) => number,
  nx: number,
  nz: number,
  e: number,
): [number, number] {
  const dpsidx = (noise2D(nx + e, nz) - noise2D(nx - e, nz)) / (2 * e);
  const dpsidz = (noise2D(nx, nz + e) - noise2D(nx, nz - e)) / (2 * e);
  return [dpsidz, -dpsidx];
}

function normalize2(x: number, z: number): [number, number] {
  const len = Math.hypot(x, z);
  if (len < 1e-8) return [0, 0];
  return [x / len, z / len];
}

/**
 * World XZ spawn with optional patchiness: more particles where noise is high,
 * fewer (near-empty) where noise is low. `densityAmount` 0 = uniform.
 */
function sampleSpawnXz(
  noise2D: (x: number, z: number) => number,
  halfExtent: number,
  layerIndex: number,
  densityEnabled: boolean,
  densityAmount: number,
  zoneScale: number,
  minAccept: number,
  random01: () => number,
  maxAttempts = 28,
): { x: number; z: number } {
  const span = halfExtent * 2;
  const lo = -halfExtent;
  if (!densityEnabled || densityAmount <= 1e-5) {
    const u0 = random01();
    const u1 = random01();
    return { x: u0 * span + lo, z: u1 * span + lo };
  }
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const u0 = random01();
    const u1 = random01();
    const uGate = random01();
    const x = u0 * span + lo;
    const z = u1 * span + lo;
    const n =
      noise2D(
        x * zoneScale + layerIndex * 0.37,
        z * zoneScale - layerIndex * 0.21,
      ) *
        0.5 +
      0.5;
    const thresh = THREE.MathUtils.lerp(1, n, densityAmount);
    const accept = Math.max(minAccept, Math.min(1, thresh));
    if (uGate < accept) return { x, z };
  }
  const u0 = random01();
  const u1 = random01();
  return { x: u0 * span + lo, z: u1 * span + lo };
}

/** Brighter center floors, softer top/bottom — pairs with scene depth fog. */
function floorStackFogMults(
  floorIndex: number,
  floorCount: number,
  mix: number,
  exponent: number,
  minRgb: number,
  minOpacity: number,
): { colorMul: number; opacityMul: number } {
  if (mix <= 1e-6 || floorCount < 2) {
    return { colorMul: 1, opacityMul: 1 };
  }
  const mid = (floorCount - 1) / 2;
  const dist = Math.abs(floorIndex - mid) / Math.max(mid, 1e-6);
  const shaped = Math.pow(Math.min(dist, 1), exponent);
  const a = shaped * mix;
  return {
    colorMul: THREE.MathUtils.lerp(1, minRgb, a),
    opacityMul: THREE.MathUtils.lerp(1, minOpacity, a),
  };
}

/** Invisible pick volumes per floor (world-axis box aligned to bound shell). */
function FloorHoverPickGroup({
  ys,
  planeW,
  boxH,
  xzScale,
  yScale,
  pickGroupRef,
}: {
  ys: number[];
  planeW: number;
  boxH: number;
  xzScale: number;
  yScale: number;
  pickGroupRef: MutableRefObject<THREE.Group | null>;
}) {
  const w = planeW * xzScale;
  const h = Math.max(0.06, boxH * yScale);
  return (
    <group ref={pickGroupRef}>
      {ys.map((ly, floorIndex) => (
        <mesh
          key={`pick-${floorIndex}`}
          position={[0, ly + boxH / 2, 0]}
          userData={{ floorIndex }}
        >
          <boxGeometry args={[w, h, w]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Polylines for the open-top bound shell (bottom + top rim XZ grids, four side grids),
 * matching the old subdivided `planeGeometry` wireframe topology.
 */
function buildOpenTopBoundDashedPolylines(
  planeW: number,
  boxH: number,
  baseY: number,
  w: number,
  d: number,
  eps: number,
): THREE.Vector3[][] {
  const half = planeW * 0.5;
  const yb = baseY + eps;
  const yt = baseY + boxH;
  const yMid = baseY + boxH * 0.5;
  const ws = Math.max(1, w);
  const ds = Math.max(1, d);
  const polylines: THREE.Vector3[][] = [];

  const addGridXZ = (y: number) => {
    for (let j = 0; j <= ds; j++) {
      const ly = -half + (j * planeW) / ds;
      const row: THREE.Vector3[] = [];
      for (let i = 0; i <= ws; i++) {
        const lx = -half + (i * planeW) / ws;
        row.push(new THREE.Vector3(lx, y, -ly));
      }
      polylines.push(row);
    }
    for (let i = 0; i <= ws; i++) {
      const lx = -half + (i * planeW) / ws;
      const col: THREE.Vector3[] = [];
      for (let j = 0; j <= ds; j++) {
        const ly = -half + (j * planeW) / ds;
        col.push(new THREE.Vector3(lx, y, -ly));
      }
      polylines.push(col);
    }
  };

  addGridXZ(yb);
  addGridXZ(yt);

  // Z = +half (plane local X = world X, w segments)
  for (let i = 0; i <= ws; i++) {
    const lx = -half + (i * planeW) / ws;
    polylines.push([
      new THREE.Vector3(lx, yMid - boxH * 0.5, half),
      new THREE.Vector3(lx, yMid + boxH * 0.5, half),
    ]);
  }
  {
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= ws; i++) {
      const lx = -half + (i * planeW) / ws;
      row.push(new THREE.Vector3(lx, yMid - boxH * 0.5, half));
    }
    polylines.push(row);
  }
  {
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= ws; i++) {
      const lx = -half + (i * planeW) / ws;
      row.push(new THREE.Vector3(lx, yMid + boxH * 0.5, half));
    }
    polylines.push(row);
  }

  // Z = -half (mesh Ry(π): world (-lx, y, -half))
  for (let i = 0; i <= ws; i++) {
    const lx = -half + (i * planeW) / ws;
    polylines.push([
      new THREE.Vector3(-lx, yMid - boxH * 0.5, -half),
      new THREE.Vector3(-lx, yMid + boxH * 0.5, -half),
    ]);
  }
  {
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= ws; i++) {
      const lx = -half + (i * planeW) / ws;
      row.push(new THREE.Vector3(-lx, yMid - boxH * 0.5, -half));
    }
    polylines.push(row);
  }
  {
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= ws; i++) {
      const lx = -half + (i * planeW) / ws;
      row.push(new THREE.Vector3(-lx, yMid + boxH * 0.5, -half));
    }
    polylines.push(row);
  }

  // X = +half (Ry(-π/2): world (half, yMid+ly, lx), d segments along lx → world Z)
  for (let i = 0; i <= ds; i++) {
    const lx = -half + (i * planeW) / ds;
    polylines.push([
      new THREE.Vector3(half, yMid - boxH * 0.5, lx),
      new THREE.Vector3(half, yMid + boxH * 0.5, lx),
    ]);
  }
  {
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= ds; i++) {
      const lx = -half + (i * planeW) / ds;
      row.push(new THREE.Vector3(half, yMid - boxH * 0.5, lx));
    }
    polylines.push(row);
  }
  {
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= ds; i++) {
      const lx = -half + (i * planeW) / ds;
      row.push(new THREE.Vector3(half, yMid + boxH * 0.5, lx));
    }
    polylines.push(row);
  }

  // X = -half (Ry(π/2): world (-half, yMid+ly, -lx))
  for (let i = 0; i <= ds; i++) {
    const lx = -half + (i * planeW) / ds;
    polylines.push([
      new THREE.Vector3(-half, yMid - boxH * 0.5, -lx),
      new THREE.Vector3(-half, yMid + boxH * 0.5, -lx),
    ]);
  }
  {
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= ds; i++) {
      const lx = -half + (i * planeW) / ds;
      row.push(new THREE.Vector3(-half, yMid - boxH * 0.5, -lx));
    }
    polylines.push(row);
  }
  {
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= ds; i++) {
      const lx = -half + (i * planeW) / ds;
      row.push(new THREE.Vector3(-half, yMid + boxH * 0.5, -lx));
    }
    polylines.push(row);
  }

  return polylines;
}

function BoundDashedPolyline({
  points,
  dashSize,
  gapSize,
}: {
  points: THREE.Vector3[];
  dashSize: number;
  gapSize: number;
}) {
  const lineObj = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      dashSize,
      gapSize,
      depthWrite: true,
      fog: true,
    });
    const ln = new THREE.Line(geom, mat);
    ln.frustumCulled = false;
    ln.computeLineDistances();
    return ln;
  }, [points, dashSize, gapSize]);

  useEffect(() => {
    return () => {
      lineObj.geometry.dispose();
      (lineObj.material as THREE.Material).dispose();
    };
  }, [lineObj]);

  return <primitive object={lineObj} />;
}

/** Open-top bound shell: dashed lines, same grid layout as the old mesh wireframe. */
function OpenTopFloorBoundWireframe({
  planeW,
  boxH,
  baseY,
  w,
  d,
  color,
  opacityScale = 1,
  colorDim = 1,
  floorIndex,
  floorHoverRef,
  hoverFocusEnabled,
  hoverDimOthersOpacity,
  hoverDimOthersRgb,
}: {
  planeW: number;
  boxH: number;
  baseY: number;
  w: number;
  d: number;
  color: string;
  opacityScale?: number;
  colorDim?: number;
  floorIndex: number;
  floorHoverRef: MutableRefObject<number | null>;
  hoverFocusEnabled: boolean;
  hoverDimOthersOpacity: number;
  hoverDimOthersRgb: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const baseRgb = useMemo(() => {
    const c = new THREE.Color(color);
    c.multiplyScalar(colorDim);
    return c;
  }, [color, colorDim]);
  const eps = 0.002;
  const dashSize = Math.max(0.02, planeW * 0.028);
  const gapSize = Math.max(0.012, planeW * 0.018);

  const polylines = useMemo(
    () => buildOpenTopBoundDashedPolylines(planeW, boxH, baseY, w, d, eps),
    [planeW, boxH, baseY, w, d, eps],
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const hf = hoverFocusEnabled ? floorHoverRef.current : null;
    const rgbM = hf === null ? 1 : floorIndex === hf ? 1 : hoverDimOthersRgb;
    const opM = hf === null ? 1 : floorIndex === hf ? 1 : hoverDimOthersOpacity;
    const op = Math.min(1, 0.92 * opacityScale * opM);
    g.traverse((obj) => {
      if (obj instanceof THREE.Line && obj.material) {
        const m = obj.material as THREE.LineDashedMaterial;
        m.color.copy(baseRgb).multiplyScalar(rgbM);
        m.opacity = op;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {polylines.map((pts, i) => (
        <BoundDashedPolyline
          key={i}
          points={pts}
          dashSize={dashSize}
          gapSize={gapSize}
        />
      ))}
    </group>
  );
}

/** Open-top shell: frosted “glass” — unlit so it stays correct with scene lights at 0. */
function OpenTopFloorBoundSolid({
  planeW,
  boxH,
  baseY,
  color,
  colorDim = 1,
  shellOpacity,
  shellBrightness,
  opacityScale = 1,
}: {
  planeW: number;
  boxH: number;
  baseY: number;
  color: string;
  colorDim?: number;
  /** Base alpha (0–1); stack `opacityScale` only (same look on every floor). */
  shellOpacity: number;
  /** Multiplies RGB (unlit shell); lower = dimmer panels. */
  shellBrightness: number;
  opacityScale?: number;
}) {
  const half = planeW * 0.5;
  const yMid = baseY + boxH * 0.5;
  /** Slight lift avoids z-fighting with the ground / wire bottom grid. */
  const yBottom = baseY + 0.004;

  /** Stack fog slightly cools edge floors; keep small so white stays white. */
  const baseRgb = useMemo(() => {
    const c = new THREE.Color(color);
    const k = THREE.MathUtils.lerp(1, colorDim, 0.06);
    c.multiplyScalar(k);
    return c;
  }, [color, colorDim]);
  const scratchRgb = useRef(new THREE.Color());

  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const op = Math.min(1, shellOpacity * opacityScale);
    const c = scratchRgb.current;
    c.copy(baseRgb).multiplyScalar(THREE.MathUtils.clamp(shellBrightness, 0, 2));
    g.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material && !Array.isArray(o.material)) {
        const m = o.material as THREE.MeshBasicMaterial;
        m.color.copy(c);
        m.opacity = op;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yBottom, 0]}>
        <planeGeometry args={[planeW, planeW]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={shellOpacity}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>
      <mesh position={[0, yMid, half]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[planeW, boxH]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={shellOpacity}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>
      <mesh position={[0, yMid, -half]}>
        <planeGeometry args={[planeW, boxH]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={shellOpacity}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>
      <mesh position={[half, yMid, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[planeW, boxH]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={shellOpacity}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>
      <mesh position={[-half, yMid, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[planeW, boxH]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={shellOpacity}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>
    </group>
  );
}

type FlowFieldLayerProps = {
  layerIndex: number;
  y: number;
  count: number;
  trailLen: number;
  halfExtent: number;
  noise2D: ReturnType<typeof createNoise2D>;
  toneNoise2D: ReturnType<typeof createNoise2D>;
  noiseScale: number;
  secondaryScale: number;
  secondaryCurlMix: number;
  noiseLayerOffset: number;
  flowTimeDrift: number;
  curlStrength: number;
  curlSampleEps: number;
  speed: number;
  wrapEdges: boolean;
  verticalDriftMix: number;
  verticalStrength: number;
  verticalClamp: number;
  lifeMin: number;
  lifeMax: number;
  toneMix: number;
  toneScale: number;
  toneFlow: number;
  grayFadeLo: number;
  grayFadeHi: number;
  grayStrength: number;
  greenFadeLo: number;
  greenFadeHi: number;
  greenStrength: number;
  tailBrightness: number;
  headBrightness: number;
  lineShimmer: number;
  colorWhite: string;
  colorGray: string;
  colorGreen: string;
  lineOpacity: number;
  lineWidth: number;
  lineParticleWeightSpread: number;
  blending: "additive" | "normal";
  depthWrite: boolean;
  floorColorMul: number;
  floorOpacityMul: number;
  floorHoverRef: MutableRefObject<number | null>;
  hoverFocusEnabled: boolean;
  hoverDimOthersOpacity: number;
  hoverDimOthersRgb: number;
  pointerRepelRef: MutableRefObject<PointerRepelState>;
  pointerRepelRadius: number;
  pointerRepelStrength: number;
  particleDensityZones: boolean;
  particleDensityAmount: number;
  particleDensityScale: number;
  particleDensityMinAccept: number;
};

function FlowFieldLayer({
  layerIndex,
  y,
  count,
  trailLen,
  halfExtent,
  noise2D,
  toneNoise2D,
  noiseScale,
  secondaryScale,
  secondaryCurlMix,
  noiseLayerOffset,
  flowTimeDrift,
  curlStrength,
  curlSampleEps,
  speed,
  wrapEdges,
  verticalDriftMix,
  verticalStrength,
  verticalClamp,
  lifeMin,
  lifeMax,
  toneMix,
  toneScale,
  toneFlow,
  grayFadeLo,
  grayFadeHi,
  grayStrength,
  greenFadeLo,
  greenFadeHi,
  greenStrength,
  tailBrightness,
  headBrightness,
  lineShimmer,
  colorWhite,
  colorGray,
  colorGreen,
  lineOpacity,
  lineWidth,
  lineParticleWeightSpread,
  blending,
  depthWrite,
  floorColorMul,
  floorOpacityMul,
  floorHoverRef,
  hoverFocusEnabled,
  hoverDimOthersOpacity,
  hoverDimOthersRgb,
  pointerRepelRef,
  pointerRepelRadius,
  pointerRepelStrength,
  particleDensityZones,
  particleDensityAmount,
  particleDensityScale,
  particleDensityMinAccept,
}: FlowFieldLayerProps) {
  const simRef = useRef<SimState | null>(null);
  const trailRef = useRef<Float32Array | null>(null);

  const colWhite = useMemo(() => new THREE.Color(colorWhite), [colorWhite]);
  const colGray = useMemo(() => new THREE.Color(colorGray), [colorGray]);
  const colGreen = useMemo(() => new THREE.Color(colorGreen), [colorGreen]);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const segCount = Math.max(0, trailLen - 1);
  const lineVertexCount = count * segCount * 2;

  const geometry = useMemo(() => {
    const positions = new Float32Array(lineVertexCount * 3);
    const colors = new Float32Array(lineVertexCount * 3);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geom;
  }, [lineVertexCount]);

  const sampleParticleTone = (
    x: number,
    z: number,
    phase: number,
    flowTime: number,
    out: THREE.Color,
  ) => {
    if (toneMix <= 1e-6) {
      out.copy(colWhite);
      return;
    }
    const warp = toneNoise2D(x * 0.024 + 4.1, z * 0.024 + 2.7) * 0.75;
    const ux =
      x * toneScale + phase * 1.05 + warp;
    const uz =
      z * toneScale * 0.96 - phase * 0.72 + flowTime * toneFlow;
    const n = toneNoise2D(ux, uz) * 0.5 + 0.5;

    const gLo = Math.min(grayFadeLo, grayFadeHi - 0.02);
    const gHi = Math.max(grayFadeHi, gLo + 0.02);
    const grayMix =
      (1 - THREE.MathUtils.smoothstep(n, gLo, gHi)) *
      grayStrength *
      toneMix;

    const grLo = Math.min(greenFadeLo, greenFadeHi - 0.02);
    const grHi = Math.max(greenFadeHi, grLo + 0.02);
    const greenMix =
      THREE.MathUtils.smoothstep(n, grLo, grHi) * greenStrength * toneMix;

    out.copy(colWhite);
    out.lerp(colGray, THREE.MathUtils.clamp(grayMix, 0, 1));
    const g = THREE.MathUtils.clamp(greenMix, 0, 1);
    out.lerp(colGreen, g * (1 - THREE.MathUtils.clamp(grayMix, 0, 1) * 0.55));
  };

  const lineRef = useRef<THREE.LineSegments>(null);

  const writeLineAttributes = (trail: Float32Array, flowTime: number) => {
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
    const linePos = posAttr.array as Float32Array;
    const lineCol = colAttr.array as Float32Array;
    const phase = layerIndex * noiseLayerOffset;

    const hf = hoverFocusEnabled ? floorHoverRef.current : null;
    const hoverRgbMul =
      hf === null ? 1 : layerIndex === hf ? 1 : hoverDimOthersRgb;

    for (let i = 0; i < count; i++) {
      const tb = i * trailLen * 3;
      let w = i * segCount * 6;
      for (let k = 0; k < segCount; k++) {
        const k0 = tb + k * 3;
        const k1 = tb + (k + 1) * 3;
        const ax = trail[k0];
        const ay = trail[k0 + 1];
        const az = trail[k0 + 2];
        const bx = trail[k1];
        const by = trail[k1 + 1];
        const bz = trail[k1 + 2];

        const dx = bx - ax;
        const dz = bz - az;
        const distXZ = Math.hypot(dx, dz);
        const wrapped = distXZ > halfExtent * 0.85;

        if (wrapped) {
          linePos[w] = ax;
          linePos[w + 1] = ay;
          linePos[w + 2] = az;
          linePos[w + 3] = ax;
          linePos[w + 4] = ay;
          linePos[w + 5] = az;
          lineCol[w] = 0;
          lineCol[w + 1] = 0;
          lineCol[w + 2] = 0;
          lineCol[w + 3] = 0;
          lineCol[w + 4] = 0;
          lineCol[w + 5] = 0;
        } else {
          linePos[w] = ax;
          linePos[w + 1] = ay;
          linePos[w + 2] = az;
          linePos[w + 3] = bx;
          linePos[w + 4] = by;
          linePos[w + 5] = bz;

          const tNew = segCount > 1 ? 1 - k / (segCount - 1) : 1;
          let brightA =
            THREE.MathUtils.lerp(tailBrightness, headBrightness, tNew) *
            (1 -
              lineShimmer +
              lineShimmer *
                (0.5 +
                  0.5 *
                    Math.sin(ax * 27.17 + az * 19.03 + layerIndex + i * 0.01)));
          const tOld = segCount > 1 ? 1 - (k + 1) / (segCount - 1) : 0;
          let brightB =
            THREE.MathUtils.lerp(tailBrightness, headBrightness, tOld) *
            (1 -
              lineShimmer +
              lineShimmer *
                (0.5 +
                  0.5 *
                    Math.sin(bx * 27.17 + bz * 19.03 + layerIndex + i * 0.01)));

          if (lineParticleWeightSpread > 1e-5) {
            const s = lineParticleWeightSpread;
            const pw = THREE.MathUtils.clamp(
              1 + (hash01(i, layerIndex * 53 + 2) * 2 - 1) * s,
              Math.max(0.18, 1 - s),
              1 + s,
            );
            brightA *= pw;
            brightB *= pw;
          }

          sampleParticleTone(ax, az, phase, flowTime, tmpColor);
          lineCol[w] = tmpColor.r * brightA * floorColorMul * hoverRgbMul;
          lineCol[w + 1] = tmpColor.g * brightA * floorColorMul * hoverRgbMul;
          lineCol[w + 2] = tmpColor.b * brightA * floorColorMul * hoverRgbMul;
          sampleParticleTone(bx, bz, phase, flowTime, tmpColor);
          lineCol[w + 3] = tmpColor.r * brightB * floorColorMul * hoverRgbMul;
          lineCol[w + 4] = tmpColor.g * brightB * floorColorMul * hoverRgbMul;
          lineCol[w + 5] = tmpColor.b * brightB * floorColorMul * hoverRgbMul;
        }

        w += 6;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  };

  useLayoutEffect(() => {
    const life = new Float32Array(count);
    const lifeMaxArr = new Float32Array(count);
    const span = Math.max(0.001, lifeMax - lifeMin);
    const trail = new Float32Array(count * trailLen * 3);

    for (let i = 0; i < count; i++) {
      const L = lifeMin + hash01(i, layerIndex * 97 + 11) * span;
      life[i] = L;
      lifeMaxArr[i] = L;

      let slot = 0;
      const { x, z } = sampleSpawnXz(
        noise2D,
        halfExtent,
        layerIndex,
        particleDensityZones,
        particleDensityAmount,
        particleDensityScale,
        particleDensityMinAccept,
        () => {
          slot += 1;
          return hash01(i * 47 + slot, layerIndex * 91 + 8801);
        },
      );
      const tb = i * trailLen * 3;
      for (let k = 0; k < trailLen; k++) {
        trail[tb + k * 3] = x;
        trail[tb + k * 3 + 1] = y;
        trail[tb + k * 3 + 2] = z;
      }
    }

    simRef.current = { life, lifeMax: lifeMaxArr };
    trailRef.current = trail;
    writeLineAttributes(trail, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reseed when counts/bounds/density change
  }, [
    count,
    trailLen,
    layerIndex,
    halfExtent,
    y,
    lifeMin,
    lifeMax,
    particleDensityZones,
    particleDensityAmount,
    particleDensityScale,
    particleDensityMinAccept,
    noise2D,
  ]);

  const spawn = (i: number, sim: SimState) => {
    const trail = trailRef.current;
    if (!trail) return;

    const { x, z } = sampleSpawnXz(
      noise2D,
      halfExtent,
      layerIndex,
      particleDensityZones,
      particleDensityAmount,
      particleDensityScale,
      particleDensityMinAccept,
      Math.random,
    );
    const tb = i * trailLen * 3;
    for (let k = 0; k < trailLen; k++) {
      trail[tb + k * 3] = x;
      trail[tb + k * 3 + 1] = y;
      trail[tb + k * 3 + 2] = z;
    }

    const span = Math.max(0.001, lifeMax - lifeMin);
    sim.life[i] = lifeMin + Math.random() * span;
    sim.lifeMax[i] = sim.life[i];
  };

  useFrame(({ clock }, delta) => {
    const sim = simRef.current;
    const trail = trailRef.current;
    if (!sim || !trail || segCount < 1) return;

    const dt = Math.min(delta, 1 / 30);
    const step = speed * dt * curlStrength;
    const phase = layerIndex * noiseLayerOffset;
    const flowTime = clock.elapsedTime * flowTimeDrift;
    const e = curlSampleEps;

    for (let i = 0; i < count; i++) {
      sim.life[i] -= dt;
      if (sim.life[i] <= 0) {
        spawn(i, sim);
      }

      const tb = i * trailLen * 3;
      let x = trail[tb];
      let py = trail[tb + 1];
      let z = trail[tb + 2];

      const nx = x * noiseScale + phase + flowTime;
      const nz = z * noiseScale + phase * 0.71 + flowTime * 0.28;
      let [vx, vz] = curlXZ(noise2D, nx, nz, e);

      if (secondaryCurlMix > 0.02) {
        const nx2 = x * noiseScale * secondaryScale + phase * 1.3 - flowTime * 0.15;
        const nz2 = z * noiseScale * secondaryScale + phase * 0.55 + flowTime * 0.41;
        const [vx2, vz2] = curlXZ(noise2D, nx2, nz2, e * 0.85);
        vx = vx * (1 - secondaryCurlMix) + vx2 * secondaryCurlMix;
        vz = vz * (1 - secondaryCurlMix) + vz2 * secondaryCurlMix;
      }

      const [ux, uz] = normalize2(vx, vz);
      x += ux * step;
      z += uz * step;

      const pr = pointerRepelRef.current;
      if (pr.active && pr.valid[layerIndex] && pointerRepelStrength > 1e-6) {
        const px = pr.xz[layerIndex * 2];
        const pz = pr.xz[layerIndex * 2 + 1];
        const dx = x - px;
        const dz = z - pz;
        const dist = Math.hypot(dx, dz);
        const R = pointerRepelRadius;
        if (dist < R) {
          if (dist > 1e-7) {
            const u = 1 - dist / R;
            const w = u * u * (3 - 2 * u);
            const inv = 1 / dist;
            const push = pointerRepelStrength * w * step;
            x += dx * inv * push;
            z += dz * inv * push;
          } else {
            const ang = hash01(i, layerIndex * 401 + 17) * Math.PI * 2;
            const push = pointerRepelStrength * step * 0.65;
            x += Math.cos(ang) * push;
            z += Math.sin(ang) * push;
          }
        }
      }

      if (verticalDriftMix > 1e-5) {
        const nyx =
          x * noiseScale * 0.74 + phase * 1.12 + flowTime * 0.19;
        const nyz =
          z * noiseScale * 0.74 - phase * 0.61 + flowTime * 0.11;
        let vy = noise2D(nyx, nyz);
        if (secondaryCurlMix > 0.02) {
          const nyx2 =
            x * noiseScale * secondaryScale * 0.55 +
            phase * 0.88 -
            flowTime * 0.12;
          const nyz2 =
            z * noiseScale * secondaryScale * 0.55 +
            phase * 0.33 +
            flowTime * 0.27;
          vy =
            vy * (1 - secondaryCurlMix * 0.35) +
            noise2D(nyx2, nyz2) * secondaryCurlMix * 0.35;
        }
        py +=
          vy *
          step *
          verticalStrength *
          verticalDriftMix *
          1.85;
        py = THREE.MathUtils.clamp(py, y - verticalClamp, y + verticalClamp);
      } else {
        py = y;
      }

      if (wrapEdges) {
        if (x > halfExtent) x -= 2 * halfExtent;
        if (x < -halfExtent) x += 2 * halfExtent;
        if (z > halfExtent) z -= 2 * halfExtent;
        if (z < -halfExtent) z += 2 * halfExtent;
      } else if (
        x > halfExtent ||
        x < -halfExtent ||
        z > halfExtent ||
        z < -halfExtent
      ) {
        spawn(i, sim);
        x = trail[tb];
        z = trail[tb + 2];
      }

      for (let k = trailLen - 1; k >= 1; k--) {
        const dst = tb + k * 3;
        const src = tb + (k - 1) * 3;
        trail[dst] = trail[src];
        trail[dst + 1] =
          verticalDriftMix > 1e-5 ? trail[src + 1] : y;
        trail[dst + 2] = trail[src + 2];
      }
      trail[tb] = x;
      trail[tb + 1] = py;
      trail[tb + 2] = z;
    }

    writeLineAttributes(trail, flowTime);

    const hf = hoverFocusEnabled ? floorHoverRef.current : null;
    const hoverOpMul =
      hf === null ? 1 : layerIndex === hf ? 1 : hoverDimOthersOpacity;
    const mat = lineRef.current?.material as THREE.LineBasicMaterial | undefined;
    if (mat) {
      mat.opacity = lineOpacity * floorOpacityMul * hoverOpMul;
    }
  });

  const blendMode =
    blending === "additive" ? THREE.AdditiveBlending : THREE.NormalBlending;

  if (segCount < 1) return null;

  return (
    <lineSegments ref={lineRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={lineOpacity * floorOpacityMul}
        linewidth={lineWidth}
        blending={blendMode}
        depthWrite={depthWrite}
        fog
      />
    </lineSegments>
  );
}

function FlowFieldScene({
  floorHoverRef,
  pointerOverSketchRef,
}: {
  floorHoverRef: MutableRefObject<number | null>;
  pointerOverSketchRef: MutableRefObject<boolean>;
}) {
  const noise2D = useMemo(() => createNoise2D(), []);
  const toneNoise2D = useMemo(() => createNoise2D(), []);

  const cfg = useControls({
    Floors: folder({
      floorCount: { value: 4, min: 1, max: 12, step: 1 },
      floorSpacing: { value: 1.5, min: 0.35, max: 6, step: 0.05 },
      stackCenterY: {
        value: 11.7,
        min: -18,
        max: 24,
        step: 0.25,
        label: "Stack center Y",
      },
      floorStackFogMix: {
        value: 0.42,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Stack fog (top/bottom vs center)",
      },
      floorStackFogExponent: {
        value: 1.2,
        min: 0.35,
        max: 3.5,
        step: 0.05,
        label: "Stack fog curve (higher = tighter center)",
      },
      floorStackFogMinBright: {
        value: 0.38,
        min: 0.08,
        max: 0.95,
        step: 0.02,
        label: "Stack fog — dimmest RGB (edges)",
      },
      floorStackFogMinOpacity: {
        value: 0.52,
        min: 0.12,
        max: 1,
        step: 0.02,
        label: "Stack fog — softest opacity (edges)",
      },
    }),
    Particles: folder({
      particleCount: { value: 7000, min: 800, max: 14000, step: 100 },
      trailLength: {
        value: 7,
        min: 6,
        max: 48,
        step: 1,
        label: "Trail samples",
      },
      particleDensityZones: {
        value: true,
        label: "Sparse / dense patches (XZ)",
      },
      particleDensityAmount: {
        value: 0.55,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Patch contrast (0 = uniform)",
      },
      particleDensityScale: {
        value: 0.095,
        min: 0.025,
        max: 0.42,
        step: 0.005,
        label: "Patch size (higher = smaller blobs)",
      },
      particleDensityMinAccept: {
        value: 0.045,
        min: 0,
        max: 0.35,
        step: 0.005,
        label: "Min spawn weight (keeps rare spawns in voids)",
      },
    }),
    Life: folder({
      lifeMin: { value: 4, min: 0.5, max: 40, step: 0.25 },
      lifeMax: { value: 14, min: 1, max: 60, step: 0.25 },
      wrapEdges: {
        value: true,
        label: "Wrap at edges (else respawn on exit)",
      },
    }),
    Flow: folder({
      halfExtent: { value: 9, min: 2, max: 20, step: 0.5 },
      noiseScale: {
        value: 0.095,
        min: 0.02,
        max: 0.35,
        step: 0.005,
        label: "Noise scale (center floor)",
      },
      noiseScalePerFloor: {
        value: 0.055,
        min: -0.2,
        max: 0.2,
        step: 0.001,
        label: "Noise scale random ± (per floor)",
      },
      secondaryScale: {
        value: 2.35,
        min: 1.1,
        max: 4.5,
        step: 0.05,
        label: "2nd curl scale (detail)",
      },
      secondaryCurlMix: {
        value: 0.14,
        min: 0,
        max: 1,
        step: 0.02,
        label: "2nd curl mix",
      },
      noiseLayerOffset: {
        value: 0.7,
        min: 0,
        max: 2,
        step: 0.05,
        label: "Field phase offset",
      },
      curlStrength: {
        value: 1.05,
        min: 0.2,
        max: 2.5,
        step: 0.05,
        label: "Curl / speed mult.",
      },
      curlSampleEps: {
        value: 0.07,
        min: 0.02,
        max: 0.2,
        step: 0.005,
        label: "Curl sample ε (noise space)",
      },
      flowTimeDrift: {
        value: 0.07,
        min: 0,
        max: 0.45,
        step: 0.01,
        label: "Flow drift over time",
      },
      speed: { value: 0.6, min: 0.2, max: 6, step: 0.05 },
      verticalDriftMix: {
        value: 0.88,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Vertical drift (Y)",
      },
      verticalStrength: {
        value: 0.2,
        min: 0,
        max: 0.65,
        step: 0.01,
        label: "Vertical vs horizontal step",
      },
      verticalClamp: {
        value: 0.3,
        min: 0.05,
        max: 1.1,
        step: 0.02,
        label: "Vertical range ± (world)",
      },
    }),
    Tone: folder({
      toneMix: {
        value: 1,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Gray / green zones (0 = white only)",
      },
      toneScale: {
        value: 0.12,
        min: 0.015,
        max: 0.16,
        step: 0.002,
        label: "Zone patch size",
      },
      toneFlow: {
        value: 0.028,
        min: 0,
        max: 0.12,
        step: 0.002,
        label: "Zones drift (time)",
      },
      grayFadeLo: {
        value: 0.5,
        min: 0,
        max: 0.55,
        step: 0.01,
        label: "Gray — full below (noise 0–1)",
      },
      grayFadeHi: {
        value: 0.46,
        min: 0.1,
        max: 0.65,
        step: 0.01,
        label: "Gray — fade out by",
      },
      grayStrength: {
        value: 0.88,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Gray zone amount",
      },
      greenFadeLo: {
        value: 0.54,
        min: 0.25,
        max: 0.85,
        step: 0.01,
        label: "Green — start by",
      },
      greenFadeHi: {
        value: 1.0,
        min: 0.35,
        max: 1,
        step: 0.01,
        label: "Green — full by",
      },
      greenStrength: {
        value: 0.9,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Green zone amount",
      },
    }),
    Lines: folder({
      headBrightness: {
        value: 1.15,
        min: 0.2,
        max: 2,
        step: 0.05,
        label: "Head brightness",
      },
      tailBrightness: {
        value: 0.14,
        min: 0.02,
        max: 0.85,
        step: 0.01,
        label: "Tail brightness (trail)",
      },
      lineShimmer: {
        value: 0.7,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Shimmer in streak",
      },
      lineOpacity: {
        value: 0.82,
        min: 0.04,
        max: 1,
        step: 0.01,
        label: "Line alpha (lower = finer stack)",
      },
      lineWidth: {
        value: 1.45,
        min: 1,
        max: 4,
        step: 0.05,
        label: "Line width (px, driver-dependent)",
      },
      lineWidthFloorSpread: {
        value: 0.42,
        min: 0,
        max: 1.15,
        step: 0.02,
        label: "Line width random ± (per floor)",
      },
      lineParticleWeightSpread: {
        value: 0.28,
        min: 0,
        max: 0.78,
        step: 0.01,
        label: "Trail brightness vary (per line)",
      },
      blending: { value: "additive", options: ["additive", "normal"] },
      depthWrite: false,
    }),
    Look: folder({
      colorWhite: { value: "#ffffff", label: "White / base" },
      colorGray: { value: "#6e6e6e", label: "Gray zone" },
      colorGreen: { value: "#73f36c", label: "Green zone" },
    }),
    Scene: folder({
      showBoundBox: {
        value: true,
        label: "Wireframe overlay (dashed edges)",
      },
      boundBoxHeight: {
        value: 0.55,
        min: 0.08,
        max: 6,
        step: 0.05,
        label: "Box height",
      },
      boundBoxColor: { value: "#454545", label: "Box wire color" },
      boundBoxGlass: {
        value: true,
        label: "Frosted glass shell (open top)",
      },
      boundBoxGlassColor: {
        value: "#ffffff",
        label: "Glass tint (albedo; #fff = white)",
      },
      boundBoxGlassOpacity: {
        value: 0.3,
        min: 0.1,
        max: 0.98,
        step: 0.01,
        label: "Glass alpha (density)",
      },
      boundBoxGlassBrightness: {
        value: 0.015,
        min: 0.0,
        max: 1.25,
        step: 0.02,
        label: "Glass brightness (RGB mult.)",
      },
      boxSegWBase: {
        value: 2,
        min: 1,
        max: 24,
        step: 1,
        label: "Box X segments (horizontal, base floor)",
      },
      boxSegWPerFloor: {
        value: 1,
        min: -3,
        max: 4,
        step: 1,
        label: "Box X seg. Δ / floor",
      },
      boxSegDBase: {
        value: 2,
        min: 1,
        max: 24,
        step: 1,
        label: "Box Z segments (horizontal, base floor)",
      },
      boxSegDPerFloor: {
        value: 0,
        min: -3,
        max: 4,
        step: 1,
        label: "Box Z seg. Δ / floor",
      },
      showGround: false,
      groundOpacity: { value: 0.14, min: 0, max: 1, step: 0.05 },
      groundSizeMul: { value: 2.2, min: 1.2, max: 3, step: 0.05 },
      showGrid: false,
      gridDivisions: { value: 48, min: 8, max: 96, step: 4 },
      gridSizeMul: { value: 2.4, min: 1.2, max: 3.5, step: 0.05 },
      ambient: { value: 0, min: 0, max: 1.2, step: 0.05 },
      directional: { value: 0, min: 0, max: 2, step: 0.05 },
      fogEnabled: { value: true, label: "Depth fog (black)" },
      fogNear: {
        value: 70,
        min: 20,
        max: 220,
        step: 2,
        label: "Fog start (distance)",
      },
      fogFar: {
        value: 90,
        min: 60,
        max: 520,
        step: 5,
        label: "Fog full (distance)",
      },
      hoverFocusEnabled: {
        value: true,
        label: "Mouse floor focus (dim others)",
      },
      hoverDimOthersOpacity: {
        value: 0.13,
        min: 0.02,
        max: 0.55,
        step: 0.01,
        label: "Non-hover floor opacity mult.",
      },
      hoverDimOthersRgb: {
        value: 0.24,
        min: 0.05,
        max: 0.65,
        step: 0.01,
        label: "Non-hover floor color mult.",
      },
      hoverPickXZScale: {
        value: 0.96,
        min: 0.72,
        max: 1,
        step: 0.01,
        label: "Pick volume width (× slab)",
      },
      hoverPickYScale: {
        value: 1.06,
        min: 0.85,
        max: 1.35,
        step: 0.01,
        label: "Pick volume height (× box H)",
      },
      pointerRepelEnabled: {
        value: true,
        label: "Cursor repels particles",
      },
      pointerRepelRadius: {
        value: 2.85,
        min: 0.35,
        max: 14,
        step: 0.05,
        label: "Repel radius (world XZ)",
      },
      pointerRepelStrength: {
        value: 2.35,
        min: 0,
        max: 10,
        step: 0.05,
        label: "Repel strength (× flow step)",
      },
    }),
    Post: folder({
      bloomEnabled: { value: true, label: "Bloom (glow)" },
      bloomIntensity: {
        value: 1.25,
        min: 0,
        max: 2.5,
        step: 0.05,
        label: "Bloom intensity",
      },
      bloomThreshold: {
        value: 0.01,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Bloom luminance threshold",
      },
      bloomSmoothing: {
        value: 0.05,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Bloom luminance smoothing",
      },
      bloomRadius: {
        value: 0.42,
        min: 0,
        max: 1,
        step: 0.02,
        label: "Bloom kernel radius",
      },
      bloomMipmapBlur: {
        value: true,
        label: "Bloom mipmap blur (softer)",
      },
    }),
    Orbit: folder({
      cameraFov: {
        value: 16,
        min: 4,
        max: 50,
        step: 0.5,
        label: "FOV ° (low = tighter / telephoto)",
      },
      camX: {
        value: 57,
        min: -240,
        max: 240,
        step: 0.5,
        label: "Position X",
      },
      camY: {
        value: 35,
        min: -40,
        max: 280,
        step: 0.5,
        label: "Position Y",
      },
      camZ: {
        value: 46,
        min: -240,
        max: 240,
        step: 0.5,
        label: "Position Z",
      },
      lookAtYOffset: {
        value: 3.5,
        min: -14,
        max: 14,
        step: 0.25,
        label: "Look-at Y (+ sinks subject)",
      },
      minDistance: { value: 32, min: 15, max: 95, step: 1 },
      maxDistance: { value: 195, min: 60, max: 300, step: 2 },
      minPolarAngle: {
        value: 0.52,
        min: 0,
        max: 1.35,
        step: 0.02,
        label: "Min polar (less overhead / nearer ground)",
      },
      polarFloor: {
        value: 0.06,
        min: 0,
        max: 1.2,
        step: 0.02,
        label: "Max polar margin (horizon)",
      },
    }),
  });

  const halfExtent = cfg.halfExtent;
  const groundW = halfExtent * cfg.groundSizeMul * 2;
  const gridSize = halfExtent * cfg.gridSizeMul;
  const trailLen = Math.max(2, Math.round(cfg.trailLength));
  const nParticles = Math.round(cfg.particleCount);

  const planeW = halfExtent * 2;
  const boxH = cfg.boundBoxHeight;
  const floorCount = Math.max(1, Math.round(cfg.floorCount));
  const floorMid = (floorCount - 1) / 2;
  const ys = useMemo(() => {
    return Array.from({ length: floorCount }, (_, i) => {
      return cfg.stackCenterY + (i - floorMid) * cfg.floorSpacing;
    });
  }, [floorCount, cfg.floorSpacing, cfg.stackCenterY, floorMid]);

  const noiseScaleForFloor = (floorIndex: number) => {
    const u = hash01(floorIndex * 131 + 7, 9001);
    const offset = (u * 2 - 1) * cfg.noiseScalePerFloor;
    return THREE.MathUtils.clamp(cfg.noiseScale + offset, 0.02, 0.35);
  };

  const lineWidthForFloor = (floorIndex: number) => {
    const base = cfg.lineWidth;
    const spread = cfg.lineWidthFloorSpread;
    if (spread <= 1e-6) return base;
    const u = hash01(floorIndex * 97 + 11, 5503);
    const w = base * (1 + (u * 2 - 1) * spread);
    return THREE.MathUtils.clamp(w, 1, 4);
  };

  /** Horizontal subdivisions only (X/Z); Y segments stay 1 so the slab has no vertical wire splits. */
  const boxHorizontalSegmentsForFloor = (floorIndex: number) => {
    const w = Math.max(
      1,
      Math.round(cfg.boxSegWBase + floorIndex * cfg.boxSegWPerFloor),
    );
    const d = Math.max(
      1,
      Math.round(cfg.boxSegDBase + floorIndex * cfg.boxSegDPerFloor),
    );
    return { w, d };
  };

  const camPos: [number, number, number] = [cfg.camX, cfg.camY, cfg.camZ];
  const fogNear = Math.min(cfg.fogNear, cfg.fogFar - 5);

  const floorFogByIndex = useMemo(() => {
    return Array.from({ length: floorCount }, (_, i) =>
      floorStackFogMults(
        i,
        floorCount,
        cfg.floorStackFogMix,
        cfg.floorStackFogExponent,
        cfg.floorStackFogMinBright,
        cfg.floorStackFogMinOpacity,
      ),
    );
  }, [
    floorCount,
    cfg.floorStackFogMix,
    cfg.floorStackFogExponent,
    cfg.floorStackFogMinBright,
    cfg.floorStackFogMinOpacity,
  ]);

  const pointerRepelRef = useRef<PointerRepelState>({
    active: false,
    xz: new Float32Array(0),
    valid: new Uint8Array(0),
  });

  useLayoutEffect(() => {
    const pr = pointerRepelRef.current;
    pr.xz = new Float32Array(floorCount * 2);
    pr.valid = new Uint8Array(floorCount);
  }, [floorCount]);

  const pickGroupRef = useRef<THREE.Group>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useFrame(({ camera, pointer }) => {
    const pr = pointerRepelRef.current;

    if (!pointerOverSketchRef.current) {
      floorHoverRef.current = null;
      pr.active = false;
      if (pr.valid.length > 0) pr.valid.fill(0);
      return;
    }

    raycaster.setFromCamera(pointer, camera);

    if (
      cfg.pointerRepelEnabled &&
      pr.valid.length === floorCount &&
      pr.xz.length === floorCount * 2
    ) {
      pr.active = true;
      const ray = raycaster.ray;
      const he = halfExtent * 0.992;
      for (let i = 0; i < floorCount; i++) {
        const dy = ray.direction.y;
        if (Math.abs(dy) < 1e-5) {
          pr.valid[i] = 0;
          continue;
        }
        const t = (ys[i] - ray.origin.y) / dy;
        if (t <= 0) {
          pr.valid[i] = 0;
          continue;
        }
        const ix = ray.origin.x + ray.direction.x * t;
        const iz = ray.origin.z + ray.direction.z * t;
        if (Math.abs(ix) <= he && Math.abs(iz) <= he) {
          pr.valid[i] = 1;
          pr.xz[2 * i] = ix;
          pr.xz[2 * i + 1] = iz;
        } else {
          pr.valid[i] = 0;
        }
      }
    } else {
      pr.active = false;
      if (pr.valid.length > 0) pr.valid.fill(0);
    }

    if (!cfg.hoverFocusEnabled || !pickGroupRef.current) {
      floorHoverRef.current = null;
      return;
    }

    const hits = raycaster.intersectObject(pickGroupRef.current, true);
    const he = halfExtent * 0.992;
    let chosen: number | null = null;
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const fi = hit.object.userData.floorIndex;
      if (typeof fi !== "number") continue;
      if (Math.abs(hit.point.x) <= he && Math.abs(hit.point.z) <= he) {
        chosen = fi;
        break;
      }
    }
    floorHoverRef.current = chosen;
  }, -1);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={camPos}
        fov={cfg.cameraFov}
        near={0.1}
        far={620}
      />
      <color attach="background" args={["#141514"]} />
      {cfg.fogEnabled && cfg.fogFar > fogNear + 1 ? (
        <fog attach="fog" args={["#000000", fogNear, cfg.fogFar]} />
      ) : null}
      <ambientLight intensity={cfg.ambient} />
      <directionalLight position={[10, 22, 8]} intensity={cfg.directional} />

      <FloorHoverPickGroup
        ys={ys}
        planeW={planeW}
        boxH={boxH}
        xzScale={cfg.hoverPickXZScale}
        yScale={cfg.hoverPickYScale}
        pickGroupRef={pickGroupRef}
      />

      {cfg.showGround ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[groundW, groundW]} />
          <meshStandardMaterial
            color="#0a0a0a"
            metalness={0.02}
            roughness={1}
            transparent
            opacity={cfg.groundOpacity}
          />
        </mesh>
      ) : null}

      {cfg.showGrid ? (
        <gridHelper
          args={[gridSize, cfg.gridDivisions, "#1c1c1c", "#141414"]}
          position={[0, 0.002, 0]}
        />
      ) : null}

      {ys.map((layerY, floorIndex) => {
        const fog = floorFogByIndex[floorIndex];
        return (
        <FlowFieldLayer
          key={`${floorIndex}-${nParticles}-${halfExtent}-${layerY}-${trailLen}`}
          layerIndex={floorIndex}
          y={layerY}
          count={nParticles}
          trailLen={trailLen}
          halfExtent={halfExtent}
          noise2D={noise2D}
          toneNoise2D={toneNoise2D}
          noiseScale={noiseScaleForFloor(floorIndex)}
          secondaryScale={cfg.secondaryScale}
          secondaryCurlMix={cfg.secondaryCurlMix}
          noiseLayerOffset={cfg.noiseLayerOffset}
          flowTimeDrift={cfg.flowTimeDrift}
          curlStrength={cfg.curlStrength}
          curlSampleEps={cfg.curlSampleEps}
          speed={cfg.speed}
          wrapEdges={cfg.wrapEdges}
          verticalDriftMix={cfg.verticalDriftMix}
          verticalStrength={cfg.verticalStrength}
          verticalClamp={cfg.verticalClamp}
          lifeMin={cfg.lifeMin}
          lifeMax={Math.max(cfg.lifeMin + 0.05, cfg.lifeMax)}
          toneMix={cfg.toneMix}
          toneScale={cfg.toneScale}
          toneFlow={cfg.toneFlow}
          grayFadeLo={cfg.grayFadeLo}
          grayFadeHi={Math.max(cfg.grayFadeLo + 0.03, cfg.grayFadeHi)}
          grayStrength={cfg.grayStrength}
          greenFadeLo={cfg.greenFadeLo}
          greenFadeHi={Math.max(cfg.greenFadeLo + 0.03, cfg.greenFadeHi)}
          greenStrength={cfg.greenStrength}
          tailBrightness={cfg.tailBrightness}
          headBrightness={cfg.headBrightness}
          lineShimmer={cfg.lineShimmer}
          colorWhite={cfg.colorWhite}
          colorGray={cfg.colorGray}
          colorGreen={cfg.colorGreen}
          lineOpacity={cfg.lineOpacity}
          lineWidth={lineWidthForFloor(floorIndex)}
          lineParticleWeightSpread={cfg.lineParticleWeightSpread}
          blending={cfg.blending as "additive" | "normal"}
          depthWrite={cfg.depthWrite}
          floorColorMul={fog.colorMul}
          floorOpacityMul={fog.opacityMul}
          floorHoverRef={floorHoverRef}
          hoverFocusEnabled={cfg.hoverFocusEnabled}
          hoverDimOthersOpacity={cfg.hoverDimOthersOpacity}
          hoverDimOthersRgb={cfg.hoverDimOthersRgb}
          pointerRepelRef={pointerRepelRef}
          pointerRepelRadius={cfg.pointerRepelRadius}
          pointerRepelStrength={cfg.pointerRepelStrength}
          particleDensityZones={cfg.particleDensityZones}
          particleDensityAmount={cfg.particleDensityAmount}
          particleDensityScale={cfg.particleDensityScale}
          particleDensityMinAccept={cfg.particleDensityMinAccept}
        />
        );
      })}

      {cfg.showBoundBox || cfg.boundBoxGlass
        ? ys.map((layerY, floorIndex) => {
            const { w, d } = boxHorizontalSegmentsForFloor(floorIndex);
            const fog = floorFogByIndex[floorIndex];
            return (
              <group
                key={`box-shell-${floorIndex}-${layerY}-${planeW}-${boxH}-${w}-${d}`}
              >
                {cfg.boundBoxGlass ? (
                  <OpenTopFloorBoundSolid
                    planeW={planeW}
                    boxH={boxH}
                    baseY={layerY}
                    color={cfg.boundBoxGlassColor}
                    colorDim={fog.colorMul}
                    shellOpacity={cfg.boundBoxGlassOpacity}
                    shellBrightness={cfg.boundBoxGlassBrightness}
                    opacityScale={fog.opacityMul}
                  />
                ) : null}
                {cfg.showBoundBox ? (
                  <OpenTopFloorBoundWireframe
                    planeW={planeW}
                    boxH={boxH}
                    baseY={layerY}
                    w={w}
                    d={d}
                    color={cfg.boundBoxColor}
                    opacityScale={fog.opacityMul}
                    colorDim={fog.colorMul}
                    floorIndex={floorIndex}
                    floorHoverRef={floorHoverRef}
                    hoverFocusEnabled={cfg.hoverFocusEnabled}
                    hoverDimOthersOpacity={cfg.hoverDimOthersOpacity}
                    hoverDimOthersRgb={cfg.hoverDimOthersRgb}
                  />
                ) : null}
              </group>
            );
          })
        : null}

      {cfg.bloomEnabled ? (
        <EffectComposer multisampling={4}>
          <Bloom
            intensity={cfg.bloomIntensity}
            luminanceThreshold={cfg.bloomThreshold}
            luminanceSmoothing={cfg.bloomSmoothing}
            radius={cfg.bloomRadius}
            mipmapBlur={cfg.bloomMipmapBlur}
          />
        </EffectComposer>
      ) : null}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={cfg.minDistance}
        maxDistance={cfg.maxDistance}
        minPolarAngle={cfg.minPolarAngle}
        maxPolarAngle={Math.PI / 2 - cfg.polarFloor}
        target={[0, cfg.stackCenterY + cfg.lookAtYOffset, 0]}
      />
    </>
  );
}

export function FlowFieldSketch() {
  const floorHoverRef = useRef<number | null>(null);
  const pointerOverSketchRef = useRef(false);

  const sketchFrame = useControls("Sketch frame", {
    canvasDropShadow: {
      value: true,
      label: "Canvas drop shadow (CSS)",
    },
    shadowOffsetY: {
      value: 36,
      min: 0,
      max: 120,
      step: 2,
      label: "Shadow offset Y (px)",
    },
    shadowBlur: {
      value: 64,
      min: 0,
      max: 160,
      step: 2,
      label: "Shadow blur (px)",
    },
    shadowAlpha: {
      value: 0.48,
      min: 0,
      max: 1,
      step: 0.02,
      label: "Shadow opacity",
    },
  });

  const frameFilter = useMemo(() => {
    if (!sketchFrame.canvasDropShadow) return undefined;
    return `drop-shadow(0 ${sketchFrame.shadowOffsetY}px ${sketchFrame.shadowBlur}px rgba(0,0,0,${sketchFrame.shadowAlpha}))`;
  }, [
    sketchFrame.canvasDropShadow,
    sketchFrame.shadowOffsetY,
    sketchFrame.shadowBlur,
    sketchFrame.shadowAlpha,
  ]);

  return (
    <div
      className="h-screen w-full cursor-pointer bg-black -z-10"
      style={frameFilter ? { filter: frameFilter } : undefined}
      onPointerEnter={() => {
        pointerOverSketchRef.current = true;
      }}
      onPointerMove={() => {
        pointerOverSketchRef.current = true;
      }}
      onPointerLeave={() => {
        pointerOverSketchRef.current = false;
        floorHoverRef.current = null;
      }}
    >
      <Canvas
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: false, stencil: false }}
      >
        <FlowFieldScene
          floorHoverRef={floorHoverRef}
          pointerOverSketchRef={pointerOverSketchRef}
        />
      </Canvas>
    </div>
  );
}
