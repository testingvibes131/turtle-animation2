"use client";

import type { PackedMarker } from "@/app/lib/opportunityCirclePack";

const RADIUS_SCALE = 0.34;
const HIGHLIGHT_SCALE = 1.06;

type OpportunityHoverLabelProps = {
  marker: PackedMarker;
};

/**
 * Hover highlight mesh only. Label: {@link OpportunityHoverScreenLabel}.
 */
export function OpportunityHoverLabel({ marker }: OpportunityHoverLabelProps) {
  const scale = marker.size * RADIUS_SCALE * HIGHLIGHT_SCALE;

  return (
    <group position={[marker.x, 0, marker.z]}>
      <mesh renderOrder={8} scale={scale}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial
          color={0x73f36c}
          depthTest
          depthWrite
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
    </group>
  );
}
