"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import {
  useBlobScrollProgress,
  useBlobScrollWobbleStrengthRef,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import {
  ensureBlobVertexFrameCache,
  updateBlobVertexFrameCache,
  type BlobVertexFrameCache,
} from "@/features/blob-scene/lib/geometry/blobVertexFrameCache";
import { blobTransitionDistortStrength } from "@/features/blob-scene/lib/geometry/blobTransitionDistort";
import { fastSin } from "@/features/blob-scene/lib/geometry/fastSin";
import { BLOB_SCROLL_EASE_RATE } from "@/features/blob-scene/lib/scroll/blobScrollInteraction";

/** Landing: radius (blob-local units) each point scatters into the surrounding volume. */
const LANDING_SCATTER_RADIUS = 0.55;
/** Fraction of hero scroll over which the scattered network gathers into the globe. */
const LANDING_GATHER_FRAC = 0.9;
/** Always-on subtle dot drift (blob-local units) so the cloud keeps gently moving. */
const DOT_FLOAT_AMP = 0.007;
/** Speed of the subtle dot drift. */
const DOT_FLOAT_SPEED = 0.6;

/** Deterministic [0,1) hash so per-vertex scatter is stable across frames. */
const hashFract = (n: number) => {
  const x = Math.sin(n) * 43758.5453;
  return x - Math.floor(x);
};


/** Runs before point/zone useFrame hooks — single displacement pass per frame. */
export function BlobFrameGeometryCache() {
  const { vertices, blobAnimTimeRef, getBlobParamsAtTime, blobFrameCacheRef } =
    useBlobScene();
  const scrollWobbleStrengthRef = useBlobScrollWobbleStrengthRef();
  const scrollProgress = useBlobScrollProgress();
  const scrollProgressRef = useRef(scrollProgress);
  scrollProgressRef.current = scrollProgress;
  const displayedProgressRef = useRef(scrollProgress);
  const cacheRef = useRef<BlobVertexFrameCache | null>(null);

  // Stable per-vertex scatter: an independent random direction × magnitude, so
  // the landing state reads as a dispersed network of relays (not coherent noise
  // "tentacles"). Scaled toward 0 as the blob gathers into the globe.
  const scatterOffsets = useMemo(() => {
    const n = vertices.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const dx = hashFract(i * 12.9898 + 0.1) * 2 - 1;
      const dy = hashFract(i * 78.233 + 0.2) * 2 - 1;
      const dz = hashFract(i * 37.719 + 0.3) * 2 - 1;
      const len = Math.hypot(dx, dy, dz) || 1;
      const mag = LANDING_SCATTER_RADIUS * (0.35 + 0.65 * hashFract(i * 93.989));
      arr[i * 3] = (dx / len) * mag;
      arr[i * 3 + 1] = (dy / len) * mag;
      arr[i * 3 + 2] = (dz / len) * mag;
    }
    return arr;
  }, [vertices.count]);

  useFrame((state, delta) => {
    const cache = ensureBlobVertexFrameCache(
      cacheRef.current,
      vertices.count,
    );
    cacheRef.current = cache;
    blobFrameCacheRef.current = cache;

    // Decay scroll energy each frame so the ambient cap-wave sweep speed
    // (read in Section1CapWave) eases back to rest. The wobble no longer
    // distorts the blob geometry — that scroll "jello" displacement was removed.
    scrollWobbleStrengthRef.current *= 0.9;

    // Ease displayed scroll progress toward the target so the dispersion gather
    // stays smooth (matching the eased blob motion) rather than stepping with
    // React re-renders.
    displayedProgressRef.current +=
      (scrollProgressRef.current - displayedProgressRef.current) *
      (1 - Math.exp(-delta * BLOB_SCROLL_EASE_RATE));

    const blobParams = getBlobParamsAtTime(blobAnimTimeRef.current);
    updateBlobVertexFrameCache(vertices, blobParams, cache);

    // Landing dispersion (scatter, gathers across the hero scroll) plus an
    // always-on subtle per-dot float so the cloud keeps gently drifting — the
    // network shimmers at the top and the gathered globe still feels alive.
    const gatherMix = Math.min(
      1,
      displayedProgressRef.current / LANDING_GATHER_FRAC,
    );
    const strength = blobTransitionDistortStrength(gatherMix);
    const floatT = state.clock.elapsedTime * DOT_FLOAT_SPEED;
    const pos = cache.positions;
    const n = cache.vertexCount;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const ox = scatterOffsets[i3]!;
      const oy = scatterOffsets[i3 + 1]!;
      const oz = scatterOffsets[i3 + 2]!;
      pos[i3] += fastSin(floatT + ox * 9) * DOT_FLOAT_AMP + ox * strength;
      pos[i3 + 1] +=
        fastSin(floatT * 1.13 + oy * 9) * DOT_FLOAT_AMP + oy * strength;
      pos[i3 + 2] +=
        fastSin(floatT * 0.87 + oz * 9) * DOT_FLOAT_AMP + oz * strength;
    }
  }, -100);

  return null;
}
