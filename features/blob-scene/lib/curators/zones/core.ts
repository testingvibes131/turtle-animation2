import * as THREE from "three";
import type { CuratorDef } from "@/features/blob-scene/lib/curators/catalog";
import { vertexDirection } from "@/features/blob-scene/lib/geometry/frontHemisphere";
import type { CuratorEdge } from "@/features/blob-scene/lib/curators/hoverPlexus";
import { buildZoneHubEdges } from "@/features/blob-scene/lib/curators/zones/edges";
import { findZoneForMemberVertex } from "@/features/blob-scene/lib/curators/zones/picking";
import {
  clampBlobCenterLean,
  curatorZoneClockDeg,
  HOVER_ZONE_HALF_WIDTH_MUL,
  zoneCenterOffsetForLayout,
  zoneClockDegForLayout,
  ZONE_MIN_ANGLE_FROM_HUB_DEG,
  zoneHalfWidthDeg,
  zoneHubCenterDot,
  type CuratorZoneAssignment,
  type HubAnchorOptions,
  type StableZoneSlot,
  type ZonePickOptions,
} from "@/features/blob-scene/lib/curators/zones/types";
import {
  displacedVertexPosition,
  estimateVertexSpacing,
  type IcosahedronVertexData,
  type PerlinBlobParams,
} from "@/features/blob-scene/lib/geometry/perlinBlob";
import {
  curatorScoreJitter,
  DEFAULT_ZONE_EDGE_JITTER,
  type ZoneEdgeJitterTuning,
} from "@/features/blob-scene/lib/curators/zones/zoneEdgeJitter";

const _layoutForward = new THREE.Vector3();
const _viewForward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _slot = new THREE.Vector3();
const _hubDir = new THREE.Vector3();
const _capOutward = new THREE.Vector3();
const _zoneTarget = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _rayLocal = new THREE.Ray();
const _hitPoint = new THREE.Vector3();
const _invWorld = new THREE.Matrix4();
const _pickSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);

/** Ideal hub direction: zone wedge center, optionally blended toward the blob center axis. */
function zoneCenterTarget(
  layoutAxis: THREE.Vector3,
  zoneDeg: number,
  frontMinDot: number,
  blobCenterLean = 0,
): THREE.Vector3 {
  const lean = clampBlobCenterLean(blobCenterLean);
  const onCap = directionOnCap(
    layoutAxis,
    zoneDeg,
    zoneHubCenterDot(frontMinDot, lean),
  );
  if (lean <= 0) return onCap;
  buildTangentBasis(layoutAxis);
  return _slot.copy(onCap).lerp(_layoutForward, lean * 0.72).normalize();
}

/** Zone center on the cap, shifted along tangent +right (screen-right), not rotated. */
function zoneCenterDirection(
  layoutAxis: THREE.Vector3,
  zoneDeg: number,
  frontMinDot: number,
  blobCenterLean: number,
  offsetRight: number,
): THREE.Vector3 {
  buildTangentBasis(layoutAxis);
  const base = zoneCenterTarget(
    layoutAxis,
    zoneDeg,
    frontMinDot,
    blobCenterLean,
  );
  if (offsetRight === 0) return base;
  return _slot.copy(base).addScaledVector(_right, offsetRight).normalize();
}

/** Extra score for vertices closer to the camera-facing blob center. */
function blobCenterScoreBias(
  layoutAxis: THREE.Vector3,
  vertexDir: THREE.Vector3,
  blobCenterLean: number,
): number {
  const lean = clampBlobCenterLean(blobCenterLean);
  if (lean <= 0) return 0;
  buildTangentBasis(layoutAxis);
  return vertexDir.dot(_layoutForward) * lean * 0.14;
}

function buildTangentBasis(layoutAxis: THREE.Vector3): void {
  _layoutForward.copy(layoutAxis).normalize();
  _right.set(0, 1, 0).cross(_layoutForward);
  if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0);
  _right.normalize();
  _up.crossVectors(_layoutForward, _right).normalize();
}

function directionOnCap(
  layoutAxis: THREE.Vector3,
  clockDeg: number,
  centerDot: number,
): THREE.Vector3 {
  buildTangentBasis(layoutAxis);
  const rad = THREE.MathUtils.degToRad(clockDeg);
  const tangentLen = Math.sqrt(Math.max(0, 1 - centerDot * centerDot));
  const tx = Math.cos(rad) * tangentLen;
  const ty = Math.sin(rad) * tangentLen;
  return _slot
    .copy(_layoutForward)
    .multiplyScalar(centerDot)
    .addScaledVector(_right, tx)
    .addScaledVector(_up, ty)
    .normalize();
}

function tangentialAngle(dir: THREE.Vector3): number {
  return Math.atan2(dir.dot(_up), dir.dot(_right));
}

function angleInWedge(
  vertexAngle: number,
  centerDeg: number,
  halfWidthDeg: number,
): boolean {
  const center = THREE.MathUtils.degToRad(centerDeg);
  const half = THREE.MathUtils.degToRad(halfWidthDeg);
  let delta = vertexAngle - center;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return Math.abs(delta) <= half;
}

