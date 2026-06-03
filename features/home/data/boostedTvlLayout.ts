export type BoostedTvlBarSpec = {
  color: string;
  cols: number;
  rows: number;
  /** Extra delay before this bar’s bottom row fades in (after global start delay). */
  baseDelayMs: number;
  /** Nudge bar horizontally (+ right, − left). */
  colOffset?: number;
};

export const BOOSTED_TVL_GAP_COLS = 4;

export const BOOSTED_TVL_BARS: BoostedTvlBarSpec[] = [
  { color: "#f59e0b", cols: 5, rows: 5, baseDelayMs: 50, colOffset: 1 },
  { color: "#ef4444", cols: 6, rows: 8, baseDelayMs: 200 },
  { color: "#1d4ed8", cols: 5, rows: 12, baseDelayMs: 350, colOffset: -1 },
];

/** Spacing between dot centers in layout units. */
export const BOOSTED_TVL_CELL_PITCH = 1;
/** Horizontal margin around the dot field in layout units. */
export const BOOSTED_TVL_PAD_X = 1.58;
/** Vertical margin — matches X so the plot is symmetric in layout space. */
export const BOOSTED_TVL_PAD_Y = 1.58;
/** One spare row above the bars (bottom row removed vs prior 14-row grid). */
export const BOOSTED_TVL_GRID_EXTRA_ROWS_TOP = 1;
export const BOOSTED_TVL_GRID_EXTRA_ROWS_BOTTOM = 0;
export const BOOSTED_TVL_DOT_RADIUS = 0.117;
export const BOOSTED_TVL_GRID_DOT_COLOR = "rgba(249, 249, 249, 0.35)";

export const BOOSTED_TVL_START_DELAY_MS = 1400;
export const BOOSTED_TVL_ROW_STAGGER_MS = 28;
export const BOOSTED_TVL_FADE_MS = 280;

export function boostedTvlGridCols(): number {
  return BOOSTED_TVL_BARS.reduce(
    (sum, bar, i) => sum + bar.cols + (i < BOOSTED_TVL_BARS.length - 1 ? BOOSTED_TVL_GAP_COLS : 0),
    0,
  );
}

export function boostedTvlMaxBarRows(): number {
  return Math.max(...BOOSTED_TVL_BARS.map((b) => b.rows));
}

export function boostedTvlGridRows(): number {
  return (
    boostedTvlMaxBarRows() +
    BOOSTED_TVL_GRID_EXTRA_ROWS_TOP +
    BOOSTED_TVL_GRID_EXTRA_ROWS_BOTTOM
  );
}

export function boostedTvlBarLitRowRange(bar: BoostedTvlBarSpec): {
  litStart: number;
  litEnd: number;
} {
  const maxBar = boostedTvlMaxBarRows();
  return {
    litStart: BOOSTED_TVL_GRID_EXTRA_ROWS_TOP + maxBar - bar.rows,
    litEnd: BOOSTED_TVL_GRID_EXTRA_ROWS_TOP + maxBar,
  };
}

export function boostedTvlLayoutSize(): { w: number; h: number } {
  const cols = boostedTvlGridCols();
  const rows = boostedTvlGridRows();
  const p = BOOSTED_TVL_CELL_PITCH;
  return {
    w: BOOSTED_TVL_PAD_X * 2 + (cols - 1) * p,
    h: BOOSTED_TVL_PAD_Y * 2 + (rows - 1) * p,
  };
}

export function boostedTvlBarColStart(barIndex: number): number {
  let col = 0;
  for (let i = 0; i < barIndex; i++) {
    col += BOOSTED_TVL_BARS[i].cols + BOOSTED_TVL_GAP_COLS;
  }
  return col + (BOOSTED_TVL_BARS[barIndex].colOffset ?? 0);
}

export function boostedTvlCellCenter(col: number, row: number): { x: number; y: number } {
  const p = BOOSTED_TVL_CELL_PITCH;
  return {
    x: BOOSTED_TVL_PAD_X + col * p,
    y: BOOSTED_TVL_PAD_Y + row * p,
  };
}

export function boostedTvlLitDelayMs(bar: BoostedTvlBarSpec, row: number): number {
  const { litEnd } = boostedTvlBarLitRowRange(bar);
  const rowFromBottom = litEnd - 1 - row;
  return bar.baseDelayMs + rowFromBottom * BOOSTED_TVL_ROW_STAGGER_MS;
}

export function boostedTvlAnimationTotalMs(): number {
  let maxDelay = 0;
  for (const bar of BOOSTED_TVL_BARS) {
    const { litStart, litEnd } = boostedTvlBarLitRowRange(bar);
    for (let row = litStart; row < litEnd; row++) {
      maxDelay = Math.max(maxDelay, boostedTvlLitDelayMs(bar, row));
    }
  }
  return BOOSTED_TVL_START_DELAY_MS + maxDelay + BOOSTED_TVL_FADE_MS;
}
