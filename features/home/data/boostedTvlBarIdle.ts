import {
  BOOSTED_TVL_BARS,
  boostedTvlBarColStart,
  boostedTvlBarLitRowRange,
} from "@/features/home/data/boostedTvlLayout";

export type BarIdleMode = "shorter" | "taller";

/** Per bar: shorter = strip rows from top; taller = add rows above (bottom stays fixed). */
export const BAR_IDLE_MODES: BarIdleMode[] = ["shorter", "taller", "shorter"];

/** Rows to add/remove from the top of each bar (not the bottom). */
export const BAR_TOP_ROW_DELTA = [2, 3, 3];

export type BarMorphCell = { barIndex: number; col: number; row: number; mode: BarIdleMode };

export function barIdleMode(barIndex: number): BarIdleMode {
  return BAR_IDLE_MODES[barIndex] ?? "shorter";
}

/** Rows changed at the top, clamped so the bar stays valid in the grid. */
export function effectiveTopRowDelta(barIndex: number): number {
  const { litStart, litEnd } = boostedTvlBarLitRowRange(BOOSTED_TVL_BARS[barIndex]);
  const want = BAR_TOP_ROW_DELTA[barIndex] ?? 2;
  const height = litEnd - litStart;

  if (barIdleMode(barIndex) === "taller") {
    return Math.min(want, litStart);
  }

  return Math.min(want, Math.max(1, height - 1));
}

/** Inclusive top row … exclusive bottom row for a shape (row index increases downward). */
export function barLitRowSpan(barIndex: number, shape: "base" | "grown") {
  const { litStart, litEnd } = boostedTvlBarLitRowRange(BOOSTED_TVL_BARS[barIndex]);
  const delta = effectiveTopRowDelta(barIndex);

  if (barIdleMode(barIndex) === "shorter") {
    const top = shape === "base" ? litStart : litStart + delta;
    return { top, bottom: litEnd };
  }

  const top = shape === "base" ? litStart : litStart - delta;
  return { top, bottom: litEnd };
}

/** All rows this bar can occupy (base ∪ grown) — for hit testing. */
export function barRowBounds(barIndex: number) {
  const base = barLitRowSpan(barIndex, "base");
  const grown = barLitRowSpan(barIndex, "grown");
  return { top: Math.min(base.top, grown.top), bottom: base.bottom };
}

export function litInBarShape(
  col: number,
  row: number,
  barIndex: number,
  shape: "base" | "grown",
): boolean {
  const startCol = boostedTvlBarColStart(barIndex);
  const bar = BOOSTED_TVL_BARS[barIndex];
  if (col < startCol || col >= startCol + bar.cols) return false;

  const { top, bottom } = barLitRowSpan(barIndex, shape);
  return row >= top && row < bottom;
}

function buildBarMorphCells(): BarMorphCell[] {
  const cells: BarMorphCell[] = [];

  for (let barIndex = 0; barIndex < BOOSTED_TVL_BARS.length; barIndex++) {
    const mode = barIdleMode(barIndex);
    const bar = BOOSTED_TVL_BARS[barIndex];
    const { litStart } = boostedTvlBarLitRowRange(bar);
    const delta = effectiveTopRowDelta(barIndex);
    const startCol = boostedTvlBarColStart(barIndex);

    const rows: number[] =
      mode === "shorter"
        ? Array.from({ length: delta }, (_, i) => litStart + i)
        : Array.from({ length: delta }, (_, i) => litStart - delta + i);

    for (const row of rows) {
      for (let c = 0; c < bar.cols; c++) {
        cells.push({ barIndex, col: startCol + c, row, mode });
      }
    }
  }

  return cells;
}

export const barMorphCells = buildBarMorphCells();

const morphCellByKey = new Map(
  barMorphCells.map((c) => [`${c.col},${c.row}`, c] as const),
);

export function morphCellAt(col: number, row: number) {
  return morphCellByKey.get(`${col},${row}`);
}

export function isMorphCell(col: number, row: number) {
  return morphCellByKey.has(`${col},${row}`);
}
