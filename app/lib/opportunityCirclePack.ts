import {
  isDustTvl,
  type OpportunityRow,
} from "@/app/lib/opportunitiesCsv";

/** Matches instanced mesh scale in OpportunitiesField (visual footprint). */
const RADIUS_SCALE = 0.34;

export type PackedMarker = {
  id: string;
  name: string;
  x: number;
  z: number;
  size: number;
  dust: boolean;
};

export type PackedCuratorLabel = {
  curator: string;
  lx: number;
  lz: number;
};

/** Macro packing disk used for collision (world XZ, y ignored). */
export type CuratorPackZone = {
  x: number;
  z: number;
  r: number;
};

export type OpportunitiesCirclePackLayout = {
  markers: PackedMarker[];
  curatorLabels: PackedCuratorLabel[];
  extent: number;
  curatorPackZones: CuratorPackZone[];
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Deterministic [0, 1) from string + salt. */
function rnd(key: string, salt: number): number {
  const x = Math.sin((hashString(`${key}:${salt}`) >>> 0) * 0.0001) * 10000;
  return x - Math.floor(x);
}

function curatorKey(row: OpportunityRow): string {
  const c = row.curator.trim();
  return c.length > 0 ? c : "Uncurated";
}

/** Collision radius ≈ rendered sphere radius in XZ (tiny epsilon so disks are tangent). */
export function opportunityPackDiskRadius(size: number): number {
  return size * RADIUS_SCALE + 0.014;
}

/** Minimum center–center slack between opportunity pack disks (almost tangent). */
const MICRO_GAP = 0.66;
/** Slack between curator macro disks during overlap relaxation (almost tangent). */
const MACRO_GAP = 1.82;
const CURATOR_LABEL_BELOW = 2.35;

type Vec2 = { x: number; z: number };

function resolveOverlap(
  a: Vec2,
  b: Vec2,
  ra: number,
  rb: number,
  gap: number,
  strength: number,
): void {
  let dx = b.x - a.x;
  let dz = b.z - a.z;
  let d = Math.hypot(dx, dz);
  const minD = ra + rb + gap;
  if (d >= minD) return;
  if (d < 1e-7) {
    const ang = rnd(`${a.x},${b.z}`, 7) * Math.PI * 2;
    dx = Math.cos(ang) * 0.04;
    dz = Math.sin(ang) * 0.04;
    d = 0.04;
  }
  const push = ((minD - d) / d) * strength;
  const ux = dx * push;
  const uz = dz * push;
  a.x -= ux;
  a.z -= uz;
  b.x += ux;
  b.z += uz;
}

/** Worst center–center penetration depth (0 = all pairs respect gap). */
function maxPenetration(pos: Vec2[], radii: number[], gap: number): number {
  let worst = 0;
  const n = pos.length;
  for (let i = 0; i < n; i++) {
    const pi = pos[i]!;
    const ri = radii[i]!;
    for (let j = i + 1; j < n; j++) {
      const pj = pos[j]!;
      const d = Math.hypot(pj.x - pi.x, pj.z - pi.z);
      const need = ri + radii[j]! + gap;
      if (d < need) worst = Math.max(worst, need - d);
    }
  }
  return worst;
}

/** Like `resolveOverlap`, but larger disk moves less (keeps hub stable). */
function resolveOverlapBiased(
  a: Vec2,
  b: Vec2,
  ra: number,
  rb: number,
  gap: number,
  strength: number,
): void {
  let dx = b.x - a.x;
  let dz = b.z - a.z;
  let d = Math.hypot(dx, dz);
  const minD = ra + rb + gap;
  if (d >= minD) return;
  if (d < 1e-7) {
    const ang = rnd(`${a.x},${b.z}`, 7) * Math.PI * 2;
    dx = Math.cos(ang) * 0.04;
    dz = Math.sin(ang) * 0.04;
    d = 0.04;
  }
  const push = ((minD - d) / d) * strength;
  const ux = dx * push;
  const uz = dz * push;
  const den = ra + rb + 1e-9;
  const wA = rb / den;
  const wB = ra / den;
  a.x -= ux * 2 * wA;
  a.z -= uz * 2 * wA;
  b.x += ux * 2 * wB;
  b.z += uz * 2 * wB;
}

/** Hub `a` fixed; only `b` moves to clear overlap (index 0 pinned). */
function resolveOverlapFixedA(
  a: Vec2,
  b: Vec2,
  ra: number,
  rb: number,
  gap: number,
  strength: number,
): void {
  let dx = b.x - a.x;
  let dz = b.z - a.z;
  let d = Math.hypot(dx, dz);
  const minD = ra + rb + gap;
  if (d >= minD) return;
  if (d < 1e-7) {
    const ang = rnd(`${a.x},${b.z}`, 13) * Math.PI * 2;
    dx = Math.cos(ang) * 0.04;
    dz = Math.sin(ang) * 0.04;
    d = 0.04;
  }
  const mag = (minD - d) * strength;
  b.x += (dx / d) * mag;
  b.z += (dz / d) * mag;
}

function relaxDiskPair(
  pos: Vec2[],
  radii: number[],
  i: number,
  j: number,
  gap: number,
  strength: number,
): void {
  if (i === j) return;
  if (i === 0) {
    resolveOverlapFixedA(
      pos[0]!,
      pos[j]!,
      radii[0]!,
      radii[j]!,
      gap,
      strength,
    );
  } else if (j === 0) {
    resolveOverlapFixedA(
      pos[0]!,
      pos[i]!,
      radii[0]!,
      radii[i]!,
      gap,
      strength,
    );
  } else {
    resolveOverlapBiased(
      pos[i]!,
      pos[j]!,
      radii[i]!,
      radii[j]!,
      gap,
      strength,
    );
  }
}

/**
 * Macro: largest-first by **footprint**. Disk 0 at origin. Each next disk: first
 * valid slot on rings around the **weighted centroid** of already placed disks
 * (r² weights), so growth hugs the heavy core instead of sneaking small packs
 * under global (0,0).
 */
function packMacroDisksIncremental(
  centers: Vec2[],
  macroR: number[],
  k: number,
  seedKey: string,
): void {
  if (k <= 0) return;
  centers[0] = { x: 0, z: 0 };
  if (k === 1) return;

  const DR = 0.032;
  const phase0 = rnd(seedKey, 42) * Math.PI * 2;

  for (let i = 1; i < k; i++) {
    const ri = macroR[i]!;
    let sw = 0;
    let cmx = 0;
    let cmz = 0;
    for (let j = 0; j < i; j++) {
      const w = macroR[j]! * macroR[j]!;
      cmx += centers[j]!.x * w;
      cmz += centers[j]!.z * w;
      sw += w;
    }
    if (sw > 1e-12) {
      cmx /= sw;
      cmz /= sw;
    }

    const phase = phase0 + rnd(seedKey, 50 + i) * 0.65;
    const maxRings = Math.min(
      720,
      Math.ceil(18 + i * 12 + (macroR[0] ?? 6) * 5.5),
    );
    let placed = false;

    for (let ring = 0; ring < maxRings && !placed; ring++) {
      const r = ring * DR;
      const nAng =
        r < 1e-9
          ? 1
          : Math.max(
              10,
              Math.min(100, Math.ceil((2 * Math.PI * r) / (DR * 0.92))),
            );

      for (let a = 0; a < nAng && !placed; a++) {
        const ang = phase + (a / nAng) * (Math.PI * 2);
        const cx = cmx + Math.cos(ang) * r;
        const cz = cmz + Math.sin(ang) * r;

        let ok = true;
        for (let j = 0; j < i; j++) {
          const dx = cx - centers[j]!.x;
          const dz = cz - centers[j]!.z;
          const need = ri + macroR[j]! + MACRO_GAP;
          if (Math.hypot(dx, dz) < need - 1e-7) {
            ok = false;
            break;
          }
        }
        if (ok) {
          centers[i] = { x: cx, z: cz };
          placed = true;
        }
      }
    }

    if (!placed) {
      const fa = rnd(seedKey, 28000 + i) * Math.PI * 2;
      const rr = 5 + i * 0.5 + (macroR[0] ?? 6) * 0.15;
      centers[i] = {
        x: cmx + Math.cos(fa) * rr,
        z: cmz + Math.sin(fa) * rr,
      };
    }
  }
}

/**
 * Per-curator micro packing: tight overlapping disk seed + symmetric repulsion.
 * (Hub / footprint–centric placement applies only to **macro** curator blobs.)
 */
function packClusterDisks(radii: number[], seedKey: string): Vec2[] {
  const n = radii.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, z: 0 }];

  let sumR = 0;
  let maxRi = radii[0]!;
  for (const r of radii) {
    sumR += r;
    maxRi = Math.max(maxRi, r);
  }

  const meanR = sumR / n;
  const seedR = Math.min(maxRi * 0.48, meanR * 0.88, 2.5);

  const pos: Vec2[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const u = rnd(seedKey, i * 3 + 1);
    const v = rnd(seedKey, i * 3 + 2);
    const rr = seedR * Math.sqrt(u);
    const ang = v * Math.PI * 2;
    pos[i] = { x: Math.cos(ang) * rr, z: Math.sin(ang) * rr };
  }

  const MIN_ITERS = 8;
  const MAX_ITERS = 170;
  const pairsPerIter =
    n <= 60
      ? (n * (n - 1)) / 2
      : Math.min(9000, Math.max(48 * n, 4000));
  const strength = 0.58;
  const checkEvery = n <= 70 ? 3 : 5;
  const tol = 2.8e-4;

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    if (n <= 60) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          resolveOverlap(
            pos[i]!,
            pos[j]!,
            radii[i]!,
            radii[j]!,
            MICRO_GAP,
            strength,
          );
        }
      }
    } else {
      for (let p = 0; p < pairsPerIter; p++) {
        const i = Math.floor(rnd(seedKey, iter * 100000 + p) * n);
        let j = Math.floor(rnd(seedKey, iter * 100000 + p + 7777) * n);
        if (j === i) j = (j + 1) % n;
        resolveOverlap(
          pos[i]!,
          pos[j]!,
          radii[i]!,
          radii[j]!,
          MICRO_GAP,
          strength,
        );
      }
    }

    if (
      iter + 1 >= MIN_ITERS &&
      (iter + 1) % checkEvery === 0 &&
      maxPenetration(pos, radii, MICRO_GAP) < tol
    ) {
      break;
    }
  }

  let mx = 0;
  let mz = 0;
  for (let i = 0; i < n; i++) {
    mx += pos[i]!.x;
    mz += pos[i]!.z;
  }
  mx /= n;
  mz /= n;
  for (let i = 0; i < n; i++) {
    pos[i]!.x -= mx;
    pos[i]!.z -= mz;
  }

  return pos;
}

