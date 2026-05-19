"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { DebugZone } from "@/app/v2/lib/debugZone";

const CIRCLE_SEGMENTS = 96;
const COLOR_ZONE = 0x3b82f6;
const Y_ON_GRID = 0.04;

type DebugZoneCircleProps = {
  zone: DebugZone;
  visible: boolean;
};

function buildCircleGeometry(zone: DebugZone): THREE.BufferGeometry {
  const positions = new Float32Array((CIRCLE_SEGMENTS + 1) * 3);
  for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
    const t = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
    const idx = i * 3;
    positions[idx] = zone.centerX + Math.cos(t) * zone.radius;
    positions[idx + 1] = Y_ON_GRID;
    positions[idx + 2] = zone.centerZ + Math.sin(t) * zone.radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

export function DebugZoneCircle({ zone, visible }: DebugZoneCircleProps) {
  const geometry = useMemo(() => buildCircleGeometry(zone), [zone]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: COLOR_ZONE,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (!visible) return null;

  return (
    <lineLoop
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={1}
    />
  );
}
