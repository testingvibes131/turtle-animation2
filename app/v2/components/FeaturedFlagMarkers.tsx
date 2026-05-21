"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import * as THREE from "three";
import {
  LineMaterial,
  LineSegments2,
  LineSegmentsGeometry,
} from "three-stdlib";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import { getFeaturedFlagPose } from "@/app/v2/lib/markerPosition";
import { updateFeaturedStickLineDistances } from "@/app/v2/lib/stickLineDistances";
import { isFeaturedFlagVisible } from "@/app/v2/lib/featuredPinVisuals";
import {
  attachLineMaterialDepthFade,
  attachMeshBasicDepthFade,
  updateMarkerDepthFadeUniforms,
  type MarkerDepthFadeRange,
  type MarkerDepthFadeUniforms,
} from "@/app/v2/lib/markerDepthFade";
import {
  sphereRadiusRatioFromVisuals,
  type TerrainVisualParams,
} from "@/app/v2/lib/terrainVisuals";
import { stickDashSizesFromVisuals } from "@/app/v2/lib/terrainVisuals";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";
import type { AprRange } from "@/app/v2/lib/apr";
import {
  FEATURED_PIN_SIZE_MUL,
  FEATURED_PIN_Y_OFFSET,
  featuredStickApr,
} from "@/app/v2/lib/featuredPinVisuals";

const FEATURED_PIN_PATH = "/featured-pin.png";
const TOP_PIN_GEO = new THREE.PlaneGeometry(1, 1);

useTexture.preload(FEATURED_PIN_PATH);

type FeaturedFlagMarkersProps = {
  featured: TerrainCell[];
  cellPitch: number;
  visuals: TerrainVisualParams;
  stickRef: RefObject<LineSegments2 | null>;
  topRef: RefObject<THREE.InstancedMesh | null>;
  waveRef: RefObject<TerrainWaveSnapshot>;
  markersMoveWithBelt: boolean;
  depthFadeUniforms: MarkerDepthFadeUniforms;
  depthFadeRange: MarkerDepthFadeRange;
  /** When set, show a flag on any crossing whose scrolled DNA is featured. */
  dnaLookup?: (TerrainCell | undefined)[][];
  /** Smoothed featured blend per flag cell index (fixed-offsetting). */
  dnaBlendsRef?: RefObject<Float32Array>;
  aprRange: AprRange;
};

export function FeaturedFlagMarkers(props: FeaturedFlagMarkersProps) {
  if (props.featured.length === 0) return null;

  return (
    <Suspense fallback={null}>
      <FeaturedFlagMarkersInner {...props} />
    </Suspense>
  );
}

