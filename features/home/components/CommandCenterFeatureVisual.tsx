import Image from "next/image";
import type { CommandCenterFeatureVisual } from "@/features/home/data/updates";
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
