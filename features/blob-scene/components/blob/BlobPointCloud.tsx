"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import {
  attachBlobPointFade,
  ensureInstanceOpacityBuffer,
  markInstanceOpacityDirty,
  setInstanceOpacityAt,
} from "@/features/blob-scene/lib/rendering/blobPointFade";
import { readCachedVertexPosition } from "@/features/blob-scene/lib/geometry/blobVertexFrameCache";
import {
  createMarkerDepthFadeUniforms,
  updateMarkerDepthFadeUniforms,
} from "@/features/blob-scene/lib/rendering/markerDepthFade";
import { noiseSlopeOpacityFromDisplacement } from "@/features/blob-scene/lib/geometry/noiseSlopeOpacity";
import { vertexFacesCamera } from "@/features/blob-scene/lib/geometry/frontHemisphere";
import { depthSizeMultiplier } from "@/features/blob-scene/lib/geometry/sphereDepthSize";
import {
  RENDER_DEBUG_PICKABLE,
  RENDER_SPHERE,
} from "@/features/blob-scene/lib/rendering/renderOrder";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";
import type { RefObject } from "react";

const POINT_COLOR = 0x2c2d2b;
const DEBUG_PICKABLE_COLOR = 0x2973ff;
const BLOB_POINT_SCALE_MUL = 1.25;
const DEBUG_PICKABLE_SCALE_MUL = 1.08;
const createSphereGeo = () => new THREE.SphereGeometry(1, 10, 8);
const _dummy = new THREE.Object3D();
const _worldPos = new THREE.Vector3();

/** Distinct shader cache key so the base cloud gets its own depth-fade program +
 *  uniforms — the hover overlay can't leak its raised fade-min into it. */
const BASE_POINT_FADE_KEY = "sketchBlobPointFadeBaseV1";

const GRADIENT_GRAY = new THREE.Color(POINT_COLOR);
/** Resting: a faint silvery light that ripples over the cloud (no color). */
const SILVER_COLOR = new THREE.Color(0xdfe6ee);
/** Glow strength for the resting silver ripple. */
const GRADIENT_MIX = 0.1;
/** Cycles per second the silver ripple drifts across the cloud. */
const GRADIENT_DRIFT = 0.3;
/** Spatial frequency of the silver ripple around the cloud. */
const GRADIENT_RIPPLE_FREQ = 1.5;
const _gradColor = new THREE.Color();
const TAU = Math.PI * 2;
const fract = (v: number) => v - Math.floor(v);

type BlobPointCloudProps = {
  blobGroupRef: RefObject<THREE.Group | null>;
  tickAnimationTime: (clockTime: number) => boolean;
};

