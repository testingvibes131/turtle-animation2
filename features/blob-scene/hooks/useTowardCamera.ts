import { useThree } from "@react-three/fiber";
import { useCallback, type RefObject } from "react";
import * as THREE from "three";

const _camWorld = new THREE.Vector3();
const _groupWorld = new THREE.Vector3();
const _towardCamera = new THREE.Vector3();

export function useTowardCamera(blobGroupRef: RefObject<THREE.Group | null>) {
  const { camera } = useThree();

  return useCallback(() => {
    const group = blobGroupRef.current;
    if (!group) return _towardCamera.set(0, 0, 1);
    camera.getWorldPosition(_camWorld);
    group.getWorldPosition(_groupWorld);
    _towardCamera.subVectors(_camWorld, _groupWorld);
    group.worldToLocal(_towardCamera);
    if (_towardCamera.lengthSq() < 1e-10) return _towardCamera.set(0, 0, 1);
    return _towardCamera.normalize();
  }, [blobGroupRef, camera]);
}
