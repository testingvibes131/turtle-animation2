import * as THREE from "three";
import type { TerrainVisualParams } from "@/app/v2/lib/terrainVisuals";

export type MarkerDepthFadeRange = { near: number; far: number };

/** Opacity at/ beyond the far fade distance (near-invisible at distance). */
export const MARKER_DEPTH_FADE_MIN_OPACITY = 0.04;

/** Start fading sooner than scene fog. */
const MARKER_FADE_NEAR_SCALE = 0.5;
/** Reach min opacity well before fog fully blankets the field. */
const MARKER_FADE_FAR_SCALE = 0.68;

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
	t = t * t;
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
	t = t * t;
	vDepthFade = mix( 1.0, uFadeMin, t );
}
`;

export type MarkerDepthFadeUniforms = {
  uFadeNear: { value: number };
  uFadeFar: { value: number };
  uFadeMin: { value: number };
  uCameraPos: { value: THREE.Vector3 };
};

export function markerDepthFadeRange(
  extent: number,
  visuals: Pick<TerrainVisualParams, "fogNearMul" | "fogFarMul">,
): MarkerDepthFadeRange {
  return {
    near: extent * visuals.fogNearMul * MARKER_FADE_NEAR_SCALE,
    far: extent * visuals.fogFarMul * MARKER_FADE_FAR_SCALE,
  };
}

/** Opacity 1 at `near`, ramps to `minOpacity` at `far` and beyond. */
export function markerDepthOpacity(
  x: number,
  y: number,
  z: number,
  camera: THREE.Camera,
  range: MarkerDepthFadeRange,
  minOpacity = MARKER_DEPTH_FADE_MIN_OPACITY,
): number {
  _world.set(x, y, z);
  const d = camera.position.distanceTo(_world);
  if (d <= range.near) return 1;
  if (d >= range.far) return minOpacity;
  const t = (d - range.near) / (range.far - range.near);
  const smooth = t * t * (3 - 2 * t);
  const steep = smooth * smooth;
  return 1 - steep * (1 - minOpacity);
}

export function createMarkerDepthFadeUniforms(): MarkerDepthFadeUniforms {
  return {
    uFadeNear: { value: 0 },
    uFadeFar: { value: 1 },
    uFadeMin: { value: MARKER_DEPTH_FADE_MIN_OPACITY },
    uCameraPos: { value: new THREE.Vector3() },
  };
}

export function updateMarkerDepthFadeUniforms(
  uniforms: MarkerDepthFadeUniforms,
  camera: THREE.Camera,
  range: MarkerDepthFadeRange,
  minOpacity = MARKER_DEPTH_FADE_MIN_OPACITY,
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
