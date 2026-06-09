"use client";

import { SECTION_2_PARAMS } from "@/features/blob-scene/lib/blobVisualPresets";
import {
  BLOB_INTERACTION_SECTION2_VIEWPORT_BOTTOM_FRAC,
  BLOB_VISUAL_TRANSITION_END_FRAC,
  BLOB_VISUAL_TRANSITION_START_FRAC,
} from "@/features/blob-scene/lib/scroll/blobScrollInteraction";
import type {
  BlobControls,
  BlobTransitionTuning,
  BlobVisualParams,
} from "@/features/blob-scene/hooks/blobControlTypes";

export type {
  BlobControls,
  BlobTransitionTuning,
  BlobVisualParams,
} from "@/features/blob-scene/hooks/blobControlTypes";

const BLOB_PARAMS: BlobVisualParams = {
  ...SECTION_2_PARAMS,
  time: 0,
};

const BLOB_TRANSITION: BlobTransitionTuning = {
  visualStartFrac: BLOB_VISUAL_TRANSITION_START_FRAC,
  visualEndFrac: BLOB_VISUAL_TRANSITION_END_FRAC,
  interactionStartFrac: BLOB_INTERACTION_SECTION2_VIEWPORT_BOTTOM_FRAC,
  distortPeakMul: 1,
};

export function useBlobControls(): BlobControls {
  return {
    params: BLOB_PARAMS,
    transition: BLOB_TRANSITION,
  };
}
