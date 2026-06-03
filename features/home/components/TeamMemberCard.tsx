import Image from "next/image";
import type { TeamMember } from "@/features/home/data/teamMembers";
import { TEAM_CARD } from "@/features/home/data/teamCardLayout";

type Props = {
  member: TeamMember;
};

/** Figma Card-Member (1358:27910). */
export function TeamMemberCard({ member }: Props) {
  return (
    <article className="team-card">
      <div className="team-card__copy">
        <p className="team-card__name">{member.name}</p>
        <p className="team-card__role">{member.role}</p>
      </div>
      <Image
        src={member.photo}
        alt=""
        width={TEAM_CARD.avatarWidth}
        height={TEAM_CARD.avatarHeight}
        className="team-card__avatar"
        sizes="(max-width: 1024px) 33vw, 129px"
      />
    </article>
  );
}
