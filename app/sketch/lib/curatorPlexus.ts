import type { OpportunityRow } from "@/app/lib/opportunitiesCsv";
import { FRONT_AXIS, vertexDirection } from "@/app/sketch/lib/frontHemisphere";

export type CuratorEdge = [number, number];

function curatorKey(row: OpportunityRow): string {
  return row.curator.trim() || "Unknown";
}

function distSq(
  positions: Float32Array,
  a: number,
  b: number,
): number {
  const a3 = a * 3;
  const b3 = b * 3;
  const dx = positions[a3]! - positions[b3]!;
  const dy = positions[a3 + 1]! - positions[b3 + 1]!;
  const dz = positions[a3 + 2]! - positions[b3 + 2]!;
  return dx * dx + dy * dy + dz * dz;
}

/** Innermost point of the patch (toward camera / patch core on +Z). */
function pickHub(indices: number[], positions: Float32Array): number {
  let hub = indices[0]!;
  let bestDot = -Infinity;
  for (const i of indices) {
    const dot = vertexDirection(positions, i).dot(FRONT_AXIS);
    if (dot > bestDot) {
      bestDot = dot;
      hub = i;
    }
  }
  return hub;
}

/**
 * Radial tree: hub at the core, each outer node links to the nearest
 * already-connected node that sits closer to the hub (inside → outside).
 */
function radialPlexusEdges(
  indices: number[],
  positions: Float32Array,
): CuratorEdge[] {
  if (indices.length < 2) return [];

  const hub = pickHub(indices, positions);
  const depth = new Map<number, number>();
  for (const i of indices) {
    depth.set(i, distSq(positions, hub, i));
  }

  const sorted = [...indices].sort(
    (a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0),
  );

  const inTree = new Set<number>([hub]);
  const edges: CuratorEdge[] = [];

  for (const i of sorted) {
    if (i === hub) continue;

    const myDepth = depth.get(i) ?? 0;
    let parent = hub;
    let bestDist = distSq(positions, i, hub);

    for (const j of inTree) {
      const jDepth = depth.get(j) ?? 0;
      if (jDepth >= myDepth) continue;
      const d = distSq(positions, i, j);
      if (d < bestDist) {
        bestDist = d;
        parent = j;
      }
    }

    edges.push([Math.min(i, parent), Math.max(i, parent)]);
    inTree.add(i);
  }

  return edges;
}

/** Same-curator edges as radial plexus trees (core → branches, no rim loop). */
export function buildCuratorPlexusEdges(
  rowAt: (OpportunityRow | null)[],
  positions: Float32Array,
): CuratorEdge[] {
  const byCurator = new Map<string, number[]>();

  for (let i = 0; i < rowAt.length; i++) {
    const row = rowAt[i];
    if (!row) continue;
    const key = curatorKey(row);
    const list = byCurator.get(key) ?? [];
    list.push(i);
    byCurator.set(key, list);
  }

  const edgeSet = new Set<string>();
  const edges: CuratorEdge[] = [];

  for (const indices of byCurator.values()) {
    for (const [a, b] of radialPlexusEdges(indices, positions)) {
      const key = `${a}-${b}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push([a, b]);
    }
  }

  return edges;
}
