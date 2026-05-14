"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { PackedMarker } from "@/app/lib/opportunityCirclePack";
import {
  featuredSceneOffset,
  type FeaturedAprRange,
} from "@/app/lib/featuredSceneOffset";

const RADIUS_SCALE = 0.34;
const HIGHLIGHT_SCALE = 1.06;

type OpportunityHoverLabelProps = {
  marker: PackedMarker;
  featuresBlendRef: MutableRefObject<number>;
  featuredAprRange: FeaturedAprRange;
};

/**
 * Hover highlight mesh only. Label: {@link OpportunityHoverScreenLabel}.
 */
export function OpportunityHoverLabel({
  marker,
  featuresBlendRef,
  featuredAprRange,
}: OpportunityHoverLabelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scale = marker.size * RADIUS_SCALE * HIGHLIGHT_SCALE;

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const b = featuresBlendRef.current;
    const { ox, oy, oz } = featuredSceneOffset(marker, b, featuredAprRange);
    g.position.set(marker.x + ox, oy, marker.z + oz);
  });

  return (
    <group ref={groupRef}>
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
