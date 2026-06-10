"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { caseStudies } from "@/features/home/data/caseStudies";
import { updates } from "@/features/home/data/updates";

type WarmImage = { src: string; w: number; h: number };

/** Below-the-fold images, with widths matching how they actually render so the
 *  optimized URLs (and cache) line up — no second fetch when scrolled to. */
const WARM_IMAGES: WarmImage[] = (() => {
  const list: WarmImage[] = [];
  // Dedupe by src+width — the same asset icon (e.g. BTC) appears across several
  // case studies; warming it once is enough and keeps React keys unique.
  const seen = new Set<string>();
  const push = (src: string, w: number, h = w) => {
    const key = `${src}-${w}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ src, w, h });
  };

  for (const study of caseStudies) {
    push(study.logo, 56);
    const tc = study.thirdCard;
    if (tc.kind === "applications") {
      for (const app of tc.applications) push(app.logo, 40);
    } else if (tc.kind === "quote" && tc.avatarSrc) {
      push(tc.avatarSrc, 52);
    }
    if (study.boosted?.badges) {
      for (const badge of study.boosted.badges) push(badge.src, 18);
    }
  }
  for (const update of updates) push(update.image, 400, 220);

  return list;
})();

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Warms below-the-fold images in the background — but only AFTER the page has
 * loaded (hero + 3D blob get the bandwidth first), then on the first idle slot.
 * So by the time the user scrolls, case-study logos/badges and blog images are
 * already decoded and cached — no pop-in/flash.
 */
export function DeferredImagePreloader() {
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    const win = window as IdleWindow;
    let idleHandle: number | undefined;
    let timeoutHandle: number | undefined;

    const begin = () => {
      if (win.requestIdleCallback) {
        idleHandle = win.requestIdleCallback(() => setWarm(true), {
          timeout: 1500,
        });
      } else {
        timeoutHandle = window.setTimeout(() => setWarm(true), 1000);
      }
    };

    if (document.readyState === "complete") {
      begin();
    } else {
      window.addEventListener("load", begin, { once: true });
    }

    return () => {
      window.removeEventListener("load", begin);
      if (idleHandle !== undefined && win.cancelIdleCallback) {
        win.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    };
  }, []);

  if (!warm) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 h-0 w-0 overflow-hidden opacity-0"
    >
      {WARM_IMAGES.map((img) => (
        <Image
          key={`${img.src}-${img.w}`}
          src={img.src}
          alt=""
          width={img.w}
          height={img.h}
          loading="eager"
        />
      ))}
    </div>
  );
}
