"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHeaderVisibility } from "@/components/site-header/useHeaderVisibility";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "#", label: "Products" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Docs" },
];

/** Figma CentralMenu shell (1374:44550 / 1374:44551) */
const headerMenuShell =
  "inline-flex items-center overflow-hidden rounded-[20px] border-[0.6px] border-solid border-[rgba(249,249,249,0.06)] bg-[rgba(249,249,249,0.02)]";

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  useHeaderVisibility();
  const pathname = usePathname();

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

        <div className="flex items-center gap-[30px]">
          <div
            className={`${headerMenuShell} hidden px-[10px] py-3 md:inline-flex`}
          >
            {navLinks.map((link) => {
              const active = isNavActive(pathname, link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={[
                    "px-[23px] text-[12px] font-normal leading-none transition-colors",
                    active
                      ? "text-green-400"
                      : "text-ink-subtle hover:text-ink-primary",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <Link
            href="#"
            className={`${headerMenuShell} px-5 py-3 transition-colors hover:bg-[#73F36C]/10`}
          >
            <span className="text-[12px] font-normal leading-[1.2] text-green-400">
              Enter App
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
