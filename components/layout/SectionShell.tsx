import type { ReactNode } from "react";

type SectionShellProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  paddingY?: "default" | "large" | "hero";
  maxWidth?: boolean;
};

const paddingMap = {
  default: "py-[clamp(48px,6vw,96px)]",
  large: "py-[clamp(56px,7vw,112px)] pb-[clamp(32px,4vw,64px)]",
  hero: "pt-[clamp(32px,4vw,64px)] pb-[clamp(120px,14vw,220px)]",
};

export function SectionShell({
  children,
  className = "",
  innerClassName = "",
  paddingY = "default",
  maxWidth = true,
}: SectionShellProps) {
  return (
    <section
      className={[
        "relative mx-auto w-full px-6 md:px-10 lg:px-[100px]",
        paddingMap[paddingY],
        maxWidth ? "max-w-[1728px]" : "",
        className,
      ].join(" ")}
    >
      <div className={innerClassName}>{children}</div>
    </section>
  );
}
