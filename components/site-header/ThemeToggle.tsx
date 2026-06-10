"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function SunIcon() {
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

function MoonIcon() {
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

/** Flips `data-theme` on <html> and persists the choice (see no-flash init in layout). */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark",
    );
  }, []);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
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

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "light" ? "Switch to dark mode" : "Switch to light mode"
      }
      className={[
        "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--stroke-default)] bg-[var(--surface-subtle-3)] text-ink-primary transition-colors hover:bg-[var(--fill)]",
        className,
      ].join(" ")}
    >
      {theme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
