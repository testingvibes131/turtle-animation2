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
      suppressHydrationWarning
      className={`${dmSans.variable} ${dmSans.className} h-full antialiased`}
    >
      <head>
        {/* No-flash theme init: apply the saved theme before first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var u=new URLSearchParams(location.search).get('theme');var t=u||localStorage.getItem('turtle-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');else if(t==='dark')document.documentElement.removeAttribute('data-theme');}catch(e){}",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-surface-0 font-sans text-ink-primary">
        {children}
      </body>
    </html>
  );
}
