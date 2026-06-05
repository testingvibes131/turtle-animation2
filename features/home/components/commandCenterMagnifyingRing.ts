/** Magnifying / alert assets for Command Center canvases. */

export const COMMAND_CENTER_MAGNIFYING_SRC = "/cards/glass.png";
export const COMMAND_CENTER_ALERT_GREEN_SRC = "/cards/turtle-alert-green.png";
export const COMMAND_CENTER_ALERT_RED_SRC = "/cards/turtle-alert-red.png";

export type CommandCenterAlertHighlightColor = "green" | "red";

let magnifyingImage: HTMLImageElement | null = null;
let alertGreenImage: HTMLImageElement | null = null;
let alertRedImage: HTMLImageElement | null = null;
let loadStarted = false;
let alertGreenLoadStarted = false;
let alertRedLoadStarted = false;

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

export function loadCommandCenterAlertDotImage() {
  if (!alertGreenLoadStarted && typeof window !== "undefined") {
    alertGreenLoadStarted = true;
    const green = new Image();
    alertGreenImage = green;
    green.decoding = "async";
    green.onload = () => {
      alertGreenImage = green;
    };
    green.onerror = () => {
      alertGreenLoadStarted = false;
      alertGreenImage = null;
    };
    green.src = COMMAND_CENTER_ALERT_GREEN_SRC;
  }

  if (!alertRedLoadStarted && typeof window !== "undefined") {
    alertRedLoadStarted = true;
    const red = new Image();
    alertRedImage = red;
    red.decoding = "async";
    red.onload = () => {
      alertRedImage = red;
    };
    red.onerror = () => {
      alertRedLoadStarted = false;
      alertRedImage = null;
    };
    red.src = COMMAND_CENTER_ALERT_RED_SRC;
  }
}

function isAlertImageReady(img: HTMLImageElement | null) {
  return img !== null && img.complete && img.naturalWidth > 0;
}

export function isCommandCenterAlertDotImageReady(
  color: CommandCenterAlertHighlightColor,
) {
  return color === "green"
    ? isAlertImageReady(alertGreenImage)
    : isAlertImageReady(alertRedImage);
}

/** Draw centered; `diameter` matches the grid dot size. */
export function drawCommandCenterAlertDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  diameter: number,
  alpha = 1,
  color: CommandCenterAlertHighlightColor = "green",
) {
  const img = color === "green" ? alertGreenImage : alertRedImage;
  if (!isCommandCenterAlertDotImageReady(color) || !img) {
    return false;
  }

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(img, x - diameter / 2, y - diameter / 2, diameter, diameter);
  ctx.restore();
  return true;
}
