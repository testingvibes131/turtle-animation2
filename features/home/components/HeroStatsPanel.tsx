/** Figma hero stats stack (1442:27812) — bottom-right of section 1. */

import { Fragment } from "react";

const stakeWidgetShell =
  "overflow-hidden backdrop-blur-[7px] border border-[rgba(249,249,249,0.06)] bg-gradient-to-b from-[#141514] to-[#1b1c1b] rounded-[20px] p-5";

/** All stake widgets are 280px wide in Figma (1442:27814, 1442:27837, 1442:27847). */
const widgetWidth = "w-[280px] max-w-full shrink-0";

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

function CoordinatedCapitalCard() {
  return (
    <div className={`${stakeWidgetShell} ${widgetWidth} flex h-[255px] flex-col`}>
      <div className="flex h-full w-full flex-col justify-between">
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
    <div className={`${stakeWidgetShell} ${widgetWidth}`}>
      <div className="flex w-full flex-col gap-4">
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
    <div className={`${stakeWidgetShell} ${widgetWidth}`}>
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
      <div className="flex w-fit max-w-full flex-col items-end gap-3.5 sm:flex-row sm:gap-[14px]">
        <CoordinatedCapitalCard />
        <div className="flex w-fit max-w-full flex-col gap-[14px]">
          <DefiTvlCard />
          <BenchmarkRatesCard />
        </div>
      </div>
    </aside>
  );
}
