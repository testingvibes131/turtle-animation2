"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  createMarkerDepthFadeUniforms,
  updateMarkerDepthFadeUniforms,
} from "@/app/v2/lib/markerDepthFade";
import {
  attachBlobPointFade,
  ensureInstanceOpacityBuffer,
  setInstanceOpacityAt,
} from "@/app/sketch/lib/blobPointFade";
import { noiseSlopeOpacityMul } from "@/app/sketch/lib/noiseSlopeOpacity";
import { ActiveCuratorZones } from "@/app/sketch/components/ActiveCuratorZones";
import { vertexFacesCamera } from "@/app/sketch/lib/frontHemisphere";
import {
  buildZoneHubEdgesRandom,
  findZoneForMemberVertex,
  pickZoneAtCapRay,
  type CuratorZoneAssignment,
} from "@/app/sketch/lib/curatorZones";
import {
  pickZoneMemberNearRay,
  SPHERE_PICK_MIN_RADIUS_MUL,
} from "@/app/sketch/lib/pickSphereVertex";
import { depthSizeMultiplier } from "@/app/sketch/lib/sphereDepthSize";
import {
  useNoiseSphereControls,
  type PerlinBlobVisualParams,
} from "@/app/sketch/hooks/useNoiseSphereControls";
import { preloadLogoDisplayScales } from "@/app/sketch/lib/logoContentScale";
import {
  blobVisualExtent,
  computeBlobOffsetX,
} from "@/app/sketch/lib/blobViewportOffset";
import { buildLiveVertexSet } from "@/app/sketch/lib/liveVertices";
import {
  RENDER_DEBUG_PICKABLE,
  RENDER_SPHERE,
} from "@/app/sketch/lib/sketchRenderOrder";
import {
  createIcosahedronVertices,
  displacedVertexPosition,
  estimateVertexSpacing,
  type PerlinBlobParams,
} from "@/app/sketch/lib/perlinBlob";

const BG = "#141514";
const POINT_COLOR = 0x2c2d2b;
/** Live + camera-facing cap (hover pickable). */
const DEBUG_PICKABLE_COLOR = 0x2973ff;
const BLOB_POINT_SCALE_MUL = 1.25;
const DEBUG_PICKABLE_SCALE_MUL = 1.08;
const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const _dummy = new THREE.Object3D();
const _camWorld = new THREE.Vector3();
const _groupWorld = new THREE.Vector3();
const _towardCamera = new THREE.Vector3();
const _worldPos = new THREE.Vector3();
const _frameScales = new Float32Array(0);
const _pointer = new THREE.Vector2();
const _pickRay = new THREE.Ray();
const ZONE_MEMBER_PICK_SCALE_MUL = 0.0;