function clusterFootprintRadius(pos: Vec2[], radii: number[]): number {
  let m = 6;
  for (let i = 0; i < pos.length; i++) {
    m = Math.max(m, Math.hypot(pos[i]!.x, pos[i]!.z) + radii[i]!);
  }
  return m;
}

type CuratorBlob = {
  curator: string;
  list: OpportunityRow[];
  /** Packed locals (centered). */
  pos: Vec2[];
  radii: number[];
  /** For macro collision + label. */
  footprintR: number;
  sizes: number[];
  dustFlags: boolean[];
};

/**
 * Macro polish: biased separation so large curator disks stay nearer the core.
 */
function relaxMacroBlobs(
  centers: Vec2[],
  radii: number[],
  _canvasAspect: number,
  seed: string,
  opts?: { maxIters?: number; tol?: number },
): void {
  const k = centers.length;
  if (k <= 1) return;

  const MIN_ITERS = 3;
  const MAX_ITERS = opts?.maxIters ?? 72;
  const pairsPerIter =
    k <= 60
      ? (k * (k - 1)) / 2
      : Math.min(9000, Math.max(48 * k, 4000));
  const strength = 0.58;
  const checkEvery = k <= 70 ? 3 : 5;
  const tol = opts?.tol ?? 7e-4;

  for (let iter = 0; iter < MAX_ITERS; iter++) {
    if (k <= 60) {
      for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
          relaxDiskPair(centers, radii, i, j, MACRO_GAP, strength);
        }
      }
    } else {
      for (let p = 0; p < pairsPerIter; p++) {
        const i = Math.floor(rnd(seed, iter * 50000 + p) * k);
        let j = Math.floor(rnd(seed, iter * 50000 + p + 3333) * k);
        if (j === i) j = (j + 1) % k;
        const lo = Math.min(i, j);
        const hi = Math.max(i, j);
        relaxDiskPair(centers, radii, lo, hi, MACRO_GAP, strength);
      }
    }

    if (
      iter + 1 >= MIN_ITERS &&
      (iter + 1) % checkEvery === 0 &&
      maxPenetration(centers, radii, MACRO_GAP) < tol
    ) {
      break;
    }
  }
}

