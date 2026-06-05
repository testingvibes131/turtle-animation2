/**
 * Section 1 hero — soft membrane-like displacement.
 *
 * Three layers:
 * 1. Direction fBm — large coherent lobes (cell / amoeba silhouette)
 * 2. Gentle domain warp — slow flowing folds, not turbulent chaos
 * 3. Light detail — subtle surface grain at low weight
 */

const F3 = 1 / 3;
const G3 = 1 / 6;

const GRAD3 = new Float32Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0,
  -1, 0, 1, 1, 0, -1, -1, 0, 1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
]);

const PERM = new Uint8Array(512);
const PERM_MOD12 = new Uint8Array(512);

(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let seed = 91;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    const tmp = p[i]!;
    p[i] = p[j]!;
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255]!;
    PERM_MOD12[i] = PERM[i]! % 12;
  }
})();

function dot3(g: number, x: number, y: number, z: number): number {
  return GRAD3[g * 3]! * x + GRAD3[g * 3 + 1]! * y + GRAD3[g * 3 + 2]! * z;
}

function simplex3(xin: number, yin: number, zin: number): number {
  const s = (xin + yin + zin) * F3;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const k = Math.floor(zin + s);

  const t = (i + j + k) * G3;
  const x0 = xin - (i - t);
  const y0 = yin - (j - t);
  const z0 = zin - (k - t);

  let i1: number;
  let j1: number;
  let k1: number;
  let i2: number;
  let j2: number;
  let k2: number;

  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1;
      j1 = 0;
      k1 = 0;
      i2 = 1;
      j2 = 1;
      k2 = 0;
    } else if (x0 >= z0) {
      i1 = 1;
      j1 = 0;
      k1 = 0;
      i2 = 1;
      j2 = 0;
      k2 = 1;
    } else {
      i1 = 0;
      j1 = 0;
      k1 = 1;
      i2 = 1;
      j2 = 0;
      k2 = 1;
    }
  } else if (y0 < z0) {
    i1 = 0;
    j1 = 0;
    k1 = 1;
    i2 = 0;
    j2 = 1;
    k2 = 1;
  } else if (x0 < z0) {
    i1 = 0;
    j1 = 1;
    k1 = 0;
    i2 = 0;
    j2 = 1;
    k2 = 1;
  } else {
    i1 = 0;
    j1 = 1;
    k1 = 0;
    i2 = 1;
    j2 = 1;
    k2 = 0;
  }

  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2 * G3;
  const y2 = y0 - j2 + 2 * G3;
  const z2 = z0 - k2 + 2 * G3;
  const x3 = x0 - 1 + 3 * G3;
  const y3 = y0 - 1 + 3 * G3;
  const z3 = z0 - 1 + 3 * G3;

  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;

  let n0 = 0;
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 > 0) {
    t0 *= t0;
    n0 =
      t0 *
      t0 *
      dot3(PERM_MOD12[ii + PERM[jj + PERM[kk]!]!]!, x0, y0, z0);
  }

  let n1 = 0;
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 > 0) {
    t1 *= t1;
    n1 =
      t1 *
      t1 *
      dot3(
        PERM_MOD12[ii + i1 + PERM[jj + j1 + PERM[kk + k1]!]!]!,
        x1,
        y1,
        z1,
      );
  }

  let n2 = 0;
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 > 0) {
    t2 *= t2;
    n2 =
      t2 *
      t2 *
      dot3(
        PERM_MOD12[ii + i2 + PERM[jj + j2 + PERM[kk + k2]!]!]!,
        x2,
        y2,
        z2,
      );
  }

  let n3 = 0;
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 > 0) {
    t3 *= t3;
    n3 =
      t3 *
      t3 *
      dot3(PERM_MOD12[ii + 1 + PERM[jj + 1 + PERM[kk + 1]!]!]!, x3, y3, z3);
  }

  return 32 * (n0 + n1 + n2 + n3);
}

function fbm3(
  x: number,
  y: number,
  z: number,
  octaves = 4,
  lacunarity = 1.85,
  gain = 0.44,
): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let o = 0; o < octaves; o++) {
    value += amplitude * simplex3(x * frequency, y * frequency, z * frequency);
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value;
}

/** Large lobes that wrap the sphere coherently (membrane body). */
function directionBody(
  x: number,
  y: number,
  z: number,
  time: number,
  scale: number,
): number {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  const nx = x / len;
  const ny = y / len;
  const nz = z / len;

  const drift = time * 0.18;
  const cosA = Math.cos(drift);
  const sinA = Math.sin(drift);
  const rx = nx * cosA - nz * sinA;
  const rz = nx * sinA + nz * cosA;

  const bodyScale = scale * 0.72;
  return fbm3(
    rx * bodyScale + 1.4,
    ny * bodyScale + 0.6,
    rz * bodyScale + 2.2,
    3,
    1.68,
    0.4,
  );
}

export type OrganicDisplacementTuning = {
  bodyWeight?: number;
  flowWeight?: number;
  warp?: number;
  ampMul?: number;
};

/**
 * Soft organic displacement — membrane body + gentle flow.
 */
export function organicDisplacement(
  x: number,
  y: number,
  z: number,
  time: number,
  noiseScale: number,
  displacementDivisor: number,
  perlinPeriod: number,
  tuning: OrganicDisplacementTuning = {},
): number {
  const bodyWeight = tuning.bodyWeight ?? 0.8;
  const flowWeight = tuning.flowWeight ?? 0.2;
  const warpStr = tuning.warp ?? 0.22;
  const ampMul = tuning.ampMul ?? 1.08;
  const scale = 1 / Math.max(perlinPeriod, 0.001);
  const px = x * scale;
  const py = y * scale;
  const pz = z * scale;

  const body = directionBody(x, y, z, time, scale);

  const flowT = time * 0.2;
  const p0x = px + flowT * 0.48;
  const p0y = py + flowT * 0.32;
  const p0z = pz + flowT * 0.42;

  const qx = fbm3(p0x, p0y, p0z, 3, 1.78, 0.42);
  const qy = fbm3(p0x + 3.7, p0y + 1.2, p0z + 2.8, 3, 1.78, 0.42);
  const qz = fbm3(p0x + 1.1, p0y + 5.4, p0z + 4.1, 3, 1.78, 0.42);

  const wx = p0x + warpStr * qx;
  const wy = p0y + warpStr * qy;
  const wz = p0z + warpStr * qz;
  const flow = fbm3(wx, wy, wz, 3, 1.75, 0.4);

  const disp = body * bodyWeight + flow * flowWeight;

  return (noiseScale * disp * ampMul) / Math.max(displacementDivisor, 0.001);
}
