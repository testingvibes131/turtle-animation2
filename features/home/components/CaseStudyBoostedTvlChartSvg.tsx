import type { CaseStudy, CaseStudyAprBadge } from "@/features/home/data/caseStudies";
import {
  BOOSTED_CHART_VIEWBOX,
  buildBoostedChartBars,
  boostedBarTopY,
} from "@/features/home/lib/caseStudyBoostedChart";

type CaseStudyBoostedTvlChartSvgProps = {
  className?: string;
  chartId: CaseStudy["id"];
  badges: CaseStudyAprBadge[];
};

/** Boosted TVL bar chart — bar height ∝ APY; CSS in globals (.bar-grow under .case-cards). */
export function CaseStudyBoostedTvlChartSvg({
  className,
  chartId,
  badges,
}: CaseStudyBoostedTvlChartSvgProps) {
  const { bars, barWidth } = buildBoostedChartBars(badges);

  return (
    <div
      className={[
        "relative h-full min-h-0 w-full flex-1 overflow-hidden rounded-[clamp(10px,1vw,14px)] bg-[#0f0f0f] outline outline-1 -outline-offset-1 outline-stone-50/10",
        "max-md:min-h-[clamp(72px,18vw,120px)] lg:min-h-[clamp(88px,12vw,140px)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        className="boost-bars absolute inset-0 h-full w-full"
        viewBox={`0 0 ${BOOSTED_CHART_VIEWBOX.width} ${BOOSTED_CHART_VIEWBOX.height}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          {bars.map((bar, index) => {
            const gradientId = `case-study-bar-${chartId}-${index}`;
            return (
              <linearGradient
                key={gradientId}
                id={gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
                gradientUnits="objectBoundingBox"
              >
                <stop offset="0%" stopColor={bar.chartColor} stopOpacity={0.45} />
                <stop offset="55%" stopColor={bar.chartColor} stopOpacity={0.12} />
                <stop offset="100%" stopColor={bar.chartColor} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        {bars.map((bar, index) => {
          const gradientId = `case-study-bar-${chartId}-${index}`;
          return (
            <g key={bar.src} transform={`translate(${bar.x} ${boostedBarTopY(bar.height)})`}>
              <g className="bar-grow" data-index={index}>
                <rect width={barWidth} height={bar.height} fill={`url(#${gradientId})`} />
                <line
                  className="bar-top-stroke"
                  x1={0}
                  y1={0}
                  x2={barWidth}
                  y2={0}
                  stroke={bar.chartColor}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
