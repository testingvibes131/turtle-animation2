import { getConveyorOffset } from "@/app/v2/lib/conveyor";
import {
  buildHeightField,
  buildMacroHeightField,
  maxHeightInField,
  softCapHeightField,
  upsampleMacroToMicroInPlace,
} from "@/app/v2/lib/heightField";
import type { GridLayout } from "@/app/v2/lib/gridLayout";
import {
  sampleFieldToroidal,
  smoothHeightFieldToroidal,
} from "@/app/v2/lib/toroidal";
import {
  DEFAULT_SMOOTH_PASSES,
  type PreparedTerrain,
} from "@/app/v2/lib/terrainGeometry";

/** Extra blur on macro lattice → broader rolling hills (cheap vs micro grid). */
const MACRO_SMOOTH_EXTRA = 2;

function heightCapForLayout(layout: GridLayout, heightCap?: number): number {
  const peak = layout.cells.reduce((m, c) => Math.max(m, c.height), 0);
  return heightCap ?? peak * 1.32;
}

/** Smoothed APR lattice at rest. Macro resolution when subdivided. */
export function buildBaseSmoothedField(
  layout: GridLayout,
  smoothPasses = DEFAULT_SMOOTH_PASSES,
  heightCap?: number,
): number[][] {
  const cap = heightCapForLayout(layout, heightCap);

  if (layout.subdiv <= 1) {
    const { cols, rows } = layout;
    const raw = buildHeightField(layout);
    const field = smoothHeightFieldToroidal(raw, cols, rows, smoothPasses);
    softCapHeightField(field, cap);
    return field;
  }

  const { macroCols, macroRows } = layout;
  const raw = buildMacroHeightField(layout);
  const passes = smoothPasses + MACRO_SMOOTH_EXTRA;
  const field = smoothHeightFieldToroidal(
    raw,
    macroCols,
    macroRows,
    passes,
  );
  softCapHeightField(field, cap);
  return field;
}

let scrolledMacroField: number[][] | null = null;
let scrolledMicroField: number[][] | null = null;
let cachedMacroCols = 0;
let cachedMacroRows = 0;
let cachedMicroCols = 0;
let cachedMicroRows = 0;

function ensureField(
  cols: number,
  rows: number,
  cache: "macro" | "micro",
): number[][] {
  const isMacro = cache === "macro";
  const match =
    isMacro
      ? scrolledMacroField &&
        cachedMacroCols === cols &&
        cachedMacroRows === rows
      : scrolledMicroField &&
        cachedMicroCols === cols &&
        cachedMicroRows === rows;

  if (match) {
    return isMacro ? scrolledMacroField! : scrolledMicroField!;
  }

  const field: number[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => 0),
  );

  if (isMacro) {
    scrolledMacroField = field;
    cachedMacroCols = cols;
    cachedMacroRows = rows;
  } else {
    scrolledMicroField = field;
    cachedMicroCols = cols;
    cachedMicroRows = rows;
  }

  return field;
}

function scrollFieldInPlace(
  out: number[][],
  source: number[][],
  cols: number,
  rows: number,
  offsetU: number,
  offsetV: number,
): void {
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      out[c]![r] = sampleFieldToroidal(
        source,
        cols,
        rows,
        c - offsetU,
        r - offsetV,
      );
    }
  }
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
  const { cols, rows, cellPitch, subdiv, macroCols, macroRows } = layout;
  if (cols < 1 || rows < 1 || layout.cells.length === 0) return null;

  const { offsetU, offsetV } = getConveyorOffset(elapsed);

  if (subdiv > 1) {
    const macroField = ensureField(macroCols, macroRows, "macro");
    const source =
      baseField.length === macroCols &&
      (baseField[0]?.length ?? 0) === macroRows
        ? baseField
        : buildBaseSmoothedField(layout);
    scrollFieldInPlace(
      macroField,
      source,
      macroCols,
      macroRows,
      offsetU,
      offsetV,
    );
    const field = ensureField(cols, rows, "micro");
    upsampleMacroToMicroInPlace(macroField, field, layout);
    return {
      field,
      cols,
      rows,
      cellPitch,
      maxH: maxHeightInField(field),
    };
  }

  const source =
    baseField.length === cols && (baseField[0]?.length ?? 0) === rows
      ? baseField
      : buildBaseSmoothedField(layout);
  const field = ensureField(cols, rows, "micro");
  scrollFieldInPlace(field, source, cols, rows, offsetU, offsetV);

  return {
    field,
    cols,
    rows,
    cellPitch,
    maxH: maxHeightInField(field),
  };
}
