"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  LineMaterial,
  LineSegments2,
  LineSegmentsGeometry,
} from "three-stdlib";
import type { PerlinBlobVisualParams } from "@/app/sketch/hooks/useNoiseSphereControls";
import type { CuratorEdge } from "@/app/sketch/lib/hoverPlexus";
import { RENDER_PLEXUS_LINES } from "@/app/sketch/lib/sketchRenderOrder";
import {
  displacedVertexPosition,
  type IcosahedronVertexData,
  type PerlinBlobParams,
} from "@/app/sketch/lib/perlinBlob";

export type ColoredPlexusGroup = {
  color: number;
  edges: CuratorEdge[];
};

const LINE_DASH_SIZE = 0.0075;
const LINE_GAP_SIZE = 0.01;

const _posA = new THREE.Vector3();
const _posB = new THREE.Vector3();

type PlexusBundle = {
  lines: LineSegments2;
  geometry: LineSegmentsGeometry;
  material: LineMaterial;
};

function PlexusLineBatch({
  color,
  edges,
  vertices,
  params,
}: {
  color: number;
  edges: CuratorEdge[];
  vertices: IcosahedronVertexData;
  params: PerlinBlobVisualParams;
}) {
  const size = useThree((s) => s.size);
  const linePositionsRef = useRef<Float32Array | null>(null);
  const bundleRef = useRef<PlexusBundle | null>(null);

  const bundle = useMemo((): PlexusBundle | null => {
    if (edges.length === 0) return null;

    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(new Float32Array(edges.length * 6));

    const material = new LineMaterial({
      color,
      linewidth: params.lineWidth,
      dashed: true,
      dashSize: LINE_DASH_SIZE,
      gapSize: LINE_GAP_SIZE,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: false,
    });
    material.defines.USE_DASH = "";

    const lines = new LineSegments2(geometry, material);
    lines.frustumCulled = false;
    lines.renderOrder = RENDER_PLEXUS_LINES;
    lines.computeLineDistances();

    return { lines, geometry, material };
  }, [color, edges, params.lineWidth]);

  useEffect(() => {
    linePositionsRef.current = new Float32Array(edges.length * 6);
  }, [edges]);

  useLayoutEffect(() => {
    bundleRef.current = bundle;
    return () => {
      bundleRef.current = null;
    };
  }, [bundle]);

  useLayoutEffect(() => {
    if (!bundle) return;
    bundle.material.resolution.set(size.width, size.height);
    bundle.material.linewidth = params.lineWidth;
    bundle.material.needsUpdate = true;
  }, [bundle, params.lineWidth, size.height, size.width]);

  useEffect(() => {
    return () => {
      bundle?.geometry.dispose();
      bundle?.material.dispose();
    };
  }, [bundle]);

  useFrame((state) => {
    const b = bundleRef.current;
    const arr = linePositionsRef.current;
    if (!b || !arr || edges.length === 0) return;

    const blobParams: PerlinBlobParams = {
      ...params,
      time: state.clock.elapsedTime * params.timeSpeed,
    };

    let p = 0;
    for (const [a, bIdx] of edges) {
      displacedVertexPosition(vertices, a, blobParams, _posA);
      displacedVertexPosition(vertices, bIdx, blobParams, _posB);
      arr[p++] = _posA.x;
      arr[p++] = _posA.y;
      arr[p++] = _posA.z;
      arr[p++] = _posB.x;
      arr[p++] = _posB.y;
      arr[p++] = _posB.z;
    }

    b.geometry.setPositions(arr);
    b.lines.computeLineDistances();
    b.lines.renderOrder = RENDER_PLEXUS_LINES;
  });

  if (!bundle) return null;

  return <primitive object={bundle.lines} />;
}

export function CuratorPlexusLines({
  groups,
  vertices,
  params,
}: {
  groups: ColoredPlexusGroup[];
  vertices: IcosahedronVertexData;
  params: PerlinBlobVisualParams;
}) {
  return (
    <>
      {groups.map((g) => (
        <PlexusLineBatch
          key={g.color}
          color={g.color}
          edges={g.edges}
          vertices={vertices}
          params={params}
        />
      ))}
    </>
  );
}
