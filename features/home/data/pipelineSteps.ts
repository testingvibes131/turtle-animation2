export type PipelineStep = {
  title: string;
  body: string;
  /** Step illustration — `public/pipeline/{StepName}.png`. */
  image: string;
};

export const pipelineSteps: PipelineStep[] = [
  {
    title: "Discover",
    body: "Find opportunities across protocols, vaults, ecosystems, and emerging on-chain markets.",
    image: "/pipeline/Discover.png",
  },
  {
    title: "Analyze",
    body: "Vet every deal against on-chain history, mechanics, and counterparty risk before you commit.",
    image: "/pipeline/Analyze.png",
  },
  {
    title: "Invest",
    body: "Deploy capital through Turtle's diligenced routes with preferential terms baked in.",
    image: "/pipeline/Invest.png",
  },
  {
    title: "Monitor",
    body: "Track every position across chains with continuous health checks and alerts you can trust.",
    image: "/pipeline/Monitor.png",
  },
  {
    title: "Manage",
    body: "Rebalance, exit, and roll positions from one trustless command center pointed at your book.",
    image: "/pipeline/Manage.png",
  },
];
