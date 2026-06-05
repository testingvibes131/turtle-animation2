import * as THREE from "three";

/** Soft radial bloom — wide falloff, no runtime blur. */
export function createColoredSparkTexture(size = 96): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("createColoredSparkTexture: 2d context unavailable");
  }

  const center = size * 0.5;
  const outer = size * 0.5;
  const inner = outer * 0.1;
  const gradient = ctx.createRadialGradient(
    center,
    center,
    inner,
    center,
    center,
    outer,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.52)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.44)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.3)");
  gradient.addColorStop(0.62, "rgba(255,255,255,0.16)");
  gradient.addColorStop(0.82, "rgba(255,255,255,0.06)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
