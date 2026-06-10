"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  LineMaterial,
  LineSegments2,
  LineSegmentsGeometry,
} from "three-stdlib";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import {
  useBlobCuratorOverlayEnabled,
  useBlobMobileZoneCarouselEnabled,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import type { CuratorEdge } from "@/features/blob-scene/lib/curators/hoverPlexus";
import {
  displacedHubAnchorPosition,
  type HubAnchorOptions,
} from "@/features/blob-scene/lib/curators/zones";
import {
  applyHubAnchorRotationLag,
  hubAnchorRotationLagActive,
} from "@/features/blob-scene/lib/geometry/hubAnchorRotationLag";
import { RENDER_PLEXUS_LINES } from "@/features/blob-scene/lib/rendering/renderOrder";
import { readCachedVertexPosition } from "@/features/blob-scene/lib/geometry/blobVertexFrameCache";
import { mobilePulledHubLocal } from "@/features/blob-scene/lib/scroll/mobileHubLogo";
import type { IcosahedronVertexData } from "@/features/blob-scene/lib/geometry/perlinBlob";

export type ColoredPlexusGroup = {
  color: number;
  edges: CuratorEdge[];
};

const LINE_DASH_SIZE = 0.0075;
const LINE_GAP_SIZE = 0.01;

const _posA = new THREE.Vector3();
const _posB = new THREE.Vector3();
const _hubTarget = new THREE.Vector3();
const _hubAnchor = new THREE.Vector3();
const _wobbledHub = new THREE.Vector3();

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
  hubIndex,
  hubZoneDeg,
  hubPickOptions,
  getTowardCamera,
  blobAnimTimeRef,
  lockDashDistances = false,
}: {
  color: number;
  edges: CuratorEdge[];
  vertices: IcosahedronVertexData;
  params: BlobVisualParams;
  hubIndex: number;
  hubZoneDeg: number;
  hubPickOptions: HubAnchorOptions;
  getTowardCamera: () => THREE.Vector3;
  blobAnimTimeRef?: React.MutableRefObject<number>;
  /** Hero: recompute dash phase only when edges change, not every frame. */
  lockDashDistances?: boolean;
}) {
  const size = useThree((s) => s.size);
  const {
    blobGroupRef,
    blobFrameCacheRef,
    getBlobParamsAtTime,
    hubAnchorRotationLagRef,
  } = useBlobScene();
  const curatorOverlayEnabled = useBlobCuratorOverlayEnabled();
  const mobileCarouselEnabled = useBlobMobileZoneCarouselEnabled();
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

  const edgesKey = useMemo(
    () =>
      `${hubIndex}:${edges.map(([a, b]) => `${a}-${b}`).join(",")}`,
    [hubIndex, edges],
  );

  const committedEdgesKeyRef = useRef("");

  useFrame((state) => {
    const b = bundleRef.current;
    const arr = linePositionsRef.current;
    if (!b || !arr || edges.length === 0) return;

    if (lockDashDistances && committedEdgesKeyRef.current === edgesKey) {
      return;
    }

    const blobParams = getBlobParamsAtTime(
      blobAnimTimeRef?.current ??
        state.clock.elapsedTime * params.timeSpeed,
    );
    const frameCache = blobFrameCacheRef.current;
    if (!frameCache) return;

    // Hub anchor (outset + the SAME rotation lag as the logo), computed once per
    // frame. Every line end that touches the hub uses it, so the lines track
    // continuously to the logo as it orbits — globe-fixed point on one end, the
    // drifting logo on the other (like a tether from earth to a satellite).
    readCachedVertexPosition(frameCache, hubIndex, _wobbledHub);
    if (mobileCarouselEnabled) {
      // Mobile: same camera-centred anchor as the logo, so the lines stay pinned
      // to it (and the fan carries the per-partner difference).
      mobilePulledHubLocal(_wobbledHub, getTowardCamera(), _hubAnchor);
    } else {
      displacedHubAnchorPosition(
        vertices,
        hubIndex,
        getTowardCamera(),
        hubZoneDeg,
        { ...hubPickOptions, hubPickBlob: blobParams },
        blobParams,
        _hubTarget,
        _wobbledHub,
      );
      const lagState = hubAnchorRotationLagRef.current;
      if (hubAnchorRotationLagActive(lagState, curatorOverlayEnabled)) {
        applyHubAnchorRotationLag(
          _hubTarget,
          _hubAnchor,
          blobGroupRef.current?.rotation.y ?? 0,
          lagState.laggedRotationY,
        );
      } else {
        _hubAnchor.copy(_hubTarget);
      }
    }

    let p = 0;
    for (const [a, bIdx] of edges) {
      if (a === hubIndex) _posA.copy(_hubAnchor);
      else readCachedVertexPosition(frameCache, a, _posA);
      if (bIdx === hubIndex) _posB.copy(_hubAnchor);
      else readCachedVertexPosition(frameCache, bIdx, _posB);
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

    committedEdgesKeyRef.current = lockDashDistances ? edgesKey : "";
  });

  if (!bundle) return null;

  return <primitive object={bundle.lines} />;
}

export function CuratorPlexusLines({
  groups,
  vertices,
  params,
  hubIndex,
  hubZoneDeg,
  hubPickOptions,
  getTowardCamera,
  blobAnimTimeRef,
  lockDashDistances = false,
}: {
  groups: ColoredPlexusGroup[];
  vertices: IcosahedronVertexData;
  params: BlobVisualParams;
  hubIndex: number;
  hubZoneDeg: number;
  hubPickOptions: HubAnchorOptions;
  getTowardCamera: () => THREE.Vector3;
  blobAnimTimeRef?: React.MutableRefObject<number>;
  lockDashDistances?: boolean;
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
          hubIndex={hubIndex}
          hubZoneDeg={hubZoneDeg}
          hubPickOptions={hubPickOptions}
          getTowardCamera={getTowardCamera}
          blobAnimTimeRef={blobAnimTimeRef}
          lockDashDistances={lockDashDistances}
        />
      ))}
    </>
  );
}
