export type ChartViewBoxFit = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

/** Uniform scale + offset so a viewBox fits inside a container (same as CSS object-contain). */
export function chartContainFit(
  width: number,
  height: number,
  vbW: number,
  vbH: number,
): ChartViewBoxFit {
  const scale = Math.min(width / vbW, height / vbH);
  return {
    scale,
    offsetX: (width - vbW * scale) / 2,
    offsetY: (height - vbH * scale) / 2,
  };
}

/** Uniform scale + offset so a viewBox covers a container (same as CSS object-cover). */
export function chartCoverFit(
  width: number,
  height: number,
  vbW: number,
  vbH: number,
): ChartViewBoxFit {
  const scale = Math.max(width / vbW, height / vbH);
  return {
    scale,
    offsetX: (width - vbW * scale) / 2,
    offsetY: (height - vbH * scale) / 2,
  };
}

/**
 * Equal inset on all sides — uses the horizontal margin from object-contain
 * and applies the same padding top/bottom.
 */
export function chartUniformMarginFit(
  width: number,
  height: number,
  vbW: number,
  vbH: number,
): ChartViewBoxFit {
  const containScale = Math.min(width / vbW, height / vbH);
  const margin = (width - vbW * containScale) / 2;
  const scale = Math.min(
    (width - 2 * margin) / vbW,
    (height - 2 * margin) / vbH,
  );
  return {
    scale,
    offsetX: margin,
    offsetY: margin,
  };
}
