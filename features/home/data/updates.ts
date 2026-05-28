export type UpdateArticle = {
  id: string;
  image: string;
  title: string;
  description: string;
  href: string;
  ariaLabel: string;
};

export const updates: UpdateArticle[] = [
  {
    id: "merkl-logo",
    image: "/updates/article-01-merkl-logo.png",
    title: "Merkl Alternative: When You Need More Than Incentive Distribution",
    description: "The capital structure, utility roadmap, and thesis behind $TURTLE",
    href: "#",
    ariaLabel: "Read article: Merkl Alternative",
  },
  {
    id: "mercenary-chart",
    image: "/updates/article-02-mercenary-chart.png",
    title: "Merkl Alternative: When You Need More Than Incentive Distribution",
    description: "The capital structure, utility roadmap, and thesis behind $TURTLE",
    href: "#",
    ariaLabel: "Read article: Mercenary Capital",
  },
  {
    id: "turtle-radar",
    image: "/updates/article-03-turtle-radar.png",
    title: "Merkl Alternative: When You Need More Than Incentive Distribution",
    description: "The capital structure, utility roadmap, and thesis behind $TURTLE",
    href: "#",
    ariaLabel: "Read article: Turtle",
  },
  {
    id: "merkl-vs-royco",
    image: "/updates/article-04-merkl-vs-royco-turtle.png",
    title: "Merkl Alternative: When You Need More Than Incentive Distribution",
    description: "The capital structure, utility roadmap, and thesis behind $TURTLE",
    href: "#",
    ariaLabel: "Read article: Merkl vs Royco vs Turtle",
  },
];

export type CommandCenterFeatureVisual = "deals" | "portfolio" | "alerts";

export type CommandCenterFeature = {
  image: string;
  title: string;
  description: string;
  visual: CommandCenterFeatureVisual;
};

export const commandCenterFeatures: CommandCenterFeature[] = [
  {
    image: "/cards/deals.png",
    visual: "deals",
    title: "Diligenced Deals",
    description:
      "Access selected on-chain yield backed by Turtle review, clear mechanics, and transparent incentive terms.",
  },
  {
    image: "/cards/portfolio.png",
    visual: "portfolio",
    title: "Aggregated Portfolio",
    description:
      "Bundle your wallets across DeFi to evaluate positions, discover idle assets, and optimize your portfolio.",
  },
  {
    image: "/cards/alerts.png",
    visual: "alerts",
    title: "Personalized Alerts",
    description:
      "Get pinged when a new deal fits your book and stay on top of the ones you're already in, so you can manage risk instead of refreshing dashboards.",
  },
];
