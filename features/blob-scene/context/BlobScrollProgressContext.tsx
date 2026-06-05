"use client";

import {
  createContext,
  useContext,
  type MutableRefObject,
  type ReactNode,
} from "react";

import {
  DEFAULT_COLORED_DOTS,
  type BlobColoredDotsTuning,
  type BlobTransitionTuning,
} from "@/features/blob-scene/hooks/useBlobControls";
import {
  DEFAULT_SECTION_1_TUNING,
  type BlobSection1Tuning,
} from "@/features/blob-scene/lib/blobSection1Tuning";
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
  transitionTuning: BlobTransitionTuning;
  coloredDotsTuning: BlobColoredDotsTuning;
  section1Tuning: BlobSection1Tuning;
  /** Synced on scroll before React state — use in useFrame for smooth motion. */
  coloredToGrayMixRef: MutableRefObject<number>;
};

const defaultTransitionTuning: BlobTransitionTuning = {
  visualStartFrac: BLOB_VISUAL_TRANSITION_START_FRAC,
  visualEndFrac: BLOB_VISUAL_TRANSITION_END_FRAC,
  interactionStartFrac: BLOB_INTERACTION_SECTION1_START_FRAC,
  distortPeakMul: BLOB_TRANSITION_DISTORT_PEAK_MUL,
};

const defaultColoredDotsTuning: BlobColoredDotsTuning = DEFAULT_COLORED_DOTS;

const defaultColoredToGrayMixRef = { current: 1 };

const defaultState: BlobScrollState = {
  progress: 1,
  heroShowcaseActive: false,
  interactionEnabled: true,
  blobSetup: "connected-lines",
  coloredToGrayMix: 1,
  transitionTuning: defaultTransitionTuning,
  coloredDotsTuning: defaultColoredDotsTuning,
  section1Tuning: DEFAULT_SECTION_1_TUNING,
  coloredToGrayMixRef: defaultColoredToGrayMixRef,
};

const BlobScrollProgressContext = createContext<BlobScrollState>(defaultState);

export function BlobScrollProgressProvider({
  progress,
  heroShowcaseActive,
  interactionEnabled,
  blobSetup,
  coloredToGrayMix,
  coloredToGrayMixRef,
  transitionTuning = defaultTransitionTuning,
  coloredDotsTuning = defaultColoredDotsTuning,
  section1Tuning = DEFAULT_SECTION_1_TUNING,
  children,
}: {
  progress: number;
  heroShowcaseActive: boolean;
  interactionEnabled: boolean;
  blobSetup: BlobSetupId;
  coloredToGrayMix: number;
  coloredToGrayMixRef: MutableRefObject<number>;
  transitionTuning?: BlobTransitionTuning;
  coloredDotsTuning?: BlobColoredDotsTuning;
  section1Tuning?: BlobSection1Tuning;
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
        coloredToGrayMixRef,
        transitionTuning,
        coloredDotsTuning,
        section1Tuning,
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

export function useBlobColoredToGrayMixRef() {
  return useContext(BlobScrollProgressContext).coloredToGrayMixRef;
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

export function useBlobTransitionTuning() {
  return useContext(BlobScrollProgressContext).transitionTuning;
}

export function useBlobColoredDotsTuning() {
  return useContext(BlobScrollProgressContext).coloredDotsTuning;
}

export function useBlobSection1Tuning() {
  return useContext(BlobScrollProgressContext).section1Tuning;
}
