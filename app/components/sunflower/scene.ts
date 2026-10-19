import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/*
 * A procedural sunflower (Helianthus annuus), built and animated entirely in three.js.
 *
 * Scroll drives the bloom: the green phyllaries part, then two whorls of ray petals unfurl from
 * a curled bud while the disc florets open from the rim inwards. Everything hangs on springs:
 * the stem and the head form a loose double pendulum, and every petal and leaf has its own
 * spring, so scroll velocity, flicks and the pointer make the flower nod, twist, wobble and
 * flutter with real momentum before it settles.
 */

/* ---------------------------------------------------------------------------------------- */
/*  Proportions (scene units ≈ metres)                                                      */
/* ---------------------------------------------------------------------------------------- */

const DISC_R = 0.13;
const FLORETS = 1100;
const RING = 21; // ray florets per whorl; two whorls
const BRACTS = 34;
const STEM_BASE = -1.5;
const STEM_TOP = 1.0;
const NECK = new THREE.Vector3(0, 0.035, 0.115); // head centre, relative to the stem tip
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const DEG = Math.PI / 180;

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A damped spring. Low damping = dangly. */
class Spring {
  x: number;
  v = 0;
  private k0: number;
  private c0: number;
  constructor(
    public k: number,
    public c: number,
    x = 0,
  ) {
    this.x = x;
    this.k0 = k;
    this.c0 = c;
  }
  /** Scale stiffness and damping from their built-in values. */
  tune(kMul: number, cMul: number) {
    this.k = this.k0 * kMul;
    this.c = this.c0 * cMul;
  }
  step(target: number, dt: number) {
    // semi-implicit Euler in small sub-steps: stable for stiff petals on slow frames
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-this.k * (this.x - target) - this.c * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

/* ---------------------------------------------------------------------------------------- */
/*  Camera choreography                                                                     */
/* ---------------------------------------------------------------------------------------- */

type Shot = { t: number; target: [number, number, number]; az: number; el: number; dist: number; sx: number; sy: number };

// Beats overlay: .0–.1 intro, .24–.4 copy left, .52–.68 copy right, .86–1 closing.
const DESKTOP: Shot[] = [
  { t: 0, target: [0, 0.98, 0.06], az: -8, el: 2, dist: 2.3, sx: 0, sy: -0.27 },
  { t: 0.12, target: [0, 1.0, 0.08], az: -4, el: 4, dist: 2.1, sx: 0.02, sy: -0.15 },
  { t: 0.24, target: [0, 1.04, 0.1], az: 26, el: 10, dist: 1.75, sx: 0.2, sy: 0 },
  { t: 0.4, target: [0, 1.04, 0.1], az: 36, el: 6, dist: 1.6, sx: 0.2, sy: 0 },
  { t: 0.46, target: [0, 1.02, 0.08], az: 0, el: 10, dist: 2.1, sx: -0.04, sy: 0 },
  { t: 0.52, target: [0, 1.0, 0.08], az: -40, el: 4, dist: 1.85, sx: -0.24, sy: 0 },
  { t: 0.68, target: [0, 1.0, 0.08], az: -48, el: -2, dist: 1.75, sx: -0.24, sy: 0.02 },
  { t: 0.78, target: [0, 0.94, 0.05], az: -24, el: 4, dist: 2.2, sx: 0, sy: 0.08 },
  { t: 0.88, target: [0, 0.94, 0.05], az: 0, el: 4, dist: 2.6, sx: 0, sy: 0.12 },
  { t: 1, target: [0, 0.94, 0.05], az: 6, el: 3, dist: 2.7, sx: 0, sy: 0.13 },
];
const MOBILE: Shot[] = DESKTOP.map(s => ({
  ...s,
  sx: 0,
  sy: s.t === 0 ? -0.1 : s.t === 0.12 ? 0.02 : s.t >= 0.86 ? 0.17 : 0.2,
  dist: s.dist * (s.dist > 1.85 ? 1.1 : 1.25),
}));

const catmull = (p0: number, p1: number, p2: number, p3: number, t: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};
function sampleShots(shots: Shot[], p: number) {
  const n = shots.length;
  let i = 0;
  while (i < n - 2 && p > shots[i + 1].t) i++;
  const a = shots[Math.max(0, i - 1)];
  const b = shots[i];
  const c = shots[i + 1];
  const d = shots[Math.min(n - 1, i + 2)];
  const t = clamp((p - b.t) / (c.t - b.t), 0, 1);
  const f = (k: (s: Shot) => number) => catmull(k(a), k(b), k(c), k(d), t);
  return {
    target: [f(s => s.target[0]), f(s => s.target[1]), f(s => s.target[2])] as [number, number, number],
    az: f(s => s.az),
    el: f(s => s.el),
    dist: f(s => s.dist),
    sx: f(s => s.sx),
    sy: f(s => s.sy),
  };
}

/* ---------------------------------------------------------------------------------------- */
/*  Tunables (the dev panel edits these live)                                               */
/* ---------------------------------------------------------------------------------------- */

export const DEFAULT_PARAMS = {
  // bloom
  bloomStart: 0.6, // how open the flower is at the top of the page (0 = closed bud)
  bloomEnd: 0.26, // scroll progress at which it is fully open
  bloomStiffness: 26,
  bloomDamping: 7.5,
  // feel
  scrollSensitivity: 1,
  pointerSensitivity: 1,
  wind: 1,
  flutter: 1,
  breeze: 1,
  headStiffness: 1,
  headDamping: 1,
  stemStiffness: 1,
  stemDamping: 1,
  petalStiffness: 1,
  petalDamping: 1,
  leafSway: 1,
  // look
  headSize: 1,
  headTilt: 0, // degrees; positive tips the face down
  petalLength: 1,
  petalWidth: 1,
  petalArch: 0, // extra curl when open; positive arches the tips back
  petalBase: '#ad5500',
  petalMid: '#fdad00',
  petalTip: '#ffcb27',
  stemColor: '#33601a',
  // light
  exposure: 0.92,
  keyLight: 2.3,
  envLight: 0.32,
  shadow: 0.15,
  pollen: true,
  // camera
  parallax: 1,
  cameraFollow: 9,
  // debug: pin the flower to a scroll position without scrolling
  scrub: false,
  scrubProgress: 0,
};
export type SunflowerParams = typeof DEFAULT_PARAMS;

/* ---------------------------------------------------------------------------------------- */
/*  Geometry                                                                                 */
/* ---------------------------------------------------------------------------------------- */

/** A ray petal: length along +Y (0..1), width along X, a shallow channel along the midrib. */
function petalGeometry(segL = 16, segW = 8) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segL; i++) {
    const v = i / segL;
    const half = 0.5 * (0.16 + 0.84 * Math.sin(Math.PI * Math.pow(v, 0.78))) * (1 - Math.pow(v, 7));
    for (let j = 0; j <= segW; j++) {
      const xn = (j / segW) * 2 - 1;
      const z = 0.05 * xn * xn * Math.sin(Math.PI * Math.min(1, v * 1.1)) + 0.006 * Math.sin(v * Math.PI * 3 + xn * 2);
      pos.push(xn * half, v, z);
      uv.push(j / segW, v);
    }
  }
  for (let i = 0; i < segL; i++) {
    for (let j = 0; j < segW; j++) {
      const a = i * (segW + 1) + j;
      const b = a + segW + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A broad, serrated, heart-based sunflower leaf, drooping under its own weight. */
function leafGeometry(segL = 22, segW = 12) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segL; i++) {
    const v = i / segL;
    let half = 0.42 * Math.sin(Math.PI * Math.pow(v, 0.7)) * (1 + 0.35 * Math.pow(1 - v, 3));
    half *= 1 + 0.05 * Math.sin(v * Math.PI * 22) * smooth(0.12, 0.3, v) * (1 - smooth(0.85, 1, v));
    for (let j = 0; j <= segW; j++) {
      const xn = (j / segW) * 2 - 1;
      const z = 0.07 * xn * xn - 0.2 * v * v + 0.015 * Math.sin(v * 9 + xn * 3);
      pos.push(xn * half, v, z);
      uv.push(j / segW, v);
    }
  }
  for (let i = 0; i < segL; i++) {
    for (let j = 0; j < segW; j++) {
      const a = i * (segW + 1) + j;
      const b = a + segW + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------------------------------------------------------------------------------------- */
/*  Materials                                                                                */
/* ---------------------------------------------------------------------------------------- */

// Shared vertex patch: bend a petal along its length by a per-instance curl (radians across the
// full length), so each petal can cup into a bud or arch back when open.
const CURL_VERTEX = {
  head: 'attribute float aCurl;\nattribute float aTone;\nvarying vec2 vPUv;\nvarying float vTone;',
  normal: `vec3 objectNormal = vec3( normal );
    {
      float th = aCurl * position.y;
      objectNormal = vec3(objectNormal.x, objectNormal.y * cos(th) - objectNormal.z * sin(th), objectNormal.y * sin(th) + objectNormal.z * cos(th));
    }
    #ifdef USE_TANGENT
      vec3 objectTangent = vec3( tangent.xyz );
    #endif`,
  begin: `vec3 transformed;
    {
      float k = aCurl; float t = position.y; float th = k * t;
      vec2 arc = abs(k) > 1e-3 ? vec2(sin(th) / k, (1.0 - cos(th)) / k) : vec2(t, 0.5 * k * t * t);
      transformed = vec3(position.x, arc.x, arc.y) + vec3(0.0, -sin(th), cos(th)) * position.z;
      vPUv = uv; vTone = aTone;
    }`,
};

type PetalColours = { uPetalBase: { value: THREE.Color }; uPetalMid: { value: THREE.Color }; uPetalTip: { value: THREE.Color } };

function petalMaterial(kind: 'ray' | 'bract', colours: PetalColours) {
  const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: kind === 'ray' ? 0.52 : 0.7, metalness: 0 });
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, colours);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${CURL_VERTEX.head}`)
      .replace('#include <beginnormal_vertex>', CURL_VERTEX.normal)
      .replace('#include <begin_vertex>', CURL_VERTEX.begin);
    const colour =
      kind === 'ray'
        ? `
        vec3 base = mix(uPetalBase, uPetalMid, smoothstep(0.0, 0.3, v));
        vec3 col = mix(base, uPetalTip, smoothstep(0.35, 0.95, v));
        col = mix(col, col * vec3(1.0, 0.8, 0.55), vTone);
        float vein = pow(abs(sin((u - 0.5) * 3.14159 * 9.0 * (1.0 - 0.35 * v))), 12.0);
        col *= 1.0 - 0.12 * vein * smoothstep(0.04, 0.3, v);
        col *= 1.0 - 0.12 * smoothstep(0.32, 0.5, abs(u - 0.5));
        if (!gl_FrontFacing) col = mix(col, vec3(0.9, 0.56, 0.06), 0.3);
        glow = col;`
        : `
        vec3 col = mix(vec3(0.02, 0.07, 0.008), vec3(0.11, 0.24, 0.03), smoothstep(0.0, 0.8, v));
        col = mix(col, vec3(0.2, 0.3, 0.05), smoothstep(0.8, 1.0, v) * 0.6);
        float vein = pow(abs(sin((u - 0.5) * 3.14159 * 5.0)), 10.0);
        col *= 1.0 + 0.25 * vein;
        col *= 0.85 + 0.3 * vTone;
        if (!gl_FrontFacing) col *= 1.25;`;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPUv;\nvarying float vTone;\nuniform vec3 uPetalBase;\nuniform vec3 uPetalMid;\nuniform vec3 uPetalTip;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 glow = vec3(0.0);
        {
          float u = vPUv.x; float v = vPUv.y;
          ${colour}
          diffuseColor.rgb = col;
        }`,
      )
      // thin petals let light through: a touch of their own colour reads as translucency
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += glow * 0.05;');
  };
  m.customProgramCacheKey = () => `sunflower-${kind}`;
  return m;
}

