import * as THREE from 'three';
import { clamp, lerp } from './util';

/*
 * The table is out in a park, under a tree. Every lit material gets the same patch: the direct
 * sun is multiplied by the dappled shade of the leaves, projected along the sun's direction so a
 * sheet lifted off the cloth catches the pattern a little to one side, like the real thing.
 */

export const sunUniforms = {
  uTime: { value: 0 },
  /** Horizontal travel of a sun ray per unit of height: L.xz / L.y. */
  uSlope: { value: new THREE.Vector2() },
  /** View centre (xz) and half extents, to keep the dapple light where the reading is. */
  uView: { value: new THREE.Vector4(0, 0, 60, 40) },
  uLeaf: { value: 1 },
  uWind: { value: new THREE.Vector2(1, 0.3) },
};

/** Noise and the wind over the grass: gusts that roll across the lawn downwind. Shared by every
 * shader that sways, so the blades, the flowers and the sheen on the ground move together. */
export const WIND = /* glsl */ `
uniform float uTime;
uniform vec2 uWind;
float gHash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float gNoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(gHash(i), gHash(i + vec2(1, 0)), f.x), mix(gHash(i + vec2(0, 1)), gHash(i + vec2(1, 1)), f.x), f.y);
}
float windGust(vec2 p){
  vec2 q = p * .016 - normalize(uWind) * uTime * .62;
  return gNoise(q) * .65 + gNoise(q * 2.3 + 5.1 - uTime * .2) * .35;
}
`;

const GOBO = /* glsl */ `
varying vec3 vTWorld;
uniform vec2 uSlope;
uniform vec4 uView;
uniform float uLeaf;
${WIND}
float gFbm(vec2 p){
  float s = 0., a = .5;
  for (int i = 0; i < 4; i++) { s += a*gNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6)*p + 7.3; a *= .5; }
  return s;
}
float sunGobo(vec3 wp){
  vec2 q = wp.xz - uSlope * wp.y;
  // a tree overhead: its leaves sway, so the dapple drifts and breathes
  vec2 sway = uWind * (sin(uTime * .35) * 1.4 + sin(uTime * .83 + 1.3) * .6);
  vec2 lp = q * .045 + sway * .08;
  lp += .35 * vec2(gFbm(lp * 1.3 + uTime * .02), gFbm(lp * 1.3 + 4.1 - uTime * .015));
  float n = gFbm(lp);
  float leaf = smoothstep(.5, .54, n);
  // the canopy's edge: shade gathers towards the sides of the frame and the middle stays in full
  // sun, so the reading is bright
  vec2 d = (q - uView.xy) / max(uView.zw, vec2(1.));
  float dens = smoothstep(.42, 1.05, length(d * vec2(.85, 1.15)));
  return 1. - leaf * .72 * uLeaf * dens;
}
`;

const VERT_DECL = 'varying vec3 vTWorld;\n';
const VERT_BODY = /* glsl */ `
  vec4 tWorld = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    tWorld = instanceMatrix * tWorld;
  #endif
  vTWorld = (modelMatrix * tWorld).xyz;
`;

const LIGHTS = THREE.ShaderChunk.lights_fragment_begin.replace(
  'getDirectionalLightInfo( directionalLight, directLight );',
  'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= sunGobo( vTWorld );',
);

type Patch = (shader: THREE.WebGLProgramParametersWithUniforms) => void;

