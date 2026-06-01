/** Figma hero stats stack (1374:44456) — bottom-right of section 1. */

const widgetShell =
  "overflow-hidden backdrop-blur-[7px] border border-[rgba(249,249,249,0.06)] bg-gradient-to-b from-[#141514] to-[#1b1c1b]";

const metricCardShell = `${widgetShell} rounded-[20px]`;
const statsPillShell = `${widgetShell} rounded-[100px]`;

function WidgetDivider() {
  return <div className="h-px w-full shrink-0 bg-[rgba(249,249,249,0.06)]" aria-hidden="true" />;
}

function SignalBar({
  activeIndex,
  tone,
}: {
  activeIndex: number;
  tone: "positive" | "negative";
}) {
  const activeClass = tone === "positive" ? "bg-green-400" : "bg-[#ff1f00]";
  return (
    <div className="flex items-center gap-2 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 13 }, (_, i) => (
        <span
          key={i}
          className={[
            "h-[3px] w-[3.27px] shrink-0 rounded-full",
            i === activeIndex ? activeClass : "bg-ink-faint",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

type RateRowProps = {
  period: string;
  activeIndex: number;
  value: string;
  tone: "positive" | "negative";
};

function RateRow({ period, activeIndex, value, tone }: RateRowProps) {
  const valueClass = tone === "positive" ? "text-green-400" : "text-[#ff1f00]";
  return (
    <div className="flex w-full items-center gap-[13px]">
      <span className="w-[30px] shrink-0 text-[14px] font-medium leading-[1.2] text-ink-subtle">
        {period}
      </span>
      <SignalBar activeIndex={activeIndex} tone={tone} />
      <span
        className={[
          "ml-auto shrink-0 text-right text-[14px] font-medium leading-[1.2]",
          valueClass,
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function CoordinatedCapitalCard() {
  return (
    <div
      className={`${metricCardShell} flex h-[174px] w-full max-w-[300px] flex-col justify-center p-5`}
    >
      <div className="flex h-full w-full max-w-[260px] flex-col justify-between">
        <div className="flex w-full flex-col gap-[15px]">
          <p className="truncate text-[14px] font-medium leading-[1.2] text-ink-subtle">
            Turtle Capital Coordinated
          </p>
          <WidgetDivider />
        </div>
        <p className="text-[50px] font-normal leading-[1.2] tracking-[-0.4px] text-ink-primary">
          $4.2bn
        </p>
        <div className="flex w-full items-center gap-[13px]">
          <SignalBar activeIndex={4} tone="positive" />
          <span className="ml-auto shrink-0 text-[14px] font-medium leading-[1.2] text-green-400">
            +$45.9K (7d)
          </span>
        </div>
      </div>
    </div>
  );
}

function DefiTvlCard() {
  return (
    <div className={`${metricCardShell} flex h-[174px] w-full max-w-[300px] flex-col p-5`}>
      <div className="flex h-full w-full flex-col justify-between">
        <div className="flex w-full flex-col gap-[15px]">
          <p className="truncate text-[14px] font-medium leading-[1.2] text-ink-subtle">
            Total Defi TVL
          </p>
          <WidgetDivider />
        </div>
        <div className="flex w-full flex-col gap-2.5">
          <p className="text-[20px] font-normal leading-[1.4] text-ink-primary">$134.23bn</p>
          <div className="flex flex-col gap-2.5">
            <RateRow period="7d" activeIndex={3} value="-2.34%" tone="negative" />
            <RateRow period="30d" activeIndex={7} value="+1.34%" tone="positive" />
          </div>
        </div>
      </div>
    </div>
  );
}

const networkStats = [
  { label: "Turtle Network", value: "455,506 LPs" },
  { label: "Deals Indexed", value: "1068" },
  { label: "Turtle Partners", value: "94" },
  { label: "Turtle Opportunities", value: "38" },
  { label: "Active Campaigns", value: "8" },
] as const;

function NetworkStatsBar() {
  return (
    <div
      className={`${statsPillShell} flex w-full max-w-[min(978px,100%)] items-center px-6 py-5 sm:px-10`}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {networkStats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-[15px] whitespace-nowrap text-[14px] font-medium leading-[1.2]"
          >
            <span className="text-ink-subtle">{stat.label}</span>
            <span className="text-ink-primary">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroStatsPanel() {
  return (
    <aside
      className="pointer-events-none z-10 flex w-full max-w-full flex-col items-end gap-5 px-6 pb-10 md:px-10 lg:px-[60px]"
      aria-label="Platform statistics"
    >
      <div className="flex w-full max-w-[615px] flex-col items-end gap-[15px] sm:flex-row sm:justify-end">
        <CoordinatedCapitalCard />
        <DefiTvlCard />
      </div>
      <div className="flex w-full justify-end">
        <NetworkStatsBar />
      </div>
    </aside>
  );
}
