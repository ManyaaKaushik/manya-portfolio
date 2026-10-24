import * as THREE from 'three';
import { WIND, sunUniforms, withSun } from './light';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from './util';

/*
 * The lawn the day is laid out on. The ground is a painted tile of grass seen from above, tufts
 * of blades in layers from the shaded depths to the tips in the sun, sampled twice at different
 * scales so it never shows a repeat, with lusher and sun-dried patches. Over it, clumps of long
 * blades arching over, little flowers and pebbles, all leaning a little in the same slow breeze.
 *
 * The blades, flowers and pebbles live in one patch that follows the camera: each sits at a fixed
 * spot of the world, wrapped round the view, so the lawn looks endless at the cost of one view's
 * worth of grass. All of the lawn is drawn at the very back of the depth range: among themselves
 * the blades overlap properly, but whatever is laid on the grass (paper, the ukulele) always lies
 * on top of them, never pierced.
 */

const TILE_CM = 32;
const TILE_PX = 1024;

/** Draw order, below everything (0) that's laid on the grass. */
const ORDER = { ground: -10, shade: -9.5, bladeShadows: -9.2, pebbles: -9, blades: -8, flowers: -7 };

/** The patch of the world the blades, flowers and pebbles cover, round the camera: a wide view sees up to ~240 × 150 cm. */
const PATCH_WIDE = new THREE.Vector2(330, 250);
const PATCH_TALL = new THREE.Vector2(180, 260);

/** A clearing nothing grows in (the pond): centre xz and radii, or zero radii for none. */
export const lawnHole = new THREE.Vector4();

const uniforms = { uPatch: { value: PATCH_WIDE.clone() }, uHole: { value: lawnHole } };

/** Squeezes a lawn vertex's depth into the back tenth of the range: still ordered among the lawn, behind all else. */
const BEHIND = /* glsl */ `
  gl_Position.z = gl_Position.z * .1 + gl_Position.w * .9;
`;
const behind = (v: string) => v.replace('#include <project_vertex>', `#include <project_vertex>\n${BEHIND}`);

/* ------------------------------------------------------------------------ */
/*  The ground                                                               */
/* ------------------------------------------------------------------------ */

