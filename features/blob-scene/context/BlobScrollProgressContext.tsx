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
  BLOB_VISUAL_TRANSITION_END_FRAC,
  BLOB_VISUAL_TRANSITION_START_FRAC,
} from "@/features/blob-scene/lib/scroll/blobScrollInteraction";

type BlobScrollState = {
  /** Continuous scroll floats live in refs (read per-frame in useFrame), so
      scrolling doesn't re-render every context consumer 60×/s. Only the
      threshold booleans below go through React state. */
  progressRef: MutableRefObject<number>;
  /** Blob-motion progress; reaches 1 only at the end of the section-2 sticky hold. */
  motionProgressRef: MutableRefObject<number>;
  /** Hero / section 1 scroll stage (ambient lightning). */
  inSection1: boolean;
  interactionEnabled: boolean;
  /** Mobile section 2: time-based zone carousel (no hover). */
  mobileZoneCarouselEnabled: boolean;
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
  distortPeakMul: BLOB_TRANSITION_DISTORT_PEAK_MUL,
};

const defaultColoredToGrayMixRef = { current: 1 };
const defaultScrollWobbleStrengthRef = { current: 0 };
const defaultProgressRef = { current: 1 };
const defaultMotionProgressRef = { current: 1 };

const defaultState: BlobScrollState = {
  progressRef: defaultProgressRef,
  motionProgressRef: defaultMotionProgressRef,
  inSection1: false,
  interactionEnabled: true,
  mobileZoneCarouselEnabled: false,
  blobSetup: "connected-lines",
  coloredToGrayMix: 1,
  layoutMirrored: false,
  transitionTuning: defaultTransitionTuning,
  coloredToGrayMixRef: defaultColoredToGrayMixRef,
  scrollWobbleStrengthRef: defaultScrollWobbleStrengthRef,
};

const BlobScrollProgressContext = createContext<BlobScrollState>(defaultState);

export function BlobScrollProgressProvider({
  progressRef,
  motionProgressRef,
  inSection1,
  interactionEnabled,
  mobileZoneCarouselEnabled,
  blobSetup,
  coloredToGrayMix,
  coloredToGrayMixRef,
  scrollWobbleStrengthRef,
  layoutMirrored,
  transitionTuning = defaultTransitionTuning,
  children,
}: {
  progressRef: MutableRefObject<number>;
  motionProgressRef: MutableRefObject<number>;
  inSection1: boolean;
  interactionEnabled: boolean;
  mobileZoneCarouselEnabled: boolean;
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
        progressRef,
        motionProgressRef,
        inSection1,
        interactionEnabled,
        mobileZoneCarouselEnabled,
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

/** 0 = hero (left), 1 = section 2 (right). Per-frame value — read in useFrame. */
export function useBlobScrollProgressRef() {
  return useContext(BlobScrollProgressContext).progressRef;
}

/** Blob-motion progress; reaches 1 only at the end of the section-2 sticky hold.
 *  Per-frame value — read in useFrame. */
export function useBlobMotionProgressRef() {
  return useContext(BlobScrollProgressContext).motionProgressRef;
}

export function useBlobInSection1() {
  return useContext(BlobScrollProgressContext).inSection1;
}

export function useBlobInteractionEnabled() {
  return useContext(BlobScrollProgressContext).interactionEnabled;
}

export function useBlobMobileZoneCarouselEnabled() {
  return useContext(BlobScrollProgressContext).mobileZoneCarouselEnabled;
}

/** Freeze blob animation while a zone is highlighted (hover or mobile carousel). */
export function useBlobZoneHighlightActive() {
  const { interactionEnabled, mobileZoneCarouselEnabled } = useContext(
    BlobScrollProgressContext,
  );
  return interactionEnabled || mobileZoneCarouselEnabled;
}

/** Zone layout for cap wave (section 1), hover (desktop section 2), and mobile carousel. */
export function useBlobZonesLayoutEnabled() {
  const { inSection1, interactionEnabled, mobileZoneCarouselEnabled } =
    useContext(BlobScrollProgressContext);
  return inSection1 || interactionEnabled || mobileZoneCarouselEnabled;
}

/** Section 1 only — automatic cap color sweep (not hover). */
export function useBlobSection1AmbientEnabled() {
  return useContext(BlobScrollProgressContext).inSection1;
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

/** Zone assignment runs in section 1 + interactive section 2; hover chrome is separate. */
export function useBlobCuratorOverlayEnabled() {
  return useBlobZonesLayoutEnabled();
}

export function useBlobTransitionTuning() {
  return useContext(BlobScrollProgressContext).transitionTuning;
}

export function useBlobScrollWobbleStrengthRef() {
  return useContext(BlobScrollProgressContext).scrollWobbleStrengthRef;
}