export function BlobPointCloud({
  blobGroupRef,
  tickAnimationTime,
}: BlobPointCloudProps) {
  const {
    vertices,
    params,
    pointRadius,
    vertexIndices,
    blobAnimTimeRef,
    zoneUsedRef,
    scalesRef,
    getTowardCamera,
    getBlobParamsAtTime,
    blobFrameCacheRef,
  } = useBlobScene();
  // The base cloud owns its depth-fade uniforms (+ shader key above) so the hover
  // overlay, which raises uFadeMin to keep connected markers visible, can't leak
  // into it and light up the faded back dots — which would flatten the depth.
  const fadeUniforms = useMemo(() => createMarkerDepthFadeUniforms(), []);

  const pointGeo = useMemo(() => createSphereGeo(), []);
  const debugGeo = useMemo(() => createSphereGeo(), []);

  // Per-vertex hue phase from the (stable) base sphere positions: angle around Y
  // gives a smooth hue wrap; a small Y term tilts it diagonally so the gradient
  // reads as light falling across the cloud rather than a flat band.
  const gradientPhase = useMemo(() => {
    const positions = vertices.positions;
    const phase = new Float32Array(vertices.count);
    for (let i = 0; i < vertices.count; i++) {
      const x = positions[i * 3]!;
      const y = positions[i * 3 + 1]!;
      const z = positions[i * 3 + 2]!;
      phase[i] = fract(Math.atan2(z, x) / (Math.PI * 2) + 0.5 + y * 0.12);
    }
    return phase;
  }, [vertices]);

  const pointMeshRef = useRef<THREE.InstancedMesh>(null);
  const debugPickableMeshRef = useRef<THREE.InstancedMesh>(null);

  const pointMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      // White base so the per-instance gradient colors show through 1:1.
      color: 0xffffff,
      toneMapped: false,
    });
    attachBlobPointFade(mat, fadeUniforms, BASE_POINT_FADE_KEY);
    return mat;
  }, [fadeUniforms]);

  const debugPickableMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: DEBUG_PICKABLE_COLOR,
        toneMapped: false,
        depthWrite: false,
        depthTest: true,
      }),
    [],
  );

  useEffect(() => () => pointMaterial.dispose(), [pointMaterial]);
  useEffect(() => () => debugPickableMaterial.dispose(), [debugPickableMaterial]);

  // Theme-reactive resting colour for the point cloud — reads the --blob-point
  // token and re-applies on theme change. Partner washes keep their own colours.
  useEffect(() => {
    const applyThemeColor = () => {
      const cs = getComputedStyle(document.documentElement);
      const point = cs.getPropertyValue("--blob-point").trim();
      if (point) GRADIENT_GRAY.set(point);
      // Shimmer follows the gradient rule: white-in-dark → ink-in-light.
      const shimmer = cs.getPropertyValue("--blob-shimmer").trim();
      if (shimmer) SILVER_COLOR.set(shimmer);
    };
    applyThemeColor();
    const obs = new MutationObserver(applyThemeColor);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const debugMesh = debugPickableMeshRef.current;
    if (debugMesh) debugMesh.raycast = () => {};
  }, []);

  useFrame((state, delta) => {
    const group = blobGroupRef.current;
    const clockTime = state.clock.elapsedTime * params.timeSpeed;
    const shouldRotate = tickAnimationTime(clockTime);

    // Orbit continuously (including dispersed/landing mode); the hover freeze
    // pauses the Perlin morph, not this Y-spin.
    if (group && shouldRotate) {
      group.rotation.y += params.rotationSpeed * delta;
    }

    const blobParams: PerlinBlobParams = getBlobParamsAtTime(
      blobAnimTimeRef.current,
    );
    const frameCache = blobFrameCacheRef.current;
    if (!frameCache) return;

    const maxDisp =
      (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
    const extent = params.radius + maxDisp;
    const camDist = state.camera.position.length();
    const sizeNear = camDist - extent * params.depthSizeNearOffset;
    const sizeFar = camDist + extent * params.depthSizeFarOffset;

    const pointMesh = pointMeshRef.current;
    const zoneUsed = zoneUsedRef.current;

    let scales = scalesRef.current;
    if (scales.length !== vertices.count) {
      scales = new Float32Array(vertices.count);
      scalesRef.current = scales;
    }

    const writeInstance = (
      mesh: THREE.InstancedMesh,
      vertexIndex: number,
      slot: number,
      scaleMul: number,
      hide: boolean,
    ) => {
      readCachedVertexPosition(frameCache, vertexIndex, _dummy.position);
      _worldPos.copy(_dummy.position);
      if (group) group.localToWorld(_worldPos);
      const dist = state.camera.position.distanceTo(_worldPos);
      const visualScale =
        pointRadius *
        scaleMul *
        depthSizeMultiplier(
          dist,
          sizeNear,
          sizeFar,
          params.depthSizeMinMul,
          params.depthSizeMaxMul,
        );
      scales[vertexIndex] = visualScale;
      _dummy.scale.setScalar(hide ? 0 : visualScale);
      _dummy.rotation.set(0, 0, 0);
      _dummy.updateMatrix();
      mesh.setMatrixAt(slot, _dummy.matrix);
    };

    const writeOpacity = (
      mesh: THREE.InstancedMesh,
      vertexIndex: number,
      slot: number,
    ) => {
      if (zoneUsed.has(vertexIndex)) return;
      setInstanceOpacityAt(
        mesh,
        slot,
        noiseSlopeOpacityFromDisplacement(
          frameCache.displacement[vertexIndex]!,
          blobParams,
          params.noiseSlopeMinOpacity,
          params.noiseSlopeMaxOpacity,
        ),
      );
    };

    if (pointMesh) {
      ensureInstanceOpacityBuffer(pointMesh, vertexIndices.length);
      const gradientT = state.clock.elapsedTime * GRADIENT_DRIFT;
      for (let vi = 0; vi < vertexIndices.length; vi++) {
        const i = vertexIndices[vi]!;
        writeInstance(pointMesh, i, vi, BLOB_POINT_SCALE_MUL, zoneUsed.has(i));
        writeOpacity(pointMesh, i, vi);
        // Lighting, not pigment: keep the dot gray and ADD a faint glow, stronger
        // where the surface structure catches it (noise slope ~ edges).
        const slope = noiseSlopeOpacityFromDisplacement(
          frameCache.displacement[i]!,
          blobParams,
          params.noiseSlopeMinOpacity,
          params.noiseSlopeMaxOpacity,
        );
        _gradColor.copy(GRADIENT_GRAY);
        // Resting: faint silver light rippling across the cloud (moving sine),
        // fading out as a partner is hovered.
        const ripple =
          0.5 +
          0.5 *
            Math.sin(
              gradientPhase[i]! * TAU * GRADIENT_RIPPLE_FREQ + gradientT,
            );
        const silverGlow = GRADIENT_MIX * slope * ripple;
        // Lerp toward the shimmer (not add) so it lightens in dark and darkens in
        // light — the gradient rule, white-in-dark → ink-in-light.
        _gradColor.lerp(SILVER_COLOR, silverGlow);
        // Point-cloud dots stay on the silver gradient when a partner is
        // selected — the connector lines + central logo carry the partner;
        // the dots don't take its colour.
        pointMesh.setColorAt(vi, _gradColor);
      }
      pointMesh.count = vertexIndices.length;
      pointMesh.instanceMatrix.needsUpdate = true;
      if (pointMesh.instanceColor) pointMesh.instanceColor.needsUpdate = true;
      markInstanceOpacityDirty(pointMesh);
    }

    const toward = getTowardCamera();
    const debugMesh = debugPickableMeshRef.current;
    if (debugMesh) {
      let pi = 0;
      if (params.debugHoverZone) {
        for (let vi = 0; vi < vertexIndices.length; vi++) {
          const i = vertexIndices[vi]!;
          if (
            !vertexFacesCamera(
              vertices.positions,
              i,
              toward,
              params.frontMinDot,
            )
          ) {
            continue;
          }
          writeInstance(
            debugMesh,
            i,
            pi,
            BLOB_POINT_SCALE_MUL * DEBUG_PICKABLE_SCALE_MUL,
            false,
          );
          pi++;
        }
      }
      debugMesh.count = pi;
      debugMesh.instanceMatrix.needsUpdate = true;
    }

    updateMarkerDepthFadeUniforms(
      fadeUniforms,
      state.camera,
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
        ref={pointMeshRef}
        args={[pointGeo, pointMaterial, vertexIndices.length]}
        frustumCulled={false}
        renderOrder={RENDER_SPHERE}
      />
      <instancedMesh
        ref={debugPickableMeshRef}
        args={[debugGeo, debugPickableMaterial, vertexIndices.length]}
        frustumCulled={false}
        renderOrder={RENDER_DEBUG_PICKABLE}
      />
    </>
  );
}
