import type { ReactNode } from "react";
import {
  COMMAND_CENTER_CARD_SHELL_PATH,
  COMMAND_CENTER_CARD_SHELL_VIEWBOX,
} from "@/features/home/components/commandCenterCardShellPath";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Figma “Card-Deals” shell: waisted silhouette via exported Union path
 * (fill + stroke), stretched to the card’s content height.
 */
export function CommandCenterCardShell({ children, className }: Props) {
  return (
    <article
      className={[
        "relative w-full max-w-[480px] drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={COMMAND_CENTER_CARD_SHELL_VIEWBOX}
        preserveAspectRatio="none"
      >
        <path
          d={COMMAND_CENTER_CARD_SHELL_PATH}
          className="fill-surface-1"
        />
        <path
          d={COMMAND_CENTER_CARD_SHELL_PATH}
          fill="none"
          className="stroke-white/10"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="relative z-10 flex flex-col gap-[clamp(14px,1.4vw,20px)] p-[clamp(10px,0.9vw,12px)]">
        {children}
      </div>
    </article>
  );
}
