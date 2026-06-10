export type CaseStudyTvl = {
  target: number;
  prefix: string;
  suffix: string;
  display: string;
  label: string;
};

export type CaseStudyAprBadge = {
  src: string;
  label: string;
  apy: number;
  /** Stroke / gradient color for the matching boosted-chart bar. */
  chartColor: string;
};

export function sortAprBadgesByApy(badges: CaseStudyAprBadge[]): CaseStudyAprBadge[] {
  return [...badges].sort((a, b) => a.apy - b.apy);
}

export type CaseStudyBoosted =
  | {
      kind: "counter";
      target: number;
      prefix: string;
      suffix: string;
      display: string;
      label: string;
      badges: CaseStudyAprBadge[];
    }
  | {
      kind: "range";
      min: number;
      max: number;
      minDecimals: number;
      maxDecimals: number;
      suffix: string;
      display: string;
      label: string;
      badges: CaseStudyAprBadge[];
    };

export type CaseStudyApplication = {
  logo: string;
  name: string;
  category: string;
};

export type CaseStudyThirdCard =
  | {
      kind: "quote";
      text: string;
      /** Shorter copy shown below `lg` when the full quote does not fit. */
      mobileText?: string;
      authorName: string;
      authorRole: string;
      /** When omitted, the quote card shows attribution only (no avatar). */
      avatarSrc?: string;
    }
  | {
      kind: "applications";
      applications: CaseStudyApplication[];
      footerLines: [string, string];
    }
  | {
      kind: "empty";
    };

export type CaseStudy = {
  id: string;
  logo: string;
  title: string;
  /** Optional shorter title shown on mobile (e.g. drop a lead word to fit one line). */
  mobileTitle?: string;
  tvl: CaseStudyTvl;
  boosted: CaseStudyBoosted;
  thirdCard: CaseStudyThirdCard;
};

export const caseStudies: CaseStudy[] = [
  {
    id: "avalanche",
    logo: "/case-studies/logo-avalanche.png",
    title: "Deploying $84.5M in Liquidity for Avalanche",
    mobileTitle: "$84.5M in Liquidity for Avalanche",
    tvl: {
      target: 50,
      prefix: "$",
      suffix: "M",
      display: "$50M",
      label: "TVL within 48hrs",
    },
    boosted: {
      kind: "counter",
      target: 84.5,
      prefix: "$",
      suffix: "M",
      display: "$84.5M",
      label: "Boosted TVL",
      badges: [
        { src: "/case-studies/asset-btc.png", label: "9% APR", apy: 9, chartColor: "#f59e0b" },
        { src: "/case-studies/asset-avalanche.png", label: "10% APR", apy: 10, chartColor: "#ef4444" },
        { src: "/case-studies/asset-usdc.png", label: "18% APR", apy: 18, chartColor: "#3b82f6" },
      ],
    },
    thirdCard: {
      kind: "quote",
      text: "Turtle has been a strong partner for Avalanche DeFi, helping attract and retain high-quality liquidity on the chain. Their vaults specialized in risk-screened yield opportunities for LPs while increasing participation across key Avalanche protocols, contributing to growth in asset flows and protocol adoption across the ecosystem.",
      mobileText:
        "Turtle has been a strong partner for Avalanche DeFi, helping attract and retain high-quality liquidity on the chain.",
      authorName: "Matt Schmenk",
      authorRole: "Business Development & Growth",
    },
  },
  {
    id: "katana",
    logo: "/case-studies/logo-katana.png",
    title: "Bootstrapping Katana Network to $500M",
    tvl: {
      target: 500,
      prefix: "$",
      suffix: "M",
      display: "$500M",
      label: "In Liquidity to Katana's DeFi Ecosystem",
    },
    boosted: {
      kind: "range",
      min: 8,
      max: 42.6,
      minDecimals: 0,
      maxDecimals: 1,
      suffix: "% APY",
      display: "8-42.6% APY",
      label: "Across four primary vaults",
      badges: [
        { src: "/case-studies/asset-eth.png", label: "8% APY", apy: 8, chartColor: "#627eea" },
        { src: "/case-studies/asset-btc.png", label: "18% APY", apy: 18, chartColor: "#f59e0b" },
        { src: "/case-studies/asset-usdc.png", label: "42.6% APY", apy: 42.6, chartColor: "#3b82f6" },
        { src: "/case-studies/asset-usdt.png", label: "42.6% APY", apy: 42.6, chartColor: "#22c55e" },
      ],
    },
    thirdCard: {
      kind: "applications",
      applications: [
        {
          logo: "/case-studies/app-morpho.png",
          name: "Morpho",
          category: "Lending",
        },
        {
          logo: "/case-studies/app-sushi.png",
          name: "Sushi",
          category: "Spot Liquidity",
        },
        {
          logo: "/case-studies/app-vertex.png",
          name: "Vertex",
          category: "Perpetual Futures",
        },
      ],
      footerLines: ["Core Applications", "Activated"],
    },
  },
  {
    id: "decibel",
    logo: "/case-studies/logo-decibel.png",
    title: "Reaching $10M in 24 Hours for Decibel",
    tvl: {
      target: 10,
      prefix: "$",
      suffix: "M",
      display: "$800M",
      label: "Deployed within 24hrs",
    },
    boosted: {
      kind: "range",
      min: 19,
      max: 28.2,
      minDecimals: 0,
      maxDecimals: 1,
      suffix: "% APY",
      display: "19-28.2% APY",
      label: "Across key assets",
      badges: [
        { src: "/case-studies/asset-eth.png", label: "19.0% APR", apy: 19, chartColor: "#627eea" },
        { src: "/case-studies/asset-btc.png", label: "21.0% APR", apy: 21, chartColor: "#f59e0b" },
        { src: "/case-studies/asset-stables.png", label: "28.0% APR", apy: 28, chartColor: "#00FF8B" },
      ],
    },
    thirdCard: {
      kind: "quote",
      text: "Working with Turtle Club was a great experience from start to finish. Their team was professional throughout, with clear communication, seamless onboarding, and consistently timely responses. For Decibel, Turtle Club has been a trusted partner in building credibility with LPs, and an efficient platform for bootstrapping liquidity. We'd recommend them to any team in the same position.",
      mobileText:
        "Working with Turtle Club was a great experience from start to finish. For Decibel, Turtle Club has been a trusted partner in building credibility with LPs, and an efficient platform for bootstrapping liquidity.",
      authorName: "Sophia Fang",
      authorRole: "BD Lead at Decibel",
    },
  },
];
