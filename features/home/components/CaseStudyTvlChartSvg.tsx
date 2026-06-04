type CaseStudyTvlChartSvgProps = {
  className?: string;
};

/** $50M TVL line chart — CSS in globals (.tvl-line, .tvl-area under .case-cards). */
export function CaseStudyTvlChartSvg({ className }: CaseStudyTvlChartSvgProps) {
  return (
    <div
      className={[
        "relative min-h-0 flex-1 overflow-hidden rounded-[clamp(10px,1vw,14px)] bg-[#0f0f0f] outline outline-1 -outline-offset-1 outline-stone-50/10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ minHeight: "clamp(180px, 19vw, 260px)" }}
    >
      <svg
        className="tvl-graph absolute inset-0 h-full w-full"
        viewBox="0 0 320 168"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="case-study-tvl-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#73F36C" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#73F36C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          className="tvl-area"
          d="M0,150 L18,140 30,120 45,95 60,40 78,55 92,30 110,75 128,60 145,90 162,70 180,110 198,100 215,135 232,115 248,145 265,130 282,90 300,50 320,75 L320,168 L0,168 Z"
          fill="url(#case-study-tvl-fill)"
        />
        <path
          className="tvl-line"
          d="M0,150 L18,140 30,120 45,95 60,40 78,55 92,30 110,75 128,60 145,90 162,70 180,110 198,100 215,135 232,115 248,145 265,130 282,90 300,50 320,75"
          fill="none"
          stroke="#73F36C"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
