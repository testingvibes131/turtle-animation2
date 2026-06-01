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
        "inline-flex items-center justify-between gap-4 overflow-hidden rounded-[30px] border-[0.6px] border-solid border-[rgba(249,249,249,0.06)] bg-[rgba(249,249,249,0.02)] py-[5px] pl-5 pr-[5px] transition-colors hover:bg-[#73F36C]/10",
        className,
      ].join(" ")}
    >
      <span className="shrink-0 whitespace-nowrap text-[18px] font-normal leading-[1.4] text-ink-primary">
        {label}
      </span>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink-faint">
        <ArrowIcon />
      </span>
    </Link>
  );
}
