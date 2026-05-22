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
import type { ColoredPlexusGroup } from "@/app/sketch/lib/curatorColors";
import type { CuratorEdge } from "@/app/sketch/lib/curatorPlexus";
import {
  displacedVertexPosition,
  type IcosahedronVertexData,
  type PerlinBlobParams,
} from "@/app/sketch/lib/perlinBlob";

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
      transparent: true,
      opacity: params.lineOpacity,
      depthWrite: false,
      depthTest: false,
    });

    const lines = new LineSegments2(geometry, material);
    lines.frustumCulled = false;
    lines.renderOrder = 10;

    return { lines, geometry, material };
  }, [color, edges, params.lineOpacity, params.lineWidth]);

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
    bundle.material.opacity = params.lineOpacity;
    bundle.material.needsUpdate = true;
  }, [bundle, params.lineOpacity, params.lineWidth, size.height, size.width]);

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