function paintTile() {
  const c = document.createElement('canvas');
  c.width = c.height = TILE_PX;
  const ctx = c.getContext('2d')!;
  const r = rng(4217);
  const k = TILE_PX / TILE_CM;
  const wrapped = (x: number, y: number, reach: number, draw: (x: number, y: number) => void) => {
    const xs = [x, ...(x < reach ? [x + TILE_PX] : x > TILE_PX - reach ? [x - TILE_PX] : [])];
    const ys = [y, ...(y < reach ? [y + TILE_PX] : y > TILE_PX - reach ? [y - TILE_PX] : [])];
    for (const X of xs) for (const Y of ys) draw(X, Y);
  };

  // the shade and thatch down at the roots
  ctx.fillStyle = '#22341a';
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
  for (let i = 0; i < 90; i++) {
    const x = r() * TILE_PX;
    const y = r() * TILE_PX;
    const rad = (1.5 + r() * 5) * k;
    const dry = r() < 0.35;
    wrapped(x, y, rad, (X, Y) => {
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, rad);
      g.addColorStop(0, dry ? 'rgba(96,84,44,0.35)' : 'rgba(12,26,8,0.4)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(X - rad, Y - rad, rad * 2, rad * 2);
    });
  }

  // one blade seen from above: a leaf tapering to its tip, arched, and paler towards the tip
  const blade = (g: CanvasRenderingContext2D, x: number, y: number, len: number, wid: number, a: number, bow: number, base: string, tip: string | null) => {
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const nx = -dy;
    const ny = dx;
    const tx = x + dx * len + nx * bow;
    const ty = y + dy * len + ny * bow;
    const mx = x + dx * len * 0.5 + nx * bow * 0.75;
    const my = y + dy * len * 0.5 + ny * bow * 0.75;
    if (tip) {
      const grad = g.createLinearGradient(x, y, tx, ty);
      grad.addColorStop(0, base);
      grad.addColorStop(1, tip);
      g.fillStyle = grad;
    } else g.fillStyle = base;
    g.beginPath();
    g.moveTo(x + nx * wid, y + ny * wid);
    g.quadraticCurveTo(mx + nx * wid * 0.7, my + ny * wid * 0.7, tx, ty);
    g.quadraticCurveTo(mx - nx * wid * 0.7, my - ny * wid * 0.7, x - nx * wid, y - ny * wid);
    g.fill();
  };
  const hsl = (h: [number, number], s: [number, number], l: [number, number], dl = 0, dh = 0) =>
    `hsl(${h[0] + r() * (h[1] - h[0]) + dh} ${s[0] + r() * (s[1] - s[0])}% ${l[0] + r() * (l[1] - l[0]) + dl}%)`;

  // the grass in layers, each a sheet of its own so it can cast a soft shade on the one below:
  // short and dark down in the sward, longer and sunlit in tufts on top
  const layers = [
    { tufts: 1300, per: [3, 7], h: [96, 112], s: [32, 42], l: [15, 21], len: [0.7, 1.5], wid: [0.05, 0.09], tip: 6, shade: 0 },
    { tufts: 900, per: [4, 9], h: [90, 106], s: [36, 48], l: [21, 28], len: [1.1, 2.3], wid: [0.06, 0.1], tip: 9, shade: 0.45 },
    { tufts: 650, per: [5, 10], h: [84, 98], s: [40, 52], l: [28, 36], len: [1.3, 2.7], wid: [0.06, 0.11], tip: 12, shade: 0.5 },
    { tufts: 380, per: [5, 11], h: [76, 92], s: [42, 54], l: [36, 44], len: [1.4, 3], wid: [0.06, 0.11], tip: 15, shade: 0.55 },
  ];
  const sheet = document.createElement('canvas');
  sheet.width = sheet.height = TILE_PX;
  const sg = sheet.getContext('2d')!;
  for (const L of layers) {
    sg.clearRect(0, 0, TILE_PX, TILE_PX);
    for (let t = 0; t < L.tufts; t++) {
      // a tuft: blades fanning out from one crown, most of them leaning the same way
      const cx = r() * TILE_PX;
      const cy = r() * TILE_PX;
      const lean = r() * Math.PI * 2;
      const fan = 0.35 + r() * 0.9;
      const curl = (r() - 0.5) * 0.6;
      const n = L.per[0] + Math.floor(r() * (L.per[1] - L.per[0] + 1));
      for (let j = 0; j < n; j++) {
        const len = (L.len[0] + r() * (L.len[1] - L.len[0])) * k;
        const wid = (L.wid[0] + r() * (L.wid[1] - L.wid[0])) * k;
        const a = lean + (r() - 0.5) * fan;
        // and they all bow the same way, as a clump falls open
        const bow = (curl + (r() - 0.5) * 0.25) * len;
        const ox = (r() - 0.5) * 0.3 * k;
        const oy = (r() - 0.5) * 0.3 * k;
        const base = hsl(L.h as [number, number], L.s as [number, number], L.l as [number, number]);
        const tip = hsl(L.h as [number, number], L.s as [number, number], L.l as [number, number], L.tip, -8);
        wrapped(cx + ox, cy + oy, len + wid, (X, Y) => blade(sg, X, Y, len, wid, a, bow, base, tip));
      }
    }
    // a few blades on each layer gone to straw
    for (let i = 0; i < 70; i++) {
      const x = r() * TILE_PX;
      const y = r() * TILE_PX;
      const len = (0.8 + r() * 1.3) * k;
      const wid = (0.04 + r() * 0.04) * k;
      const a = r() * Math.PI * 2;
      const bow = (r() - 0.5) * len * 0.3;
      wrapped(x, y, len + wid, (X, Y) => blade(sg, X, Y, len, wid, a, bow, hsl([44, 54], [26, 36], [34, 42]), hsl([44, 54], [28, 38], [50, 58])));
    }
    if (L.shade) {
      ctx.save();
      ctx.shadowColor = `rgba(8,18,4,${L.shade})`;
      ctx.shadowBlur = 0.25 * k;
      ctx.shadowOffsetX = 0.08 * k;
      ctx.shadowOffsetY = 0.12 * k;
      // the shade wraps round the tile's edges as the blades do
      for (const dx of [-TILE_PX, 0, TILE_PX]) for (const dy of [-TILE_PX, 0, TILE_PX]) ctx.drawImage(sheet, dx, dy);
      ctx.restore();
    } else ctx.drawImage(sheet, 0, 0);
  }

  // clover, in little colonies down among the blades
  for (let i = 0; i < 18; i++) {
    const cx = r() * TILE_PX;
    const cy = r() * TILE_PX;
    const n = 3 + Math.floor(r() * 8);
    for (let j = 0; j < n; j++) {
      const x = cx + (r() - 0.5) * 3.5 * k;
      const y = cy + (r() - 0.5) * 3.5 * k;
      const s = (0.2 + r() * 0.12) * k;
      const rot = r() * Math.PI * 2;
      const tone = `hsl(${104 + r() * 14} ${30 + r() * 10}% ${26 + r() * 8}%)`;
      wrapped(x, y, s * 2.4, (X, Y) => {
        for (let q = 0; q < 3; q++) {
          const a = rot + (q / 3) * Math.PI * 2;
          const px = X + Math.cos(a) * s;
          const py = Y + Math.sin(a) * s;
          ctx.fillStyle = tone;
          ctx.beginPath();
          ctx.ellipse(px, py, s * 1.05, s * 0.85, a, 0, Math.PI * 2);
          ctx.fill();
          // the pale chevron on a clover leaf
          ctx.strokeStyle = 'rgba(220,235,190,0.3)';
          ctx.lineWidth = s * 0.14;
          ctx.beginPath();
          ctx.arc(px, py, s * 0.45, a + 2.3, a + 4);
          ctx.stroke();
        }
      });
    }
  }
  return c;
}

