export type LogoMarqueeItem = {
  src: string;
  alt: string;
  /** Intrinsic pixel width from the asset (used for aspect ratio). */
  width: number;
  /** Intrinsic pixel height from the asset (display height is derived from this). */
  height: number;
};

type LogoMarqueeProps = {
  logos: LogoMarqueeItem[];
  /** Duplicate the logo set for a seamless -50% scroll loop (must be ≥ 2). */
  repeats?: number;
};

/** Seconds of animation per item; shared by protocol and partner marquees. */
export const MARQUEE_ITEM_SEC = 3.5;
export const MARQUEE_MIN_DURATION_SEC = 48;

/** Half-loop duration for a -50% scroll keyframe (see `setsPerHalfLoop`). */
export function marqueeDurationSec(
  itemCount: number,
  setsPerHalfLoop = 1,
): number {
  return Math.max(
    MARQUEE_MIN_DURATION_SEC,
    itemCount * MARQUEE_ITEM_SEC * setsPerHalfLoop,
  );
}
/** Maps intrinsic SVG height to a display height in the marquee row. */
function marqueeDisplayHeight(intrinsicHeight: number): number {
  const referenceHeight = 23;
  const baseDisplayPx = 18;
  const minDisplayPx = 14;
  const maxDisplayPx = 30;

  return Math.round(
    Math.min(
      maxDisplayPx,
      Math.max(
        minDisplayPx,
        (intrinsicHeight / referenceHeight) * baseDisplayPx,
      ),
    ),
  );
}

export function LogoMarquee({ logos, repeats = 2 }: LogoMarqueeProps) {
  const loopRepeats = Math.max(2, repeats);
  const durationSec = marqueeDurationSec(logos.length);

  const track = Array.from({ length: loopRepeats }, (_, setIndex) =>
    logos.map((logo, logoIndex) => ({
      ...logo,
      key: `${setIndex}-${logoIndex}`,
      hidden: setIndex > 0,
      displayHeight: marqueeDisplayHeight(logo.height),
    })),
  ).flat();

  return (
    <div className="logo-marquee">
      <div
        className="logo-marquee__track"
        style={{ animationDuration: `${durationSec}s` }}
      >
        {track.map((logo) => (
          <img
            key={logo.key}
            src={logo.src}
            alt={logo.hidden ? "" : logo.alt}
            width={logo.width}
            height={logo.height}
            className="logo"
            style={{ height: `${logo.displayHeight}px`, width: "auto" }}
            decoding="async"
            aria-hidden={logo.hidden || undefined}
          />
        ))}
      </div>
    </div>
  );
}
