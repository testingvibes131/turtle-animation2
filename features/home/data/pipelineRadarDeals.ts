export type PipelineRadarDeal = {
  /** Index into `PIPELINE_RADAR_BLIPS` — card highlights when that blip is scanned. */
  blipIndex: number;
  label: string;
  /** Yield value without the APY suffix. */
  apy: string;
  protocol: {
    name: string;
    icon: string;
  };
  tvl: string;
  /** One to three token/network icons for the stacked cell. */
  tokens: string[];
};

/** Pipeline deal card assets — `public/pipeline/deals/`. */
export const pipelineDealIcons = {
  ausd: "/pipeline/deals/ausd.png",
  base: "/pipeline/deals/base.png",
  curvance: "/pipeline/deals/curvance.png",
  eth: "/pipeline/deals/eth.png",
  hype: "/pipeline/deals/hype.png",
  lido: "/pipeline/deals/lido.png",
  altura: "/pipeline/deals/altura.png",
  usdc: "/pipeline/deals/usdc.png",
  usdt: "/pipeline/deals/usdt.png",
  yo: "/pipeline/deals/yo.png",
} as const;

const { ausd, base, curvance, eth, hype, lido, altura, usdc, usdt, yo } =
  pipelineDealIcons;

export const pipelineRadarLeftDeals: PipelineRadarDeal[] = [
  {
    blipIndex: 5,
    label: "Lend AUS on earn AUSD/AUSD",
    apy: "8",
    protocol: { name: "Curvance", icon: curvance },
    tvl: "$5.07M",
    tokens: [ausd],
  },
  {
    blipIndex: 3,
    label: "Lido Earn USD",
    apy: "4.7",
    protocol: { name: "Lido", icon: lido },
    tvl: "$6.9M",
    tokens: [usdc, usdt],
  },
  {
    blipIndex: 4,
    label: "Felix Hype",
    apy: "4.5",
    protocol: { name: "Hyperliquid", icon: hype },
    tvl: "$48.53M",
    tokens: [hype],
  },
];

export const pipelineRadarRightDeals: PipelineRadarDeal[] = [
  {
    blipIndex: 1,
    label: "Aave V3 Ethereum USDC",
    apy: "3.3",
    protocol: { name: "-", icon: "/logos/Aave.png" },
    tvl: "$2.04B",
    tokens: [eth],
  },
  {
    blipIndex: 2,
    label: "Altura Vault",
    apy: "29.7",
    protocol: { name: "Altura", icon: altura },
    tvl: "$25.22M",
    tokens: [hype],
  },
  {
    blipIndex: 0,
    label: "YoUSD",
    apy: "15.4",
    protocol: { name: "yo", icon: yo },
    tvl: "$14.87M",
    tokens: [base],
  },
];
