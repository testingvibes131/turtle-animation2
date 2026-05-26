import * as THREE from "three";
import { vertexDirection } from "@/features/blob-scene/lib/geometry/frontHemisphere";
import type { CuratorEdge } from "@/features/blob-scene/lib/curators/hoverPlexus";
import type { ZonePickOptions } from "@/features/blob-scene/lib/curators/zones/types";

const _hubDir = new THREE.Vector3();
const _layoutForward = new THREE.Vector3();
const _dir = new THREE.Vector3();

/**
 * Hub star: lines to ring partners first, then nearest cap members until
 * `targetCount` (from opportunities × hubConnectionMul).
 */
export function buildZoneHubEdges(
  positions: Float32Array,
  hub: number,
  partners: readonly number[],
  members: readonly number[],
  towardCamera: THREE.Vector3,
  targetCount: number,
  options: ZonePickOptions,
): CuratorEdge[] {
  if (hub < 0 || targetCount <= 0) return [];

  const used = new Set<number>([hub]);
  const edges: CuratorEdge[] = [];

  for (const p of partners) {
    if (edges.length >= targetCount) return edges;
    edges.push([hub, p]);
    used.add(p);
  }

  const maxAngleRad = THREE.MathUtils.degToRad(options.maxAngleFromHubDeg);
  const minHubDot = Math.cos(maxAngleRad * 1.12);
  const frontMin = options.frontMinDot;
  const live = options.liveVertices;

  _hubDir.copy(vertexDirection(positions, hub));
  _layoutForward.copy(towardCamera).normalize();

  const ranked: { index: number; score: number }[] = [];
  for (const m of members) {
    if (used.has(m)) continue;
    if (live && !live.has(m)) continue;
    _dir.copy(vertexDirection(positions, m));
    if (_dir.dot(_layoutForward) < frontMin) continue;
    const hubAlign = _dir.dot(_hubDir);
    if (hubAlign < minHubDot) continue;
    ranked.push({ index: m, score: hubAlign });
  }

  ranked.sort((a, b) => b.score - a.score || a.index - b.index);

  for (const { index } of ranked) {
    if (edges.length >= targetCount) break;
    edges.push([hub, index]);
    used.add(index);
  }

  return edges;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

/**
 * Hub star with a random subset of eligible partners + zone members (reshuffled each call).
 */
export function buildZoneHubEdgesRandom(
  positions: Float32Array,
  hub: number,
  partners: readonly number[],
  members: readonly number[],
  towardCamera: THREE.Vector3,
  targetCount: number,
  options: ZonePickOptions,
): CuratorEdge[] {
  if (hub < 0 || targetCount <= 0) return [];

  const maxAngleRad = THREE.MathUtils.degToRad(options.maxAngleFromHubDeg);
  const minHubDot = Math.cos(maxAngleRad * 1.12);
  const frontMin = options.frontMinDot;
  const live = options.liveVertices;

  _hubDir.copy(vertexDirection(positions, hub));
  _layoutForward.copy(towardCamera).normalize();

  const candidates: number[] = [];
  for (const p of partners) candidates.push(p);

  for (const m of members) {
    if (m === hub) continue;
    if (live && !live.has(m)) continue;
    _dir.copy(vertexDirection(positions, m));
    if (_dir.dot(_layoutForward) < frontMin) continue;
    if (_dir.dot(_hubDir) < minHubDot) continue;
    candidates.push(m);
  }

  const unique = [...new Set(candidates)];
  shuffleInPlace(unique);

  const edges: CuratorEdge[] = [];
  for (let i = 0; i < Math.min(targetCount, unique.length); i++) {
    edges.push([hub, unique[i]!]);
  }
  return edges;
}
