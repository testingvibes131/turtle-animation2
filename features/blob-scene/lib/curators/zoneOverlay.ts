import type { CuratorZoneAssignment } from "@/features/blob-scene/lib/curators/zones";
import type { OrbitRingTarget } from "@/features/blob-scene/components/curator/PartnerOrbitRings";

const ZONE_MEMBER_SCALE_MUL = 1.25;
const ZONE_PARTNER_SCALE_MUL = 1.4 * 1.15;

/** Hub, partners, members, and plexus edges — used to detect layout drift while hovered. */
export function zoneLayoutSignature(zone: CuratorZoneAssignment): string {
  const edgeSig = zone.edges.map(([a, b]) => `${a}-${b}`).join(";");
  return `${zone.hub}|${zone.partners.join(",")}|${zone.members.length}|${edgeSig}`;
}

export function zonesLayoutEqual(
  a: CuratorZoneAssignment,
  b: CuratorZoneAssignment,
): boolean {
  return zoneLayoutSignature(a) === zoneLayoutSignature(b);
}

export function connectedMemberSet(zone: CuratorZoneAssignment): Set<number> {
  const set = new Set<number>([zone.hub]);
  for (const [, target] of zone.edges) set.add(target);
  return set;
}

export function orbitTargetsForZone(
  zone: CuratorZoneAssignment,
  partners: ReadonlySet<number>,
): OrbitRingTarget[] {
  const targets: OrbitRingTarget[] = [];
  for (const vi of connectedMemberSet(zone)) {
    if (vi === zone.hub) continue;
    targets.push({
      vertexIndex: vi,
      scaleMul: partners.has(vi)
        ? ZONE_PARTNER_SCALE_MUL
        : ZONE_MEMBER_SCALE_MUL,
    });
  }
  return targets;
}

export const ZONE_MEMBER_SCALE = ZONE_MEMBER_SCALE_MUL;
export const ZONE_PARTNER_SCALE = ZONE_PARTNER_SCALE_MUL;