function FeaturedFlagMarkersInner({
  featured,
  cellPitch,
  visuals,
  stickRef,
  topRef,
  waveRef,
  markersMoveWithBelt,
  depthFadeUniforms,
  depthFadeRange,
  dnaLookup,
  dnaBlendsRef,
  aprRange,
}: FeaturedFlagMarkersProps) {
  const count = featured.length;
  const sphereRadius = sphereRadiusRatioFromVisuals(visuals);
  const dummy = useRef(new THREE.Object3D());
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const pinTexture = useTexture(FEATURED_PIN_PATH);

  const positions = useMemo(
    () => new Float32Array(Math.max(count, 1) * 6),
    [count],
  );

  const dashSpans = useMemo(
    () => new Float32Array(Math.max(count, 1)),
    [count],
  );

  const lineGeo = useMemo(() => {
    const geo = new LineSegmentsGeometry();
    geo.setPositions(positions);
    return geo;
  }, [positions]);

  const { dashSize, gapSize, lineWidth } = useMemo(
    () => stickDashSizesFromVisuals(cellPitch, visuals),
    [cellPitch, visuals],
  );

  const stickMat = useMemo(() => {
    const mat = new LineMaterial({
      color: visuals.stickColor,
      linewidth: lineWidth,
      dashed: true,
      dashSize,
      gapSize,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    mat.defines.USE_DASH = "";
    attachLineMaterialDepthFade(mat, depthFadeUniforms);
    return mat;
  }, [dashSize, depthFadeUniforms, gapSize, lineWidth, visuals.stickColor]);

  useLayoutEffect(() => {
    stickMat.resolution.set(size.width, size.height);
  }, [size.height, size.width, stickMat]);

  useEffect(() => {
    stickMat.color.setHex(visuals.stickColor);
    stickMat.linewidth = visuals.stickLineWidth;
    stickMat.dashSize = Math.max(
      visuals.stickDashMin,
      cellPitch * visuals.stickDashMul,
    );
    stickMat.gapSize = Math.max(
      visuals.stickGapMin,
      cellPitch * visuals.stickGapMul,
    );
    stickMat.needsUpdate = true;
  }, [cellPitch, stickMat, visuals]);

  useLayoutEffect(() => {
    pinTexture.colorSpace = THREE.SRGBColorSpace;
    pinTexture.minFilter = THREE.LinearFilter;
    pinTexture.magFilter = THREE.LinearFilter;
    pinTexture.needsUpdate = true;
  }, [pinTexture]);

  const topMat = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      map: pinTexture,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
      toneMapped: false,
    });
    attachMeshBasicDepthFade(mat, depthFadeUniforms);
    return mat;
  }, [depthFadeUniforms, pinTexture]);

  const stickLines = useMemo(() => {
    const lines = new LineSegments2();
    lines.geometry = lineGeo;
    lines.material = stickMat;
    return lines;
  }, [lineGeo, stickMat]);

  const aliveRef = useRef(true);

  useLayoutEffect(() => {
    aliveRef.current = true;
    stickRef.current = stickLines;
    return () => {
      aliveRef.current = false;
      if (stickRef.current === stickLines) {
        stickRef.current = null;
      }
    };
  }, [stickLines, stickRef]);

  const write = useCallback(() => {
    if (!aliveRef.current) return;

    const topMesh = topRef.current;
    const { prepared, elapsed } = waveRef.current;
    if (!topMesh || !prepared || count === 0) {
      return;
    }

    const d = dummy.current;

    featured.forEach((cell, i) => {
      const base = i * 6;
      const blends = dnaBlendsRef?.current;
      const blend = blends ? (blends[i] ?? 0) : 1;
      const show = isFeaturedFlagVisible(
        cell,
        i,
        elapsed,
        dnaLookup,
        blends ?? null,
      );

      if (!show) {
        positions[base] = cell.x;
        positions[base + 1] = 0;
        positions[base + 2] = cell.z;
        positions[base + 3] = cell.x;
        positions[base + 4] = 0;
        positions[base + 5] = cell.z;
        dashSpans[i] = 0;
        d.position.set(cell.x, 0, cell.z);
        d.scale.setScalar(0);
        d.updateMatrix();
        topMesh.setMatrixAt(i, d.matrix);
        return;
      }

      const flag = getFeaturedFlagPose(
        cell,
        prepared,
        elapsed,
        markersMoveWithBelt,
        blends ? blend : 1,
        sphereRadius,
        {
          aprRange,
          stickApr: featuredStickApr(cell, elapsed, dnaLookup),
        },
      );

      const yBottom = flag.yStickCenter - flag.stickHeight * 0.5;
      const yTop = flag.yStickCenter + flag.stickHeight * 0.5;

      positions[base] = flag.x;
      positions[base + 1] = yBottom;
      positions[base + 2] = flag.z;
      positions[base + 3] = flag.x;
      positions[base + 4] = yTop;
      positions[base + 5] = flag.z;
      dashSpans[i] = flag.stickDashSpan;

      d.position.set(flag.x, flag.yTop + FEATURED_PIN_Y_OFFSET, flag.z);
      d.quaternion.copy(camera.quaternion);
      const pinSize = flag.topRadius * FEATURED_PIN_SIZE_MUL;
      d.scale.set(pinSize, pinSize, 1);
      d.updateMatrix();
      topMesh.setMatrixAt(i, d.matrix);
    });

    const slice = positions.subarray(0, count * 6);
    let geo = stickLines.geometry as LineSegmentsGeometry | null;
    if (!geo || geo !== lineGeo) {
      stickLines.geometry = lineGeo;
      geo = lineGeo;
    }

    const instanceStart = geo.attributes?.instanceStart;
    const instanceBuf =
      instanceStart instanceof THREE.InterleavedBufferAttribute
        ? instanceStart.data
        : undefined;
    if (instanceBuf?.array) {
      instanceBuf.array.set(slice);
      instanceBuf.needsUpdate = true;
    } else {
      geo.setPositions(slice);
    }

    if (geo) {
      updateFeaturedStickLineDistances(geo, dashSpans, count);
    }

    topMesh.count = count;
    topMesh.instanceMatrix.needsUpdate = true;
  }, [
    count,
    dashSpans,
    dnaBlendsRef,
    dnaLookup,
    featured,
    lineGeo,
    markersMoveWithBelt,
    positions,
    stickLines,
    camera,
    topRef,
    sphereRadius,
    waveRef,
  ]);

  useLayoutEffect(() => {
    write();
  }, [write]);

  useFrame(() => {
    updateMarkerDepthFadeUniforms(
      depthFadeUniforms,
      camera,
      depthFadeRange,
      visuals.depthFadeMinOpacity,
    );
    write();
  });

  useEffect(() => {
    return () => {
      stickMat.dispose();
      topMat.dispose();
      lineGeo.dispose();
    };
  }, [lineGeo, stickMat, topMat]);

  return (
    <>
      <primitive object={stickLines} frustumCulled={false} renderOrder={2} />
      <instancedMesh
        ref={topRef}
        args={[TOP_PIN_GEO, topMat, count]}
        frustumCulled={false}
        renderOrder={3}
      />
    </>
  );
}
