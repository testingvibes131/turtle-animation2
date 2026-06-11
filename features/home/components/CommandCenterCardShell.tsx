import type { ReactNode } from "react";
import {
  COMMAND_CENTER_CARD_SHELL_PATH,
  COMMAND_CENTER_CARD_SHELL_VIEWBOX,
} from "@/features/home/components/commandCenterCardShellPath";
import { UnionCardShell } from "@/features/home/components/UnionCardShell";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Bottom foot below the union waist — the remainder of the fixed-aspect
 *  card. Copy is anchored to the card's bottom edge with the same inset the
 *  pipeline (“tools a fund runs on”) cards use, so the two card families
 *  share a bottom rhythm. */
export const commandCenterCardFooterClass = [
  "flex flex-1 flex-col justify-end",
  "px-[clamp(10px,1vw,14px)] pb-[clamp(14px,1.4vw,20px)] text-[13px] lg:text-sm",
].join(" ");

export const commandCenterCardCopyClass =
  "flex flex-col gap-[clamp(9px,0.77vh,13px)]";

/** Figma “Card-Deals” shell — vertical waisted silhouette. */
export function CommandCenterCardShell({ children, className }: Props) {
  return (
    <UnionCardShell
      path={COMMAND_CENTER_CARD_SHELL_PATH}
      viewBox={COMMAND_CENTER_CARD_SHELL_VIEWBOX}
      // Card locked to the shell viewBox aspect, canvas margins proportional
      // (3.03% = 12px at the 396px reference width): card, canvas, and waist
      // scale together, so the canvas stays framed with equal margins on all
      // sides at every viewport.
      className={["aspect-[601/745] w-full md:max-w-[480px]", className]
        .filter(Boolean)
        .join(" ")}
      // min-h (not h): at squeezed widths (3-up iPad band) where the copy
      // can't fit the fixed-ratio foot, the card grows past the aspect and
      // the SVG stretches with it instead of the text spilling out.
      contentClassName="flex min-h-full flex-col gap-0 px-[3.03%] pt-[3.03%]"
    >
      {children}
    </UnionCardShell>
  );
}
