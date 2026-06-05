"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

type RevealOnScrollProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: ReactNode;
  /** Staggers the fade-in after the element enters the viewport. */
  delayMs?: number;
};

export function RevealOnScroll({
  children,
  className = "",
  delayMs = 0,
  style,
  ...rest
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "reveal-on-scroll",
        visible ? "is-visible" : "",
        className,
      ].join(" ")}
      style={{
        ...(delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
