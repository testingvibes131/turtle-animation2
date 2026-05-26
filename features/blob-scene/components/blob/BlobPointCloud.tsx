"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import {
  attachBlobPointFade,
  ensureInstanceOpacityBuffer,
  setInstanceOpacityAt,
} from "@/features/blob-scene/lib/rendering/blobPointFade";
import { updateMarkerDepthFadeUniforms } from "@/features/blob-scene/lib/rendering/markerDepthFade";
import { noiseSlopeOpacityMul } from "@/features/blob-scene/lib/geometry/noiseSlopeOpacity";
import { vertexFacesCamera } from "@/features/blob-scene/lib/geometry/frontHemisphere";
import { depthSizeMultiplier } from "@/features/blob-scene/lib/geometry/sphereDepthSize";
import {
  RENDER_DEBUG_PICKABLE,
  RENDER_SPHERE,
} from "@/features/blob-scene/lib/rendering/renderOrder";
import {
  displacedVertexPosition,
  type PerlinBlobParams,
} from "@/features/blob-scene/lib/geometry/perlinBlob";
import type { RefObject } from "react";

const POINT_COLOR = 0x2c2d2b;
const DEBUG_PICKABLE_COLOR = 0x2973ff;
const BLOB_POINT_SCALE_MUL = 1.25;
const DEBUG_PICKABLE_SCALE_MUL = 1.08;
const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
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
    liveIndices,
    deadIndices,
    depthFadeUniforms,
    blobAnimTimeRef,
    zoneUsedRef,
    scalesRef,
    getTowardCamera,
  } = useBlobScene();

  const liveMeshRef = useRef<THREE.InstancedMesh>(null);
  const deadMeshRef = useRef<THREE.InstancedMesh>(null);
  const debugPickableMeshRef = useRef<THREE.InstancedMesh>(null);

  const liveMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: POINT_COLOR,
      toneMapped: false,
    });
    attachBlobPointFade(mat, depthFadeUniforms);
    return mat;
  }, [depthFadeUniforms]);

  const deadMaterial = useMemo(() => {
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

  useEffect(() => () => liveMaterial.dispose(), [liveMaterial]);
  useEffect(() => () => deadMaterial.dispose(), [deadMaterial]);
  useEffect(() => () => debugPickableMaterial.dispose(), [debugPickableMaterial]);

  useEffect(() => {
    const deadMesh = deadMeshRef.current;
    if (deadMesh) deadMesh.raycast = () => {};
    const debugMesh = debugPickableMeshRef.current;
    if (debugMesh) debugMesh.raycast = () => {};
  }, []);

  useFrame((state, delta) => {
    const group = blobGroupRef.current;
    const clockTime = state.clock.elapsedTime * params.timeSpeed;
    const shouldRotate = tickAnimationTime(clockTime);

    if (group && shouldRotate) {
      group.rotation.y += params.rotationSpeed * delta;
    }

    const blobParams: PerlinBlobParams = {
      ...params,
      time: blobAnimTimeRef.current,
    };

    const maxDisp =
      (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
    const extent = params.radius + maxDisp;
    const camDist = state.camera.position.length();
    const sizeNear = camDist - extent * params.depthSizeNearOffset;
    const sizeFar = camDist + extent * params.depthSizeFarOffset;

    const liveMesh = liveMeshRef.current;
    const deadMesh = deadMeshRef.current;
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
      displacedVertexPosition(vertices, vertexIndex, blobParams, _dummy.position);
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
      _dummy.updateMatrix();
      mesh.setMatrixAt(slot, _dummy.matrix);
    };

    if (liveMesh) {
      ensureInstanceOpacityBuffer(liveMesh, liveIndices.length);
      for (let li = 0; li < liveIndices.length; li++) {
        const i = liveIndices[li]!;
        writeInstance(
          liveMesh,
          i,
          li,
          BLOB_POINT_SCALE_MUL,
          zoneUsed.has(i),
        );
        if (!zoneUsed.has(i)) {
          setInstanceOpacityAt(
            liveMesh,
            li,
            noiseSlopeOpacityMul(
              vertices,
              i,
              blobParams,
              params.noiseSlopeMinOpacity,
              params.noiseSlopeMaxOpacity,
            ),
          );
        }
      }
      liveMesh.instanceMatrix.needsUpdate = true;
    }

    if (deadMesh) {
      ensureInstanceOpacityBuffer(deadMesh, deadIndices.length);
      for (let di = 0; di < deadIndices.length; di++) {
        const i = deadIndices[di]!;
        writeInstance(
          deadMesh,
          i,
          di,
          BLOB_POINT_SCALE_MUL,
          zoneUsed.has(i),
        );
        if (!zoneUsed.has(i)) {
          setInstanceOpacityAt(
            deadMesh,
            di,
            noiseSlopeOpacityMul(
              vertices,
              i,
              blobParams,
              params.noiseSlopeMinOpacity,
              params.noiseSlopeMaxOpacity,
            ),
          );
        }
      }
      deadMesh.instanceMatrix.needsUpdate = true;
    }

    const toward = getTowardCamera();
    const debugMesh = debugPickableMeshRef.current;
    if (debugMesh) {
      let pi = 0;
      if (params.debugHoverZone) {
        for (let li = 0; li < liveIndices.length; li++) {
          const i = liveIndices[li]!;
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
        ref={liveMeshRef}
        args={[SPHERE_GEO, liveMaterial, liveIndices.length]}
        frustumCulled={false}
        renderOrder={RENDER_SPHERE}
      />
      <instancedMesh
        ref={deadMeshRef}
        args={[SPHERE_GEO, deadMaterial, deadIndices.length]}
        frustumCulled={false}
        renderOrder={RENDER_SPHERE}
      />
      <instancedMesh
        ref={debugPickableMeshRef}
        args={[SPHERE_GEO, debugPickableMaterial, liveIndices.length]}
        frustumCulled={false}
        renderOrder={RENDER_DEBUG_PICKABLE}
      />
    </>
  );
}
