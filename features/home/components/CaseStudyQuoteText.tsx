"use client";

import { useLayoutEffect, useState } from "react";

type Props = {
  text: string;
  mobileText?: string;
};

/**
 * Quote copy fills the top lobe of the case-study card and clamps to a fixed
 * number of lines with an ellipsis. A fixed CSS clamp (no JS measuring) — the
 * old measure wrote -webkit-line-clamp inline and intermittently stuck at 1 line.
 */
export function CaseStudyQuoteText({ text, mobileText }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const displayText = isMobile && mobileText ? mobileText : text;

  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{
        padding:
          "clamp(12px, 1.25vw, 14px) clamp(18px, 1.6vw, 22px) clamp(8px, 0.7vw, 12px) clamp(12px, 1.25vw, 14px)",
      }}
    >
      <p className="overflow-hidden leading-[1.35] text-ink-primary [display:-webkit-box] [-webkit-box-orient:vertical] max-lg:[-webkit-line-clamp:9] max-lg:text-[11px] lg:[-webkit-line-clamp:8] lg:text-base">
        &ldquo;{displayText}&rdquo;
      </p>
    </div>
  );
}
