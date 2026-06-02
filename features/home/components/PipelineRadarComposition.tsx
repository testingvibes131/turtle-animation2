"use client";

import { PipelineRadarCanvas } from "@/features/home/components/PipelineRadarCanvas";
import { PipelineRadarDealCard } from "@/features/home/components/PipelineRadarDealCard";
import { PipelineRadarScanContext } from "@/features/home/context/PipelineRadarScanContext";
import {
  pipelineRadarLeftDeals,
  pipelineRadarRightDeals,
} from "@/features/home/data/pipelineRadarDeals";
import { usePipelineBlipScan } from "@/features/home/hooks/usePipelineBlipScan";

export function PipelineRadarComposition() {
  const { scannedBlips, onBlipIntensities } = usePipelineBlipScan();

  return (
    <PipelineRadarScanContext.Provider value={scannedBlips}>
      <div className="pipeline-radar-composition mx-auto flex w-full max-w-[1280px] flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-7">
        <div className="hidden w-full min-w-0 flex-1 flex-col gap-4 lg:flex lg:items-end">
          {pipelineRadarLeftDeals.map((deal) => (
            <PipelineRadarDealCard key={deal.label} {...deal} />
          ))}
        </div>

        <div className="aspect-square w-full max-w-[530px] shrink-0">
          <PipelineRadarCanvas
            className="size-full max-w-none"
            onBlipIntensities={onBlipIntensities}
          />
        </div>

        <div className="hidden w-full min-w-0 flex-1 flex-col gap-4 lg:flex lg:items-start">
          {pipelineRadarRightDeals.map((deal) => (
            <PipelineRadarDealCard key={deal.label} {...deal} />
          ))}
        </div>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
          <div className="flex flex-col gap-4">
            {pipelineRadarLeftDeals.map((deal) => (
              <PipelineRadarDealCard key={deal.label} {...deal} />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {pipelineRadarRightDeals.map((deal) => (
              <PipelineRadarDealCard key={deal.label} {...deal} />
            ))}
          </div>
        </div>
      </div>
    </PipelineRadarScanContext.Provider>
  );
}
