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

/** Bottom foot below the union waist. */
export const commandCenterCardFooterClass = [
  "flex min-h-[clamp(104px,13vw,140px)] flex-col",
  "px-[clamp(10px,1vw,14px)] pt-[clamp(16px,1.6vw,22px)] text-[13px] lg:text-sm",
].join(" ");

/** Nudge copy down into the foot without changing shell padding. */
export const commandCenterCardCopyClass = [
  "flex flex-col gap-[clamp(9px,0.77vh,13px)]",
  "translate-y-[clamp(18px,1.8vw,28px)]",
].join(" ");

/** Figma “Card-Deals” shell — vertical waisted silhouette. */
export function CommandCenterCardShell({ children, className }: Props) {
  return (
    <UnionCardShell
      path={COMMAND_CENTER_CARD_SHELL_PATH}
      viewBox={COMMAND_CENTER_CARD_SHELL_VIEWBOX}
      className={["w-full md:max-w-[480px]", className].filter(Boolean).join(" ")}
      contentClassName="flex flex-col gap-0 px-[clamp(9px,0.83vw,12px)] pt-[clamp(9px,0.83vw,12px)] pb-[clamp(28px,2.4vw,36px)]"
    >
      {children}
    </UnionCardShell>
  );
}
