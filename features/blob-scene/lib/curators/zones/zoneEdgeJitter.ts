import * as THREE from "three";
import { samplePerlin3 } from "@/features/blob-scene/lib/geometry/perlin";

/** Visual-only wobble for curator cap boundaries (hover / hub logic stays crisp). */
export type ZoneEdgeJitterTuning = {
  /** Added to curator dot scores — larger = more boundary chaos. */
  amplitude: number;
  /** Spatial frequency on the sphere (direction as noise input). */
  frequency: number;
  /** Extra amplitude when the vertex sits on a tight Voronoi margin. */
  boundaryBoost: number;
  /** Score gap below which full boundary boost applies (dot-product units). */
  marginForFullBoost: number;
};

export const DEFAULT_ZONE_EDGE_JITTER: ZoneEdgeJitterTuning = {
  amplitude: 0.12,
  frequency: 2.15,
  boundaryBoost: 4.5,
  marginForFullBoost: 0.05,
};

function fbmOnDirection(
  x: number,
  y: number,
  z: number,
  frequency: number,
): number {
  const n0 =
    samplePerlin3(
      x * frequency * 0.48 + 0.6,
      y * frequency * 0.48 + 1.1,
      z * frequency * 0.48 + 2.4,
    ) * 0.85;
  const n1 = samplePerlin3(x * frequency, y * frequency, z * frequency);
  const n2 =
    samplePerlin3(
      x * frequency * 2.35 + 3.1,
      y * frequency * 2.35 + 1.4,
      z * frequency * 2.35 + 5.8,
    ) * 0.55;
  const n3 =
    samplePerlin3(
      x * frequency * 4.7 + 8.6,
      y * frequency * 4.7 + 2.2,
      z * frequency * 4.7 + 0.9,
    ) * 0.3;
  return n0 + n1 + n2 + n3;
}

/**
 * Deterministic score offset for one curator at a cap direction.
 * Stronger near zone borders so interiors stay stable.
 */
export function curatorScoreJitter(
  dir: THREE.Vector3,
  curatorIndex: number,
  margin: number,
  tuning: ZoneEdgeJitterTuning = DEFAULT_ZONE_EDGE_JITTER,
): number {
  const marginT = Math.min(
    1,
    Math.max(0, margin / Math.max(tuning.marginForFullBoost, 1e-6)),
  );
  const boost = 1 + tuning.boundaryBoost * (1 - marginT);
  const ox = curatorIndex * 0.41 + 1.7;
  const oy = curatorIndex * 0.29 + 2.3;
  const oz = curatorIndex * 0.53 + 0.8;
  const noise = fbmOnDirection(dir.x + ox, dir.y + oy, dir.z + oz, tuning.frequency);
  return noise * tuning.amplitude * boost;
}
