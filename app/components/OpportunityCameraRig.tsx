"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import {
  DEFAULT_OPPORTUNITY_FOV,
  DEFAULT_ORBIT_ZOOM,
  getOpportunityCameraFar,
  getOpportunityCameraPose,
  getOpportunityOrbitDistanceBounds,
  OPPORTUNITY_CAMERA_REFERENCE_EXTENT,
} from "@/app/lib/opportunityCamera";

function formatVec3([x, y, z]: [number, number, number]) {
  return `[${x.toFixed(6)}, ${y.toFixed(6)}, ${z.toFixed(6)}]`;
}

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

  const logOrbitPose = useCallback(() => {
    if (!orbitEnabled) return;
    const controls = controlsRef.current;
    if (!controls) return;

    const position: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const target: [number, number, number] = [
      controls.target.x,
      controls.target.y,
      controls.target.z,
    ];

    console.log("[OpportunityCamera] scene (current extent):");
    console.log(`  position: ${formatVec3(position)}`);
    console.log(`  target:   ${formatVec3(target)}`);

    const scale = extent / OPPORTUNITY_CAMERA_REFERENCE_EXTENT;
    if (scale !== 1) {
      const unscaledPosition: [number, number, number] = [
        position[0] / scale,
        position[1] / scale,
        position[2] / scale,
      ];
      const unscaledTarget: [number, number, number] = [
        target[0] / scale,
        target[1] / scale,
        target[2] / scale,
      ];
      console.log(
        `[OpportunityCamera] paste into opportunityCamera.ts (reference extent ${OPPORTUNITY_CAMERA_REFERENCE_EXTENT}):`,
      );
      console.log(`  DEFAULT_CAMERA_POSITION = ${formatVec3(unscaledPosition)}`);
      console.log(`  DEFAULT_CAMERA_TARGET = ${formatVec3(unscaledTarget)}`);
    }
  }, [camera, controlsRef, extent, orbitEnabled]);

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
      onEnd={logOrbitPose}
    />
  );
}
