"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import {
  useBlobCuratorOverlayEnabled,
  useBlobLayoutMirrored,
  useBlobMobileZoneCarouselEnabled,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import { zoneHighlightBlendMul } from "@/features/blob-scene/hooks/zoneHighlightBlend";
import { CURATORS } from "@/features/blob-scene/lib/curators/catalog";
import {
  assignCapMembersVisual,
  assignStableCuratorZones,
  type CuratorZoneAssignment,
  type StableZoneSlot,
} from "@/features/blob-scene/lib/curators/zones";
import {
  connectedMemberSet,
  zoneLayoutSignature,
  ZONE_MEMBER_SCALE,
  ZONE_PARTNER_SCALE,
} from "@/features/blob-scene/lib/curators/zoneOverlay";
import {
  attachBlobPointFade,
  ensureInstanceOpacityBuffer,
  setInstanceOpacityAt,
} from "@/features/blob-scene/lib/rendering/blobPointFade";
import { updateMarkerDepthFadeUniforms } from "@/features/blob-scene/lib/rendering/markerDepthFade";
import { noiseSlopeOpacityFromDisplacement } from "@/features/blob-scene/lib/geometry/noiseSlopeOpacity";
import { RENDER_PARTNER_SPHERE } from "@/features/blob-scene/lib/rendering/renderOrder";
import { createConnectedMarkerLayout } from "@/features/blob-scene/lib/geometry/connectedMarkerLayout";
import {
  BLOB_CAP_WAVE_MAX_OPACITY,
  SECTION1_AMBIENT_FADE_EPS,
} from "@/features/blob-scene/lib/geometry/blobCapWave";
import { computeZoneMarkerLayout } from "@/features/blob-scene/lib/geometry/zoneMarkerTransform";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";

const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const _dummy = new THREE.Object3D();
const ZONE_CAP_GRAY = 0x2c2d2b;
const ZONE_INNER_TINT_OPACITY = 0.1;

type ZoneMemberInstancesProps = {
  activeZone: CuratorZoneAssignment | null;
  onZonesChange: (zones: CuratorZoneAssignment[]) => void;
};

