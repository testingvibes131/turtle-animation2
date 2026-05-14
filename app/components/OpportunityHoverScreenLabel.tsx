"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { DM_Sans, Montserrat } from "next/font/google";
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { PackedMarker } from "@/app/lib/opportunityCirclePack";
import {
  featuredSceneOffset,
  type FeaturedAprRange,
} from "@/app/lib/featuredSceneOffset";

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

/** Above drei `<Html>` curator labels (~1.68e7) and `HOVER_PORTAL_Z`. */
const LABEL_CLASS =
  "pointer-events-none absolute z-[180000001] flex max-w-[min(280px,42vw)] -translate-x-1/2 -translate-y-[calc(100%+10px)] items-start gap-2 rounded-[10px] bg-[#141514] px-3 py-2 text-[14px] leading-snug shadow-lg";

const LABEL_ICON_CLASS = "h-[14px] w-[14px] shrink-0 select-none";

const LABEL_COL_CLASS = "flex min-w-0 flex-col gap-0.5";

const LABEL_NAME_CLASS = "min-w-0 truncate font-semibold text-[#f9f9f9]";

const LABEL_APR_CLASS =
  "text-[12px] font-medium tabular-nums text-[#73f36c]";

function hoverLabelWorldY(marker: PackedMarker): number {
  const highlightR = marker.size * RADIUS_SCALE * HIGHLIGHT_SCALE;
  return highlightR + 0.55;
}

type OpportunityHoverScreenLabelProps = {
  marker: PackedMarker | null;
  /** DOM node above the WebGL layer (sibling after &lt;Canvas&gt;). */
  portalEl: HTMLDivElement | null;
  featuresBlendRef: MutableRefObject<number>;
  featuredAprRange: FeaturedAprRange;
  /** When true, show APY line; when false, name only (all spheres hoverable). */
  featuresEnabled: boolean;
};

/**
 * Screen-space HTML/CSS label (no drei Html). R3F must not see a host &lt;div&gt;
 * in the return tree — we append a real DOM node to `portalEl` instead.
 */
export function OpportunityHoverScreenLabel({
  marker,
  portalEl,
  featuresBlendRef,
  featuredAprRange,
  featuresEnabled,
}: OpportunityHoverScreenLabelProps) {
  const { camera, size } = useThree();
  const ndc = useMemo(() => new THREE.Vector3(), []);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLSpanElement | null>(null);
  const aprRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!portalEl) {
      labelRef.current = null;
      nameRef.current = null;
      aprRef.current = null;
      return;
    }

    const el = document.createElement("div");
    el.className = `${LABEL_CLASS} ${dmSans.className} ${montserrat.className}`;
    el.style.overflow = "hidden";
    el.style.pointerEvents = "none";
    el.style.visibility = "hidden";

    const icon = document.createElement("img");
    icon.src = "/green.svg";
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    icon.draggable = false;
    icon.className = LABEL_ICON_CLASS;

    const col = document.createElement("div");
    col.className = LABEL_COL_CLASS;

    const name = document.createElement("span");
    name.className = LABEL_NAME_CLASS;

    const apr = document.createElement("span");
    apr.className = LABEL_APR_CLASS;

    col.appendChild(name);
    col.appendChild(apr);
    el.appendChild(icon);
    el.appendChild(col);

    portalEl.appendChild(el);
    labelRef.current = el;
    nameRef.current = name;
    aprRef.current = apr;

    return () => {
      labelRef.current = null;
      nameRef.current = null;
      aprRef.current = null;
      if (el.parentNode === portalEl) {
        portalEl.removeChild(el);
      }
    };
  }, [portalEl]);

  useEffect(() => {
    const name = nameRef.current;
    const apr = aprRef.current;
    if (!name || !apr) return;
    if (!marker) {
      name.textContent = "";
      apr.textContent = "";
      apr.style.display = "none";
      return;
    }
    name.textContent = marker.name;
    if (featuresEnabled) {
      apr.textContent = `${marker.estAprPercent.toFixed(2)}% APY`;
      apr.style.display = "";
    } else {
      apr.textContent = "";
      apr.style.display = "none";
    }
  }, [marker, portalEl, featuresEnabled]);

  useFrame(() => {
    const el = labelRef.current;
    if (!el) return;

    if (!marker) {
      el.style.visibility = "hidden";
      return;
    }

    const b = featuresBlendRef.current;
    const { ox, oy, oz } = featuredSceneOffset(marker, b, featuredAprRange);
    ndc.set(
      marker.x + ox,
      oy + hoverLabelWorldY(marker),
      marker.z + oz,
    );
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
