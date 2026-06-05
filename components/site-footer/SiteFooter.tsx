import Link from "next/link";
import { FooterWordmark } from "@/components/site-footer/FooterWordmark";

const footerNav = [
  {
    title: "Product",
    links: ["Introduction", "FAQ", "Updates", "Legal"],
  },
  {
    title: "Contact Us",
    links: ["Partner up", "Contribute", "Connect"],
  },
  {
    title: "Resources",
    links: ["Feedback", "Support", "Brand Kit"],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer w-full">
      <div className="footer-divider" />

      <div
        className="w-full px-6 md:px-10 lg:px-[70px]"
        style={{ paddingTop: "clamp(40px, 5vw, 60px)" }}
      >
        <div className="flex w-full justify-end">
          <nav
            className="flex flex-wrap justify-end gap-x-[clamp(20px,3vw,40px)] gap-y-[clamp(24px,3vw,32px)]"
            aria-label="Footer"
          >
            {footerNav.map((col) => (
              <div key={col.title} className="footer-nav-col" style={{ minWidth: 140 }}>
                <h3>{col.title}</h3>
                {col.links.map((link) => (
                  <Link key={link} href="#">
                    {link}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </div>

      <FooterWordmark />

      <div className="footer-divider" />

      <div
        className="w-full px-6 md:px-10 lg:px-[60px]"
        style={{
          paddingTop: "clamp(24px, 3vw, 40px)",
          paddingBottom: "clamp(24px, 3vw, 40px)",
        }}
      >
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="footer-legal flex items-center gap-[clamp(16px,2vw,30px)]">
            <Link href="#">Privacy</Link>
            <Link href="#">Cookies</Link>
            <Link href="#">Terms</Link>
          </div>
          <p className="footer-copyright">© 2026 Turtle</p>
        </div>
      </div>
    </footer>
  );
}
