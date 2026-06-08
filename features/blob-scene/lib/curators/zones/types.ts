import type { CuratorDef } from "@/features/blob-scene/lib/curators/catalog";
import type { CuratorEdge } from "@/features/blob-scene/lib/curators/hoverPlexus";
import type {
  IcosahedronVertexData,
  PerlinBlobParams,
} from "@/features/blob-scene/lib/geometry/perlinBlob";
import * as THREE from "three";

/** Clock position on the camera-facing cap (degrees, 0 = right, 90 = top). */
export const CURATOR_ZONE_CLOCK_DEG: Record<string, number> = {
  Aave: 90,
  Curvance: 30,
  Morpho: 330,
  Euler: 270,
  Lido: 210,
  YO: 150,
};

/** Max half-width of each curator wedge (degrees on the cap). */
export const ZONE_HALF_WIDTH_DEG_MAX = 34;

/** @deprecated Hover uses Voronoi cap cells (same as member colors), not widened wedges. */
export const HOVER_ZONE_HALF_WIDTH_MUL = 1;

/** Default minimum separation between hub and a partner (degrees on sphere). */
export const ZONE_MIN_ANGLE_FROM_HUB_DEG = 16;

export function curatorZoneClockDeg(curatorName: string): number {
  return CURATOR_ZONE_CLOCK_DEG[curatorName] ?? 90;
}

/** Mirror hub/zone clock across the vertical axis (section 1 ↔ section 2). */
export function mirrorCapClockDeg(deg: number): number {
  return (180 - deg + 360) % 360;
}

export function zoneClockDegForLayout(
  curatorName: string,
  layoutMirrored = false,
): number {
  const deg = curatorZoneClockDeg(curatorName);
  return layoutMirrored ? mirrorCapClockDeg(deg) : deg;
}

export function zoneCenterOffsetForLayout(
  zoneCenterOffsetRight = 0,
  layoutMirrored = false,
): number {
  return layoutMirrored ? -zoneCenterOffsetRight : zoneCenterOffsetRight;
}

function clampFrontMinDot(frontMinDot: number): number {
  return Math.min(0.95, Math.max(-1, frontMinDot));
}

function clampBlobCenterLean(lean?: number): number {
  if (lean == null || Number.isNaN(lean)) return 0;
  return Math.min(1, Math.max(0, lean));
}

/** Forward depth on the cap along each zone’s clock direction. Lean pulls deeper toward the blob center. */
export function zoneHubCenterDot(
  frontMinDot: number,
  blobCenterLean = 0,
): number {
  const d = clampFrontMinDot(frontMinDot);
  const lean = clampBlobCenterLean(blobCenterLean);
  const shallow = d + (1 - d) * 0.55;
  const deep = d + (1 - d) * 0.88;
  return shallow + (deep - shallow) * lean;
}

/** Wedge half-width so six zones fit inside the visible cap. */
export function zoneHalfWidthDeg(
  frontMinDot: number,
  zoneCount: number,
): number {
  const capHalfRad = Math.acos(Math.min(1, Math.max(-1, frontMinDot)));
  const capHalfDeg = THREE.MathUtils.radToDeg(capHalfRad);
  const perZone = (capHalfDeg / Math.max(zoneCount, 1)) * 1.02;
  return Math.min(ZONE_HALF_WIDTH_DEG_MAX, perZone);
}

export type ZonePickOptions = {
  frontMinDot: number;
  liveVertices?: ReadonlySet<number>;
  /** Max angle hub → partner on the sphere (Leva: max angle from hub °). */
  maxAngleFromHubDeg: number;
  minAngleFromHubDeg?: number;
  /** 0 = per-zone wedge only; 1 = strong pull toward camera-facing blob center. */
  blobCenterLean?: number;
  /** Scales `curator.opportunities` when building hub plexus edges (partners + zone members). */
  hubConnectionMul?: number;
  /** Added to hub-alignment when ranking member spokes (pulls picks off the cap rim). */
  capCenterScoreWeight?: number;
  /** Deformed mesh snapshot for hub medoid (irregular zone visual center). */
  hubPickMesh?: IcosahedronVertexData;
  hubPickBlob?: PerlinBlobParams;
  /** Slide zone centers on the cap toward screen-right (tangent +right, ~0.05–0.2). */
  zoneCenterOffsetRight?: number;
  /** Section 1: mirror zone clocks and horizontal offset across the viewport. */
  layoutMirrored?: boolean;
  /** Hub arc distance from zone center in “sphere spacings” (0 = balanced hub). */
  hubOffsetSpheres?: number;
  /** Push logo + plexus hub outward along the anchor (sphere spacings; 0 = on surface). */
  hubLogoOutsetSpheres?: number;
};

/** Fields used for fixed hub anchor direction (logo / plexus origin). */
export type HubAnchorOptions = Pick<
  ZonePickOptions,
  | "frontMinDot"
  | "blobCenterLean"
  | "zoneCenterOffsetRight"
  | "layoutMirrored"
  | "hubOffsetSpheres"
  | "hubLogoOutsetSpheres"
  | "hubPickMesh"
  | "hubPickBlob"
>;

export type CuratorZoneAssignment = {
  curator: CuratorDef;
  hub: number;
  partners: number[];
  /** Every live camera-cap vertex in this curator wedge (includes hub + partners). */
  members: number[];
  edges: CuratorEdge[];
};

/** Cached hub + partner vertex indices (stable until hub leaves the allowed zone). */
export type StableZoneSlot = {
  hub: number;
  partners: number[];
};

export { clampBlobCenterLean, clampFrontMinDot };