function passesCameraCap(
  positions: Float32Array,
  index: number,
  towardCamera: THREE.Vector3,
  frontMinDot: number,
): boolean {
  vertexDirection(positions, index, _dir);
  _viewForward.copy(towardCamera).normalize();
  return _dir.dot(_viewForward) >= frontMinDot;
}

function passesCuratorWedge(
  positions: Float32Array,
  index: number,
  layoutAxis: THREE.Vector3,
  zoneCenterDeg: number,
  halfWidthDeg: number,
): boolean {
  buildTangentBasis(layoutAxis);
  vertexDirection(positions, index, _dir);
  if (_dir.dot(_layoutForward) < 0) return false;
  const ang = tangentialAngle(_dir);
  return angleInWedge(ang, zoneCenterDeg, halfWidthDeg);
}

function passesZone(
  positions: Float32Array,
  index: number,
  layoutAxis: THREE.Vector3,
  towardCamera: THREE.Vector3,
  zoneCenterDeg: number,
  halfWidthDeg: number,
  frontMinDot: number,
): boolean {
  return (
    passesCameraCap(positions, index, towardCamera, frontMinDot) &&
    passesCuratorWedge(positions, index, layoutAxis, zoneCenterDeg, halfWidthDeg)
  );
}

/** Angular distance from hub vertex lies in [min°, max°]. */
function passesAngleFromHub(
  positions: Float32Array,
  index: number,
  hub: number,
  minAngleDeg: number,
  maxAngleDeg: number,
): boolean {
  vertexDirection(positions, index, _dir);
  vertexDirection(positions, hub, _hubDir);
  const d = _dir.dot(_hubDir);
  return (
    d >= Math.cos(THREE.MathUtils.degToRad(maxAngleDeg)) &&
    d <= Math.cos(THREE.MathUtils.degToRad(minAngleDeg))
  );
}

/** Partner target on a ring around the hub (tangent angle + distance from hub). */
function directionAroundHub(
  positions: Float32Array,
  hub: number,
  tangentAngleRad: number,
  angleFromHubDeg: number,
): THREE.Vector3 {
  vertexDirection(positions, hub, _hubDir);
  _right.set(0, 1, 0).cross(_hubDir);
  if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0);
  _right.normalize();
  _up.crossVectors(_hubDir, _right).normalize();

  const tx = Math.cos(tangentAngleRad);
  const ty = Math.sin(tangentAngleRad);
  _zoneTarget.copy(_right).multiplyScalar(tx).addScaledVector(_up, ty).normalize();

  _axis.crossVectors(_hubDir, _zoneTarget);
  if (_axis.lengthSq() < 1e-10) return _slot.copy(_hubDir);
  _axis.normalize();

  return _slot
    .copy(_hubDir)
    .applyAxisAngle(_axis, THREE.MathUtils.degToRad(angleFromHubDeg))
    .normalize();
}

/** Build tangent plane basis at hub (uses _hubDir, _right, _up). */
function buildHubTangentBasis(positions: Float32Array, hub: number): void {
  vertexDirection(positions, hub, _hubDir);
  _right.set(0, 1, 0).cross(_hubDir);
  if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0);
  _right.normalize();
  _up.crossVectors(_hubDir, _right).normalize();
}

/** Azimuth around hub in the tangent plane (radians). */
function vertexTangentAngleOnHub(positions: Float32Array, index: number): number {
  vertexDirection(positions, index, _dir);
  _slot.copy(_dir).addScaledVector(_hubDir, -_dir.dot(_hubDir));
  const len = _slot.lengthSq();
  if (len < 1e-10) return 0;
  _slot.multiplyScalar(1 / Math.sqrt(len));
  return Math.atan2(_slot.dot(_up), _slot.dot(_right));
}

function arcSeparationRad(a: number, b: number): number {
  let d = Math.abs(a - b);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

/** Even ring around hub with light jitter (keeps slots well separated). */
function organicTangentAngle(
  slotIndex: number,
  slotCount: number,
  zoneDeg: number,
): number {
  const phase = THREE.MathUtils.degToRad(zoneDeg) * 0.07;
  if (slotCount <= 1) return phase;
  const step = (Math.PI * 2) / slotCount;
  const jitter = step * 0.1 * Math.sin(slotIndex * 2.31 + zoneDeg * 0.029);
  return phase + step * slotIndex + jitter;
}

/** Shared hub→partner distance (ring radius); spacing is azimuth-only. */
function partnerRingAngleDeg(maxAngleDeg: number): number {
  return maxAngleDeg * 0.98;
}

function angleFromHubDeg(
  positions: Float32Array,
  hub: number,
  index: number,
): number {
  vertexDirection(positions, hub, _hubDir);
  vertexDirection(positions, index, _dir);
  return THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.max(-1, _dir.dot(_hubDir)))));
}

type RingCandidate = { index: number; angle: number };

