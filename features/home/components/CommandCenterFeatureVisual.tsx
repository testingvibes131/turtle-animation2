"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { CommandCenterFeatureVisual } from "@/features/home/data/updates";
import { AlertsFeatureCanvas } from "@/features/home/components/AlertsFeatureCanvas";
import { CommandCenterFeatureCanvas } from "@/features/home/components/CommandCenterFeatureCanvas";
import {
  commandCenterVisualFrameCanvasClass,
  commandCenterVisualFrameInnerClass,
} from "@/features/home/components/commandCenterVisualFrame";
import { DealsFeatureCanvas } from "@/features/home/components/DealsFeatureCanvas";

type Props = {
  visual: CommandCenterFeatureVisual;
  image: string;
  frameClassName: string;
};

export function CommandCenterFeatureVisual({
  visual,
  image,
  frameClassName,
}: Props) {
  let inner: ReactNode;

  switch (visual) {
    case "deals":
      inner = <DealsFeatureCanvas frameClassName={frameClassName} />;
      break;
    case "portfolio":
      inner = <CommandCenterFeatureCanvas frameClassName={frameClassName} />;
      break;
    case "alerts":
      inner = <AlertsFeatureCanvas frameClassName={frameClassName} />;
      break;
    default:
      inner = (
        <div className={frameClassName}>
          <div className={commandCenterVisualFrameInnerClass}>
            <Image
              src={image}
              alt=""
              fill
              className={`col-start-1 row-start-1 object-cover ${commandCenterVisualFrameCanvasClass}`}
              sizes="(max-width: 1024px) 100vw, 480px"
            />
          </div>
        </div>
      );
  }

  return inner;
}
