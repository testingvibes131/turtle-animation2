import Image from "next/image";
import type { ReactNode } from "react";
import type { CommandCenterFeatureVisual } from "@/features/home/data/updates";
import { AlertsFeatureCanvas } from "@/features/home/components/AlertsFeatureCanvas";
import { CommandCenterFeatureCanvas } from "@/features/home/components/CommandCenterFeatureCanvas";
import { DealsFeatureCanvas } from "@/features/home/components/DealsFeatureCanvas";

type Props = {
  visual: CommandCenterFeatureVisual;
  image: string;
};

export function CommandCenterFeatureVisual({ visual, image }: Props) {
  let inner: ReactNode;

  switch (visual) {
    case "deals":
      inner = <DealsFeatureCanvas />;
      break;
    case "portfolio":
      inner = <CommandCenterFeatureCanvas />;
      break;
    case "alerts":
      inner = <AlertsFeatureCanvas />;
      break;
    default:
      inner = (
        <Image
          src={image}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 480px"
        />
      );
  }

  return <div className="absolute inset-0 size-full min-h-0">{inner}</div>;
}
