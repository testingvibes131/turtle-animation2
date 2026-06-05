/** Shared turtle mark for Command Center feature canvases. */

export const COMMAND_CENTER_TURTLE_SRC = "/cards/turtle.png";
export const COMMAND_CENTER_TURTLE_WIDTH = 80;
export const COMMAND_CENTER_TURTLE_HEIGHT = 80;
export const COMMAND_CENTER_TURTLE_HALF_EXTENT = Math.max(
  COMMAND_CENTER_TURTLE_WIDTH / 2,
  COMMAND_CENTER_TURTLE_HEIGHT / 2,
);

let turtleImage: HTMLImageElement | null = null;
let loadStarted = false;

export function loadCommandCenterTurtleImage() {
  if (loadStarted || typeof window === "undefined") return;
  loadStarted = true;

  const img = new Image();
  img.decoding = "async";
  img.src = COMMAND_CENTER_TURTLE_SRC;
  img.onload = () => {
    turtleImage = img;
  };
}

export function isCommandCenterTurtleImageReady() {
  return (
    turtleImage !== null &&
    turtleImage.complete &&
    turtleImage.naturalWidth > 0
  );
}

/** Draw centered; returns false until the image has loaded. */
export function drawCommandCenterTurtleMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width = COMMAND_CENTER_TURTLE_WIDTH,
  height = COMMAND_CENTER_TURTLE_HEIGHT,
) {
  if (!isCommandCenterTurtleImageReady() || !turtleImage) return false;

  ctx.drawImage(
    turtleImage,
    x - width / 2,
    y - height / 2,
    width,
    height,
  );
  return true;
}
