import type { CuratorZoneAssignment } from "@/features/blob-scene/lib/curators/zones/types";

/** Zone whose `members` includes this vertex (any colored cap point). */
export function findZoneForMemberVertex(
  zones: readonly CuratorZoneAssignment[],
  vertexIndex: number,
): CuratorZoneAssignment | null {
  if (vertexIndex < 0) return null;
  for (const z of zones) {
    if (z.members.includes(vertexIndex)) return z;
  }
  return null;
}
