import * as THREE from 'three';

/*
 * The About diary as a real object: a stack of leaves on a desk, each leaf a strip of paper
 * hinged at the spine. A leaf's shape is one curve, worked out in the vertex shader: it leaves
 * the spine at angle θ and bends by a constant curvature along its width, so a turning page
 * lifts, arcs and lays itself down again instead of swinging like a door. The covers are the
 * same leaves with the bend switched off and a little board thickness. A block of paper under
 * each side shrinks and grows as the leaves move across, so the book has real heft.
 *
 * Page faces are textures (the page markup rasterised by the caller), so the book itself knows
 * nothing about what's printed on it.
 */

const W = 1; // page width; heights follow the page aspect
const COVER_T = 0.022; // board thickness
const BLOCK_T = 0.075; // the whole page block, split across the inner leaves
const PAPER = '#fbf8f0';
const CLOTH = '#2f4c8f';

const clamp = THREE.MathUtils.clamp;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

type LeafUniforms = {
  uTheta: { value: number };
  uCurl: { value: number };
  uCorner: { value: number };
  uLift: { value: number };
  uOffset: { value: number };
  uH: { value: number };
  uFold: { value: number };
};

// one curve for colour, normals and the shadow pass: arc of constant curvature k from the spine
const LEAF_HEAD = `uniform float uTheta; uniform float uCurl; uniform float uCorner; uniform float uLift; uniform float uOffset; uniform float uH;
varying float vFold;
float leafK(){ float v = 0.5 - position.z / uH; return uCurl * (1.0 + uCorner * (0.5 - v) * 1.6); }`;
const LEAF_NORMAL = `vec3 objectNormal;
  { float k = leafK(); float a = uTheta + k * position.x; objectNormal = vec3(-sin(a), cos(a), 0.0); }
  #ifdef USE_TANGENT
    vec3 objectTangent = vec3( tangent.xyz );
  #endif`;
const LEAF_BEGIN = `vec3 transformed;
  {
    float s = position.x; float k = leafK(); float a = uTheta + k * s;
    vec2 p = abs(k) > 1e-4 ? vec2(sin(a) - sin(uTheta), cos(uTheta) - cos(a)) / k : s * vec2(cos(uTheta), sin(uTheta));
    p += vec2(-sin(a), cos(a)) * uOffset;
    transformed = vec3(p.x, p.y + uLift, position.z);
    vFold = s;
  }`;

function leafMaterial(u: LeafUniforms, side: THREE.Side, color: string) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, side });
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${LEAF_HEAD}`)
      .replace('#include <beginnormal_vertex>', LEAF_NORMAL)
      .replace('#include <begin_vertex>', LEAF_BEGIN);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFold;\nvarying float vFold;')
      // paper darkens into the gutter
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(1.0 - 0.22 * uFold, 1.0, smoothstep(0.0, 0.16, vFold));');
  };
  m.customProgramCacheKey = () => 'diary-leaf';
  return m;
}

function leafDepth(u: LeafUniforms) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  m.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${LEAF_HEAD}`).replace('#include <begin_vertex>', LEAF_BEGIN);
  };
  m.customProgramCacheKey = () => 'diary-leaf-depth';
  return m;
}

