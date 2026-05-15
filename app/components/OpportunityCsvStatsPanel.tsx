"use client";

import { useMemo } from "react";
import { DM_Sans } from "next/font/google";
import {
  summarizeOpportunityRows,
  type OpportunityRow,
} from "@/app/lib/opportunitiesCsv";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
});

function formatUsdCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
}

type RowProps = { label: string; value: string };

function StatRow({ label, value }: RowProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[rgba(249,249,249,0.08)] py-2.5 last:border-b-0 last:pb-0 first:pt-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[rgba(249,249,249,0.45)]">
        {label}
      </p>
      <p className="text-base font-medium leading-tight text-[#f9f9f9]">{value}</p>
    </div>
  );
}

type OpportunityCsvStatsPanelProps = {
  rows: OpportunityRow[];
};

/**
 * Live aggregates from `turtle-opportunities.csv`, pinned to the left and
 * vertically centered over the opportunities canvas.
 */
export function OpportunityCsvStatsPanel({ rows }: OpportunityCsvStatsPanelProps) {
  const summary = useMemo(() => summarizeOpportunityRows(rows), [rows]);

  return (
    <aside
      className={[
        "pointer-events-none absolute bottom-10 left-8 z-10 w-[min(calc(100vw-3rem),220px)]",
        dmSans.className,
      ].join(" ")}
      aria-label="Opportunity data from CSV"
    >
      {/* <div className="rounded-[20px] border border-[rgba(249,249,249,0.1)] bg-[#191a19] px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
        <StatRow
          label="Opportunities"
          value={summary.opportunityCount.toLocaleString("en-US")}
        />
        <StatRow label="Total TVL" value={formatUsdCompact(summary.totalTvlUsd)} />
        <StatRow
          label="Curators"
          value={summary.curatorCount.toLocaleString("en-US")}
        />
        <StatRow label="Chains" value={summary.chainCount.toLocaleString("en-US")} />
        <StatRow
          label="Featured"
          value={summary.featuredCount.toLocaleString("en-US")}
        />
        <StatRow
          label="Avg APR (featured)"
          value={
            summary.featuredCount > 0
              ? `${summary.featuredAvgAprPercent.toFixed(2)}%`
              : "—"
          }
        />
        <StatRow
          label="Avg APR (TVL-weighted)"
          value={`${summary.tvlWeightedAprPercent.toFixed(2)}%`}
        />
      </div> */}
    </aside>
  );
}
