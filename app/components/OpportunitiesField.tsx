"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { DM_Sans, Montserrat } from "next/font/google";
import { OpportunityCsvStatsPanel } from "@/app/components/OpportunityCsvStatsPanel";
import { OpportunityHoverLabel } from "@/app/components/OpportunityHoverLabel";
import { OpportunityHoverScreenLabel } from "@/app/components/OpportunityHoverScreenLabel";
import { parseOpportunityRows, type OpportunityRow } from "@/app/lib/opportunitiesCsv";
import {
  layoutOpportunitiesCirclePack,
  opportunityPackDiskRadius,
  type CuratorPackZone,
  type OpportunitiesCirclePackLayout,
  type PackedCuratorLabel,
  type PackedMarker,
} from "@/app/lib/opportunityCirclePack";
import {
  computeFeaturedAprRange,
  featuredSceneOffset,
  nonFeaturedSceneYOffset,
  type FeaturedAprRange,
} from "@/app/lib/featuredSceneOffset";
import { Leva, useControls, button } from "leva";

const dmSansScene = DM_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const montserratScene = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const dmSansUi = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const SCENE_LABEL_FONT = `${dmSansScene.style.fontFamily}, ${montserratScene.style.fontFamily}, ui-sans-serif, sans-serif`;

/**
 * 3D “land”: opportunities (TVL → sphere size) packed in disks per curator,
 * then curators packed in the plane (see `layoutOpportunitiesCirclePack`).
 * Macro aspect uses the WebGL canvas size (width / height).
 */

type Marker = PackedMarker;

type CuratorLabel = PackedCuratorLabel;

type OpportunitiesLayout = OpportunitiesCirclePackLayout;

/** Shift look-at on Z so the cluster sits lower on screen (full-viewport canvas). */
const FRAMING_TARGET_Z_RATIO = -0.3;

/** Above drei `<Html zIndexRange>` (~1.68e7) so hover labels stack over curator names. */
const HOVER_PORTAL_Z = 180_000_000;

/** Pinned “Features” view (from orbit + Leva copy). Never call `OrbitControls.update()` after setting these: with min/max polar both 0, update() clamps φ to 0 and flattens any oblique camera back to top-down. */
const FEATURES_CAMERA_POSITION: [number, number, number] = [
  24.20014, 100.27175, 186.245979,
];
const FEATURES_ORBIT_TARGET: [number, number, number] = [0, 0, -52.921258];

