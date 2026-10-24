import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { blogs } from '../../../lib/content';
import { lawnHole } from '../lawn';
import { WIND, sunUniforms, withSun } from '../light';
import { INK, Painter, loadImage, paperDensity } from '../paint';
import { Sheet } from '../paper';
import { stationZ } from '../stations';
import { damp, rng } from '../util';
import type { Chapter, TableWorld, View } from '../world';
import { keyed } from './work';

/*
 * 15:00 — A pond at the bottom of the garden, the kind Tiny Glade builds: clear water over a sandy
 * shelf, rounded mossy stones all round, reeds at the banks, water lilies. Her writing floats on
 * the three big lily pads; touch one and it dips and sends out a ring, click it to read.
 */

const CARD = { w: 24, h: 16 };

/** The shoreline: an egg of a pond, wobbled so no two banks are alike. Radius scale at angle a. */
const shore = (a: number) => 1 + 0.1 * Math.sin(2 * a + 1.1) + 0.06 * Math.sin(3 * a + 0.4) + 0.035 * Math.sin(5 * a + 2.2);

type Pond = { cx: number; cz: number; rx: number; rz: number };
type Pad = { group: THREE.Group; x: number; z: number; r: number; phase: number; hover: number; lift: number; card?: Sheet; cardRot?: number; url?: string };

const shoreAt = (p: Pond, a: number, out = 0) => {
  const f = shore(a);
  return new THREE.Vector2(p.cx + Math.cos(a) * (p.rx * f + out), p.cz + Math.sin(a) * (p.rz * f + out));
};

/** Is (x, z) inside the pond, at fraction `s` of its size? */
const inside = (p: Pond, x: number, z: number, s = 1) => {
  const dx = (x - p.cx) / p.rx;
  const dz = (z - p.cz) / p.rz;
  return Math.hypot(dx, dz) < shore(Math.atan2(dz, dx)) * s;
};

/* ------------------------------------------------------------------------ */
/*  Water                                                                     */
/* ------------------------------------------------------------------------ */

/** A polar mesh from the shore (depth 0) to the middle (1), so the shelf and the colour follow the bank. */
function waterGeometry(p: Pond) {
  const S = 120;
  const R = 16;
  const pos: number[] = [];
  const depth: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j < R; j++) {
    const t = 1 - j / R;
    for (let i = 0; i < S; i++) {
      const a = (i / S) * Math.PI * 2;
      const f = shore(a) * t;
      pos.push(p.cx + Math.cos(a) * p.rx * f, 0, p.cz + Math.sin(a) * p.rz * f);
      depth.push(1 - Math.pow(t, 7));
    }
  }
  const centre = pos.length / 3;
  pos.push(p.cx, 0, p.cz);
  depth.push(1);
  for (let j = 0; j < R - 1; j++)
    for (let i = 0; i < S; i++) {
      const a = j * S + i;
      const b = j * S + ((i + 1) % S);
      idx.push(a, a + S, b, b, a + S, b + S);
    }
  for (let i = 0; i < S; i++) idx.push((R - 1) * S + i, centre, (R - 1) * S + ((i + 1) % S));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('aDepth', new THREE.Float32BufferAttribute(depth, 1));
  g.setIndex(idx);
  return g;
}

const waterUniforms = {
  /** The three blog pads: x, z, how hard each is rocking. */
  uPads: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
  /** Rings from things touching the water: x, z, start time. */
  uDrops: { value: [new THREE.Vector3(0, 0, -99), new THREE.Vector3(0, 0, -99), new THREE.Vector3(0, 0, -99)] },
};

const WATER = /* glsl */ `
varying float vDepth;
uniform vec4 uPads[3];
uniform vec3 uDrops[3];
float waterH(vec2 p){
  // ripples running downwind, livelier as a gust crosses
  vec2 w = normalize(uWind);
  float h = gNoise(p * .32 - w * uTime * .8) * .55 + gNoise(p * .85 + w.yx * uTime * .45 + 3.) * .3 + gNoise(p * 2. - w * uTime * 1.5) * .15;
  h *= .45 + windGust(p) * .9;
  // a pad rocking sends rings out
  for (int i = 0; i < 3; i++) { float d = length(p - uPads[i].xy); h += sin(d * 2.1 - uTime * 4.2) * exp(-d * .22) * uPads[i].z * .7; }
  // and so does a water boatman
  for (int i = 0; i < 3; i++) {
    float age = uTime - uDrops[i].z;
    float d = length(p - uDrops[i].xy);
    h += step(0., age) * exp(-pow((d - age * 6.) * .8, 2.)) * exp(-age * 1.1) * sin(d * 3.2) * .6;
  }
  return h;
}
`;

