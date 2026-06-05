import { SectionIntro } from "@/components/layout/SectionIntro";
import { SectionShell } from "@/components/layout/SectionShell";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { TeamMemberCard } from "@/features/home/components/TeamMemberCard";
import { teamMembers } from "@/features/home/data/teamMembers";

export function Team() {
  return (
    <SectionShell>
      <div className="grid grid-cols-1 items-start gap-[clamp(40px,5vw,64px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,954px)] lg:items-center lg:gap-x-[clamp(32px,4vw,60px)]">
        <RevealOnScroll className="text-left lg:sticky lg:top-[clamp(80px,10vh,120px)]">
          <SectionIntro className="items-start">
            <h2 className="text-section-title bg-clip-text pb-[0.05em] font-normal text-transparent text-gradient-heading">
              The Turtle Team
            </h2>
            <p>
              Founder-led with experienced operators across every critical
              function
            </p>
          </SectionIntro>
        </RevealOnScroll>

        <RevealOnScroll>
          <ul className="team-grid">
            {teamMembers.map((member) => (
              <li key={member.id}>
                <TeamMemberCard member={member} />
              </li>
            ))}
            <li className="team-grid__cta">
              <span className="team-grid__cta-link">
                And many more...
              </span>
            </li>
          </ul>
        </RevealOnScroll>
      </div>
    </SectionShell>
  );
}