function collectRingCandidates(
  positions: Float32Array,
  vertexCount: number,
  hub: number,
  zoneDeg: number,
  layoutAxis: THREE.Vector3,
  towardCamera: THREE.Vector3,
  options: ZonePickOptions,
  halfWidthDeg: number,
  used: Set<number>,
  ringAngleDeg: number,
  ringTolDeg: number,
  minAngleDeg: number,
  maxAngleDeg: number,
): RingCandidate[] {
  const out: RingCandidate[] = [];

  for (let vi = 0; vi < vertexCount; vi++) {
    if (vi === hub || used.has(vi)) continue;
    if (options.liveVertices && !options.liveVertices.has(vi)) continue;
    if (
      !passesZone(
        positions,
        vi,
        layoutAxis,
        towardCamera,
        zoneDeg,
        halfWidthDeg,
        options.frontMinDot,
      )
    ) {
      continue;
    }
    if (!passesAngleFromHub(positions, vi, hub, minAngleDeg, maxAngleDeg)) {
      continue;
    }

    const hubDist = angleFromHubDeg(positions, hub, vi);
    if (Math.abs(hubDist - ringAngleDeg) > ringTolDeg) continue;

    out.push({ index: vi, angle: vertexTangentAngleOnHub(positions, vi) });
  }

  out.sort((a, b) => a.angle - b.angle);
  const deduped: RingCandidate[] = [];
  const mergeRad = THREE.MathUtils.degToRad(4);
  for (const c of out) {
    const last = deduped[deduped.length - 1];
    if (last && arcSeparationRad(c.angle, last.angle) < mergeRad) {
      continue;
    }
    deduped.push(c);
  }

  return deduped;
}

/** Farthest-point sampling on the hub ring for even azimuth spacing. */
function pickPartnersEvenOnRing(
  candidates: readonly RingCandidate[],
  count: number,
  anchorAngle: number,
): number[] {
  if (candidates.length === 0 || count <= 0) return [];

  const picked: number[] = [];
  const pickedAngles: number[] = [];
  const usedCand = new Set<number>();
  const minArc =
    count <= 1 ? 0 : ((Math.PI * 2) / count) * 0.55;

  let first = -1;
  let firstDelta = Infinity;
  for (const c of candidates) {
    const d = arcSeparationRad(c.angle, anchorAngle);
    if (d < firstDelta || (d === firstDelta && c.index < first)) {
      firstDelta = d;
      first = c.index;
    }
  }
  if (first < 0) return [];

  const firstCand = candidates.find((c) => c.index === first)!;
  picked.push(first);
  pickedAngles.push(firstCand.angle);
  usedCand.add(first);

  while (picked.length < count) {
    let best = -1;
    let bestMinArc = -Infinity;
    let bestIndex = Infinity;

    for (const c of candidates) {
      if (usedCand.has(c.index)) continue;

      let minArcToPicked = Math.PI;
      for (const a of pickedAngles) {
        minArcToPicked = Math.min(minArcToPicked, arcSeparationRad(c.angle, a));
      }

      if (picked.length > 0 && minArcToPicked < minArc) continue;

      if (
        minArcToPicked > bestMinArc ||
        (minArcToPicked === bestMinArc && c.index < bestIndex)
      ) {
        bestMinArc = minArcToPicked;
        bestIndex = c.index;
        best = c.index;
      }
    }

    if (best < 0) break;

    const chosen = candidates.find((c) => c.index === best)!;
    picked.push(best);
    pickedAngles.push(chosen.angle);
    usedCand.add(best);
  }

  return picked;
}

/** Nearest zone center by direction (matches assignCapMembers after offset). */
function nearestCuratorForDirection(
  dir: THREE.Vector3,
  layoutAxis: THREE.Vector3,
  curators: readonly CuratorDef[],
  options: ZonePickOptions,
): string {
  const lean = clampBlobCenterLean(options.blobCenterLean);
  const offset = zoneCenterOffsetForLayout(
    options.zoneCenterOffsetRight,
    options.layoutMirrored,
  );
  let bestName = curators[0]!.name;
  let bestDot = -Infinity;

  for (const c of curators) {
    const center = zoneCenterDirection(
      layoutAxis,
      zoneClockDegForLayout(c.name, options.layoutMirrored),
      options.frontMinDot,
      lean,
      offset,
    );
    const dot = dir.dot(center);
    if (dot > bestDot) {
      bestDot = dot;
      bestName = c.name;
    }
  }

  return bestName;
}

function curatorDotsForDirection(
  dir: THREE.Vector3,
  layoutAxis: THREE.Vector3,
  curators: readonly CuratorDef[],
  options: ZonePickOptions,
): { name: string; dot: number }[] {
  const lean = clampBlobCenterLean(options.blobCenterLean);
  const offset = zoneCenterOffsetForLayout(
    options.zoneCenterOffsetRight,
    options.layoutMirrored,
  );
  const out: { name: string; dot: number }[] = [];
  for (const c of curators) {
    const center = zoneCenterDirection(
      layoutAxis,
      zoneClockDegForLayout(c.name, options.layoutMirrored),
      options.frontMinDot,
      lean,
      offset,
    );
    out.push({ name: c.name, dot: dir.dot(center) });
  }
  return out;
}

function voronoiMargin(dots: readonly { dot: number }[]): number {
  if (dots.length < 2) return 1;
  const sorted = [...dots].sort((a, b) => b.dot - a.dot);
  return sorted[0]!.dot - sorted[1]!.dot;
}

