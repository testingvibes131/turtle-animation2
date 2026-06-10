"use client";

import { useFrame } from "@react-three/fiber";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";

/**
 * Section 1 ambient cap-wave is disabled. The resting blob color now comes from
 * a smooth per-instance gradient in {@link BlobPointCloud} that drifts across the
 * whole cloud — no discrete one-zone-at-a-time sweep (which "jumped" between
 * colors) and no fade-from-black swap (which left a momentary dark gap).
 *
 * Kept mounted so the wave refs stay pinned at rest; hover highlights and the
 * mobile zone carousel are separate paths and are unaffected.
 */
export function Section1CapWave() {
  const { waveZoneRef, waveStrengthRef, section1AmbientFadeRef } =
    useBlobScene();

  useFrame(() => {
    section1AmbientFadeRef.current = 0;
    waveStrengthRef.current = 0;
    waveZoneRef.current = null;
  });

  return null;
}
