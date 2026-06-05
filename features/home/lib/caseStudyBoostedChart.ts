import type { CaseStudyAprBadge } from "@/features/home/data/caseStudies";
import { sortAprBadgesByApy } from "@/features/home/data/caseStudies";

export const BOOSTED_CHART_VIEWBOX = { width: 384, height: 192 } as const;
const CHART_BASELINE_Y = BOOSTED_CHART_VIEWBOX.height;
const MAX_BAR_HEIGHT = 132;
const MIN_BAR_HEIGHT = 44;

export type BoostedChartBar = CaseStudyAprBadge & {
  height: number;
  x: number;
};

export function apyToBarHeight(apy: number, minApy: number, maxApy: number): number {
  if (maxApy <= minApy) return MAX_BAR_HEIGHT;
  const t = (apy - minApy) / (maxApy - minApy);
  return MIN_BAR_HEIGHT + t * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);
}

export function layoutBoostedChartBars(count: number) {
  const barWidth = Math.min(92, Math.floor((BOOSTED_CHART_VIEWBOX.width - 48) / count - 14));
  const spacing = (BOOSTED_CHART_VIEWBOX.width - count * barWidth) / (count + 1);
  const xs = Array.from(
    { length: count },
    (_, index) => spacing + index * (barWidth + spacing),
  );

  return { barWidth, xs };
}

/** Bars sorted by APY (low → high), height proportional to APY within the product set. */
export function buildBoostedChartBars(badges: CaseStudyAprBadge[]): {
  bars: BoostedChartBar[];
  barWidth: number;
} {
  const sorted = sortAprBadgesByApy(badges);
  const apys = sorted.map((badge) => badge.apy);
  const minApy = Math.min(...apys);
  const maxApy = Math.max(...apys);
  const { barWidth, xs } = layoutBoostedChartBars(sorted.length);

  const bars = sorted.map((badge, index) => ({
    ...badge,
    height: apyToBarHeight(badge.apy, minApy, maxApy),
    x: xs[index],
  }));

  return { bars, barWidth };
}

export function boostedBarTopY(height: number) {
  return CHART_BASELINE_Y - height;
}
