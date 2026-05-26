export type CaseStudy = {
  id: string;
  logo: string;
  title: string;
};

export const caseStudies: CaseStudy[] = [
  {
    id: "avalanche",
    logo: "/case-studies/logo-avalanche.png",
    title: "Deploying $84.5M in Concentrated Liquidity for Avalanche",
  },
  {
    id: "katana",
    logo: "/case-studies/logo-katana.png",
    title: "Bootstrapping Katana Network to $45.5M",
  },
  {
    id: "decibel",
    logo: "/case-studies/logo-decibel.png",
    title: "Decibel Reaches $10M in first 24 Hours",
  },
];
