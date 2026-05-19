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
  orbitEnabled?: boolean;
  orbitZoom?: number;
  controlsRef?: RefObject<OrbitControlsType | null>;
};

export function OpportunityCameraRig({
  extent,
  orbitEnabled = true,
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
    const [cx, cy, cz] = pose.position;
    targetVec.current.set(tx, ty, tz);

    const cam = camera;
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.clearViewOffset();
      cam.fov = DEFAULT_OPPORTUNITY_FOV;
    }
    cam.up.set(0, 1, 0);
    cam.near = 0.1;
    cam.far = getOpportunityCameraFar(pose.position, pose.target);

    if (!orbitEnabled) {
      cam.position.set(cx, cy, cz);
      cam.lookAt(targetVec.current);
    } else {
      cam.position.set(cx, cy, cz);
      controlsRef.current?.target.copy(targetVec.current);
    }

    if (cam instanceof THREE.PerspectiveCamera) {
      cam.updateProjectionMatrix();
    }
  }, [camera, orbitEnabled, pose, size.height, size.width]);

  useFrame(() => {
    if (orbitEnabled) return;

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
      enabled={orbitEnabled}
      enableDamping
      dampingFactor={0.06}
      enableRotate={orbitEnabled}
      minDistance={minDistance}
      maxDistance={maxDistance}
    />
  );
}
