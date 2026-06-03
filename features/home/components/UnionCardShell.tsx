import type { CSSProperties, ReactNode } from "react";

type Props = {
  path: string;
  viewBox: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  as?: "article" | "div";
};

/** Waisted Union card outline — fill + stroke SVG stretched to content size. */
export function UnionCardShell({
  path,
  viewBox,
  children,
  className,
  contentClassName,
  contentStyle,
  as: Tag = "article",
}: Props) {
  return (
    <Tag
      className={[
        "relative w-full drop-shadow-[0_4px_20px_rgba(0,0,0,0.25)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={viewBox}
        preserveAspectRatio="none"
      >
        <path d={path} className="fill-surface-1" />
        <path
          d={path}
          fill="none"
          className="stroke-white/10"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className={["relative z-10", contentClassName].filter(Boolean).join(" ")}
        style={contentStyle}
      >
        {children}
      </div>
    </Tag>
  );
}
