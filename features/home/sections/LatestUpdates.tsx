"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { updates } from "@/features/home/data/updates";
import { useUpdatesScrollDrift } from "@/features/home/hooks/useUpdatesScrollDrift";

export function LatestUpdates() {
  const cards = [...updates, ...updates];
  const scrollerRef = useRef<HTMLDivElement>(null);
  useUpdatesScrollDrift(scrollerRef);

  return (
    <section
      // Full-width section: the scroller spans the viewport WITHOUT a
      // 100vw/negative-margin breakout (which gave Safari horizontal-overflow
      // scroll jitter). The header keeps the BackedBy 1728px alignment via
      // its own capped container.
      className="relative w-full"
      style={{
        paddingTop: "clamp(48px, 6vw, 80px)",
        paddingBottom: "clamp(48px, 6vw, 80px)",
      }}
    >
      <div className="mx-auto w-full max-w-[1728px] px-6 md:px-10 lg:px-[100px]">
        <RevealOnScroll>
          <h2 className="max-w-[22ch] bg-clip-text pb-[0.05em] text-[18px] font-normal leading-[1.2] tracking-[-0.8px] lg:text-2xl text-transparent text-gradient-heading">
            Latest Updates
          </h2>
        </RevealOnScroll>
      </div>

      <div ref={scrollerRef} className="updates-scroll mt-[clamp(12px,1.25vw,20px)] w-full">
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
