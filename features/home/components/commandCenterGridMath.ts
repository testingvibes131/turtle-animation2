/** Shared math helpers for Command Center canvases. */

export function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number) {
  return clamp(value, 0, 1);
}

/** Stable 0–1 hash per grid cell — scattered, not angular order. */
export function cellOrganicUnit(row: number, col: number) {
  const n = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function cellKey(row: number, col: number) {
  return `${row},${col}`;
}
