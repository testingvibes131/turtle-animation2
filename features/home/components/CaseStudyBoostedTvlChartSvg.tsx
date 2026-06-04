type CaseStudyBoostedTvlChartSvgProps = {
  className?: string;
};

/** Boosted TVL bar chart — CSS in globals (.bar-grow under .case-cards). */
export function CaseStudyBoostedTvlChartSvg({
  className,
}: CaseStudyBoostedTvlChartSvgProps) {
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
        viewBox="0 0 384 192"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="case-study-bar-amber" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="case-study-bar-red" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="case-study-bar-blue" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <g transform="translate(12 130)">
          <g className="bar-grow" data-color="amber">
            <rect width={116} height={62} fill="url(#case-study-bar-amber)" />
            <line x1={0} y1={0} x2={116} y2={0} stroke="#f59e0b" strokeWidth={2.4} />
            <line x1={0} y1={0} x2={0} y2={62} stroke="#f59e0b" strokeWidth={1.2} />
            <line x1={116} y1={0} x2={116} y2={62} stroke="#f59e0b" strokeWidth={1.2} />
          </g>
        </g>
        <g transform="translate(132 100)">
          <g className="bar-grow" data-color="red">
            <rect width={116} height={92} fill="url(#case-study-bar-red)" />
            <line x1={0} y1={0} x2={116} y2={0} stroke="#ef4444" strokeWidth={2.4} />
            <line x1={0} y1={0} x2={0} y2={92} stroke="#ef4444" strokeWidth={1.2} />
            <line x1={116} y1={0} x2={116} y2={92} stroke="#ef4444" strokeWidth={1.2} />
          </g>
        </g>
        <g transform="translate(252 60)">
          <g className="bar-grow" data-color="blue">
            <rect width={116} height={132} fill="url(#case-study-bar-blue)" />
            <line x1={0} y1={0} x2={116} y2={0} stroke="#1d4ed8" strokeWidth={2.4} />
            <line x1={0} y1={0} x2={0} y2={132} stroke="#1d4ed8" strokeWidth={1.2} />
            <line x1={116} y1={0} x2={116} y2={132} stroke="#1d4ed8" strokeWidth={1.2} />
          </g>
        </g>
      </svg>
    </div>
  );
}