/** Visual cap partition — same inputs as {@link nearestCuratorForDirection} but wobbly borders. */
function nearestCuratorForDirectionVisual(
  dir: THREE.Vector3,
  layoutAxis: THREE.Vector3,
  curators: readonly CuratorDef[],
  options: ZonePickOptions,
  jitter: ZoneEdgeJitterTuning = DEFAULT_ZONE_EDGE_JITTER,
): string {
  const lean = clampBlobCenterLean(options.blobCenterLean);
  const offset = zoneCenterOffsetForLayout(
    options.zoneCenterOffsetRight,
    options.layoutMirrored,
  );
  const dots = curatorDotsForDirection(dir, layoutAxis, curators, options);
  const margin = voronoiMargin(dots);

  let bestName = curators[0]!.name;
  let bestScore = -Infinity;

  for (let i = 0; i < curators.length; i++) {
    const c = curators[i]!;
    const center = zoneCenterDirection(
      layoutAxis,
      zoneClockDegForLayout(c.name, options.layoutMirrored),
      options.frontMinDot,
      lean,
      offset,
    );
    const score =
      dir.dot(center) + curatorScoreJitter(dir, i, margin, jitter);
    if (score > bestScore) {
      bestScore = score;
      bestName = c.name;
    }
  }

  return bestName;
}

function curatorNameForCapVertex(
  positions: Float32Array,
  index: number,
  layoutAxis: THREE.Vector3,
  curators: readonly CuratorDef[],
  options: ZonePickOptions,
): string {
  vertexDirection(positions, index, _dir);
  return nearestCuratorForDirection(_dir, layoutAxis, curators, options);
}

export function isHubInAllowedZone(
  positions: Float32Array,
  hub: number,
  curatorName: string,
  layoutAxis: THREE.Vector3,
  towardCamera: THREE.Vector3,
  options: ZonePickOptions,
  members: readonly number[],
  curators: readonly CuratorDef[],
): boolean {
  if (hub < 0 || !members.includes(hub)) return false;
  if (options.liveVertices && !options.liveVertices.has(hub)) return false;
  if (!passesCameraCap(positions, hub, towardCamera, options.frontMinDot)) {
    return false;
  }
  return (
    curatorNameForCapVertex(positions, hub, layoutAxis, curators, options) ===
    curatorName
  );
}

function hubCandidatePool(
  members: readonly number[],
  live?: ReadonlySet<number>,
): number[] {
  const pool: number[] = [];
  for (const vi of members) {
    if (live && !live.has(vi)) continue;
    pool.push(vi);
  }
  return pool.length > 0 ? pool : [...members];
}

function memberDirection(
  positions: Float32Array,
  mesh: IcosahedronVertexData | undefined,
  blob: PerlinBlobParams | undefined,
  index: number,
  target: THREE.Vector3,
): void {
  if (mesh && blob) {
    displacedVertexPosition(mesh, index, blob, target);
    if (target.lengthSq() > 1e-12) target.normalize();
  } else {
    vertexDirection(positions, index, target);
  }
}

/**
 * Fixed hub direction: allowed zone center, then arc outward on the cap
 * (away from the blob center, toward the colored wedge rim).
 */
export function computeHubAnchorDirection(
  layoutAxis: THREE.Vector3,
  zoneDeg: number,
  options: HubAnchorOptions,
  target: THREE.Vector3,
): THREE.Vector3 {
  const lean = clampBlobCenterLean(options.blobCenterLean);
  const zoneCenter = zoneCenterDirection(
    layoutAxis,
    zoneDeg,
    options.frontMinDot,
    lean,
    zoneCenterOffsetForLayout(
      options.zoneCenterOffsetRight,
      options.layoutMirrored,
    ),
  );

  const offsetSpheres = Math.max(0, options.hubOffsetSpheres ?? 0);
  if (offsetSpheres <= 0) return target.copy(zoneCenter);

  const blob = options.hubPickBlob;
  const mesh = options.hubPickMesh;
  const radius = blob?.radius ?? 1;
  const count = mesh?.count ?? 100;
  const spacing = estimateVertexSpacing(radius, count);
  const targetArc = (offsetSpheres * spacing) / Math.max(radius, 0.001);

  buildTangentBasis(layoutAxis);
  _capOutward
    .copy(zoneCenter)
    .addScaledVector(_layoutForward, -zoneCenter.dot(_layoutForward));
  if (_capOutward.lengthSq() < 1e-10) {
    const rad = THREE.MathUtils.degToRad(zoneDeg);
    _capOutward
      .copy(_right)
      .multiplyScalar(Math.cos(rad))
      .addScaledVector(_up, Math.sin(rad))
      .normalize();
  } else {
    _capOutward.normalize();
  }

  const dot = Math.min(1, Math.max(-1, zoneCenter.dot(_capOutward)));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return target.copy(zoneCenter);

  const t = Math.min(1, targetArc / omega);
  const sinOmega = Math.sin(omega);
  const s0 = Math.sin((1 - t) * omega) / sinOmega;
  const s1 = Math.sin(t * omega) / sinOmega;
  return target
    .copy(zoneCenter)
    .multiplyScalar(s0)
    .addScaledVector(_capOutward, s1)
    .normalize();
}

