import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400"],
});

const CARD_CLASS =
  "rounded-[20px] border-[0.5px] border-solid border-[rgba(249,249,249,0.1)] bg-[#191a19] p-[30px]";

function RingGraphic({ className }: { className?: string }) {
  const r = 31;
  const c = 2 * Math.PI * r;
  const pct = 0.18;
  const dash = c * pct;
  const gap = c - dash;

  return (
    <svg
      className={className}
      width={72}
      height={72}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g transform="rotate(-150 36 36)">
        <circle
          cx={36}
          cy={36}
          r={r}
          stroke="rgba(249,249,249,0.12)"
          strokeWidth={3}
        />
        <circle
          cx={36}
          cy={36}
          r={r}
          stroke="#73f36c"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
        />
      </g>
    </svg>
  );
}

function SparklineGraphic({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 281 86"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="spark-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#73f36c" stopOpacity="0.2" />
          <stop offset="18%" stopColor="#73f36c" stopOpacity="1" />
          <stop offset="100%" stopColor="#73f36c" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d="M4 58C32 54 48 62 72 48c18-10 34-26 58-22 20 3 36 22 56 14 16-6 28-22 46-26 12-3 24 2 37-6 10-6 18-16 28-10"
        stroke="url(#spark-fade)"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CoordinatedCapitalStats() {
  return (
    <aside
      className={[
        "pointer-events-none absolute bottom-10 right-8 z-20 flex w-[min(calc(100vw-3rem),340px)] flex-col gap-4",
        dmSans.className,
      ].join(" ")}
      aria-label="Coordinated capital metrics"
    >
      <div
        className={[
          CARD_CLASS,
          "flex h-[128px] items-center gap-[25px] shadow-[0px_0px_20px_rgba(0,0,0,0.2)]",
        ].join(" ")}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-center text-base leading-[1.2] text-[rgba(255,255,255,0.6)] sm:text-left">
            Capital coordinated
          </p>
          <p className="text-[30px] leading-[1.6] text-white">$4.2bn</p>
        </div>
        <RingGraphic className="shrink-0" />
      </div>

      <div
        className={[
          CARD_CLASS,
          "relative flex h-[128px] flex-col justify-center overflow-hidden shadow-[0px_0px_40px_rgba(0,0,0,0.2)]",
        ].join(" ")}
      >
        <div className="relative z-10 flex flex-col gap-1">
          <p className="text-center text-base leading-[1.2] text-[rgba(255,255,255,0.6)] sm:text-left">
            Capital coordinated
          </p>
          <p className="text-[30px] leading-[1.6] text-white">$4.2bn</p>
        </div>
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-[86px] px-2">
          <SparklineGraphic className="h-full w-full opacity-90" />
        </div>
      </div>
    </aside>
  );
}
