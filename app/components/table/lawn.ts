import * as THREE from 'three';
import { WIND, sunUniforms, withSun } from './light';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from './util';

/*
 * The lawn the day is laid out on: long, bushy grass in tussocks, combed every which way, darker
 * in the hollows between them and yellowing at the tips, with gusts rolling across it as paler
 * waves where the strands lie over. In it, little flowers and pebbles, nodding in the same gusts.
 *
 * The flowers and pebbles live in one patch that follows the camera: each sits at a fixed spot of
 * the world, wrapped round the view, so the lawn looks endless at the cost of one view's worth of
 * them. They're drawn straight after the ground and leave the depth alone, so whatever is laid on
 * the grass (paper, the ukulele) always lies on top of it, never pierced.
 */

/** Draw order, below everything (0) that's laid on the grass. */
const ORDER = { ground: -10, shade: -9.5, pebbles: -9, flowers: -7 };

/** The patch of the world the flowers and pebbles cover, round the camera: a wide view sees up to ~240 × 150 cm. */
const PATCH_WIDE = new THREE.Vector2(330, 250);
const PATCH_TALL = new THREE.Vector2(180, 260);

const uniforms = { uPatch: { value: PATCH_WIDE.clone() } };

/* ------------------------------------------------------------------------ */
/*  The grass                                                                */
/* ------------------------------------------------------------------------ */

/*
 * Long, bushy grass, drawn as shells: the sward is sliced into layers from the tips down to the
 * roots, and each layer holds fewer strands the higher it is, every one shifted a little further
 * along its lean. Stacked, the slices are strands. Rather than drawing the layers as planes, the
 * ground's own shader steps down through them for each pixel, front to back, until the strands
 * cover it, so the light, the leaves' dapple and the shadows are worked out once, not once a layer.
 */

/** Strands per cm (one in each little cell), how far a long one reaches as it leans, and the sward's depth, all in cm. */
const DENS = 7;
const REACH = 6;
const DEPTH = 3.4;
const STRAND_PX = 256;
/** The tussocks, painted once into a field that repeats every FIELD_CM. */
const FIELD_CM = 150;
const FIELD_PX = 256;
/** Layers marched per pixel: thinned if the frames run slow. */
const MAX_LAYERS = 48;

const num = (n: number) => n.toFixed(4);
const lin = (hex: string) => {
  const c = new THREE.Color(hex);
  return `vec3(${num(c.r)}, ${num(c.g)}, ${num(c.b)})`;
};

/** One texel a strand: its height, where it sits in its cell, and its tone. */
function strandTexture() {
  const r = rng(4217);
  const data = new Uint8Array(STRAND_PX * STRAND_PX * 4);
  for (let i = 0; i < STRAND_PX * STRAND_PX; i++) {
    // a few gaps, plenty of shorter undergrowth, and the long ones over it
    const h = r() < 0.05 ? 0 : 0.3 + 0.7 * Math.pow(r(), 0.6);
    data.set([h * 255, r() * 255, r() * 255, r() * 255], i * 4);
  }
  const t = new THREE.DataTexture(data, STRAND_PX, STRAND_PX);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/** Value noise that wraps round a FIELD_PX square, with `n` lattice cells across it. */
function tileNoise(n: number, seed: number) {
  const r = rng(seed);
  const v = Float32Array.from({ length: n * n }, () => r());
  const at = (i: number, j: number) => v[(((j % n) + n) % n) * n + (((i % n) + n) % n)];
  return (x: number, y: number) => {
    const fx = (x / FIELD_PX) * n;
    const fy = (y / FIELD_PX) * n;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = THREE.MathUtils.smootherstep(fx - i, 0, 1);
    const w = THREE.MathUtils.smootherstep(fy - j, 0, 1);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u;
    return a + (b - a) * w;
  };
}

/**
 * The tussocks: grass this long grows in soft clumps, the strands falling away off each one and
 * swirling where the wind has had them, with hollows between. R is the height of the sward, GB
 * its lean (direction × amount), A lushness.
 */
function fieldTexture() {
  const N = FIELD_PX;
  const swirl = tileNoise(4, 14);
  const flop = tileNoise(9, 15);
  const lush = tileNoise(5, 16);
  // the clumps: soft mounds scattered at random (no lattice, so no straight partings), big and small
  const r = rng(11);
  const mounds = Array.from({ length: 210 }, () => ({ x: r() * N, y: r() * N, s: (3 + r() * 5) * (N / FIELD_CM), k: 0.45 + r() * 0.55 }));
  const sum = new Float32Array(N * N);
  for (const m of mounds) {
    const reach = Math.ceil(m.s * 2.6);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = (((Math.round(m.x) + dx) % N) + N) % N;
        const y = (((Math.round(m.y) + dy) % N) + N) % N;
        const ex = Math.round(m.x) + dx - m.x;
        const ey = Math.round(m.y) + dy - m.y;
        sum[y * N + x] += m.k * Math.exp(-(ex * ex + ey * ey) / (2 * m.s * m.s));
      }
    }
  }
  const height = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) height[i] = 0.36 + 0.64 * THREE.MathUtils.smoothstep(sum[i], 0.06, 0.9);
  const H = (x: number, y: number) => height[(((y % N) + N) % N) * N + (((x % N) + N) % N)];
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // downhill, off the clump, and round with the swirl of the wind that combed it
      const gx = H(x - 2, y) - H(x + 2, y);
      const gy = H(x, y - 2) - H(x, y + 2);
      const g = Math.hypot(gx, gy) || 1e-6;
      const a = swirl(x, y) * Math.PI * 2.4;
      const fall = THREE.MathUtils.smoothstep(g, 0, 0.12);
      let lx = (gx / g) * fall * 1.2 + Math.cos(a) * 0.65;
      let ly = (gy / g) * fall * 1.2 + Math.sin(a) * 0.65;
      const l = Math.hypot(lx, ly) || 1;
      const lean = 0.42 + 0.48 * flop(x, y) + 0.1 * fall;
      lx = (lx / l) * lean;
      ly = (ly / l) * lean;
      data.set([H(x, y) * 255, (lx * 0.5 + 0.5) * 255, (ly * 0.5 + 0.5) * 255, lush(x, y) * 255], (y * N + x) * 4);
    }
  }
  const t = new THREE.DataTexture(data, N, N);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