function hubLogoOutsetWorld(
  mesh: IcosahedronVertexData,
  blobParams: PerlinBlobParams,
  options: HubAnchorOptions,
): number {
  const outsetSpheres = Math.max(0, options.hubLogoOutsetSpheres ?? 0);
  if (outsetSpheres <= 0) return 0;
  const radius = blobParams.radius ?? 1;
  const spacing = estimateVertexSpacing(radius, mesh.count);
  return outsetSpheres * spacing;
}

/** Closest camera-cap vertex to a hub anchor direction (landing / fixed slot). */
export function pickCapVertexNearestHubAnchor(
  mesh: IcosahedronVertexData,
  positions: Float32Array,
  layoutAxis: THREE.Vector3,
  zoneDeg: number,
  options: HubAnchorOptions,
  blobParams: PerlinBlobParams,
  towardCamera: THREE.Vector3,
): number {
  computeHubAnchorDirection(layoutAxis, zoneDeg, options, _hubDir);
  let best = 0;
  let bestDot = -Infinity;
  for (let i = 0; i < mesh.count; i++) {
    if (!passesCameraCap(positions, i, towardCamera, options.frontMinDot)) {
      continue;
    }
    memberDirection(positions, mesh, blobParams, i, _dir);
    const d = _dir.dot(_hubDir);
    if (d > bestDot) {
      bestDot = d;
      best = i;
    }
  }
  return best;
}

/** Logo / plexus hub point on the deformed surface along the anchor direction. */
export function displacedHubAnchorPosition(
  mesh: IcosahedronVertexData,
  hubIndex: number,
  layoutAxis: THREE.Vector3,
  zoneDeg: number,
  options: HubAnchorOptions,
  blobParams: PerlinBlobParams,
  target: THREE.Vector3,
): void {
  displacedVertexPosition(mesh, hubIndex, blobParams, target);
  computeHubAnchorDirection(layoutAxis, zoneDeg, options, _hubDir);
  const len = target.length();
  target.copy(_hubDir).multiplyScalar(len);
  const outset = hubLogoOutsetWorld(mesh, blobParams, options);
  if (outset > 0) target.addScaledVector(_hubDir, outset);
}

/** Topology hub: member closest to the fixed anchor direction. */
function pickHubMemberNearestAnchor(
  positions: Float32Array,
  pool: readonly number[],
  layoutAxis: THREE.Vector3,
  zoneDeg: number,
  options: ZonePickOptions,
): number {
  const mesh = options.hubPickMesh;
  const blob = options.hubPickBlob;
  computeHubAnchorDirection(layoutAxis, zoneDeg, options, _hubDir);

  let best = pool[0]!;
  let bestDot = -Infinity;
  for (const vi of pool) {
    memberDirection(positions, mesh, blob, vi, _dir);
    const d = _dir.dot(_hubDir);
    if (d > bestDot || (d === bestDot && vi < best)) {
      bestDot = d;
      best = vi;
    }
  }
  return best;
}

/** Hub vertex nearest the anchor (zone center at 0, outward arc when > 0). */
function pickHubFromMembers(
  positions: Float32Array,
  members: readonly number[],
  zoneDeg: number,
  layoutAxis: THREE.Vector3,
  options: ZonePickOptions,
): number {
  const pool = hubCandidatePool(members, options.liveVertices);
  if (pool.length === 0) return -1;
  if (pool.length === 1) return pool[0]!;

  return pickHubMemberNearestAnchor(
    positions,
    pool,
    layoutAxis,
    zoneDeg,
    options,
  );
}

/** Member hit, else hub/partner, else cap wedge for this vertex. */
export function findZoneForPickedVertex(
  zones: readonly CuratorZoneAssignment[],
  vertexIndex: number,
  positions: Float32Array,
  towardCamera: THREE.Vector3,
  frontMinDot: number,
): CuratorZoneAssignment | null {
  if (vertexIndex < 0) return null;

  const byMember = findZoneForMemberVertex(zones, vertexIndex);
  if (byMember) return byMember;

  for (const z of zones) {
    if (z.hub === vertexIndex) return z;
    if (z.partners.includes(vertexIndex)) return z;
  }

  const layoutAxis = _layoutForward.copy(towardCamera).normalize();
  const halfWidth = zoneHalfWidthDeg(frontMinDot, zones.length);

  for (const z of zones) {
    const zoneDeg = curatorZoneClockDeg(z.curator.name);
    if (
      passesZone(
        positions,
        vertexIndex,
        layoutAxis,
        towardCamera,
        zoneDeg,
        halfWidth,
        frontMinDot,
      )
    ) {
      return z;
    }
  }

  return null;
}