function floretMaterial(bloom: { value: number }) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0 });
  m.onBeforeCompile = shader => {
    shader.uniforms.uBloom = bloom;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aR;\nattribute float aSeed;\nvarying float vR;\nvarying float vSeed;\nvarying float vH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvR = aR; vSeed = aSeed; vH = position.z;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uBloom;\nvarying float vR;\nvarying float vSeed;\nvarying float vH;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec3 col = mix(vec3(0.17, 0.2, 0.025), vec3(0.04, 0.016, 0.004), smoothstep(0.04, 0.24, vR));
          col = mix(col, vec3(0.12, 0.045, 0.01), smoothstep(0.5, 0.85, vR));
          // disc florets open in rings, from the rim towards the centre
          float front = 1.0 - clamp(uBloom, 0.0, 1.0) * 0.24;
          float open = smoothstep(front, front + 0.07, vR);
          col = mix(col, vec3(0.42, 0.2, 0.012), open * 0.85);
          col *= 0.75 + 0.5 * vSeed;
          col *= mix(0.55, 1.2, smoothstep(-0.6, 1.0, vH));
          diffuseColor.rgb = col;
        }`,
      );
  };
  m.customProgramCacheKey = () => 'sunflower-floret';
  return m;
}

function leafMaterial() {
  const m = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, roughness: 0.62, sheen: 0.5, sheenColor: new THREE.Color('#b8d88a'), sheenRoughness: 0.7 });
  m.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLUv = uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vLUv;').replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        float u = vLUv.x; float v = vLUv.y; float ax = abs(u - 0.5);
        vec3 col = mix(vec3(0.03, 0.1, 0.012), vec3(0.07, 0.17, 0.02), smoothstep(0.0, 0.6, v));
        float midrib = 1.0 - smoothstep(0.0, 0.03, ax);
        float lateral = pow(abs(sin((v - ax * 0.9) * 3.14159 * 9.0)), 16.0) * smoothstep(0.03, 0.08, ax);
        col = mix(col, vec3(0.16, 0.3, 0.06), max(midrib * 0.8, lateral * 0.45));
        col *= 1.0 - 0.25 * smoothstep(0.3, 0.5, ax);
        if (!gl_FrontFacing) col = mix(col, vec3(0.16, 0.26, 0.08), 0.35);
        diffuseColor.rgb = col;
      }`,
    );
  };
  m.customProgramCacheKey = () => 'sunflower-leaf';
  return m;
}

