import * as THREE from 'three';
import { withSun } from './light';

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
        shader.fragmentShader = FRAG + shader.fragmentShader.replace('#include <map_fragment>', MAP);
      },
    );
    this.mesh = new THREE.Mesh(geo, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    if (o.shade !== false) {
      const s = new THREE.Mesh(
        new THREE.PlaneGeometry(o.w * 1.1, o.h * 1.1).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: shadeTexture(), transparent: true, opacity: 0.32, depthWrite: false, color: '#1c1a2a' }),
      );
      s.renderOrder = -1;
      this.shade = s;
    }
  }

  set front(t: THREE.Texture | null) {
    this.mesh.material.map = t;
    this.mesh.material.needsUpdate = true;
  }

  set back(t: THREE.Texture | null) {
    this.uniforms.uBack.value = t;
    this.uniforms.uHasBack.value = t ? 1 : 0;
  }

  /**
   * Keep the contact shade under the sheet: it spreads and fades as the sheet lifts, and is
   * meant to be parented to the same layer as the sheet's group (not the group itself).
   */
  syncShade(lift = this.group.position.y, strength = 1) {
    if (!this.shade) return;
    const g = this.group;
    this.shade.position.set(g.position.x, 0.02, g.position.z);
    this.shade.rotation.y = g.rotation.y;
    const spread = 1 + Math.min(lift, 12) * 0.035;
    this.shade.scale.set(spread * g.scale.x, 1, spread * g.scale.z);
    (this.shade.material as THREE.MeshBasicMaterial).opacity = (0.34 / (1 + lift * 0.25)) * strength;
  }
}
