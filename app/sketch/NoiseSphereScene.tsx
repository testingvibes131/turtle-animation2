"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  parseOpportunityRows,
  type OpportunityRow,
} from "@/app/lib/opportunitiesCsv";
import {
  attachMeshBasicDepthFade,
  createMarkerDepthFadeUniforms,
  updateMarkerDepthFadeUniforms,
} from "@/app/v2/lib/markerDepthFade";
import { CuratorPlexusLines } from "@/app/sketch/components/CuratorPlexusLines";
import { depthSizeMultiplier } from "@/app/sketch/lib/sphereDepthSize";
import { assignRowsByCuratorToVertices } from "@/app/sketch/lib/assignCsvToVertices";
import {
  buildCuratorColorMap,
  groupPlexusEdgesByColor,
} from "@/app/sketch/lib/curatorColors";
import { buildCuratorPlexusEdges } from "@/app/sketch/lib/curatorPlexus";
import {
  useNoiseSphereControls,
  type PerlinBlobVisualParams,
} from "@/app/sketch/hooks/useNoiseSphereControls";
import {
  createIcosahedronVertices,
  displacedVertexPosition,
  estimateVertexSpacing,
  type PerlinBlobParams,
} from "@/app/sketch/lib/perlinBlob";

const CSV_PATH = "/data/turtle-opportunities.csv";
const BG = "#141514";
const POINT_COLOR = 0xf9f9f9;
const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const _dummy = new THREE.Object3D();

export type SphereHoverInfo = {
  name: string;
  curator: string;
  apr: number;
};

function PerlinBlobPoints({
  params,
  rows,
  onHover,
}: {
  params: PerlinBlobVisualParams;
  rows: OpportunityRow[] | null;
  onHover: (info: SphereHoverInfo | null) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const depthFadeUniforms = useMemo(
    () => createMarkerDepthFadeUniforms(),
    [],
  );

  const vertices = useMemo(
    () => createIcosahedronVertices(params.radius, params.detail),
    [params.radius, params.detail],
  );

  const rowAt = useMemo(
    () =>
      rows
        ? assignRowsByCuratorToVertices(
            vertices.positions,
            vertices.count,
            rows,
          )
        : null,
    [rows, vertices.positions, vertices.count],
  );

  const colorByCurator = useMemo(
    () => (rows ? buildCuratorColorMap(rows) : new Map<string, number>()),
    [rows],
  );

  const edges = useMemo(() => {
    if (!rowAt) return [];
    return buildCuratorPlexusEdges(rowAt, vertices.positions);
  }, [rowAt, vertices.positions]);

  const plexusGroups = useMemo(() => {
    if (!rowAt || edges.length === 0) return [];
    return groupPlexusEdgesByColor(edges, rowAt, colorByCurator);
  }, [rowAt, edges, colorByCurator]);

  const pointRadius = useMemo(
    () =>
      estimateVertexSpacing(params.radius, vertices.count) *
      params.pointSizeRatio,
    [params.radius, vertices.count, params.pointSizeRatio],
  );

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ color: POINT_COLOR });
    attachMeshBasicDepthFade(mat, depthFadeUniforms);
    return mat;
  }, [depthFadeUniforms]);

  useEffect(() => () => material.dispose(), [material]);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!rowAt) return;
    const id = e.instanceId;
    if (id === undefined || id < 0 || id >= rowAt.length) {
      onHover(null);
      document.body.style.cursor = "";
      return;
    }
    const row = rowAt[id];
    if (!row) {
      onHover(null);
      document.body.style.cursor = "";
      return;
    }
    document.body.style.cursor = "pointer";
    onHover({
      name: row.name,
      curator: row.curator.trim() || "Unknown",
      apr: row.estAprPercent,
    });
  };

  const handlePointerOut = () => {
    onHover(null);
    document.body.style.cursor = "";
  };

  useFrame((state) => {
    const blobParams: PerlinBlobParams = {
      ...params,
      time: state.clock.elapsedTime * params.timeSpeed,
    };

    const maxDisp =
      (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
    const extent = params.radius + maxDisp;
    const camDist = camera.position.length();
    const sizeNear = camDist - extent * params.depthSizeNearOffset;
    const sizeFar = camDist + extent * params.depthSizeFarOffset;

    const mesh = meshRef.current;
    if (mesh) {
      for (let i = 0; i < vertices.count; i++) {
        displacedVertexPosition(vertices, i, blobParams, _dummy.position);
        const dist = camera.position.distanceTo(_dummy.position);
        const scale =
          pointRadius *
          depthSizeMultiplier(
            dist,
            sizeNear,
            sizeFar,
            params.depthSizeMinMul,
            params.depthSizeMaxMul,
          );
        _dummy.scale.setScalar(scale);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    updateMarkerDepthFadeUniforms(
      depthFadeUniforms,
      camera,
      {
        near: camDist - extent * 0.55,
        far: camDist + extent * 0.75,
        closeNear: 0,
        closeFar: 0,
      },
      params.depthFadeMinOpacity,
    );
  });

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[SPHERE_GEO, material, vertices.count]}
        frustumCulled={false}
        renderOrder={0}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      />
      {plexusGroups.length > 0 ? (
        <CuratorPlexusLines
          groups={plexusGroups}
          vertices={vertices}
          params={params}
        />
      ) : null}
    </>
  );
}

function Scene({
  params,
  onHover,
}: {
  params: PerlinBlobVisualParams;
  onHover: (info: SphereHoverInfo | null) => void;
}) {
  const [rows, setRows] = useState<OpportunityRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(CSV_PATH)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setRows(parseOpportunityRows(text));
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <color attach="background" args={[BG]} />
      <PerlinBlobPoints params={params} rows={rows} onHover={onHover} />
      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        enabled={params.orbitEnabled}
      />
    </>
  );
}

function HoverLabel({ hover }: { hover: SphereHoverInfo }) {
  return (
    <div
      className="pointer-events-none absolute left-4 top-4 z-10 max-w-xs rounded-md border border-white/10 bg-black/70 px-3 py-2 text-sm text-[#f9f9f9] backdrop-blur-sm"
      role="status"
    >
      <p className="font-medium leading-snug">{hover.name}</p>
      <p className="text-white/55">{hover.curator}</p>
      <p className="text-white/70">{hover.apr.toFixed(2)}% APR</p>
    </div>
  );
}

export function NoiseSphereScene({
  params,
  onHover,
}: {
  params: PerlinBlobVisualParams;
  onHover: (info: SphereHoverInfo | null) => void;
}) {
  return (
    <Canvas
      className="h-full w-full touch-none"
      camera={{ position: [0, 0.15, 4.2], fov: 42, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <Scene params={params} onHover={onHover} />
    </Canvas>
  );
}

export function NoiseSphereSketch() {
  const params = useNoiseSphereControls();
  const [hover, setHover] = useState<SphereHoverInfo | null>(null);

  return (
    <>
      <NoiseSphereScene params={params} onHover={setHover} />
      {hover ? <HoverLabel hover={hover} /> : null}
    </>
  );
}
