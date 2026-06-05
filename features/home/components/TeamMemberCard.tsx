import Image from "next/image";
import type { TeamMember } from "@/features/home/data/teamMembers";

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
      <div className="team-card__avatar-wrap">
        <Image
          src={member.photo}
          alt=""
          fill
          className="team-card__avatar"
          sizes="(max-width: 640px) 42vw, (max-width: 1280px) 21vw, 129px"
        />
      </div>
    </article>
  );
}
