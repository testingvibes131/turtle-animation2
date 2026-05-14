"use client";

import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

type FeaturedAprAxisProps = {
  visible: boolean;
  /** Value at the top of the scale (% points); bottom is always 0%. */
  aprTopPercent: number;
  zIndex: number;
};

/**
 * Fixed 2D vertical legend: **0%** at the bottom, **`aprTopPercent`** at the top,
 * matching the idea that higher‑APR featured spheres sit higher in 3D.
 */
export function FeaturedAprAxis({
  visible,
  aprTopPercent,
  zIndex,
}: FeaturedAprAxisProps) {
  const top = Math.max(0.5, aprTopPercent);
  const mid = top / 2;

  return (
    <div
      className={[
        dmSans.className,
        "pointer-events-none fixed top-1/2 right-5 flex w-16 -translate-y-1/2 flex-col items-end gap-1 transition-opacity duration-300 ease-out select-none",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      style={{ zIndex }}
      aria-hidden
    >
      <span className="pr-0.5 text-[11px] font-semibold tabular-nums text-[#73f36c]">
        {top.toFixed(1)}%
      </span>
      <div className="relative h-[min(52vh,420px)] w-7 shrink-0">
        <div
          className="absolute top-0 right-1 bottom-0 w-px bg-linear-to-b from-[#73f36c]/55 via-white/18 to-white/8"
          aria-hidden
        />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute right-1 h-px w-2.5 bg-white/22"
            style={{
              top: `${(i / 4) * 100}%`,
              transform: "translateY(-50%)",
            }}
            aria-hidden
          />
        ))}
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-medium tabular-nums text-white/38">
          {mid.toFixed(1)}%
        </span>
      </div>
      <span className="pr-0.5 text-[11px] font-semibold tabular-nums text-white/65">
        0%
      </span>
      <span className="pr-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-white/40">
        Est. APR
      </span>
    </div>
  );
}
