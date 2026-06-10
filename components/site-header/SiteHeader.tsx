"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { MobileNavOverlay } from "@/components/site-header/MobileNavOverlay";
import { ThemeToggle } from "@/components/site-header/ThemeToggle";
import { useHeaderVisibility } from "@/components/site-header/useHeaderVisibility";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "#", label: "Products" },
  { href: "#", label: "Blog" },
  { href: "#", label: "Docs" },
];

/** Figma CentralMenu shell (1374:44550 / mobile Enter App 1381:44601) */
const headerMenuShellBase =
  "overflow-hidden rounded-[20px] border-[0.6px] border-solid border-stroke-subtle bg-subtle";

const headerMenuShell = `inline-flex items-center ${headerMenuShellBase}`;

/** Figma mobile hamburger (1282:81331) — same shell recipe as Enter App /
    ThemeToggle, green lines via text color. */
const mobileMenuButtonShell =
  "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[0.6px] border-solid border-stroke-subtle bg-subtle text-green-400 transition-colors hover:bg-accent-subtle";

const navLinkClass = (active: boolean) =>
  [
    "text-[12px] font-normal leading-none transition-colors",
    active ? "text-green-400" : "text-ink-subtle hover:text-ink-primary",
  ].join(" ");

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href.startsWith("#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MenuIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M2.25 4.5h13.5M2.25 9h13.5M2.25 13.5h13.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SiteHeader() {
  useHeaderVisibility();
  const pathname = usePathname();
  const mobileNavId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="site-header is-visible pointer-events-auto sticky top-0 z-[100] isolate w-full bg-surface-0/70 pb-4 pt-5 backdrop-blur-md lg:pb-4 lg:pt-5">
      <nav
        className="relative mx-auto flex h-10 w-full max-w-[1728px] items-center justify-between px-6 md:px-10 lg:h-auto lg:px-[60px]"
        aria-label="Main"
      >
        {/* Mobile logo — Figma Home-Menu 1282:81328 (wordmark only) */}
        <Link
          href="/"
          className="relative z-10 inline-flex shrink-0 items-center lg:hidden"
          aria-label="Turtle home"
        >
          <Image
            src="/brand/turtle-club-wordmark.svg"
            alt="Turtle Club"
            width={78}
            height={19}
            className="brand-wordmark block h-[18.534px] w-[77.643px]"
            priority
          />
        </Link>

        {/* Desktop logo — wordmark only */}
        <Link
          href="/"
          className="relative z-10 hidden shrink-0 items-center lg:inline-flex"
          aria-label="Turtle home"
        >
          <Image
            src="/brand/turtle-club-wordmark.svg"
            alt="Turtle Club"
            width={74}
            height={18}
            className="brand-wordmark block h-[17.6px] w-[74px]"
          />
        </Link>

        {/* Desktop center nav — shell only; no inline-flex here or hidden loses on mobile */}
        <div
          className={[
            headerMenuShellBase,
            "absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center px-[10px] py-3",
            "lg:inline-flex",
          ].join(" ")}
        >
          {navLinks.map((link) => {
            const active = isNavActive(pathname, link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={["px-[23px]", navLinkClass(active)].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right actions — Figma 1381:44609: Enter App + hamburger (mobile) */}
        <div className="relative z-10 flex shrink-0 items-center gap-2.5 lg:gap-2">
          <ThemeToggle />
          <Link
            href="https://app.turtle.xyz/earn"
            target="_blank"
            rel="noopener noreferrer"
            className={[
              headerMenuShell,
              "px-5 py-3 text-[12px] font-normal leading-[1.2] transition-colors",
              "text-ink-primary lg:text-xs",
              "lg:hover:bg-fill lg:hover:text-green-400",
            ].join(" ")}
          >
            Enter App
          </Link>

          <button
            type="button"
            className={`${mobileMenuButtonShell} lg:hidden`}
            aria-expanded={menuOpen}
            aria-controls={mobileNavId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </nav>

      {menuOpen && portalReady ? (
        <MobileNavOverlay
          id={mobileNavId}
          links={navLinks}
          pathname={pathname}
          isNavActive={isNavActive}
          onClose={() => setMenuOpen(false)}
          menuIcon={<MenuIcon open />}
        />
      ) : null}
    </header>
  );
}
