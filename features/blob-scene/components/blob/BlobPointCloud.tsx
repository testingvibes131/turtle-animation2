"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import {
  useBlobColoredDotsMix,
  useBlobColoredDotsTuning,
  useBlobColoredToGrayMix,
  useBlobInteractionEnabled,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import { CURATORS } from "@/features/blob-scene/lib/curators/catalog";
import {
  attachBlobPointFade,
  ensureInstanceOpacityBuffer,
  markInstanceOpacityDirty,
  setInstanceOpacityAt,
} from "@/features/blob-scene/lib/rendering/blobPointFade";
import { readCachedVertexPosition } from "@/features/blob-scene/lib/geometry/blobVertexFrameCache";
import { createColoredSparkTexture } from "@/features/blob-scene/lib/rendering/coloredSparkTexture";
import { updateMarkerDepthFadeUniforms } from "@/features/blob-scene/lib/rendering/markerDepthFade";
import { noiseSlopeOpacityFromDisplacement } from "@/features/blob-scene/lib/geometry/noiseSlopeOpacity";
import { vertexFacesCamera } from "@/features/blob-scene/lib/geometry/frontHemisphere";
import { depthSizeMultiplier } from "@/features/blob-scene/lib/geometry/sphereDepthSize";
import {
  RENDER_DEBUG_PICKABLE,
  RENDER_SPHERE,
} from "@/features/blob-scene/lib/rendering/renderOrder";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";
import { buildCuratorVertexBuckets } from "@/features/blob-scene/lib/geometry/blobVertexCuratorColors";
import type { RefObject } from "react";

