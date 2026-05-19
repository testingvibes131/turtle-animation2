import {
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
} from "three";
import type { LineSegmentsGeometry } from "three-stdlib";

let _lineDistancesBuf: Float32Array | null = null;

/**
 * Per-stick dash phase (0 → span), not chained across instances.
 * Span should be the nominal full pole height so dashes stay put while the
 * visible segment grows or shrinks.
 */
export function updateFeaturedStickLineDistances(
  geometry: LineSegmentsGeometry,
  dashSpans: Float32Array,
  segmentCount: number,
): void {
  const n = Math.max(segmentCount, 1);
  const needed = n * 2;
  if (!_lineDistancesBuf || _lineDistancesBuf.length < needed) {
    _lineDistancesBuf = new Float32Array(needed);
  }
  const lineDistances = _lineDistancesBuf;

  for (let i = 0; i < segmentCount; i++) {
    const j = i * 2;
    lineDistances[j] = 0;
    lineDistances[j + 1] = dashSpans[i] ?? 0;
  }

  const existing = geometry.getAttribute("instanceDistanceStart");
  if (existing instanceof InterleavedBufferAttribute) {
    const buf = existing.data;
    buf.array.set(lineDistances.subarray(0, buf.array.length));
    buf.needsUpdate = true;
    return;
  }

  const instanceDistanceBuffer = new InstancedInterleavedBuffer(lineDistances, 2, 1);
  geometry.setAttribute(
    "instanceDistanceStart",
    new InterleavedBufferAttribute(instanceDistanceBuffer, 1, 0),
  );
  geometry.setAttribute(
    "instanceDistanceEnd",
    new InterleavedBufferAttribute(instanceDistanceBuffer, 1, 1),
  );
}
