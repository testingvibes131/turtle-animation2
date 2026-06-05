import * as THREE from "three";
import { vertexDirection } from "@/features/blob-scene/lib/geometry/frontHemisphere";
import { displacedVertexPosition } from "@/features/blob-scene/lib/geometry/perlinBlob";
import type { CuratorEdge } from "@/features/blob-scene/lib/curators/hoverPlexus";
import {
  computeHubAnchorDirection,
  type HubAnchorOptions,
} from "@/features/blob-scene/lib/curators/zones";
import {
  HERO_SHOWCASE_CLOCK_DEG,
  HERO_SHOWCASE_CLUSTER_MAX_ANGLE_DEG,
  HERO_SHOWCASE_FRONT_MIN_DOT,
  HERO_SHOWCASE_MAX_CONNECTIONS,
  HERO_SHOWCASE_MIN_CONNECTIONS,
  HERO_SHOWCASE_MIN_SPOKE_SEPARATION_DEG,
} from "@/features/blob-scene/lib/scroll/heroShowcase";

/** Looser than hub pick — keeps spokes as the cap deforms. */
export const HERO_SHOWCASE_EDGE_FRONT_MIN_DOT = 0.48;

/** Wider fan when the primary pick finds too few targets. */
export const HERO_SHOWCASE_EDGE_FALLBACK_ANGLE_DEG = 24;

const _anchorDir = new THREE.Vector3();
const _layoutForward = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _otherDir = new THREE.Vector3();

export type HeroShowcaseEdgePick = {
  frontMinDot: number;
  maxAngleFromHubDeg: number;
  capCenterScoreWeight: number;
  minSpokeSeparationDeg: number;
};

const PRIMARY_PICK: HeroShowcaseEdgePick = {
  frontMinDot: HERO_SHOWCASE_EDGE_FRONT_MIN_DOT,
  maxAngleFromHubDeg: HERO_SHOWCASE_CLUSTER_MAX_ANGLE_DEG,
  capCenterScoreWeight: 0.35,
  minSpokeSeparationDeg: HERO_SHOWCASE_MIN_SPOKE_SEPARATION_DEG,
};

const FALLBACK_PICK: HeroShowcaseEdgePick = {
  frontMinDot: HERO_SHOWCASE_EDGE_FRONT_MIN_DOT - 0.06,
  maxAngleFromHubDeg: HERO_SHOWCASE_EDGE_FALLBACK_ANGLE_DEG,
  capCenterScoreWeight: 0.25,
  minSpokeSeparationDeg: HERO_SHOWCASE_MIN_SPOKE_SEPARATION_DEG,
};

function spokeDirection(
  positions: Float32Array,
  index: number,
  hubAnchorOptions: HubAnchorOptions,
  target: THREE.Vector3,
): void {
  const mesh = hubAnchorOptions.hubPickMesh;
  const blob = hubAnchorOptions.hubPickBlob;
  if (mesh && blob) {
    displacedVertexPosition(mesh, index, blob, target);
    if (target.lengthSq() > 1e-12) target.normalize();
  } else {
    vertexDirection(positions, index, target);
  }
}

function minAngleBetweenSpokes(
  positions: Float32Array,
  a: number,
  b: number,
  hubAnchorOptions: HubAnchorOptions,
): number {
  spokeDirection(positions, a, hubAnchorOptions, _dir);
  spokeDirection(positions, b, hubAnchorOptions, _otherDir);
  const dot = Math.min(1, Math.max(-1, _dir.dot(_otherDir)));
  return Math.acos(dot);
}

