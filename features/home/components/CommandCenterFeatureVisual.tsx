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
  switch (visual) {
    case "deals":
      // Diligenced Deals — glass ring + green diamond pulse
      return <AlertsFeatureCanvas />;
    case "portfolio":
      // Aggregated Portfolio — connector ring + flying turtle
      return <CommandCenterFeatureCanvas />;
    case "alerts":
      // Personalized Alerts — falloff grid, white glow, L→R row cascade
      return <PortfolioFeatureCanvas />;
    default:
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
}
