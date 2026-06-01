"use client";

import { createContext, useContext, type ReactNode } from "react";

type BlobScrollState = {
  progress: number;
  interactionEnabled: boolean;
};

const defaultState: BlobScrollState = {
  progress: 1,
  interactionEnabled: true,
};

const BlobScrollProgressContext = createContext<BlobScrollState>(defaultState);

export function BlobScrollProgressProvider({
  progress,
  interactionEnabled,
  children,
}: {
  progress: number;
  interactionEnabled: boolean;
  children: ReactNode;
}) {
  return (
    <BlobScrollProgressContext.Provider
      value={{ progress, interactionEnabled }}
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