const POINT_COLOR = 0x2c2d2b;
const DEBUG_PICKABLE_COLOR = 0x2973ff;
const BLOB_POINT_SCALE_MUL = 1.25;
const DEBUG_PICKABLE_SCALE_MUL = 1.08;
const createSphereGeo = () => new THREE.SphereGeometry(1, 10, 8);
const createSparkGeo = () => new THREE.PlaneGeometry(1, 1);
const _dummy = new THREE.Object3D();
const _worldPos = new THREE.Vector3();
const _cameraLocal = new THREE.Vector3();
const _sparkQuat = new THREE.Quaternion();

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
    getBlobParamsAtTime,
    blobFrameCacheRef,
  } = useBlobScene();
  const coloredMix = useBlobColoredDotsMix();
  const grayMix = useBlobColoredToGrayMix();
  const coloredDotsTuning = useBlobColoredDotsTuning();
  const rotationEnabled = useBlobInteractionEnabled();

  const curatorBuckets = useMemo(
    () => buildCuratorVertexBuckets(liveIndices, deadIndices),
    [liveIndices, deadIndices],
  );

  const sparkTexture = useMemo(() => createColoredSparkTexture(), []);

  const liveGeo = useMemo(() => createSphereGeo(), []);
  const deadGeo = useMemo(() => createSphereGeo(), []);
  const sparkGeo = useMemo(() => createSparkGeo(), []);
  const debugGeo = useMemo(() => createSphereGeo(), []);

  const liveMeshRef = useRef<THREE.InstancedMesh>(null);
  const deadMeshRef = useRef<THREE.InstancedMesh>(null);
  const curatorSparkMeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const curatorSparkHaloMeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
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

  const curatorSparkMaterials = useMemo(
    () =>
      CURATORS.map((curator) => {
        const color = new THREE.Color(curator.color).multiplyScalar(
          coloredDotsTuning.colorDim,
        );
        const mat = new THREE.MeshBasicMaterial({
          color,
          map: sparkTexture,
          transparent: true,
          opacity: coloredDotsTuning.coreOpacity,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
          depthWrite: false,
        });
        attachBlobPointFade(mat, depthFadeUniforms);
        return mat;
      }),
    [coloredDotsTuning.colorDim, coloredDotsTuning.coreOpacity, depthFadeUniforms, sparkTexture],
  );

  const curatorSparkHaloMaterials = useMemo(
    () =>
      CURATORS.map((curator) => {
        const color = new THREE.Color(curator.color).multiplyScalar(
          coloredDotsTuning.colorDim,
        );
        const mat = new THREE.MeshBasicMaterial({
          color,
          map: sparkTexture,
          transparent: true,
          opacity: coloredDotsTuning.glowOpacity,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
          depthWrite: false,
        });
        attachBlobPointFade(mat, depthFadeUniforms);
        return mat;
      }),
    [coloredDotsTuning.colorDim, coloredDotsTuning.glowOpacity, depthFadeUniforms, sparkTexture],
  );

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
  useEffect(
    () => () => curatorSparkMaterials.forEach((mat) => mat.dispose()),
    [curatorSparkMaterials],
  );
  useEffect(
    () => () => curatorSparkHaloMaterials.forEach((mat) => mat.dispose()),
    [curatorSparkHaloMaterials],
  );
  useEffect(() => () => debugPickableMaterial.dispose(), [debugPickableMaterial]);
  useEffect(() => () => sparkTexture.dispose(), [sparkTexture]);

  useEffect(() => {
    const deadMesh = deadMeshRef.current;
    if (deadMesh) deadMesh.raycast = () => {};
    const debugMesh = debugPickableMeshRef.current;
    if (debugMesh) debugMesh.raycast = () => {};
    for (const mesh of curatorSparkMeshRefs.current) {
      if (mesh) mesh.raycast = () => {};
    }
    for (const mesh of curatorSparkHaloMeshRefs.current) {
      if (mesh) mesh.raycast = () => {};
    }
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

    const liveMesh = liveMeshRef.current;
    const deadMesh = deadMeshRef.current;
    const zoneUsed = zoneUsedRef.current;

    let scales = scalesRef.current;
    if (scales.length !== vertices.count) {
      scales = new Float32Array(vertices.count);
      scalesRef.current = scales;
    }

    let sparkQuatReady = false;
    if (coloredMix > 0.001 && group) {
      _cameraLocal.copy(state.camera.position);
      group.worldToLocal(_cameraLocal);
      _dummy.position.set(0, 0, 0);
      _dummy.lookAt(_cameraLocal);
      _sparkQuat.copy(_dummy.quaternion);
      sparkQuatReady = true;
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

    const writeColoredSparkInstance = (
      mesh: THREE.InstancedMesh,
      vertexIndex: number,
      slot: number,
      hide: boolean,
      radiusMul = 1,
    ) => {
      readCachedVertexPosition(frameCache, vertexIndex, _dummy.position);
      _worldPos.copy(_dummy.position);
      if (group) group.localToWorld(_worldPos);
      const dist = state.camera.position.distanceTo(_worldPos);
      const visualScale =
        pointRadius *
        BLOB_POINT_SCALE_MUL *
        coloredDotsTuning.sparkRadiusMul *
        coloredDotsTuning.glowScaleMul *
        radiusMul *
        depthSizeMultiplier(
          dist,
          sizeNear,
          sizeFar,
          params.depthSizeMinMul,
          params.depthSizeMaxMul,
        );
      scales[vertexIndex] = visualScale;

      if (hide) {
        _dummy.scale.set(0, 0, 0);
      } else {
        _dummy.scale.set(visualScale, visualScale, 1);
        if (sparkQuatReady) _dummy.quaternion.copy(_sparkQuat);
      }
      _dummy.updateMatrix();
      mesh.setMatrixAt(slot, _dummy.matrix);
    };

    const writeOpacity = (
      mesh: THREE.InstancedMesh,
      vertexIndex: number,
      slot: number,
      mix = 1,
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
        ) * mix,
      );
    };

    if (coloredMix > 0.001) {
      for (let ci = 0; ci < CURATORS.length; ci++) {
        const mesh = curatorSparkMeshRefs.current[ci];
        const haloMesh = curatorSparkHaloMeshRefs.current[ci];
        const bucket = curatorBuckets.buckets[ci]!;
        if (!mesh) continue;

        ensureInstanceOpacityBuffer(mesh, bucket.length);
        if (haloMesh) ensureInstanceOpacityBuffer(haloMesh, bucket.length);

        for (let slot = 0; slot < bucket.length; slot++) {
          const vertexIndex = bucket[slot]!;
          const hidden = zoneUsed.has(vertexIndex);
          writeColoredSparkInstance(mesh, vertexIndex, slot, hidden);
          writeOpacity(mesh, vertexIndex, slot, coloredMix);
          if (haloMesh) {
            writeColoredSparkInstance(
              haloMesh,
              vertexIndex,
              slot,
              hidden,
              coloredDotsTuning.haloRadiusMul,
            );
            writeOpacity(haloMesh, vertexIndex, slot, coloredMix);
          }
        }
        mesh.count = bucket.length;
        mesh.instanceMatrix.needsUpdate = true;
        markInstanceOpacityDirty(mesh);
        if (haloMesh) {
          haloMesh.count = bucket.length;
          haloMesh.instanceMatrix.needsUpdate = true;
          markInstanceOpacityDirty(haloMesh);
        }
      }
    } else {
      for (let ci = 0; ci < CURATORS.length; ci++) {
        const mesh = curatorSparkMeshRefs.current[ci];
        if (mesh) mesh.count = 0;
        const haloMesh = curatorSparkHaloMeshRefs.current[ci];
        if (haloMesh) haloMesh.count = 0;
      }
    }

    if (grayMix > 0.001) {
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
          writeOpacity(liveMesh, i, li, grayMix);
        }
        liveMesh.count = liveIndices.length;
        liveMesh.instanceMatrix.needsUpdate = true;
        markInstanceOpacityDirty(liveMesh);
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
          writeOpacity(deadMesh, i, di, grayMix);
        }
        deadMesh.count = deadIndices.length;
        deadMesh.instanceMatrix.needsUpdate = true;
        markInstanceOpacityDirty(deadMesh);
      }
    } else {
      if (liveMesh) liveMesh.count = 0;
      if (deadMesh) deadMesh.count = 0;
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
        args={[liveGeo, liveMaterial, liveIndices.length]}
        frustumCulled={false}
        renderOrder={RENDER_SPHERE}
      />
      <instancedMesh
        ref={deadMeshRef}
        args={[deadGeo, deadMaterial, deadIndices.length]}
        frustumCulled={false}
        renderOrder={RENDER_SPHERE}
      />
      {CURATORS.map((curator, ci) => (
        <group key={curator.name}>
          <instancedMesh
            ref={(mesh) => {
              curatorSparkHaloMeshRefs.current[ci] = mesh;
            }}
            args={[
              sparkGeo,
              curatorSparkHaloMaterials[ci]!,
              Math.max(1, curatorBuckets.maxBucketSize),
            ]}
            frustumCulled={false}
            renderOrder={RENDER_SPHERE}
          />
          <instancedMesh
            ref={(mesh) => {
              curatorSparkMeshRefs.current[ci] = mesh;
            }}
            args={[
              sparkGeo,
              curatorSparkMaterials[ci]!,
              Math.max(1, curatorBuckets.maxBucketSize),
            ]}
            frustumCulled={false}
            renderOrder={RENDER_SPHERE + 1}
          />
        </group>
      ))}
      <instancedMesh
        ref={debugPickableMeshRef}
        args={[debugGeo, debugPickableMaterial, liveIndices.length]}
        frustumCulled={false}
        renderOrder={RENDER_DEBUG_PICKABLE}
      />
    </>
  );
}
