import * as THREE from "three";
import type { MarkerDepthFadeUniforms } from "@/app/v2/lib/markerDepthFade";

const BLOB_POINT_FADE_KEY = "sketchBlobPointFadeV1";

const DEPTH_FADE_VERTEX_PREAMBLE = /* glsl */ `
uniform float uFadeNear;
uniform float uFadeFar;
uniform float uFadeCloseNear;
uniform float uFadeCloseFar;
uniform float uFadeMin;
uniform vec3 uCameraPos;
attribute float instanceOpacity;
varying float vDepthFade;
varying float vInstanceOpacity;
float depthFadeSteep( float t ) {
	t = clamp( t, 0.0, 1.0 );
	t = t * t * ( 3.0 - 2.0 * t );
	return t * t * t * t * t;
}
`;

const MESH_DEPTH_FADE_VERTEX = /* glsl */ `
{
	vec4 worldPos4 = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		worldPos4 = instanceMatrix * worldPos4;
		vInstanceOpacity = instanceOpacity;
	#else
		vInstanceOpacity = 1.0;
	#endif
	worldPos4 = modelMatrix * worldPos4;
	float dist = distance( worldPos4.xyz, uCameraPos );
	float tFar = ( dist - uFadeNear ) / max( uFadeFar - uFadeNear, 0.0001 );
	float farFade = mix( 1.0, uFadeMin, depthFadeSteep( tFar ) );
	float tClose = ( uFadeCloseFar - dist ) / max( uFadeCloseFar - uFadeCloseNear, 0.0001 );
	float closeFade = mix( 1.0, uFadeMin, depthFadeSteep( tClose ) );
	vDepthFade = farFade * closeFade;
}
`;

export function ensureInstanceOpacityBuffer(
  mesh: THREE.InstancedMesh,
  capacity: number,
): Float32Array {
  const geo = mesh.geometry;
  let attr = geo.getAttribute(
    "instanceOpacity",
  ) as THREE.InstancedBufferAttribute | undefined;
  if (!attr || attr.array.length < capacity) {
    const arr = new Float32Array(capacity);
    arr.fill(1);
    attr = new THREE.InstancedBufferAttribute(arr, 1);
    geo.setAttribute("instanceOpacity", attr);
  }
  return attr.array as Float32Array;
}

export function setInstanceOpacityAt(
  mesh: THREE.InstancedMesh,
  slot: number,
  opacity: number,
): void {
  const attr = mesh.geometry.getAttribute(
    "instanceOpacity",
  ) as THREE.InstancedBufferAttribute;
  attr.array[slot] = opacity;
  attr.needsUpdate = true;
}

/** Depth fade + per-instance opacity (noise slope) for sketch blob spheres. */
export function attachBlobPointFade(
  material: THREE.MeshBasicMaterial,
  uniforms: MarkerDepthFadeUniforms,
): void {
  const tagged = material as THREE.MeshBasicMaterial & {
    _blobPointFade?: boolean;
  };
  if (tagged._blobPointFade) return;
  tagged._blobPointFade = true;

  material.transparent = true;
  material.depthWrite = false;
  material.customProgramCacheKey = () => BLOB_POINT_FADE_KEY;

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${DEPTH_FADE_VERTEX_PREAMBLE}`)
      .replace(
        "#include <skinning_vertex>",
        `#include <skinning_vertex>\n${MESH_DEPTH_FADE_VERTEX}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nvarying float vDepthFade;\nvarying float vInstanceOpacity;`,
      )
      .replace(
        "#include <opaque_fragment>",
        "diffuseColor.a *= vDepthFade * vInstanceOpacity;\n\t#include <opaque_fragment>",
      );
  };
}
