import type { IcosahedronVertexData, PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";
import { perlinDisplacement } from "@/features/blob-scene/lib/geometry/perlin";

/** Displacement along vertex normal (same as blob surface). */
export function vertexNoiseDisplacement(
  vertices: IcosahedronVertexData,
  index: number,
  params: PerlinBlobParams,
): number {
  const i3 = index * 3;
  return perlinDisplacement(
    vertices.positions[i3]!,
    vertices.positions[i3 + 1]!,
    vertices.positions[i3 + 2]!,
    params.time,
    params.noiseScale,
    params.displacementDivisor,
    params.perlinPeriod,
  );
}

/**
 * Map noise displacement to opacity: valleys dimmer, outward bumps brighter.
 * `disp` is roughly ±noiseScale/displacementDivisor.
 */
export function noiseSlopeOpacityMul(
  vertices: IcosahedronVertexData,
  index: number,
  params: PerlinBlobParams,
  minMul: number,
  maxMul: number,
): number {
  const disp = vertexNoiseDisplacement(vertices, index, params);
  const amp = params.noiseScale / Math.max(params.displacementDivisor, 0.001);
  const t = Math.min(1, Math.max(0, (disp / amp + 1) * 0.5));
  return minMul + (maxMul - minMul) * t;
}
