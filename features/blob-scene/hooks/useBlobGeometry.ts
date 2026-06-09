import { useMemo } from "react";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import {
  createIcosahedronVertices,
  estimateVertexSpacing,
} from "@/features/blob-scene/lib/geometry/perlinBlob";

export function useBlobGeometry(params: BlobVisualParams) {
  const vertices = useMemo(
    () => createIcosahedronVertices(params.radius, params.detail),
    [params.radius, params.detail],
  );

  const vertexIndices = useMemo(
    () => Array.from({ length: vertices.count }, (_, i) => i),
    [vertices.count],
  );

  const pointRadius = useMemo(
    () =>
      estimateVertexSpacing(params.radius, vertices.count) *
      params.pointSizeRatio,
    [params.radius, vertices.count, params.pointSizeRatio],
  );

  return { vertices, vertexIndices, pointRadius };
}
