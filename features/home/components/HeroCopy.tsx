import {
  SectionIntro,
  SectionIntroCopy,
} from "@/components/layout/SectionIntro";

/** Section 2 copy (Figma 1037:47030) — in-flow layout over the blob backdrop. */
export function HeroCopy({ className = "" }: { className?: string }) {
  return (
    <SectionIntro
      width="none"
      className={["w-full lg:max-w-[700px]", className].filter(Boolean).join(" ")}
      aria-labelledby="home-hero-heading"
    >
      <h2
        id="home-hero-heading"
        className="text-section-title w-full bg-clip-text pb-[0.05em] font-normal text-transparent text-gradient-heading"
      >
        For capital that&apos;s greedy about returns and paranoid about risk.
      </h2>

      <SectionIntroCopy className="w-full font-normal">
        <p>
          Earning serious yield without blowing up is a full-time job. The big
          funds have a desk for it: analysts vetting deals, traders negotiating
          terms, risk teams watching the clock.
        </p>
        <p>Turtle gives you the same desk</p>
        <p>
          Diligenced deals, preferential terms, continuous monitoring, pointed
          at your book.
        </p>
      </SectionIntroCopy>
    </SectionIntro>
  );
}
