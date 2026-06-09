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
  SECTION1_AMBIENT_FADE_EPS,
  SECTION1_AMBIENT_FADE_RATE,
} from "@/features/blob-scene/lib/geometry/blobCapWave";

/** Section 1: a band of color sweeps around the blob cap (spheres only). */
export function Section1CapWave() {
  const {
    waveZoneRef,
    waveStrengthRef,
    section1AmbientFadeRef,
    zonesSnapshotRef,
  } = useBlobScene();
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
    const fade = 1 - Math.exp(-delta * SECTION1_AMBIENT_FADE_RATE);

    if (!inSection1Ref.current) {
      section1AmbientFadeRef.current +=
        (0 - section1AmbientFadeRef.current) * fade;
      displayedStrengthRef.current +=
        (0 - displayedStrengthRef.current) * fade;
      waveStrengthRef.current = displayedStrengthRef.current;

      if (section1AmbientFadeRef.current <= SECTION1_AMBIENT_FADE_EPS) {
        section1AmbientFadeRef.current = 0;
        waveZoneRef.current = null;
        displayedStrengthRef.current = 0;
        waveStrengthRef.current = 0;
      }
      return;
    }

    section1AmbientFadeRef.current +=
      (1 - section1AmbientFadeRef.current) * fade;

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

    if (hit && displayedStrengthRef.current > SECTION1_AMBIENT_FADE_EPS) {
      waveZoneRef.current = hit.zone;
    } else {
      waveZoneRef.current = null;
    }
  });

  return null;
}
