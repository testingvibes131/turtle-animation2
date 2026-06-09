import type { MutableRefObject } from "react";

export function zoneHighlightBlendMul(
  mobileCarouselEnabled: boolean,
  blendRef: MutableRefObject<number>,
): number {
  return mobileCarouselEnabled ? blendRef.current : 1;
}
