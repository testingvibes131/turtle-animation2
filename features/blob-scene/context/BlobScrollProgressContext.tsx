"use client";

import { createContext, useContext, type ReactNode } from "react";

type BlobScrollState = {
  progress: number;
  /** 0 → 1 from first scroll until hover interaction threshold. */
  showcaseProgress: number;
  showcaseActive: boolean;
  interactionEnabled: boolean;
};

const defaultState: BlobScrollState = {
  progress: 1,
  showcaseProgress: 0,
  showcaseActive: false,
  interactionEnabled: true,
};

const BlobScrollProgressContext = createContext<BlobScrollState>(defaultState);

export function BlobScrollProgressProvider({
  progress,
  showcaseProgress,
  showcaseActive,
  interactionEnabled,
  children,
}: {
  progress: number;
  showcaseProgress: number;
  showcaseActive: boolean;
  interactionEnabled: boolean;
  children: ReactNode;
}) {
  return (
    <BlobScrollProgressContext.Provider
      value={{ progress, showcaseProgress, showcaseActive, interactionEnabled }}
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

export function useBlobScrollShowcaseProgress() {
  return useContext(BlobScrollProgressContext).showcaseProgress;
}

export function useBlobScrollShowcaseActive() {
  return useContext(BlobScrollProgressContext).showcaseActive;
}
