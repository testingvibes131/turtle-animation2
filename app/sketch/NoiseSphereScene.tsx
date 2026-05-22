"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  attachMeshBasicDepthFade,
  createMarkerDepthFadeUniforms,
  updateMarkerDepthFadeUniforms,
} from "@/app/v2/lib/markerDepthFade";
import { CuratorHubBillboard } from "@/app/sketch/components/CuratorHubBillboard";
import { CuratorPlexusLines } from "@/app/sketch/components/CuratorPlexusLines";
import { PartnerOrbitRings } from "@/app/sketch/components/PartnerOrbitRings";
import type { ColoredPlexusGroup } from "@/app/sketch/components/CuratorPlexusLines";
import { pickNextCurator } from "@/app/sketch/lib/curatorCatalog";
import { vertexFacesCamera } from "@/app/sketch/lib/frontHemisphere";
import { buildHoverPlexusEdges } from "@/app/sketch/lib/hoverPlexus";
import {
  pickHoverVertexNearRay,
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
  RENDER_HUB_LOGO,
  RENDER_PARTNER_SPHERE,
  RENDER_PLEXUS_LINES,
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
const LIVE_SCALE_MUL = 1.25;
const DEBUG_PICKABLE_SCALE_MUL = 1.08;
const DEAD_SCALE_MUL = 0.88;
/** Partner size: previous 1.4× + 15%. */
const PARTNER_SCALE_MUL = 1.4 * 1.15;
/** Max hub + partners (Aave = 8 edges). */
const MAX_HIGHLIGHT_INSTANCES = 9;
const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const _dummy = new THREE.Object3D();
const _camWorld = new THREE.Vector3();
const _groupWorld = new THREE.Vector3();
const _towardCamera = new THREE.Vector3();
const _worldPos = new THREE.Vector3();
const _frameScales = new Float32Array(0);

export type SphereHoverInfo = {
  curator: string;
  opportunities: number;
  color: number;
};

type HoverVertsState = {
  hub: number;
  partners: Set<number>;
  color: number;
  curatorName: string;
};

function PerlinBlobPoints({
  params,
  onHover,
  offsetX,
}: {
  params: PerlinBlobVisualParams;
  onHover: (info: SphereHoverInfo | null) => void;
  offsetX: number;
}) {
  const blobGroupRef = useRef<THREE.Group>(null);
  const liveMeshRef = useRef<THREE.InstancedMesh>(null);
  const deadMeshRef = useRef<THREE.InstancedMesh>(null);
  const highlightMeshRef = useRef<THREE.InstancedMesh>(null);
  const debugPickableMeshRef = useRef<THREE.InstancedMesh>(null);
  const hoverRef = useRef<HoverVertsState | null>(null);
  const scalesRef = useRef(_frameScales);
  const { camera, raycaster, pointer, gl } = useThree();
  const [hoverLines, setHoverLines] = useState<ColoredPlexusGroup[]>([]);
  const [hubBillboard, setHubBillboard] = useState<{
    hub: number;
    curatorName: string;
  } | null>(null);
  const [partnerOrbits, setPartnerOrbits] = useState<{
    indices: number[];
    color: number;
  } | null>(null);
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

  const clusterMaxAngleRad = useMemo(
    () => THREE.MathUtils.degToRad(params.clusterMaxAngleDeg),
    [params.clusterMaxAngleDeg],
  );

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
    attachMeshBasicDepthFade(mat, depthFadeUniforms);
    return mat;
  }, [depthFadeUniforms]);

  const deadMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: POINT_COLOR,
      toneMapped: false,
    });
    attachMeshBasicDepthFade(mat, depthFadeUniforms);
    return mat;
  }, [depthFadeUniforms]);

  const highlightMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: POINT_COLOR,
        toneMapped: false,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        depthTest: true,
      }),
    [],
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
  useEffect(() => () => highlightMaterial.dispose(), [highlightMaterial]);
  useEffect(() => () => debugPickableMaterial.dispose(), [debugPickableMaterial]);

  useLayoutEffect(() => {
    const group = blobGroupRef.current;
    if (group) group.position.x = offsetX;
  }, [offsetX]);

  useLayoutEffect(() => {
    const deadMesh = deadMeshRef.current;
    if (deadMesh) deadMesh.raycast = () => {};
    const highlightMesh = highlightMeshRef.current;
    if (highlightMesh) highlightMesh.raycast = () => {};
    const debugMesh = debugPickableMeshRef.current;
    if (debugMesh) debugMesh.raycast = () => {};
  }, []);

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

  const activateHover = (hub: number) => {
    const curator = pickNextCurator();
    const toward = towardCameraFromView();
    const edges = buildHoverPlexusEdges(
      vertices.positions,
      vertices.count,
      hub,
      curator.opportunities,
      toward,
      {
        frontMinDot: params.frontMinDot,
        clusterMaxAngleRad,
        liveVertices,
      },
    );

    if (edges.length === 0) {
      clearHover();
      return;
    }

    const partners = new Set<number>();
    for (const [, partner] of edges) partners.add(partner);

    hoverRef.current = {
      hub,
      partners,
      color: curator.color,
      curatorName: curator.name,
    };
    setHoverLines([{ color: curator.color, edges }]);
    setHubBillboard({ hub, curatorName: curator.name });
    setPartnerOrbits({ indices: [...partners], color: curator.color });
    onHover({
      curator: curator.name,
      opportunities: curator.opportunities,
      color: curator.color,
    });
    gl.domElement.style.cursor = "pointer";
  };

  const clearHover = () => {
    if (!hoverRef.current) return;
    hoverRef.current = null;
    setHoverLines([]);
    setHubBillboard(null);
    setPartnerOrbits(null);
    onHover(null);
    gl.domElement.style.cursor = "";
  };

  useEffect(() => {
    const el = gl.domElement;
    const onLeave = () => clearHover();
    el.addEventListener("pointerleave", onLeave);
    return () => el.removeEventListener("pointerleave", onLeave);
  }, [gl]);

  useFrame((state, delta) => {
    const group = blobGroupRef.current;
    const hover = hoverRef.current;

    if (group && params.rotationSpeed !== 0 && hover === null) {
      group.rotation.y += params.rotationSpeed * delta;
    }

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

    const liveMesh = liveMeshRef.current;
    const deadMesh = deadMeshRef.current;
    const highlightMesh = highlightMeshRef.current;

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
      for (let li = 0; li < liveIndices.length; li++) {
        const i = liveIndices[li]!;
        const hide =
          hover !== null && (i === hover.hub || hover.partners.has(i));
        writeInstance(liveMesh, i, li, LIVE_SCALE_MUL, hide);
      }
      liveMesh.instanceMatrix.needsUpdate = true;
    }

    if (deadMesh) {
      for (let di = 0; di < deadIndices.length; di++) {
        const i = deadIndices[di]!;
        writeInstance(deadMesh, i, di, DEAD_SCALE_MUL, false);
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
            LIVE_SCALE_MUL * DEBUG_PICKABLE_SCALE_MUL,
            false,
          );
          pi++;
        }
      }
      debugMesh.count = pi;
      debugMesh.instanceMatrix.needsUpdate = true;
    }

    const pointerOnCanvas =
      Math.abs(pointer.x) <= 1 && Math.abs(pointer.y) <= 1;
    if (pointerOnCanvas && liveMesh) {
      raycaster.setFromCamera(pointer, camera);
      const minPick = pointRadius * SPHERE_PICK_MIN_RADIUS_MUL;
      const picked = pickHoverVertexNearRay(
        raycaster.ray,
        camera.position,
        vertices.count,
        (i, target) => {
          displacedVertexPosition(vertices, i, blobParams, target);
          if (group) group.localToWorld(target);
        },
        (i) => scales[i] ?? pointRadius,
        minPick,
        (i) =>
          !liveVertices.has(i) ||
          vertexFacesCamera(
            vertices.positions,
            i,
            toward,
            params.frontMinDot,
          ),
        (i) =>
          liveVertices.has(i) &&
          vertexFacesCamera(
            vertices.positions,
            i,
            toward,
            params.frontMinDot,
          ),
      );

      if (picked >= 0) {
        gl.domElement.style.cursor = "pointer";
        if (hover?.hub !== picked) activateHover(picked);
      } else {
        gl.domElement.style.cursor = "";
        if (hover) clearHover();
      }
    } else {
      gl.domElement.style.cursor = "";
      if (hover) clearHover();
    }

    const hoverAfterPick = hoverRef.current;

    if (highlightMesh) {
      let hi = 0;
      if (hoverAfterPick) {
        highlightMaterial.color.setHex(hoverAfterPick.color);
        for (const idx of hoverAfterPick.partners) {
          displacedVertexPosition(vertices, idx, blobParams, _dummy.position);
          _worldPos.copy(_dummy.position);
          if (group) group.localToWorld(_worldPos);
          const dist = camera.position.distanceTo(_worldPos);
          const highlightMul = PARTNER_SCALE_MUL;
          const scale =
            pointRadius *
            highlightMul *
            depthSizeMultiplier(
              dist,
              sizeNear,
              sizeFar,
              params.depthSizeMinMul,
              params.depthSizeMaxMul,
            );
          _dummy.scale.setScalar(scale);
          _dummy.updateMatrix();
          highlightMesh.setMatrixAt(hi, _dummy.matrix);
          hi++;
        }
      }
      highlightMesh.count = hi;
      highlightMesh.instanceMatrix.needsUpdate = true;
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
      <instancedMesh
        ref={highlightMeshRef}
        args={[SPHERE_GEO, highlightMaterial, MAX_HIGHLIGHT_INSTANCES]}
        frustumCulled={false}
        renderOrder={RENDER_PARTNER_SPHERE}
      />
      {partnerOrbits ? (
        <PartnerOrbitRings
          partnerIndices={partnerOrbits.indices}
          color={partnerOrbits.color}
          vertices={vertices}
          params={params}
          pointRadius={pointRadius}
          partnerScaleMul={PARTNER_SCALE_MUL}
        />
      ) : null}
      {hoverLines.length > 0 ? (
        <group renderOrder={RENDER_PLEXUS_LINES}>
          <CuratorPlexusLines
            groups={hoverLines}
            vertices={vertices}
            params={params}
          />
        </group>
      ) : null}
      {hubBillboard ? (
        <group renderOrder={RENDER_HUB_LOGO}>
          <Suspense fallback={null}>
            <CuratorHubBillboard
              hubIndex={hubBillboard.hub}
              curatorName={hubBillboard.curatorName}
              vertices={vertices}
              params={params}
            />
          </Suspense>
        </group>
      ) : null}
    </group>
  );
}

function Scene({
  params,
  onHover,
}: {
  params: PerlinBlobVisualParams;
  onHover: (info: SphereHoverInfo | null) => void;
}) {
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
      <PerlinBlobPoints
        params={params}
        onHover={onHover}
        offsetX={blobOffsetX}
      />
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
      <p
        className="font-medium leading-snug"
        style={{
          color: `#${(hover.color & 0xffffff).toString(16).padStart(6, "0")}`,
        }}
      >
        {hover.curator}
      </p>
      <p className="text-white/55">
        {hover.opportunities}{" "}
        {hover.opportunities === 1 ? "opportunity" : "opportunities"}
      </p>
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
      camera={{ position: [0, 0.15, 3], fov: 50, near: 0.1, far: 100 }}
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

  useEffect(() => {
    void preloadLogoDisplayScales();
  }, []);

  return (
    <>
      <NoiseSphereScene params={params} onHover={setHover} />
      {hover ? <HoverLabel hover={hover} /> : null}
    </>
  );
}
