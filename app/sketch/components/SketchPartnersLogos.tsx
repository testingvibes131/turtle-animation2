import Image from "next/image";

/**
 * Partner logo strip (Figma node 1065:57594 — Partners-Logos).
 * Full-width row pinned to the bottom of the viewport.
 */
export function SketchPartnersLogos() {
  return (
    <section
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center"
      aria-label="Partner protocols"
    >
      <Image
        src="/sketch/partners-logos.png"
        alt=""
        width={1718}
        height={123}
        className="h-auto w-full max-w-[1718px] object-contain object-bottom px-2.5 sm:px-[60px]"
        sizes="100vw"
      />
    </section>
  );
}
