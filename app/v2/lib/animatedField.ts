import { getConveyorOffset } from "@/app/v2/lib/conveyor";
import { buildHeightField, maxHeightInField } from "@/app/v2/lib/heightField";
import type { GridLayout } from "@/app/v2/lib/gridLayout";
import {
  sampleFieldToroidal,
  smoothHeightFieldToroidal,
} from "@/app/v2/lib/toroidal";
import {
  DEFAULT_SMOOTH_PASSES,
  type PreparedTerrain,
} from "@/app/v2/lib/terrainGeometry";

/** Smoothed APR lattice at rest (toroidal blur). */
export function buildBaseSmoothedField(
  layout: GridLayout,
  smoothPasses = DEFAULT_SMOOTH_PASSES,
): number[][] {
  const { cols, rows } = layout;
  const raw = buildHeightField(layout);
  return smoothHeightFieldToroidal(raw, cols, rows, smoothPasses);
}

function buildScrolledDisplayField(
  baseField: number[][],
  cols: number,
  rows: number,
  offsetU: number,
  offsetV: number,
): number[][] {
  const field: number[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => 0),
  );

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      field[c]![r] = sampleFieldToroidal(
        baseField,
        cols,
        rows,
        c - offsetU,
        r - offsetV,
      );
    }
  }

  return field;
}

/**
 * Fixed lattice in XZ; heights scroll on the torus.
 * Markers keep integer col/row — sample this field at their crossing only.
 */
export function prepareAnimatedTerrain(
  layout: GridLayout,
  elapsed: number,
  baseField: number[][],
): PreparedTerrain | null {
  const { cols, rows, cellPitch } = layout;
  if (cols < 1 || rows < 1 || layout.cells.length === 0) return null;

  const source =
    baseField.length === cols && (baseField[0]?.length ?? 0) === rows
      ? baseField
      : buildBaseSmoothedField(layout);

  const { offsetU, offsetV } = getConveyorOffset(elapsed);
  const field = buildScrolledDisplayField(
    source,
    cols,
    rows,
    offsetU,
    offsetV,
  );

  return {
    field,
    cols,
    rows,
    cellPitch,
    maxH: maxHeightInField(field),
  };
}
