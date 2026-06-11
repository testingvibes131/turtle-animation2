"use client";

import { BlobSceneContent } from "@/features/blob-scene/components/blob/BlobSceneContent";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";

/** The scroll-driven placement (offset/scale/rotation) is computed per-frame
 *  inside BlobSceneContent's useFrame, off the React render path. */
export function BlobSceneShell({ params }: { params: BlobVisualParams }) {
  return <BlobSceneContent params={params} />;
}
