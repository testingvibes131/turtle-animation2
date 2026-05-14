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
const MICRO_GAP = 0.01;
/** Slack between curator macro disks during overlap relaxation (almost tangent). */
const MACRO_GAP = 0.12;
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

/**
 * Per-curator micro packing: all opportunity centers start in a tight disk
 * (from maxRi, sumR/n, capped), heavily overlapping; pairwise repulsion expands
 * into an almost-tangent packing. No per-iteration scale-toward-origin.
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

  const iters = n <= 30 ? 420 : n <= 80 ? 340 : 280;
  const pairsPerIter =
    n <= 60
      ? (n * (n - 1)) / 2
      : Math.min(18000, Math.max(120 * n, 8000));
  const strength = 0.58;

  for (let iter = 0; iter < iters; iter++) {
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
 * Macro: push curator disks apart from a tiny overlapping disk seed.
 * No per-iteration scale / aspect pull. `_canvasAspect` reserved for callers.
 */
function relaxMacroBlobs(
  centers: Vec2[],
  radii: number[],
  _canvasAspect: number,
  seed: string,
): void {
  const k = centers.length;
  if (k <= 1) return;

  const iters = k <= 30 ? 420 : k <= 80 ? 340 : 280;
  const pairsPerIter =
    k <= 60
      ? (k * (k - 1)) / 2
      : Math.min(18000, Math.max(120 * k, 8000));
  const strength = 0.58;

  for (let iter = 0; iter < iters; iter++) {
    if (k <= 60) {
      for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
          const ai = { ...centers[i]! };
          const aj = { ...centers[j]! };
          resolveOverlap(
            ai,
            aj,
            radii[i]!,
            radii[j]!,
            MACRO_GAP,
            strength,
          );
          centers[i] = ai;
          centers[j] = aj;
        }
      }
    } else {
      for (let p = 0; p < pairsPerIter; p++) {
        const i = Math.floor(rnd(seed, iter * 50000 + p) * k);
        let j = Math.floor(rnd(seed, iter * 50000 + p + 3333) * k);
        if (j === i) j = (j + 1) % k;
        resolveOverlap(
          centers[i]!,
          centers[j]!,
          radii[i]!,
          radii[j]!,
          MACRO_GAP,
          strength,
        );
      }
    }
  }
}

/** Curator centers in a tiny disk (~0.16 × heaviest footprint, capped). */
function seedMacroCentersInDisk(
  centers: Vec2[],
  macroR: number[],
  k: number,
  seedKey: string,
): void {
  if (k <= 0) return;
  if (k === 1) {
    centers[0] = { x: 0, z: 0 };
    return;
  }

  const r0 = macroR[0] ?? 8;
  const seedR = Math.min(0.16 * r0, 2.4);

  for (let i = 0; i < k; i++) {
    const u = rnd(seedKey, i * 2 + 201);
    const v = rnd(seedKey, i * 2 + 202);
    const rr = seedR * Math.sqrt(u);
    const ang = v * Math.PI * 2;
    centers[i] = { x: Math.cos(ang) * rr, z: Math.sin(ang) * rr };
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
      b.list.length - a.list.length ||
      b.footprintR - a.footprintR ||
      a.curator.localeCompare(b.curator),
  );

  const k = blobs.length;
  const macroR = blobs.map((b) => b.footprintR);
  const centers: Vec2[] = new Array(k);

  seedMacroCentersInDisk(centers, macroR, k, "macro-seed");
  relaxMacroBlobs(centers, macroR, canvasAspect, "macro-seed");

  /** Center the land on “deal mass”: more opportunities + slightly larger footprints pull harder. */
  let mx = 0;
  let mz = 0;
  let tw = 0;
  for (let i = 0; i < k; i++) {
    const w =
      blobs[i]!.list.length * (1 + macroR[i]! * 0.055);
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
