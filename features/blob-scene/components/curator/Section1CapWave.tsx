"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import {
  useBlobInSection1,
  useBlobLayoutMirrored,
  useBlobScrollWobbleStrengthRef,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import {
  BLOB_CAP_WAVE_SCROLL_SPEED_MUL,
  BLOB_CAP_WAVE_SPEED_DEG,
  pickCapWaveZone,
} from "@/features/blob-scene/lib/geometry/blobCapWave";

/** Section 1: a band of color sweeps around the blob cap (spheres only). */
export function Section1CapWave() {
  const { waveZoneRef, waveStrengthRef, zonesSnapshotRef } = useBlobScene();
  const inSection1 = useBlobInSection1();
  const layoutMirrored = useBlobLayoutMirrored();
  const scrollWobbleStrengthRef = useBlobScrollWobbleStrengthRef();

  const inSection1Ref = useRef(inSection1);
  inSection1Ref.current = inSection1;
  const layoutMirroredRef = useRef(layoutMirrored);
  layoutMirroredRef.current = layoutMirrored;
  const waveAngleRef = useRef(0);
  const displayedStrengthRef = useRef(0);

  useFrame((_, delta) => {
    const fade = 1 - Math.exp(-delta * 5.5);

    if (!inSection1Ref.current) {
      waveZoneRef.current = null;
      displayedStrengthRef.current = 0;
      waveStrengthRef.current = 0;
      return;
    }

    const wobble = scrollWobbleStrengthRef.current;
    const speed =
      BLOB_CAP_WAVE_SPEED_DEG + wobble * BLOB_CAP_WAVE_SCROLL_SPEED_MUL;
    waveAngleRef.current =
      (waveAngleRef.current + speed * delta + 360) % 360;

    const hit = pickCapWaveZone(
      zonesSnapshotRef.current,
      waveAngleRef.current,
      layoutMirroredRef.current,
    );

    const targetStrength = hit?.strength ?? 0;
    displayedStrengthRef.current +=
      (targetStrength - displayedStrengthRef.current) * fade;
    waveStrengthRef.current = displayedStrengthRef.current;

    if (hit && displayedStrengthRef.current > 0.02) {
      waveZoneRef.current = hit.zone;
    } else {
      waveZoneRef.current = null;
    }
  });

  return null;
}
