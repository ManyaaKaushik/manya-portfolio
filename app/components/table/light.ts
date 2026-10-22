import * as THREE from 'three';
import { clamp, lerp } from './util';

/*
 * Sunlight comes in through a window beside the table. Every lit material gets the same patch:
 * the direct sun is multiplied by the window's footprint (panes, with the mullions' shadows) and
 * by dappled shade from a plant on the sill, both projected along the sun's direction so a sheet
 * lifted off the cloth catches the pattern a little to one side, like the real thing.
 */

export const sunUniforms = {
  uTime: { value: 0 },
  /** Horizontal travel of a sun ray per unit of height: L.xz / L.y. */
  uSlope: { value: new THREE.Vector2() },
  /** Window: footprint centre (xz), pane size, half mullion width. */
  uWindow: { value: new THREE.Vector4(0, 0, 46, 1.4) },
  /** View centre (xz) and half extents, to keep the dapple light where the reading is. */
  uView: { value: new THREE.Vector4(0, 0, 60, 40) },
  uLeaf: { value: 1 },
  uWind: { value: new THREE.Vector2(1, 0.3) },
};

const GOBO = /* glsl */ `
varying vec3 vTWorld;
uniform float uTime;
uniform vec2 uSlope;
uniform vec4 uWindow;
uniform vec4 uView;
uniform float uLeaf;
uniform vec2 uWind;
float gHash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float gNoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(gHash(i), gHash(i + vec2(1, 0)), f.x), mix(gHash(i + vec2(0, 1)), gHash(i + vec2(1, 1)), f.x), f.y);
}
float gFbm(vec2 p){
  float s = 0., a = .5;
  for (int i = 0; i < 4; i++) { s += a*gNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6)*p + 7.3; a *= .5; }
  return s;
}
float sunGobo(vec3 wp){
  vec2 q = wp.xz - uSlope * wp.y;
  // window panes and mullions; the frame is three panes wide and three tall
  vec2 w = (q - uWindow.xy) / uWindow.z;
  vec2 f = abs(fract(w + .5) - .5);
  float bar = uWindow.w / uWindow.z;
  float pen = .035 + .02 * length(uSlope);
  // the glazing bars are thin and the light wraps round them a little
  float mull = (1. - smoothstep(bar - pen, bar + pen, min(f.x, f.y))) * .5;
  vec2 frame = abs(w) - 1.5;
  float inside = 1. - smoothstep(-pen * 2., pen * 3., max(frame.x, frame.y));
  float lit = inside * (1. - mull);
  // the plant on the sill: leaves sway, so their dapple drifts and breathes
  vec2 sway = uWind * (sin(uTime * .35) * 1.4 + sin(uTime * .83 + 1.3) * .6);
  vec2 lp = q * .055 + sway * .08;
  lp += .35 * vec2(gFbm(lp * 1.3 + uTime * .02), gFbm(lp * 1.3 + 4.1 - uTime * .015));
  float n = gFbm(lp);
  float leaf = smoothstep(.52, .57, n);
  // keep the middle of the frame clearer, so text in the light still reads
  vec2 d = (q - uView.xy) / max(uView.zw, vec2(1.));
  float dens = mix(.05, 1., smoothstep(.5, 1.25, length(d * vec2(.9, 1.1))));
  lit *= 1. - leaf * .8 * uLeaf * dens;
  return lit;
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
  { h: 6.3, sun: 0.2, sunC: '#ffae7c', hemi: 0.34, sky: '#a9b6e0', ground: '#6a5a50', lamp: 0.3, exposure: 1 },
  { h: 7.2, sun: 0.62, sunC: '#ffdcb4', hemi: 0.4, sky: '#b9c6e8', ground: '#8f8068', lamp: 0, exposure: 1 },
  { h: 9.5, sun: 0.68, sunC: '#fff0dc', hemi: 0.4, sky: '#c3cdea', ground: '#9a8f78', lamp: 0, exposure: 1 },
  { h: 12.5, sun: 0.7, sunC: '#fff6ea', hemi: 0.39, sky: '#c6cfea', ground: '#a09680', lamp: 0, exposure: 1 },
  { h: 15.5, sun: 0.68, sunC: '#ffecd2', hemi: 0.38, sky: '#c4cae6', ground: '#9d8c72', lamp: 0, exposure: 1 },
  { h: 17.4, sun: 0.66, sunC: '#ffc68a', hemi: 0.36, sky: '#c8c0d8', ground: '#a07f5c', lamp: 0, exposure: 1 },
  { h: 18.5, sun: 0.58, sunC: '#ffad62', hemi: 0.33, sky: '#b9b2cf', ground: '#8a6446', lamp: 0, exposure: 1 },
  { h: 19.3, sun: 0.22, sunC: '#ff8a4c', hemi: 0.27, sky: '#8f93c4', ground: '#4f3e40', lamp: 0.4, exposure: 1 },
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
