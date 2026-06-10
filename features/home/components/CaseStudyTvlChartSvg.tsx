import { visualCanvasBgClass } from "@/features/home/components/commandCenterCanvas";
import type { CaseStudy } from "@/features/home/data/caseStudies";
import {
  TVL_LINE_PATHS,
  tvlAreaPath,
} from "@/features/home/lib/caseStudyTvlChartPaths";

type CaseStudyTvlChartVariant = CaseStudy["id"];

type CaseStudyTvlChartSvgProps = {
  className?: string;
  variant?: CaseStudyTvlChartVariant;
};

/** TVL line chart — CSS in globals (.tvl-line, .tvl-area under .case-cards). */
export function CaseStudyTvlChartSvg({
  className,
  variant = "avalanche",
}: CaseStudyTvlChartSvgProps) {
  const line = TVL_LINE_PATHS[variant];
  const fillId = `case-study-tvl-fill-${variant}`;

  return (
    <div
      className={[
        "relative h-full min-h-0 w-full flex-1 overflow-hidden rounded-[clamp(10px,1vw,14px)] outline outline-1 -outline-offset-1 outline-[var(--stroke-subtle)]",
        visualCanvasBgClass,
        "max-md:min-h-[clamp(100px,24vw,160px)] lg:min-h-[clamp(140px,16vw,260px)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        className="tvl-graph absolute inset-0 h-full w-full"
        viewBox="0 0 320 168"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              style={{ stopColor: "var(--brand-primary)" }}
              stopOpacity={0.35}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--brand-primary)" }}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <path className="tvl-area" d={tvlAreaPath(line)} fill={`url(#${fillId})`} />
        <path
          className="tvl-line"
          d={line}
          fill="none"
          stroke="#73F36C"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
