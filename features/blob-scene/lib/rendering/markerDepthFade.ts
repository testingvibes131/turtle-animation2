import * as THREE from "three";

export type MarkerDepthFadeRange = {
  near: number;
  far: number;
  closeNear: number;
  closeFar: number;
};

export type MarkerDepthFadeUniforms = {
  uFadeNear: { value: number };
  uFadeFar: { value: number };
  uFadeCloseNear: { value: number };
  uFadeCloseFar: { value: number };
  uFadeMin: { value: number };
  uCameraPos: { value: THREE.Vector3 };
};

export function createMarkerDepthFadeUniforms(): MarkerDepthFadeUniforms {
  return {
    uFadeNear: { value: 0 },
    uFadeFar: { value: 1 },
    uFadeCloseNear: { value: 0 },
    uFadeCloseFar: { value: 1 },
    uFadeMin: { value: 0 },
    uCameraPos: { value: new THREE.Vector3() },
  };
}

export function updateMarkerDepthFadeUniforms(
  uniforms: MarkerDepthFadeUniforms,
  camera: THREE.Camera,
  range: MarkerDepthFadeRange,
  minOpacity = 0,
): void {
  uniforms.uFadeNear.value = range.near;
  uniforms.uFadeFar.value = range.far;
  uniforms.uFadeCloseNear.value = range.closeNear;
  uniforms.uFadeCloseFar.value = range.closeFar;
  uniforms.uFadeMin.value = minOpacity;
  uniforms.uCameraPos.value.copy(camera.position);
}
