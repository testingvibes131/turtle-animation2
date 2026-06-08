"use client";

import {
  createContext,
  useContext,
  type MutableRefObject,
  type ReactNode,
} from "react";

import type { BlobTransitionTuning } from "@/features/blob-scene/hooks/useBlobControls";
import type { BlobSetupId } from "@/features/blob-scene/lib/blobVisualPresets";
import { BLOB_TRANSITION_DISTORT_PEAK_MUL } from "@/features/blob-scene/lib/geometry/blobTransitionDistort";
import {
  BLOB_INTERACTION_SECTION2_VIEWPORT_BOTTOM_FRAC,
  BLOB_VISUAL_TRANSITION_END_FRAC,
  BLOB_VISUAL_TRANSITION_START_FRAC,
} from "@/features/blob-scene/lib/scroll/blobScrollInteraction";

type BlobScrollState = {
  progress: number;
  /** Hero / section 1 scroll stage (ambient lightning). */
  inSection1: boolean;
  interactionEnabled: boolean;
  blobSetup: BlobSetupId;
  /** Always 1 — gray dots throughout. */
  coloredToGrayMix: number;
  /** Section 1 mirrors section 2 curator layout on the opposite side. */
  layoutMirrored: boolean;
  transitionTuning: BlobTransitionTuning;
  coloredToGrayMixRef: MutableRefObject<number>;
  /** 0–1, driven by scroll velocity — modulates noise wobble in the canvas. */
  scrollWobbleStrengthRef: MutableRefObject<number>;
};

const defaultTransitionTuning: BlobTransitionTuning = {
  visualStartFrac: BLOB_VISUAL_TRANSITION_START_FRAC,
  visualEndFrac: BLOB_VISUAL_TRANSITION_END_FRAC,
  interactionStartFrac: BLOB_INTERACTION_SECTION2_VIEWPORT_BOTTOM_FRAC,
  distortPeakMul: BLOB_TRANSITION_DISTORT_PEAK_MUL,
};

const defaultColoredToGrayMixRef = { current: 1 };
const defaultScrollWobbleStrengthRef = { current: 0 };

const defaultState: BlobScrollState = {
  progress: 1,
  inSection1: false,
  interactionEnabled: true,
  blobSetup: "connected-lines",
  coloredToGrayMix: 1,
  layoutMirrored: false,
  transitionTuning: defaultTransitionTuning,
  coloredToGrayMixRef: defaultColoredToGrayMixRef,
  scrollWobbleStrengthRef: defaultScrollWobbleStrengthRef,
};

const BlobScrollProgressContext = createContext<BlobScrollState>(defaultState);

export function BlobScrollProgressProvider({
  progress,
  inSection1,
  interactionEnabled,
  blobSetup,
  coloredToGrayMix,
  coloredToGrayMixRef,
  scrollWobbleStrengthRef,
  layoutMirrored,
  transitionTuning = defaultTransitionTuning,
  children,
}: {
  progress: number;
  inSection1: boolean;
  interactionEnabled: boolean;
  blobSetup: BlobSetupId;
  coloredToGrayMix: number;
  coloredToGrayMixRef: MutableRefObject<number>;
  scrollWobbleStrengthRef: MutableRefObject<number>;
  layoutMirrored: boolean;
  transitionTuning?: BlobTransitionTuning;
  children: ReactNode;
}) {
  return (
    <BlobScrollProgressContext.Provider
      value={{
        progress,
        inSection1,
        interactionEnabled,
        blobSetup,
        coloredToGrayMix,
        coloredToGrayMixRef,
        scrollWobbleStrengthRef,
        layoutMirrored,
        transitionTuning,
      }}
    >
      {children}
    </BlobScrollProgressContext.Provider>
  );
}

/** 0 = hero (left), 1 = section 2 (right). */
export function useBlobScrollProgress() {
  return useContext(BlobScrollProgressContext).progress;
}

export function useBlobInSection1() {
  return useContext(BlobScrollProgressContext).inSection1;
}

export function useBlobInteractionEnabled() {
  return useContext(BlobScrollProgressContext).interactionEnabled;
}

/** Zone layout + ambient lightning (section 1 or section 2 hover stage). */
export function useBlobZonesLayoutEnabled() {
  const { inSection1, interactionEnabled } = useContext(BlobScrollProgressContext);
  return inSection1 || interactionEnabled;
}

export function useBlobLayoutMirrored() {
  return useContext(BlobScrollProgressContext).layoutMirrored;
}

export function useBlobSetup() {
  return useContext(BlobScrollProgressContext).blobSetup;
}

export function useBlobColoredToGrayMix() {
  return useContext(BlobScrollProgressContext).coloredToGrayMix;
}

export function useBlobColoredToGrayMixRef() {
  return useContext(BlobScrollProgressContext).coloredToGrayMixRef;
}

export function useBlobCuratorOverlayEnabled() {
  return useBlobZonesLayoutEnabled();
}

export function useBlobTransitionTuning() {
  return useContext(BlobScrollProgressContext).transitionTuning;
}

export function useBlobScrollWobbleStrengthRef() {
  return useContext(BlobScrollProgressContext).scrollWobbleStrengthRef;
}
