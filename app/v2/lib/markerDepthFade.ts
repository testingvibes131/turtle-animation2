import * as THREE from "three";
import { getOpportunityOrbitDistanceBounds } from "@/app/lib/opportunityCamera";
import type { TerrainVisualParams } from "@/app/v2/lib/terrainVisuals";

export type MarkerDepthFadeRange = {
  near: number;
  far: number;
  closeNear: number;
  closeFar: number;
};

const _world = new THREE.Vector3();

const DEPTH_FADE_VERTEX_PREAMBLE = /* glsl */ `
uniform float uFadeNear;
uniform float uFadeFar;
uniform float uFadeCloseNear;
uniform float uFadeCloseFar;
uniform float uFadeMin;
uniform vec3 uCameraPos;
varying float vDepthFade;
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

const LINE_DEPTH_FADE_VERTEX = /* glsl */ `
{
	vec4 worldStart4 = modelMatrix * vec4( instanceStart, 1.0 );
	vec4 worldEnd4 = modelMatrix * vec4( instanceEnd, 1.0 );
	vec3 worldMid = mix( worldStart4.xyz, worldEnd4.xyz, 0.5 );
	float dist = distance( worldMid, uCameraPos );
	float tFar = ( dist - uFadeNear ) / max( uFadeFar - uFadeNear, 0.0001 );
	float farFade = mix( 1.0, uFadeMin, depthFadeSteep( tFar ) );
	float tClose = ( uFadeCloseFar - dist ) / max( uFadeCloseFar - uFadeCloseNear, 0.0001 );
	float closeFade = mix( 1.0, uFadeMin, depthFadeSteep( tClose ) );
	vDepthFade = farFade * closeFade;
}
`;

export type MarkerDepthFadeUniforms = {
  uFadeNear: { value: number };
  uFadeFar: { value: number };
  uFadeCloseNear: { value: number };
  uFadeCloseFar: { value: number };
  uFadeMin: { value: number };
  uCameraPos: { value: THREE.Vector3 };
};

type MarkerDepthFadeScaleKeys =
  | "depthFadeNearScale"
  | "depthFadeFarScale"
  | "depthFadeCloseNearScale"
  | "depthFadeCloseFarScale";

type GridDepthFadeScaleKeys =
  | "gridDepthFadeNearScale"
  | "gridDepthFadeFarScale";

/** Fade distances scale with scene span (tight band = only items near camera). */
export function depthFadeViewReach(extent: number, terrainPeak: number): number {
  return Math.max(extent * 0.75, terrainPeak * 0.42, 12);
}

function depthFadeSteep(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  const smooth = clamped * clamped * (3 - 2 * clamped);
  return smooth * smooth * smooth * smooth * smooth;
}

/** Close fade band in world units; scales are × orbit min distance (see opportunityCamera). */
function closeFadeDistances(
  extent: number,
  reach: number,
  closeNearScale: number,
  closeFarScale: number,
): { closeNear: number; closeFar: number } {
  const { minDistance: orbitMin } = getOpportunityOrbitDistanceBounds(extent);
  let closeFar = Math.max(orbitMin * closeFarScale, reach * closeFarScale * 0.12);
  let closeNear = Math.min(orbitMin * closeNearScale, closeFar * 0.92);
  if (closeNear < 0.25) closeNear = closeFar * 0.28;
  if (closeFar <= closeNear) closeFar = closeNear + orbitMin * 0.2;
  return { closeNear, closeFar };
}

export function markerDepthFadeRange(
  extent: number,
  terrainPeak: number,
  visuals: Pick<TerrainVisualParams, MarkerDepthFadeScaleKeys>,
): MarkerDepthFadeRange {
  const reach = depthFadeViewReach(extent, terrainPeak);
  const { closeNear, closeFar } = closeFadeDistances(
    extent,
    reach,
    visuals.depthFadeCloseNearScale,
    visuals.depthFadeCloseFarScale,
  );
  return {
    near: reach * visuals.depthFadeNearScale,
    far: reach * visuals.depthFadeFarScale,
    closeNear,
    closeFar,
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
    closeNear: 0,
    closeFar: 0,
  };
}

function farDepthFadeOpacity(
  d: number,
  near: number,
  far: number,
  minOpacity: number,
): number {
  if (d <= near) return 1;
  if (d >= far) return minOpacity;
  const t = (d - near) / (far - near);
  return 1 - depthFadeSteep(t) * (1 - minOpacity);
}

function closeDepthFadeOpacity(
  d: number,
  closeNear: number,
  closeFar: number,
  minOpacity: number,
): number {
  if (closeFar <= closeNear) return 1;
  if (d >= closeFar) return 1;
  if (d <= closeNear) return minOpacity;
  const t = (closeFar - d) / (closeFar - closeNear);
  return 1 - depthFadeSteep(t) * (1 - minOpacity);
}

/** Far + close camera fade; opacity 1 in the comfort band between bands. */
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
  const farFade = farDepthFadeOpacity(d, range.near, range.far, minOpacity);
  const closeFade = closeDepthFadeOpacity(
    d,
    range.closeNear,
    range.closeFar,
    minOpacity,
  );
  return farFade * closeFade;
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

export function attachMeshBasicDepthFade(
  material: THREE.MeshBasicMaterial,
  uniforms: MarkerDepthFadeUniforms,
): void {
  const tagged = material as THREE.MeshBasicMaterial & { _markerDepthFade?: boolean };
  if (tagged._markerDepthFade) return;
  tagged._markerDepthFade = true;

  material.transparent = true;
  material.depthWrite = false;
  material.customProgramCacheKey = () => "markerDepthFadeV5";

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
  material.customProgramCacheKey = () => "markerDepthFadeV5";

  const previousOnBeforeCompile = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile?.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${DEPTH_FADE_VERTEX_PREAMBLE}`)
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
