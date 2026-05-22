import * as THREE from "three";
import type { OpportunityRow } from "@/app/lib/opportunitiesCsv";
import type { CuratorEdge } from "@/app/sketch/lib/curatorPlexus";

const _color = new THREE.Color();
const GOLDEN = 0.618033988749895;

function curatorKey(row: OpportunityRow): string {
  return row.curator.trim() || "Unknown";
}

/** Stable saturated hues per curator (sorted name order). */
export function curatorColorFromIndex(index: number, total: number): number {
  const hue =
    (index / Math.max(total, 1)) * 0.92 + index * GOLDEN * 0.17;
  const h = ((hue % 1) + 1) % 1;
  return _color.setHSL(h, 0.62, 0.58).getHex();
}

export function buildCuratorColorMap(
  rows: OpportunityRow[],
): Map<string, number> {
  const keys = [
    ...new Set(rows.map((r) => curatorKey(r))),
  ].sort((a, b) => a.localeCompare(b));
  const map = new Map<string, number>();
  keys.forEach((key, i) => map.set(key, curatorColorFromIndex(i, keys.length)));
  return map;
}

export type ColoredPlexusGroup = {
  color: number;
  edges: CuratorEdge[];
};

/** One line batch per curator color (LineMaterial is single-color). */
export function groupPlexusEdgesByColor(
  edges: CuratorEdge[],
  rowAt: (OpportunityRow | null)[],
  colorByCurator: Map<string, number>,
): ColoredPlexusGroup[] {
  const buckets = new Map<number, CuratorEdge[]>();

  for (const edge of edges) {
    const row = rowAt[edge[0]] ?? rowAt[edge[1]];
    if (!row) continue;
    const color = colorByCurator.get(curatorKey(row)) ?? 0xf9f9f9;
    const list = buckets.get(color) ?? [];
    list.push(edge);
    buckets.set(color, list);
  }

  return [...buckets.entries()]
    .map(([color, groupEdges]) => ({ color, edges: groupEdges }))
    .sort((a, b) => b.edges.length - a.edges.length);
}
