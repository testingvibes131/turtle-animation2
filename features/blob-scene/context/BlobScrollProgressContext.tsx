"use client";

import {
  createContext,
  useContext,
  type MutableRefObject,
  type ReactNode,
} from "react";

import type {
  BlobColoredDotsTuning,
  BlobTransitionTuning,
} from "@/features/blob-scene/hooks/useBlobControls";
import type { BlobSetupId } from "@/features/blob-scene/lib/blobVisualPresets";
import { BLOB_TRANSITION_DISTORT_PEAK_MUL } from "@/features/blob-scene/lib/geometry/blobTransitionDistort";
import {
  BLOB_INTERACTION_SECTION1_START_FRAC,
  BLOB_VISUAL_TRANSITION_END_FRAC,
  BLOB_VISUAL_TRANSITION_START_FRAC,
} from "@/features/blob-scene/lib/scroll/blobScrollInteraction";

type BlobScrollState = {
  progress: number;
  heroShowcaseActive: boolean;
  interactionEnabled: boolean;
  /** Runtime mode (`connected-lines` everywhere except Option 2 section 1). */
  blobSetup: BlobSetupId;
  /** 0 = colored dots (S1), 1 = gray dots (S2). Option 1 stays at 1. */
  coloredToGrayMix: number;
  /** Vertical scroll speed in px/s (updated on scroll, decays when idle). */
  scrollVelocityRef: MutableRefObject<number>;
  transitionTuning: BlobTransitionTuning;
  coloredDotsTuning: BlobColoredDotsTuning;
};

const defaultTransitionTuning: BlobTransitionTuning = {
  visualStartFrac: BLOB_VISUAL_TRANSITION_START_FRAC,
  visualEndFrac: BLOB_VISUAL_TRANSITION_END_FRAC,
  interactionStartFrac: BLOB_INTERACTION_SECTION1_START_FRAC,
  distortPeakMul: BLOB_TRANSITION_DISTORT_PEAK_MUL,
};

const defaultColoredDotsTuning: BlobColoredDotsTuning = {
  coreOpacity: 0.8,
  glowScaleMul: 2.35,
  glowOpacity: 0.2,
};

const defaultScrollVelocityRef = { current: 0 };

const defaultState: BlobScrollState = {
  progress: 1,
  heroShowcaseActive: false,
  interactionEnabled: true,
  blobSetup: "connected-lines",
  coloredToGrayMix: 1,
  scrollVelocityRef: defaultScrollVelocityRef,
  transitionTuning: defaultTransitionTuning,
  coloredDotsTuning: defaultColoredDotsTuning,
};

const BlobScrollProgressContext = createContext<BlobScrollState>(defaultState);

export function BlobScrollProgressProvider({
  progress,
  heroShowcaseActive,
  interactionEnabled,
  blobSetup,
  coloredToGrayMix,
  scrollVelocityRef,
  transitionTuning = defaultTransitionTuning,
  coloredDotsTuning = defaultColoredDotsTuning,
  children,
}: {
  progress: number;
  heroShowcaseActive: boolean;
  interactionEnabled: boolean;
  blobSetup: BlobSetupId;
  coloredToGrayMix: number;
  scrollVelocityRef: MutableRefObject<number>;
  transitionTuning?: BlobTransitionTuning;
  coloredDotsTuning?: BlobColoredDotsTuning;
  children: ReactNode;
}) {
  return (
    <BlobScrollProgressContext.Provider
      value={{
        progress,
        heroShowcaseActive,
        interactionEnabled,
        blobSetup,
        coloredToGrayMix,
        scrollVelocityRef,
        transitionTuning,
        coloredDotsTuning,
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

export function useBlobInteractionEnabled() {
  return useContext(BlobScrollProgressContext).interactionEnabled;
}

export function useBlobHeroShowcaseActive() {
  return useContext(BlobScrollProgressContext).heroShowcaseActive;
}

export function useBlobSetup() {
  return useContext(BlobScrollProgressContext).blobSetup;
}

export function useBlobColoredToGrayMix() {
  return useContext(BlobScrollProgressContext).coloredToGrayMix;
}

export function useBlobColoredDotsMix() {
  return 1 - useBlobColoredToGrayMix();
}

export function useBlobColoredDots() {
  return useBlobColoredDotsMix() > 0.001;
}

export function useBlobCuratorOverlayEnabled() {
  return useBlobInteractionEnabled();
}

export function useBlobScrollVelocityRef() {
  return useContext(BlobScrollProgressContext).scrollVelocityRef;
}

export function useBlobTransitionTuning() {
  return useContext(BlobScrollProgressContext).transitionTuning;
}

export function useBlobColoredDotsTuning() {
  return useContext(BlobScrollProgressContext).coloredDotsTuning;
}