function makeWater(p: Pond) {
  const material = withSun(new THREE.MeshStandardMaterial({ roughness: 0.14, metalness: 0 }), 'pond', shader => {
    Object.assign(shader.uniforms, waterUniforms);
    shader.vertexShader = 'attribute float aDepth;\nvarying float vDepth;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvDepth = aDepth;');
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${WATER}\nvoid main() {`)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          vec2 p = vTWorld.xz;
          float d = vDepth;
          // the bed: pale sand and pebbles on the shelf, weed further out
          float bn = gNoise(p * .55) * .6 + gNoise(p * 2.3) * .4;
          vec3 bed = mix(vec3(.6, .57, .4), vec3(.36, .47, .32), smoothstep(.2, .7, d)) * (.82 + .3 * bn);
          // sunlight focused by the ripples, dancing on the bed
          vec2 cp = p * .42 + normalize(uWind) * uTime * .22;
          float a = gNoise(cp), b = gNoise(cp * 1.6 + 4. + uTime * .12);
          float caust = pow(smoothstep(.92, 1., 1. - abs(a - b)), 2.);
          bed += caust * .22 * (1. - d);
          // clear in the shallows, deepening to teal
          vec3 tint = mix(vec3(.36, .7, .68), vec3(.06, .27, .34), smoothstep(.1, 1., d));
          vec3 col = mix(bed, tint, clamp(smoothstep(.0, .55, d) * .9 + .1, 0., 1.));
          // a lip of foam where it laps the stones
          col = mix(col, vec3(.86, .93, .9), smoothstep(.035, 0., d) * (.35 + .3 * gNoise(p * 3. + uTime * .4)));
          diffuseColor.rgb = col;
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        {
          vec2 p = vTWorld.xz;
          float e = .12;
          float k = .16 * smoothstep(0., .15, vDepth);
          float hx = waterH(p + vec2(e, 0.)) - waterH(p - vec2(e, 0.));
          float hz = waterH(p + vec2(0., e)) - waterH(p - vec2(0., e));
          vec3 nW = normalize(vec3(-hx * k / (2. * e), 1., -hz * k / (2. * e)));
          normal = normalize((viewMatrix * vec4(nW, 0.)).xyz);
        }`,
      );
  });
  const m = new THREE.Mesh(waterGeometry(p), material);
  m.position.y = 0.3;
  m.receiveShadow = true;
  // over the grass, flowers and pebbles of the lawn, which leave the depth alone
  m.renderOrder = -6;
  m.raycast = () => {};
  return m;
}

/** Darker, damp earth just outside the water, under the stones. */
function makeBank(p: Pond) {
  const S = 120;
  const W = 7;
  const pos: number[] = [];
  const fade: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < S; i++) {
    const a = (i / S) * Math.PI * 2;
    for (const [out, f] of [
      [-1, 1],
      [W, 0],
    ]) {
      const q = shoreAt(p, a, out);
      pos.push(q.x, 0.15, q.y);
      fade.push(f);
    }
    const j = i * 2;
    const n = ((i + 1) % S) * 2;
    idx.push(j, n, j + 1, j + 1, n, n + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFade', new THREE.Float32BufferAttribute(fade, 1));
  g.setIndex(idx);
  const material = new THREE.MeshBasicMaterial({ blending: THREE.MultiplyBlending, premultipliedAlpha: true, toneMapped: false, side: THREE.DoubleSide });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float aFade;\nvarying float vFade;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
    shader.fragmentShader = ('varying float vFade;\n' + shader.fragmentShader).replace('#include <map_fragment>', 'diffuseColor.rgb = mix(vec3(1.), vec3(.42, .4, .3), vFade * vFade);');
  };
  material.customProgramCacheKey = () => 'pond-bank';
  const m = new THREE.Mesh(g, material);
  m.renderOrder = -6.5;
  m.raycast = () => {};
  return m;
}

/* ------------------------------------------------------------------------ */
/*  Stones                                                                    */
/* ------------------------------------------------------------------------ */

