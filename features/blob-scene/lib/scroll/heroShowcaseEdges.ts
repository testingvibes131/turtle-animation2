import * as THREE from "three";
import { vertexDirection } from "@/features/blob-scene/lib/geometry/frontHemisphere";
import type { CuratorEdge } from "@/features/blob-scene/lib/curators/hoverPlexus";
import {
  computeHubAnchorDirection,
  type HubAnchorOptions,
} from "@/features/blob-scene/lib/curators/zones";
import {
  HERO_SHOWCASE_CLOCK_DEG,
  HERO_SHOWCASE_CLUSTER_MAX_ANGLE_DEG,
  HERO_SHOWCASE_FRONT_MIN_DOT,
  HERO_SHOWCASE_MIN_SPOKE_SEPARATION_DEG,
} from "@/features/blob-scene/lib/scroll/heroShowcase";

/** Looser than hub pick — keeps spokes as the cap deforms. */
export const HERO_SHOWCASE_EDGE_FRONT_MIN_DOT = 0.48;

/** Wider fan when the primary pick finds too few targets. */
export const HERO_SHOWCASE_EDGE_FALLBACK_ANGLE_DEG = 22;

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
  minSpokeSeparationDeg: 7,
};

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
  _layoutForward.copy(towardCamera).normalize();

  const ranked: { index: number; score: number }[] = [];
  for (const m of members) {
    if (m === hub) continue;
    _dir.copy(vertexDirection(positions, m));
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

  const maxPairDot = Math.cos(
    THREE.MathUtils.degToRad(pick.minSpokeSeparationDeg),
  );

  const targets: number[] = [];
  for (const { index } of ranked) {
    if (targets.length >= targetCount) break;
    _dir.copy(vertexDirection(positions, index));
    let tooClose = false;
    for (const picked of targets) {
      _otherDir.copy(vertexDirection(positions, picked));
      if (_dir.dot(_otherDir) > maxPairDot) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;
    targets.push(index);
  }

  if (targets.length < targetCount) {
    for (const { index } of ranked) {
      if (targets.length >= targetCount) break;
      if (targets.includes(index)) continue;
      targets.push(index);
    }
  }

  return targets;
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
  let targets = pickSpokes(
    positions,
    hub,
    members,
    towardCamera,
    hubAnchorOptions,
    targetCount,
    PRIMARY_PICK,
  );
  if (targets.length >= targetCount) return targets;

  const fallback = pickSpokes(
    positions,
    hub,
    members,
    towardCamera,
    hubAnchorOptions,
    targetCount,
    FALLBACK_PICK,
  );
  if (fallback.length > targets.length) return fallback;
  return targets;
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
