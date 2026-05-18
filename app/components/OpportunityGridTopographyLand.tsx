"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  useState,
  type CSSProperties,
} from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { DM_Sans, Montserrat } from "next/font/google";
import { OpportunityGridHoverScreenLabel } from "@/app/components/OpportunityGridHoverScreenLabel";
import {
  computeFeaturedAprRange,
  featuredGridAprLiftY,
} from "@/app/lib/featuredAprGrid";
import type {
  GridTopographyMarker,
  OpportunitiesGridTopographyLayout,
} from "@/app/lib/opportunityGridTopographyLayout";

const dmGridHover = DM_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const montGridHover = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const GRID_LABEL_FONT = `${dmGridHover.style.fontFamily}, ${montGridHover.style.fontFamily}, ui-sans-serif, sans-serif`;

/** Unit-radius sphere; instance scale sets world radius. */
const SPHERE_GEO = new THREE.SphereGeometry(1, 14, 12);

const _sphPos = new THREE.Vector3();
const _sphQuat = new THREE.Quaternion();
const _sphScale = new THREE.Vector3();
const _sphMat = new THREE.Matrix4();
/** Unit-height cylinder (Y); instance `scale.y` sets stick length. */
const STICK_GEO = new THREE.CylinderGeometry(0.062, 0.062, 1, 8);
/** World radius scale for grid markers (layout pitch still uses 0.34 in layout lib). */
const GRID_SPHERE_RADIUS_SCALE = 0.2;

/**
 * Flat floor grid Y (world). Keep in sync with `buildFlatFloorGridGeometry`.
 */
const FLAT_FLOOR_GRID_Y = -0.024;

/** Stick foot nudged above the draped wire grid so it does not read below the terrain lines. */
const FEATURED_STICK_TERRAIN_PAD = 0.006;
/** Min stick height when APR lift is small (world units). */
const FEATURED_STICK_MIN_HEIGHT = 0.12;

/** Default non-featured sphere tint. */
const SPHERE_REST_COLOR = 0xf9f9f9;
/** Same-curator hover overlay (featured green, slightly translucent). */
const SPHERE_CURATOR_HIGHLIGHT_COLOR = 0x73f36c;
const SPHERE_CURATOR_HIGHLIGHT_OPACITY = 0.78;
/** Same-curator hover: slightly larger radius. */
const SPHERE_CURATOR_HOVER_SCALE = 1.7;

function sphereRadius(m: GridTopographyMarker): number {
  return m.size * GRID_SPHERE_RADIUS_SCALE;
}

function sphereRadiusForHover(
  m: GridTopographyMarker,
  hoveredCurator: string | null,
): number {
  const r = sphereRadius(m);
  if (
    hoveredCurator != null &&
    hoveredCurator.length > 0 &&
    m.curator === hoveredCurator
  ) {
    return r * SPHERE_CURATOR_HOVER_SCALE;
  }
  return r;
}

/**
 * Analytic ray–sphere hit (world space). `dir` must be unit length.
 * Returns ray parameter `t` at entry, or null.
 */
function rayIntersectSphereParam(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cy: number,
  cz: number,
  r: number,
): number | null {
  const px = ox - cx;
  const py = oy - cy;
  const pz = oz - cz;
  const b = px * dx + py * dy + pz * dz;
  const c = px * px + py * py + pz * pz - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const EPS = 1e-4;
  let t = -b - s;
  if (t < EPS) t = -b + s;
  if (t < EPS) return null;
  return t;
}

/** Label offset along camera **right** (world units): `r * mul + add`. */
const FEATURED_LABEL_ALONG_RIGHT_R_MUL = 2.52;
/**
 * Extra world offset: `@react-three/drei` `Html` with `transform` applies CSS
 * `translate(-50%,-50%)` so the 3D point is the **center** of the label. Without this,
 * half the block sits back over the sphere and reads as stacked “on top”.
 */
const FEATURED_LABEL_ALONG_RIGHT_ADD = 2.12;

/**
 * Max width for the label column (screen CSS).
 */
const FEATURED_LABEL_BLOCK_MAX = "200px";

/** Screen px for featured name / APR inside the Html layer (before `distanceFactor` scaling in 3D). */
const FEATURED_LABEL_NAME_FONT_PX = 24;
const FEATURED_LABEL_APR_FONT_PX = 20;

/** Featured label copy (name + APR) — matches featured sphere / APR accent. */
const FEATURED_LABEL_TEXT_GREEN = "#73f36c";

