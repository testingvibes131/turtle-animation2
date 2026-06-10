import Image from "next/image";
import type { TeamMember } from "@/features/home/data/teamMembers";

type Props = {
  member: TeamMember;
};

/** Figma Card-Member desktop (1358:27910), mobile (1385:44826). */
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
          width={384}
          height={384}
          className="team-card__avatar"
          sizes="384px"
        />
      </div>
    </article>
  );
}
