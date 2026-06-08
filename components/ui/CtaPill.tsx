import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";

type CtaPillSize = "default" | "lg";

type CtaPillProps = {
  href: string;
  label: string;
  /** default = hero OrgCTAPill (1459:31401); lg = CTA section (1447:55793) */
  size?: CtaPillSize;
  className?: string;
};

const sizeClasses: Record<
  CtaPillSize,
  { link: string; label: string; icon: string }
> = {
  default: {
    link: "py-[5px] pl-[15px] pr-1.5",
    label: "text-sm leading-none",
    icon: "size-[30px]",
  },
  lg: {
    link: "py-[5px] pl-5 pr-[5px]",
    label: "text-xl leading-[1.4]",
    icon: "size-10",
  },
};

export function CtaPill({
  href,
  label,
  size = "default",
  className = "",
}: CtaPillProps) {
  const styles = sizeClasses[size];

  return (
    <Link
      href={href}
      className={[
        "group inline-flex items-center justify-between gap-[10px] overflow-hidden rounded-[30px] border-[0.6px] border-solid border-[rgba(249,249,249,0.06)] bg-[rgba(249,249,249,0.02)] transition-colors hover:bg-[rgba(249,249,249,0.08)]",
        styles.link,
        className,
      ].join(" ")}
    >
      <span
        className={[
          "shrink-0 whitespace-nowrap font-normal text-ink-primary transition-colors group-hover:text-green-400",
          styles.label,
        ].join(" ")}
      >
        {label}
      </span>
      <span
        className={[
          "flex shrink-0 items-center justify-center rounded-full bg-ink-faint",
          styles.icon,
        ].join(" ")}
      >
        <ArrowIcon />
      </span>
    </Link>
  );
}