/** Lets a material catch the window light. `extra` can patch the same shader further. */
export function withSun<M extends THREE.Material>(material: M, key = '', extra?: Patch): M {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, sunUniforms);
    shader.vertexShader = VERT_DECL + shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>\n${VERT_BODY}`);
    shader.fragmentShader = GOBO + shader.fragmentShader.replace('#include <lights_fragment_begin>', LIGHTS);
    extra?.(shader);
  };
  material.customProgramCacheKey = () => `sun:${key}`;
  return material;
}

/* ------------------------------------------------------------------------ */
/*  The day's light                                                          */
/* ------------------------------------------------------------------------ */

type Key = { h: number; sun: number; sunC: string; hemi: number; sky: string; ground: string; lamp: number; exposure: number };

// sun and hemi are the brightness they give the table (0–1), not raw light intensities
const KEYS: Key[] = [
  { h: 0, sun: 0.09, sunC: '#9fb0ff', hemi: 0.2, sky: '#5a6aa8', ground: '#1f1d2a', lamp: 1, exposure: 1 },
  { h: 5.2, sun: 0.08, sunC: '#a9b4f0', hemi: 0.2, sky: '#6a78b4', ground: '#2a2632', lamp: 1, exposure: 1 },
  { h: 6.3, sun: 0.3, sunC: '#ffc49a', hemi: 0.42, sky: '#bfcbec', ground: '#7d7a5e', lamp: 0.3, exposure: 1 },
  { h: 6.9, sun: 0.84, sunC: '#fff1de', hemi: 0.54, sky: '#cfdefa', ground: '#b9c39a', lamp: 0, exposure: 1 },
  { h: 9.5, sun: 0.88, sunC: '#fffaf2', hemi: 0.55, sky: '#cfdffc', ground: '#bcc79c', lamp: 0, exposure: 1 },
  { h: 12.5, sun: 0.92, sunC: '#fffdf8', hemi: 0.56, sky: '#d0e0fd', ground: '#bec99e', lamp: 0, exposure: 1 },
  { h: 15.5, sun: 0.9, sunC: '#fff7ec', hemi: 0.54, sky: '#cfdcfa', ground: '#bcc499', lamp: 0, exposure: 1 },
  { h: 17.4, sun: 0.84, sunC: '#ffe3bc', hemi: 0.5, sky: '#d2d8f0', ground: '#b9b48c', lamp: 0, exposure: 1 },
  { h: 18.5, sun: 0.72, sunC: '#ffbd76', hemi: 0.42, sky: '#cbc6e0', ground: '#a3916a', lamp: 0, exposure: 1 },
  { h: 19.3, sun: 0.26, sunC: '#ff9456', hemi: 0.3, sky: '#9a9ccc', ground: '#5a4c44', lamp: 0.4, exposure: 1 },
  { h: 20.2, sun: 0.05, sunC: '#9fb0ff', hemi: 0.16, sky: '#6874b0', ground: '#2e2834', lamp: 1, exposure: 1 },
  { h: 24, sun: 0.09, sunC: '#9fb0ff', hemi: 0.2, sky: '#5a6aa8', ground: '#1f1d2a', lamp: 1, exposure: 1 },
];

const ca = new THREE.Color();
const cb = new THREE.Color();
const mix = (a: string, b: string, t: number, out: THREE.Color) => out.copy(ca.set(a)).lerp(cb.set(b), t);

export type Sky = {
  dir: THREE.Vector3;
  sun: number;
  sunColor: THREE.Color;
  hemi: number;
  sky: THREE.Color;
  ground: THREE.Color;
  lamp: number;
  exposure: number;
};

export function skyAt(hour: number, out: Sky): Sky {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= h) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = clamp((h - a.h) / (b.h - a.h));
  out.sun = lerp(a.sun, b.sun, t);
  mix(a.sunC, b.sunC, t, out.sunColor);
  out.hemi = lerp(a.hemi, b.hemi, t);
  mix(a.sky, b.sky, t, out.sky);
  mix(a.ground, b.ground, t, out.ground);
  out.lamp = lerp(a.lamp, b.lamp, t);
  out.exposure = lerp(a.exposure, b.exposure, t);
  // the sun climbs from the left of the table in the morning to the right in the evening
  const d = clamp((h - 6) / 13.6);
  const el = THREE.MathUtils.degToRad(7 + Math.sin(Math.PI * d) * 52);
  const az = THREE.MathUtils.degToRad(lerp(-82, 82, d));
  out.dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el) * 0.75 - 0.25).normalize();
  // keep the light from ever going flat enough to smear shadows across the whole frame
  if (out.dir.y < 0.42) {
    out.dir.y = 0.42;
    out.dir.normalize();
  }
  return out;
}

export const makeSky = (): Sky => ({
  dir: new THREE.Vector3(0, 1, 0),
  sun: 0,
  sunColor: new THREE.Color(),
  hemi: 1,
  sky: new THREE.Color(),
  ground: new THREE.Color(),
  lamp: 0,
  exposure: 1,
});