function DebugControls({
  extent,
  featuresEnabled,
  featuresBlendRef,
}: {
  extent: number;
  featuresEnabled: boolean;
  featuresBlendRef: MutableRefObject<number>;
}) {
  const ref = useRef<OrbitControlsType>(null);
  const { camera, size } = useThree();

  const autoY = 270;
  const tz = extent * FRAMING_TARGET_Z_RATIO;

  const { manualCamera, camX, camY, camZ, orbitZoom } = useControls(
    "Camera",
    {
      manualCamera: {
        value: false,
        label: "Manual position (x,y,z)",
      },
      camX: { value: 0, min: -2500, max: 2500, step: 1 },
      camY: { value: autoY, min: 4, max: 2500, step: 1 },
      camZ: { value: 1e-6, min: -2500, max: 2500, step: 0.01 },
      orbitZoom: {
        value: 1,
        min: 0.25,
        max: 3,
        step: 0.02,
        label: "Orbit dolly (higher = closer in)",
      },
    },
    [extent],
  );

  useControls(
    "Camera",
    {
      copyOrbitPose: button(() => {
        const oc = ref.current;
        if (!oc) {
          console.warn("OrbitControls not ready yet.");
          return;
        }
        const p = camera.position;
        const t = oc.target;
        const r = (n: number) => Math.round(n * 1e6) / 1e6;
        const text = [
          `position: [${r(p.x)}, ${r(p.y)}, ${r(p.z)}]`,
          `target: [${r(t.x)}, ${r(t.y)}, ${r(t.z)}]`,
        ].join("\n");
        void navigator.clipboard.writeText(text).then(
          () => console.info("Copied to clipboard:\n" + text),
          () => console.info("Clipboard unavailable; copy from console:\n" + text),
        );
      }),
    },
    [extent, camera],
  );

  const camRef = useRef({
    manual: manualCamera,
    x: camX,
    y: camY,
    z: camZ,
  });
  camRef.current = { manual: manualCamera, x: camX, y: camY, z: camZ };

  const featuresTargetRef = useRef(featuresEnabled ? 1 : 0);
  featuresTargetRef.current = featuresEnabled ? 1 : 0;

  const cameraLerpPool = useRef({
    basePos: new THREE.Vector3(),
    featPos: new THREE.Vector3(),
    baseTgt: new THREE.Vector3(),
    featTgt: new THREE.Vector3(),
    lerpedTgt: new THREE.Vector3(),
  });

  useLayoutEffect(() => {
    if (camRef.current.manual) return;
    const cam = camera;
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.clearViewOffset();
    }
    cam.up.set(0, 1, 0);
    cam.near = 0.1;
    cam.far = Math.max(2000, autoY * 10);
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.updateProjectionMatrix();
    }
    const oc = ref.current;
    if (oc) {
      oc.target.set(0, 0, tz);
    }
  }, [camera, extent, size.height, size.width, manualCamera, autoY, tz]);

  useFrame((_, dt) => {
    const p = camRef.current;
    const cam = camera;
    const oc = ref.current;

    const tgt = featuresTargetRef.current;
    let blend = featuresBlendRef.current;
    const k = Math.min(1, dt * 2.65);
    blend += (tgt - blend) * k;
    featuresBlendRef.current = blend;

    if (p.manual) {
      cam.position.set(p.x, p.y, p.z);
      cam.up.set(0, 1, 0);
      cam.lookAt(0, 0, tz);
      cam.near = 0.1;
      cam.far = Math.max(2000, Math.abs(p.y) * 10, 2000);
      if (cam instanceof THREE.PerspectiveCamera) {
        cam.updateProjectionMatrix();
      }
      if (oc) {
        oc.target.set(0, 0, tz);
      }
      return;
    }

    const pool = cameraLerpPool.current;
    pool.basePos.set(0, autoY, 1e-6);
    pool.featPos.set(
      FEATURES_CAMERA_POSITION[0],
      FEATURES_CAMERA_POSITION[1],
      FEATURES_CAMERA_POSITION[2],
    );
    cam.position.lerpVectors(pool.basePos, pool.featPos, blend);

    pool.baseTgt.set(0, 0, tz);
    pool.featTgt.set(
      FEATURES_ORBIT_TARGET[0],
      FEATURES_ORBIT_TARGET[1],
      FEATURES_ORBIT_TARGET[2],
    );
    pool.lerpedTgt.lerpVectors(pool.baseTgt, pool.featTgt, blend);
    cam.up.set(0, 1, 0);
    cam.lookAt(pool.lerpedTgt);
    cam.near = 0.1;
    cam.far = Math.max(2000, autoY * 10);
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.updateProjectionMatrix();
    }
    if (oc) {
      oc.target.copy(pool.lerpedTgt);
    }
  });

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enabled={false}
      enableDamping
      dampingFactor={0.06}
      enableRotate={false}
      minPolarAngle={0}
      maxPolarAngle={0}
      minDistance={(extent * 0.12) / Math.max(0.25, orbitZoom)}
      maxDistance={extent * 5}
    />
  );
}

const SPHERE_GEO = new THREE.SphereGeometry(1, 14, 12);

const RADIUS_SCALE = 0.34;

const labelBase: CSSProperties = {
  pointerEvents: "none",
  userSelect: "none",
  color: "#f9f9f9",
  fontFamily: SCENE_LABEL_FONT,
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: 1.15,
};

const LABEL_DF_CURATOR = 6.8;