const grass = {
  uStrands: { value: null as THREE.Texture | null },
  uField: { value: null as THREE.Texture | null },
  uLayers: { value: 40 },
};

const SWARD = /* glsl */ `
uniform sampler2D uStrands;
uniform sampler2D uField;
uniform float uLayers;
float groundH(vec2 p){
  // a lawn is never flat: low rises and hollows under the grass
  return (gNoise(p * .05) - .5) * 1.1;
}
`;

const MARCH = /* glsl */ `
{
  vec2 wp = vTWorld.xz;
  vec4 fld = texture2D(uField, wp / ${num(FIELD_CM)});
  float top = fld.r;
  vec2 lean = (fld.gb * 2. - 1.) * ${num(REACH)};
  // a gust lays the strands over downwind, their tips most, and they never quite stop stirring
  float g = windGust(wp);
  vec2 wd = normalize(uWind);
  float bend = .08 + .72 * smoothstep(.35, .85, g) + .07 * sin(uTime * 2.6 + dot(wp, vec2(.37, .29)));
  vec2 blow = wd * bend * ${num(REACH * 0.55)};
  // seen at a slant towards the frame's edges, the tips stand off their roots
  vec3 ray = normalize(vTWorld - cameraPosition);
  vec2 par = ray.xz / max(-ray.y, .25) * ${num(DEPTH)};
  // a pixel, in cells: the strands' edges are softened by that much
  float px = length(fwidth(wp)) * ${num(DENS)};

  // the same spacing everywhere, so the slices never jump where the sward's depth changes; and
  // fewer of them when the camera's pulled back and a strand is thinner than a pixel
  float dh = 1. / (uLayers * clamp(.9 / px, .35, 1.));
  float n = ceil(top / dh);
  // a slice of a leaning strand is drawn out along its lean, so the slices meet
  vec2 slope = lean + blow * top * 2. + par;
  float run = length(slope) * ${num(DENS)} * dh;
  vec2 ax = slope / max(length(slope), 1e-4);
  vec2 side = vec2(-ax.y, ax.x);
  float h = top - dh * gHash(gl_FragCoord.xy);

  vec3 col = vec3(0.);
  float a = 0.;
  for (int i = 0; i < ${MAX_LAYERS}; i++) {
    if (float(i) >= n || a > .95) break;
    // whichever strand passes through this pixel at height h is rooted back along its lean
    vec2 cp = (wp - (par + lean + blow * h) * h) * ${num(DENS)};
    vec2 cell = floor(cp);
    vec4 s = texture2D(uStrands, (cell + .5) / ${num(STRAND_PX)});
    float H = s.r * top;
    if (H > h) {
      vec2 q = fract(cp) - (.3 + .4 * s.gb);
      float u = h / H;
      float rad = .27 * (1. - .7 * u);
      vec2 e = vec2(dot(q, ax) * rad / (rad + run * .5), dot(q, side));
      float cov = 1. - smoothstep(rad - px * .5, rad + px * .5, length(e));
      // darker down in the sward, yellowing to the tips; some strands bluer, a few gone to straw
      vec3 tip = mix(${lin('#c3cc58')}, ${lin('#d4c878')}, step(.9, s.a));
      vec3 c = mix(${lin('#3b5a1c')}, mix(${lin('#6f9030')}, ${lin('#5e8a3c')}, s.a), smoothstep(.0, .5, u));
      c = mix(c, tip, smoothstep(.45, 1., u));
      // a strand's spine catches the light
      c *= 1. + .35 * (1. - smoothstep(.0, rad, abs(e.y))) * u;
      c *= mix(.2, 1., pow(smoothstep(.0, .95, h), 1.3)) * (.72 + .5 * fract(s.a * 7.31));
      // and a gust shows the pale undersides
      c *= 1. + .25 * smoothstep(.5, .85, g) * u;
      col += (1. - a) * cov * c;
      a += (1. - a) * cov;
    }
    h -= dh;
  }
  col += (1. - a) * ${lin('#1e2a12')};
  // lusher and deeper in some clumps and patches, sun-dried in others
  float lush = gNoise(wp * .011 + 2.) * .6 + fld.a * .4;
  col *= mix(vec3(.86, .94, .84), vec3(1.08, 1.05, .86), smoothstep(.3, .72, lush));
  diffuseColor.rgb *= col;
}`;