function stoneGeometry() {
  const ico = new THREE.IcosahedronGeometry(1, 2);
  ico.deleteAttribute('uv');
  ico.deleteAttribute('normal');
  const g = mergeVertices(ico);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  // worn round by water: lumpy, never sharp
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = 1 + 0.09 * Math.sin(v.x * 2.3 + v.z * 1.1) + 0.06 * Math.sin(v.y * 3.1 + v.x * 2.2 + 1) + 0.04 * Math.sin(v.z * 4.7 + 2);
    v.multiplyScalar(n);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const STONES = ['#cfc8b8', '#bdb7aa', '#d9d2c2', '#ada89c', '#c5bba6', '#e0dacd'];

function makeStones(p: Pond, seed: number) {
  const r = rng(seed);
  const items: { x: number; z: number; s: number; a: number }[] = [];
  // a ring of stones walked round the bank, sized so they just touch, the odd one in the water
  let a = 0;
  while (a < Math.PI * 2) {
    const s = 2.2 + Math.pow(r(), 1.6) * 4.2;
    const out = s * 0.35 + (r() - 0.6) * 1.6;
    const q = shoreAt(p, a, out);
    items.push({ x: q.x, z: q.y, s, a });
    const R = Math.hypot(p.rx, p.rz) * shore(a) * 0.72;
    a += (s * (0.95 + r() * 0.35)) / R;
  }
  // and smaller ones scattered behind
  const n = items.length;
  for (let i = 0; i < n * 0.6; i++) {
    const a2 = r() * Math.PI * 2;
    const s = 1 + r() * 2.2;
    const q = shoreAt(p, a2, 4 + r() * 6);
    items.push({ x: q.x, z: q.y, s, a: a2 });
  }
  const mat = withSun(new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0 }), 'pond-stone', shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      /* glsl */ `#include <normal_fragment_maps>
      {
        // moss on the tops, where the damp settles
        float up = dot(normal, normalize((viewMatrix * vec4(0., 1., 0., 0.)).xyz));
        float moss = smoothstep(.55, .9, up) * smoothstep(.35, .7, gNoise(vTWorld.xz * .9) * .7 + gNoise(vTWorld.xz * 3.1) * .3);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.36, .47, .22), moss * .75);
        // and a darker, wet foot
        diffuseColor.rgb *= mix(.62, 1., smoothstep(.3, 1.4, vTWorld.y));
      }`,
    );
  });
  const mesh = new THREE.InstancedMesh(stoneGeometry(), mat, items.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  items.forEach((it, i) => {
    const h = it.s * (0.32 + r() * 0.22);
    e.set((r() - 0.5) * 0.25, r() * Math.PI * 2, (r() - 0.5) * 0.25);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(it.x, h * 0.35, it.z), q, new THREE.Vector3(it.s * 0.55, h, it.s * (0.4 + r() * 0.15)));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(STONES[Math.floor(r() * STONES.length)]));
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.raycast = () => {};
  return mesh;
}

/* ------------------------------------------------------------------------ */
/*  Reeds                                                                     */
/* ------------------------------------------------------------------------ */

const REED = /* glsl */ `
attribute vec4 aReed; // root x, z, height, yaw
attribute float aT;
varying float vT;
vec3 reedAt(float t, vec4 rd, float seed){
  // a stiff stem: leans downwind from the root, bending more towards the top
  vec2 w = normalize(uWind);
  float g = windGust(rd.xy);
  float bend = (.08 + .3 * smoothstep(.3, .8, g) + sin(uTime * 1.9 + seed * 17.) * .04) * rd.z;
  vec2 lean = vec2(cos(rd.w), sin(rd.w)) * .12 * rd.z;
  return vec3(rd.x + (lean.x + w.x * bend) * t * t, rd.z * t, rd.y + (lean.y + w.y * bend) * t * t);
}
`;