/** Closest curator zone for a direction on the camera-facing cap. */
function zoneAtCapDirection(
  dir: THREE.Vector3,
  layoutAxis: THREE.Vector3,
  zones: readonly CuratorZoneAssignment[],
  frontMinDot: number,
  halfWidthMul: number,
): CuratorZoneAssignment | null {
  buildTangentBasis(layoutAxis);
  const ang = tangentialAngle(dir);
  const halfWidthRad = THREE.MathUtils.degToRad(
    zoneHalfWidthDeg(frontMinDot, zones.length) * halfWidthMul,
  );

  let best: CuratorZoneAssignment | null = null;
  let bestDelta = Infinity;

  for (const z of zones) {
    const center = THREE.MathUtils.degToRad(curatorZoneClockDeg(z.curator.name));
    let delta = ang - center;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    const abs = Math.abs(delta);
    if (abs <= halfWidthRad && abs < bestDelta) {
      bestDelta = abs;
      best = z;
    }
  }

  return best;
}

/** Closest zone by cap clock angle (no wedge cutoff — fills gaps between wedges). */
function nearestZoneAtCapDirection(
  dir: THREE.Vector3,
  layoutAxis: THREE.Vector3,
  zones: readonly CuratorZoneAssignment[],
  options: ZonePickOptions,
): CuratorZoneAssignment | null {
  if (zones.length === 0) return null;

  const name = nearestCuratorForDirection(
    dir,
    layoutAxis,
    zones.map((z) => z.curator),
    options,
  );
  return zones.find((z) => z.curator.name === name) ?? null;
}

/**
 * Hit-test the blob and resolve hover zone by cap angle — same nearest-clock
 * Voronoi as {@link assignCapMembers} (matches colored regions, no wide wedges).
 */
export function pickZoneAtCapRay(
  rayWorld: THREE.Ray,
  blobGroup: THREE.Object3D | null,
  towardCamera: THREE.Vector3,
  zones: readonly CuratorZoneAssignment[],
  sphereRadius: number,
  frontMinDot: number,
  _halfWidthMul = HOVER_ZONE_HALF_WIDTH_MUL,
  zonePickOptions?: Pick<
    ZonePickOptions,
    | "zoneCenterOffsetRight"
    | "blobCenterLean"
    | "frontMinDot"
    | "layoutMirrored"
  >,
): CuratorZoneAssignment | null {
  if (zones.length === 0 || sphereRadius <= 0) return null;

  _rayLocal.copy(rayWorld);
  if (blobGroup) {
    blobGroup.updateMatrixWorld(true);
    _invWorld.copy(blobGroup.matrixWorld).invert();
    _rayLocal.origin.applyMatrix4(_invWorld);
    _rayLocal.direction.transformDirection(_invWorld);
  }

  _pickSphere.radius = sphereRadius;
  const hit = _rayLocal.intersectSphere(_pickSphere, _hitPoint);
  if (!hit) return null;

  const layoutAxis = _layoutForward.copy(towardCamera).normalize();
  _dir.copy(hit).normalize();

  if (_dir.dot(layoutAxis) < frontMinDot * 0.88) return null;

  return nearestZoneAtCapDirection(_dir, layoutAxis, zones, {
    frontMinDot,
    maxAngleFromHubDeg: 12,
    zoneCenterOffsetRight: zonePickOptions?.zoneCenterOffsetRight ?? 0,
    blobCenterLean: zonePickOptions?.blobCenterLean,
    layoutMirrored: zonePickOptions?.layoutMirrored,
  });
}

/**
 * Assign every camera-cap vertex to the nearest curator (full cap coverage, no wedge gaps).
 * Includes dead vertices on the cap so the visible surface is fully colored.
 */
export function assignCapMembers(
  positions: Float32Array,
  vertexCount: number,
  curators: readonly CuratorDef[],
  towardCamera: THREE.Vector3,
  options: ZonePickOptions,
): Map<string, number[]> {
  const layoutAxis = _layoutForward.copy(towardCamera).normalize();
  const buckets = new Map<string, number[]>();
  for (const c of curators) buckets.set(c.name, []);

  for (let vi = 0; vi < vertexCount; vi++) {
    if (!passesCameraCap(positions, vi, towardCamera, options.frontMinDot)) {
      continue;
    }

    vertexDirection(positions, vi, _dir);
    const bestName = nearestCuratorForDirection(
      _dir,
      layoutAxis,
      curators,
      options,
    );
    buckets.get(bestName)!.push(vi);
  }

  return buckets;
}

/**
 * Display-only cap buckets with noisy zone borders.
 * Hub picking, hover, and plexus still use {@link assignCapMembers}.
 */
export function assignCapMembersVisual(
  positions: Float32Array,
  vertexCount: number,
  curators: readonly CuratorDef[],
  towardCamera: THREE.Vector3,
  options: ZonePickOptions,
  jitter: ZoneEdgeJitterTuning = DEFAULT_ZONE_EDGE_JITTER,
): Map<string, number[]> {
  const layoutAxis = _layoutForward.copy(towardCamera).normalize();
  const buckets = new Map<string, number[]>();
  for (const c of curators) buckets.set(c.name, []);

  for (let vi = 0; vi < vertexCount; vi++) {
    if (!passesCameraCap(positions, vi, towardCamera, options.frontMinDot)) {
      continue;
    }

    vertexDirection(positions, vi, _dir);
    const bestName = nearestCuratorForDirectionVisual(
      _dir,
      layoutAxis,
      curators,
      options,
      jitter,
    );
    buckets.get(bestName)!.push(vi);
  }

  return buckets;
}

