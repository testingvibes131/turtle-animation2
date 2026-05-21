import * as THREE from "three";
import type { TerrainVisualParams } from "@/app/v2/lib/terrainVisuals";

export type MarkerDepthFadeRange = { near: number; far: number };

const _world = new THREE.Vector3();

const DEPTH_FADE_UNIFORM_DECL = /* glsl */ `
uniform float uFadeNear;
uniform float uFadeFar;
uniform float uFadeMin;
uniform vec3 uCameraPos;
varying float vDepthFade;
`;

const MESH_DEPTH_FADE_VERTEX = /* glsl */ `
{
	vec4 worldPos4 = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		worldPos4 = instanceMatrix * worldPos4;
	#endif
	worldPos4 = modelMatrix * worldPos4;
	float dist = distance( worldPos4.xyz, uCameraPos );
	float t = clamp( ( dist - uFadeNear ) / max( uFadeFar - uFadeNear, 0.0001 ), 0.0, 1.0 );
	t = t * t * ( 3.0 - 2.0 * t );
	t = t * t * t * t * t;
	vDepthFade = mix( 1.0, uFadeMin, t );
}
`;

const LINE_DEPTH_FADE_VERTEX = /* glsl */ `
{
	vec4 worldStart4 = modelMatrix * vec4( instanceStart, 1.0 );
	vec4 worldEnd4 = modelMatrix * vec4( instanceEnd, 1.0 );
	vec3 worldMid = mix( worldStart4.xyz, worldEnd4.xyz, 0.5 );
	float dist = distance( worldMid, uCameraPos );
	float t = clamp( ( dist - uFadeNear ) / max( uFadeFar - uFadeNear, 0.0001 ), 0.0, 1.0 );
	t = t * t * ( 3.0 - 2.0 * t );
	t = t * t * t * t * t;
	vDepthFade = mix( 1.0, uFadeMin, t );
}
`;

export type MarkerDepthFadeUniforms = {
  uFadeNear: { value: number };
  uFadeFar: { value: number };
  uFadeMin: { value: number };
  uCameraPos: { value: THREE.Vector3 };
};

type DepthFadeScaleKeys =
  | "depthFadeNearScale"
  | "depthFadeFarScale";

type GridDepthFadeScaleKeys =
  | "gridDepthFadeNearScale"
  | "gridDepthFadeFarScale";

/** Fade distances scale with scene span (tight band = only items near camera). */
export function depthFadeViewReach(extent: number, terrainPeak: number): number {
  return Math.max(extent * 0.75, terrainPeak * 0.42, 12);
}

export function markerDepthFadeRange(
  extent: number,
  terrainPeak: number,
  visuals: Pick<TerrainVisualParams, DepthFadeScaleKeys>,
): MarkerDepthFadeRange {
  const reach = depthFadeViewReach(extent, terrainPeak);
  return {
    near: reach * visuals.depthFadeNearScale,
    far: reach * visuals.depthFadeFarScale,
  };
}

export function gridDepthFadeRange(
  extent: number,
  terrainPeak: number,
  visuals: Pick<TerrainVisualParams, GridDepthFadeScaleKeys>,
): MarkerDepthFadeRange {
  const reach = depthFadeViewReach(extent, terrainPeak);
  return {
    near: reach * visuals.gridDepthFadeNearScale,
    far: reach * visuals.gridDepthFadeFarScale,
  };
}

/** Opacity 1 at `near`, ramps to `minOpacity` at `far` and beyond. */
export function depthFadeOpacity(
  x: number,
  y: number,
  z: number,
  cameraPosition: THREE.Vector3,
  range: MarkerDepthFadeRange,
  minOpacity: number,
): number {
  _world.set(x, y, z);
  const d = cameraPosition.distanceTo(_world);
  if (d <= range.near) return 1;
  if (d >= range.far) return minOpacity;
  const t = (d - range.near) / (range.far - range.near);
  const smooth = t * t * (3 - 2 * t);
  const steep = smooth * smooth * smooth * smooth * smooth;
  return 1 - steep * (1 - minOpacity);
}

/** @deprecated Use depthFadeOpacity */
export function markerDepthOpacity(
  x: number,
  y: number,
  z: number,
  camera: THREE.Camera,
  range: MarkerDepthFadeRange,
  minOpacity?: number,
): number {
  return depthFadeOpacity(
    x,
    y,
    z,
    camera.position,
    range,
    minOpacity ?? 0,
  );
}

export function createMarkerDepthFadeUniforms(): MarkerDepthFadeUniforms {
  return {
    uFadeNear: { value: 0 },
    uFadeFar: { value: 1 },
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
  uniforms.uFadeMin.value = minOpacity;
  uniforms.uCameraPos.value.copy(camera.position);
}

export function attachMeshBasicDepthFade(
  material: THREE.MeshBasicMaterial,
  uniforms: MarkerDepthFadeUniforms,
): void {
  const tagged = material as THREE.MeshBasicMaterial & { _markerDepthFade?: boolean };
  if (tagged._markerDepthFade) return;
  tagged._markerDepthFade = true;

  material.transparent = true;
  material.depthWrite = false;
  material.customProgramCacheKey = () => "markerDepthFadeV2";

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${DEPTH_FADE_UNIFORM_DECL}`)
      .replace(
        "#include <skinning_vertex>",
        `#include <skinning_vertex>\n${MESH_DEPTH_FADE_VERTEX}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\nvarying float vDepthFade;`,
      )
      .replace(
        "#include <opaque_fragment>",
        "diffuseColor.a *= vDepthFade;\n\t#include <opaque_fragment>",
      );
  };
}

function patchLineFragmentDepthFade(fragmentShader: string): string {
  if (fragmentShader.includes("gl_FragColor = diffuseColor;")) {
    return fragmentShader.replace(
      "gl_FragColor = diffuseColor;",
      "diffuseColor.a *= vDepthFade;\n\t\t\t\t\tgl_FragColor = diffuseColor;",
    );
  }
  return fragmentShader.replace(
    "gl_FragColor = vec4( diffuseColor.rgb, alpha );",
    "gl_FragColor = vec4( diffuseColor.rgb, alpha * vDepthFade );",
  );
}

export function attachLineMaterialDepthFade(
  material: THREE.ShaderMaterial,
  uniforms: MarkerDepthFadeUniforms,
): void {
  const tagged = material as THREE.ShaderMaterial & { _markerDepthFade?: boolean };
  if (tagged._markerDepthFade) return;
  tagged._markerDepthFade = true;

  material.transparent = true;
  material.depthWrite = false;
  material.customProgramCacheKey = () => "markerDepthFadeV3";

  const previousOnBeforeCompile = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile?.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${DEPTH_FADE_UNIFORM_DECL}`)
      .replace(
        "vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );",
        `vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );\n${LINE_DEPTH_FADE_VERTEX}`,
      );
    shader.fragmentShader = patchLineFragmentDepthFade(
      shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>\nvarying float vDepthFade;`,
      ),
    );
  };

  material.needsUpdate = true;
}
