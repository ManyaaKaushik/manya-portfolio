import * as THREE from 'three';
import { sunUniforms, withSun } from './light';

/*
 * A sheet of paper lying on the table. Flat in the xz plane, front face up. It has a printed
 * front and back (the back is sampled mirrored, so it reads correctly once the sheet is turned
 * over), takes its outline from the front texture's alpha (deckled edges, perforations), and can
 * curl at the corners or bow while it's being lifted. A soft contact shade sits under it so it
 * stays grounded even when the sun is gone.
 */

const VERT = /* glsl */ `
uniform float uCurl;
uniform float uBow;
uniform vec2 uHalf;
uniform vec4 uUv;
`;

const BEND = /* glsl */ `
  {
    vec2 n = vec2(position.x / uHalf.x, -position.z / uHalf.y);
    // corners curl up a little: paper that has been handled
    float corner = pow(max(abs(n.x), abs(n.y)), 4.) * .6 + pow(abs(n.x * n.y), 2.) * .4;
    transformed.y += uCurl * corner;
    // and it bows when lifted or turned
    transformed.y += uBow * (1. - n.x * n.x) * uHalf.x * .18;
  }
`;

/*
 * Paper has no thickness, so a sheet would catch its own shadow (and shadow acne) on whichever
 * face looks at the light. Its shadow caster is pushed a millimetre out of the far face instead.
 */
const THICKNESS = /* glsl */ `
  {
    vec3 wN = normalize(mat3(modelMatrix) * normal);
    vec3 L = normalize(vec3(uSlope.x, 1., uSlope.y));
    transformed -= normal * (dot(wN, L) >= 0. ? 1. : -1.) * .1;
  }
`;

/** Paper lets some sunlight through, so a sheet turned away from the sun glows rather than going grey. */
function translucent(frag: string) {
  const loop = frag.indexOf('NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )');
  const call = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
  const at = frag.indexOf(call, loop);
  if (loop < 0 || at < 0) return frag;
  const glow = `\n\t\treflectedLight.directDiffuse += directLight.color * max( -dot( geometryNormal, directLight.direction ), 0. ) * .32 * BRDF_Lambert( material.diffuseColor );`;
  return frag.slice(0, at + call.length) + glow + frag.slice(at + call.length);
}

const FRAG = /* glsl */ `
uniform sampler2D uBack;
uniform float uHasBack;
uniform vec2 uMirror;
uniform float uDim;
`;

const MAP = /* glsl */ `
  #ifdef USE_MAP
  {
    vec4 front = texture2D( map, vMapUv );
    vec4 col = front;
    if ( !gl_FrontFacing && uHasBack > .5 ) {
      vec2 bu = mix( vMapUv, vec2( 1. ) - vMapUv, uMirror );
      col = vec4( texture2D( uBack, bu ).rgb, front.a );
    }
    diffuseColor *= col;
    diffuseColor.rgb *= uDim;
  }
  #endif
`;

let shade: THREE.Texture | null = null;
function shadeTexture() {
  if (shade) return shade;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.75)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  shade = new THREE.CanvasTexture(c);
  return shade;
}

export type SheetOptions = {
  w: number;
  h: number;
  front?: THREE.Texture;
  back?: THREE.Texture;
  /** Mirror the back across u (turned over sideways, the default) or v (turned over top to bottom). */
  turn?: 'side' | 'end';
  segments?: number;
  /** UV window of the textures this sheet shows; for panels of a folded letter. */
  uv?: [number, number, number, number];
  roughness?: number;
  shade?: boolean;
  /** Pivot along an edge instead of the centre (for flaps and folds). */
  pivot?: 'center' | 'top' | 'bottom' | 'left' | 'right';
};

export class Sheet {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  readonly shade: THREE.Mesh | null = null;
  readonly uniforms;
  readonly w: number;
  readonly h: number;

