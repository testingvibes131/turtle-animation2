"use client";

import { createContext, useContext } from "react";

/** Per-blip: true while the radar sweep is revealing that blip. */
export const PipelineRadarScanContext = createContext<readonly boolean[]>([]);

export function usePipelineRadarScan() {
  return useContext(PipelineRadarScanContext);
}
