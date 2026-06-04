/**
 * Home hero copy (Figma node 1037:47030).
 * 20px from the left; anchored at one-third viewport height.
 */
export function HeroCopy() {
  return (
    <section
      className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-20 z-10 w-full max-w-[707px]"
      aria-labelledby="home-hero-heading"
    >
      <div className="flex w-full flex-col items-start gap-10">
        <h2
          id="home-hero-heading"
          className="w-full bg-clip-text pb-[0.05em] text-4xl font-normal leading-[1.2] tracking-[-0.8px] text-transparent text-gradient-heading"
        >
          For capital that&apos;s greedy about returns and paranoid about risk.
        </h2>

        <div className="w-full font-normal leading-[1.4] text-[rgba(255,255,255,0.5)]">
          <p>
            Earning serious yield without blowing up is a full-time job. The big
            funds have a desk for it: analysts vetting deals, traders negotiating
            terms, risk teams watching the clock.
          </p>
          <p className="mt-[1.4em]">Turtle gives you the same desk</p>
          <p className="mt-[1.4em]">
            Diligenced deals, preferential terms, continuous monitoring, pointed
            at your book.
          </p>
        </div>
      </div>
    </section>
  );
}
