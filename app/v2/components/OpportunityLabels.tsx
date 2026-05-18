"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import * as THREE from "three";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import { getMarkerLabelPose } from "@/app/v2/lib/markerPosition";
import { buildCellLookup, isFeaturedAtCrossing } from "@/app/v2/lib/scrolledCell";
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
  cells,
  waveRef,
  labelsMoveWithBelt,
  useOffsetColors,
}: {
  cell: TerrainCell;
  cells: TerrainCell[];
  waveRef: RefObject<TerrainWaveSnapshot>;
  labelsMoveWithBelt: boolean;
  useOffsetColors: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [isFeatured, setIsFeatured] = useState(cell.featured);
  const lookup = useMemo(() => {
    let cols = 1;
    let rows = 1;
    for (const c of cells) {
      cols = Math.max(cols, c.col + 1);
      rows = Math.max(rows, c.row + 1);
    }
    return buildCellLookup(cells, cols, rows);
  }, [cells]);

  useFrame(() => {
    const g = groupRef.current;
    const { prepared, elapsed } = waveRef.current;
    if (!g || !prepared) return;
    const featuredNow = useOffsetColors
      ? isFeaturedAtCrossing(cell, elapsed, lookup)
      : cell.featured;
    if (featuredNow !== isFeatured) setIsFeatured(featuredNow);
    const { x, y, z } = getMarkerLabelPose(
      cell,
      prepared,
      elapsed,
      labelsMoveWithBelt,
    );
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
          color: isFeatured ? "#73f36c" : "#f0f0f0",
          fontSize: isFeatured ? 11 : 10,
          fontWeight: isFeatured ? 600 : 500,
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
  labelsMoveWithBelt: boolean;
  useOffsetColors: boolean;
};

export function OpportunityLabels({
  cells,
  waveRef,
  labelsMoveWithBelt,
  useOffsetColors,
}: OpportunityLabelsProps) {
  if (cells.length === 0) return null;

  return (
    <>
      {cells.map((cell) => (
        <OpportunityLabel
          key={cell.id}
          cell={cell}
          cells={cells}
          waveRef={waveRef}
          labelsMoveWithBelt={labelsMoveWithBelt}
          useOffsetColors={useOffsetColors}
        />
      ))}
    </>
  );
}
