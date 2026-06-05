"use client";

import { Leva } from "leva";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Leva panel portaled to body for correct stacking above page UI. */
export function BlobLevaPanel() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <Leva oneLineLabels titleBar={{ title: "Blob" }} />,
    document.body,
  );
}
