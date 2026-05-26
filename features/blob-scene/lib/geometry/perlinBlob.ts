import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { perlinDisplacement } from "@/features/blob-scene/lib/geometry/perlin";

export type PerlinBlobParams = {
  radius: number;
  /** Icosahedron subdivision (tutorial uses ~30; lower = fewer points). */
  detail: number;
  noiseScale: number;
  displacementDivisor: number;
  perlinPeriod: number;
  time: number;
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

  const disp = perlinDisplacement(
    x,
    y,
    z,
    params.time,
    params.noiseScale,
    params.displacementDivisor,
    params.perlinPeriod,
  );

  return target.set(x + nx * disp, y + ny * disp, z + nz * disp);
}

export function estimateVertexSpacing(
  radius: number,
  vertexCount: number,
): number {
  const area = 4 * Math.PI * radius * radius;
  return Math.sqrt(area / Math.max(vertexCount, 1));
}
