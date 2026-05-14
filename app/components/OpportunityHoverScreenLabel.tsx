"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { DM_Sans, Montserrat } from "next/font/google";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PackedMarker } from "@/app/lib/opportunityCirclePack";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const RADIUS_SCALE = 0.34;
const HIGHLIGHT_SCALE = 1.06;

/** Tailwind classes (must appear as static string for the compiler). */
const LABEL_CLASS =
  "pointer-events-none absolute z-15 max-w-[280px] -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-[10px] bg-[#141514] px-3 py-2 text-center text-[16px] leading-snug font-semibold whitespace-nowrap text-ellipsis text-[#f9f9f9] shadow-lg";

function hoverLabelWorldY(marker: PackedMarker): number {
  const highlightR = marker.size * RADIUS_SCALE * HIGHLIGHT_SCALE;
  return highlightR + 0.55;
}

type OpportunityHoverScreenLabelProps = {
  marker: PackedMarker | null;
  /** DOM node above the WebGL layer (sibling after &lt;Canvas&gt;). */
  portalEl: HTMLDivElement | null;
};

/**
 * Screen-space HTML/CSS label (no drei Html). R3F must not see a host &lt;div&gt;
 * in the return tree — we append a real DOM node to `portalEl` instead.
 */
export function OpportunityHoverScreenLabel({
  marker,
  portalEl,
}: OpportunityHoverScreenLabelProps) {
  const { camera, size } = useThree();
  const ndc = useMemo(() => new THREE.Vector3(), []);
  const labelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!portalEl) {
      labelRef.current = null;
      return;
    }

    const el = document.createElement("div");
    el.className = `${LABEL_CLASS} ${dmSans.className} ${montserrat.className}`;
    el.style.overflow = "hidden";
    el.style.textOverflow = "ellipsis";
    el.style.pointerEvents = "none";
    el.style.visibility = "hidden";

    portalEl.appendChild(el);
    labelRef.current = el;

    return () => {
      labelRef.current = null;
      if (el.parentNode === portalEl) {
        portalEl.removeChild(el);
      }
    };
  }, [portalEl]);

  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    el.textContent = marker?.name ?? "";
  }, [marker, portalEl]);

  useFrame(() => {
    const el = labelRef.current;
    if (!el) return;

    if (!marker) {
      el.style.visibility = "hidden";
      return;
    }

    ndc.set(marker.x, hoverLabelWorldY(marker), marker.z);
    ndc.project(camera);

    if (Math.abs(ndc.z) > 1) {
      el.style.visibility = "hidden";
      return;
    }

    const w = size.width;
    const h = size.height;
    const x = (ndc.x * 0.5 + 0.5) * w;
    const y = (-ndc.y * 0.5 + 0.5) * h;

    el.style.visibility = "visible";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });

  return null;
}
