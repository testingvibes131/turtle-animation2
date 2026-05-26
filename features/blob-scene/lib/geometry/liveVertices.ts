/** Share of vertices that can be hovered (rest are "dead"). */
export const LIVE_VERTEX_RATIO = 0.7;

/** Deterministic shuffle so the same mesh detail always gets the same pattern. */
export function buildLiveVertexSet(
  vertexCount: number,
  liveRatio = LIVE_VERTEX_RATIO,
): Set<number> {
  const indices = Array.from({ length: vertexCount }, (_, i) => i);
  let state = (vertexCount * 2654435761) >>> 0;

  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }

  const liveCount = Math.max(1, Math.round(vertexCount * liveRatio));
  return new Set(indices.slice(0, liveCount));
}

export function isLiveVertex(live: Set<number>, index: number): boolean {
  return live.has(index);
}
