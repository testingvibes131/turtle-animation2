"use client";

import { useCallback, useRef, useState } from "react";
import {
  PIPELINE_RADAR_BLIPS,
  PIPELINE_RADAR_BLIP_SCAN_THRESHOLD,
} from "@/features/home/data/pipelineRadarLayout";

function scannedFlags(intensities: readonly number[]) {
  return intensities.map(
    (value) => value >= PIPELINE_RADAR_BLIP_SCAN_THRESHOLD,
  );
}

function flagsEqual(a: readonly boolean[], b: readonly boolean[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function usePipelineBlipScan() {
  const [scannedBlips, setScannedBlips] = useState<readonly boolean[]>(() =>
    PIPELINE_RADAR_BLIPS.map(() => false),
  );
  const prevRef = useRef<readonly boolean[]>(scannedBlips);

  const onBlipIntensities = useCallback((intensities: readonly number[]) => {
    const next = scannedFlags(intensities);
    if (flagsEqual(prevRef.current, next)) return;
    prevRef.current = next;
    setScannedBlips(next);
  }, []);

  return { scannedBlips, onBlipIntensities };
}