function makeReeds(p: Pond, spots: number[], seed: number) {
  const r = rng(seed);
  const reeds: number[] = [];
  const heads: number[] = [];
  for (const a0 of spots) {
    const n = 16 + Math.floor(r() * 10);
    for (let i = 0; i < n; i++) {
      const a = a0 + (r() - 0.5) * 0.28;
      const q = shoreAt(p, a, 2 + r() * 6);
      const h = 9 + r() * 10;
      const row = [q.x + (r() - 0.5) * 3, q.y + (r() - 0.5) * 3, h, r() * Math.PI * 2];
      reeds.push(...row);
      if (r() < 0.3) heads.push(...row);
    }
  }
  // a leaf: a long thin strip, aT from root to tip
  const SEG = 5;
  const pos: number[] = [];
  const t: number[] = [];
  const idx: number[] = [];
  for (let s = 0; s <= SEG; s++) {
    const f = s / SEG;
    const w = 0.22 * (1 - f * 0.85);
    pos.push(-w, 0, 0, w, 0, 0);
    t.push(f, f);
    if (s < SEG) idx.push(s * 2, s * 2 + 1, s * 2 + 2, s * 2 + 1, s * 2 + 3, s * 2 + 2);
  }
  const leaf = new THREE.BufferGeometry();
  leaf.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  leaf.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  leaf.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
  leaf.setIndex(idx);

  const inst = (base: THREE.BufferGeometry, data: number[]) => {
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    for (const [k, v] of Object.entries(base.attributes)) g.setAttribute(k, v);
    g.setAttribute('aReed', new THREE.InstancedBufferAttribute(new Float32Array(data), 4));
    g.instanceCount = data.length / 4;
    return g;
  };
  const material = (key: string, color: string, body: string, frag = '') =>
    withSun(new THREE.MeshStandardMaterial({ color, roughness: 0.75, side: THREE.DoubleSide }), key, shader => {
      shader.vertexShader = (WIND + REED + shader.vertexShader).replace('#include <begin_vertex>', `#include <begin_vertex>\n${body}`);
      if (frag) shader.fragmentShader = ('varying float vT;\n' + shader.fragmentShader).replace('#include <color_fragment>', `#include <color_fragment>\n${frag}`);
    });

  const leaves = new THREE.Mesh(
    inst(leaf, reeds),
    material(
      'reeds',
      '#7d9a48',
      /* glsl */ `
      vec3 a = reedAt(aT, aReed, aReed.w);
      vec3 b = reedAt(min(1., aT + .05), aReed, aReed.w);
      vec2 dir = normalize(b.xz - a.xz + vec2(1e-4));
      // the leaf's flat face turned by its yaw
      vec2 side = vec2(cos(aReed.w), sin(aReed.w));
      transformed = a + vec3(side.x, 0., side.y) * position.x;
      vT = aT;`,
      'diffuseColor.rgb *= mix(.62, 1.15, vT);',
    ),
  );
  const head = new THREE.CapsuleGeometry(0.42, 2.4, 3, 8);
  head.translate(0, 1.6, 0);
  // the cattail rides at the top of its stem
  head.setAttribute('aT', new THREE.Float32BufferAttribute(new Array(head.attributes.position.count).fill(1), 1));
  const cattails = new THREE.Mesh(
    inst(head, heads),
    material(
      'cattails',
      '#6b4a2c',
      /* glsl */ `
      vec3 top = reedAt(1., aReed, aReed.w);
      vec3 below = reedAt(.9, aReed, aReed.w);
      vec3 up = normalize(top - below);
      vec3 sideV = normalize(cross(up, vec3(0., 0., 1.)));
      vec3 fwd = cross(sideV, up);
      transformed = top + sideV * position.x + up * position.y + fwd * position.z;
      vT = 1.;`,
    ),
  );
  for (const m of [leaves, cattails]) {
    m.frustumCulled = false;
    m.receiveShadow = true;
    m.raycast = () => {};
  }
  return [leaves, cattails];
}

/* ------------------------------------------------------------------------ */
/*  Lily pads and water lilies                                                */
/* ------------------------------------------------------------------------ */

