"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import {
  DEFAULT_OPPORTUNITY_FOV,
  DEFAULT_ORBIT_ZOOM,
  getOpportunityCameraFar,
  getOpportunityCameraPose,
  getOpportunityOrbitDistanceBounds,
} from "@/app/lib/opportunityCamera";

type OpportunityCameraRigProps = {
  extent: number;
  orbitZoom?: number;
  controlsRef?: RefObject<OrbitControlsType | null>;
};

/** Shared main-route camera + orbit target (rotation disabled, fixed POV). */
export function OpportunityCameraRig({
  extent,
  orbitZoom = DEFAULT_ORBIT_ZOOM,
  controlsRef: controlsRefProp,
}: OpportunityCameraRigProps) {
  const controlsRefInternal = useRef<OrbitControlsType>(null);
  const controlsRef = controlsRefProp ?? controlsRefInternal;
  const { camera, size } = useThree();
  const pose = useMemo(() => getOpportunityCameraPose(extent), [extent]);
  const targetVec = useRef(new THREE.Vector3());
  const { minDistance, maxDistance } = useMemo(
    () => getOpportunityOrbitDistanceBounds(extent, orbitZoom),
    [extent, orbitZoom],
  );

  useLayoutEffect(() => {
    const [tx, ty, tz] = pose.target;
    targetVec.current.set(tx, ty, tz);
    const cam = camera;
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.clearViewOffset();
      cam.fov = DEFAULT_OPPORTUNITY_FOV;
    }
    cam.up.set(0, 1, 0);
    cam.near = 0.1;
    cam.far = getOpportunityCameraFar(pose.position, pose.target);
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.updateProjectionMatrix();
    }
    controlsRef.current?.target.copy(targetVec.current);
  }, [camera, pose, size.height, size.width]);

  useFrame(() => {
    const [cx, cy, cz] = pose.position;
    const cam = camera;
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.fov = DEFAULT_OPPORTUNITY_FOV;
    }
    cam.position.set(cx, cy, cz);
    cam.up.set(0, 1, 0);
    cam.lookAt(targetVec.current);
    cam.near = 0.1;
    cam.far = getOpportunityCameraFar(pose.position, pose.target);
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.updateProjectionMatrix();
    }
    controlsRef.current?.target.copy(targetVec.current);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={false}
      enableDamping
      dampingFactor={0.06}
      enableRotate={false}
      minDistance={minDistance}
      maxDistance={maxDistance}
    />
  );
}
