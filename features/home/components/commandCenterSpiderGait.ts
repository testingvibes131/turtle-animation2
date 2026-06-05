/**
 * Tripod gait — fixed leg slots; steps favor travel direction and nearby feet.
 */

import type {
  GridCell,
  PixelPoint,
} from "@/features/home/components/commandCenterCanvas";
import { cellKey, clamp01, GRID_SPACING, smoothstep } from "@/features/home/components/commandCenterGrid";

export type RingCell = GridCell & PixelPoint;

export type SpiderLegSlot = {
  row: number;
  col: number;
  x: number;
  y: number;
  renderX: number;
  renderY: number;
  plantRow: number;
  plantCol: number;
  swingFromX: number;
  swingFromY: number;
  swingToX: number;
  swingToY: number;
  swingToRow: number;
  swingToCol: number;
  swingHubX: number;
  swingHubY: number;
  glideRow: number;
  glideCol: number;
  glideLocked: boolean;
  swinging: boolean;
  presenceStart: number;
};

export function legDisplayPosition(slot: SpiderLegSlot): PixelPoint {
  return { x: slot.renderX, y: slot.renderY };
}

export const SPIDER_LEG_COUNT = 6;
const TAU = Math.PI * 2;

/** Slower cycle = calmer footfalls. */
export const SPIDER_GAIT_CYCLE_S = 2.35;
/** Longer stance, shorter swing. */
export const SPIDER_STANCE_RATIO = 0.76;
const LEG_PHASE_OFFSET = [0, 0.5, 1 / 6, 2 / 3, 1 / 3, 5 / 6];

const EDGE_PICK_PENALTY = 0.2;
const SECTOR_HALF_WEDGE = (TAU / SPIDER_LEG_COUNT) * 0.38;
const SWING_ARC_BULGE = GRID_SPACING * 0.28;
const MIN_OUTWARD_STEP = GRID_SPACING * 0.22;
const MAX_STEP_GRID_CELLS = 1;
const STANCE_FOLLOW_RATE = 3.8;
const STANCE_GLIDE_RATE = 2.4;
const DISPLAY_SMOOTH_RATE = 7.5;
const SWING_LAND_RATE = 10;
const TRAVEL_BIAS_MIN_SPEED = 6;
const TRAVEL_BIAS_WEIGHT = 2.4;
const NEIGHBOR_STEP_BONUS = 1.1;
const SINGLE_STEP_BONUS = 1.35;
const MULTI_STEP_PENALTY = 2.5;

function legSectorAngle(legIndex: number) {
  return (legIndex / SPIDER_LEG_COUNT) * TAU - Math.PI / 2;
}

function legSectorDirection(legIndex: number) {
  const a = legSectorAngle(legIndex);
  return { x: Math.cos(a), y: Math.sin(a) };
}

function angleDelta(a: number, b: number) {
  let delta = a - b;
  while (delta > Math.PI) delta -= TAU;
  while (delta < -Math.PI) delta += TAU;
  return Math.abs(delta);
}

function cellInLegSector(
  cellX: number,
  cellY: number,
  bodyX: number,
  bodyY: number,
  legIndex: number,
) {
  const target = legSectorAngle(legIndex);
  const angle = Math.atan2(cellY - bodyY, cellX - bodyX);
  return angleDelta(angle, target) <= SECTOR_HALF_WEDGE;
}

function outwardAlongLeg(
  cellX: number,
  cellY: number,
  bodyX: number,
  bodyY: number,
  legDirX: number,
  legDirY: number,
) {
  return (cellX - bodyX) * legDirX + (cellY - bodyY) * legDirY;
}

function gridStepDistance(a: GridCell, b: GridCell) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function dampTowardDt(current: number, target: number, dt: number, rate: number) {
  const k = 1 - Math.exp(-rate * dt);
  return current + (target - current) * k;
}

function swingArcPosition(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  bodyX: number,
  bodyY: number,
  t: number,
) {
  const midX = (fromX + toX) * 0.5;
  const midY = (fromY + toY) * 0.5;
  let dx = midX - bodyX;
  let dy = midY - bodyY;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  const cx = midX + dx * SWING_ARC_BULGE;
  const cy = midY + dy * SWING_ARC_BULGE;
  const u = 1 - t;
  return {
    x: u * u * fromX + 2 * u * t * cx + t * t * toX,
    y: u * u * fromY + 2 * u * t * cy + t * t * toY,
  };
}

