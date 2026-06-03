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

/** Figma “Card-Deals” shell — vertical waisted silhouette. */
export function CommandCenterCardShell({ children, className }: Props) {
  return (
    <UnionCardShell
      path={COMMAND_CENTER_CARD_SHELL_PATH}
      viewBox={COMMAND_CENTER_CARD_SHELL_VIEWBOX}
      className={["max-w-[480px]", className].filter(Boolean).join(" ")}
      contentClassName="flex flex-col gap-[clamp(14px,1.4vw,20px)] p-[clamp(10px,0.9vw,12px)]"
    >
      {children}
    </UnionCardShell>
  );
}
