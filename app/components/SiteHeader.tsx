"use client";

import { DM_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["500"],
});

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/blog", label: "Blog" },
  { href: "/docs", label: "Docs" },
] as const;

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <header
      className={[
        "pointer-events-none absolute inset-x-0 top-0 z-30 w-full pt-[60px]",
        dmSans.className,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pointer-events-auto mx-auto flex h-[34px] max-w-[1320px] items-center justify-between px-6 sm:px-[60px]">
        <div className="flex h-[34px] w-[250px] shrink-0 items-center">
          <Link href="/" className="flex items-center gap-1.5 outline-offset-4">
            <span className="relative h-[25.255px] w-[102.994px] shrink-0">
              <Image
                src="/brand/turtle-wordmark.svg"
                alt="Turtle"
                fill
                className="object-contain object-left"
                sizes="103px"
                priority
              />
            </span>
          </Link>
        </div>

        <nav
          aria-label="Main"
          className="bg-[rgba(249,249,249,0.02)] flex h-[34px] shrink-0 items-center gap-2.5 rounded-[20px] px-3.5"
        >
          {NAV_ITEMS.map(({ href, label }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center justify-center rounded-[20px] px-3.5 py-1.5 leading-[14px] font-medium whitespace-nowrap shadow-[0px_4px_10.977px_rgba(0,0,0,0.2)] transition-colors",
                  active ? "text-[#73F36C]" : "text-[rgba(255,255,255,0.5)]",
                ].join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex w-[250px] shrink-0 items-center justify-end">
          <Link
            href="/sign-in"
            className="border-[rgba(249,249,249,0.1)] bg-[rgba(249,249,249,0.02)] flex h-[34px] items-center gap-1.5 rounded-full border border-solid pl-1.5 pr-3 text-[#F9F9F9] outline-offset-4"
          >
            <span className="relative size-[20px] shrink-0">
              <Image
                src="/brand/turtle-icon.svg"
                alt=""
                fill
                className="object-contain object-center"
                sizes="20px"
              />
            </span>
            <span className="text-center leading-5 font-medium whitespace-nowrap">
              Sign In
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