function paintPad() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const r = rng(61);
  const R = S / 2;
  const grad = g.createRadialGradient(R, R, 0, R, R, R);
  grad.addColorStop(0, '#86ad55');
  grad.addColorStop(0.6, '#6c9a43');
  grad.addColorStop(0.92, '#557f35');
  grad.addColorStop(1, '#8a9a45');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(R, R, R, 0, Math.PI * 2);
  g.fill();
  // veins from the stalk out to the rim, forking as they go
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + (r() - 0.5) * 0.05;
    g.strokeStyle = `rgba(200,225,150,${0.22 + r() * 0.12})`;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(R, R);
    const bend = (r() - 0.5) * 0.08;
    g.quadraticCurveTo(R + Math.cos(a + bend) * R * 0.5, R + Math.sin(a + bend) * R * 0.5, R + Math.cos(a) * R * 0.96, R + Math.sin(a) * R * 0.96);
    g.stroke();
    g.lineWidth = 1;
    for (const side of [-1, 1]) {
      const f = 0.55 + r() * 0.2;
      g.beginPath();
      g.moveTo(R + Math.cos(a) * R * f, R + Math.sin(a) * R * f);
      g.lineTo(R + Math.cos(a + side * 0.07) * R * 0.95, R + Math.sin(a + side * 0.07) * R * 0.95);
      g.stroke();
    }
  }
  // a waxy sheen, and the odd brown spot of age
  for (let i = 0; i < 18; i++) {
    const x = R + (r() - 0.5) * R * 1.4;
    const y = R + (r() - 0.5) * R * 1.4;
    const rad = 10 + r() * 50;
    const s = g.createRadialGradient(x, y, 0, x, y, rad);
    s.addColorStop(0, r() < 0.75 ? 'rgba(230,245,200,0.12)' : 'rgba(120,90,40,0.18)');
    s.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = s;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.fillStyle = 'rgba(90,110,50,0.8)';
  g.beginPath();
  g.arc(R, R, 5, 0, Math.PI * 2);
  g.fill();
  return c;
}

/** A pad: a disc with its notch, rim turned up a little. Unit radius; the curl is in cm. */
function padGeometry(notch: number) {
  const g = new THREE.RingGeometry(0.02, 1, 56, 6, notch / 2, Math.PI * 2 - notch);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const rr = Math.hypot(p.getX(i), p.getZ(i));
    p.setY(i, Math.pow(rr, 6) * 0.45);
  }
  g.computeVertexNormals();
  return g;
}

function lilyGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const petal = (len: number, wid: number, rise: number, yaw: number, tip: THREE.Color, base: THREE.Color) => {
    const g = new THREE.PlaneGeometry(1, 1, 4, 8);
    const p = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i);
      const v = uv.getY(i);
      // pointed oval, cupped across its width
      const w = Math.sin(Math.PI * Math.pow(v, 0.75)) * wid * 0.5;
      const x = u * 2 * w;
      p.setXYZ(i, x, (x * x) / (wid * 0.6), v * len);
      c.copy(base).lerp(tip, Math.pow(v, 1.4)).toArray(col, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // raise it from lying flat, then turn it round the heart
    g.rotateX(-rise);
    g.rotateY(yaw);
    return g;
  };
  const white = new THREE.Color('#fbf7f2');
  const pink = new THREE.Color('#f2a9c0');
  const blush = new THREE.Color('#f7d3de');
  const cream = new THREE.Color('#fff4d8');
  for (let i = 0; i < 8; i++) parts.push(petal(3.1, 1.25, 0.32, (i / 8) * Math.PI * 2, blush, white));
  for (let i = 0; i < 8; i++) parts.push(petal(2.6, 1.05, 0.72, (i / 8 + 1 / 16) * Math.PI * 2, pink, cream));
  for (let i = 0; i < 6; i++) parts.push(petal(1.8, 0.8, 1.1, (i / 6) * Math.PI * 2 + 0.3, pink, cream));
  const heart = new THREE.SphereGeometry(0.55, 12, 8);
  heart.scale(1, 0.55, 1);
  heart.translate(0, 0.45, 0);
  heart.setAttribute('color', new THREE.BufferAttribute(new Float32Array(heart.attributes.position.count * 3).map((_, i) => [0.98, 0.72, 0.12][i % 3]), 3));
  heart.deleteAttribute('uv');
  for (const g of parts) g.deleteAttribute('uv');
  const merged = mergeGeometries([...parts, heart])!;
  merged.computeVertexNormals();
  return merged;
}

/* ------------------------------------------------------------------------ */
/*  The blog cards                                                            */
/* ------------------------------------------------------------------------ */

/** A soft, pebble-ish outline: a squircle with a gentle wobble. */
function blob(g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, seed: number, n = 3.4) {
  const r = rng(seed);
  const ph = [r() * 6, r() * 6, r() * 6];
  g.beginPath();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const wob = 1 + 0.025 * Math.sin(2 * a + ph[0]) + 0.018 * Math.sin(3 * a + ph[1]) + 0.01 * Math.sin(5 * a + ph[2]);
    const x = cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * (w / 2) * wob;
    const y = cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * (h / 2) * wob;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
}