function pickZoneHub(
  positions: Float32Array,
  vertexCount: number,
  zoneDeg: number,
  layoutAxis: THREE.Vector3,
  towardCamera: THREE.Vector3,
  options: ZonePickOptions,
  halfWidthDeg: number,
  used: Set<number>,
): number {
  const zoneTarget = zoneCenterTarget(
    layoutAxis,
    zoneDeg,
    options.frontMinDot,
    options.blobCenterLean,
  );
  const lean = clampBlobCenterLean(options.blobCenterLean);

  let best = -1;
  let bestIndex = Infinity;

  const tryPick = (halfWidth: number) => {
    let localBest = -1;
    let localBestScore = -Infinity;
    let localBestIndex = Infinity;

    for (let vi = 0; vi < vertexCount; vi++) {
      if (used.has(vi)) continue;
      if (options.liveVertices && !options.liveVertices.has(vi)) continue;
      if (
        !passesZone(
          positions,
          vi,
          layoutAxis,
          towardCamera,
          zoneDeg,
          halfWidth,
          options.frontMinDot,
        )
      ) {
        continue;
      }

      vertexDirection(positions, vi, _dir);
      const score =
        _dir.dot(zoneTarget) + blobCenterScoreBias(layoutAxis, _dir, lean);
      if (score > localBestScore || (score === localBestScore && vi < localBestIndex)) {
        localBestScore = score;
        localBestIndex = vi;
        localBest = vi;
      }
    }

    if (localBest >= 0) {
      best = localBest;
      bestIndex = localBestIndex;
    }
  };

  tryPick(halfWidthDeg);
  if (best < 0) tryPick(halfWidthDeg * 1.5);

  return best;
}

/** Nudge hub toward partner centroid while staying in the zone wedge. */
function refineZoneHub(
  positions: Float32Array,
  vertexCount: number,
  zoneDeg: number,
  layoutAxis: THREE.Vector3,
  towardCamera: THREE.Vector3,
  options: ZonePickOptions,
  halfWidthDeg: number,
  provisionalHub: number,
  partners: readonly number[],
  used: Set<number>,
): number {
  if (provisionalHub < 0) return provisionalHub;

  const lean = clampBlobCenterLean(options.blobCenterLean);
  const zoneTarget = zoneCenterTarget(
    layoutAxis,
    zoneDeg,
    options.frontMinDot,
    lean,
  );
  _slot.set(0, 0, 0);

  if (partners.length > 0) {
    for (const pi of partners) {
      vertexDirection(positions, pi, _dir);
      _slot.add(_dir);
    }
    _slot.normalize();
    _zoneTarget.copy(zoneTarget).multiplyScalar(0.38).addScaledVector(_slot, 0.62).normalize();
  } else {
    _zoneTarget.copy(zoneTarget);
  }

  if (lean > 0) {
    buildTangentBasis(layoutAxis);
    _zoneTarget.lerp(_layoutForward, lean * 0.28).normalize();
  }

  const partnerSet = new Set(partners);
  let best = provisionalHub;
  let bestScore = -Infinity;
  let bestIndex = Infinity;

  const tryPick = (halfWidth: number) => {
    for (let vi = 0; vi < vertexCount; vi++) {
      if (partnerSet.has(vi)) continue;
      if (vi !== provisionalHub && used.has(vi)) continue;
      if (options.liveVertices && !options.liveVertices.has(vi)) continue;
      if (
        !passesZone(
          positions,
          vi,
          layoutAxis,
          towardCamera,
          zoneDeg,
          halfWidth,
          options.frontMinDot,
        )
      ) {
        continue;
      }

      vertexDirection(positions, vi, _dir);
      let score =
        _dir.dot(_zoneTarget) + blobCenterScoreBias(layoutAxis, _dir, lean);
      if (vi === provisionalHub) score += 0.015;
      if (score > bestScore || (score === bestScore && vi < bestIndex)) {
        bestScore = score;
        bestIndex = vi;
        best = vi;
      }
    }
  };

  tryPick(halfWidthDeg);
  if (best < 0) tryPick(halfWidthDeg * 1.5);

  return best;
}

