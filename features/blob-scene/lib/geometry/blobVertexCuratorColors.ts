import * as THREE from "three";
import { CURATORS } from "@/features/blob-scene/lib/curators/catalog";

/** Stable pseudo-random curator pick per vertex (does not change frame-to-frame). */
export function curatorIndexForVertex(vertexIndex: number): number {
  const h = (vertexIndex * 2654435761) >>> 0;
  return h % CURATORS.length;
}

export type CuratorVertexBuckets = {
  /** Per curator: vertex indices assigned to that highlight color. */
  buckets: number[][];
  maxBucketSize: number;
};

export function buildCuratorVertexBuckets(
  liveIndices: readonly number[],
  deadIndices: readonly number[],
): CuratorVertexBuckets {
  const buckets = CURATORS.map(() => [] as number[]);
  for (const i of liveIndices) {
    buckets[curatorIndexForVertex(i)]!.push(i);
  }
  for (const i of deadIndices) {
    buckets[curatorIndexForVertex(i)]!.push(i);
  }
  let maxBucketSize = 0;
  for (const bucket of buckets) {
    maxBucketSize = Math.max(maxBucketSize, bucket.length);
  }
  return { buckets, maxBucketSize };
}

export function buildBlobVertexCuratorColors(
  vertexCount: number,
): THREE.Color[] {
  const colors: THREE.Color[] = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    colors[i] = new THREE.Color(CURATORS[curatorIndexForVertex(i)]!.color);
  }
  return colors;
}
