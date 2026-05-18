import type { PreparedTerrain } from "@/app/v2/lib/terrainGeometry";

export type TerrainWaveSnapshot = {
  prepared: PreparedTerrain | null;
  elapsed: number;
};