const PACK_DEBUG_CURATOR_SEGMENTS = 56;
const PACK_DEBUG_OPP_SEGMENTS = 14;
const PACK_DEBUG_CURATOR_Y = 0.07;
const PACK_DEBUG_OPP_Y = 0.035;

function buildXZCircleLineSegmentsGeometry(
  circles: { x: number; z: number; r: number }[],
  segments: number,
  y: number,
): THREE.BufferGeometry {
  const n = circles.length;
  const positions = new Float32Array(n * segments * 2 * 3);
  let o = 0;
  for (let ci = 0; ci < n; ci++) {
    const c = circles[ci]!;
    for (let i = 0; i < segments; i++) {
      const t0 = (i / segments) * Math.PI * 2;
      const t1 = ((i + 1) / segments) * Math.PI * 2;
      positions[o++] = c.x + Math.cos(t0) * c.r;
      positions[o++] = y;
      positions[o++] = c.z + Math.sin(t0) * c.r;
      positions[o++] = c.x + Math.cos(t1) * c.r;
      positions[o++] = y;
      positions[o++] = c.z + Math.sin(t1) * c.r;
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geom;
}

function PackZoneDebugInner({
  curatorZones,
  markers,
}: {
  curatorZones: CuratorPackZone[];
  markers: Marker[];
}) {
  const curatorGeo = useMemo(
    () =>
      buildXZCircleLineSegmentsGeometry(
        curatorZones,
        PACK_DEBUG_CURATOR_SEGMENTS,
        PACK_DEBUG_CURATOR_Y,
      ),
    [curatorZones],
  );

  const opportunityCircles = useMemo(
    () =>
      markers.map((m) => ({
        x: m.x,
        z: m.z,
        r: opportunityPackDiskRadius(m.size),
      })),
    [markers],
  );

  const oppGeo = useMemo(
    () =>
      buildXZCircleLineSegmentsGeometry(
        opportunityCircles,
        PACK_DEBUG_OPP_SEGMENTS,
        PACK_DEBUG_OPP_Y,
      ),
    [opportunityCircles],
  );

  useEffect(() => {
    return () => {
      curatorGeo.dispose();
      oppGeo.dispose();
    };
  }, [curatorGeo, oppGeo]);

  return (
    <group renderOrder={400} frustumCulled={false}>
      <lineSegments geometry={curatorGeo}>
        <lineBasicMaterial
          color="#55e8ff"
          depthTest
          depthWrite={false}
          transparent
          opacity={0.92}
        />
      </lineSegments>
      <lineSegments geometry={oppGeo}>
        <lineBasicMaterial
          color="#ff8ad0"
          depthTest
          depthWrite={false}
          transparent
          opacity={0.42}
        />
      </lineSegments>
    </group>
  );
}

function PackZoneDebugOverlay({
  visible,
  curatorZones,
  markers,
}: {
  visible: boolean;
  curatorZones: CuratorPackZone[];
  markers: Marker[];
}) {
  if (!visible) return null;
  return (
    <PackZoneDebugInner curatorZones={curatorZones} markers={markers} />
  );
}

const CURATOR_NAME_FONT_PX = 144;

/**
 * Analytic ray–sphere hit (world space). `dir` must be **unit** length (Three.js ray).
 * Returns ray parameter `t` at entry (front) face, or null.
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

function InstancedOpportunitySpheres({
  markers,
  featuresBlendRef,
  featuredAprRange,
  featuresEnabled,
  onHoverChange,
}: {
  markers: Marker[];
  featuresBlendRef: MutableRefObject<number>;
  featuredAprRange: FeaturedAprRange;
  featuresEnabled: boolean;
  onHoverChange: (marker: Marker | null) => void;
}) {
  const mainFeatRef = useRef<THREE.InstancedMesh>(null);
  const mainNonRef = useRef<THREE.InstancedMesh>(null);
  const dustFeatRef = useRef<THREE.InstancedMesh>(null);
  const dustNonRef = useRef<THREE.InstancedMesh>(null);
  const dummyRef = useRef(new THREE.Object3D());

  const { mainFeatured, mainNonFeatured, dustFeatured, dustNonFeatured } =
    useMemo(() => {
      const mf: Marker[] = [];
      const mn: Marker[] = [];
      const df: Marker[] = [];
      const dn: Marker[] = [];
      for (const m of markers) {
        if (m.dust) {
          (m.featured ? df : dn).push(m);
        } else {
          (m.featured ? mf : mn).push(m);
        }
      }
      return {
        mainFeatured: mf,
        mainNonFeatured: mn,
        dustFeatured: df,
        dustNonFeatured: dn,
      };
    }, [markers]);

  const capMainF = Math.max(mainFeatured.length, 1);
  const capMainN = Math.max(mainNonFeatured.length, 1);
  const capDustF = Math.max(dustFeatured.length, 1);
  const capDustN = Math.max(dustNonFeatured.length, 1);

  const featuredMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0x73f36c }),
    [],
  );
  const neutralMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
    [],
  );

  useEffect(() => {
    return () => {
      featuredMat.dispose();
      neutralMat.dispose();
    };
  }, [featuredMat, neutralMat]);

  const writeInstanceMatrices = useCallback(
    (blend: number) => {
      const dummy = dummyRef.current;
      const apply = (mesh: THREE.InstancedMesh | null, list: Marker[]) => {
        if (!mesh) return;
        list.forEach((m, i) => {
          const { ox, oy, oz } = featuredSceneOffset(m, blend, featuredAprRange);
          const dy = nonFeaturedSceneYOffset(m, blend);
          dummy.position.set(m.x + ox, oy + dy, m.z + oz);
          const s = m.size * RADIUS_SCALE;
          dummy.scale.set(s, s, s);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.count = list.length;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.visible = list.length > 0;
      };
      apply(mainFeatRef.current, mainFeatured);
      apply(mainNonRef.current, mainNonFeatured);
      apply(dustFeatRef.current, dustFeatured);
      apply(dustNonRef.current, dustNonFeatured);
    },
    [
      dustFeatured,
      dustNonFeatured,
      mainFeatured,
      mainNonFeatured,
      featuredAprRange,
    ],
  );

  useLayoutEffect(() => {
    writeInstanceMatrices(featuresBlendRef.current);
  }, [writeInstanceMatrices, featuresBlendRef, featuredAprRange]);

  const lastHoverIdRef = useRef<string | null>(null);
  const { raycaster, pointer, camera } = useThree();

  useFrame(() => {
    writeInstanceMatrices(featuresBlendRef.current);

    raycaster.setFromCamera(pointer, camera);
    const blend = featuresBlendRef.current;

    const ro = raycaster.ray.origin;
    const rd = raycaster.ray.direction;
    const ox = ro.x;
    const oy = ro.y;
    const oz = ro.z;
    const dx = rd.x;
    const dy = rd.y;
    const dz = rd.z;

    type Hit = { t: number; m: Marker };
    const along: Hit[] = [];
    for (const m of markers) {
      const { ox: sx, oy: sy, oz: sz } = featuredSceneOffset(
        m,
        blend,
        featuredAprRange,
      );
      const ddy = nonFeaturedSceneYOffset(m, blend);
      const cx = m.x + sx;
      const cy = sy + ddy;
      const cz = m.z + sz;
      const rad = m.size * RADIUS_SCALE;
      const t = rayIntersectSphereParam(ox, oy, oz, dx, dy, dz, cx, cy, cz, rad);
      if (t != null) along.push({ t, m });
    }
    along.sort((a, b) => a.t - b.t);

    let marker: Marker | null = null;
    if (featuresEnabled) {
      for (const h of along) {
        if (h.m.featured) {
          marker = h.m;
          break;
        }
      }
    } else {
      marker = along[0]?.m ?? null;
    }

    const nextId = marker?.id ?? null;
    if (nextId === lastHoverIdRef.current) return;
    lastHoverIdRef.current = nextId;
    onHoverChange(marker);
  });

  return (
    <>
      <instancedMesh
        ref={mainFeatRef}
        args={[SPHERE_GEO, featuredMat, capMainF]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={mainNonRef}
        args={[SPHERE_GEO, neutralMat, capMainN]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={dustFeatRef}
        args={[SPHERE_GEO, featuredMat, capDustF]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={dustNonRef}
        args={[SPHERE_GEO, neutralMat, capDustN]}
        frustumCulled={false}
      />
    </>
  );
}

function OpportunityLand({
  layout,
  showPackDebug,
  hoverPortalEl,
  featuresEnabled,
  featuresBlendRef,
}: {
  layout: OpportunitiesLayout;
  showPackDebug: boolean;
  hoverPortalEl: HTMLDivElement | null;
  featuresEnabled: boolean;
  featuresBlendRef: MutableRefObject<number>;
}) {
  const { markers, curatorLabels, extent, curatorPackZones } = layout;
  const [hovered, setHovered] = useState<Marker | null>(null);

  const featuredAprRange = useMemo(
    () => computeFeaturedAprRange(markers),
    [markers],
  );

  const onHoverChange = useCallback((m: Marker | null) => {
    setHovered((prev) => (prev?.id === m?.id ? prev : m));
  }, []);

  useEffect(() => {
    if (!featuresEnabled) return;
    setHovered((h) => (h && !h.featured ? null : h));
  }, [featuresEnabled]);

  return (
    <>
      <DebugControls
        extent={extent}
        featuresEnabled={featuresEnabled}
        featuresBlendRef={featuresBlendRef}
      />
      <PackZoneDebugOverlay
        visible={showPackDebug}
        curatorZones={curatorPackZones}
        markers={markers}
      />
      <ambientLight intensity={1} />
      {/* <axesHelper args={[Math.max(28, extent * 0.22)]} /> */}
      <InstancedOpportunitySpheres
        markers={markers}
        featuresBlendRef={featuresBlendRef}
        featuredAprRange={featuredAprRange}
        featuresEnabled={featuresEnabled}
        onHoverChange={onHoverChange}
      />
      {hovered ? (
        <OpportunityHoverLabel
          marker={hovered}
          featuresBlendRef={featuresBlendRef}
          featuredAprRange={featuredAprRange}
        />
      ) : null}
      <OpportunityHoverScreenLabel
        marker={hovered}
        portalEl={hoverPortalEl}
        featuresBlendRef={featuresBlendRef}
        featuredAprRange={featuredAprRange}
        featuresEnabled={featuresEnabled}
      />
      {!featuresEnabled
        ? curatorLabels.map((p) => (
            <group key={p.curator} position={[p.lx, 0, p.lz]}>
              <Html
                transform
                sprite
                occlude={false}
                pointerEvents="none"
                center
                className={`${dmSansScene.className} ${montserratScene.className}`}
                distanceFactor={LABEL_DF_CURATOR}
                position={[0, 2.1, 0]}
                zIndexRange={[16777200, 16777271]}
                style={{
                  ...labelBase,
                  maxWidth: 2000,
                  fontSize: CURATOR_NAME_FONT_PX,
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  opacity: 1,
                }}
              >
                {p.curator}
              </Html>
            </group>
          ))
        : null}
    </>
  );
}

