/** Wrap a scalar into [0, size). */
export function wrapToroidal(value: number, size: number): number {
  if (size <= 0) return 0;
  return ((value % size) + size) % size;
}

export function wrapIndex(index: number, size: number): number {
  return wrapToroidal(index, size);
}

function fieldDims(field: number[][]): { cols: number; rows: number } {
  const cols = field.length;
  const rows = cols > 0 ? (field[0]?.length ?? 0) : 0;
  return { cols, rows };
}

/** Toroidal bilinear sample (for draped wireframe along edges). */
export function sampleFieldToroidal(
  field: number[][],
  cols: number,
  rows: number,
  u: number,
  v: number,
): number {
  const stored = fieldDims(field);
  const w = Math.min(cols, stored.cols);
  const h = Math.min(rows, stored.rows);
  if (w <= 0 || h <= 0) return 0;
  if (w === 1 && h === 1) return field[0]![0]!;

  const uW = wrapToroidal(u, w);
  const vW = wrapToroidal(v, h);
  const c0 = wrapIndex(Math.floor(uW), w);
  const r0 = wrapIndex(Math.floor(vW), h);
  const c1 = wrapIndex(c0 + 1, w);
  const r1 = wrapIndex(r0 + 1, h);
  const tc = uW - Math.floor(uW);
  const tr = vW - Math.floor(vW);

  const col0 = field[c0];
  const col1 = field[c1];
  if (!col0 || !col1) return 0;

  const h00 = col0[r0] ?? 0;
  const h10 = col1[r0] ?? 0;
  const h01 = col0[r1] ?? 0;
  const h11 = col1[r1] ?? 0;

  const hx0 = h00 + (h10 - h00) * tc;
  const hx1 = h01 + (h11 - h01) * tc;
  return hx0 + (hx1 - hx0) * tr;
}

const BLUR_KERNEL = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
] as const;

function blurOnceToroidal(
  input: number[][],
  cols: number,
  rows: number,
): number[][] {
  const out: number[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => 0),
  );

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      let sum = 0;
      let weight = 0;
      for (let kc = -1; kc <= 1; kc++) {
        for (let kr = -1; kr <= 1; kr++) {
          const cc = wrapIndex(c + kc, cols);
          const rr = wrapIndex(r + kr, rows);
          const w = BLUR_KERNEL[kc + 1]![kr + 1]!;
          sum += (input[cc]?.[rr] ?? 0) * w;
          weight += w;
        }
      }
      out[c]![r] = weight > 0 ? sum / weight : (input[c]?.[r] ?? 0);
    }
  }

  return out;
}

export function smoothHeightFieldToroidal(
  field: number[][],
  cols: number,
  rows: number,
  passes = 2,
): number[][] {
  let current = field;
  for (let p = 0; p < passes; p++) {
    current = blurOnceToroidal(current, cols, rows);
  }
  return current;
}