function gridEdgeDepth(row: number, col: number, rows: number, cols: number) {
  return Math.min(row, col, rows - 1 - row, cols - 1 - col);
}

function edgePickPenalty(row: number, col: number, rows: number, cols: number) {
  const depth = gridEdgeDepth(row, col, rows, cols);
  if (depth >= 2) return 0;
  if (depth <= 0) return EDGE_PICK_PENALTY * 2;
  return EDGE_PICK_PENALTY;
}

function ringDistance(dotX: number, dotY: number, hubX: number, hubY: number) {
  return Math.hypot(dotX - hubX, dotY - hubY);
}

function legCyclePhase(timeS: number, legIndex: number) {
  return (timeS / SPIDER_GAIT_CYCLE_S + LEG_PHASE_OFFSET[legIndex]) % 1;
}

function travelBiasScore(
  cellX: number,
  cellY: number,
  bodyX: number,
  bodyY: number,
  bodyVx: number,
  bodyVy: number,
) {
  const speed = Math.hypot(bodyVx, bodyVy);
  if (speed < TRAVEL_BIAS_MIN_SPEED) return 0;
  const dx = cellX - bodyX;
  const dy = cellY - bodyY;
  const len = Math.hypot(dx, dy) || 1;
  const dot = ((dx / len) * bodyVx + (dy / len) * bodyVy) / speed;
  return dot * TRAVEL_BIAS_WEIGHT;
}

function stepCoherenceScore(
  cell: GridCell,
  avoid: GridCell,
  bodyVx: number,
  bodyVy: number,
) {
  const steps = gridStepDistance(cell, avoid);
  if (steps === 1) return SINGLE_STEP_BONUS;
  if (steps > MAX_STEP_GRID_CELLS) return -MULTI_STEP_PENALTY * steps;

  const speed = Math.hypot(bodyVx, bodyVy);
  if (speed < TRAVEL_BIAS_MIN_SPEED) return -steps * 0.35;
  return -steps * 0.6;
}

function neighborCoherenceScore(
  cell: GridCell,
  legIndex: number,
  slots: (SpiderLegSlot | null)[],
) {
  let score = 0;
  for (let j = 0; j < SPIDER_LEG_COUNT; j++) {
    if (j === legIndex) continue;
    const other = slots[j];
    if (!other) continue;
    const dist = gridStepDistance(cell, {
      row: other.plantRow,
      col: other.plantCol,
    });
    if (dist === 1) score += NEIGHBOR_STEP_BONUS * 0.45;
    if (dist === 0) score -= 4;
  }
  return score;
}

function pickStepCell(
  candidates: RingCell[],
  bodyX: number,
  bodyY: number,
  legIndex: number,
  rows: number,
  cols: number,
  avoid: GridCell,
  reserved: Set<string>,
  ringIdealDist: number,
  slots: (SpiderLegSlot | null)[],
  minOutward = MIN_OUTWARD_STEP,
  bodyVx = 0,
  bodyVy = 0,
) {
  if (candidates.length === 0) return null;

  const target = legSectorAngle(legIndex);
  const legDir = legSectorDirection(legIndex);
  const avoidCell = candidates.find(
    (c) => c.row === avoid.row && c.col === avoid.col,
  );
  const avoidOutward = avoidCell
    ? outwardAlongLeg(avoidCell.x, avoidCell.y, bodyX, bodyY, legDir.x, legDir.y)
    : 0;

  let best: RingCell | null = null;
  let bestScore = -Infinity;

  for (const cell of candidates) {
    const key = cellKey(cell.row, cell.col);
    if (reserved.has(key)) continue;
    if (cell.row === avoid.row && cell.col === avoid.col) continue;
    if (!cellInLegSector(cell.x, cell.y, bodyX, bodyY, legIndex)) continue;

    const steps = gridStepDistance(cell, avoid);
    if (avoidCell && steps > MAX_STEP_GRID_CELLS) continue;

    const alongLeg = outwardAlongLeg(
      cell.x,
      cell.y,
      bodyX,
      bodyY,
      legDir.x,
      legDir.y,
    );
    if (alongLeg < minOutward) continue;
    if (avoidCell && alongLeg <= avoidOutward + GRID_SPACING * 0.15) continue;

    const angle = Math.atan2(cell.y - bodyY, cell.x - bodyX);
    const angleScore = -angleDelta(angle, target) * 2.2;
    const outwardScore = alongLeg * 0.0018;
    const radiusScore =
      -Math.abs(ringDistance(cell.x, cell.y, bodyX, bodyY) - ringIdealDist) * 0.0035;
    const score =
      angleScore +
      outwardScore +
      radiusScore +
      stepCoherenceScore(cell, avoid, bodyVx, bodyVy) +
      travelBiasScore(cell.x, cell.y, bodyX, bodyY, bodyVx, bodyVy) +
      neighborCoherenceScore(cell, legIndex, slots) -
      edgePickPenalty(cell.row, cell.col, rows, cols);

    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }

  if (best) return best;

  for (const cell of candidates) {
    const key = cellKey(cell.row, cell.col);
    if (reserved.has(key)) continue;
    if (cell.row === avoid.row && cell.col === avoid.col) continue;
    if (!cellInLegSector(cell.x, cell.y, bodyX, bodyY, legIndex)) continue;

    const angle = Math.atan2(cell.y - bodyY, cell.x - bodyX);
    const score =
      -angleDelta(angle, target) +
      stepCoherenceScore(cell, avoid, bodyVx, bodyVy) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }

  return best;
}

