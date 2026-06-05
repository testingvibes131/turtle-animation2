import * as THREE from "three";

const _yAxis = new THREE.Vector3(0, 1, 0);

export type HubAnchorRotationLagState = {
  laggedRotationY: number;
  lastParentRotationY: number;
  synced: boolean;
};

export function createHubAnchorRotationLagState(): HubAnchorRotationLagState {
  return { laggedRotationY: 0, lastParentRotationY: 0, synced: false };
}

/**
 * Section 2: hub logo + plexus origin follow this fraction of blob Y spin.
 * 0.55 ≈ 45% slower than the blob surface.
 */
export const SECTION_2_HUB_ROTATION_FOLLOW = 0.3;

export function tickHubAnchorRotationLag(
  state: HubAnchorRotationLagState,
  parentRotationY: number,
  enabled: boolean,
  follow = SECTION_2_HUB_ROTATION_FOLLOW,
): void {
  if (!enabled) {
    state.synced = false;
    return;
  }
  if (!state.synced) {
    state.laggedRotationY = parentRotationY;
    state.lastParentRotationY = parentRotationY;
    state.synced = true;
    return;
  }

  const parentDelta = parentRotationY - state.lastParentRotationY;
  state.lastParentRotationY = parentRotationY;
  state.laggedRotationY += parentDelta * follow;
}

/**
 * Rotate a blob-local hub anchor so its world position follows `laggedRotationY`
 * while the parent group uses `parentRotationY`.
 */
export function applyHubAnchorRotationLag(
  target: THREE.Vector3,
  out: THREE.Vector3,
  parentRotationY: number,
  laggedRotationY: number,
): void {
  const rotDelta = laggedRotationY - parentRotationY;
  if (Math.abs(rotDelta) < 1e-8) {
    out.copy(target);
    return;
  }
  out.copy(target).applyAxisAngle(_yAxis, rotDelta);
}

export function hubAnchorRotationLagActive(
  state: HubAnchorRotationLagState,
  enabled: boolean,
): boolean {
  return enabled && state.synced;
}
