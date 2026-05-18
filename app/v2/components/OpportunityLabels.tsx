"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, type CSSProperties, type RefObject } from "react";
import * as THREE from "three";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import { getMarkerLabelPose } from "@/app/v2/lib/markerPosition";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";

const LABEL_MAX_WIDTH = "120px";

const labelWrapBase: CSSProperties = {
  pointerEvents: "none",
  userSelect: "none",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: LABEL_MAX_WIDTH,
  lineHeight: 1.2,
  textShadow: "0 1px 8px rgba(0,0,0,0.85), 0 0 1px rgba(0,0,0,0.9)",
};

function OpportunityLabel({
  cell,
  waveRef,
}: {
  cell: TerrainCell;
  waveRef: RefObject<TerrainWaveSnapshot>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const color = cell.featured ? "#73f36c" : "#f0f0f0";

  useFrame(() => {
    const g = groupRef.current;
    const { prepared, elapsed } = waveRef.current;
    if (!g || !prepared) return;
    const { x, y, z } = getMarkerLabelPose(cell, prepared, elapsed);
    g.position.set(x, y, z);
  });

  const name = cell.name.trim() || "—";

  return (
    <group ref={groupRef}>
      <Html
        transform
        sprite
        center
        occlude={false}
        pointerEvents="none"
        distanceFactor={7}
        zIndexRange={[10, 20]}
        style={{
          ...labelWrapBase,
          color,
          fontSize: cell.featured ? 11 : 10,
          fontWeight: cell.featured ? 600 : 500,
        }}
      >
        <span title={name}>{name}</span>
      </Html>
    </group>
  );
}

type OpportunityLabelsProps = {
  cells: TerrainCell[];
  waveRef: RefObject<TerrainWaveSnapshot>;
};

export function OpportunityLabels({ cells, waveRef }: OpportunityLabelsProps) {
  if (cells.length === 0) return null;

  return (
    <>
      {cells.map((cell) => (
        <OpportunityLabel key={cell.id} cell={cell} waveRef={waveRef} />
      ))}
    </>
  );
}