/* ---------------------------------------------------------------------------------------- */
/*  Pollen                                                                                   */
/* ---------------------------------------------------------------------------------------- */

function makePollen(count: number) {
  const geometry = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const r = rng(7);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() - 0.5) * 1.6;
    pos[i * 3 + 1] = r() * 1.2;
    pos[i * 3 + 2] = (r() - 0.5) * 0.9;
    seed[i] = r();
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, scale: { value: 1 }, opacity: { value: 1 } },
    vertexShader: `
      attribute float seed; uniform float time; uniform float scale; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + time * (0.02 + seed * 0.025), 1.2);
        p.x += sin(time * 0.3 + seed * 40.0) * 0.03;
        p.z += cos(time * 0.25 + seed * 23.0) * 0.02;
        vec4 mv = modelViewMatrix * vec4(p + vec3(0.0, 0.45, 0.0), 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(scale * (1.0 + seed * 1.6) / -mv.z, scale * 0.012);
        vA = smoothstep(0.0, 0.15, p.y) * smoothstep(1.2, 0.95, p.y) * (0.35 + 0.65 * seed);
      }`,
    fragmentShader: `
      uniform float opacity; varying float vA;
      void main(){
        float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vec3(0.95, 0.66, 0.12), a * a * vA * opacity * 0.6);
      }`,
  });
  return new THREE.Points(geometry, material);
}

/* ---------------------------------------------------------------------------------------- */
/*  Scene                                                                                    */
/* ---------------------------------------------------------------------------------------- */

export type Projected = { id: string; x: number; y: number; visible: number };
export type FrameInfo = { bloom: number };

