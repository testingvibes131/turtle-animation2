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

export function BlobScene({ params }: { params: BlobVisualParams }) {
  const interactionEnabled = useBlobInteractionEnabled();
  const [dpr, setDpr] = useState<number | [number, number]>(1);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const sync = () => {
      setDpr(mq.matches ? 1 : [1, 2]);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
      gl={{ antialias: true, alpha: false }}
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
