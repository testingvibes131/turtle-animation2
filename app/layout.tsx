import type { Metadata, Viewport } from "next";
import { dmSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turtle — Onchain Yield Management",
  description:
    "Aggregated, diligenced, personalized onchain yield management.",
  metadataBase: new URL("https://turtle.xyz"),
  openGraph: {
    title: "Turtle — Onchain Yield Management",
    description:
      "Aggregated, diligenced, personalized onchain yield management.",
    type: "website",
    siteName: "Turtle",
  },
  twitter: {
    card: "summary",
    title: "Turtle — Onchain Yield Management",
    description:
      "Aggregated, diligenced, personalized onchain yield management.",
  },
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
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmSans.className} h-full antialiased`}
    >
      <head>
        {/* No-flash theme init, before first paint. Priority: ?theme= param >
            saved toggle choice > OS prefers-color-scheme > light. Errors and
            unknown values fall through to light. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "var __dark=false;try{var u=new URLSearchParams(location.search).get('theme');var t=u||localStorage.getItem('turtle-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}__dark=t==='dark';}catch(e){}if(__dark)document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme','light');",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-surface-0 font-sans text-ink-primary">
        {children}
      </body>
    </html>
  );
}
