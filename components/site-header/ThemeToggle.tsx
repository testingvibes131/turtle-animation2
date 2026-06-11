"use client";

import { useState } from "react";

export type Theme = "dark" | "light";

export function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="3.4" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M14.3 3.7l-1.4 1.4M5.1 12.9l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M15 10.6A6.2 6.2 0 0 1 7.4 3a6.2 6.2 0 1 0 7.6 7.6Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Reads/flips `data-theme` on <html> and persists the choice (see no-flash
 *  init in layout). Shared by the round header toggle and the mobile-menu
 *  segmented control. */
export function useThemePreference() {
  // Lazy init from the data-theme the no-flash script already set, so the
  // first client render agrees with the page (no icon/label flash). SSR can't
  // know the theme, so nothing SSR-rendered may derive an attribute from it.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";
  });

  const applyTheme = (next: Theme) => {
    setTheme(next);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("turtle-theme", next);
    } catch {
      /* ignore */
    }
  };

  return { theme, applyTheme };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, applyTheme } = useThemePreference();

  const toggle = () => {
    applyTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={[
        // Same shell recipe as the header's Enter App pill (headerMenuShellBase).
        "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[0.6px] border-solid border-stroke-subtle bg-subtle text-ink-primary transition-colors hover:bg-[var(--fill)]",
        className,
      ].join(" ")}
    >
      {/* Both icons in the DOM, CSS-gated off html[data-theme]: identical
          markup on server and client, and the pre-hydration frame already
          shows the right icon. The sr-only text doubles as the accessible
          name — display:none drops the inactive span from the a11y tree, so
          the name tracks the theme without a state-derived attribute (which
          React would leave stale on a hydration mismatch). */}
      <span className="theme-toggle-icon-dark">
        <SunIcon />
        <span className="sr-only">Switch to light mode</span>
      </span>
      <span className="theme-toggle-icon-light">
        <MoonIcon />
        <span className="sr-only">Switch to dark mode</span>
      </span>
    </button>
  );
}
