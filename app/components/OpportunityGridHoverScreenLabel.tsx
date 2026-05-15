"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { DM_Sans, Montserrat } from "next/font/google";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { GridTopographyMarker } from "@/app/lib/opportunityGridTopographyLayout";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const GRID_SPHERE_RADIUS_SCALE = 0.2;
const HOVER_LABEL_Y_PAD = 0.72;

const LABEL_CLASS =
  "pointer-events-none absolute z-[180000001] flex max-w-[min(280px,42vw)] -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center justify-center rounded-[14px] border border-[rgba(240,244,242,0.14)] bg-[rgba(10,14,12,0.92)] px-[18px] py-3 text-center shadow-[0_10px_36px_rgba(0,0,0,0.62)] backdrop-blur-[12px]";

const LABEL_CURATOR_CLASS =
  "max-w-full truncate text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#f0f4f2]";

function sphereRadius(m: GridTopographyMarker): number {
  return m.size * GRID_SPHERE_RADIUS_SCALE;
}

type OpportunityGridHoverScreenLabelProps = {
  marker: GridTopographyMarker | null;
  portalEl: HTMLDivElement | null;
};

/**
 * Screen-space hover card for grid topography — curator name only.
 */
export function OpportunityGridHoverScreenLabel({
  marker,
  portalEl,
}: OpportunityGridHoverScreenLabelProps) {
  const { camera, size } = useThree();
  const ndc = useMemo(() => new THREE.Vector3(), []);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const curatorRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!portalEl) {
      labelRef.current = null;
      curatorRef.current = null;
      return;
    }

    const el = document.createElement("div");
    el.className = `${LABEL_CLASS} ${dmSans.className} ${montserrat.className}`;
    el.style.pointerEvents = "none";
    el.style.visibility = "hidden";

    const curator = document.createElement("span");
    curator.className = LABEL_CURATOR_CLASS;

    el.appendChild(curator);

    portalEl.appendChild(el);
    labelRef.current = el;
    curatorRef.current = curator;

    return () => {
      labelRef.current = null;
      curatorRef.current = null;
      if (el.parentNode === portalEl) {
        portalEl.removeChild(el);
      }
    };
  }, [portalEl]);

  useEffect(() => {
    const curator = curatorRef.current;
    if (!curator) return;
    if (!marker) {
      curator.textContent = "";
      return;
    }
    curator.textContent = marker.curator;
  }, [marker, portalEl]);

  useFrame(() => {
    const el = labelRef.current;
    if (!el) return;

    if (!marker) {
      el.style.visibility = "hidden";
      return;
    }

    const anchorY = marker.y + sphereRadius(marker) + HOVER_LABEL_Y_PAD;
    ndc.set(marker.x, anchorY, marker.z);
    ndc.project(camera);

    if (Math.abs(ndc.z) > 1) {
      el.style.visibility = "hidden";
      return;
    }

    const x = (ndc.x * 0.5 + 0.5) * size.width;
    const y = (-ndc.y * 0.5 + 0.5) * size.height;

    el.style.visibility = "visible";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });

  return null;
}
