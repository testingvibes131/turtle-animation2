"use client";

import { useLayoutEffect, useRef, useState } from "react";

type Props = {
  text: string;
};

function measureLineClamp(container: HTMLElement, textEl: HTMLElement): number | undefined {
  const maxHeight = container.clientHeight;
  if (maxHeight <= 0) return 1;

  textEl.style.webkitLineClamp = "9999";

  if (textEl.scrollHeight <= maxHeight) {
    return undefined;
  }

  let lo = 1;
  let hi = 200;
  let best = 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    textEl.style.webkitLineClamp = String(mid);

    if (textEl.scrollHeight <= maxHeight) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}

/** Quote copy fills the top lobe and ellipsizes at the union waist. */
export function CaseStudyQuoteText({ text }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [lineClamp, setLineClamp] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const update = () => {
      setLineClamp(measureLineClamp(container, textEl));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    void document.fonts?.ready.then(update);

    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{
        padding:
          "clamp(18px, 1.6vw, 22px) clamp(18px, 1.6vw, 22px) clamp(8px, 0.7vw, 12px) clamp(18px, 1.6vw, 22px)",
      }}
    >
      <p
        ref={textRef}
        className="overflow-hidden max-lg:text-sm leading-[1.35] text-stone-50 [display:-webkit-box] [-webkit-box-orient:vertical] lg:text-base"
        style={lineClamp !== undefined ? { WebkitLineClamp: lineClamp } : undefined}
      >
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}