/** Fine lines along the edge of the page block. */
function edgeTexture() {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#efe9da';
  g.fillRect(0, 0, 8, 128);
  for (let y = 0; y < 128; y += 2) {
    g.fillStyle = `rgba(120,104,70,${0.08 + 0.1 * ((y * 7) % 5) / 5})`;
    g.fillRect(0, y, 8, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A critically-ish damped spring towards 0 or 1. */
class Turn {
  t = 0;
  v = 0;
  target = 0;
  dir = 1;
  dragging = false;
  step(dt: number, k: number, c: number) {
    if (this.dragging) return;
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-k * (this.t - this.target) - c * this.v) * h;
      this.t += this.v * h;
    }
    // a page can't swing past lying flat: overshoot would sweep it under the stack and back
    if ((this.target === 1 && this.t > 1) || (this.target === 0 && this.t < 0)) {
      this.t = this.target;
      this.v = 0;
    }
    if (Math.abs(this.t - this.target) < 1e-4 && Math.abs(this.v) < 1e-3) {
      this.t = this.target;
      this.v = 0;
    }
  }
  get moving() {
    return this.dragging || this.t !== this.target || this.v !== 0;
  }
}

type Leaf = {
  hard: boolean;
  inner: boolean;
  u: LeafUniforms;
  front: THREE.Mesh;
  back: THREE.Mesh;
  frontMat: THREE.MeshStandardMaterial;
  backMat: THREE.MeshStandardMaterial;
  turn: Turn;
  corner: number;
};

export class DiaryBook {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(26, 1, 0.1, 40);
  private clock = new THREE.Clock();
  private book = new THREE.Group();
  private leaves: Leaf[] = [];
  private blocks: THREE.Mesh[] = [];
  private spine!: THREE.Mesh;
  private portrait = false;
  private textures: (THREE.Texture | null)[] = [];
  private H: number;
  private size = { w: 1, h: 1 };
  private reduced: boolean;
  private dirty = true;
  private shift = 0; // book slides so whatever is showing sits in the middle
  private hover: { leaf: number; amt: number } | null = null;
  private drag: { leaf: number; startX: number; startT: number; pageW: number; dir: 1 | -1; moved: boolean; lastX: number; lastT: number; vel: number } | null = null;
  private ndc = new THREE.Vector3();

  /** Leaves turned so far (0 = closed on the front cover). */
  spread = 0;
  onChange?: (spread: number) => void;

  constructor(
    private canvas: HTMLCanvasElement,
    pages: { hard?: boolean }[],
    aspect: number,
  ) {
    this.H = W * aspect;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.buildLights();
    this.buildLeaves(pages);
    this.buildBlocks();
    this.buildSpine();
    this.scene.add(this.book);
    this.textures = pages.map(() => null);
    this.layout(0);
    this.bindPointer();
  }

  /* ---------- build ---------- */

  private buildLights() {
    // three's Lambert divides by π, so these read as ≈0.7 key + 0.35 fill on white paper
    const key = new THREE.DirectionalLight('#fff6e8', 2.5);
    key.position.set(-2.2, 4.2, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 4;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.006;
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = -2.4;
    sc.right = 2.4;
    sc.top = 2;
    sc.bottom = -2;
    sc.near = 1;
    sc.far = 10;
    const hemi = new THREE.HemisphereLight('#ffffff', '#c9d2dc', 1.15);
    this.scene.add(key, hemi);

    // the desk: only the shadow is drawn, so the section's own colour shows through
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.ShadowMaterial({ color: '#1d3350', opacity: 0.22 }));
    desk.rotation.x = -Math.PI / 2;
    desk.position.y = -0.001;
    desk.receiveShadow = true;
    this.scene.add(desk);
  }

  private buildLeaves(pages: { hard?: boolean }[]) {
    const count = Math.ceil(pages.length / 2);
    for (let i = 0; i < count; i++) {
      const hard = !!pages[2 * i]?.hard || !!pages[2 * i + 1]?.hard;
      const inner = !hard;
      // covers overhang the paper a touch
      const lw = hard ? W * 1.025 : W;
      const lh = hard ? this.H * 1.03 : this.H;
      const geo = new THREE.PlaneGeometry(lw, lh, hard ? 1 : 48, hard ? 1 : 12);
      geo.rotateX(-Math.PI / 2);
      geo.translate(lw / 2, 0, 0);
      // the back face reads from the fore-edge towards the spine
      const backGeo = geo.clone();
      const uv = backGeo.getAttribute('uv') as THREE.BufferAttribute;
      for (let j = 0; j < uv.count; j++) uv.setX(j, 1 - uv.getX(j));

      const u: LeafUniforms = {
        uTheta: { value: 0 },
        uCurl: { value: 0 },
        uCorner: { value: 0 },
        uLift: { value: 0 },
        uOffset: { value: 0 },
        uH: { value: lh },
        uFold: { value: hard ? 0 : 1 },
      };
      const base = hard ? CLOTH : PAPER;
      // board thickness: a cover's two faces sit either side of the hinge line
      const fu = { ...u, uOffset: { value: hard ? COVER_T / 2 : 0 } };
      const bu = { ...u, uOffset: { value: hard ? -COVER_T / 2 : 0 } };
      const frontMat = leafMaterial(fu, THREE.FrontSide, base);
      const backMat = leafMaterial(bu, THREE.BackSide, base);
      const front = new THREE.Mesh(geo, frontMat);
      const back = new THREE.Mesh(backGeo, backMat);
      front.customDepthMaterial = leafDepth(fu);
      back.customDepthMaterial = leafDepth(bu);
      for (const m of [front, back]) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
        this.book.add(m);
      }
      this.leaves.push({ hard, inner, u, front, back, frontMat, backMat, turn: new Turn(), corner: 0.35 });
    }
  }

  private buildBlocks() {
    const tex = edgeTexture();
    const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    const top = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.95 });
    for (const dir of [1, -1]) {
      const g = new THREE.BoxGeometry(W * 0.985, 1, this.H * 0.985);
      g.translate((dir * W * 0.985) / 2, 0.5, 0);
      // +x, -x, +y, -y, +z, -z
      const block = new THREE.Mesh(g, [side, side, top, top, side, side]);
      block.castShadow = true;
      block.receiveShadow = true;
      this.blocks.push(block);
      this.book.add(block);
    }
  }

  /** The cloth spine: a half-round joining the boards, seen while the book is shut. */
  private buildSpine() {
    const g = new THREE.CylinderGeometry(1, 1, this.H * 1.03, 24, 1, true, Math.PI, Math.PI);
    g.rotateX(Math.PI / 2);
    this.spine = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: CLOTH, roughness: 0.8, side: THREE.DoubleSide }));
    this.spine.castShadow = true;
    this.book.add(this.spine);
  }

  /* ---------- pages ---------- */

  /** Give page `i` its printed face. Even pages are fronts, odd pages backs. */
  setPage(i: number, source: HTMLCanvasElement) {
    const leaf = this.leaves[i >> 1];
    if (!leaf) return;
    const tex = new THREE.CanvasTexture(source);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures[i]?.dispose();
    this.textures[i] = tex;
    const mat = i % 2 ? leaf.backMat : leaf.frontMat;
    mat.map = tex;
    mat.color.set('#ffffff');
    mat.needsUpdate = true;
    this.dirty = true;
  }

  /* ---------- turning ---------- */

  get leafCount() {
    return this.leaves.length;
  }

  next() {
    this.go(Math.min(this.leaves.length, this.spread + 1));
  }

  prev() {
    this.go(Math.max(0, this.spread - 1));
  }

  go(spread: number) {
    const dir = spread > this.spread ? 1 : spread < this.spread ? -1 : 0;
    this.leaves.forEach((l, i) => {
      const target = i < spread ? 1 : 0;
      if (l.turn.target !== target) {
        l.turn.target = target;
        if (dir) {
          l.turn.dir = dir;
          l.corner = 0.35;
        }
      }
      if (this.reduced) {
        l.turn.t = target;
        l.turn.v = 0;
      }
    });
    this.setSpread(spread);
  }

  private setSpread(s: number) {
    if (s === this.spread) return;
    this.spread = s;
    this.dirty = true;
    this.onChange?.(s);
  }

  /* ---------- pointer: drag a page, click a side, a peel on hover ---------- */

  private bindPointer() {
    const c = this.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('pointerleave', this.onLeave);
  }

  /** Screen x of the spine and the on-screen width of one page, for mapping drags. */
  private screenFrame() {
    const r = this.canvas.getBoundingClientRect();
    const toX = (x: number) => {
      this.ndc.set(x, 0, 0).applyMatrix4(this.book.matrixWorld).project(this.camera);
      return r.left + (this.ndc.x * 0.5 + 0.5) * r.width;
    };
    return { spine: toX(0), pageW: Math.abs(toX(W) - toX(0)), top: r.top, height: r.height };
  }

  private sideAt(x: number): 1 | -1 | 0 {
    const { spine, pageW } = this.screenFrame();
    if (x > spine && x < spine + pageW * 1.05 && this.spread < this.leaves.length) return 1;
    if (x < spine && x > spine - pageW * 1.05 && this.spread > 0) return -1;
    return 0;
  }

  private onDown = (e: PointerEvent) => {
    const dir = this.sideAt(e.clientX);
    if (!dir) return;
    const leaf = dir === 1 ? this.spread : this.spread - 1;
    const l = this.leaves[leaf];
    const { pageW, top, height } = this.screenFrame();
    // grab near the top or bottom and that corner leads
    l.corner = ((e.clientY - top) / height - 0.5) * 2 * 0.6 + 0.1;
    l.turn.dragging = true;
    l.turn.dir = dir;
    this.drag = { leaf, startX: e.clientX, startT: l.turn.t, pageW, dir, moved: false, lastX: e.clientX, lastT: performance.now(), vel: 0 };
    this.hover = null;
    this.canvas.setPointerCapture(e.pointerId);
    this.dirty = true;
  };

  private onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (d) {
      const dx = e.clientX - d.startX;
      if (Math.abs(dx) > 4) d.moved = true;
      const l = this.leaves[d.leaf].turn;
      // a full turn is about a page and a half of travel
      l.t = clamp(d.startT - dx / (d.pageW * 1.5), 0, 1);
      const now = performance.now();
      const dt = Math.max(1, now - d.lastT);
      d.vel = d.vel * 0.6 + (-(e.clientX - d.lastX) / d.pageW / (dt / 1000)) * 0.4;
      d.lastX = e.clientX;
      d.lastT = now;
      this.dirty = true;
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const dir = this.sideAt(e.clientX);
    this.canvas.style.cursor = dir ? 'grab' : '';
    const { spine, pageW } = this.screenFrame();
    // the outer third of a page peels up a little, hinting that it turns
    const near = dir === 1 ? (e.clientX - spine) / pageW : dir === -1 ? (spine - e.clientX) / pageW : 0;
    const leaf = dir === 1 ? this.spread : this.spread - 1;
    const next = dir && near > 0.62 ? { leaf, amt: smooth(0.62, 1, near) * 0.05 } : null;
    if (next?.leaf !== this.hover?.leaf || Math.abs((next?.amt ?? 0) - (this.hover?.amt ?? 0)) > 0.002) {
      this.hover = next;
      this.dirty = true;
    }
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const l = this.leaves[d.leaf];
    l.turn.dragging = false;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    let done: boolean;
    if (!d.moved) done = true; // a click turns the page
    else {
      // released past the middle, or flicked the right way, and it goes over
      const fling = d.vel * (d.dir === 1 ? 1 : -1);
      const progress = d.dir === 1 ? l.turn.t : 1 - l.turn.t;
      done = progress > 0.45 || fling > 1.2;
      if (progress < 0.2 && fling < 0.6) done = false;
    }
    if (done) {
      if (!d.moved) l.corner = 0.35;
      this.go(d.dir === 1 ? d.leaf + 1 : d.leaf);
    } else {
      this.go(d.dir === 1 ? d.leaf : d.leaf + 1);
    }
    l.turn.v = d.moved ? d.vel * 0.6 : 0;
    this.dirty = true;
  };

  private onLeave = () => {
    if (this.hover) {
      this.hover = null;
      this.dirty = true;
    }
    this.canvas.style.cursor = '';
  };

  /* ---------- per frame ---------- */

  resize(w: number, h: number) {
    this.size = { w, h };
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // frame the open spread with a little desk around it; a portrait screen frames one page
    this.portrait = w / h < 0.9;
    const fovY = THREE.MathUtils.degToRad(this.camera.fov);
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * this.camera.aspect);
    const needW = W * (this.portrait ? 1.12 : 2 * 1.12);
    const needH = this.H * 1.12;
    const dist = Math.max(needW / 2 / Math.tan(fovX / 2), needH / 2 / Math.tan(fovY / 2) / 0.86);
    const el = THREE.MathUtils.degToRad(58);
    this.camera.position.set(0, Math.sin(el) * dist, Math.cos(el) * dist);
    this.camera.lookAt(0, 0, 0.02);
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  /** Place every leaf and the page blocks for the current turn progress. */
  private layout(dt: number) {
    const L = this.leaves.length;
    const innerIdx = this.leaves.map((l, i) => (l.inner ? i : -1)).filter(i => i >= 0);
    const share = BLOCK_T / Math.max(1, innerIdx.length);
    // paper still to read sits on the right; paper already read on the left. A leaf leaves its
    // block as soon as it lifts and joins the other one only as it lands, so the page beneath a
    // turning leaf is already showing.
    const onRight = (i: number) => 1 - smooth(0, 0.08, this.leaves[i].turn.t);
    const onLeft = (i: number) => smooth(0.92, 1, this.leaves[i].turn.t);
    let rightPaper = 0;
    let leftPaper = 0;
    for (const i of innerIdx) {
      rightPaper += onRight(i) * share;
      leftPaper += onLeft(i) * share;
    }
    const back = this.leaves[L - 1];
    const front = this.leaves[0];
    const backOnRight = 1 - smooth(0, 0.08, back.turn.t);
    const frontOnLeft = smooth(0.92, 1, front.turn.t);

    this.leaves.forEach((l, i) => {
      const t = l.turn.t;
      // the stack height this leaf rests on, on each side
      let below = 0;
      for (const j of innerIdx) if (j > i) below += onRight(j) * share;
      let belowLeft = 0;
      for (const j of innerIdx) if (j < i) belowLeft += onLeft(j) * share;
      // a leaf rests on top of the block it belongs to (its own share is already in the block)
      const rightY = (i === L - 1 ? 0 : COVER_T * backOnRight) + below + (l.hard ? COVER_T / 2 : share);
      const leftY = (i === 0 ? 0 : COVER_T * frontOnLeft) + belowLeft + (l.hard ? COVER_T / 2 : share);
      // a hair above the block and each other, so no two faces share a depth
      const lift = THREE.MathUtils.lerp(rightY, leftY, smooth(0, 1, t)) + 0.0015 + (l.hard ? 0.0015 : 0) + Math.min(i, L - 1 - i) * 0.0004;
      const theta = THREE.MathUtils.lerp(0.002, Math.PI - 0.002, t);
      // paper bends while it travels, the leading edge ahead; covers stay flat
      const bend = Math.sin(Math.PI * clamp(t, 0, 1));
      const hover = this.hover?.leaf === i ? this.hover.amt : 0;
      const curl = l.hard ? 0 : (1.35 * bend + 0.25 * clamp(l.turn.v * l.turn.dir, -1.5, 1.5) * bend) * l.turn.dir + hover * 6 * (i < this.spread ? -1 : 1);
      l.u.uTheta.value = theta + hover * (i < this.spread ? -1 : 1);
      l.u.uCurl.value = curl;
      l.u.uCorner.value = l.hard ? 0 : l.corner;
      l.u.uLift.value = lift;
    });

    // shut on the front, the spine bulges out to the left; shut on the back, to the right; open, it lies flat beneath
    const r = (COVER_T * 2 + BLOCK_T) / 2;
    const shut = 1 - smooth(0, 0.5, front.turn.t) - smooth(0.5, 1, back.turn.t);
    this.spine.scale.set(Math.max(1e-3, Math.abs(shut)) * r * 0.7 * Math.sign(shut || 1), r, 1);
    this.spine.position.set(0, r, 0);
    this.spine.visible = Math.abs(shut) > 0.02;

    const [rb, lb] = this.blocks;
    rb.position.y = COVER_T * backOnRight;
    rb.scale.y = Math.max(1e-4, rightPaper);
    rb.visible = rightPaper > 1e-3;
    lb.position.y = COVER_T * frontOnLeft;
    lb.scale.y = Math.max(1e-4, leftPaper);
    lb.visible = leftPaper > 1e-3;

    const target = this.shiftTarget;
    const k = dt === 0 || this.reduced ? 1 : 1 - Math.exp(-dt * 5);
    this.shift += (target - this.shift) * k;
    if (Math.abs(target - this.shift) < 1e-4) this.shift = target;
    this.book.position.x = this.shift;
  }

  /** Closed books sit centred and an open one centres on the spine; on a phone the page being read is centred. */
  private get shiftTarget() {
    const L = this.leaves.length;
    if (this.spread === L) return W / 2;
    if (this.portrait || this.spread === 0) return -W / 2;
    return 0;
  }

  private get busy() {
    return this.leaves.some(l => l.turn.moving) || this.shift !== this.shiftTarget;
  }

  /** Advance and draw; returns false once everything has settled, so the caller can stop the loop. */
  tick() {
    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    if (!this.dirty && !this.busy) return false;
    for (const l of this.leaves) l.turn.step(dt, 60, 13);
    // dragging decides the spread live, so the label keeps up
    if (this.drag) {
      const l = this.leaves[this.drag.leaf].turn;
      const s = l.t > 0.5 ? this.drag.leaf + 1 : this.drag.leaf;
      if (s !== this.spread) this.setSpread(s);
    }
    this.layout(dt);
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    return true;
  }

  /** Wake the loop after an outside change. */
  get needsFrame() {
    return this.dirty || this.busy;
  }

  resetClock() {
    this.clock.getDelta();
  }

  async warm() {
    this.layout(0);
    await this.renderer.compileAsync(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('pointerleave', this.onLeave);
    this.textures.forEach(t => t?.dispose());
    this.scene.traverse(o => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach(x => x.dispose());
      (m.customDepthMaterial as THREE.Material | undefined)?.dispose();
    });
    this.renderer.dispose();
  }
}
