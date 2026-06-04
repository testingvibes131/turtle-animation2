"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { BlobSetupId } from "@/features/blob-scene/lib/blobVisualPresets";

type BlobScrollState = {
  progress: number;
  heroShowcaseActive: boolean;
  interactionEnabled: boolean;
  blobSetup: BlobSetupId;
  /** Option 2 section 1: random curator color per blob dot. */
  coloredBlobDots: boolean;
};

const defaultState: BlobScrollState = {
  progress: 1,
  heroShowcaseActive: false,
  interactionEnabled: true,
  blobSetup: "connected-lines",
  coloredBlobDots: false,
};

const BlobScrollProgressContext = createContext<BlobScrollState>(defaultState);

export function BlobScrollProgressProvider({
  progress,
  heroShowcaseActive,
  interactionEnabled,
  blobSetup,
  coloredBlobDots,
  children,
}: {
  progress: number;
  heroShowcaseActive: boolean;
  interactionEnabled: boolean;
  blobSetup: BlobSetupId;
  coloredBlobDots: boolean;
  children: ReactNode;
}) {
  return (
    <BlobScrollProgressContext.Provider
      value={{
        progress,
        heroShowcaseActive,
        interactionEnabled,
        blobSetup,
        coloredBlobDots,
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

export function useBlobColoredDots() {
  return useContext(BlobScrollProgressContext).coloredBlobDots;
}

export function useBlobSetup() {
  return useContext(BlobScrollProgressContext).blobSetup;
}
