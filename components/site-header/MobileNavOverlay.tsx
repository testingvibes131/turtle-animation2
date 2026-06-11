"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  MoonIcon,
  SunIcon,
  useThemePreference,
  type Theme,
} from "@/components/site-header/ThemeToggle";

const headerMenuShell = "inline-flex items-center overflow-hidden rounded-[20px] border-[0.6px] border-solid border-stroke-subtle bg-subtle";

const mobileMenuButtonShell =
  "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[0.6px] border-solid border-stroke-subtle bg-subtle text-green-400 transition-colors hover:bg-accent-subtle";

/** Segmented Light/Dark switch — the mobile home of the theme toggle. */
function ThemeSegmentedToggle() {
  const { theme, applyTheme } = useThemePreference();

  const segment = (value: Theme, label: string, icon: ReactNode) => {
    const active = theme === value;
    return (
      <button
        type="button"
        onClick={() => applyTheme(value)}
        aria-pressed={active}
        className={[
          "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-normal leading-none transition-colors",
          active
            ? "bg-fill text-ink-primary"
            : "text-ink-subtle hover:text-ink-primary",
        ].join(" ")}
      >
        {icon}
        {label}
      </button>
    );
  };

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border-[0.6px] border-solid border-stroke-subtle bg-subtle p-1"
      role="group"
      aria-label="Colour theme"
    >
      {segment("light", "Light", <SunIcon />)}
      {segment("dark", "Dark", <MoonIcon />)}
    </div>
  );
}

type NavLink = { href: string; label: string };

type MobileNavOverlayProps = {
  id: string;
  links: readonly NavLink[];
  pathname: string;
  isNavActive: (pathname: string, href: string) => boolean;
  onClose: () => void;
  menuIcon: ReactNode;
};

function navLinkClass(active: boolean) {
  return [
    "block rounded-[14px] px-6 py-4 text-center text-[18px] font-normal leading-none transition-colors",
    active ? "text-green-400" : "text-ink-subtle hover:text-ink-primary",
  ].join(" ");
}

export function MobileNavOverlay({
  id,
  links,
  pathname,
  isNavActive,
  onClose,
  menuIcon,
}: MobileNavOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Modal focus management: move focus into the dialog on open (SiteHeader
  // restores it to the hamburger on close)…
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // …and keep Tab cycling inside it — the page behind is still in the DOM.
  // Listens on document (like SiteHeader's Escape handler): a click on the
  // overlay's whitespace drops focus to <body>, where a dialog-scoped
  // handler would never see the Tab and focus would walk the hidden page.
  useEffect(() => {
    const trapTab = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !root.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapTab);
    return () => document.removeEventListener("keydown", trapTab);
  }, []);

  return createPortal(
    <div
      ref={dialogRef}
      className="mobile-nav-overlay flex flex-col bg-surface-0 text-ink-primary lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
    >
      <div className="mx-auto flex w-full max-w-[1728px] shrink-0 items-center justify-between px-6 pb-4 pt-5 md:px-10">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center"
          aria-label="Turtle home"
          onClick={onClose}
        >
          <Image
            src="/brand/turtle-club-wordmark.svg"
            alt="Turtle Club"
            width={78}
            height={19}
            className="brand-wordmark block h-[18.534px] w-[77.643px]"
          />
        </Link>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="https://app.turtle.xyz/earn"
            target="_blank"
            rel="noopener noreferrer"
            className={[
              headerMenuShell,
              "px-5 py-3 text-[12px] font-normal leading-[1.2] text-ink-primary transition-colors",
            ].join(" ")}
            onClick={onClose}
          >
            Enter App
          </Link>

          <button
            ref={closeButtonRef}
            type="button"
            className={mobileMenuButtonShell}
            aria-label="Close menu"
            onClick={onClose}
          >
            {menuIcon}
          </button>
        </div>
      </div>

      {/* 1:2 spacers float the link list around the upper third; the theme
          toggle sits pinned at the bottom. */}
      <nav
        id={id}
        aria-label="Mobile"
        className="flex flex-1 flex-col items-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-10"
      >
        <div className="flex-1" aria-hidden />
        <ul className="flex w-full max-w-xs flex-col items-center gap-2">
          {links.map((link) => {
            const active = isNavActive(pathname, link.href);
            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className={navLinkClass(active)}
                  aria-current={active ? "page" : undefined}
                  onClick={onClose}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex-[2]" aria-hidden />
        <ThemeSegmentedToggle />
      </nav>
    </div>,
    document.body,
  );
}
