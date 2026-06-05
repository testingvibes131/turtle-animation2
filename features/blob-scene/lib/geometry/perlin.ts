/**
 * 3D Perlin noise for vertex displacement (tutorial-style blob).
 * @see https://waelyasmina.net/articles/how-to-create-a-3d-audio-visualizer-using-three-js/
 */

const PERM = new Uint8Array(512);

(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Deterministic shuffle (seeded)
  let seed = 42;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    const tmp = p[i]!;
    p[i] = p[j]!;
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]!;
})();

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** Unit-ish 3D Perlin sample in roughly [-1, 1]. */
export function samplePerlin3(x: number, y: number, z: number): number {
  return perlin3(x, y, z);
}

function perlin3(x: number, y: number, z: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const zi = Math.floor(z) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const zf = z - Math.floor(z);
  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);

  const aaa = PERM[PERM[PERM[xi]! + yi]! + zi]!;
  const aba = PERM[PERM[PERM[xi]! + yi + 1]! + zi]!;
  const aab = PERM[PERM[PERM[xi]! + yi]! + zi + 1]!;
  const abb = PERM[PERM[PERM[xi]! + yi + 1]! + zi + 1]!;
  const baa = PERM[PERM[PERM[xi + 1]! + yi]! + zi]!;
  const bba = PERM[PERM[PERM[xi + 1]! + yi + 1]! + zi]!;
  const bab = PERM[PERM[PERM[xi + 1]! + yi]! + zi + 1]!;
  const bbb = PERM[PERM[PERM[xi + 1]! + yi + 1]! + zi + 1]!;

  return lerp(
    w,
    lerp(
      v,
      lerp(u, grad(aaa, xf, yf, zf), grad(baa, xf - 1, yf, zf)),
      lerp(u, grad(aba, xf, yf - 1, zf), grad(bba, xf - 1, yf - 1, zf)),
    ),
    lerp(
      v,
      lerp(
        u,
        grad(aab, xf, yf, zf - 1),
        grad(bab, xf - 1, yf, zf - 1),
      ),
      lerp(
        u,
        grad(abb, xf, yf - 1, zf - 1),
        grad(bbb, xf - 1, yf - 1, zf - 1),
      ),
    ),
  );
}

/**
 * `noiseScale * pnoise(position + time, period) / displacementDivisor`
 * as in the audio visualizer tutorial.
 */
export function perlinDisplacement(
  x: number,
  y: number,
  z: number,
  time: number,
  noiseScale: number,
  displacementDivisor: number,
  perlinPeriod: number,
): number {
  const px = (x + time) / perlinPeriod;
  const py = (y + time) / perlinPeriod;
  const pz = (z + time) / perlinPeriod;
  return (noiseScale * perlin3(px, py, pz)) / displacementDivisor;
}