const GROUND = /* glsl */ `
float groundH(vec2 p){
  // a lawn is never flat: low rises and hollows, and clumps
  return (gNoise(p * .05) - .5) * 1.1 + (gNoise(p * .23 + 3.) - .5) * .35;
}
`;

function makeGround(renderer: THREE.WebGLRenderer, size: { w: number; h: number; cx: number; cz: number }) {
  const tex = new THREE.CanvasTexture(paintTile());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.repeat.set(size.w / TILE_CM, size.h / TILE_CM);

  const material = withSun(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 }), 'lawn', shader => {
    shader.vertexShader = behind(shader.vertexShader);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${GROUND}\nvoid main() {`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        {
          vec2 wp = vTWorld.xz;
          vec4 a = texture2D(map, vMapUv);
          // a second, turned and rescaled sample, faded in and out, so the tile never repeats
          vec4 b = texture2D(map, mat2(.8, -.6, .6, .8) * vMapUv * .71 + .37);
          vec4 texel = mix(a, b, smoothstep(.3, .7, gNoise(wp * .021 + 9.)));
          // patches: lusher and deeper here, sun-dried there
          float lush = gNoise(wp * .011 + 2.) * .7 + gNoise(wp * .037) * .3;
          texel.rgb *= mix(vec3(.74, .84, .72), vec3(1., .97, .78), smoothstep(.3, .72, lush));
          // and a slow swell of breeze shows the blades' paler sides, faintly
          float g = gNoise(wp * .012 - normalize(uWind) * uTime * .14);
          texel.rgb *= 1. + smoothstep(.55, .9, g) * vec3(.07, .07, .04);
          diffuseColor *= texel;
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        {
          vec2 p = vTWorld.xz;
          float e = .3;
          float hx = groundH(p + vec2(e, 0.)) - groundH(p - vec2(e, 0.));
          float hz = groundH(p + vec2(0., e)) - groundH(p - vec2(0., e));
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
uniform vec4 uHole;
vec2 placeIn(vec2 spot){
  vec2 c = uView.xy;
  return c + (fract(spot - c / uPatch + .5) - .5) * uPatch;
}
bool inHole(vec2 p){
  vec2 d = (p - uHole.xy) / max(uHole.zw, vec2(1e-3));
  return uHole.z > 0. && dot(d, d) < 1.;
}
`;

/** Patch a material's vertex shader: WIND + PLACE + declarations up top, `body` sets `transformed` (and may set `objectNormal`). */
function sway<M extends THREE.Material>(material: M, key: string, decl: string, body: string, normal = '', frag?: (f: string) => string, vert?: (v: string) => string) {
  return withSun(material, key, shader => {
    Object.assign(shader.uniforms, uniforms, { uView: sunUniforms.uView });
    shader.vertexShader = (WIND + PLACE + decl + shader.vertexShader)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\n${normal}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${body}`);
    shader.vertexShader = behind(vert ? vert(shader.vertexShader) : shader.vertexShader);
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

function decor(geo: THREE.BufferGeometry, material: THREE.Material, order: number, writes = true) {
  const m = new THREE.Mesh(geo, material);
  // placed in the shader, round the camera: always in view, never in the way of a click
  m.frustumCulled = false;
  m.renderOrder = order;
  m.receiveShadow = true;
  m.raycast = () => {};
  material.depthWrite = writes;
  return m;
}

/* ---- blades ---- */

/**
 * A clump of long blades, each rising from the crown and arching over under its own weight;
 * aT runs 0 at the root to 1 at the tip. Lit mostly as the lawn is, from above, with a little
 * of each blade's own slope so the arch shows.
 */
function clumpGeometry(seed: number) {
  const r = rng(seed);
  const pos: number[] = [];
  const nrm: number[] = [];
  const t: number[] = [];
  const idx: number[] = [];
  const SEG = 5;
  const lean = r() * Math.PI * 2;
  const BLADES = 6;
  for (let b = 0; b < BLADES; b++) {
    // most fall the clump's way, a few the other
    const yaw = r() < 0.75 ? lean + (r() - 0.5) * 1.6 : r() * Math.PI * 2;
    const len = 0.6 + r() * 0.55;
    const wid = 0.03 + r() * 0.02;
    const ox = (r() - 0.5) * 0.18;
    const oz = (r() - 0.5) * 0.18;
    let a = 0.2 + r() * 0.35;
    const arch = 0.9 + r() * 0.8;
    // a blade has a slight twist along its length
    const twist = (r() - 0.5) * 0.8;
    let x = 0;
    let y = 0;
    const start = pos.length / 3;
    const dir = new THREE.Vector2(Math.cos(yaw), Math.sin(yaw));
    for (let s = 0; s <= SEG; s++) {
      const f = s / SEG;
      const w = wid * (1 - Math.pow(f, 1.4) * 0.94);
      const px = ox + dir.x * x;
      const pz = oz + dir.y * x;
      const tw = twist * f;
      const sx = -dir.y * Math.cos(tw);
      const sz = dir.x * Math.cos(tw);
      const sy = Math.sin(tw);
      pos.push(px + sx * w, y + sy * w, pz + sz * w, px - sx * w, y - sy * w, pz - sz * w);
      // the blade's face, tipped by its slope, turned a little up to the sky
      const tx = dir.x * Math.sin(a);
      const ty = Math.cos(a);
      const tz = dir.y * Math.sin(a);
      const n = new THREE.Vector3(sx, sy, sz).cross(new THREE.Vector3(tx, ty, tz)).normalize();
      if (n.y < 0) n.negate();
      n.lerp(new THREE.Vector3(0, 1, 0), 0.25).normalize();
      nrm.push(n.x, n.y, n.z, n.x, n.y, n.z);
      t.push(f, f);
      const step = len / SEG;
      x += Math.sin(a) * step;
      y += Math.cos(a) * step;
      a = Math.min(2.2, a + (arch / SEG) * 1.15);
    }
    for (let s = 0; s < SEG; s++) {
      const i = start + s * 2;
      idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
  g.setIndex(idx);
  return g;
}

/** Three greens the clumps come in: a deep one, a fresh one, and one going to hay. */
const BLADE_TONES = [
  ['#2f4d1c', '#86ad45'],
  ['#36581f', '#a2c457'],
  ['#3e5424', '#c2be6c'],
];

function makeBlades(n: number) {
  const r = rng(91);
  const spot = new Float32Array(n * 4);
  const tone = new Float32Array(n * 4);
  const lo = new THREE.Color();
  const hi = new THREE.Color();
  // they grow in drifts, thicker here and thinner there
  let i = 0;
  while (i < n) {
    const cx = r();
    const cy = r();
    const m = Math.min(n - i, 1 + Math.floor(r() * 4));
    const kind = r() < 0.12 ? 2 : r() < 0.5 ? 0 : 1;
    for (let j = 0; j < m; j++, i++) {
      spot.set([cx + (r() - 0.5) * 0.012, cy + (r() - 0.5) * 0.012, r() * Math.PI * 2, 2.8 + r() * 3.2], i * 4);
      lo.set(BLADE_TONES[kind][0]);
      hi.set(BLADE_TONES[kind][1]);
      const v = 0.88 + r() * 0.24;
      // root and tip colours packed: rgb of the tip, and how dark the root is
      tone.set([hi.r * v, hi.g * v, hi.b * v, lo.g / hi.g], i * 4);
    }
  }
  const mesh = new THREE.Group();
  // a few clump shapes, so neighbours don't match
  const SHAPES = 4;
  const per = Math.ceil(n / SHAPES);
  const decl = `attribute vec4 aSpot;\nattribute vec4 aTone;\nattribute float aT;\nvarying float vT;\nvarying vec4 vTone;\n`;
  // where a blade's point is: its clump's spot, turned, and swaying in the breeze, its tips most
  const BLADE = /* glsl */ `
    vec2 base = placeIn(aSpot.xy);
    float c = cos(aSpot.z), s = sin(aSpot.z);
    vec3 p = position * aSpot.w;
    p.xz = mat2(c, -s, s, c) * p.xz;
    vec2 wd = normalize(uWind);
    float g = gNoise(base * .012 - wd * uTime * .22) * .7 + gNoise(base * .027 - wd * uTime * .3 + 3.) * .3;
    float bend = .1 + .4 * smoothstep(.3, .85, g) + sin(uTime * 1.6 + aSpot.z * 9.) * .06 + sin(uTime * 2.7 + aSpot.z * 23.) * .025;
    float k = aT * aT;
    p.xz += wd * bend * k * aSpot.w;
    p.y *= 1. - .25 * k * bend;
    vec3 w = vec3(base.x + p.x, p.y + .05, base.y + p.z);
    vT = aT;
    vTone = aTone;`;
  const material = sway(
    new THREE.MeshStandardMaterial({ roughness: 0.55, side: THREE.DoubleSide }),
    'blades',
    decl,
    /* glsl */ `${BLADE}
    transformed = w;
    // nothing grows in the pond: folded to a point, it draws nothing
    if (inHole(base)) transformed = vec3(base.x, 0., base.y);`,
    // the clump is turned, and so is the way its blades face
    /* glsl */ `
    {
      float c = cos(aSpot.z), s = sin(aSpot.z);
      objectNormal.xz = mat2(c, -s, s, c) * objectNormal.xz;
    }`,
    f =>
      `varying float vT;\nvarying vec4 vTone;\n` +
      f
        // a blade's normals all face the sky, whichever of its sides the camera sees: undo the
        // flip a double-sided material gives a back face, or half the blades are lit as if face down
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize(vNormal);\n  nonPerturbedNormal = normal;')
        .replace(
          '#include <color_fragment>',
          // dark down at the crown where the clump shades itself, to the tip's colour, paling at the very end
          `#include <color_fragment>
          vec3 tipC = vTone.rgb;
          vec3 rootC = tipC * vTone.a * .55;
          diffuseColor.rgb = mix(rootC, tipC, smoothstep(.0, .7, vT)) * (1. + .22 * smoothstep(.7, 1., vT));`,
        ),
  );

  // and each blade's shadow, cast along the sun onto the ground: the thing that makes a blade
  // read as standing up off it. Multiplied into the grass, and kept behind whatever is laid on it.
  const shadowMat = new THREE.MeshBasicMaterial({ blending: THREE.MultiplyBlending, premultipliedAlpha: true, toneMapped: false, side: THREE.DoubleSide });
  shadowMat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms, { uView: sunUniforms.uView, uTime: sunUniforms.uTime, uWind: sunUniforms.uWind, uSlope: sunUniforms.uSlope });
    shader.vertexShader = behind(
      (WIND + PLACE + decl + 'uniform vec2 uSlope;\n' + shader.vertexShader).replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        ${BLADE}
        // (a low sun's would stretch across the lawn: kept to a short fall, so it reads as depth)
        vec2 fall = uSlope / max(1., length(uSlope) / .55);
        w.xz -= fall * w.y;
        transformed = vec3(w.x, .04, w.z);
        if (inHole(base)) transformed = vec3(base.x, 0., base.y);`,
      ),
    );
    // darkest under the crown, fading out along the blade
    shader.fragmentShader = ('varying float vT;\nvarying vec4 vTone;\n' + shader.fragmentShader).replace(
      '#include <map_fragment>',
      'diffuseColor.rgb = vec3(mix(.72, .92, vT));',
    );
  };
  shadowMat.customProgramCacheKey = () => 'blade-shadow';
  shadowMat.depthWrite = false;

  for (let k = 0; k < SHAPES; k++) {
    const from = k * per;
    const count = Math.min(per, n - from);
    const geo = instanced(clumpGeometry(77 + k * 13), count, {
      aSpot: [spot.slice(from * 4, (from + count) * 4), 4],
      aTone: [tone.slice(from * 4, (from + count) * 4), 4],
    });
    const shadow = decor(geo, shadowMat, ORDER.bladeShadows, false);
    shadow.receiveShadow = false;
    mesh.add(shadow, decor(geo, material, ORDER.blades));
  }
  return mesh;
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
    transformed = vec3(base.x + p.x + nod.x, aHead.y + p.y, base.y + p.z + nod.y);
    if (inHole(base)) transformed = vec3(base.x, 0., base.y);`,
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
    if (inHole(base)) transformed = vec3(base.x, 0., base.y);
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
      if (inHole(base)) transformed = vec3(base.x, 0., base.y);
      vShade = position.xz;`,
    );
    shader.vertexShader = behind(shader.vertexShader);
    shader.fragmentShader = ('varying vec2 vShade;\n' + shader.fragmentShader).replace(
      '#include <map_fragment>',
      'diffuseColor.rgb = vec3(mix(.12, 1., smoothstep(.5, 1., length(vShade))));',
    );
  };
  shadeMat.customProgramCacheKey = () => 'pebble-shade';
  const shade = decor(instanced(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2), n, { aSpot: [spot, 4], aScale: [scale, 3] }), shadeMat, ORDER.shade, false);
  shade.receiveShadow = false;
  const group = new THREE.Group();
  group.add(shade, pebbles);
  return group;
}