/**
 * Two-level circle packing: curators as disks in the plane, then opportunities
 * inside each curator. Runs once per layout (e.g. on data / aspect change).
 */
export function layoutOpportunitiesCirclePack(
  rows: OpportunityRow[],
  canvasAspect: number,
): OpportunitiesCirclePackLayout {
  const byCurator = new Map<string, OpportunityRow[]>();
  for (const r of rows) {
    const key = curatorKey(r);
    const list = byCurator.get(key) ?? [];
    list.push(r);
    byCurator.set(key, list);
  }

  const entries = [...byCurator.entries()]
    .map(([curator, list]) => ({
      curator,
      list,
      count: list.length,
    }))
    .sort(
      (a, b) =>
        b.count - a.count || a.curator.localeCompare(b.curator),
    );

  const mains = rows.filter((r) => !isDustTvl(r.tvlUsd));
  let logMin = Infinity;
  let logMax = -Infinity;
  for (const r of mains) {
    const L = Math.log10(r.tvlUsd + 1);
    logMin = Math.min(logMin, L);
    logMax = Math.max(logMax, L);
  }
  const logSpan = logMax > logMin ? logMax - logMin : 1;

  function markerSize(r: OpportunityRow): { size: number; dust: boolean } {
    const dust = isDustTvl(r.tvlUsd);
    if (dust) {
      return {
        size: (0.48 + rnd(r.id, 3) * 0.26) * 1.12,
        dust: true,
      };
    }
    const L = Math.log10(r.tvlUsd + 1);
    const t = (L - logMin) / logSpan;
    return {
      size: (1.75 + Math.min(1, Math.max(0, t)) * 5.8) * 1.1,
      dust: false,
    };
  }

  const blobs: CuratorBlob[] = [];

  for (const entry of entries) {
    const sorted = [...entry.list]
      .map((r) => {
        const { size, dust } = markerSize(r);
        return {
          r,
          size,
          dust,
          diskR: opportunityPackDiskRadius(size),
        };
      })
      .sort(
        (a, b) =>
          b.diskR - a.diskR ||
          b.size - a.size ||
          a.r.name.localeCompare(b.r.name),
      );

    const list = sorted.map((x) => x.r);
    const sizes = sorted.map((x) => x.size);
    const dustFlags = sorted.map((x) => x.dust);
    const radii = sorted.map((x) => x.diskR);

    const pos = packClusterDisks(radii, entry.curator);
    let zMax = -Infinity;
    let xReach = 0;
    for (let i = 0; i < pos.length; i++) {
      zMax = Math.max(zMax, pos[i]!.z + radii[i]!);
      xReach = Math.max(xReach, Math.abs(pos[i]!.x) + radii[i]!);
    }
    const labelTipZ = zMax + CURATOR_LABEL_BELOW;
    let footprint = clusterFootprintRadius(pos, radii);
    footprint = Math.max(footprint, labelTipZ, xReach);
    blobs.push({
      curator: entry.curator,
      list,
      pos,
      radii,
      footprintR: footprint,
      sizes,
      dustFlags,
    });
  }

  blobs.sort(
    (a, b) =>
      b.footprintR - a.footprintR ||
      b.list.length - a.list.length ||
      a.curator.localeCompare(b.curator),
  );

  const k = blobs.length;
  const macroR = blobs.map((b) => b.footprintR);
  const centers: Vec2[] = new Array(k);

  packMacroDisksIncremental(centers, macroR, k, "macro-seed");
  relaxMacroBlobs(centers, macroR, canvasAspect, "macro-seed");

  /**
   * Landscape: stretch macro blob centers on **world X** (canvas width) and compress **Z**
   * so the field uses wide viewports better; `sx * sz ≈ 1` keeps overall footprint stable.
   * Portrait: the inverse so spread follows the long canvas dimension.
   */
  const aspect = Math.min(3.2, Math.max(0.45, canvasAspect));
  let sx: number;
  let sz: number;
  if (aspect >= 1) {
    const s = Math.pow(aspect, 0.75);
    sx = s;
    sz = 1 / s;
  } else {
    const s = Math.pow(1 / aspect, 0.75);
    sz = s;
    sx = 1 / s;
  }
  for (let i = 0; i < k; i++) {
    centers[i]!.x *= sx;
    centers[i]!.z *= sz;
  }

  /**
   * Aspect stretch is non-uniform in XZ but disks stay circular — re-relax macro
   * disks so `MACRO_GAP` holds again (especially after Z compression).
   */
  relaxMacroBlobs(centers, macroR, canvasAspect, "macro-post-stretch", {
    maxIters: 140,
    tol: 3.5e-4,
  });

  /** Shift so world origin sits on the **macro disk mass center** (r² weights ≈ area). */
  let mx = 0;
  let mz = 0;
  let tw = 0;
  for (let i = 0; i < k; i++) {
    const r = macroR[i]!;
    const w = r * r;
    mx += centers[i]!.x * w;
    mz += centers[i]!.z * w;
    tw += w;
  }
  if (tw > 0) {
    mx /= tw;
    mz /= tw;
  }
  for (let i = 0; i < k; i++) {
    centers[i]!.x -= mx;
    centers[i]!.z -= mz;
  }

  const markers: PackedMarker[] = [];
  const curatorLabels: PackedCuratorLabel[] = [];

  for (let bi = 0; bi < k; bi++) {
    const b = blobs[bi]!;
    const cx = centers[bi]!.x;
    const cz = centers[bi]!.z;

    let zLabel = -Infinity;
    for (let i = 0; i < b.list.length; i++) {
      const r = b.list[i]!;
      const lx = b.pos[i]!.x;
      const lz = b.pos[i]!.z;
      zLabel = Math.max(zLabel, lz + b.radii[i]!);
      markers.push({
        id: r.id,
        name: r.name,
        x: cx + lx,
        z: cz + lz,
        size: b.sizes[i]!,
        dust: b.dustFlags[i]!,
      });
    }

    curatorLabels.push({
      curator: b.curator,
      lx: cx,
      lz: cz + zLabel + CURATOR_LABEL_BELOW,
    });
  }

  let extent = 16;
  for (const m of markers) {
    extent = Math.max(
      extent,
      Math.hypot(m.x, m.z) + m.size * RADIUS_SCALE * 0.72,
    );
  }
  for (const p of curatorLabels) {
    extent = Math.max(extent, Math.hypot(p.lx, p.lz) + 6);
  }

  const curatorPackZones: CuratorPackZone[] = blobs.map((_, i) => ({
    x: centers[i]!.x,
    z: centers[i]!.z,
    r: macroR[i]!,
  }));

  return { markers, curatorLabels, extent, curatorPackZones };
}
