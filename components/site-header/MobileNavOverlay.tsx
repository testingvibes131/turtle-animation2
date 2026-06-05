"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

const headerMenuShell = "inline-flex items-center overflow-hidden rounded-[20px] border-[0.6px] border-solid border-[rgba(249,249,249,0.06)] bg-[rgba(249,249,249,0.02)]";

const mobileMenuButtonShell =
  "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[rgba(249,249,249,0.1)] bg-[rgba(249,249,249,0.02)] text-green-400 transition-colors hover:bg-[#73F36C]/10";

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
  return createPortal(
    <div
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
            className="block h-[18.534px] w-[77.643px]"
          />
        </Link>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="#"
            className={[
              headerMenuShell,
              "px-5 py-3 text-[12px] font-normal leading-[1.2] text-ink-primary hover:text-green-400 transition-colors",
            ].join(" ")}
            onClick={onClose}
          >
            Enter App
          </Link>

          <button
            type="button"
            className={mobileMenuButtonShell}
            aria-label="Close menu"
            onClick={onClose}
          >
            {menuIcon}
          </button>
        </div>
      </div>

      <nav
        id={id}
        aria-label="Mobile"
        className="flex flex-1 flex-col items-center justify-center px-6 pb-10 md:px-10"
      >
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
      </nav>
    </div>,
    document.body,
  );
}
