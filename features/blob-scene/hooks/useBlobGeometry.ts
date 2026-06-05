import { useMemo } from "react";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import { buildLiveVertexSet } from "@/features/blob-scene/lib/geometry/liveVertices";
import {
  createIcosahedronVertices,
  estimateVertexSpacing,
} from "@/features/blob-scene/lib/geometry/perlinBlob";

export function useBlobGeometry(params: BlobVisualParams) {
  const vertices = useMemo(
    () => createIcosahedronVertices(params.radius, params.detail),
    [params.radius, params.detail],
  );

  const liveVertices = useMemo(
    () => buildLiveVertexSet(vertices.count),
    [vertices.count],
  );

  const { liveIndices, deadIndices } = useMemo(() => {
    const live: number[] = [];
    const dead: number[] = [];
    for (let i = 0; i < vertices.count; i++) {
      if (liveVertices.has(i)) live.push(i);
      else dead.push(i);
    }
    return { liveIndices: live, deadIndices: dead };
  }, [vertices.count, liveVertices]);

  const pointRadius = useMemo(
    () =>
      estimateVertexSpacing(params.radius, vertices.count) *
      params.pointSizeRatio,
    [params.radius, vertices.count, params.pointSizeRatio],
  );

  return { vertices, liveVertices, liveIndices, deadIndices, pointRadius };
}