function glideTargetInSector(
  candidates: RingCell[],
  bodyX: number,
  bodyY: number,
  legIndex: number,
  plant: GridCell,
) {
  let best: RingCell | null = null;
  let bestDist = Infinity;
  for (const cell of candidates) {
    if (!cellInLegSector(cell.x, cell.y, bodyX, bodyY, legIndex)) continue;
    const d = gridStepDistance(cell, plant);
    const score = d + ringDistance(cell.x, cell.y, bodyX, bodyY) * 0.002;
    if (score < bestDist) {
      bestDist = score;
      best = cell;
    }
  }
  return best;
}

function createLegFromCell(cell: RingCell, timeS: number): SpiderLegSlot {
  return {
    row: cell.row,
    col: cell.col,
    x: cell.x,
    y: cell.y,
    renderX: cell.x,
    renderY: cell.y,
    plantRow: cell.row,
    plantCol: cell.col,
    swingFromX: cell.x,
    swingFromY: cell.y,
    swingToX: cell.x,
    swingToY: cell.y,
    swingToRow: cell.row,
    swingToCol: cell.col,
    swingHubX: cell.x,
    swingHubY: cell.y,
    glideRow: cell.row,
    glideCol: cell.col,
    glideLocked: false,
    swinging: false,
    presenceStart: timeS,
  };
}

function smoothLegDisplay(slot: SpiderLegSlot, dt: number) {
  slot.renderX = dampTowardDt(slot.renderX, slot.x, dt, DISPLAY_SMOOTH_RATE);
  slot.renderY = dampTowardDt(slot.renderY, slot.y, dt, DISPLAY_SMOOTH_RATE);
}

function glidePixelTarget(
  candidates: RingCell[],
  slot: SpiderLegSlot,
): RingCell | null {
  const locked = candidates.find(
    (c) => c.row === slot.glideRow && c.col === slot.glideCol,
  );
  return locked ?? null;
}

export function initSpiderLegs(
  slots: (SpiderLegSlot | null)[],
  candidates: RingCell[],
  bodyX: number,
  bodyY: number,
  rows: number,
  cols: number,
  timeS: number,
  ringIdealDist: number,
  bodyVx = 0,
  bodyVy = 0,
) {
  const reserved = new Set<string>();
  const avoid: GridCell = { row: -1, col: -1 };

  for (let i = 0; i < SPIDER_LEG_COUNT; i++) {
    if (slots[i]) continue;
    const cell = pickStepCell(
      candidates,
      bodyX,
      bodyY,
      i,
      rows,
      cols,
      avoid,
      reserved,
      ringIdealDist,
      slots,
      0,
      bodyVx,
      bodyVy,
    );
    if (!cell) continue;
    reserved.add(cellKey(cell.row, cell.col));
    slots[i] = createLegFromCell(cell, timeS);
  }
}

