import type { OpportunityRow } from "@/app/lib/opportunitiesCsv";
import {
  collectFrontVertexIndices,
  layoutSpacedFrontCapSeeds,
  patchMinDot,
  vertexDirection,
} from "@/app/sketch/lib/frontHemisphere";
import * as THREE from "three";

const _dir = new THREE.Vector3();

function groupRowsByCurator(rows: OpportunityRow[]): Map<string, OpportunityRow[]> {
  const groups = new Map<string, OpportunityRow[]>();
  for (const row of rows) {
    const key = row.curator.trim() || "Unknown";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return groups;
}

function nearestCuratorWithinPatch(
  dir: THREE.Vector3,
  seeds: THREE.Vector3[],
  minDot: number,
): number {
  let best = -1;
  let bestDot = -Infinity;
  for (let c = 0; c < seeds.length; c++) {
    const dot = dir.dot(seeds[c]!);
    if (dot >= minDot && dot > bestDot) {
      bestDot = dot;
      best = c;
    }
  }
  return best;
}

/**
 * Assign CSV rows to front-cap vertices; spaced curator patches on +Z.
 */
export function assignRowsByCuratorToVertices(
  positions: Float32Array,
  vertexCount: number,
  rows: OpportunityRow[],
): (OpportunityRow | null)[] {
  const out: (OpportunityRow | null)[] = Array.from(
    { length: vertexCount },
    () => null,
  );
  if (rows.length === 0 || vertexCount === 0) return out;

  const frontIndices = collectFrontVertexIndices(positions, vertexCount);
  if (frontIndices.length === 0) return out;

  const groups = groupRowsByCurator(rows);
  const curators = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
  const curatorCount = curators.length;
  if (curatorCount === 0) return out;

  const seeds = layoutSpacedFrontCapSeeds(curatorCount);
  const patchMin = patchMinDot();

  const verticesByCurator: number[][] = Array.from(
    { length: curatorCount },
    () => [],
  );

  for (const i of frontIndices) {
    const dir = vertexDirection(positions, i, _dir);
    const c = nearestCuratorWithinPatch(dir, seeds, patchMin);
    if (c < 0) continue;
    verticesByCurator[c]!.push(i);
  }

  const used = new Set<number>();

  for (let c = 0; c < curatorCount; c++) {
    const curatorRows = groups.get(curators[c]!) ?? [];
    const seed = seeds[c]!;
    const verts = verticesByCurator[c]!;

    verts.sort((a, b) => {
      const da = vertexDirection(positions, a).dot(seed);
      const db = vertexDirection(positions, b).dot(seed);
      return db - da;
    });

    let rowIdx = 0;
    for (const v of verts) {
      if (rowIdx >= curatorRows.length) break;
      if (used.has(v)) continue;
      out[v] = curatorRows[rowIdx]!;
      used.add(v);
      rowIdx++;
    }

    while (rowIdx < curatorRows.length) {
      let bestV = -1;
      let bestDot = -Infinity;
      for (const i of frontIndices) {
        if (used.has(i)) continue;
        const dot = vertexDirection(positions, i).dot(seed);
        if (dot < patchMin) continue;
        if (dot > bestDot) {
          bestDot = dot;
          bestV = i;
        }
      }
      if (bestV < 0) break;
      out[bestV] = curatorRows[rowIdx]!;
      used.add(bestV);
      rowIdx++;
    }
  }

  return out;
}