function pickSpokes(
  positions: Float32Array,
  hub: number,
  members: readonly number[],
  towardCamera: THREE.Vector3,
  hubAnchorOptions: HubAnchorOptions,
  targetCount: number,
  pick: HeroShowcaseEdgePick,
): number[] {
  computeHubAnchorDirection(
    towardCamera,
    HERO_SHOWCASE_CLOCK_DEG,
    hubAnchorOptions,
    _anchorDir,
  );

  const maxAngleRad = THREE.MathUtils.degToRad(pick.maxAngleFromHubDeg);
  const minAlign = Math.cos(maxAngleRad * 1.12);
  const frontMin = pick.frontMinDot;
  const minSepRad = THREE.MathUtils.degToRad(pick.minSpokeSeparationDeg);
  _layoutForward.copy(towardCamera).normalize();

  const ranked: { index: number; score: number }[] = [];
  for (const m of members) {
    if (m === hub) continue;
    spokeDirection(positions, m, hubAnchorOptions, _dir);
    const forwardDot = _dir.dot(_layoutForward);
    if (forwardDot < frontMin) continue;
    const align = _dir.dot(_anchorDir);
    if (align < minAlign) continue;
    ranked.push({
      index: m,
      score: align + pick.capCenterScoreWeight * forwardDot,
    });
  }

  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  if (ranked.length === 0) return [];

  const targets: number[] = [ranked[0]!.index];

  while (targets.length < targetCount) {
    let best: number | null = null;
    let bestMinAngle = -1;
    let bestScore = -Infinity;

    for (const { index, score } of ranked) {
      if (targets.includes(index)) continue;

      let minAngle = Math.PI;
      for (const picked of targets) {
        minAngle = Math.min(
          minAngle,
          minAngleBetweenSpokes(positions, index, picked, hubAnchorOptions),
        );
      }
      if (minAngle < minSepRad) continue;

      if (
        minAngle > bestMinAngle ||
        (minAngle === bestMinAngle && score > bestScore)
      ) {
        bestMinAngle = minAngle;
        bestScore = score;
        best = index;
      }
    }

    if (best === null) break;
    targets.push(best);
  }

  return targets;
}

const SEPARATION_RELAX_STEPS_DEG = [14, 11, 8, 5, 0] as const;

/** At least `HERO_SHOWCASE_MIN_CONNECTIONS` (3), up to `goal` (≤6); relax separation only if needed. */
function pickHeroSpokesAtLeast(
  positions: Float32Array,
  hub: number,
  members: readonly number[],
  towardCamera: THREE.Vector3,
  hubAnchorOptions: HubAnchorOptions,
  goal: number,
): number[] {
  const floor = HERO_SHOWCASE_MIN_CONNECTIONS;
  let best: number[] = [];

  const separationDegs = [
    HERO_SHOWCASE_MIN_SPOKE_SEPARATION_DEG,
    ...SEPARATION_RELAX_STEPS_DEG,
  ];

  const pickVariants: HeroShowcaseEdgePick[] = [
    PRIMARY_PICK,
    FALLBACK_PICK,
    {
      ...FALLBACK_PICK,
      maxAngleFromHubDeg: HERO_SHOWCASE_EDGE_FALLBACK_ANGLE_DEG + 4,
      frontMinDot: HERO_SHOWCASE_EDGE_FRONT_MIN_DOT - 0.08,
    },
  ];

  for (const minSep of separationDegs) {
    for (const base of pickVariants) {
      const got = pickSpokes(
        positions,
        hub,
        members,
        towardCamera,
        hubAnchorOptions,
        goal,
        { ...base, minSpokeSeparationDeg: minSep },
      );
      if (got.length > best.length) best = got;
      if (got.length >= goal) return got;
    }
  }

  if (best.length < floor) return best;
  return best.slice(0, Math.min(goal, best.length));
}

/**
 * Section 1: spokes come from the whole blob cap in the 45° wedge,
 * not from section-2 curator zone partitions.
 */
export function heroShowcaseSpokeCandidateIndices(vertexCount: number): number[] {
  return Array.from({ length: vertexCount }, (_, i) => i);
}

/** Hub spokes locked to the 45° anchor (not the wobbling hub vertex direction). */
export function buildHeroShowcaseSpokeTargets(
  positions: Float32Array,
  hub: number,
  members: readonly number[],
  towardCamera: THREE.Vector3,
  hubAnchorOptions: HubAnchorOptions,
  targetCount: number,
): number[] {
  const goal = Math.min(
    HERO_SHOWCASE_MAX_CONNECTIONS,
    Math.max(HERO_SHOWCASE_MIN_CONNECTIONS, targetCount),
  );
  return pickHeroSpokesAtLeast(
    positions,
    hub,
    members,
    towardCamera,
    hubAnchorOptions,
    goal,
  );
}

export function heroShowcaseEdgesFromTargets(
  hub: number,
  targets: readonly number[],
): CuratorEdge[] {
  return targets.map((t) => [hub, t] as CuratorEdge);
}

export function heroShowcaseSpokesEqual(
  a: readonly CuratorEdge[],
  b: readonly CuratorEdge[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]![1] !== b[i]![1]) return false;
  }
  return true;
}

/** Hub still on the visible cap (rest directions). */
export function heroHubPassesCap(
  positions: Float32Array,
  hub: number,
  towardCamera: THREE.Vector3,
  frontMinDot = HERO_SHOWCASE_FRONT_MIN_DOT,
): boolean {
  _dir.copy(vertexDirection(positions, hub));
  _layoutForward.copy(towardCamera).normalize();
  return _dir.dot(_layoutForward) >= frontMinDot;
}
