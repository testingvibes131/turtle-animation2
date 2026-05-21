import { DM_Sans } from "next/font/google";

export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

/** Resolved family for inline styles (e.g. R3F Html overlays). */
export const dmSansFontFamily = dmSans.style.fontFamily;

/**
 * Apply on drei `<Html className={r3fHtmlFontClassName}>` so DM Sans loads inside
 * the portal (inline `fontFamily` alone can miss next/font's @font-face class).
 */
export const r3fHtmlFontClassName = dmSans.className;
