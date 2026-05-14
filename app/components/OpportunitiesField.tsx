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
import { Leva, useControls } from "leva";

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

function DebugControls({ extent }: { extent: number }) {
  const ref = useRef<OrbitControlsType>(null);
  const { camera, size } = useThree();

  const autoY = 746;
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

  const camRef = useRef({
    manual: manualCamera,
    x: camX,
    y: camY,
    z: camZ,
  });
  camRef.current = { manual: manualCamera, x: camX, y: camY, z: camZ };

  useLayoutEffect(() => {
    if (camRef.current.manual) return;
    const cam = camera;
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.clearViewOffset();
    }
    cam.position.set(0, autoY, 1e-6);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, tz);
    cam.near = 0.1;
    cam.far = Math.max(2000, autoY * 10);
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.updateProjectionMatrix();
    }
    const oc = ref.current;
    if (oc) {
      oc.target.set(0, 0, tz);
      oc.update();
    }
  }, [camera, extent, size.height, size.width, manualCamera, autoY, tz]);

  useFrame(() => {
    const p = camRef.current;
    if (!p.manual) return;
    const cam = camera;
    cam.position.set(p.x, p.y, p.z);
    cam.up.set(0, 1, 0);
    cam.lookAt(0, 0, tz);
    cam.near = 0.1;
    cam.far = Math.max(2000, Math.abs(p.y) * 10, 2000);
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.updateProjectionMatrix();
    }
    const oc = ref.current;
    if (oc) {
      oc.target.set(0, 0, tz);
      oc.update();
    }
  });

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enabled={!manualCamera}
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

type HitPick = { which: "main" | "dust"; index: number };

function InstancedOpportunitySpheres({
  markers,
  onHoverChange,
}: {
  markers: Marker[];
  onHoverChange: (marker: Marker | null) => void;
}) {
  const mainRef = useRef<THREE.InstancedMesh>(null);
  const dustRef = useRef<THREE.InstancedMesh>(null);

  const { mainMarkers, dustMarkers } = useMemo(() => {
    const main: Marker[] = [];
    const dust: Marker[] = [];
    for (const m of markers) {
      (m.dust ? dust : main).push(m);
    }
    return { mainMarkers: main, dustMarkers: dust };
  }, [markers]);

  const mainCap = Math.max(mainMarkers.length, 1);
  const dustCap = Math.max(dustMarkers.length, 1);

  const mainMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
    [],
  );

  const dustMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
    [],
  );

  useEffect(() => {
    return () => {
      mainMat.dispose();
      dustMat.dispose();
    };
  }, [dustMat, mainMat]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const applyMatrices = (
      mesh: THREE.InstancedMesh | null,
      list: Marker[],
    ) => {
      if (!mesh) return;
      list.forEach((m, i) => {
        dummy.position.set(m.x, 0, m.z);
        const s = m.size * RADIUS_SCALE;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.count = list.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = list.length > 0;
    };
    applyMatrices(mainRef.current, mainMarkers);
    applyMatrices(dustRef.current, dustMarkers);
  }, [dustMarkers, mainMarkers]);

  const pickRef = useRef<HitPick | null>(null);
  const { raycaster, pointer, camera } = useThree();

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);
    const mainMesh = mainRef.current;
    const dustMesh = dustRef.current;
    const targets = [mainMesh, dustMesh].filter(
      (m): m is THREE.InstancedMesh => !!m && m.visible && m.count > 0,
    );
    const hits = raycaster.intersectObjects(targets, false);
    const hit = hits[0];
    let next: HitPick | null = null;
    if (
      hit?.object instanceof THREE.InstancedMesh &&
      hit.instanceId !== undefined
    ) {
      const id = hit.instanceId;
      if (hit.object === mainMesh) next = { which: "main", index: id };
      else if (hit.object === dustMesh) next = { which: "dust", index: id };
    }

    const prev = pickRef.current;
    const same =
      (prev === null && next === null) ||
      (prev &&
        next &&
        prev.which === next.which &&
        prev.index === next.index);

    if (same) return;

    pickRef.current = next;

    let marker: Marker | null = null;
    if (next) {
      marker =
        next.which === "main"
          ? (mainMarkers[next.index] ?? null)
          : (dustMarkers[next.index] ?? null);
    }
    onHoverChange(marker);
  });

  return (
    <>
      <instancedMesh
        ref={mainRef}
        args={[SPHERE_GEO, mainMat, mainCap]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={dustRef}
        args={[SPHERE_GEO, dustMat, dustCap]}
        frustumCulled={false}
      />
    </>
  );
}

function OpportunityLand({
  layout,
  showPackDebug,
  hoverPortalEl,
}: {
  layout: OpportunitiesLayout;
  showPackDebug: boolean;
  hoverPortalEl: HTMLDivElement | null;
}) {
  const { markers, curatorLabels, extent, curatorPackZones } = layout;
  const [hovered, setHovered] = useState<Marker | null>(null);

  const onHoverChange = useCallback((m: Marker | null) => {
    setHovered((prev) => (prev?.id === m?.id ? prev : m));
  }, []);

  return (
    <>
      <DebugControls extent={extent} />
      <PackZoneDebugOverlay
        visible={showPackDebug}
        curatorZones={curatorPackZones}
        markers={markers}
      />
      <ambientLight intensity={1} />
      <axesHelper args={[Math.max(28, extent * 0.22)]} />
      <InstancedOpportunitySpheres
        markers={markers}
        onHoverChange={onHoverChange}
      />
      {hovered ? <OpportunityHoverLabel marker={hovered} /> : null}
      <OpportunityHoverScreenLabel marker={hovered} portalEl={hoverPortalEl} />
      {curatorLabels.map((p) => (
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
      ))}
    </>
  );
}

function SceneWithLayout({
  rows,
  showPackDebug,
  hoverPortalEl,
}: {
  rows: OpportunityRow[];
  showPackDebug: boolean;
  hoverPortalEl: HTMLDivElement | null;
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
    />
  );
}

export default function OpportunitiesField() {
  const [rows, setRows] = useState<OpportunityRow[] | null>(null);
  const [hoverPortalEl, setHoverPortalEl] = useState<HTMLDivElement | null>(null);

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
              />
            </Canvas>
            <OpportunityCsvStatsPanel rows={rows} />
            <div
              ref={setHoverPortalEl}
              className="pointer-events-none absolute inset-0 z-15"
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
