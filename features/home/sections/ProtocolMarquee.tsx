import { DashedRule } from "@/components/ui/DashedRule";
import { LogoMarquee } from "@/components/ui/LogoMarquee";
import { protocolLogos } from "@/features/home/data/protocolLogos";

export function ProtocolMarquee() {
  return (
    <section className="relative mx-auto w-full max-w-[1728px]">
      <DashedRule />
      <div className="py-[clamp(20px,2.4vw,36px)]">
        <LogoMarquee logos={protocolLogos} />
      </div>
      <DashedRule />
    </section>
  );
}