/* ------------------------------------------------------------------------ */

export function makeLawn(renderer: THREE.WebGLRenderer, size: { w: number; h: number; cx: number; cz: number }) {
  const group = new THREE.Group();
  // a phone draws a smaller patch, so it gets fewer of everything for the same density
  const small = matchMedia('(pointer: coarse)').matches;
  const blades = makeBlades(small ? 3600 : 5400);
  group.add(makeGround(renderer, size), makePebbles(small ? 70 : 140), blades, makeFlowers(small ? 230 : 440, renderer));
  const full = blades.children.map(m => ((m as THREE.Mesh).geometry as THREE.InstancedBufferGeometry).instanceCount);
  let thin = 1;
  let slow = 0;
  let drawn = 0;
  return {
    group,
    /**
     * Told how long each drawn frame took (ms). Pulled back, the blades are small and many more of
     * them are in view, so fewer are drawn, the painted ground carrying the look; and a run of slow
     * frames thins them further, down to half.
     */
    pace(ms: number) {
      if (ms < 120) {
        // (the share of recent frames that ran over: scattered slow ones count, not just a run)
        slow = slow * 0.97 + (ms > 24 ? 0.03 : 0);
        if (slow > 0.25 && thin > 0.5) {
          thin -= 0.125;
          slow = 0;
        }
      }
      const zoom = THREE.MathUtils.clamp(80 / Math.max(1, sunUniforms.uView.value.z), 0.3, 1);
      const share = Math.round(thin * zoom * zoom * 40) / 40;
      if (share === drawn) return;
      drawn = share;
      blades.children.forEach((m, i) => (((m as THREE.Mesh).geometry as THREE.InstancedBufferGeometry).instanceCount = Math.floor(full[i] * share)));
    },
    /** Fit the patch to the shape of the screen. */
    setAspect(aspect: number) {
      uniforms.uPatch.value.copy(aspect < 0.8 ? PATCH_TALL : PATCH_WIDE);
    },
  };
}
