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
      // Diligenced Deals — composition 3 (glass zone + green diamond)
      return <AlertsFeatureCanvas />;
    case "portfolio":
      // Aggregated Portfolio — composition 1 (connector ring + flying turtle)
      return <CommandCenterFeatureCanvas />;
    case "alerts":
      // Personalized Alerts — composition 2 (spine + triangle + turtle)
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
