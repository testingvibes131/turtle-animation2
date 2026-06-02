"use client";

import { createContext, useContext, type ReactNode } from "react";

type BlobScrollState = {
  progress: number;
  heroShowcaseActive: boolean;
  interactionEnabled: boolean;
};

const defaultState: BlobScrollState = {
  progress: 1,
  heroShowcaseActive: false,
  interactionEnabled: true,
};

const BlobScrollProgressContext = createContext<BlobScrollState>(defaultState);

export function BlobScrollProgressProvider({
  progress,
  heroShowcaseActive,
  interactionEnabled,
  children,
}: {
  progress: number;
  heroShowcaseActive: boolean;
  interactionEnabled: boolean;
  children: ReactNode;
}) {
  return (
    <BlobScrollProgressContext.Provider
      value={{ progress, heroShowcaseActive, interactionEnabled }}
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
