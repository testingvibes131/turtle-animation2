"use client";

import Image from "next/image";
import Link from "next/link";
import { useHeaderVisibility } from "@/components/site-header/useHeaderVisibility";

const navLinks = [
  { href: "#", label: "Home" },
  { href: "#", label: "Products" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Docs" },
];

export function SiteHeader() {
  useHeaderVisibility();

  return (
    <header className="site-header sticky top-0 z-50 w-full bg-surface-0/70 px-6 pb-4 pt-5 backdrop-blur-md md:px-10 lg:px-[60px]">
      <nav className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center justify-start gap-[4px]"
          aria-label="Turtle home"
        >
          <Image
            src="/brand/turtle-iso.svg"
            alt=""
            width={25}
            height={25}
            className="block size-[25px]"
          />
          <Image
            src="/brand/turtle-club-wordmark.svg"
            alt="Turtle Club"
            width={74}
            height={18}
            className="block h-[17.6px] w-[74px]"
          />
        </Link>

        <div className="hidden items-center gap-2 rounded-2xl bg-surface-1 px-[11px] md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="p-3 text-small leading-none text-[#8c8c8c] transition-colors hover:text-ink-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Link
          href="#"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-stone-50/0 py-1 pl-1 pr-[11px] outline outline-1 outline-offset-[-1px] outline-stone-50/10 transition-colors hover:bg-[#73F36C]/10"
        >
          <span className="relative grid size-7 place-items-center overflow-hidden rounded-full bg-gradient-to-r from-neutral-900/60 to-green-400/0 shadow-[inset_0px_0px_2.3px_0px_rgba(115,243,108,1)] outline outline-[0.67px] outline-offset-[-0.67px] outline-white/40">
            <Image
              src="/footer/turtle-iso.svg"
              alt=""
              width={28}
              height={29}
              className="block h-[29px] w-7 translate-y-1.5"
            />
          </span>
          <span className="text-small font-medium leading-none text-stone-50">
            Open App
          </span>
        </Link>
      </nav>
    </header>
  );
}
