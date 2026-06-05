import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";

type CtaPillProps = {
  href: string;
  label: string;
  className?: string;
};

/** Figma OrgCTAPill (1374:44447) */
export function CtaPill({ href, label, className = "" }: CtaPillProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-between gap-2 overflow-hidden rounded-[24px] border-[0.6px] border-solid border-[rgba(249,249,249,0.06)] bg-[rgba(249,249,249,0.02)] py-[3px] pl-3.5 pr-[3px] transition-colors hover:bg-[#73F36C]/10",
        className,
      ].join(" ")}
    >
      <span className="shrink-0 whitespace-nowrap text-sm font-normal leading-tight text-ink-primary">
        {label}
      </span>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-faint">
        <ArrowIcon />
      </span>
    </Link>
  );
}