export function advanceSpiderGait(
  slots: (SpiderLegSlot | null)[],
  candidates: RingCell[],
  bodyX: number,
  bodyY: number,
  rows: number,
  cols: number,
  timeS: number,
  ringIdealDist: number,
  dt: number,
  bodyVx = 0,
  bodyVy = 0,
) {
  const reserved = new Set<string>();
  for (const slot of slots) {
    if (slot) reserved.add(cellKey(slot.plantRow, slot.plantCol));
  }

  for (let i = 0; i < SPIDER_LEG_COUNT; i++) {
    const slot = slots[i];
    if (!slot) continue;

    const cycle = legCyclePhase(timeS, i);
    const inSwing = cycle >= SPIDER_STANCE_RATIO;

    if (!inSwing) {
      slot.swinging = false;
      const planted = candidates.find(
        (c) => c.row === slot.plantRow && c.col === slot.plantCol,
      );
      if (planted) {
        slot.glideLocked = false;
        slot.x = dampTowardDt(slot.x, planted.x, dt, STANCE_FOLLOW_RATE);
        slot.y = dampTowardDt(slot.y, planted.y, dt, STANCE_FOLLOW_RATE);
      } else {
        if (!slot.glideLocked) {
          const glide = glideTargetInSector(
            candidates,
            bodyX,
            bodyY,
            i,
            { row: slot.plantRow, col: slot.plantCol },
          );
          if (glide) {
            slot.glideRow = glide.row;
            slot.glideCol = glide.col;
            slot.glideLocked = true;
          }
        }
        const glideTarget = glidePixelTarget(candidates, slot);
        if (glideTarget) {
          slot.x = dampTowardDt(slot.x, glideTarget.x, dt, STANCE_GLIDE_RATE);
          slot.y = dampTowardDt(slot.y, glideTarget.y, dt, STANCE_GLIDE_RATE);
        }
      }
      smoothLegDisplay(slot, dt);
      continue;
    }

    const swingRaw = clamp01(
      (cycle - SPIDER_STANCE_RATIO) / (1 - SPIDER_STANCE_RATIO),
    );
    const swingT = smoothstep(smoothstep(swingRaw));

    if (!slot.swinging) {
      slot.swinging = true;
      slot.glideLocked = false;
      slot.swingFromX = slot.renderX;
      slot.swingFromY = slot.renderY;
      slot.swingHubX = bodyX;
      slot.swingHubY = bodyY;
      reserved.delete(cellKey(slot.plantRow, slot.plantCol));

      const next = pickStepCell(
        candidates,
        bodyX,
        bodyY,
        i,
        rows,
        cols,
        { row: slot.plantRow, col: slot.plantCol },
        reserved,
        ringIdealDist,
        slots,
        MIN_OUTWARD_STEP,
        bodyVx,
        bodyVy,
      );

      if (
        next &&
        (next.row !== slot.plantRow || next.col !== slot.plantCol)
      ) {
        slot.swingToRow = next.row;
        slot.swingToCol = next.col;
        slot.swingToX = next.x;
        slot.swingToY = next.y;
        reserved.add(cellKey(next.row, next.col));
      } else {
        slot.swinging = false;
        slot.swingToRow = slot.plantRow;
        slot.swingToCol = slot.plantCol;
        slot.swingToX = slot.swingFromX;
        slot.swingToY = slot.swingFromY;
      }
    }

    if (!slot.swinging) {
      smoothLegDisplay(slot, dt);
      continue;
    }

    const arc = swingArcPosition(
      slot.swingFromX,
      slot.swingFromY,
      slot.swingToX,
      slot.swingToY,
      slot.swingHubX,
      slot.swingHubY,
      swingT,
    );
    const lift = Math.sin(swingT * Math.PI) * GRID_SPACING * 0.04;
    slot.x = arc.x;
    slot.y = arc.y - lift;

    if (swingT >= 0.88) {
      slot.x = dampTowardDt(slot.x, slot.swingToX, dt, SWING_LAND_RATE);
      slot.y = dampTowardDt(slot.y, slot.swingToY, dt, SWING_LAND_RATE);
    }

    if (
      swingT >= 0.995 &&
      Math.hypot(slot.x - slot.swingToX, slot.y - slot.swingToY) < 1.5
    ) {
      slot.row = slot.swingToRow;
      slot.col = slot.swingToCol;
      slot.plantRow = slot.swingToRow;
      slot.plantCol = slot.swingToCol;
      slot.x = slot.swingToX;
      slot.y = slot.swingToY;
      slot.swinging = false;
    }

    smoothLegDisplay(slot, dt);
  }
}
