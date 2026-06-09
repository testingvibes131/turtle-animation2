import type { ComponentPropsWithoutRef, ReactNode } from "react";

type SectionIntroProps = {
  children: ReactNode;
  className?: string;
  /** Default 36rem; use 38rem for hero-style copy columns. */
  width?: "36" | "38" | "none";
} & Pick<ComponentPropsWithoutRef<"div">, "aria-labelledby" | "id">;

const widthClass = {
  "36": "max-w-[36rem]",
  "38": "max-w-[38rem]",
  none: "",
};

/** Shared vertical rhythm: title → copy → CTA (see `.section-intro` in globals.css).
 *  Body copy belongs in `SectionIntroCopy`; direct `<p>` children are taglines with their own type scale. */
export function SectionIntro({
  children,
  className = "",
  width = "36",
  ...rest
}: SectionIntroProps) {
  return (
    <div
      className={[
        "section-intro flex w-full flex-col",
        widthClass[width],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Multi-paragraph body within a section intro. */
export function SectionIntroCopy({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["section-intro__copy flex flex-col", className].join(" ")}>
      {children}
    </div>
  );
}
