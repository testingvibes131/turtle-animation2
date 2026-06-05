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
    photo: teamPhoto("image 4.png"),
  },
  {
    id: "tim",
    name: "Tim",
    role: "CMO",
    photo: teamPhoto("Niek Turtle.png"),
  },
  {
    id: "waseem",
    name: "Waseem",
    role: "COO",
    photo: teamPhoto("image 6.png"),
  },
  {
    id: "kunz",
    name: "Kunz",
    role: "Head of BD",
    photo: teamPhoto("image 5.png"),
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
    photo: teamPhoto("Felix Turtle.png"),
  },
  {
    id: "pedro",
    name: "Pedro",
    role: "Head of Marketing",
    photo: teamPhoto("Pedro Turtle.png"),
  },
];

export const TEAM_VIEW_ALL_HREF = "#";
