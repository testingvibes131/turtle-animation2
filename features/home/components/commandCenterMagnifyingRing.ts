/** Magnifying dashed ring for the alerts modifier zone. */

export const COMMAND_CENTER_MAGNIFYING_SRC = "/cards/glass.png";

let magnifyingImage: HTMLImageElement | null = null;
let loadStarted = false;

export function loadCommandCenterMagnifyingImage() {
  if (loadStarted || typeof window === "undefined") return;
  loadStarted = true;

  const img = new Image();
  img.decoding = "async";
  img.src = COMMAND_CENTER_MAGNIFYING_SRC;
  img.onload = () => {
    magnifyingImage = img;
  };
}

export function isCommandCenterMagnifyingImageReady() {
  return (
    magnifyingImage !== null &&
    magnifyingImage.complete &&
    magnifyingImage.naturalWidth > 0
  );
}

/** Draw centered; `diameter` matches the modifier zone width. */
export function drawCommandCenterMagnifyingRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  diameter: number,
) {
  if (!isCommandCenterMagnifyingImageReady() || !magnifyingImage) return false;

  ctx.drawImage(
    magnifyingImage,
    x - diameter / 2,
    y - diameter / 2,
    diameter,
    diameter,
  );
  return true;
}
