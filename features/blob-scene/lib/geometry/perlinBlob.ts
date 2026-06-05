import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { organicDisplacement } from "@/features/blob-scene/lib/geometry/organicDisplacement";
import { perlinDisplacement } from "@/features/blob-scene/lib/geometry/perlin";

export type PerlinBlobParams = {
  radius: number;
  /** Icosahedron subdivision (tutorial uses ~30; lower = fewer points). */
  detail: number;
  noiseScale: number;
  displacementDivisor: number;
  perlinPeriod: number;
  time: number;
  /** 0 = organic simplex fBm, 1 = classic perlin (smooth crossfade during scroll). */
  displacementBlend?: number;
  /** Section 1 organic displacement (Leva Section 1 panel). */
  organicBodyWeight?: number;
  organicFlowWeight?: number;
  organicWarp?: number;
  organicAmpMul?: number;
};

export type IcosahedronVertexData = {
  positions: Float32Array;
  normals: Float32Array;
  count: number;
};

export function createIcosahedronVertices(
  radius: number,
  detail: number,
): IcosahedronVertexData {
  const raw = new THREE.IcosahedronGeometry(radius, detail);
  const geo = mergeVertices(raw);
  raw.dispose();
  geo.computeVertexNormals();

  const posAttr = geo.getAttribute("position");
  const normAttr = geo.getAttribute("normal");

  const data = {
    positions: new Float32Array(posAttr.array),
    normals: new Float32Array(normAttr.array),
    count: posAttr.count,
  };

  geo.dispose();
  return data;
}

const _pos = new THREE.Vector3();

export function blobDisplacement(
  x: number,
  y: number,
  z: number,
  params: PerlinBlobParams,
): number {
  const {
    time,
    noiseScale,
    displacementDivisor,
    perlinPeriod,
    displacementBlend = 1,
  } = params;

  const blend = Math.min(1, Math.max(0, displacementBlend));

  const organicTuning = {
    bodyWeight: params.organicBodyWeight,
    flowWeight: params.organicFlowWeight,
    warp: params.organicWarp,
    ampMul: params.organicAmpMul,
  };

  if (blend <= 0.001) {
    return organicDisplacement(
      x,
      y,
      z,
      time,
      noiseScale,
      displacementDivisor,
      perlinPeriod,
      organicTuning,
    );
  }

  if (blend >= 0.999) {
    return perlinDisplacement(
      x,
      y,
      z,
      time,
      noiseScale,
      displacementDivisor,
      perlinPeriod,
    );
  }

  const organic = organicDisplacement(
    x,
    y,
    z,
    time,
    noiseScale,
    displacementDivisor,
    perlinPeriod,
    organicTuning,
  );
  const perlin = perlinDisplacement(
    x,
    y,
    z,
    time,
    noiseScale,
    displacementDivisor,
    perlinPeriod,
  );

  return organic * (1 - blend) + perlin * blend;
}

export function displacedVertexPosition(
  vertices: IcosahedronVertexData,
  index: number,
  params: PerlinBlobParams,
  target = _pos,
): THREE.Vector3 {
  const i3 = index * 3;
  const x = vertices.positions[i3]!;
  const y = vertices.positions[i3 + 1]!;
  const z = vertices.positions[i3 + 2]!;
  const nx = vertices.normals[i3]!;
  const ny = vertices.normals[i3 + 1]!;
  const nz = vertices.normals[i3 + 2]!;

  const disp = blobDisplacement(x, y, z, params);

  return target.set(x + nx * disp, y + ny * disp, z + nz * disp);
}

export function estimateVertexSpacing(
  radius: number,
  vertexCount: number,
): number {
  const area = 4 * Math.PI * radius * radius;
  return Math.sqrt(area / Math.max(vertexCount, 1));
}
