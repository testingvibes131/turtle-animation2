"use client";

import { useEffect, useState } from "react";

const DARK_SRC = "/footer/turtle-xyz-stroke.svg";
/** Light mode: gradient reversed in the SVG stroke (dark middle, light edges). */
const LIGHT_SRC = "/footer/turtle-xyz-stroke-light.svg";

export function FooterWordmark() {
  const [src, setSrc] = useState(DARK_SRC);

  useEffect(() => {
    const update = () => {
      const light =
        document.documentElement.getAttribute("data-theme") === "light";
      setSrc(light ? LIGHT_SRC : DARK_SRC);
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="footer-wordmark-wrap"
      style={{ marginTop: "clamp(24px, 4vw, 64px)" }}
    >
      <img
        src={src}
        alt="turtle.xyz"
        className="footer-wordmark-svg"
        draggable={false}
      />
    </div>
  );
}
