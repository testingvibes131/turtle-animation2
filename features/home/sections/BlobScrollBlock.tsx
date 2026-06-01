"use client";

import { Leva } from "leva";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BlobExperience } from "@/features/blob-scene";
import { BlobScrollProgressProvider } from "@/features/blob-scene/context/BlobScrollProgressContext";

/**
 * One blob canvas for hero + section 2: sticky backdrop with scrollable content overlaid.
 */
export function BlobScrollBlock({ children }: { children: ReactNode }) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [interactionEnabled, setInteractionEnabled] = useState(false);

  useEffect(() => {
    const block = blockRef.current;
    if (!block) return;

    const updateProgress = () => {
      const hero = block.querySelector<HTMLElement>('[data-blob-section="1"]');
      const heroScroll = hero?.offsetHeight ?? window.innerHeight;
      const scrolled = -block.getBoundingClientRect().top;
      setScrollProgress(
        Math.min(1, Math.max(0, scrolled / heroScroll)),
      );
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  useEffect(() => {
    const block = blockRef.current;
    if (!block) return;

    const section2 = block.querySelector<HTMLElement>('[data-blob-section="2"]');
    if (!section2) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInteractionEnabled(entry.isIntersecting);
      },
      { threshold: 0.2 },
    );

    observer.observe(section2);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={blockRef} className="relative">
      <Leva collapsed />
      <div className="sticky top-0 z-0 h-screen w-full">
        <div
          className={[
            "absolute inset-0 touch-none",
            interactionEnabled ? "pointer-events-auto" : "pointer-events-none",
          ].join(" ")}
        >
          <BlobScrollProgressProvider
            progress={scrollProgress}
            interactionEnabled={interactionEnabled}
          >
            <BlobExperience />
          </BlobScrollProgressProvider>
        </div>
      </div>
      <div className="relative z-10 -mt-[100vh] pointer-events-none">
        {children}
      </div>
    </div>
  );
}
