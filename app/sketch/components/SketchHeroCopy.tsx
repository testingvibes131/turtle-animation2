/**
 * Sketch intro copy (Figma node 1037:47030).
 * 20px from the left; anchored at one-third viewport height.
 */
export function SketchHeroCopy() {
  return (
    <section
      className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-20 z-10 w-full max-w-[707px]"
      aria-labelledby="sketch-intro-heading"
    >
      <div className="flex w-full flex-col items-start gap-10">
        <h2
          id="sketch-intro-heading"
          className="w-full bg-gradient-to-r from-[#f9f9f9] to-[#8d928c] bg-clip-text text-[50px] font-normal leading-[1.2] tracking-[-0.4px] text-transparent"
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
