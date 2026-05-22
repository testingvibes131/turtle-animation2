export type CuratorDef = {
  name: string;
  opportunities: number;
  color: number;
  /** Optional fine-tune after auto content bounds (1 = default). */
  logoScale?: number;
};

export const CURATORS: CuratorDef[] = [
  { name: "Aave", opportunities: 12, color: 0x9896ff, logoScale: 1 },
  { name: "Curvance", opportunities: 8, color: 0x644aee },
  { name: "Euler", opportunities: 4, color: 0x2ae5b9 },
  { name: "YO", opportunities: 3, color: 0xccff00 },
  { name: "Lido", opportunities: 10, color: 0xffd3d3 },
  { name: "Morpho", opportunities: 5, color: 0x2973ff },
];

let nextCuratorIndex = 0;

/** Cycle curators in catalog order on each new hover (no random repeats). */
export function pickNextCurator(): CuratorDef {
  const curator = CURATORS[nextCuratorIndex] ?? CURATORS[0]!;
  nextCuratorIndex = (nextCuratorIndex + 1) % CURATORS.length;
  return curator;
}
