/** Figma hero stats — mobile 1437:116033, desktop 1442:27812. */

import { Fragment } from "react";

const stakeWidgetShell =
  "overflow-hidden backdrop-blur-[7px] border border-[rgba(249,249,249,0.06)] bg-gradient-to-b from-[#141514] to-[#1b1c1b] rounded-[20px] p-5";

const widgetWidthDesktop = "lg:w-[280px]";
const widgetWidthMobile = "w-[179px] max-w-full";

function StatDivider() {
  return <div className="h-px w-full shrink-0 bg-[rgba(249,249,249,0.06)]" aria-hidden="true" />;
}

type StatRowProps = {
  label: string;
  value: string;
};

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex w-full items-center justify-between gap-2 text-[14px] font-medium leading-[1.2]">
      <span className="min-w-0 text-ink-subtle">{label}</span>
      <span className="shrink-0 text-right text-ink-primary">{value}</span>
    </div>
  );
}

const BENCHMARK_DOT_COUNT = 13;

function BenchmarkDotBar({
  activeCount,
  activeClass,
}: {
  activeCount: number;
  activeClass: string;
}) {
  return (
    <div
      className="flex w-[143px] shrink-0 items-center justify-between overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: BENCHMARK_DOT_COUNT }, (_, i) => (
        <span
          key={i}
          className={[
            "size-[3px] shrink-0 rounded-full",
            i < activeCount ? activeClass : "bg-ink-faint",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

type TrendDotBarProps = {
  count: number;
  activeIndex: number;
  activeClass: string;
};

/** Mobile trend sparkline (Figma 1374:36377 — 9 or 18 dots, single highlight). */
function TrendDotBar({ count, activeIndex, activeClass }: TrendDotBarProps) {
  return (
    <div
      className="flex min-w-0 flex-1 items-center justify-between gap-[5px] overflow-hidden px-0.5"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={[
            "size-[3px] shrink-0 rounded-full",
            i === activeIndex ? activeClass : "bg-ink-faint",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

type TrendPeriodRowProps = {
  period: string;
  dotCount: number;
  activeIndex: number;
  activeDotClass: string;
  value: string;
  valueClass: string;
};

function TrendPeriodRow({
  period,
  dotCount,
  activeIndex,
  activeDotClass,
  value,
  valueClass,
}: TrendPeriodRowProps) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="w-5 shrink-0 text-[10px] font-medium leading-[1.2] text-ink-subtle">
        {period}
      </span>
      <TrendDotBar count={dotCount} activeIndex={activeIndex} activeClass={activeDotClass} />
      <span
        className={[
          "shrink-0 text-right text-[10px] font-medium leading-[1.2]",
          valueClass,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

type BenchmarkRateRowProps = {
  asset: string;
  activeDots: number;
  dotClass: string;
  value: string;
  valueClass: string;
};

function BenchmarkRateRow({
  asset,
  activeDots,
  dotClass,
  value,
  valueClass,
}: BenchmarkRateRowProps) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="w-10 shrink-0 text-[14px] font-medium leading-[1.2] text-ink-subtle">
        {asset}
      </span>
      <BenchmarkDotBar activeCount={activeDots} activeClass={dotClass} />
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

const benchmarkRates = [
  {
    asset: "ETH",
    activeDots: 6,
    dotClass: "bg-[#0685ff]",
    value: "2.15%",
    valueClass: "text-[#0685ff]",
  },
  {
    asset: "USDC",
    activeDots: 9,
    dotClass: "bg-[#6dd7f4]",
    value: "3.51%",
    valueClass: "text-[#51daff]",
  },
  {
    asset: "BTC",
    activeDots: 4,
    dotClass: "bg-[#f7931a]",
    value: "1.45%",
    valueClass: "text-[#f7931a]",
  },
] as const;

const MOBILE_TVL_TRENDS = [
  {
    period: "7d",
    dotCount: 9,
    activeIndex: 4,
    activeDotClass: "bg-[#ff1f00]",
    value: "-2.34%",
    valueClass: "text-[#ff1f00]",
  },
  {
    period: "30d",
    dotCount: 9,
    activeIndex: 6,
    activeDotClass: "bg-green-400",
    value: "+1.34%",
    valueClass: "text-green-400",
  },
] as const;

function CoordinatedCapitalCard() {
  return (
    <div
      className={[
        stakeWidgetShell,
        widgetWidthMobile,
        widgetWidthDesktop,
        "flex flex-col lg:h-[255px]",
      ].join(" ")}
    >
      {/* Mobile — Figma 1374:36258 */}
      <div className="flex w-full flex-col gap-5 lg:hidden">
        <p className="text-[10px] font-medium leading-[1.2] text-ink-subtle">
          Turtle Capital Coordinated
        </p>
        <p className="text-[24px] font-normal leading-[1.2] tracking-[-0.192px] text-ink-primary">
          $4.2bn
        </p>
        <div className="flex w-full flex-col gap-[13px]">
          <TrendDotBar count={18} activeIndex={6} activeClass="bg-green-400" />
          <p className="text-[10px] font-medium leading-[1.2] text-green-400">
            +$45.9K (7d)
          </p>
        </div>
      </div>

      {/* Desktop — Figma 1442:27814 */}
      <div className="hidden h-full w-full flex-col justify-between lg:flex">
        <div className="flex flex-col gap-5">
          <p className="text-[14px] font-medium leading-[1.2] text-ink-subtle">
            Turtle Capital Coordinated
          </p>
          <p className="whitespace-nowrap text-[50px] font-normal leading-[1.2] tracking-[-0.4px] text-ink-primary">
            $4.2bn
          </p>
        </div>
        <div className="flex flex-col gap-[9px]">
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

function DefiTvlCard() {
  return (
    <div className={[stakeWidgetShell, widgetWidthMobile, widgetWidthDesktop].join(" ")}>
      {/* Mobile — Figma 1374:36349 */}
      <div className="flex w-full flex-col lg:hidden">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-medium leading-[1.2] text-ink-subtle">
            Total Defi TVL
          </p>
          <p className="text-[20px] font-normal leading-[1.4] text-ink-primary">$134.23bn</p>
        </div>
        <div className="mt-5 flex flex-col gap-2.5">
          {MOBILE_TVL_TRENDS.map((trend) => (
            <TrendPeriodRow key={trend.period} {...trend} />
          ))}
        </div>
      </div>

      {/* Desktop — Figma 1442:27837 */}
      <div className="hidden w-full flex-col gap-4 lg:flex">
        <p className="text-[14px] font-medium leading-[1.2] text-ink-subtle">Total Defi TVL</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-[26px] font-normal leading-none text-ink-primary">$134.2bn</p>
          <span className="inline-flex h-5 shrink-0 items-center justify-center gap-1 rounded-full border border-ink-faint bg-[rgba(249,249,249,0.02)] px-2 py-1 text-[10px] font-normal leading-[1.2]">
            <span className="text-[rgba(255,6,8,0.8)]">-0.15%</span>
            <span className="tracking-[-0.16px] text-white/50">24hr</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function BenchmarkRatesCard() {
  return (
    <div
      className={[
        stakeWidgetShell,
        widgetWidthMobile,
        widgetWidthDesktop,
        "hidden lg:block",
      ].join(" ")}
    >
      <div className="flex w-full flex-col gap-3.5">
        <p className="text-[14px] font-medium leading-[1.2] text-ink-subtle">Benchmark Rates</p>
        <div className="flex flex-col gap-2.5">
          {benchmarkRates.map((rate) => (
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
      className="pointer-events-none relative isolate z-10 flex w-full flex-col items-end pb-10"
      aria-label="Platform statistics"
    >
      <div className="flex flex-col items-end gap-1.5 lg:flex-row lg:gap-[14px]">
        <div className="order-1 flex flex-col items-end gap-[14px] lg:order-2">
          <DefiTvlCard />
          <BenchmarkRatesCard />
        </div>
        <div className="order-2 lg:order-1">
          <CoordinatedCapitalCard />
        </div>
      </div>
    </aside>
  );
}
