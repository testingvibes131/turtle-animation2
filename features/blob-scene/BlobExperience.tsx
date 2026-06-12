"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { BlobSceneShell } from "@/features/blob-scene/components/blob/BlobSceneShell";
import { useBlobInteractionEnabled } from "@/features/blob-scene/context/BlobScrollProgressContext";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import { preloadLogoDisplayScales } from "@/features/blob-scene/lib/curators/logoContentScale";
import {
  BLOB_CAMERA_FOV,
  BLOB_CAMERA_POSITION,
} from "@/features/blob-scene/lib/geometry/blobViewportOffset";

const MOBILE_VIEWPORT_QUERY = "(max-width: 1023px)";

/** Safari (WebKit) can't hold 60fps on the blob at dpr 2 + MSAA once the
 *  viewport gets fullscreen-sized — the node drift visibly judders (measured
 *  ~22ms/frame vs Chrome's locked 16.7ms on identical hardware). Above this
 *  css-pixel area Safari drops to dpr 1.5; it also always skips MSAA (the
 *  ~12px sphere nodes don't visibly benefit). Verified visually equivalent. */
const SAFARI_DPR_CAP_AREA_PX = 1_700_000;
const SAFARI_LARGE_VIEWPORT_DPR = 1.5;

const isSafariBrowser = () =>
  /safari/i.test(navigator.userAgent) &&
  !/chrome|chromium|crios|android/i.test(navigator.userAgent);

export function BlobScene({ params }: { params: BlobVisualParams }) {
  const interactionEnabled = useBlobInteractionEnabled();
  const [dpr, setDpr] = useState<number | [number, number]>(1);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const safari = isSafariBrowser();
    const sync = () => {
      if (mq.matches) {
        setDpr(1);
        return;
      }
      const area = window.innerWidth * window.innerHeight;
      setDpr(
        safari && area >= SAFARI_DPR_CAP_AREA_PX
          ? SAFARI_LARGE_VIEWPORT_DPR
          : [1, 2],
      );
    };
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // Safari always renders without MSAA (see SAFARI_DPR_CAP_AREA_PX note).
  const noAA = typeof window !== "undefined" && isSafariBrowser();

  return (
    <Canvas
      className={[
        "relative z-0 h-full w-full touch-none",
        interactionEnabled
          ? "pointer-events-none lg:pointer-events-auto"
          : "pointer-events-none",
      ].join(" ")}
      style={interactionEnabled ? undefined : { pointerEvents: "none" }}
      camera={{
        position: BLOB_CAMERA_POSITION,
        fov: BLOB_CAMERA_FOV,
        near: 0.1,
        far: 100,
      }}
      dpr={dpr}
      gl={{ antialias: !noAA, alpha: true }}
    >
      <BlobSceneShell params={params} />
    </Canvas>
  );
}

export function BlobExperience({ params }: { params: BlobVisualParams }) {
  useEffect(() => {
    void preloadLogoDisplayScales();
  }, []);

  return <BlobScene params={params} />;
}
