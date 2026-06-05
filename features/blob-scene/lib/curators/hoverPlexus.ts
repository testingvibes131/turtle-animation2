import { vertexDirection } from "@/features/blob-scene/lib/geometry/frontHemisphere";

export type CuratorEdge = [number, number];

export type HoverPlexusOptions = {
  /** Min dot(dir, towardCamera) for a vertex to count as facing the viewer. */
  frontMinDot: number;
  /** Max angle (rad) from hub to partner on the sphere. */
  clusterMaxAngleRad: number;
  /** Only these indices can be connection targets (e.g. live opportunities). */
  liveVertices?: ReadonlySet<number>;
};

const _hubDir = { x: 0, y: 0, z: 0 };
const _dir = { x: 0, y: 0, z: 0 };

function dirAt(
  positions: Float32Array,
  index: number,
  out: { x: number; y: number; z: number },
): void {
  const v = vertexDirection(positions, index);
  out.x = v.x;
  out.y = v.y;
  out.z = v.z;
}

function dot(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function collectCandidates(
  positions: Float32Array,
  vertexCount: number,
  hub: number,
  towardCamera: { x: number; y: number; z: number },
  frontMinDot: number,
  minHubDot: number,
  liveVertices?: ReadonlySet<number>,
): number[] {
  dirAt(positions, hub, _hubDir);
  const out: number[] = [];

  for (let i = 0; i < vertexCount; i++) {
    if (i === hub) continue;
    if (liveVertices && !liveVertices.has(i)) continue;
    dirAt(positions, i, _dir);
    if (dot(_dir, towardCamera) < frontMinDot) continue;
    if (dot(_dir, _hubDir) < minHubDot) continue;
    out.push(i);
  }

  return out;
}

function shuffleInPlace(arr: number[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/**
 * Star plexus from hub: edges only to partners on the camera-facing cap,
 * within clusterMaxAngle of the hovered vertex (avoids long cross-blob wires).
 */
export function buildHoverPlexusEdges(
  positions: Float32Array,
  vertexCount: number,
  hub: number,
  edgeCount: number,
  towardCamera: { x: number; y: number; z: number },
  options: HoverPlexusOptions,
  rand = Math.random,
): CuratorEdge[] {
  if (edgeCount <= 0 || vertexCount < 2) return [];

  const minHubDot = Math.cos(options.clusterMaxAngleRad);
  let frontMinDot = options.frontMinDot;

  const live = options.liveVertices;

  let candidates = collectCandidates(
    positions,
    vertexCount,
    hub,
    towardCamera,
    frontMinDot,
    minHubDot,
    live,
  );

  if (candidates.length === 0) {
    frontMinDot = Math.max(0.2, frontMinDot - 0.15);
    candidates = collectCandidates(
      positions,
      vertexCount,
      hub,
      towardCamera,
      frontMinDot,
      minHubDot,
      live,
    );
  }

  if (candidates.length === 0) {
    candidates = collectCandidates(
      positions,
      vertexCount,
      hub,
      towardCamera,
      0.2,
      Math.cos(options.clusterMaxAngleRad * 1.8),
      live,
    );
  }

  if (candidates.length === 0) return [];

  shuffleInPlace(candidates, rand);

  const take = Math.min(edgeCount, candidates.length);
  const edges: CuratorEdge[] = [];
  for (let i = 0; i < take; i++) {
    const partner = candidates[i]!;
    edges.push([hub, partner]);
  }

  return edges;
}