  constructor(o: SheetOptions) {
    this.w = o.w;
    this.h = o.h;
    const seg = o.segments ?? 12;
    const geo = new THREE.PlaneGeometry(o.w, o.h, seg, Math.max(2, Math.round((seg * o.h) / o.w)));
    if (o.uv) {
      const [u0, v0, u1, v1] = o.uv;
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    }
    geo.rotateX(-Math.PI / 2);
    const pivot = o.pivot ?? 'center';
    if (pivot === 'top') geo.translate(0, 0, o.h / 2);
    if (pivot === 'bottom') geo.translate(0, 0, -o.h / 2);
    if (pivot === 'left') geo.translate(o.w / 2, 0, 0);
    if (pivot === 'right') geo.translate(-o.w / 2, 0, 0);

    this.uniforms = {
      uCurl: { value: 0.12 },
      uBow: { value: 0 },
      uHalf: { value: new THREE.Vector2(o.w / 2, o.h / 2) },
      uUv: { value: new THREE.Vector4() },
      uBack: { value: o.back ?? null },
      uHasBack: { value: o.back ? 1 : 0 },
      uMirror: { value: new THREE.Vector2(o.turn === 'end' ? 0 : 1, o.turn === 'end' ? 1 : 0) },
      uDim: { value: 1 },
    };
    // bending is measured from the sheet's centre, whatever the pivot
    const centre = pivot === 'top' ? '(position.z - uHalf.y)' : pivot === 'bottom' ? '(position.z + uHalf.y)' : 'position.z';
    const centreX = pivot === 'left' ? '(position.x - uHalf.x)' : pivot === 'right' ? '(position.x + uHalf.x)' : 'position.x';

    const material = withSun(
      new THREE.MeshStandardMaterial({ map: o.front ?? null, roughness: o.roughness ?? 0.88, metalness: 0, side: THREE.DoubleSide, alphaTest: 0.5 }),
      `sheet:${pivot}`,
      shader => {
        Object.assign(shader.uniforms, this.uniforms);
        shader.vertexShader = VERT + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${BEND.replaceAll('position.x', centreX).replaceAll('position.z', centre)}`);
        shader.fragmentShader = translucent(FRAG + shader.fragmentShader.replace('#include <map_fragment>', MAP));
      },
    );
    this.mesh = new THREE.Mesh(geo, material);
    // the shadow has to be cast by the same bent, deckle-edged sheet that's drawn, or a sheet
    // lying face down sinks below its own flat shadow and darkens itself
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: o.front ?? null, alphaTest: 0.5, side: THREE.DoubleSide });
    depth.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.uniforms, { uSlope: sunUniforms.uSlope });
      shader.vertexShader =
        VERT +
        'uniform vec2 uSlope;\n' +
        shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${BEND.replaceAll('position.x', centreX).replaceAll('position.z', centre)}\n${THICKNESS}`);
    };
    depth.customProgramCacheKey = () => `sheet-depth:${pivot}`;
    this.mesh.customDepthMaterial = depth;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    if (o.shade !== false) {
      const s = new THREE.Mesh(
        new THREE.PlaneGeometry(o.w * 1.1, o.h * 1.1).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: shadeTexture(), transparent: true, opacity: 0.32, depthWrite: false, color: '#1c1a2a' }),
      );
      s.renderOrder = -1;
      s.userData.sheet = this;
      this.shade = s;
    }
  }

  set front(t: THREE.Texture | null) {
    this.mesh.material.map = t;
    this.mesh.material.needsUpdate = true;
    const depth = this.mesh.customDepthMaterial as THREE.MeshDepthMaterial | undefined;
    if (depth) {
      depth.map = t;
      depth.needsUpdate = true;
    }
  }

  set back(t: THREE.Texture | null) {
    this.uniforms.uBack.value = t;
    this.uniforms.uHasBack.value = t ? 1 : 0;
  }

  private lift = 0;
  private strength = 1;

  /**
   * Set how far the sheet is lifted and how solid its contact shade is: the shade spreads and
   * fades as the sheet lifts. It lives in the world's shade layer, which follows the sheet's
   * place on the table every frame (see placeShade).
   */
  syncShade(lift = this.group.position.y, strength = 1) {
    this.lift = lift;
    this.strength = strength;
    this.placeShade();
  }

  /** Put the shade under the sheet wherever it is in the world, and hide it with the sheet. */
  placeShade() {
    const s = this.shade;
    if (!s) return;
    const g = this.group;
    let on = true;
    for (let n: THREE.Object3D | null = g; n; n = n.parent) if (!n.visible) on = false;
    s.visible = on && this.strength > 0.001;
    if (!s.visible) return;
    g.updateWorldMatrix(true, false);
    g.matrixWorld.decompose(_p, _q, _s);
    _e.setFromQuaternion(_q, 'YXZ');
    s.position.set(_p.x, 0.02, _p.z);
    s.rotation.y = _e.y;
    const spread = 1 + Math.min(this.lift, 12) * 0.035;
    s.scale.set(spread * _s.x, 1, spread * _s.z);
    (s.material as THREE.MeshBasicMaterial).opacity = (0.34 / (1 + this.lift * 0.25)) * this.strength;
  }
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
