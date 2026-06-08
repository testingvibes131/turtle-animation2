export type TeamMember = {
  id: string;
  name: string;
  role: string;
  photo: string;
};

function teamPhoto(filename: string) {
  return `/team/${encodeURIComponent(filename)}`;
}

export const teamMembers: TeamMember[] = [
  {
    id: "essi",
    name: "Essi",
    role: "Founder & CEO",
    photo: teamPhoto("Essi Turtle.png"),
  },
  {
    id: "nick",
    name: "Nick",
    role: "Co-Founder & CTO",
    photo: teamPhoto("Nick Turtle.png"),
  },
  {
    id: "tim",
    name: "Tim",
    role: "CMO",
    photo: teamPhoto("Tim Turtle.png"),
  },
  {
    id: "waseem",
    name: "Waseem",
    role: "COO",
    photo: teamPhoto("Waseem Turtle.png"),
  },
  {
    id: "kunz",
    name: "Kunz",
    role: "Head of BD",
    photo: teamPhoto("Kunz Turtle.png"),
  },
  {
    id: "duncan",
    name: "Duncan",
    role: "Head of Product",
    photo: teamPhoto("Duncan Turtle.png"),
  },
  {
    id: "nicolai",
    name: "Nicolai",
    role: "Head of Liquidity Desk",
    photo: teamPhoto("Nicolai Turtle.png"),
  },
  {
    id: "pedro",
    name: "Pedro",
    role: "Head of Marketing",
    photo: teamPhoto("Pedro Turtle.png"),
  },
];

export const TEAM_VIEW_ALL_HREF = "#";