type PetalState = { theta: number; ring: number; delay: number; seed: number; roll: number; pitch: Spring; curl: Spring; ph: number; w: number };
type LeafState = { t: number; yaw: number; pitch: number; size: number; group: THREE.Group; sway: Spring; lift: Spring };

export class SunflowerScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(24, 1, 0.01, 30);
  private clock = new THREE.Clock();
  private reduced: boolean;
  private size = { w: 1, h: 1 };

  // structure
  private neck = new THREE.Group();
  private head = new THREE.Group();
  private petals!: THREE.InstancedMesh;
  private bracts!: THREE.InstancedMesh;
  private stem!: THREE.Mesh;
  private stemPos!: THREE.BufferAttribute;
  private stemNrm!: THREE.BufferAttribute;
  private pollen = makePollen(80);
  private bloomU = { value: 0 };
  private colours: PetalColours = { uPetalBase: { value: new THREE.Color() }, uPetalMid: { value: new THREE.Color() }, uPetalTip: { value: new THREE.Color() } };
  private stemMat = new THREE.MeshPhysicalMaterial({ color: '#33601a', roughness: 0.58, sheen: 0.22, sheenColor: new THREE.Color('#cfe8a0'), sheenRoughness: 0.5 });
  private keyLight!: THREE.DirectionalLight;
  private paperMat!: THREE.ShadowMaterial;

  /** Live-tunable parameters; mutate freely. */
  params: SunflowerParams = { ...DEFAULT_PARAMS };

  // state
  private petalState: PetalState[] = [];
  private bractState: PetalState[] = [];
  private leaves: LeafState[] = [];
  private bloom = new Spring(26, 7.5);
  private nod = new Spring(15, 2.0);
  private sway = new Spring(13, 1.6);
  private twist = new Spring(9, 1.1);
  private stemNod = new Spring(7, 1.5);
  private stemSway = new Spring(6, 1.3);
  private lastProgress = 0;
  private velocity = 0;
  private windiness = 0;
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private pointerSpeed = 0;
  private shot = sampleShots(DESKTOP, 0);
  private tmpM = new THREE.Matrix4();
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  progress = 0;
  /** Bloom after springs, 0..1 (exposed for the dev panel). */
  bloomNow = 0;
  onFrame?: (projected: Projected[], info: FrameInfo) => void;

  constructor(canvas: HTMLCanvasElement, params?: Partial<SunflowerParams>) {
    Object.assign(this.params, params);
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.32;
    pmrem.dispose();

    this.buildLights();
    this.buildStem();
    this.buildHead();
    this.buildLeaves();

    this.pollen.renderOrder = 2;
    this.scene.add(this.pollen);
    this.update(0);
  }

  /* ---------- build ---------- */

  private buildLights() {
    const key = new THREE.DirectionalLight('#fff0d4', 2.3);
    key.position.set(-1.5, 2.6, 2.1);
    key.target.position.set(0, 0.7, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 12;
    key.shadow.blurSamples = 16;
    key.shadow.bias = -0.0005;
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = -1.3;
    sc.right = 1.3;
    sc.top = 1.6;
    sc.bottom = -1.2;
    sc.near = 0.5;
    sc.far = 7;
    const fill = new THREE.DirectionalLight('#dfe7ff', 0.6);
    fill.position.set(2, 0.8, 1.4);
    const rim = new THREE.DirectionalLight('#ffd27a', 1.8);
    rim.position.set(0.6, 1.8, -2.2);
    const hemi = new THREE.HemisphereLight('#fffaf0', '#8c8a5a', 0.6);
    this.scene.add(key, key.target, fill, rim, hemi);
    this.keyLight = key;

    // The page itself: only the shadow is drawn, so the real paper and grain show through.
    this.paperMat = new THREE.ShadowMaterial({ color: '#4a3d1c', opacity: 0.15 });
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), this.paperMat);
    paper.position.set(0, 0.6, -0.6);
    paper.receiveShadow = true;
    this.scene.add(paper);
  }

  private stemMaterial() {
    return this.stemMat;
  }

  /** How open the flower is for a given scroll position (before springs). */
  private bloomFor(p: number) {
    const { bloomStart, bloomEnd } = this.params;
    return bloomStart + (1 - bloomStart) * smooth(0.015, Math.max(0.03, bloomEnd), p);
  }

  private buildStem() {
    const SEG = 80;
    const RAD = 12;
    const count = (SEG + 1) * (RAD + 1);
    const g = new THREE.BufferGeometry();
    this.stemPos = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    this.stemNrm = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    this.stemPos.setUsage(THREE.DynamicDrawUsage);
    this.stemNrm.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.stemPos);
    g.setAttribute('normal', this.stemNrm);
    const idx: number[] = [];
    for (let i = 0; i < SEG; i++)
      for (let j = 0; j < RAD; j++) {
        const a = i * (RAD + 1) + j;
        const b = a + RAD + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    g.setIndex(idx);
    this.stem = new THREE.Mesh(g, this.stemMaterial());
    this.stem.castShadow = true;
    this.stem.receiveShadow = true;
    this.stem.frustumCulled = false;
    this.stem.userData = { SEG, RAD };
    this.scene.add(this.stem);
  }

  /** Point on the stem's spine for t ∈ [0, 1], given the current bend. */
  private spine(t: number, out: THREE.Vector3) {
    const bx = Math.sin(this.stemSway.x) * 0.55;
    const bz = Math.sin(this.stemNod.x) * 0.5;
    const k = Math.pow(t, 2.2);
    // a gentle natural lean, plus the neck curving forward into the back of the head
    out.set(bx * k + 0.04 * Math.sin(t * 2.4), lerp(STEM_BASE, STEM_TOP, t), bz * k + 0.05 * smooth(0.86, 1, t) - 0.02 * Math.sin(t * 3));
    return out;
  }

  private buildHead() {
    this.scene.add(this.neck);
    this.neck.add(this.head);
    this.head.position.copy(NECK);

    // receptacle: the green cup behind the disc
    const profile = [
      [0.0, -0.118],
      [0.022, -0.116],
      [0.045, -0.108],
      [0.072, -0.092],
      [0.1, -0.07],
      [0.12, -0.042],
      [0.132, -0.014],
      [0.134, -0.002],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const cupGeo = new THREE.LatheGeometry(profile, 48);
    cupGeo.rotateX(Math.PI / 2);
    const cup = new THREE.Mesh(cupGeo, this.stemMaterial());
    cup.castShadow = true;
    this.head.add(cup);

    const face = new THREE.Mesh(new THREE.CircleGeometry(DISC_R * 1.01, 64), new THREE.MeshStandardMaterial({ color: '#1c0d04', roughness: 0.9 }));
    face.position.z = -0.002;
    this.head.add(face);

    // disc florets in a Fibonacci spiral
    const floretGeo = new THREE.SphereGeometry(1, 7, 5);
    const florets = new THREE.InstancedMesh(floretGeo, floretMaterial(this.bloomU), FLORETS);
    const aR = new Float32Array(FLORETS);
    const aSeed = new Float32Array(FLORETS);
    const r = rng(11);
    const c = DISC_R / Math.sqrt(FLORETS);
    const m = new THREE.Matrix4();
    for (let i = 0; i < FLORETS; i++) {
      const rad = c * Math.sqrt(i + 0.5);
      const a = i * GOLDEN;
      const rn = rad / DISC_R;
      const s = c * 1.08 * (0.72 + 0.3 * rn);
      m.makeScale(s, s, s * (0.75 + 0.35 * rn));
      m.setPosition(Math.cos(a) * rad, Math.sin(a) * rad, 0.014 * (1 - rn * rn) + 0.002 * r());
      florets.setMatrixAt(i, m);
      aR[i] = rn;
      aSeed[i] = r();
    }
    floretGeo.setAttribute('aR', new THREE.InstancedBufferAttribute(aR, 1));
    floretGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
    florets.receiveShadow = true;
    this.head.add(florets);

    // ray petals (two whorls) and phyllaries share the curl-able petal geometry
    const makeInstanced = (n: number, kind: 'ray' | 'bract') => {
      const geo = petalGeometry();
      geo.setAttribute('aCurl', new THREE.InstancedBufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aTone', new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
      const mesh = new THREE.InstancedMesh(geo, petalMaterial(kind, this.colours), n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.head.add(mesh);
      return mesh;
    };
    this.petals = makeInstanced(RING * 2, 'ray');
    this.bracts = makeInstanced(BRACTS, 'bract');

    const pr = rng(23);
    const tone = this.petals.geometry.getAttribute('aTone') as THREE.InstancedBufferAttribute;
    for (let ring = 0; ring < 2; ring++)
      for (let i = 0; i < RING; i++) {
        const seed = pr();
        const k = ring * RING + i;
        tone.setX(k, ring === 1 ? 0.6 + 0.4 * pr() : 0.25 * pr());
        this.petalState.push({
          theta: ((i + ring * 0.5) / RING) * Math.PI * 2 + (pr() - 0.5) * 0.08,
          ring,
          delay: ring * 0.1 + pr() * 0.14,
          seed,
          roll: (pr() - 0.5) * 0.35,
          pitch: new Spring(55 + pr() * 40, 2 + pr() * 1.5),
          curl: new Spring(45 + pr() * 30, 2.2 + pr()),
          ph: pr() * Math.PI * 2,
          w: 0.29 + pr() * 0.07,
        });
      }
    const btone = this.bracts.geometry.getAttribute('aTone') as THREE.InstancedBufferAttribute;
    for (let i = 0; i < BRACTS; i++) {
      btone.setX(i, pr());
      this.bractState.push({
        theta: (i / BRACTS) * Math.PI * 2 + (pr() - 0.5) * 0.12,
        ring: i % 2,
        delay: pr() * 0.1,
        seed: pr(),
        roll: (pr() - 0.5) * 0.3,
        pitch: new Spring(70, 3),
        curl: new Spring(60, 3),
        ph: pr() * Math.PI * 2,
        w: 0.42 + pr() * 0.1,
      });
    }
  }

  private buildLeaves() {
    const geo = leafGeometry();
    const mat = leafMaterial();
    const petioleMat = this.stemMaterial();
    const specs = [
      { t: 0.3, yaw: 60, pitch: 58, size: 0.38 },
      { t: 0.42, yaw: 235, pitch: 54, size: 0.36 },
      { t: 0.53, yaw: 300, pitch: 50, size: 0.3 },
      { t: 0.62, yaw: 110, pitch: 46, size: 0.26 },
    ];
    for (const s of specs) {
      const group = new THREE.Group();
      const petiole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.1, 8), petioleMat);
      petiole.position.y = 0.05;
      const blade = new THREE.Mesh(geo, mat);
      blade.position.y = 0.09;
      blade.scale.setScalar(s.size);
      petiole.castShadow = blade.castShadow = true;
      blade.receiveShadow = true;
      group.add(petiole, blade);
      this.scene.add(group);
      this.leaves.push({ ...s, yaw: s.yaw * DEG, pitch: s.pitch * DEG, group, sway: new Spring(18, 1.4), lift: new Spring(16, 1.3) });
    }
  }

  /* ---------- per-frame ---------- */

  private placePetal(mesh: THREE.InstancedMesh, i: number, theta: number, phi: number, roll: number, radius: number, z: number, len: number, width: number) {
    const r = this.v1.set(Math.cos(theta), Math.sin(theta), 0);
    const t = this.v2.set(-Math.sin(theta), Math.cos(theta), 0);
    const d = this.v3.copy(r).multiplyScalar(Math.sin(phi)).add(new THREE.Vector3(0, 0, Math.cos(phi)));
    const X = t.clone().negate();
    const Z = new THREE.Vector3().crossVectors(X, d);
    if (roll) {
      X.applyAxisAngle(d, roll);
      Z.applyAxisAngle(d, roll);
    }
    this.tmpM.makeBasis(X.multiplyScalar(width * len), d.clone().multiplyScalar(len), Z.multiplyScalar(len));
    this.tmpM.setPosition(r.x * radius, r.y * radius, z);
    mesh.setMatrixAt(i, this.tmpM);
  }

  /** Head-local point at fraction `v` along petal `i` (follows curl), in world space. */
  private petalPoint(mesh: THREE.InstancedMesh, i: number, v: number, out: THREE.Vector3) {
    const k = (mesh.geometry.getAttribute('aCurl') as THREE.InstancedBufferAttribute).getX(i);
    const th = k * v;
    out.set(0, Math.abs(k) > 1e-3 ? Math.sin(th) / k : v, Math.abs(k) > 1e-3 ? (1 - Math.cos(th)) / k : 0);
    mesh.getMatrixAt(i, this.tmpM);
    out.applyMatrix4(this.tmpM).applyMatrix4(this.head.matrixWorld);
    return out;
  }

  /** Fake a scroll flick (dev panel): positive nods the head forward. */
  kick(amount: number) {
    this.velocity += amount;
  }

  /** Smoothed scroll velocity in progress/s (dev panel readout). */
  get scrollVelocity() {
    return this.velocity;
  }

  setPointer(x: number, y: number) {
    this.pointerSpeed = Math.min(4, this.pointerSpeed + Math.hypot(x - this.pointer.x, y - this.pointer.y) * 6);
    this.pointer.set(x, y);
  }

  resize(w: number, h: number) {
    this.size = { w, h };
    const dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.75 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    (this.pollen.material as THREE.ShaderMaterial).uniforms.scale.value = h * dpr * 0.012;
  }

  /** Push the cheap, non-geometric params into springs, materials and lights. */
  private applyParams() {
    const P = this.params;
    this.bloom.k = P.bloomStiffness;
    this.bloom.c = P.bloomDamping;
    this.nod.tune(P.headStiffness, P.headDamping);
    this.sway.tune(P.headStiffness, P.headDamping);
    this.twist.tune(P.headStiffness, P.headDamping);
    this.stemNod.tune(P.stemStiffness, P.stemDamping);
    this.stemSway.tune(P.stemStiffness, P.stemDamping);
    for (const s of this.petalState) {
      s.pitch.tune(P.petalStiffness, P.petalDamping);
      s.curl.tune(P.petalStiffness, P.petalDamping);
    }
    this.colours.uPetalBase.value.set(P.petalBase);
    this.colours.uPetalMid.value.set(P.petalMid);
    this.colours.uPetalTip.value.set(P.petalTip);
    this.stemMat.color.set(P.stemColor);
    this.renderer.toneMappingExposure = P.exposure;
    this.keyLight.intensity = P.keyLight;
    this.scene.environmentIntensity = P.envLight;
    this.paperMat.opacity = P.shadow;
  }

  update(dt: number) {
    const P = this.params;
    const time = this.reduced ? 0 : this.clock.elapsedTime;
    const p = clamp(P.scrub ? P.scrubProgress : this.progress, 0, 1);
    this.applyParams();

    /* ---- scroll velocity → momentum ---- */
    if (dt > 0) {
      const raw = (p - this.lastProgress) / dt;
      this.velocity += (clamp(raw, -3, 3) - this.velocity) * (1 - Math.exp(-dt / 0.06));
    }
    this.lastProgress = p;
    const vel = this.reduced ? 0 : this.velocity * P.scrollSensitivity;
    const px = this.pointerSmooth.x * P.pointerSensitivity;
    const py = this.pointerSmooth.y * P.pointerSensitivity;
    this.pointerSmooth.lerp(this.pointer, dt === 0 ? 1 : 1 - Math.exp(-dt * 3));
    this.pointerSpeed *= Math.exp(-dt * 2.5);
    const gust = Math.min(1.6, Math.abs(vel) * 2.4 + this.pointerSpeed * 0.4 * P.pointerSensitivity) * P.wind;
    this.windiness += (gust - this.windiness) * (dt === 0 ? 1 : 1 - Math.exp(-dt * 4));

    /* ---- bloom, with a little overshoot ---- */
    const bloom = dt === 0 ? (this.bloom.x = this.bloomFor(p)) : this.bloom.step(this.bloomFor(p), dt);
    this.bloomU.value = bloom;
    this.bloomNow = bloom;

    /* ---- the double pendulum: stem lags, head dangles off it ---- */
    const breeze = this.reduced ? 0 : (Math.sin(time * 0.55) * 0.035 + Math.sin(time * 1.31 + 1) * 0.012) * P.breeze;
    // buds face the sky; the opening head swings round to face you, heavy enough to nod a little
    const nodTarget = lerp(-0.62, 0.26, smooth(0, 0.65, bloom)) + P.headTilt * DEG + clamp(vel * 1.15, -0.65, 0.65) - py * 0.14;
    const swayTarget = px * 0.2 + breeze + clamp(vel * 0.2, -0.25, 0.25);
    const twistTarget = clamp(vel * 0.95, -0.7, 0.7) + px * 0.15;
    if (dt > 0) {
      this.stemNod.step(this.nod.x * 0.45, dt);
      this.stemSway.step(this.sway.x * 0.55 + breeze * 0.5, dt);
      this.nod.step(nodTarget, dt);
      this.sway.step(swayTarget, dt);
      this.twist.step(twistTarget, dt);
    } else {
      this.nod.x = nodTarget;
      this.sway.x = swayTarget;
    }

    /* ---- stem ---- */
    const { SEG, RAD } = this.stem.userData as { SEG: number; RAD: number };
    const pt = new THREE.Vector3();
    const ahead = new THREE.Vector3();
    const behind = new THREE.Vector3();
    const T = new THREE.Vector3();
    const side = new THREE.Vector3();
    const B = new THREE.Vector3();
    const Zup = new THREE.Vector3(0, 0, 1);
    const pos = this.stemPos.array as Float32Array;
    const nrm = this.stemNrm.array as Float32Array;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      this.spine(t, pt);
      this.spine(Math.min(1, t + 0.004), ahead);
      this.spine(Math.max(0, t - 0.004), behind);
      T.subVectors(ahead, behind).normalize();
      side.crossVectors(T, Zup).normalize();
      B.crossVectors(side, T);
      const rr = 0.021 * (1.15 - 0.35 * t) + 0.006 * smooth(0.9, 1, t);
      for (let j = 0; j <= RAD; j++) {
        const a = (j / RAD) * Math.PI * 2;
        const nx = side.x * Math.cos(a) + B.x * Math.sin(a);
        const ny = side.y * Math.cos(a) + B.y * Math.sin(a);
        const nz = side.z * Math.cos(a) + B.z * Math.sin(a);
        const k = (i * (RAD + 1) + j) * 3;
        pos[k] = pt.x + nx * rr;
        pos[k + 1] = pt.y + ny * rr;
        pos[k + 2] = pt.z + nz * rr;
        nrm[k] = nx;
        nrm[k + 1] = ny;
        nrm[k + 2] = nz;
      }
    }
    this.stemPos.needsUpdate = true;
    this.stemNrm.needsUpdate = true;

    /* ---- neck and head ---- */
    this.spine(1, pt);
    this.spine(0.99, behind);
    T.subVectors(pt, behind).normalize();
    this.neck.position.copy(pt);
    const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), T);
    const swing = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.nod.x - 0.12, this.twist.x * 0.5, -this.sway.x, 'YXZ'));
    this.neck.quaternion.copy(tilt).multiply(swing);
    // the bud is smaller; the head swells as it opens
    this.head.scale.setScalar((0.7 + 0.3 * smooth(0, 1, bloom)) * P.headSize);
    this.head.rotation.z = this.twist.x * 0.35;

    /* ---- petals: unfurl with the bloom, flutter in the wind ---- */
    const nodVel = this.nod.v;
    const swayVel = this.sway.v;
    const curlAttr = this.petals.geometry.getAttribute('aCurl') as THREE.InstancedBufferAttribute;
    this.petalState.forEach((s, i) => {
      const b = clamp((bloom - 0.12 - s.delay) / 0.7, 0, 1.12);
      const e = b <= 1 ? smooth(0, 1, b) : 1 + (b - 1) * 1.6;
      const flap = (swayVel * Math.cos(s.theta) - nodVel * Math.sin(s.theta)) * 0.5 + this.twist.v * 0.08;
      const flutter = this.reduced ? 0 : Math.sin(time * (5 + s.seed * 4) + s.ph) * 0.06 * this.windiness * P.flutter;
      const pitch = dt > 0 ? s.pitch.step(flap + flutter, dt) : 0;
      const curlOff = dt > 0 ? s.curl.step(flap * 1.2 + flutter * 1.5, dt) : 0;
      // young rays stand up as a pointed, gently cupped crown, then fall open and arch back
      const phi = lerp((s.ring ? 10 : 18) * DEG + s.seed * 6 * DEG, (s.ring ? 80 : 94) * DEG + s.seed * 8 * DEG, e) + pitch;
      const curl = lerp(s.ring ? 0.9 : 0.6, -0.25 + s.seed * 0.5 - s.ring * 0.15 - P.petalArch, e) + curlOff;
      const grow = smooth(0, 1, Math.min(1, b));
      const len = (s.ring ? 0.165 : 0.19) * (0.92 + s.seed * 0.16) * lerp(0.82, 1, grow) * P.petalLength;
      this.placePetal(this.petals, i, s.theta, phi, s.roll * e, DISC_R * 0.97, s.ring ? 0.004 : -0.004, len, s.w * lerp(0.7, 1, grow) * P.petalWidth);
      curlAttr.setX(i, curl);
    });
    this.petals.instanceMatrix.needsUpdate = true;
    curlAttr.needsUpdate = true;

    const bcurl = this.bracts.geometry.getAttribute('aCurl') as THREE.InstancedBufferAttribute;
    this.bractState.forEach((s, i) => {
      const b = smooth(0.02, 0.4 + s.delay, bloom);
      const flap = (swayVel * Math.cos(s.theta) - nodVel * Math.sin(s.theta)) * 0.15;
      const pitch = dt > 0 ? s.pitch.step(flap, dt) : 0;
      const phi = lerp((s.ring ? 4 : 10) * DEG, (106 + s.ring * 18) * DEG + s.seed * 10 * DEG, b) + pitch;
      const curl = lerp(s.ring ? 1.9 : 1.75, -0.9 - s.seed * 0.6, b);
      const len = lerp(s.ring ? 0.2 : 0.25, 0.095, b) * (0.85 + s.seed * 0.3) * (s.ring ? 0.9 : 1);
      this.placePetal(this.bracts, i, s.theta, phi, s.roll, DISC_R * (s.ring ? 0.86 : 0.95), s.ring ? -0.045 : -0.022, len, s.w * lerp(1.25, 1, b));
      bcurl.setX(i, curl);
    });
    this.bracts.instanceMatrix.needsUpdate = true;
    bcurl.needsUpdate = true;

    /* ---- leaves ride the stem and lag behind it ---- */
    const stemVel = this.stemSway.v + this.stemNod.v;
    for (const leaf of this.leaves) {
      this.spine(leaf.t, pt);
      leaf.group.position.copy(pt);
      const idle = this.reduced ? 0 : Math.sin(time * 0.9 + leaf.yaw) * 0.04;
      const sway = dt > 0 ? leaf.sway.step((stemVel * 0.25 + idle + this.windiness * 0.05 * Math.sin(time * 6 + leaf.t * 9)) * P.leafSway, dt) : 0;
      const lift = dt > 0 ? leaf.lift.step(-Math.abs(vel) * 0.15, dt) : 0;
      leaf.group.rotation.set(leaf.pitch + lift, leaf.yaw + sway, sway * 0.6, 'YXZ');
    }

    /* ---- pollen ---- */
    const pm = this.pollen.material as THREE.ShaderMaterial;
    pm.uniforms.time.value = time;

    /* ---- camera ---- */
    this.updateCamera(dt);
    pm.uniforms.opacity.value = clamp(2.2 - this.shot.dist, 0.25, 1) * smooth(0.1, 0.5, bloom);
    this.pollen.visible = P.pollen;
    this.pollen.position.set(0, 0.45, 0.05);

    if (this.onFrame) {
      this.scene.updateMatrixWorld();
      const out: Projected[] = [];
      const add = (id: string, v: THREE.Vector3) => {
        const s = v.project(this.camera);
        const inside = s.z < 1 && Math.abs(s.x) < 1.05 && Math.abs(s.y) < 1.05;
        out.push({ id, x: (s.x * 0.5 + 0.5) * this.size.w, y: (-s.y * 0.5 + 0.5) * this.size.h, visible: inside ? 1 : 0 });
      };
      add('rays', this.petalPoint(this.petals, 4, 0.78, new THREE.Vector3()));
      add('disc', new THREE.Vector3(-0.035, 0.05, 0.016).applyMatrix4(this.head.matrixWorld));
      add('centre', new THREE.Vector3(0.008, 0.006, 0.02).applyMatrix4(this.head.matrixWorld));
      add('stem', this.spine(0.9, new THREE.Vector3()));
      this.onFrame(out, { bloom });
    }
  }

  private updateCamera(dt: number) {
    const { w, h } = this.size;
    const P = this.params;
    const target = sampleShots(w < 768 ? MOBILE : DESKTOP, clamp(P.scrub ? P.scrubProgress : this.progress, 0, 1));
    const k = dt === 0 ? 1 : 1 - Math.exp(-dt * P.cameraFollow);
    const s = this.shot;
    s.az += (target.az - s.az) * k;
    s.el += (target.el - s.el) * k;
    s.dist += (target.dist - s.dist) * k;
    s.sx += (target.sx - s.sx) * k;
    s.sy += (target.sy - s.sy) * k;
    for (let i = 0; i < 3; i++) s.target[i] += (target.target[i] - s.target[i]) * k;
    const aspect = w / h;
    const fit = aspect < 1.2 ? 1 + (1.2 - aspect) * 0.35 : 1;
    const az = (s.az + this.pointerSmooth.x * 4 * P.parallax) * DEG;
    const el = (s.el + this.pointerSmooth.y * 3 * P.parallax) * DEG;
    const d = s.dist * fit;
    this.camera.position.set(s.target[0] + Math.sin(az) * Math.cos(el) * d, s.target[1] + Math.sin(el) * d, s.target[2] + Math.cos(az) * Math.cos(el) * d);
    this.camera.lookAt(s.target[0], s.target[1], s.target[2]);
    this.camera.setViewOffset(w, h, -s.sx * w, s.sy * h, w, h);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Compile shaders and upload buffers up front so the first scroll never hitches. */
  warm() {
    this.update(0);
    this.renderer.compile(this.scene, this.camera);
    this.render();
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.update(dt);
    this.render();
  }

  resetClock() {
    this.clock.getDelta();
  }

  dispose() {
    this.scene.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach(x => x.dispose());
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
