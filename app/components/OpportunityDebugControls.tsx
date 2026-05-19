"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { button, useControls } from "leva";
import { useLayoutEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { OpportunityCameraRig } from "@/app/components/OpportunityCameraRig";
import {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_TARGET,
  DEFAULT_OPPORTUNITY_FOV,
  getOpportunityCameraFar,
  getOpportunityOrbitDistanceBounds,
} from "@/app/lib/opportunityCamera";

export {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_TARGET,
  DEFAULT_OPPORTUNITY_FOV,
} from "@/app/lib/opportunityCamera";

export function OpportunityDebugControls({ extent }: { extent: number }) {
  const ref = useRef<OrbitControlsType>(null);
  const { camera, size } = useThree();

  const [cx, cy, cz] = DEFAULT_CAMERA_POSITION;
  const [tx, ty, tz] = DEFAULT_CAMERA_TARGET;

  const { manualCamera, camX, camY, camZ, orbitZoom } = useControls(
    "Camera",
    {
      manualCamera: {
        value: false,
        label: "Manual position (x,y,z)",
      },
      camX: { value: cx, min: -2500, max: 2500, step: 1 },
      camY: { value: cy, min: 4, max: 2500, step: 1 },
      camZ: { value: cz, min: -2500, max: 2500, step: 0.01 },
      orbitZoom: {
        value: 1,
        min: 0.25,
        max: 3,
        step: 0.02,
        label: "Orbit dolly (higher = closer in)",
      },
    },
    [],
  );

  useControls(
    "Camera",
    {
      copyOrbitPose: button(() => {
        const oc = ref.current;
        if (!oc) {
          console.warn("OrbitControls not ready yet.");
          return;
        }
        const p = camera.position;
        const t = oc.target;
        const r = (n: number) => Math.round(n * 1e6) / 1e6;
        const text = [
          `position: [${r(p.x)}, ${r(p.y)}, ${r(p.z)}]`,
          `target: [${r(t.x)}, ${r(t.y)}, ${r(t.z)}]`,
        ].join("\n");
        void navigator.clipboard.writeText(text).then(
          () => console.info("Copied to clipboard:\n" + text),
          () => console.info("Clipboard unavailable; copy from console:\n" + text),
        );
      }),
    },
    [camera],
  );

  const camRef = useRef({
    manual: manualCamera,
    x: camX,
    y: camY,
    z: camZ,
  });
  camRef.current = { manual: manualCamera, x: camX, y: camY, z: camZ };

  const targetVec = useRef(new THREE.Vector3(tx, ty, tz));
  const { minDistance, maxDistance } = getOpportunityOrbitDistanceBounds(
    extent,
    orbitZoom,
  );

  useLayoutEffect(() => {
    if (!manualCamera) return;
    const cam = camera;
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.clearViewOffset();
      cam.fov = DEFAULT_OPPORTUNITY_FOV;
    }
    cam.up.set(0, 1, 0);
    cam.near = 0.1;
    cam.far = getOpportunityCameraFar(DEFAULT_CAMERA_POSITION, DEFAULT_CAMERA_TARGET);
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.updateProjectionMatrix();
    }
    ref.current?.target.set(tx, ty, tz);
  }, [camera, manualCamera, size.height, size.width, tx, ty, tz]);

  useFrame(() => {
    if (!camRef.current.manual) return;
    const p = camRef.current;
    const cam = camera;
    const oc = ref.current;

    if (cam instanceof THREE.PerspectiveCamera) {
      cam.fov = DEFAULT_OPPORTUNITY_FOV;
    }

    cam.position.set(p.x, p.y, p.z);
    cam.up.set(0, 1, 0);
    cam.lookAt(targetVec.current);
    cam.near = 0.1;
    cam.far = Math.max(6000, Math.hypot(p.x, p.y, p.z) * 8, 2000);
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.updateProjectionMatrix();
    }
    oc?.target.copy(targetVec.current);
  });

  if (!manualCamera) {
    return (
      <OpportunityCameraRig
        extent={extent}
        orbitZoom={orbitZoom}
        controlsRef={ref as RefObject<OrbitControlsType | null>}
      />
    );
  }

  return (
    <OrbitControls
      ref={ref}
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