export function ZoneMemberInstances({
  activeZone,
  onZonesChange,
}: ZoneMemberInstancesProps) {
  const {
    vertices,
    params,
    pointRadius,
    blobFrameCacheRef,
    getTowardCamera,
    getHubLayoutAxis,
    zoneUsedRef,
    zonesSnapshotRef,
    blobAnimTimeRef,
    depthFadeUniforms,
    connectedMarkerLayoutsRef,
    getBlobParamsAtTime,
    waveZoneRef,
    waveStrengthRef,
    section1AmbientFadeRef,
    zoneHighlightBlendRef,
  } = useBlobScene();
  const curatorOverlayEnabled = useBlobCuratorOverlayEnabled();
  const mobileCarouselEnabled = useBlobMobileZoneCarouselEnabled();
  const layoutMirrored = useBlobLayoutMirrored();
  const curatorOverlayEnabledRef = useRef(curatorOverlayEnabled);
  curatorOverlayEnabledRef.current = curatorOverlayEnabled;
  const layoutMirroredRef = useRef(layoutMirrored);
  layoutMirroredRef.current = layoutMirrored;

  const meshRefs = useRef<Map<string, THREE.InstancedMesh>>(new Map());
  const capGrayMeshRef = useRef<THREE.InstancedMesh>(null);
  const zoneInnerDimMeshRef = useRef<THREE.InstancedMesh>(null);
  const slotCacheRef = useRef<Map<string, StableZoneSlot>>(new Map());
  const vertexCountRef = useRef(vertices.count);
  const layoutParamsRef = useRef("");
  const zonesSigRef = useRef("");
  const activeZoneRef = useRef(activeZone);
  activeZoneRef.current = activeZone;
  const maxInstances = vertices.count;

  const { capGrayMaterial, zoneInnerDimMaterial, highlightMaterials } =
    useMemo(() => {
      const capGray = new THREE.MeshBasicMaterial({
        color: ZONE_CAP_GRAY,
        toneMapped: false,
      });
      attachBlobPointFade(capGray, depthFadeUniforms);
      const zoneInnerDim = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        toneMapped: false,
        transparent: true,
        opacity: ZONE_INNER_TINT_OPACITY,
      });
      attachBlobPointFade(zoneInnerDim, depthFadeUniforms);
      const highlight = new Map<string, THREE.MeshBasicMaterial>();
      for (const c of CURATORS) {
        highlight.set(
          c.name,
          new THREE.MeshBasicMaterial({
            color: c.color,
            toneMapped: false,
            transparent: true,
            opacity: 1,
            depthWrite: false,
            depthTest: true,
          }),
        );
      }
      return {
        capGrayMaterial: capGray,
        zoneInnerDimMaterial: zoneInnerDim,
        highlightMaterials: highlight,
      };
    }, [depthFadeUniforms]);

  useEffect(() => {
    return () => {
      capGrayMaterial.dispose();
      zoneInnerDimMaterial.dispose();
      for (const m of highlightMaterials.values()) m.dispose();
    };
  }, [capGrayMaterial, zoneInnerDimMaterial, highlightMaterials]);

  // Theme-reactive resting grey for the zone member caps (matches the base
  // cloud's --blob-point) so they don't read as black dots in light mode.
  useEffect(() => {
    const apply = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--blob-point")
        .trim();
      if (v) capGrayMaterial.color.set(v);
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, [capGrayMaterial]);

  const setMeshRef = (key: string, mesh: THREE.InstancedMesh | null) => {
    if (mesh) meshRefs.current.set(key, mesh);
    else meshRefs.current.delete(key);
  };

  useFrame((state) => {
    connectedMarkerLayoutsRef.current.clear();

    if (!curatorOverlayEnabledRef.current) {
      zoneUsedRef.current = new Set();
      zonesSnapshotRef.current = [];
      if (zonesSigRef.current !== "") {
        zonesSigRef.current = "";
        onZonesChange([]);
      }

      const capGrayMesh = capGrayMeshRef.current;
      const zoneInnerDimMesh = zoneInnerDimMeshRef.current;
      if (capGrayMesh) capGrayMesh.count = 0;
      if (zoneInnerDimMesh) zoneInnerDimMesh.count = 0;
      for (const c of CURATORS) {
        const mesh = meshRefs.current.get(c.name);
        if (mesh) mesh.count = 0;
      }
      return;
    }

    if (vertexCountRef.current !== vertices.count) {
      slotCacheRef.current.clear();
      vertexCountRef.current = vertices.count;
    }

    const layoutKey = `v19-zonehub:${params.frontMinDot}:${params.clusterMaxAngleDeg}:${params.blobCenterLean}:${params.hubConnectionMul}:${params.zoneCenterOffsetRight}:${params.hubOffsetSpheres}:${layoutMirroredRef.current}`;
    if (layoutParamsRef.current !== layoutKey) {
      layoutParamsRef.current = layoutKey;
      slotCacheRef.current.clear();
    }

    const frameCache = blobFrameCacheRef.current;
    if (!frameCache) return;

    const toward = activeZoneRef.current
      ? getHubLayoutAxis()
      : getTowardCamera();
    const nextZones = assignStableCuratorZones(
      vertices.positions,
      vertices.count,
      CURATORS,
      toward,
      {
        frontMinDot: params.frontMinDot,
        maxAngleFromHubDeg: params.clusterMaxAngleDeg,
        blobCenterLean: params.blobCenterLean,
        hubConnectionMul: params.hubConnectionMul,
        zoneCenterOffsetRight: params.zoneCenterOffsetRight,
        layoutMirrored: layoutMirroredRef.current,
        hubOffsetSpheres: params.hubOffsetSpheres,
        hubPickMesh: vertices,
        hubPickBlob: getBlobParamsAtTime(blobAnimTimeRef.current),
      },
      slotCacheRef.current,
    );

    const used = new Set<number>();
    for (const z of nextZones) {
      for (const m of z.members) used.add(m);
    }
    zonesSnapshotRef.current = nextZones;

    const sig = nextZones
      .map((z) => `${z.curator.name}:${zoneLayoutSignature(z)}`)
      .join("|");
    if (sig !== zonesSigRef.current) {
      zonesSigRef.current = sig;
      onZonesChange(nextZones);
    }

    const section1AmbientFade = section1AmbientFadeRef.current;
    const section1AmbientActive =
      section1AmbientFade > SECTION1_AMBIENT_FADE_EPS;
    const activeName = activeZone?.curator.name ?? null;
    const mobileCapHighlight =
      mobileCarouselEnabled && activeName != null;
    // The cap layer (gray cluster + colored cluster + inner tint) is reserved
    // for the section-1 ambient intro only. An actively-selected partner — on
    // mobile as on desktop — goes through the hover path below (connector lines
    // + connected member dots + logo), so it never shades the base cloud.
    const capAmbientActive = section1AmbientActive;

    if (capAmbientActive) {
      zoneUsedRef.current = used;
    } else if (activeZoneRef.current) {
      const hovered = activeZoneRef.current;
      const layoutZone =
        nextZones.find((z) => z.curator.name === hovered.curator.name) ??
        hovered;
      const connected = connectedMemberSet(hovered);
      const displayHub =
        hovered.hub != null && hovered.hub >= 0 ? hovered.hub : layoutZone.hub;
      const hide = new Set<number>();
      for (const vi of layoutZone.members) {
        if (vi === displayHub) continue;
        if (connected.has(vi)) hide.add(vi);
      }
      zoneUsedRef.current = hide;
    } else {
      zoneUsedRef.current = new Set();
    }

    const highlightBlend = zoneHighlightBlendMul(
      mobileCarouselEnabled,
      zoneHighlightBlendRef,
    );

    const waveZone = section1AmbientActive ? waveZoneRef.current : null;
    const waveName = section1AmbientActive
      ? waveZone && waveZone.curator.name !== activeName
        ? waveZone.curator.name
        : null
      : mobileCapHighlight
        ? activeName
        : null;
    const waveStrength = waveName
      ? section1AmbientActive
        ? waveStrengthRef.current * section1AmbientFade
        : highlightBlend * BLOB_CAP_WAVE_MAX_OPACITY
      : 0;

    const activeCurator = activeName
      ? CURATORS.find((c) => c.name === activeName)
      : undefined;
    if (activeCurator && !mobileCarouselEnabled) {
      zoneInnerDimMaterial.color.setHex(activeCurator.color);
      zoneInnerDimMaterial.opacity = ZONE_INNER_TINT_OPACITY * highlightBlend;
    }
    for (const c of CURATORS) {
      const mat = highlightMaterials.get(c.name);
      if (!mat) continue;
      if (activeName === c.name) {
        mat.opacity = highlightBlend;
      } else if (waveName === c.name) {
        mat.opacity = waveStrength;
      } else {
        mat.opacity = 0;
      }
    }

    const blobParams: PerlinBlobParams = getBlobParamsAtTime(
      blobAnimTimeRef.current,
    );

    const maxDisp =
      (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
    const extent = params.radius + maxDisp;
    const camDist = state.camera.position.length();
    const overlayActive = Boolean(activeZoneRef.current);
    updateMarkerDepthFadeUniforms(
      depthFadeUniforms,
      state.camera,
      {
        near: camDist - extent * 0.55,
        far: camDist + extent * 0.75,
        closeNear: 0,
        closeFar: 0,
      },
      overlayActive
        ? highlightBlend
        : params.depthFadeMinOpacity,
    );

    const capGrayMesh = capGrayMeshRef.current;
    const zoneInnerDimMesh = zoneInnerDimMeshRef.current;
    let graySlot = 0;
    let innerDimSlot = 0;
    if (capGrayMesh) {
      capGrayMesh.count = 0;
      ensureInstanceOpacityBuffer(capGrayMesh, maxInstances);
    }
    if (zoneInnerDimMesh) {
      zoneInnerDimMesh.count = 0;
      if (activeName) ensureInstanceOpacityBuffer(zoneInnerDimMesh, maxInstances);
    }

    for (const c of CURATORS) {
      const fullMesh = meshRefs.current.get(c.name);
      if (fullMesh) fullMesh.count = 0;
    }

    const noiseOpacity = (vertexIndex: number) =>
      noiseSlopeOpacityFromDisplacement(
        frameCache.displacement[vertexIndex]!,
        blobParams,
        params.noiseSlopeMinOpacity,
        params.noiseSlopeMaxOpacity,
      );

    const write = (
      mesh: THREE.InstancedMesh,
      slot: number,
      vertexIndex: number,
      scaleMul: number,
      opacityMul = 1,
      publishForOrbitRing = false,
    ) => {
      const layout = computeZoneMarkerLayout(
        frameCache,
        vertexIndex,
        pointRadius,
        scaleMul,
        state.camera,
        mesh.parent,
        extent,
        params.depthSizeNearOffset,
        params.depthSizeFarOffset,
        params.depthSizeMinMul,
        params.depthSizeMaxMul,
      );
      _dummy.position.copy(layout.localPosition);
      _dummy.quaternion.identity();
      _dummy.scale.setScalar(layout.sphereScale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(slot, _dummy.matrix);
      if (publishForOrbitRing) {
        let published = connectedMarkerLayoutsRef.current.get(vertexIndex);
        if (!published) {
          published = createConnectedMarkerLayout();
          connectedMarkerLayoutsRef.current.set(vertexIndex, published);
        }
        published.localPosition.copy(layout.localPosition);
        published.worldPosition.copy(layout.worldPosition);
        published.sphereScale = layout.sphereScale;
      }
      if (mesh.geometry.getAttribute("instanceOpacity")) {
        setInstanceOpacityAt(mesh, slot, opacityMul);
      }
    };

    const zonePickOptions = {
      frontMinDot: params.frontMinDot,
      blobCenterLean: params.blobCenterLean,
      zoneCenterOffsetRight: params.zoneCenterOffsetRight,
      layoutMirrored: layoutMirroredRef.current,
      maxAngleFromHubDeg: params.clusterMaxAngleDeg,
    };
    const visualBuckets = assignCapMembersVisual(
      vertices.positions,
      vertices.count,
      CURATORS,
      toward,
      zonePickOptions,
    );

    for (const zone of nextZones) {
      const fullMesh = meshRefs.current.get(zone.curator.name);
      if (!fullMesh || !capGrayMesh) continue;
      const needsInnerDim = Boolean(activeName && zoneInnerDimMesh);

      const partners = new Set(zone.partners);
      const isHoverSelected = activeName === zone.curator.name;
      const isWaveSelected =
        capAmbientActive && waveName === zone.curator.name;

      const hovered = activeZoneRef.current;
      const connected =
        isHoverSelected && hovered?.curator.name === zone.curator.name
          ? connectedMemberSet(hovered)
          : connectedMemberSet(zone);
      const displayHub =
        isHoverSelected && hovered?.hub != null && hovered.hub >= 0
          ? hovered.hub
          : zone.hub;
      let fullSlot = 0;

      if (isHoverSelected) {
        for (const vi of zone.members) {
          if (vi === displayHub) continue;
          if (!connected.has(vi)) continue;
          const scaleMul = partners.has(vi)
            ? ZONE_PARTNER_SCALE
            : ZONE_MEMBER_SCALE;
          write(fullMesh, fullSlot, vi, scaleMul, 1, true);
          fullSlot++;
        }
      } else if (isWaveSelected && visualBuckets) {
        const capMembers = visualBuckets.get(zone.curator.name) ?? [];
        for (const vi of capMembers) {
          if (vi === zone.hub) continue;
          const scaleMul = partners.has(vi)
            ? ZONE_PARTNER_SCALE
            : ZONE_MEMBER_SCALE;
          write(fullMesh, fullSlot, vi, scaleMul, waveStrength);
          fullSlot++;
        }
      }

      fullMesh.count = fullSlot;
      fullMesh.instanceMatrix.needsUpdate = true;
    }

    if (capAmbientActive && visualBuckets) {
      const capGrayMul = section1AmbientActive ? section1AmbientFade : 1;

      for (const zone of nextZones) {
        if (!capGrayMesh) continue;
        const visualMembers = visualBuckets.get(zone.curator.name) ?? [];
        const isHoverSelected =
          activeName === zone.curator.name && !mobileCarouselEnabled;
        const isWaveSelected = waveName === zone.curator.name;
        const needsInnerDim = Boolean(
          activeName && zoneInnerDimMesh && isHoverSelected,
        );
        const hovered = activeZoneRef.current;
        const connected =
          isHoverSelected && hovered?.curator.name === zone.curator.name
            ? connectedMemberSet(hovered)
            : connectedMemberSet(zone);
        const displayHub =
          isHoverSelected && hovered?.hub != null && hovered.hub >= 0
            ? hovered.hub
            : zone.hub;

        for (const vi of visualMembers) {
          if (vi === displayHub) continue;
          if (isHoverSelected && connected.has(vi)) continue;
          if (isWaveSelected && vi !== zone.hub) continue;
          if (isHoverSelected && needsInnerDim && activeCurator) {
            const op = noiseOpacity(vi) * capGrayMul;
            write(capGrayMesh, graySlot, vi, ZONE_MEMBER_SCALE, op);
            graySlot++;
            write(zoneInnerDimMesh!, innerDimSlot, vi, ZONE_MEMBER_SCALE, op);
            innerDimSlot++;
          } else {
            write(
              capGrayMesh,
              graySlot,
              vi,
              ZONE_MEMBER_SCALE,
              noiseOpacity(vi) * capGrayMul,
            );
            graySlot++;
          }
        }
      }
    }

    if (capGrayMesh) {
      capGrayMesh.count = graySlot;
      capGrayMesh.instanceMatrix.needsUpdate = true;
    }
    if (zoneInnerDimMesh) {
      zoneInnerDimMesh.count = innerDimSlot;
      zoneInnerDimMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={capGrayMeshRef}
        args={[SPHERE_GEO, capGrayMaterial, maxInstances]}
        frustumCulled={false}
        renderOrder={RENDER_PARTNER_SPHERE}
      />
      <instancedMesh
        ref={zoneInnerDimMeshRef}
        args={[SPHERE_GEO, zoneInnerDimMaterial, maxInstances]}
        frustumCulled={false}
        renderOrder={RENDER_PARTNER_SPHERE + 1}
      />
      {CURATORS.map((c) => (
        <instancedMesh
          key={c.name}
          ref={(m) => setMeshRef(c.name, m)}
          args={[SPHERE_GEO, highlightMaterials.get(c.name)!, maxInstances]}
          frustumCulled={false}
          renderOrder={RENDER_PARTNER_SPHERE + 2}
        />
      ))}
    </>
  );
}
