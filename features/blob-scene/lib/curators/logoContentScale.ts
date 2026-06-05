import * as THREE from "three";
import { CURATORS } from "@/features/blob-scene/lib/curators/catalog";
import { curatorLogoPath } from "@/features/blob-scene/lib/curators/logo";

const ALPHA_THRESHOLD = 24;
const scaleByCurator = new Map<string, number>();
let preloadPromise: Promise<void> | null = null;

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function alphaBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3]!;
      if (a < ALPHA_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

function measureFillFromImage(image: CanvasImageSource): number {
  const size = image as { width: number; height: number };
  const width = size.width;
  const height = size.height;
  if (width < 1 || height < 1) return 1;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 1;

  ctx.drawImage(image, 0, 0, width, height);
  const bounds = alphaBounds(
    ctx.getImageData(0, 0, width, height).data,
    width,
    height,
  );
  if (!bounds) return 1;

  const contentW = bounds.maxX - bounds.minX + 1;
  const contentH = bounds.maxY - bounds.minY + 1;
  const fill = Math.max(contentW / width, contentH / height);
  return fill > 0.02 ? 1 / fill : 1;
}

function measureFillFromTexture(texture: THREE.Texture): number {
  const image = texture.image as CanvasImageSource | undefined;
  if (!image) return 1;
  return measureFillFromImage(image);
}

/** Preload once so every curator logo gets a consistent on-screen size. */
export function preloadLogoDisplayScales(): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = Promise.all(
    CURATORS.map(
      (curator) =>
        new Promise<{ name: string; raw: number }>((resolve) => {
          const path = curatorLogoPath(curator.name);
          const img = new Image();
          img.onload = () => {
            const tex = new THREE.Texture(img);
            tex.needsUpdate = true;
            const raw = measureFillFromTexture(tex);
            tex.dispose();
            resolve({ name: curator.name, raw });
          };
          img.onerror = () => resolve({ name: curator.name, raw: 1 });
          img.src = path;
        }),
    ),
  ).then((results) => {
    const raws = results.map((r) => r.raw);
    const mean = raws.reduce((a, b) => a + b, 0) / Math.max(raws.length, 1);

    for (const { name, raw } of results) {
      const curator = CURATORS.find((c) => c.name === name);
      const tuned = mean > 0 ? (raw / mean) * (curator?.logoScale ?? 1) : raw;
      scaleByCurator.set(name, tuned);
    }
  });

  return preloadPromise;
}

export function getLogoDisplayScale(curatorName: string): number {
  return scaleByCurator.get(curatorName) ?? 1;
}

/** Fit texture inside a square plane without stretching (object-fit: contain). */
export function applySquareContainMap(texture: THREE.Texture): void {
  const image = texture.image as { width?: number; height?: number } | undefined;
  const w = image?.width ?? 1;
  const h = image?.height ?? 1;
  const texAspect = w / Math.max(h, 1);

  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.center.set(0.5, 0.5);
  texture.rotation = 0;

  if (texAspect >= 1) {
    texture.repeat.set(1, 1 / texAspect);
    texture.offset.set(0, (1 - 1 / texAspect) * 0.5);
  } else {
    texture.repeat.set(texAspect, 1);
    texture.offset.set((1 - texAspect) * 0.5, 0);
  }

  texture.needsUpdate = true;
}

/** Live measure for a loaded drei texture (fallback if preload missed). */
export function logoContentFillScale(
  texture: THREE.Texture,
  cacheKey: string,
): number {
  const cached = scaleByCurator.get(cacheKey);
  if (cached !== undefined) return cached;

  const image = texture.image as HTMLImageElement | undefined;
  if (!image?.complete || image.naturalWidth < 1) return 1;

  const scale = measureFillFromTexture(texture);
  scaleByCurator.set(cacheKey, scale);
  return scale;
}
