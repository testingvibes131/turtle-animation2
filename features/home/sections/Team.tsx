import Link from "next/link";
import { SectionShell } from "@/components/layout/SectionShell";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { TeamMemberCard } from "@/features/home/components/TeamMemberCard";
import { TEAM_VIEW_ALL_HREF, teamMembers } from "@/features/home/data/teamMembers";

export function Team() {
  return (
    <SectionShell>
      <div className="grid grid-cols-1 items-start gap-[clamp(40px,5vw,64px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,954px)] lg:items-center lg:gap-x-[clamp(32px,4vw,60px)]">
        <RevealOnScroll className="flex w-full max-w-[36rem] flex-col items-start gap-[clamp(16px,1.8vw,28px)] text-left lg:sticky lg:top-[clamp(80px,10vh,120px)]">
          <h2 className="bg-clip-text pb-[0.05em] text-4xl font-normal leading-[1.2] tracking-[-0.8px] text-transparent text-gradient-heading">
            The Turtle Team
          </h2>
          <p className="text-[clamp(15px,1.3vw,19px)] leading-[1.4] text-ink-subtle">
            Founder-led with experienced operators across every critical function
          </p>
        </RevealOnScroll>

        <RevealOnScroll>
          <ul className="team-grid">
            {teamMembers.map((member) => (
              <li key={member.id}>
                <TeamMemberCard member={member} />
              </li>
            ))}
            <li className="team-grid__cta">
              <Link href={TEAM_VIEW_ALL_HREF} className="team-grid__cta-link">
                View the Full Team
              </Link>
            </li>
          </ul>
        </RevealOnScroll>
      </div>
    </SectionShell>
  );
}
