import Image from "next/image";
import type { CommandCenterFeatureVisual } from "@/features/home/data/updates";
import { AlertsFeatureCanvas } from "@/features/home/components/AlertsFeatureCanvas";
import { CommandCenterFeatureCanvas } from "@/features/home/components/CommandCenterFeatureCanvas";
import { PortfolioFeatureCanvas } from "@/features/home/components/PortfolioFeatureCanvas";

type Props = {
  visual: CommandCenterFeatureVisual;
  image: string;
};

export function CommandCenterFeatureVisual({ visual, image }: Props) {
  if (visual === "portfolio") {
    return <PortfolioFeatureCanvas />;
  }

  if (visual === "deals") {
    return <CommandCenterFeatureCanvas />;
  }

  if (visual === "alerts") {
    return <AlertsFeatureCanvas />;
  }

  return (
    <Image
      src={image}
      alt=""
      fill
      className="object-cover"
      sizes="(max-width: 1024px) 100vw, 480px"
    />
  );
}
