import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";

type CtaPillProps = {
  href: string;
  label: string;
  variant?: "default" | "primary";
  className?: string;
};

export function CtaPill({
  href,
  label,
  variant = "default",
  className = "",
}: CtaPillProps) {
  const isPrimary = variant === "primary";

  return (
    <Link
      href={href}
      className={[
        "inline-flex h-[51px] items-center gap-4 rounded-full bg-black/10 py-2 pl-[22px] pr-2 outline outline-1 outline-offset-[-1px] outline-stone-50/10 transition-colors hover:bg-[#73F36C]/10",
        className,
      ].join(" ")}
    >
      <span
        className={[
          "whitespace-nowrap text-body-small font-normal leading-tight",
          isPrimary ? "text-green-400" : "text-stone-50",
        ].join(" ")}
      >
        {label}
      </span>
      <span
        className={[
          "flex size-[34px] shrink-0 items-center justify-center rounded-full",
          isPrimary
            ? "bg-gradient-to-l from-green-400/20 to-neutral-900/20"
            : "bg-stone-50/10",
        ].join(" ")}
      >
        <ArrowIcon className="block -rotate-90" />
      </span>
    </Link>
  );
}
