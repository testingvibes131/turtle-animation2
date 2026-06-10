import {
  SectionIntro,
  SectionIntroCopy,
} from "@/components/layout/SectionIntro";

/** Section 2 copy (Figma 1037:47030) — in-flow layout over the blob backdrop. */
export function HeroCopy({ className = "" }: { className?: string }) {
  return (
    <SectionIntro
      width="none"
      /* Cap = viewport minus the blob's footprint (blob width tracks viewport
         HEIGHT via camera FOV; 84svh lets copy tuck into the sparse fringe)
         minus gutter/breathing — wraps before the dots on small windows,
         700px cap on large ones. */
      className={[
        "w-full lg:max-w-[clamp(20rem,calc(100vw_-_84svh_-_124px),700px)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
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
          terms, risk teams watching the clock. Turtle gives you the same desk.
        </p>
        <p>
          Diligenced deals, preferential terms, continuous monitoring, pointed
          at your book.
        </p>
      </SectionIntroCopy>
    </SectionIntro>
  );
}
