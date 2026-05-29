import type { LogoMarqueeItem } from "@/components/ui/LogoMarquee";

/** Public folder paths; filenames are URL-encoded for spaces. */
function marqueeLogo(
  filename: string,
  alt: string,
  width: number,
  height: number,
): LogoMarqueeItem {
  return {
    src: `/logos-marquee/${encodeURIComponent(filename)}`,
    alt,
    width,
    height,
  };
}

/** Matches files in `public/logos-marquee/`. */
export const protocolLogos: LogoMarqueeItem[] = [
  marqueeLogo("Base Logo.svg", "Base", 94, 24),
  marqueeLogo("Linea Logo.svg", "Linea", 79, 23),
  marqueeLogo("Katana Logo.svg", "Katana", 152, 43),
  marqueeLogo("avalanche-avax-seeklogo 1.svg", "Avalanche", 193, 41),
  marqueeLogo("Polygon_Logo 1.svg", "Polygon", 145, 40),
  marqueeLogo("Scroll 1.svg", "Scroll", 121, 39),
  marqueeLogo("ether 1.svg", "Ethereum", 109, 37),
  marqueeLogo("Euler Logo.svg", "Euler", 93, 23),
  marqueeLogo("Morpho Logo.svg", "Morpho", 149, 30),
  marqueeLogo("Lido 1.svg", "Lido", 128, 31),
  marqueeLogo("Kelp 1.svg", "Kelp", 106, 37),
  marqueeLogo("Renzo 1.svg", "Renzo", 111, 23),
  marqueeLogo("Merkl-logo-dark-theme 1.svg", "Merkl", 86, 24),
  marqueeLogo("Lighter 1.svg", "Lighter", 111, 37),
  marqueeLogo("Decibel 1.svg", "Decibel", 121, 35),
  marqueeLogo("Logo 1 10.svg", "Partner", 134, 27),
];
