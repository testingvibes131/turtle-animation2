import type { LogoMarqueeItem } from "@/components/ui/LogoMarquee";

/** Public folder paths; filenames are URL-encoded for spaces. */
function marqueeLogo(
  filename: string,
  alt: string,
  width: number,
  height: number,
): LogoMarqueeItem {
  return {
    src: `/logos-first-marquee/${encodeURIComponent(filename)}`,
    alt,
    width,
    height,
  };
}

/** Matches PNG files in `public/logos-first-marquee/`. */
export const protocolLogos: LogoMarqueeItem[] = [
  marqueeLogo("Base Logo.png", "Base", 94, 24),
  marqueeLogo("Linea Logo.png", "Linea", 79, 23),
  marqueeLogo("Katana Logo.png", "Katana", 152, 43),
  marqueeLogo("avalanche-avax-seeklogo 1.png", "Avalanche", 193, 41),
  marqueeLogo("Polygon_Logo 1.png", "Polygon", 145, 40),
  marqueeLogo("Scroll 1.png", "Scroll", 121, 39),
  marqueeLogo("ether 1.png", "Ethereum", 109, 37),
  marqueeLogo("Euler Logo.png", "Euler", 93, 23),
  marqueeLogo("Morpho Logo.png", "Morpho", 149, 30),
  marqueeLogo("Lido 1.png", "Lido", 128, 31),
  marqueeLogo("Kelp 1.png", "Kelp", 106, 37),
  marqueeLogo("Renzo 1.png", "Renzo", 111, 23),
  marqueeLogo("Merkl-logo-dark-theme 1.png", "Merkl", 86, 24),
  marqueeLogo("Lighter 1.png", "Lighter", 111, 37),
  marqueeLogo("Decibel 1.png", "Decibel", 121, 35),
  marqueeLogo("Logo 1 10.png", "Partner", 134, 27),
  marqueeLogo("Group 2085664997.png", "Arbitrum", 161, 41),
  marqueeLogo("Group 2085664998.png", "Veda", 104, 31),
  marqueeLogo("Group 2085664999.png", "Swell", 99, 39),
  marqueeLogo("Group 2085665000.png", "Usual", 154, 24),
];
