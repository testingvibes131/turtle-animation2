import { blobDisplacement } from "@/features/blob-scene/lib/geometry/perlinBlob";
import type {
  IcosahedronVertexData,
  PerlinBlobParams,
} from "@/features/blob-scene/lib/geometry/perlinBlob";
import type * as THREE from "three";

export type BlobVertexFrameCache = {
  /** Displaced positions in blob-local space (count * 3). */
  positions: Float32Array;
  /** Raw displacement scalar per vertex (for opacity slope). */
  displacement: Float32Array;
  vertexCount: number;
};

export function createBlobVertexFrameCache(
  vertexCount: number,
): BlobVertexFrameCache {
  return {
    positions: new Float32Array(vertexCount * 3),
    displacement: new Float32Array(vertexCount),
    vertexCount,
  };
}

export function ensureBlobVertexFrameCache(
  cache: BlobVertexFrameCache | null,
  vertexCount: number,
): BlobVertexFrameCache {
  if (cache && cache.vertexCount === vertexCount) return cache;
  return createBlobVertexFrameCache(vertexCount);
}

/** One pass over all vertices — displacement + displaced position. */
export function updateBlobVertexFrameCache(
  vertices: IcosahedronVertexData,
  blobParams: PerlinBlobParams,
  cache: BlobVertexFrameCache,
): void {
  const { positions, displacement } = cache;
  const src = vertices.positions;
  const norms = vertices.normals;
  const count = vertices.count;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = src[i3]!;
    const y = src[i3 + 1]!;
    const z = src[i3 + 2]!;
    const disp = blobDisplacement(x, y, z, blobParams);
    displacement[i] = disp;
    positions[i3] = x + norms[i3]! * disp;
    positions[i3 + 1] = y + norms[i3 + 1]! * disp;
    positions[i3 + 2] = z + norms[i3 + 2]! * disp;
  }
}

export function readCachedVertexPosition(
  cache: BlobVertexFrameCache,
  index: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  const i3 = index * 3;
  return target.set(
    cache.positions[i3]!,
    cache.positions[i3 + 1]!,
    cache.positions[i3 + 2]!,
  );
}