function PerlinBlobPoints({
  params,
  offsetX,
}: {
  params: PerlinBlobVisualParams;
  offsetX: number;
}) {
  const blobGroupRef = useRef<THREE.Group>(null);
  const liveMeshRef = useRef<THREE.InstancedMesh>(null);
  const deadMeshRef = useRef<THREE.InstancedMesh>(null);
  const debugPickableMeshRef = useRef<THREE.InstancedMesh>(null);
  const scalesRef = useRef(_frameScales);
  const zoneUsedRef = useRef<Set<number>>(new Set());
  const zonesSnapshotRef = useRef<CuratorZoneAssignment[]>([]);
  const blobAnimTimeRef = useRef(0);
  const frozenAnimTimeRef = useRef<number | null>(null);
  const activeZoneRef = useRef<CuratorZoneAssignment | null>(null);
  const [activeZone, setActiveZone] = useState<CuratorZoneAssignment | null>(
    null,
  );
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const depthFadeUniforms = useMemo(
    () => createMarkerDepthFadeUniforms(),
    [],
  );

  const vertices = useMemo(
    () => createIcosahedronVertices(params.radius, params.detail),
    [params.radius, params.detail],
  );

  const liveVertices = useMemo(
    () => buildLiveVertexSet(vertices.count),
    [vertices.count],
  );

  const { liveIndices, deadIndices } = useMemo(() => {
    const live: number[] = [];
    const dead: number[] = [];
    for (let i = 0; i < vertices.count; i++) {
      if (liveVertices.has(i)) live.push(i);
      else dead.push(i);
    }
    return { liveIndices: live, deadIndices: dead };
  }, [vertices.count, liveVertices]);

  const pointRadius = useMemo(
    () =>
      estimateVertexSpacing(params.radius, vertices.count) *
      params.pointSizeRatio,
    [params.radius, vertices.count, params.pointSizeRatio],
  );

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

  useLayoutEffect(() => {
    const group = blobGroupRef.current;
    if (group) group.position.x = offsetX;
  }, [offsetX]);

  useLayoutEffect(() => {
    const deadMesh = deadMeshRef.current;
    if (deadMesh) deadMesh.raycast = () => {};
    const debugMesh = debugPickableMeshRef.current;
    if (debugMesh) debugMesh.raycast = () => {};
  }, []);

  useEffect(() => {
    activeZoneRef.current = activeZone;
  }, [activeZone]);

  const towardCameraFromView = () => {
    const group = blobGroupRef.current;
    if (!group) return _towardCamera.set(0, 0, 1);
    camera.getWorldPosition(_camWorld);
    group.getWorldPosition(_groupWorld);
    _towardCamera.subVectors(_camWorld, _groupWorld);
    group.worldToLocal(_towardCamera);
    if (_towardCamera.lengthSq() < 1e-10) return _towardCamera.set(0, 0, 1);
    return _towardCamera.normalize();
  };

  useEffect(() => {
    const canvas = gl.domElement;
    const minPickRadius = pointRadius * SPHERE_PICK_MIN_RADIUS_MUL;

    const pickAtClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_pointer, camera);
      _pickRay.copy(raycaster.ray);

      const group = blobGroupRef.current;
      const toward = towardCameraFromView();
      const zones = zonesSnapshotRef.current;
      if (zones.length === 0) return null;

      const animTime = blobAnimTimeRef.current;
      const blobParams: PerlinBlobParams = { ...params, time: animTime };

      const capZone = pickZoneAtCapRay(
        _pickRay,
        group,
        toward,
        zones,
        blobVisualExtent(params),
        params.frontMinDot,
        undefined,
        {
          frontMinDot: params.frontMinDot,
          zoneCenterOffsetRight: params.zoneCenterOffsetRight,
          blobCenterLean: params.blobCenterLean,
        },
      );
      if (capZone) return capZone;

      const scales = scalesRef.current;

      const getCenter = (index: number, target: THREE.Vector3) => {
        displacedVertexPosition(vertices, index, blobParams, target);
        if (group) group.localToWorld(target);
      };

      const getRadius = (index: number) => {
        const base = scales[index] > 0 ? scales[index]! : pointRadius;
        return base * ZONE_MEMBER_PICK_SCALE_MUL;
      };

      const picked = pickZoneMemberNearRay(
        _pickRay,
        camera.position,
        zones,
        getCenter,
        getRadius,
        minPickRadius,
      );
      if (picked < 0) return null;

      return findZoneForMemberVertex(zones, picked);
    };

    const onPointerMove = (e: PointerEvent) => {
      const zone = pickAtClient(e.clientX, e.clientY);
      setActiveZone((prev) => {
        if (!zone) return null;
        if (prev?.curator.name === zone.curator.name) return prev;

        const snap =
          zonesSnapshotRef.current.find(
            (z) => z.curator.name === zone.curator.name,
          ) ?? zone;
        const toward = towardCameraFromView();
        const targetCount = Math.max(
          1,
          Math.round(
            snap.curator.opportunities * (params.hubConnectionMul ?? 1),
          ),
        );
        const edges = buildZoneHubEdgesRandom(
          vertices.positions,
          snap.hub,
          snap.partners,
          snap.members,
          toward,
          targetCount,
          {
            frontMinDot: params.frontMinDot,
            maxAngleFromHubDeg: params.clusterMaxAngleDeg,
            liveVertices,
            blobCenterLean: params.blobCenterLean,
          },
        );
        return { ...snap, edges };
      });
    };

    const onPointerLeave = () => {
      setActiveZone(null);
      frozenAnimTimeRef.current = null;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [
    camera,
    gl.domElement,
    liveVertices,
    params,
    pointRadius,
    raycaster,
    vertices,
  ]);

  useFrame((state, delta) => {
    const group = blobGroupRef.current;
    const hovered = activeZoneRef.current;
    const clockTime = state.clock.elapsedTime * params.timeSpeed;

    if (hovered) {
      if (frozenAnimTimeRef.current === null) {
        frozenAnimTimeRef.current = clockTime;
      }
      blobAnimTimeRef.current = frozenAnimTimeRef.current;
    } else {
      frozenAnimTimeRef.current = null;
      blobAnimTimeRef.current = clockTime;
    }

    if (group && params.rotationSpeed !== 0 && !hovered) {
      group.rotation.y += params.rotationSpeed * delta;
    }

    const blobParams: PerlinBlobParams = {
      ...params,
      time: blobAnimTimeRef.current,
    };

    const maxDisp =
      (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
    const extent = params.radius + maxDisp;
    const camDist = camera.position.length();
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
      const dist = camera.position.distanceTo(_worldPos);
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

    const toward = towardCameraFromView();

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
    <group ref={blobGroupRef} position={[offsetX, 0, 0]}>
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
      <ActiveCuratorZones
        vertices={vertices}
        params={params}
        pointRadius={pointRadius}
        liveVertices={liveVertices}
        getTowardCamera={towardCameraFromView}
        zoneUsedRef={zoneUsedRef}
        zonesSnapshotRef={zonesSnapshotRef}
        activeZone={activeZone}
        blobAnimTimeRef={blobAnimTimeRef}
        depthFadeUniforms={depthFadeUniforms}
      />
    </group>
  );
}

function Scene({ params }: { params: PerlinBlobVisualParams }) {
  const { camera, size } = useThree();
  const blobOffsetX = useMemo(() => {
    const extent = blobVisualExtent(params);
    return computeBlobOffsetX(
      camera as THREE.PerspectiveCamera,
      size.width / Math.max(size.height, 1),
      extent,
    );
  }, [camera, params, size.height, size.width]);

  return (
    <>
      <color attach="background" args={[BG]} />
      <PerlinBlobPoints params={params} offsetX={blobOffsetX} />
      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        enabled={params.orbitEnabled}
      />
    </>
  );
}

export function NoiseSphereScene({ params }: { params: PerlinBlobVisualParams }) {
  return (
    <Canvas
      className="h-full w-full touch-none"
      camera={{ position: [0, 0.15, 3], fov: 50, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <Scene params={params} />
    </Canvas>
  );
}

export function NoiseSphereSketch() {
  const params = useNoiseSphereControls();

  useEffect(() => {
    void preloadLogoDisplayScales();
  }, []);

  return <NoiseSphereScene params={params} />;
}