function makeGround(size: { w: number; h: number; cx: number; cz: number }, layers: number) {
  grass.uStrands.value = strandTexture();
  grass.uField.value = fieldTexture();
  grass.uLayers.value = layers;
  const material = withSun(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }), 'lawn', shader => {
    Object.assign(shader.uniforms, grass);
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `${SWARD}\nvoid main() {`).replace('#include <map_fragment>', MARCH).replace(
      '#include <normal_fragment_maps>',
      /* glsl */ `#include <normal_fragment_maps>
        {
          // lit as the tussocks are shaped: mounds catch the sun on one side
          vec2 p = vTWorld.xz;
          float e = .7;
          float k = ${num(DEPTH * 1.1)};
          float hx = (texture2D(uField, (p + vec2(e, 0.)) / ${num(FIELD_CM)}).r - texture2D(uField, (p - vec2(e, 0.)) / ${num(FIELD_CM)}).r) * k + groundH(p + vec2(e, 0.)) - groundH(p - vec2(e, 0.));
          float hz = (texture2D(uField, (p + vec2(0., e)) / ${num(FIELD_CM)}).r - texture2D(uField, (p - vec2(0., e)) / ${num(FIELD_CM)}).r) * k + groundH(p + vec2(0., e)) - groundH(p - vec2(0., e));
          vec3 nW = normalize(vec3(-hx / (2. * e), 1., -hz / (2. * e)));
          normal = normalize((viewMatrix * vec4(nW, 0.)).xyz);
        }`,
    );
  });
  const geo = new THREE.PlaneGeometry(size.w, size.h);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(size.cx, 0, size.cz);
  mesh.receiveShadow = true;
  mesh.renderOrder = ORDER.ground;
  return mesh;
}

/* ------------------------------------------------------------------------ */
/*  The patch round the camera                                               */
/* ------------------------------------------------------------------------ */

/** Where an instance at normalised spot aSpot.xy sits: its fixed place in the world, wrapped to the patch round the view. */
const PLACE = /* glsl */ `
uniform vec2 uPatch;
uniform vec4 uView;
vec2 placeIn(vec2 spot){
  vec2 c = uView.xy;
  return c + (fract(spot - c / uPatch + .5) - .5) * uPatch;
}
`;

