/** Wrap a scalar into [0, size). */
export function wrapToroidal(value: number, size: number): number {
  if (size <= 0) return 0;
  return ((value % size) + size) % size;
}

export function wrapIndex(index: number, size: number): number {
  return wrapToroidal(index, size);
}

type BeltQuadrantCorner = {
  col: number;
  row: number;
  /** +1 steps along the diagonal into the field from this corner. */
  colStep: number;
  rowStep: number;
};

function isNearGridCenter(
  homeCol: number,
  homeRow: number,
  cols: number,
  rows: number,
): boolean {
  const midCol = (cols - 1) * 0.5;
  const midRow = (rows - 1) * 0.5;
  return (
    Math.abs(homeCol - midCol) < 1.5 && Math.abs(homeRow - midRow) < 1.5
  );
}

function beltQuadrantCorner(
  homeCol: number,
  homeRow: number,
  cols: number,
  rows: number,
): BeltQuadrantCorner | null {
  if (!isNearGridCenter(homeCol, homeRow, cols, rows)) return null;

  const midCol = (cols - 1) * 0.5;
  const midRow = (rows - 1) * 0.5;
  const east = homeCol >= midCol;
  const south = homeRow >= midRow;

  if (east && south) {
    return { col: 0, row: 0, colStep: 1, rowStep: 1 };
  }
  if (!east && south) {
    return { col: cols - 1, row: 0, colStep: -1, rowStep: 1 };
  }
  if (east && !south) {
    return { col: 0, row: rows - 1, colStep: 1, rowStep: -1 };
  }
  return { col: cols - 1, row: rows - 1, colStep: -1, rowStep: -1 };
}

/** Stagger along the corner diagonal so center-cluster homes do not share belt UV. */
function beltOppositeStagger(
  homeCol: number,
  homeRow: number,
  cols: number,
  rows: number,
): number {
  const midCol = Math.floor((cols - 1) * 0.5);
  const midRow = Math.floor((rows - 1) * 0.5);
  const max = Math.max(0, Math.min(midCol, midRow) - 1);
  if (max === 0) return 0;
  const key = homeCol * (rows + 1) + homeRow;
  return key % (max + 1);
}

/** Far torus corner for belt respawn (center cells mirror to themselves otherwise). */
function beltOppositeCorner(
  homeCol: number,
  homeRow: number,
  cols: number,
  rows: number,
): { col: number; row: number } {
  const corner = beltQuadrantCorner(homeCol, homeRow, cols, rows);
  if (corner) {
    const stagger = beltOppositeStagger(homeCol, homeRow, cols, rows);
    return {
      col: corner.col + corner.colStep * stagger,
      row: corner.row + corner.rowStep * stagger,
    };
  }

  return { col: cols - 1 - homeCol, row: rows - 1 - homeRow };
}

/**
 * (+col, +row) belt: first boundary crossing jumps to the opposite field corner,
 * then continues diagonally; full lap returns to home.
 */
export function wrapDiagonalToroidalUV(
  u: number,
  v: number,
  cols: number,
  rows: number,
  homeCol: number,
  homeRow: number,
  opposite?: { col: number; row: number },
): { u: number; v: number } {
  if (cols <= 0 || rows <= 0) return { u: 0, v: 0 };

  const offset = u - homeCol;
  const opp =
    opposite ?? beltOppositeCorner(homeCol, homeRow, cols, rows);
  const legHome = Math.min(cols - homeCol, rows - homeRow);
  const legOpp = Math.min(cols - opp.col, rows - opp.row);

  const oppositeUV = (along: number) => ({
    u: wrapToroidal(opp.col + along, cols),
    v: wrapToroidal(opp.row + along, rows),
  });

  let rem = offset;
  let onOpposite = false;

  for (let guard = 0; guard < 32 && rem > 1e-9; guard++) {
    if (!onOpposite) {
      if (rem < legHome) {
        return {
          u: wrapToroidal(homeCol + rem, cols),
          v: wrapToroidal(homeRow + rem, rows),
        };
      }
      rem -= legHome;
      onOpposite = true;
      continue;
    }

    if (rem < legOpp) {
      return oppositeUV(rem);
    }
    rem -= legOpp;
    onOpposite = false;
  }

  if (onOpposite) {
    return oppositeUV(0);
  }
  return { u: wrapToroidal(homeCol, cols), v: wrapToroidal(homeRow, rows) };
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
