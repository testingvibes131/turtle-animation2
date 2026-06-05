import * as THREE from "three";

/** Radial alpha falloff — matches chart/command-center soft spark (no runtime blur). */
export function createColoredSparkTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("createColoredSparkTexture: 2d context unavailable");
  }

  const center = size * 0.5;
  const radius = size * 0.5;
  const gradient = ctx.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    radius,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.28, "rgba(255,255,255,0.78)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.46)");
  gradient.addColorStop(0.8, "rgba(255,255,255,0.16)");
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
