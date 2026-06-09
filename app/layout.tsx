import type { Metadata, Viewport } from "next";
import { dmSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turtle — Onchain Yield Management",
  description:
    "Aggregated, diligenced, personalized onchain yield management.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmSans.className} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface-0 font-sans text-ink-primary">
        {children}
      </body>
    </html>
  );
}
