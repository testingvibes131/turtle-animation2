import Image from "next/image";

export type LogoMarqueeItem = {
  src: string;
  alt: string;
  tall?: boolean;
};

type LogoMarqueeProps = {
  logos: LogoMarqueeItem[];
  repeats?: number;
};

export function LogoMarquee({ logos, repeats = 4 }: LogoMarqueeProps) {
  const track = Array.from({ length: repeats }, (_, setIndex) =>
    logos.map((logo, logoIndex) => ({
      ...logo,
      key: `${setIndex}-${logoIndex}`,
      hidden: setIndex > 0,
    })),
  ).flat();

  return (
    <div className="logo-marquee">
      <div className="logo-marquee__track">
        {track.map((logo) => (
          <Image
            key={logo.key}
            src={logo.src}
            alt={logo.hidden ? "" : logo.alt}
            width={120}
            height={logo.tall ? 30 : 18}
            className={["logo", logo.tall ? "logo--tall" : ""].join(" ")}
            aria-hidden={logo.hidden}
          />
        ))}
      </div>
    </div>
  );
}
