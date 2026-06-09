"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import { useBlobInteractionEnabled } from "@/features/blob-scene/context/BlobScrollProgressContext";
import {
  attachBlobPointFade,
  ensureInstanceOpacityBuffer,
  markInstanceOpacityDirty,
  setInstanceOpacityAt,
} from "@/features/blob-scene/lib/rendering/blobPointFade";
import { readCachedVertexPosition } from "@/features/blob-scene/lib/geometry/blobVertexFrameCache";
import { updateMarkerDepthFadeUniforms } from "@/features/blob-scene/lib/rendering/markerDepthFade";
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
    depthFadeUniforms,
    blobAnimTimeRef,
    zoneUsedRef,
    scalesRef,
    getTowardCamera,
    getBlobParamsAtTime,
    blobFrameCacheRef,
  } = useBlobScene();
  const rotationEnabled = useBlobInteractionEnabled();

  const pointGeo = useMemo(() => createSphereGeo(), []);
  const debugGeo = useMemo(() => createSphereGeo(), []);

  const pointMeshRef = useRef<THREE.InstancedMesh>(null);
  const debugPickableMeshRef = useRef<THREE.InstancedMesh>(null);

  const pointMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: POINT_COLOR,
      toneMapped: false,
    });
    attachBlobPointFade(mat, depthFadeUniforms);
    return mat;
  }, [depthFadeUniforms]);

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

  useEffect(() => {
    const debugMesh = debugPickableMeshRef.current;
    if (debugMesh) debugMesh.raycast = () => {};
  }, []);

  useFrame((state, delta) => {
    const group = blobGroupRef.current;
    const clockTime = state.clock.elapsedTime * params.timeSpeed;
    const shouldRotate = tickAnimationTime(clockTime);

    if (group && shouldRotate && rotationEnabled) {
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
      for (let vi = 0; vi < vertexIndices.length; vi++) {
        const i = vertexIndices[vi]!;
        writeInstance(pointMesh, i, vi, BLOB_POINT_SCALE_MUL, zoneUsed.has(i));
        writeOpacity(pointMesh, i, vi);
      }
      pointMesh.count = vertexIndices.length;
      pointMesh.instanceMatrix.needsUpdate = true;
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
      depthFadeUniforms,
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