async function paintCard(b: (typeof blogs)[number], i: number, renderer: THREE.WebGLRenderer) {
  const k = paperDensity();
  const img = await loadImage(b.image);
  const p = new Painter(CARD.w, CARD.h, k);
  p.paper('#fbf7ec', { seed: 700 + i, fibres: 0.8, mottle: 0.6 });
  const c = p.ctx;
  const K = p.k;

  p.text(`MEDIUM · ${b.read.toUpperCase()}`, 2.3, 2.6, { family: 'mono', size: 0.42, weight: 600 }, INK.soft, { spacing: 0.14 });
  const end = p.para([{ family: 'serif', size: 1.62, text: b.title, color: b.ink }], 2.3, 4.7, 12.2, 1.6);
  p.text(b.note, 2.3, end + 1.35, { family: 'hand', size: 1.0 }, INK.soft);
  // date and link sit in from the rounded corner
  p.text(b.date, 2.9, CARD.h - 2.3, { family: 'mono', size: 0.38, weight: 500 }, INK.soft, { spacing: 0.08 });
  p.text('read on Medium ↗', 8.4, CARD.h - 2.25, { family: 'hand', size: 1.05 }, b.ink);

  // the cover, in a pebble of its own
  const ix = 15.2;
  const iy = 2.1;
  const iw = 7.2;
  const ih = 11.8;
  c.save();
  blob(c, (ix + iw / 2) * K, (iy + ih / 2) * K, iw * K, ih * K, 800 + i, 3);
  c.clip();
  c.fillStyle = '#f1ece0';
  c.fillRect(ix * K, iy * K, iw * K, ih * K);
  if (b.id === 'finch') p.image(img, ix + 0.6, iy + (ih - iw + 1.2) / 2, iw - 1.2, iw - 1.2);
  else p.image(img, ix, iy, iw, ih, { cover: true, focus: b.id === 'airport' ? [0.45, 0.5] : [0.5, 0.55] });
  c.restore();
  c.save();
  blob(c, (ix + iw / 2) * K, (iy + ih / 2) * K, iw * K, ih * K, 800 + i, 3);
  c.strokeStyle = 'rgba(28,35,51,0.18)';
  c.lineWidth = 0.04 * K;
  c.stroke();
  c.restore();
  p.grain(0.04, 710 + i);

  // and the card itself cut to a soft pebble shape
  c.save();
  c.globalCompositeOperation = 'destination-in';
  c.fillStyle = '#000';
  blob(c, (CARD.w / 2) * K, (CARD.h / 2) * K, (CARD.w - 0.3) * K, (CARD.h - 0.3) * K, 900 + i);
  c.fill();
  c.restore();
  return p.texture(renderer);
}

/* ------------------------------------------------------------------------ */

export class PondChapter implements Chapter {
  readonly id = 'pond' as const;
  readonly group = new THREE.Group();
  private scene = new THREE.Group();
  private pads: Pad[] = [];
  private lilies: { mesh: THREE.Object3D; pad?: Pad; x: number; z: number; phase: number }[] = [];
  private portrait: boolean | null = null;
  private pond!: Pond;
  private padTex!: THREE.Texture;
  private padMats: THREE.Material[] = [];
  private lily!: THREE.BufferGeometry;
  private lilyMat!: THREE.Material;
  private cardTex: THREE.Texture[] = [];
  private t = 0;
  private nextDrop = 0;
  private drop = 0;

  view(u: number, aspect: number): View {
    const portrait = aspect < 0.8;
    const Z = stationZ('pond', portrait);
    if (portrait) {
      const z = keyed(u, [
        [0, Z + 18],
        [0.2, Z + 4],
        [0.45, Z + 36],
        [0.75, Z + 68],
        [1, Z + 78],
      ]);
      const w = keyed(u, [
        [0, 58],
        [0.2, 34],
        [0.8, 34],
        [1, 48],
      ]);
      return { x: 0, z, w, h: 46 };
    }
    // the whole pond, then a lean in so the writing reads, and back out
    const w = keyed(u, [
      [0, 150],
      [0.25, 118],
      [0.8, 118],
      [1, 146],
    ]);
    return { x: 0, z: Z + 2, w, h: w * 0.6 };
  }