function pickZonePartners(
  positions: Float32Array,
  vertexCount: number,
  hub: number,
  curator: CuratorDef,
  layoutAxis: THREE.Vector3,
  towardCamera: THREE.Vector3,
  options: ZonePickOptions,
  halfWidthDeg: number,
  used: Set<number>,
): number[] {
  const zoneDeg = zoneClockDegForLayout(curator.name, options.layoutMirrored);
  const edgeCount = curator.opportunities;
  if (edgeCount <= 0) return [];

  const minAngle =
    options.minAngleFromHubDeg ?? ZONE_MIN_ANGLE_FROM_HUB_DEG;
  const maxAngle = options.maxAngleFromHubDeg;
  const ringAngle = partnerRingAngleDeg(maxAngle);

  buildHubTangentBasis(positions, hub);

  const tiers: [number, number, number][] = [
    [halfWidthDeg, 3, maxAngle],
    [halfWidthDeg, 6, maxAngle],
    [halfWidthDeg * 1.5, 10, maxAngle * 1.08],
  ];

  let candidates: RingCandidate[] = [];
  for (const [halfWidth, ringTol, maxHubAngle] of tiers) {
    const next = collectRingCandidates(
      positions,
      vertexCount,
      hub,
      zoneDeg,
      layoutAxis,
      towardCamera,
      options,
      halfWidth,
      used,
      ringAngle,
      ringTol,
      minAngle,
      maxHubAngle,
    );
    if (next.length >= candidates.length) candidates = next;
    if (candidates.length >= edgeCount) break;
  }

  if (candidates.length === 0) return [];

  const anchorAngle = organicTangentAngle(0, edgeCount, zoneDeg);
  const partners = pickPartnersEvenOnRing(candidates, edgeCount, anchorAngle);

  for (const pi of partners) used.add(pi);
  return partners;
}

/**
 * Assign zones on the camera-facing cap. Reuses cached hub/partners until the hub
 * leaves the allowed zone (camera cap + curator wedge); only then repicks.
 */
export function assignStableCuratorZones(
  positions: Float32Array,
  vertexCount: number,
  curators: readonly CuratorDef[],
  towardCamera: THREE.Vector3,
  options: ZonePickOptions,
  cache: Map<string, StableZoneSlot>,
): CuratorZoneAssignment[] {
  const layoutAxis = _layoutForward.copy(towardCamera).normalize();
  const halfWidth = zoneHalfWidthDeg(options.frontMinDot, curators.length);
  const memberBuckets = assignCapMembers(
    positions,
    vertexCount,
    curators,
    towardCamera,
    options,
  );
  const used = new Set<number>();
  const out: CuratorZoneAssignment[] = [];

  for (const curator of curators) {
    const members = memberBuckets.get(curator.name) ?? [];
    const cached = cache.get(curator.name);
    if (
      cached &&
      isHubInAllowedZone(
        positions,
        cached.hub,
        curator.name,
        layoutAxis,
        towardCamera,
        options,
        members,
        curators,
      )
    ) {
      used.add(cached.hub);
      for (const p of cached.partners) used.add(p);
    }
  }

  for (const curator of curators) {
    const zoneDeg = zoneClockDegForLayout(curator.name, options.layoutMirrored);
    const members = memberBuckets.get(curator.name) ?? [];
    if (members.length === 0) {
      cache.delete(curator.name);
      continue;
    }

    const cached = cache.get(curator.name);
    let hub = -1;
    let partners: number[] = [];

    if (
      cached &&
      isHubInAllowedZone(
        positions,
        cached.hub,
        curator.name,
        layoutAxis,
        towardCamera,
        options,
        members,
        curators,
      )
    ) {
      hub = cached.hub;
      partners = [...cached.partners];
    } else {
      hub = pickHubFromMembers(
        positions,
        members,
        zoneDeg,
        layoutAxis,
        options,
      );
      if (hub < 0) {
        cache.delete(curator.name);
        continue;
      }

      used.add(hub);
      partners = pickZonePartners(
        positions,
        vertexCount,
        hub,
        curator,
        layoutAxis,
        towardCamera,
        options,
        halfWidth,
        used,
      );

      cache.set(curator.name, { hub, partners: [...partners] });
    }

    if (hub < 0) continue;

    out.push({
      curator,
      hub,
      partners,
      members: [...members],
      edges: [],
    });
  }

  for (const zone of out) {
    const targetCount = Math.max(
      1,
      Math.round(
        zone.curator.opportunities * (options.hubConnectionMul ?? 1),
      ),
    );
    zone.edges = buildZoneHubEdges(
      positions,
      zone.hub,
      zone.partners,
      zone.members,
      towardCamera,
      targetCount,
      options,
    );
  }

  return out;
}

/** @see assignStableCuratorZones */
export function assignAllCuratorZones(
  positions: Float32Array,
  vertexCount: number,
  curators: readonly CuratorDef[],
  towardCamera: THREE.Vector3,
  options: ZonePickOptions,
): CuratorZoneAssignment[] {
  return assignStableCuratorZones(
    positions,
    vertexCount,
    curators,
    towardCamera,
    options,
    new Map(),
  );
}

/** @deprecated Hover-only single zone; use {@link assignAllCuratorZones}. */
export function buildZoneHoverPlexusEdges(
  positions: Float32Array,
  vertexCount: number,
  hub: number,
  curatorName: string,
  edgeCount: number,
  towardCamera: THREE.Vector3,
  options: ZonePickOptions,
): CuratorEdge[] {
  const curator = { name: curatorName, opportunities: edgeCount, color: 0xffffff };
  const layoutAxis = _layoutForward.copy(towardCamera).normalize();
  const halfWidth = zoneHalfWidthDeg(options.frontMinDot, 1);
  const used = new Set<number>([hub]);
  const partners = pickZonePartners(
    positions,
    vertexCount,
    hub,
    curator,
    layoutAxis,
    towardCamera,
    options,
    halfWidth,
    used,
  );
  return partners.map((p) => [hub, p]);
}
