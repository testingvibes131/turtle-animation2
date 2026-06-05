import { CURATORS } from "@/features/blob-scene/lib/curators/catalog";

export type SatelliteOrbitParams = {
  /** Orbit radius as a multiple of blob visual extent. */
  radiusMul: number;
  /** Radians per second around the orbit axis. */
  speed: number;
  /** Starting angle on the orbit (radians). */
  phase: number;
  /** Orbit plane tilt (radians). */
  tiltX: number;
  tiltZ: number;
};

const ORBIT_VARIANTS: Omit<SatelliteOrbitParams, "phase">[] = [
  { radiusMul: 1.38, speed: 0.11, tiltX: 0.42, tiltZ: 0.15 },
  { radiusMul: 1.52, speed: -0.09, tiltX: 0.78, tiltZ: -0.35 },
  { radiusMul: 1.45, speed: 0.13, tiltX: 1.05, tiltZ: 0.55 },
  { radiusMul: 1.6, speed: -0.12, tiltX: 0.25, tiltZ: -0.62 },
  { radiusMul: 1.48, speed: 0.1, tiltX: 0.95, tiltZ: 0.28 },
  { radiusMul: 1.55, speed: -0.105, tiltX: 0.58, tiltZ: -0.18 },
];

export const CURATOR_SATELLITE_ORBITS: SatelliteOrbitParams[] = CURATORS.map(
  (curator, index) => {
    const variant = ORBIT_VARIANTS[index % ORBIT_VARIANTS.length]!;
    const phase =
      (index / Math.max(CURATORS.length, 1)) * Math.PI * 2 +
      curator.name.length * 0.17;
    return { ...variant, phase };
  },
);
