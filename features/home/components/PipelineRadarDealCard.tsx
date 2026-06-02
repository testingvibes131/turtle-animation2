"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { usePipelineRadarScan } from "@/features/home/context/PipelineRadarScanContext";
import type { PipelineRadarDeal } from "@/features/home/data/pipelineRadarDeals";

type Props = PipelineRadarDeal & {
  className?: string;
};

const shellClass =
  "pipeline-radar-deal-card w-full max-w-[348px] rounded-[20px] border border-[rgba(249,249,249,0.1)] bg-gradient-to-b from-[#141514] to-[#191919] px-5 py-[22px] outline-none transition-[border-color,box-shadow,background] duration-300 focus-visible:border-[rgba(115,243,108,0.35)] focus-visible:shadow-[0_0_0_1px_rgba(115,243,108,0.2)]";

/**
 * Figma Deal Card (1323:37198) — closed Default (1400:113468) → open Hover (1295:27885).
 */
export function PipelineRadarDealCard({
  blipIndex,
  label,
  apy,
  protocol,
  tvl,
  tokens,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const scannedBlips = usePipelineRadarScan();
  const isScanned = scannedBlips[blipIndex] === true;

  const openCard = useCallback(() => setOpen(true), []);
  const closeCard = useCallback(() => setOpen(false), []);

  return (
    <article
      className={[shellClass, className].filter(Boolean).join(" ")}
      data-state={open ? "open" : "closed"}
      data-scanned={isScanned ? "true" : "false"}
      tabIndex={0}
      onMouseEnter={openCard}
      onMouseLeave={closeCard}
      onFocus={openCard}
      onBlur={closeCard}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen((current) => !current);
        }
      }}
      aria-expanded={open}
    >
      <div className="flex w-full flex-col">
        <DealCardHeader label={label} apy={apy} />

        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="pt-4">
              <DealCardDetails
                protocol={protocol}
                tvl={tvl}
                tokens={tokens}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function DealCardHeader({ label, apy }: { label: string; apy: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <p className="min-w-0 truncate text-[14px] font-light leading-[1.4] text-ink-primary">
        {label}
      </p>
      <div className="flex shrink-0 items-start gap-1">
        <span className="text-[14px] font-light leading-[1.4] text-brand-primary">
          {apy.endsWith("%") ? apy : `${apy}%`}
        </span>
        <span className="flex h-[18px] w-[19px] items-center text-[10px] font-light leading-[1.6] text-ink-subtle">
          APY
        </span>
      </div>
    </div>
  );
}

function DealCardDetails({
  protocol,
  tvl,
  tokens,
}: Pick<PipelineRadarDeal, "protocol" | "tvl" | "tokens">) {
  return (
    <div className="flex w-full items-center gap-[30px]">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        {protocol.name !== "—" && protocol.name !== "-" ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <Image
              src={protocol.icon}
              alt=""
              width={18}
              height={18}
              className="size-[18px] shrink-0 rounded-full object-cover"
            />
            <span className="truncate text-[12px] font-normal leading-none text-ink-primary">
              {protocol.name}
            </span>
          </div>
        ) : (
          <span aria-hidden className="size-[18px] shrink-0" />
        )}

        <div className="flex shrink-0 items-end gap-1">
          <span className="text-[12px] font-normal leading-none text-ink-primary">
            {tvl}
          </span>
          <span className="flex h-[11px] w-[18px] items-center text-[10px] font-light leading-[1.6] text-ink-subtle">
            TVL
          </span>
        </div>

        <TokenIconStack tokens={tokens} />
      </div>

      <Image
        src="/pipeline/deals/chevron-right.svg"
        alt=""
        width={8}
        height={12}
        className="h-3 w-2 shrink-0"
        aria-hidden
      />
    </div>
  );
}

function TokenIconStack({ tokens }: { tokens: string[] }) {
  if (tokens.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center px-[3.5px]">
      {tokens.map((token, index) => (
        <div
          key={`${token}-${index}`}
          className={[
            "relative size-4 shrink-0 overflow-hidden rounded-xl border border-[rgba(249,249,249,0.1)]",
            index > 0 ? "-ml-1.5" : "",
          ].join(" ")}
        >
          <Image
            src={token}
            alt=""
            width={16}
            height={16}
            className="size-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