function formatFeaturedApr(percent: number): string {
  if (!Number.isFinite(percent)) return "—";
  const r = Math.round(percent * 10) / 10;
  return `${r}%`;
}

const featuredGridLabelWrapStyle: CSSProperties = {
  pointerEvents: "none",
  userSelect: "none",
  fontFamily: GRID_LABEL_FONT,
  color: FEATURED_LABEL_TEXT_GREEN,
  textAlign: "left",
  whiteSpace: "normal",
  lineHeight: 1.25,
  maxWidth: FEATURED_LABEL_BLOCK_MAX,
  textShadow: "0 1px 10px rgba(0,0,0,0.82), 0 0 1px rgba(0,0,0,0.9)",
};

function FeaturedGridOpportunityLabels({
  markers,
}: {
  markers: GridTopographyMarker[];
}) {
  const { camera } = useThree();
  return (
    <>
      {markers.map((m) => (
        <FeaturedGridOpportunityLabel key={m.id} marker={m} camera={camera} />
      ))}
    </>
  );
}

function FeaturedGridOpportunityLabel({
  marker: m,
  camera,
}: {
  marker: GridTopographyMarker;
  camera: THREE.Camera;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const anchor = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const r = sphereRadius(m);
    /** Anchor at sphere center, step out to the camera‑right side of the ball (not above it). */
    anchor.current.set(m.x, m.y, m.z);
    /** Screen‑right of the ball: camera’s +X in world space (do not flatten Y — that skews “above” the sphere). */
    right.current.setFromMatrixColumn(camera.matrixWorld, 0);
    if (right.current.lengthSq() < 1e-12) {
      right.current.set(1, 0, 0);
    } else {
      right.current.normalize();
    }
    const out = r * FEATURED_LABEL_ALONG_RIGHT_R_MUL + FEATURED_LABEL_ALONG_RIGHT_ADD;
    g.position.copy(anchor.current);
    g.position.addScaledVector(right.current, out);
  });

  return (
    <group ref={groupRef}>
      <Html
        transform
        sprite
        occlude={false}
        pointerEvents="none"
        center={false}
        className={`${dmGridHover.className} ${montGridHover.className}`}
        distanceFactor={9}
        zIndexRange={[16777150, 16777198]}
        style={featuredGridLabelWrapStyle}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 4,
            width: FEATURED_LABEL_BLOCK_MAX,
            maxWidth: FEATURED_LABEL_BLOCK_MAX,
            overflowWrap: "break-word",
            wordBreak: "break-word",
            textAlign: "left",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: FEATURED_LABEL_NAME_FONT_PX,
              fontWeight: 700,
              color: FEATURED_LABEL_TEXT_GREEN,
              letterSpacing: "0.02em",
              textAlign: "left",
            }}
          >
            {m.name.trim() || "—"}
          </span>
          <span
            style={{
              display: "block",
              fontSize: FEATURED_LABEL_APR_FONT_PX,
              fontWeight: 800,
              color: FEATURED_LABEL_TEXT_GREEN,
              letterSpacing: "0.04em",
              textAlign: "left",
            }}
          >
            {formatFeaturedApr(m.estAprPercent)}
          </span>
        </div>
      </Html>
    </group>
  );
}

function splitByFeatured(markers: GridTopographyMarker[]) {
  const feat: GridTopographyMarker[] = [];
  const rest: GridTopographyMarker[] = [];
  for (const m of markers) {
    (m.featured ? feat : rest).push(m);
  }
  return { feat, rest };
}

function InstancedGridSpheres({
  list,
  cap,
  material,
  radiusScale = 1,
  renderOrder = 0,
}: {
  list: GridTopographyMarker[];
  cap: number;
  material: THREE.MeshBasicMaterial;
  radiusScale?: number;
  renderOrder?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const write = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    _sphQuat.identity();
    list.forEach((m, i) => {
      const r = sphereRadius(m) * radiusScale;
      _sphPos.set(m.x, m.y, m.z);
      _sphScale.setScalar(r);
      _sphMat.compose(_sphPos, _sphQuat, _sphScale);
      mesh.setMatrixAt(i, _sphMat);
    });
    mesh.count = list.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = list.length > 0;
  }, [list, radiusScale]);

  useLayoutEffect(() => {
    write();
  }, [write]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[SPHERE_GEO, material, cap]}
      frustumCulled={false}
      renderOrder={renderOrder}
    />
  );
}

