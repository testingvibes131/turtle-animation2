import type { CuratorDef } from "@/features/blob-scene/lib/curators/catalog";
import type { CuratorEdge } from "@/features/blob-scene/lib/curators/hoverPlexus";
import type { CuratorZoneAssignment } from "@/features/blob-scene/lib/curators/zones";

/** Hero overlay: curator identity + 45° hub/spokes only (no zone wedge). */
export function heroShowcaseZoneAssignment(
  curator: CuratorDef,
  hub: number,
  spokeTargets: readonly number[],
  edges: CuratorEdge[],
): CuratorZoneAssignment {
  return {
    curator,
    hub,
    partners: [],
    members: [hub, ...spokeTargets],
    edges,
  };
}
