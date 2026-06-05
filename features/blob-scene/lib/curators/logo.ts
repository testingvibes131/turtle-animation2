/** PNG basename under `/logos/` (public/logos). */
const LOGO_FILE: Record<string, string> = {
  Aave: "Aave",
  Curvance: "Curvance",
  Euler: "Euler",
  YO: "Yo",
  Lido: "Lido",
  Morpho: "Morpho",
};

export function curatorLogoPath(curatorName: string): string {
  const file = LOGO_FILE[curatorName] ?? curatorName;
  return `/logos/${file}.png`;
}

export const CURATOR_LOGO_PATHS = Object.values(LOGO_FILE).map(
  (file) => `/logos/${file}.png`,
);