function InstancedGridSticks({
  list,
  cap,
  material,
  cols,
  gridRows,
  terrainCellY,
}: {
  list: GridTopographyMarker[];
  cap: number;
  material: THREE.MeshBasicMaterial;
  cols: number;
  gridRows: number;
  terrainCellY: (col: number, row: number) => number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D());

  const write = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const d = dummy.current;
    list.forEach((m, i) => {
      const r = sphereRadius(m);
      /** Sphere bottom at APR-lifted center (`m.y` on render markers). */
      const yTop = m.y - r;
      const yBottom =
        terrainPeakYAtCell(m.col, m.row, cols, gridRows, terrainCellY) +
        FEATURED_STICK_TERRAIN_PAD;
      const hStick = Math.max(FEATURED_STICK_MIN_HEIGHT, yTop - yBottom);
      const yCenter = yBottom + hStick * 0.5;
      d.position.set(m.x, yCenter, m.z);
      d.scale.set(1, hStick, 1);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    });
    mesh.count = list.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = list.length > 0;
  }, [list, cols, gridRows, terrainCellY]);

  useLayoutEffect(() => {
    write();
  }, [write]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[STICK_GEO, material, cap]}
      frustumCulled={false}
    />
  );
}

const PLANE_MAT = new THREE.MeshBasicMaterial({
  color: 0x0f1210,
  transparent: true,
  opacity: 0.96,
});

/** Same slot-center XZ as `layoutOpportunitiesGridTopography`. */
function nominalGridX(col: number, cols: number, cellPitch: number): number {
  return (col - (cols - 1) * 0.5) * cellPitch;
}

function nominalGridZ(row: number, gridRows: number, cellPitch: number): number {
  return (row - (gridRows - 1) * 0.5) * cellPitch;
}

/** Same APR height field as the draped terrain wire (layout Y per slot). */
function buildTerrainCellYGrid(
  markers: GridTopographyMarker[],
  cols: number,
  gridRows: number,
): (col: number, row: number) => number {
  const ySlot: number[][] = Array.from({ length: cols }, () =>
    Array.from({ length: gridRows }, () => NaN),
  );
  for (let slot = 0; slot < markers.length; slot++) {
    const c = slot % cols;
    const r = Math.floor(slot / cols);
    if (r < gridRows && c < cols) {
      ySlot[c][r] = markers[slot]!.y;
    }
  }

  const defaultY =
    markers.length > 0
      ? Math.min(...markers.map((m) => m.y))
      : 1.05;

  return (col, row) => {
    const v = ySlot[col]?.[row];
    if (Number.isFinite(v)) return v as number;
    let sum = 0;
    let n = 0;
    for (const [dc, dr] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const nc = col + dc;
      const nr = row + dr;
      const nv = ySlot[nc]?.[nr];
      if (Number.isFinite(nv)) {
        sum += nv as number;
        n++;
      }
    }
    return n > 0 ? sum / n : defaultY;
  };
}

/** Local terrain peak at a cell (max of center + in-bounds neighbors). */
function terrainPeakYAtCell(
  col: number,
  row: number,
  cols: number,
  gridRows: number,
  cellY: (c: number, r: number) => number,
): number {
  let peak = cellY(col, row);
  for (const [dc, dr] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc >= 0 && nc < cols && nr >= 0 && nr < gridRows) {
      peak = Math.max(peak, cellY(nc, nr));
    }
  }
  return peak;
}

/**
 * Draped wire grid: lines follow nominal slot centers; Y follows each cell's APR height
 * so the mesh reads as terrain under/near the spheres.
 */
function buildTerrainWireGridGeometry(
  markers: GridTopographyMarker[],
  cols: number,
  gridRows: number,
  cellPitch: number,
): THREE.BufferGeometry | null {
  const cellY = buildTerrainCellYGrid(markers, cols, gridRows);

  /** Slightly below sphere center so dashed lines read in front of the dark plane. */
  const yWire = (c: number, r: number) => cellY(c, r) - 0.055;

  const positions: number[] = [];

  for (let c = 0; c < cols; c++) {
    const x = nominalGridX(c, cols, cellPitch);
    for (let r = 0; r < gridRows - 1; r++) {
      const z0 = nominalGridZ(r, gridRows, cellPitch);
      const z1 = nominalGridZ(r + 1, gridRows, cellPitch);
      positions.push(
        x,
        yWire(c, r),
        z0,
        x,
        yWire(c, r + 1),
        z1,
      );
    }
  }

  for (let r = 0; r < gridRows; r++) {
    const z = nominalGridZ(r, gridRows, cellPitch);
    for (let c = 0; c < cols - 1; c++) {
      const x0 = nominalGridX(c, cols, cellPitch);
      const x1 = nominalGridX(c + 1, cols, cellPitch);
      positions.push(
        x0,
        yWire(c, r),
        z,
        x1,
        yWire(c + 1, r),
        z,
      );
    }
  }

  if (positions.length === 0) return null;

  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(positions), 3),
  );
  return geom;
}