function FeaturesToggleSwitch({
  enabled,
  onEnabledChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Features"
      onClick={() => onEnabledChange(!enabled)}
      className={[
        dmSansUi.className,
        "pointer-events-auto flex cursor-pointer items-center gap-3 rounded-[20px] border border-[rgba(249,249,249,0.1)] bg-[#191a19] px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] select-none",
      ].join(" ")}
    >
      <span className="text-[13px] font-medium text-[#f9f9f9]">Features</span>
      <span
        className={[
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
          enabled
            ? "border-[#73f36c]/45 bg-[#73f36c]/20"
            : "border-[rgba(249,249,249,0.12)] bg-[rgba(255,255,255,0.06)]",
        ].join(" ")}
        aria-hidden
      >
        <span
          className={[
            "pointer-events-none absolute top-1/2 left-[2px] block h-[18px] w-[18px] -translate-y-1/2 rounded-full shadow-sm transition-[transform,background-color] duration-200 ease-out",
            enabled
              ? "translate-x-[22px] bg-[#73f36c]"
              : "translate-x-0 bg-[rgba(249,249,249,0.82)]",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

function SceneWithLayout({
  rows,
  showPackDebug,
  hoverPortalEl,
  featuresEnabled,
  featuresBlendRef,
}: {
  rows: OpportunityRow[];
  showPackDebug: boolean;
  hoverPortalEl: HTMLDivElement | null;
  featuresEnabled: boolean;
  featuresBlendRef: MutableRefObject<number>;
}) {
  const { width, height } = useThree((s) => s.size);
  /** Full-viewport canvas: natural width / height (no half-viewport doubling). */
  const layoutAspect =
    width > 1 && height > 1 ? width / height : 16 / 9;
  const layout = useMemo(
    () => layoutOpportunitiesCirclePack(rows, layoutAspect),
    [rows, layoutAspect],
  );
  return (
    <OpportunityLand
      layout={layout}
      showPackDebug={showPackDebug}
      hoverPortalEl={hoverPortalEl}
      featuresEnabled={featuresEnabled}
      featuresBlendRef={featuresBlendRef}
    />
  );
}

export default function OpportunitiesField() {
  const [rows, setRows] = useState<OpportunityRow[] | null>(null);
  const [hoverPortalEl, setHoverPortalEl] = useState<HTMLDivElement | null>(null);
  const [featuresEnabled, setFeaturesEnabled] = useState(false);
  const featuresBlendRef = useRef(0);

  const { showPackZones } = useControls("Opportunities", {
    showPackZones: { value: false, label: "Pack debug zones" },
  });

  useEffect(() => {
    let cancelled = false;
    void fetch("/data/turtle-opportunities.csv")
      .then((r) => r.text())
      .then((raw) => {
        if (cancelled) return;
        setRows(parseOpportunityRows(raw));
      })
      .catch(() => setRows([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Leva collapsed />
      <div className="fixed inset-0 z-0">
        {rows && rows.length > 0 ? (
          <>
            <Canvas
              className="absolute inset-0 h-full w-full touch-none"
              camera={{
                position: [0, 140, 0],
                fov: 45,
                near: 0.1,
                far: 12000,
              }}
              dpr={[1, 1.5]}
              gl={{
                antialias: true,
                alpha: false,
                powerPreference: "high-performance",
                preserveDrawingBuffer: false,
              }}
            >
              <color attach="background" args={["#0a0a0a"]} />
              <SceneWithLayout
                rows={rows}
                showPackDebug={showPackZones}
                hoverPortalEl={hoverPortalEl}
                featuresEnabled={featuresEnabled}
                featuresBlendRef={featuresBlendRef}
              />
            </Canvas>
            <OpportunityCsvStatsPanel rows={rows} />
            <div className="pointer-events-none fixed bottom-10 top-32 z-30 sm:right-[60px] sm:top-36">
              <FeaturesToggleSwitch
                enabled={featuresEnabled}
                onEnabledChange={setFeaturesEnabled}
              />
            </div>
            <div
              ref={setHoverPortalEl}
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: HOVER_PORTAL_Z }}
              aria-hidden
            />
            {/*
              Hero uses pointer-events-none on the outer section, so without this
              the full-screen canvas would steal clicks above the fold.
            */}
            <div
              className="pointer-events-auto fixed inset-x-0 top-0 z-1 h-1/2 touch-none"
              aria-hidden
            />
          </>
        ) : null}
      </div>
    </>
  );
}
