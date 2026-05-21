import Link from "next/link";

export function HeroSection() {
  return (
    <section
      className="pointer-events-none absolute inset-10 z-10 flex flex-col items-center justify-start px-6 pt-[clamp(5.25rem,12vh,9rem)]"
      aria-labelledby="hero-heading"
    >
      <div className="pointer-events-auto flex flex-col items-center gap-10">
        <h1
          id="hero-heading"
          className="bg-gradient-to-r from-[#f9f9f9] to-[#8d928c] bg-clip-text text-center text-5xl font-medium capitalize leading-[1.2] tracking-[-0.48px] text-transparent"
        >
          <span className="block whitespace-pre-wrap">
            The trusted dealflow layer for{" "}
          </span>
          <span className="block whitespace-pre-wrap">
            Internet capital markets
          </span>
        </h1>

        <div className="flex h-10 w-full max-w-[441px] gap-2.5">
          <Link
            href="https://app.turtle.xyz"
            className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-[1000px] border border-[rgba(249,249,249,0.1)] px-2 text-center text-sm leading-5 font-medium text-[#f9f9f9] bg-[#1E1E1E] transition-colors hover:bg-[rgba(249,249,249,0.06)]"
          >
            Explore Deals
          </Link>
          <Link
            href="https://turtle.xyz"
            className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-[1000px] bg-[#343434] px-2 text-center text-sm leading-5 font-medium text-[#73f36c] transition-colors hover:bg-[#444444]"
          >
            Launch with Turtle
          </Link>
        </div>
      </div>
    </section>
  );
}
