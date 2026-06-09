/** Prefer desynchronized on WebKit — can fix blank 2D layers beside WebGL. */
export function getCommandCenterCanvasContext(canvas: HTMLCanvasElement) {
  return (
    canvas.getContext("2d", { alpha: true, desynchronized: true }) ??
    canvas.getContext("2d", { alpha: true }) ??
    canvas.getContext("2d")
  );
}
