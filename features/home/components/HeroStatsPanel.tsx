/** Figma hero stats — mobile 1599:10939, desktop 1442:27812. */

import { Fragment } from "react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

const stakeWidgetShell =
  "overflow-hidden backdrop-blur-[7px] border border-stroke-subtle bg-gradient-to-b from-surface-0 to-surface-1";

const widgetWidth = "w-[200px] max-w-full lg:w-[280px]";

function StatDivider() {
  return <div className="h-px w-full shrink-0 bg-stroke-subtle" aria-hidden="true" />;
}

type StatRowProps = {
  label: string;
  value: string;
};

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex w-full items-center justify-between gap-2 text-[10px] font-medium leading-[1.2] lg:text-[14px]">
      <span className="min-w-0 text-ink-subtle">{label}</span>
      <span className="shrink-0 text-right text-ink-primary">{value}</span>
    </div>
  );
}

const BENCHMARK_DOT_COUNT = 12;
/** Each dot is 1.5% — a full bar reads 18%+ (the sensible APY ceiling). */
const BENCHMARK_DOT_STEP = 1.5;

function BenchmarkDotBar({
  rate,
  activeClass,
}: {
  rate: number;
  activeClass: string;
}) {
  const fullDots = Math.min(
    BENCHMARK_DOT_COUNT,
    Math.floor(rate / BENCHMARK_DOT_STEP),
  );
  // The fractional remainder breathes on the next dot: 2.15% = one solid
  // dot plus one slowly glowing in and out.
  const hasPartial =
    fullDots < BENCHMARK_DOT_COUNT && rate > fullDots * BENCHMARK_DOT_STEP;
  return (
    <div
      className="flex min-w-0 flex-1 items-center justify-between lg:w-[118px] lg:flex-none"
      aria-hidden="true"
    >
      {Array.from({ length: BENCHMARK_DOT_COUNT }, (_, i) => {
        const active = i < fullDots;
        const partial = hasPartial && i === fullDots;
        return (
          <span
            key={i}
            className={[
              "size-[3px] shrink-0 rounded-full",
              active ? `${activeClass} benchmark-dot-pulse` : "",
              partial ? `${activeClass} benchmark-dot-partial` : "",
              !active && !partial ? "bg-ink-faint" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={active ? { animationDelay: `${i * 0.12}s` } : undefined}
          />
        );
      })}
    </div>
  );
}

type BenchmarkRateRowProps = {
  asset: string;
  rate: number;
  dotClass: string;
  value: string;
  valueClass: string;
};

function BenchmarkRateRow({
  asset,
  rate,
  dotClass,
  value,
  valueClass,
}: BenchmarkRateRowProps) {
  return (
    <div className="flex w-full items-center justify-between gap-[5px]">
      <span className="w-10 shrink-0 text-[14px] font-medium leading-[1.2] text-ink-subtle">
        {asset}
      </span>
      <BenchmarkDotBar rate={rate} activeClass={dotClass} />
      <span
        className={[
          "shrink-0 text-right text-[14px] font-medium leading-[1.2]",
          valueClass,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

const coordinatedStats = [
  { label: "Turtle Network", value: "455,506 LPs" },
  { label: "Opportunities Indexed", value: "1068" },
  { label: "Turtle Partners", value: "94" },
] as const;

const ETH_DOT = "bg-[#0685ff] [box-shadow:0_0_4px_#0685ff66]";
const USDC_DOT = "bg-[#6dd7f4] [box-shadow:0_0_4px_#6dd7f466]";

const benchmarkRates = [
  {
    asset: "USDC",
    rate: 3.51,
    dotClass: USDC_DOT,
    value: "3.51%",
    valueClass: "text-[#51daff]",
  },
  {
    asset: "ETH",
    rate: 2.15,
    dotClass: ETH_DOT,
    value: "2.15%",
    valueClass: "text-[#0685ff]",
  },
] as const;

const turtleRates = [
  {
    asset: "USDC",
    rate: 15.69,
    dotClass: USDC_DOT,
    value: "15.69%",
    valueClass: "text-[#51daff]",
  },
  {
    asset: "ETH",
    rate: 8.75,
    dotClass: ETH_DOT,
    value: "8.75%",
    valueClass: "text-[#0685ff]",
  },
] as const;

function CoordinatedCapitalCard() {
  return (
    <div
      className={[
        stakeWidgetShell,
        widgetWidth,
        "rounded-[14px] p-3.5 lg:rounded-[20px] lg:p-5",
        "flex flex-col lg:h-[247px]",
      ].join(" ")}
    >
      <div className="flex h-full w-full flex-col justify-between">
        <div className="flex flex-col gap-3.5 lg:gap-5">
          <p className="text-[10px] font-medium leading-[1.2] text-ink-subtle lg:text-[14px]">
            Turtle Capital Coordinated
          </p>
          <p className="text-[35px] font-normal leading-[1.2] tracking-[-0.285px] text-ink-primary lg:text-[50px] lg:tracking-[-0.4px] lg:whitespace-nowrap">
            $4.2bn
          </p>
        </div>
        <div className="mt-3.5 flex flex-col gap-1.5 lg:mt-0 lg:gap-[9px]">
          {coordinatedStats.map((stat, index) => (
            <Fragment key={stat.label}>
              <StatRow label={stat.label} value={stat.value} />
              {index < coordinatedStats.length - 1 ? <StatDivider /> : null}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function RatesCard({
  title,
  rates,
}: {
  title: string;
  rates: readonly BenchmarkRateRowProps[];
}) {
  return (
    <div className={[stakeWidgetShell, widgetWidth, "rounded-[20px] p-5"].join(" ")}>
      <div className="flex w-full flex-col gap-3.5">
        <p className="text-[14px] font-medium leading-[1.2] text-ink-subtle">{title}</p>
        <div className="flex flex-col gap-2.5">
          {rates.map((rate) => (
            <BenchmarkRateRow key={rate.asset} {...rate} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroStatsPanel() {
  return (
    <aside
      className="relative isolate z-10 mt-[clamp(80px,23svh,200px)] flex w-full flex-col pb-4 lg:mt-0 lg:pb-[clamp(24px,4vh,48px)] lg:pointer-events-none lg:items-end"
      aria-label="Platform statistics"
    >
      {/* Mobile: stacked column. Desktop: big card left, the two rate pills stacked right. */}
      <div className="flex w-full flex-col items-end gap-[14px] lg:w-auto lg:flex-row lg:items-end">
        <RevealOnScroll>
          <CoordinatedCapitalCard />
        </RevealOnScroll>
        {/* Mobile: only the Capital Coordinated card shows (cleaner); the rate
            pills return at lg. */}
        <div className="hidden flex-col items-end gap-[14px] lg:flex">
          <RevealOnScroll delayMs={120}>
            <RatesCard title="Benchmark Rates" rates={benchmarkRates} />
          </RevealOnScroll>
          <RevealOnScroll delayMs={240}>
            <RatesCard title="Turtle.xyz Rates" rates={turtleRates} />
          </RevealOnScroll>
        </div>
      </div>
    </aside>
  );
}