/** Patch a material's vertex shader: WIND + PLACE + declarations up top, `body` sets `transformed` (and may set `objectNormal`). */
function sway<M extends THREE.Material>(material: M, key: string, decl: string, body: string, normal = '', frag?: (f: string) => string, vert?: (v: string) => string) {
  return withSun(material, key, shader => {
    Object.assign(shader.uniforms, uniforms, { uView: sunUniforms.uView });
    shader.vertexShader = (WIND + PLACE + decl + shader.vertexShader)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${normal}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${body}`);
    if (vert) shader.vertexShader = vert(shader.vertexShader);
    if (frag) shader.fragmentShader = frag(shader.fragmentShader);
  });
}

function instanced(base: THREE.BufferGeometry, n: number, attrs: Record<string, [Float32Array, number]>) {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const [name, a] of Object.entries(base.attributes)) g.setAttribute(name, a);
  for (const [name, [data, size]] of Object.entries(attrs)) g.setAttribute(name, new THREE.InstancedBufferAttribute(data, size));
  g.instanceCount = n;
  return g;
}

function decor(geo: THREE.BufferGeometry, material: THREE.Material, order: number) {
  const m = new THREE.Mesh(geo, material);
  // placed in the shader, round the camera: always in view, never in the way of a click
  m.frustumCulled = false;
  m.renderOrder = order;
  m.receiveShadow = true;
  m.raycast = () => {};
  // and leaves the depth to the ground, so anything laid on the lawn covers it
  material.depthWrite = false;
  return m;
}

/* ---- flowers ---- */

const KINDS = [
  // daisy, buttercup, clover, speedwell: share of the meadow, and size in cm
  { share: 0.44, size: [1.5, 2.3] },
  { share: 0.24, size: [1, 1.5] },
  { share: 0.2, size: [1.2, 1.6] },
  { share: 0.12, size: [0.6, 0.9] },
];

function paintFlowers() {
  const C = 128;
  const c = document.createElement('canvas');
  c.width = C * 4;
  c.height = C;
  const g = c.getContext('2d')!;
  const r = rng(12);
  const petal = (cx: number, cy: number, a: number, len: number, wid: number, fill: string | CanvasGradient) => {
    g.save();
    g.translate(cx, cy);
    g.rotate(a);
    g.fillStyle = fill;
    g.beginPath();
    g.ellipse(0, -len / 2, wid, len / 2, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };

  // daisy: a ring of white rays, pink at the tips, round a golden button
  {
    const cx = C / 2;
    const cy = C / 2;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + (r() - 0.5) * 0.1;
      const grad = g.createLinearGradient(cx, cy, cx + Math.sin(a) * 60, cy - Math.cos(a) * 60);
      grad.addColorStop(0, '#fbfbf4');
      grad.addColorStop(0.8, '#fbf6f2');
      grad.addColorStop(1, '#f0c4cc');
      petal(cx, cy, a, 54 + r() * 8, 6.5, grad);
    }
    const b = g.createRadialGradient(cx - 3, cy - 3, 0, cx, cy, 15);
    b.addColorStop(0, '#ffd84a');
    b.addColorStop(1, '#d99a14');
    g.fillStyle = b;
    g.beginPath();
    g.arc(cx, cy, 15, 0, Math.PI * 2);
    g.fill();
  }
  // buttercup: five glossy cupped petals
  {
    const cx = C + C / 2;
    const cy = C / 2;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const grad = g.createRadialGradient(cx, cy, 4, cx, cy, 58);
      grad.addColorStop(0, '#f2b400');
      grad.addColorStop(0.7, '#ffd526');
      grad.addColorStop(1, '#ffe46a');
      g.save();
      g.translate(cx, cy);
      g.rotate(a);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, -30, 28, 0, Math.PI * 2);
      g.fill();
      // the shine buttercups are known for
      g.fillStyle = 'rgba(255,255,235,0.55)';
      g.beginPath();
      g.ellipse(-6, -38, 8, 5, -0.4, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.fillStyle = '#c98a00';
    g.beginPath();
    g.arc(cx, cy, 10, 0, Math.PI * 2);
    g.fill();
  }
  // clover: a round head of little pinkish florets
  {
    const cx = C * 2 + C / 2;
    const cy = C / 2;
    for (let i = 0; i < 120; i++) {
      const rad = Math.sqrt(r()) * 50;
      const a = r() * Math.PI * 2;
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      const f = rad / 50;
      g.fillStyle = `hsl(${330 + r() * 20} ${30 + f * 30}% ${92 - f * 18}%)`;
      g.beginPath();
      g.ellipse(x, y, 7, 4, a, 0, Math.PI * 2);
      g.fill();
    }
  }
  // speedwell: four sky-blue petals, veined, with a white eye
  {
    const cx = C * 3 + C / 2;
    const cy = C / 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.2;
      g.save();
      g.translate(cx, cy);
      g.rotate(a);
      g.fillStyle = i === 0 ? '#7f9be8' : '#5f7fdc';
      g.beginPath();
      g.arc(0, -28, i === 0 ? 24 : 28, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(40,50,140,0.5)';
      g.lineWidth = 2;
      for (const v of [-0.3, 0, 0.3]) {
        g.beginPath();
        g.moveTo(0, -8);
        g.lineTo(Math.sin(v) * 40, -8 - Math.cos(v) * 40);
        g.stroke();
      }
      g.restore();
    }
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(cx, cy, 9, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function makeFlowers(n: number, renderer: THREE.WebGLRenderer) {
  const r = rng(5);
  const spot = new Float32Array(n * 4);
  const head = new Float32Array(n * 2);
  // in little drifts, as they come up in a lawn
  let i = 0;
  while (i < n) {
    const cx = r();
    const cy = r();
    const roll = r();
    let kind = 0;
    for (let acc = 0; kind < KINDS.length - 1 && roll > (acc += KINDS[kind].share); kind++);
    const m = Math.min(n - i, 2 + Math.floor(r() * 7));
    for (let j = 0; j < m; j++, i++) {
      const [a, b] = KINDS[kind].size;
      spot.set([cx + (r() - 0.5) * 0.03, cy + (r() - 0.5) * 0.03, r() * Math.PI * 2, a + r() * (b - a)], i * 4);
      head.set([kind, 2.6 + r() * 2.2], i * 2);
    }
  }
  const tex = new THREE.CanvasTexture(paintFlowers());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const quad = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const geo = instanced(quad, n, { aSpot: [spot, 4], aHead: [head, 2] });
  const material = sway(
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, alphaTest: 0.5, side: THREE.DoubleSide }),
    'flowers',
    `attribute vec4 aSpot;\nattribute vec2 aHead;\n`,
    /* glsl */ `
    vec2 base = placeIn(aSpot.xy);
    float c = cos(aSpot.z), s = sin(aSpot.z);
    vec3 p = position * aSpot.w;
    p.xz = mat2(c, -s, s, c) * p.xz;
    // the head nods downwind on its stem, and bobs
    float g = windGust(base);
    float bend = .15 + smoothstep(.35, .8, g) * .9;
    vec2 nod = normalize(uWind) * bend * aHead.y * .45 + vec2(sin(uTime * 2.1 + aSpot.z * 9.), cos(uTime * 1.7 + aSpot.z * 7.)) * .08 * aHead.y;
    p.y += dot(p.xz, normalize(uWind)) * bend * .25;
    transformed = vec3(base.x + p.x + nod.x, aHead.y + p.y, base.y + p.z + nod.y);`,
    '',
    undefined,
    // each kind of flower is a cell of the one painted sheet
    v => v.replace('#include <uv_vertex>', '#include <uv_vertex>\n  vMapUv = vec2((vMapUv.x + aHead.x) * .25, vMapUv.y);'),
  );
  return decor(geo, material, ORDER.flowers);
}

/* ---- pebbles ---- */

function pebbleGeometry() {
  const ico = new THREE.IcosahedronGeometry(1, 1);
  ico.deleteAttribute('uv');
  ico.deleteAttribute('normal');
  const g = mergeVertices(ico);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  // smooth river stones, a little irregular
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + Math.sin(v.x * 3.1 + 1) * 0.06 + Math.sin(v.z * 2.7 + v.y * 2) * 0.05;
    v.multiplyScalar(n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const STONE = ['#a19b90', '#8a867e', '#b5ad9d', '#7a736a', '#c6c0b3', '#968b7b', '#6f6e6a'];

function makePebbles(n: number) {
  const r = rng(33);
  const spot = new Float32Array(n * 4);
  const scale = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const c = new THREE.Color();
  let i = 0;
  while (i < n) {
    const cx = r();
    const cy = r();
    const m = Math.min(n - i, r() < 0.5 ? 1 : 2 + Math.floor(r() * 5));
    for (let j = 0; j < m; j++, i++) {
      const size = 0.3 + Math.pow(r(), 2) * 0.95;
      spot.set([cx + (r() - 0.5) * 0.02, cy + (r() - 0.5) * 0.02, r() * Math.PI * 2, 0], i * 4);
      scale.set([size * (0.9 + r() * 0.5), size * (0.26 + r() * 0.14), size * (0.6 + r() * 0.35)], i * 3);
      c.set(STONE[Math.floor(r() * STONE.length)]).toArray(col, i * 3);
    }
  }
  const geo = instanced(pebbleGeometry(), n, { aSpot: [spot, 4], aScale: [scale, 3], aCol: [col, 3] });
  const material = sway(
    new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 }),
    'pebbles',
    `attribute vec4 aSpot;\nattribute vec3 aScale;\nattribute vec3 aCol;\nvarying vec3 vCol;\n`,
    /* glsl */ `
    vec2 base = placeIn(aSpot.xy);
    float c = cos(aSpot.z), s = sin(aSpot.z);
    vec3 p = position * aScale;
    p.xz = mat2(c, -s, s, c) * p.xz;
    // half sunk in the turf
    transformed = vec3(base.x + p.x, p.y + aScale.y * .25, base.y + p.z);
    vCol = aCol;`,
    /* glsl */ `
    {
      float c = cos(aSpot.z), s = sin(aSpot.z);
      objectNormal = normalize(objectNormal / aScale);
      objectNormal.xz = mat2(c, -s, s, c) * objectNormal.xz;
    }`,
    f =>
      `varying vec3 vCol;\n` +
      f.replace(
        '#include <color_fragment>',
        // speckled, like granite and sandstone, and darker where they meet the grass
        `#include <color_fragment>\n  diffuseColor.rgb *= vCol * (.86 + .28 * gNoise(vTWorld.xz * 11. + vTWorld.y * 5.)) * mix(.55, 1., smoothstep(.0, .5, vTWorld.y));`,
      ),
  );
  const pebbles = decor(geo, material, ORDER.pebbles);

  // and a soft shade under each, where it sits in the turf: multiplied into the grass, but kept in
  // the opaque pass so whatever lies on the lawn still covers it
  const shadeMat = new THREE.MeshBasicMaterial({ blending: THREE.MultiplyBlending, premultipliedAlpha: true, toneMapped: false });
  shadeMat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms, { uView: sunUniforms.uView });
    shader.vertexShader = (PLACE + `attribute vec4 aSpot;\nattribute vec3 aScale;\nvarying vec2 vShade;\n` + shader.vertexShader).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec2 base = placeIn(aSpot.xy);
      float c = cos(aSpot.z), s = sin(aSpot.z);
      vec3 p = position * vec3(aScale.x, 1., aScale.z) * 1.9;
      p.xz = mat2(c, -s, s, c) * p.xz;
      transformed = vec3(base.x + p.x, .25, base.y + p.z);
      vShade = position.xz;`,
    );
    shader.fragmentShader = ('varying vec2 vShade;\n' + shader.fragmentShader).replace(
      '#include <map_fragment>',
      'diffuseColor.rgb = vec3(mix(.12, 1., smoothstep(.5, 1., length(vShade))));',
    );
  };
  shadeMat.customProgramCacheKey = () => 'pebble-shade';
  const shade = decor(instanced(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), n, { aSpot: [spot, 4], aScale: [scale, 3] }), shadeMat, ORDER.shade);
  shade.receiveShadow = false;
  const group = new THREE.Group();
  group.add(shade, pebbles);
  return group;
}

/* ------------------------------------------------------------------------ */

export function makeLawn(renderer: THREE.WebGLRenderer, size: { w: number; h: number; cx: number; cz: number }) {
  const group = new THREE.Group();
  // a phone draws a smaller patch, so it gets fewer of everything for the same density, and
  // fewer layers of grass to start from
  const small = matchMedia('(pointer: coarse)').matches;
  group.add(makeGround(size, small ? 24 : 40), makePebbles(small ? 70 : 140), makeFlowers(small ? 230 : 440, renderer));
  let slow = 0;
  return {
    group,
    /** Told how long each drawn frame took (ms): a run of slow ones thins the grass's layers. */
    pace(ms: number) {
      if (ms > 120) return;
      slow = slow * 0.95 + (ms > 24 ? 0.05 : 0);
      if (slow > 0.5 && grass.uLayers.value > 16) {
        grass.uLayers.value -= 4;
        slow = 0;
      }
    },
    /** Fit the patch to the shape of the screen. */
    setAspect(aspect: number) {
      uniforms.uPatch.value.copy(aspect < 0.8 ? PATCH_TALL : PATCH_WIDE);
    },
  };
}
