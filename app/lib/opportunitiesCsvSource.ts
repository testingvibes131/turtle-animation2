/**
 * Which opportunities CSV the scene loads from `/public/data/`.
 *
 * - `turtle-opportunities.csv` — API `estimatedApr` (legacy export)
 * - `turtle-opportunities-display.csv` — site card APR (display formula)
 */
export type OpportunitiesCsvVariant = "estimated" | "display";

export const OPPORTUNITIES_CSV_VARIANT: OpportunitiesCsvVariant = "display";

const PATH_BY_VARIANT: Record<OpportunitiesCsvVariant, string> = {
  estimated: "/data/turtle-opportunities.csv",
  display: "/data/turtle-opportunities-display.csv",
};

export function opportunitiesCsvPath(
  variant: OpportunitiesCsvVariant = OPPORTUNITIES_CSV_VARIANT,
): string {
  return PATH_BY_VARIANT[variant];
}