  async build(world: TableWorld) {
    const r = world.renderer;
    this.padTex = new THREE.CanvasTexture(paintPad());
    this.padTex.colorSpace = THREE.SRGBColorSpace;
    this.padTex.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
    this.padMats = ['#ffffff', '#f2f7e6', '#e8f0dc'].map((tint, i) =>
      withSun(new THREE.MeshStandardMaterial({ map: this.padTex, color: tint, roughness: 0.42, metalness: 0, side: THREE.DoubleSide }), `pad-${i}`),
    );
    this.lily = lilyGeometry();
    this.lilyMat = withSun(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }), 'lily');
    this.cardTex = await Promise.all(blogs.map((b, i) => paintCard(b, i, r)));
    this.group.add(this.scene);
    this.layout(world.aspect < 0.8, world);
  }

  private clear(world: TableWorld) {
    for (const pad of this.pads) {
      const i = world.hotspots.findIndex(h => h.object === pad.group);
      if (i >= 0) world.hotspots.splice(i, 1);
    }
    this.scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry && m.geometry !== this.lily) m.geometry.dispose();
    });
    this.scene.clear();
    this.pads = [];
    this.lilies = [];
  }

  private layout(portrait: boolean, world: TableWorld) {
    if (this.portrait !== null) this.clear(world);
    this.portrait = portrait;
    const Z = stationZ('pond', portrait);
    const pond: Pond = portrait ? { cx: 0, cz: Z + 36, rx: 25, rz: 64 } : { cx: 0, cz: Z + 2, rx: 64, rz: 36 };
    this.pond = pond;
    // and the lawn stops growing where the water starts (the shore wanders in to ~.8 of the radii)
    lawnHole.set(pond.cx, pond.cz, pond.rx * 0.8, pond.rz * 0.8);
    const r = rng(portrait ? 11 : 12);

    this.scene.add(makeBank(pond), makeWater(pond), makeStones(pond, portrait ? 21 : 22), ...makeReeds(pond, portrait ? [2.3, 5.2, 0.6] : [2.6, 5.7, 0.95], portrait ? 31 : 32));

    // the three pads with her writing on them
    const spots = portrait
      ? [
          [0, Z + 4, 14.5, 0.03],
          [1, Z + 36, 14.5, -0.04],
          [-1, Z + 68, 14.5, 0.02],
        ]
      : [
          [-38, Z - 3, 15, -0.05],
          [0, Z + 8, 15.5, 0.03],
          [38, Z - 4, 15, -0.04],
        ];
    blogs.forEach((b, i) => {
      const [x, z, R, rot] = spots[i];
      const pad = this.addPad(x, z, R, r);
      const card = new Sheet({ w: CARD.w, h: CARD.h, front: this.cardTex[i], roughness: 0.82, segments: 10, shade: false });
      card.uniforms.uCurl.value = 0.08;
      // the card rides on its pad, and counts as the pad for the pointer
      pad.group.add(card.group);
      pad.card = card;
      pad.cardRot = rot;
      pad.url = b.url;
      world.hotspots.push({
        object: pad.group,
        cursor: 'pointer',
        chapter: 'pond',
        label: `Read “${b.title}” on Medium`,
        onEnter: () => (pad.hover = 1),
        onLeave: () => (pad.hover = 0),
        onClick: () => world.open?.(b.url),
      });
    });

    // smaller pads drifting about, some with a flower
    const big = [...this.pads];
    let tries = 0;
    while (this.pads.length < big.length + (portrait ? 9 : 14) && tries++ < 400) {
      const R = 2.6 + Math.pow(r(), 1.5) * 4.5;
      const x = pond.cx + (r() - 0.5) * 2 * pond.rx;
      const z = pond.cz + (r() - 0.5) * 2 * pond.rz;
      if (!inside(pond, x, z, 0.82 - R / Math.min(pond.rx, pond.rz) * 0.6)) continue;
      if (this.pads.some(p => Math.hypot(p.x - x, p.z - z) < p.r + R + (p.card ? 4 : 1))) continue;
      const pad = this.addPad(x, z, R, r);
      if (R > 4.2 && r() < 0.55) this.addLily(x + (r() - 0.5) * R * 0.6, z + (r() - 0.5) * R * 0.6, 0.8 + r() * 0.35, r, pad);
    }
    // and a couple floating free
    for (let i = 0; i < (portrait ? 1 : 2); i++) {
      for (let k = 0; k < 60; k++) {
        const x = pond.cx + (r() - 0.5) * 2 * pond.rx;
        const z = pond.cz + (r() - 0.5) * 2 * pond.rz;
        if (!inside(pond, x, z, 0.75) || this.pads.some(p => Math.hypot(p.x - x, p.z - z) < p.r + 4)) continue;
        this.addLily(x, z, 0.75, r);
        break;
      }
    }
  }

  private addPad(x: number, z: number, R: number, r: () => number) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(padGeometry(0.2 + r() * 0.14), this.padMats[Math.floor(r() * this.padMats.length)]);
    mesh.scale.set(R, R / 15, R);
    mesh.rotation.y = r() * Math.PI * 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    group.position.set(x, 0.7, z);
    this.scene.add(group);
    const pad: Pad = { group, x, z, r: R, phase: r() * Math.PI * 2, hover: 0, lift: 0 };
    this.pads.push(pad);
    return pad;
  }

  private addLily(x: number, z: number, s: number, r: () => number, pad?: Pad) {
    const m = new THREE.Mesh(this.lily, this.lilyMat);
    m.scale.setScalar(s);
    m.rotation.y = r() * Math.PI * 2;
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    this.lilies.push({ mesh: m, pad, x, z, phase: r() * 6 });
  }

  update(ph: number, dt: number, world: TableWorld) {
    if (!this.cardTex.length) return;
    const portrait = world.aspect < 0.8;
    if (portrait !== this.portrait) this.layout(portrait, world);
    this.group.visible = (ph > -1 && ph < 2) || world.current === 'outro';
    if (!this.group.visible) return;
    this.t += dt;
    const t = this.t;
    const wind = sunUniforms.uWind.value;

    let bigIndex = 0;
    for (const pad of this.pads) {
      // riding the ripples; dipping under a finger
      pad.lift = damp(pad.lift, pad.hover, 7, dt);
      const bob = Math.sin(t * 0.9 + pad.phase) * 0.06;
      const drift = Math.sin(t * 0.21 + pad.phase) * 0.35;
      const g = pad.group;
      g.position.set(pad.x + wind.x * drift * 0.3, 0.7 + bob - pad.lift * 0.18, pad.z + wind.y * drift * 0.3);
      // rocking, but never so far that an edge dips under the surface
      const rock = 0.12 / pad.r;
      g.rotation.set(Math.sin(t * 0.7 + pad.phase) * rock, Math.sin(t * 0.15 + pad.phase) * 0.06, Math.cos(t * 0.8 + pad.phase) * rock);
      if (pad.card) {
        const c = pad.card.group;
        c.position.set(0, 0.75 + pad.lift * 0.72, 0);
        c.rotation.set(0, (pad.cardRot ?? 0) + pad.lift * 0.03, 0);
        pad.card.uniforms.uBow.value = pad.lift * 0.05;
        // tell the water how hard this one is rocking
        waterUniforms.uPads.value[bigIndex++].set(pad.x, pad.z, 0.15 + pad.lift * 0.9, 0);
      }
    }
    for (const l of this.lilies) {
      const base = l.pad ? l.pad.group.position : new THREE.Vector3(l.x, 0.55, l.z);
      l.mesh.position.set(base.x + (l.pad ? l.x - l.pad.x : 0), base.y + 0.25 + Math.sin(t * 1.1 + l.phase) * 0.05, base.z + (l.pad ? l.z - l.pad.z : 0));
    }

    // now and then something touches the water
    if (!world.reduced && t > this.nextDrop) {
      const p = this.pond;
      for (let k = 0; k < 20; k++) {
        const x = p.cx + (Math.random() - 0.5) * 2 * p.rx;
        const z = p.cz + (Math.random() - 0.5) * 2 * p.rz;
        if (!inside(p, x, z, 0.8) || this.pads.some(q => Math.hypot(q.x - x, q.z - z) < q.r + 1)) continue;
        waterUniforms.uDrops.value[this.drop++ % 3].set(x, z, sunUniforms.uTime.value);
        break;
      }
      this.nextDrop = t + 0.9 + Math.random() * 2.2;
    }
  }
}
