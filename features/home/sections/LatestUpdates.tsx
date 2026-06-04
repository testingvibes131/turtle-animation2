import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { updates } from "@/features/home/data/updates";

export function LatestUpdates() {
  const cards = [...updates, ...updates];

  return (
    <section
      className="relative w-full"
      style={{
        paddingTop: "clamp(48px, 6vw, 80px)",
        paddingBottom: "clamp(48px, 6vw, 80px)",
      }}
    >
      <div className="w-full px-6 md:px-10 lg:px-[100px]">
        <RevealOnScroll>
          <h2 className="max-w-[22ch] bg-clip-text pb-[0.05em] text-4xl font-normal leading-[1.2] tracking-[-0.8px] text-transparent text-gradient-heading">
            Latest Updates
          </h2>
        </RevealOnScroll>
      </div>

      <div className="updates-scroll mt-[clamp(24px,3vw,40px)] w-full">
        <div className="updates-scroll__track">
          {cards.map((article, index) => (
            <article
              key={`${article.id}-${index}`}
              className="update-card"
              aria-hidden={index >= updates.length}
            >
              <div className="update-card__inner">
                <Image
                  src={article.image}
                  alt=""
                  width={400}
                  height={220}
                  className="update-card__img"
                />
                <div className="update-card__info">
                  <div className="update-card__text">
                    <h3 className="update-card__title">{article.title}</h3>
                    <p className="update-card__desc">{article.description}</p>
                  </div>
                  <Link
                    href={article.href}
                    className="update-card__cta"
                    aria-label={article.ariaLabel}
                    tabIndex={index >= updates.length ? -1 : undefined}
                  >
                    <span>Read article</span>
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