/** Flat reference grid on the ground plane (constant Y); same pitch as layout, no elevation. */
function buildFlatFloorGridGeometry(
  cellPitch: number,
  cols: number,
  gridRows: number,
  y: number,
): THREE.BufferGeometry {
  const x0 = (-cols / 2) * cellPitch;
  const z0 = (-gridRows / 2) * cellPitch;
  const z1 = (gridRows / 2) * cellPitch;
  const x1 = (cols / 2) * cellPitch;
  const positions: number[] = [];
  for (let j = 0; j <= cols; j++) {
    const x = x0 + j * cellPitch;
    positions.push(x, y, z0, x, y, z1);
  }
  for (let j = 0; j <= gridRows; j++) {
    const z = z0 + j * cellPitch;
    positions.push(x0, y, z, x1, y, z);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(positions), 3),
  );
  return geom;
}

export function OpportunityGridTopographyLand({
  layout,
  hoverPortalEl,
}: {
  layout: OpportunitiesGridTopographyLayout;
  hoverPortalEl: HTMLDivElement | null;
}) {
  const { markers, extent, planeHalfWidth, planeHalfDepth, cellPitch, cols, gridRows } =
    layout;

  const featuredAprRange = useMemo(
    () => computeFeaturedAprRange(markers),
    [markers],
  );

  /** Same XZ/col/row as layout; featured spheres get extra Y from APR only. */
  const markersRender = useMemo(
    () =>
      markers.map((m) =>
        m.featured
          ? { ...m, y: m.y + featuredGridAprLiftY(m, featuredAprRange) }
          : m,
      ),
    [markers, featuredAprRange],
  );

  const { feat, rest } = useMemo(
    () => splitByFeatured(markersRender),
    [markersRender],
  );

  const [hovered, setHovered] = useState<GridTopographyMarker | null>(null);
  const hoveredCurator = hovered?.curator ?? null;

  /** Overlay on top of base spheres (base layer always drawn underneath). */
  const curatorHighlight = useMemo(() => {
    if (!hoveredCurator) return [];
    return markersRender.filter((m) => m.curator === hoveredCurator);
  }, [markersRender, hoveredCurator]);

  const matSphereFeat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x73f36c }),
    [],
  );
  const matSphereRest = useMemo(
    () => new THREE.MeshBasicMaterial({ color: SPHERE_REST_COLOR }),
    [],
  );
  const matSphereCuratorHighlight = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: SPHERE_CURATOR_HIGHLIGHT_COLOR,
        transparent: true,
        opacity: SPHERE_CURATOR_HIGHLIGHT_OPACITY,
        depthWrite: false,
        depthTest: true,
        toneMapped: false,
      }),
    [],
  );
  const matStickFeat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x4a9a44 }),
    [],
  );

  useEffect(() => {
    return () => {
      matSphereFeat.dispose();
      matSphereRest.dispose();
      matSphereCuratorHighlight.dispose();
      matStickFeat.dispose();
    };
  }, [matSphereFeat, matSphereRest, matSphereCuratorHighlight, matStickFeat]);

  const planeGeo = useMemo(
    () => new THREE.PlaneGeometry(planeHalfWidth * 2, planeHalfDepth * 2),
    [planeHalfWidth, planeHalfDepth],
  );

  const terrainCellY = useMemo(
    () => buildTerrainCellYGrid(markers, cols, gridRows),
    [markers, cols, gridRows],
  );

  const terrainWireGridGeo = useMemo(() => {
    if (cols < 1 || gridRows < 1 || !(cellPitch > 0)) return null;
    return buildTerrainWireGridGeometry(markers, cols, gridRows, cellPitch);
  }, [markers, cellPitch, cols, gridRows]);

  const flatFloorGridGeo = useMemo(() => {
    if (cols < 1 || gridRows < 1 || !(cellPitch > 0)) return null;
    return buildFlatFloorGridGeometry(
      cellPitch,
      cols,
      gridRows,
      FLAT_FLOOR_GRID_Y,
    );
  }, [cellPitch, cols, gridRows]);

  useEffect(() => {
    return () => {
      planeGeo.dispose();
      terrainWireGridGeo?.dispose();
      flatFloorGridGeo?.dispose();
    };
  }, [planeGeo, terrainWireGridGeo, flatFloorGridGeo]);

  const matTerrainWireGrid = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: 0x6d7f78,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        depthTest: true,
        dashSize: Math.max(0.08, cellPitch * 0.26),
        gapSize: Math.max(0.05, cellPitch * 0.16),
        scale: 1,
      }),
    [cellPitch],
  );

  const matFlatFloorGrid = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: 0x3d4a45,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        depthTest: true,
        dashSize: Math.max(0.07, cellPitch * 0.34),
        gapSize: Math.max(0.05, cellPitch * 0.2),
        scale: 1,
      }),
    [cellPitch],
  );

  useEffect(() => {
    return () => {
      matTerrainWireGrid.dispose();
    };
  }, [matTerrainWireGrid]);

  useEffect(() => {
    return () => {
      matFlatFloorGrid.dispose();
    };
  }, [matFlatFloorGrid]);

  const lastHoverIdRef = useRef<string | null>(null);
  const flatFloorGridLinesRef = useRef<THREE.LineSegments>(null);
  const terrainWireGridLinesRef = useRef<THREE.LineSegments>(null);
  const { raycaster, pointer, camera, gl } = useThree();

  useLayoutEffect(() => {
    if (!terrainWireGridGeo) return;
    terrainWireGridLinesRef.current?.computeLineDistances();
  }, [terrainWireGridGeo]);

  useLayoutEffect(() => {
    if (!flatFloorGridGeo) return;
    flatFloorGridLinesRef.current?.computeLineDistances();
  }, [flatFloorGridGeo]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.cursor = hovered ? "pointer" : "";
    return () => {
      canvas.style.cursor = "";
    };
  }, [gl, hovered]);

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    const ro = raycaster.ray.origin;
    const rd = raycaster.ray.direction;
    const ox = ro.x;
    const oy = ro.y;
    const oz = ro.z;
    const dx = rd.x;
    const dy = rd.y;
    const dz = rd.z;

    let best: { t: number; m: GridTopographyMarker } | null = null;
    for (const m of markersRender) {
      const r = sphereRadiusForHover(m, hoveredCurator);
      const t = rayIntersectSphereParam(
        ox,
        oy,
        oz,
        dx,
        dy,
        dz,
        m.x,
        m.y,
        m.z,
        r,
      );
      if (t != null && (!best || t < best.t)) {
        best = { t, m };
      }
    }

    const id = best?.m.id ?? null;
    if (id === lastHoverIdRef.current) return;
    lastHoverIdRef.current = id;
    setHovered(best?.m ?? null);
  });

  return (
    <>
      <ambientLight intensity={1} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
        geometry={planeGeo}
        material={PLANE_MAT}
      />
      {flatFloorGridGeo ? (
        <lineSegments
          ref={flatFloorGridLinesRef}
          geometry={flatFloorGridGeo}
          material={matFlatFloorGrid}
          frustumCulled={false}
          renderOrder={1}
        />
      ) : null}
      {terrainWireGridGeo ? (
        <lineSegments
          ref={terrainWireGridLinesRef}
          geometry={terrainWireGridGeo}
          material={matTerrainWireGrid}
          frustumCulled={false}
          renderOrder={2}
        />
      ) : null}
      {feat.length > 0 ? (
        <InstancedGridSticks
          list={feat}
          cap={feat.length}
          material={matStickFeat}
          cols={cols}
          gridRows={gridRows}
          terrainCellY={terrainCellY}
        />
      ) : null}
      {rest.length > 0 ? (
        <InstancedGridSpheres
          list={rest}
          cap={rest.length}
          material={matSphereRest}
        />
      ) : null}
      {feat.length > 0 ? (
        <InstancedGridSpheres
          list={feat}
          cap={feat.length}
          material={matSphereFeat}
        />
      ) : null}
      {curatorHighlight.length > 0 ? (
        <InstancedGridSpheres
          list={curatorHighlight}
          cap={curatorHighlight.length}
          material={matSphereCuratorHighlight}
          radiusScale={SPHERE_CURATOR_HOVER_SCALE}
          renderOrder={12}
        />
      ) : null}
      {feat.length > 0 ? (
        <FeaturedGridOpportunityLabels markers={feat} />
      ) : null}
      <OpportunityGridHoverScreenLabel
        marker={hovered}
        portalEl={hoverPortalEl}
      />
    </>
  );
}
