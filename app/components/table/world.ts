import * as THREE from 'three';
import { makeCloth } from './cloth';
import { makeSky, skyAt, sunUniforms } from './light';
import { SEGMENTS, hourAt, locate, phase, type ChapterId } from './timeline';
import type { Ukulele } from './ukulele';
import { clamp, damp, easeInOut, lerp, smooth } from './util';

/*
 * The table. One scene, one camera looking straight down, one sun that follows the clock.
 * Chapters own their objects and say where the camera should be; the world blends between
 * them as the scroll travels, and routes the pointer to whatever is under it.
 */

export type View = { x: number; z: number; w: number; h: number };

export type Hotspot = {
  object: THREE.Object3D;
  cursor?: 'pointer' | 'grab' | 'crosshair' | 'default';
  label?: string;
  onEnter?: () => void;
  onLeave?: () => void;
  onClick?: (hit: THREE.Intersection) => void;
  onDown?: (hit: THREE.Intersection) => boolean | void;
  onMove?: (hit: THREE.Intersection | null, ray: THREE.Ray) => void;
  onUp?: () => void;
  /** Ignore unless the chapter is on screen. */
  chapter?: ChapterId;
};

export interface Chapter {
  id: ChapterId;
  group: THREE.Group;
  /** Paint textures and build meshes. Called once, nearest chapters first. */
  build(world: TableWorld): Promise<void>;
  /** Where the camera should frame, at hold progress u (0 → 1). */
  view(u: number, aspect: number): View;
  /** ph: −1 → 0 arriving, 0 → 1 holding, 1 → 2 leaving. */
  update(ph: number, dt: number, world: TableWorld): void;
  /** Is anything still animating on its own (springs settling)? */
  busy?(): boolean;
}

export type FrameInfo = { hour: number; chapter: ChapterId; progress: number; u: number };

const FOV = 30;
/** How far behind the scroll the camera runs, in seconds (a spring's smoothing time). */
const CAMERA_LAG = 0.24;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

export class TableWorld {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 1, 6000);
  readonly sun = new THREE.DirectionalLight('#fff', 3);
  readonly hemi = new THREE.HemisphereLight('#fff', '#888', 1);
  readonly lamp = new THREE.SpotLight('#ffc48c', 0, 0, 0.36, 0.95, 0);
  readonly chapters: Chapter[] = [];
  readonly hotspots: Hotspot[] = [];
  /** Layer for contact shades, under everything else. */
  readonly shades = new THREE.Group();

  progress = 0;
  pointer = new THREE.Vector2(0, 0);
  /** When the pointer last moved over the table (ms), so stale positions can be ignored. */
  pointerAt = 0;
  /** Smoothed pointer, for the small parallax. */
  private look = new THREE.Vector2();
  hour = 7;
  current: ChapterId = 'hero';
  view: View = { x: 0, z: 0, w: 100, h: 60 };
  onFrame?: (info: FrameInfo) => void;
  onCursor?: (cursor: string) => void;
  /** Scroll the page to a point in a chapter (set by the page). */
  goTo?: (id: ChapterId, into?: number) => void;
  /** Open a link (set by the page, so it can use a real anchor). */
  open?: (href: string) => void;
  /** Show a short message (set by the page). */
  onToast?: (message: string) => void;
  reduced = false;
  /** 0 at night → 1 in full sun. */
  daylight = 1;
  /** 0 → 1 as the desk lamp comes on. */
  lampOn = 0;
  /** The ukulele, once it's on the table. */
  uke?: Ukulele;
  /** While set, only this answers the pointer (the ukulele, in your hands). */
  exclusive: Hotspot | null = null;
  /** A press that lands on nothing while something is exclusive. */
  onOutside?: () => void;
  /** The ukulele was picked up or put down (set by the page). */
  onJam?: (open: boolean) => void;
  /** 0 → 1 as the camera leaves the scroll's framing for a close-up. */
  private focusAmt = 0;
  private focusView: View = { x: 0, z: 0, w: 60, h: 40 };
  /** The camera's framing as it follows its target, and how fast it's moving. */
  private cam = { x: 0, z: 0, h: 60, vx: 0, vz: 0, vh: 0, ready: false };

  private sky = makeSky();
  private size = { w: 1, h: 1 };
  private raf = 0;
  private last = 0;
  private time = 0;
  private running = false;
  private raycaster = new THREE.Raycaster();
  private hovered: Hotspot | null = null;
  private captured: Hotspot | null = null;
  private downAt = { x: 0, y: 0, t: 0 };
  private disposed = false;
  private canvas: HTMLCanvasElement;
  private idleFor = 0;
  private lastProgress = -1;
  private frameSkip = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor('#20283a');
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.camera.up.set(0, 0, -1);

    // paper has no thickness, so each sheet would shade its own underside: push lookups out
    // along the normal by about a shadow texel to keep both faces clean
    const big = !matchMedia('(pointer: coarse)').matches && Math.max(screen.width, screen.height) >= 1200;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(big ? 4096 : 2048);
    this.sun.shadow.radius = 2;
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = big ? 0.04 : 0.08;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 900;
    this.scene.add(this.sun, this.sun.target, this.hemi);

    this.lamp.castShadow = true;
    this.lamp.shadow.mapSize.set(1024, 1024);
    this.lamp.shadow.radius = 3;
    this.lamp.shadow.bias = -0.0004;
    this.lamp.shadow.normalBias = 0.15;
    this.lamp.shadow.camera.near = 20;
    this.lamp.shadow.camera.far = 400;
    this.scene.add(this.lamp, this.lamp.target);

    this.scene.add(this.shades);
    this.scene.add(makeCloth(this.renderer, { w: 1400, h: 2200, cx: 0, cz: 300 }));

    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  add(chapter: Chapter) {
    this.chapters.push(chapter);
    this.scene.add(chapter.group);
  }

  chapter(id: ChapterId) {
    return this.chapters.find(c => c.id === id);
  }

  /* ---------------------------------------------------------------- */

  resize(w: number, h: number) {
    this.size = { w, h };
    // a big canvas of mostly paper and cloth: 1.75× is plenty, and keeps the fill rate sane
    const dpr = Math.min(window.devicePixelRatio || 1, w * h > 1.6e6 ? 1.5 : 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // a new shape (a phone turned over) is a new framing: cut to it rather than gliding
    this.cam.ready = false;
    this.kick();
  }

  get aspect() {
    return this.size.w / this.size.h;
  }

  /** Where the camera should be for scroll progress p. */
  viewAt(p: number): View {
    const { segment, index, u } = locate(p);
    const a = this.aspect;
    if (segment.id !== 'travel') {
      const c = this.chapter(segment.id);
      return c ? c.view(u, a) : this.view;
    }
    const from = this.chapter(SEGMENTS[index - 1].id as ChapterId);
    const to = this.chapter(SEGMENTS[index + 1].id as ChapterId);
    if (!from || !to) return (from ?? to)?.view(from ? 1 : 0, a) ?? this.view;
    const va = from.view(1, a);
    const vb = to.view(0, a);
    // smoothstep, not a cubic ease: the same glide with half the shove at either end
    const t = smooth(u);
    // rise a little in the middle of the journey, like leaning back from the table
    const hop = 1 + 0.22 * Math.sin(Math.PI * u);
    return { x: lerp(va.x, vb.x, t), z: lerp(va.z, vb.z, t), w: lerp(va.w, vb.w, t) * hop, h: lerp(va.h, vb.h, t) * hop };
  }

  /** Point on the table under a screen position (css px). */
  tableAt(x: number, y: number, out = new THREE.Vector3(), height = 0) {
    this.raycaster.setFromCamera(new THREE.Vector2((x / this.size.w) * 2 - 1, -(y / this.size.h) * 2 + 1), this.camera);
    const r = this.raycaster.ray;
    const t = (height - r.origin.y) / r.direction.y;
    return out.copy(r.origin).addScaledVector(r.direction, t);
  }

  /** Screen position (css px) of a world point. */
  toScreen(v: THREE.Vector3, out = { x: 0, y: 0 }) {
    const p = v.clone().project(this.camera);
    out.x = (p.x * 0.5 + 0.5) * this.size.w;
    out.y = (-p.y * 0.5 + 0.5) * this.size.h;
    return out;
  }

  /**
   * Point the camera at a framing. It doesn't jump to what the scroll asks for: it follows on a
   * critically damped spring, so a flick of the wheel or a swipe arrives as a glide, never a jolt.
   * Over that, the faint drift of a camera held in a hand, and the pointer's parallax.
   */
  private frame(v: View, dt: number, snap = false) {
    const a = this.aspect;
    const visH = Math.max(v.h, v.w / a);
    const c = this.cam;
    if (snap || !c.ready) {
      Object.assign(c, { x: v.x, z: v.z, h: visH, vx: 0, vz: 0, vh: 0, ready: true });
    } else {
      [c.x, c.vx] = smoothDamp(c.x, v.x, c.vx, CAMERA_LAG, dt);
      [c.z, c.vz] = smoothDamp(c.z, v.z, c.vz, CAMERA_LAG, dt);
      [c.h, c.vh] = smoothDamp(c.h, visH, c.vh, CAMERA_LAG, dt);
    }
    const h = c.h;
    const d = h / 2 / TAN;
    this.look.x = damp(this.look.x, this.pointer.x, 3, dt);
    this.look.y = damp(this.look.y, this.pointer.y, 3, dt);
    // a touch of parallax: anything lifted off the cloth drifts against it
    // (held still for a close-up, so what's under the pointer stays put)
    const still = this.reduced ? 0 : 1 - this.focusAmt;
    const px = this.look.x * h * 0.012 * still;
    const pz = -this.look.y * h * 0.012 * still;
    // held, not on a tripod: a slow wander of a few millimetres, a breath in the height, the
    // faintest roll; calmer in a close-up, and none at all for reduced motion
    const t = this.time;
    const hand = this.reduced ? 0 : (1 - this.focusAmt * 0.65) * h;
    const hx = hand * 0.0028 * (Math.sin(t * 0.41) * 0.6 + Math.sin(t * 0.97 + 1.3) * 0.3 + Math.sin(t * 1.83 + 0.4) * 0.1);
    const hz = hand * 0.0024 * (Math.sin(t * 0.33 + 2.1) * 0.6 + Math.sin(t * 0.79 + 0.7) * 0.3 + Math.sin(t * 1.61 + 2.9) * 0.1);
    const breathe = 1 + (this.reduced ? 0 : 0.0035 * Math.sin(t * 0.27 + 0.5));
    const roll = this.reduced ? 0 : 0.0018 * (Math.sin(t * 0.23 + 1.1) * 0.7 + Math.sin(t * 0.61) * 0.3);
    this.camera.position.set(c.x + px + hx, d * breathe, c.z + pz + hz);
    this.camera.near = Math.max(1, d * 0.2);
    this.camera.far = d * 3 + 200;
    this.camera.updateProjectionMatrix();
    this.camera.up.set(Math.sin(roll), 0, -Math.cos(roll));
    // the lens points a little behind where the hand moves, so the drift reads as a tilt too
    this.camera.lookAt(c.x + px * 0.6 + hx * 0.4, 0, c.z + pz * 0.6 + hz * 0.4);
    this.view = { x: c.x, z: c.z, w: h * a, h };
  }

  private light(dt: number) {
    const s = skyAt(this.hour, this.sky);
    const v = this.view;
    const reach = Math.max(v.w, v.h) * 0.62 + 30;
    // so the table's brightness is what the keys say, whatever the sun's angle
    this.sun.intensity = (s.sun * Math.PI) / Math.max(0.3, s.dir.y);
    this.sun.color.copy(s.sunColor);
    this.sun.target.position.set(v.x, 0, v.z);
    this.sun.position.copy(this.sun.target.position).addScaledVector(s.dir, 400);
    const sc = this.sun.shadow.camera;
    if (sc.right !== reach) {
      sc.left = -reach;
      sc.right = reach;
      sc.top = reach;
      sc.bottom = -reach;
      sc.updateProjectionMatrix();
    }
    this.hemi.intensity = s.hemi * Math.PI;
    this.hemi.color.copy(s.sky);
    this.hemi.groundColor.copy(s.ground);
    this.renderer.toneMappingExposure = s.exposure;

    this.daylight = clamp(s.sun / 0.75);
    this.lampOn = s.lamp;
    this.lamp.intensity = s.lamp * 2.7;
    // switching a light or its shadow off would recompile every material, so the lamp stays
    // on at zero and only its shadow map stops being redrawn
    this.lamp.shadow.autoUpdate = s.lamp > 0.01;

    sunUniforms.uTime.value = this.reduced ? 0 : this.time;
    sunUniforms.uSlope.value.set(s.dir.x / s.dir.y, s.dir.z / s.dir.y);
    sunUniforms.uView.value.set(v.x, v.z, v.w / 2, v.h / 2);
    void dt;
  }

  /** The lamp lives over one spot of the table (set by the chapter that owns the desk lamp). */
  placeLamp(x: number, z: number, height = 95) {
    this.lamp.position.set(x - 26, height, z - 22);
    this.lamp.target.position.set(x, 0, z);
  }

  /* ---------------------------------------------------------------- */

  private pick(x: number, y: number) {
    const ndc = new THREE.Vector2((x / this.size.w) * 2 - 1, -(y / this.size.h) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const live = this.exclusive ? [this.exclusive] : this.hotspots.filter(h => h.object.visible && (!h.chapter || h.chapter === this.current) && visibleInTree(h.object));
    if (!live.length) return null;
    const hits = this.raycaster.intersectObjects(
      live.map(h => h.object),
      true,
    );
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        const h = live.find(s => s.object === o);
        if (h) return { spot: h, hit };
        o = o.parent;
      }
    }
    return null;
  }

  pointerMove(x: number, y: number) {
    this.pointer.set((x / this.size.w) * 2 - 1, -(y / this.size.h) * 2 + 1);
    this.pointerAt = performance.now();
    this.kick();
    if (this.captured) {
      const p = this.pick(x, y);
      this.captured.onMove?.(p && p.spot === this.captured ? p.hit : null, this.raycaster.ray);
      return;
    }
    const p = this.pick(x, y);
    const spot = p?.spot ?? null;
    if (spot !== this.hovered) {
      this.hovered?.onLeave?.();
      this.hovered = spot;
      spot?.onEnter?.();
      this.onCursor?.(spot?.cursor ?? 'default');
    }
    if (spot && p) spot.onMove?.(p.hit, this.raycaster.ray);
  }

  /**
   * What the press landed on: 'drag' when something has taken the pointer (so the page should hold
   * still), 'tap' when it may become a click, null for bare cloth.
   */
  pointerDown(x: number, y: number): 'drag' | 'tap' | null {
    this.downAt = { x, y, t: performance.now() };
    const p = this.pick(x, y);
    if (!p) {
      if (this.exclusive) this.onOutside?.();
      return null;
    }
    if (p.spot.onDown?.(p.hit)) {
      this.captured = p.spot;
      return 'drag';
    }
    return p.spot.onClick ? 'tap' : null;
  }

  pointerUp(x: number, y: number) {
    const moved = Math.hypot(x - this.downAt.x, y - this.downAt.y);
    if (this.captured) {
      this.captured.onUp?.();
      this.captured = null;
      return;
    }
    if (moved > 8 || performance.now() - this.downAt.t > 700) return;
    const p = this.pick(x, y);
    p?.spot.onClick?.(p.hit);
  }

  /** The browser took the gesture (a scroll began): finish any drag, but it was never a click. */
  pointerCancel() {
    this.captured?.onUp?.();
    this.captured = null;
  }

  pointerLeave() {
    this.pointer.set(0, 0);
    this.pointerAt = 0;
    this.hovered?.onLeave?.();
    this.hovered = null;
    this.onCursor?.('default');
  }

  /* ---------------------------------------------------------------- */

  async build(onProgress?: (f: number) => void) {
    // the first chapter first, so the page can open as soon as it's ready; the rest follow
    const order = [...this.chapters];
    let done = 0;
    for (const c of order) {
      await c.build(this);
      done++;
      onProgress?.(done / order.length);
      if (this.disposed) return;
    }
  }

  async warm() {
    this.frame(this.viewAt(this.progress), 0, true);
    this.light(0);
    await this.renderer.compileAsync(this.scene, this.camera);
    this.update(0);
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      // nothing moving but the leaves? draw every other frame
      const c = this.cam;
      const settled = Math.abs(c.vx) + Math.abs(c.vz) + Math.abs(c.vh) < c.h * 0.002;
      const still = settled && Math.abs(this.progress - this.lastProgress) < 1e-6 && !this.captured && !this.uke?.busy && (this.focusAmt === 0 || this.focusAmt === 1) && !this.chapters.some(c => c.busy?.());
      this.idleFor = still ? this.idleFor + dt : 0;
      this.lastProgress = this.progress;
      if (this.idleFor > 1.2 && (this.frameSkip++ & 1)) return;
      this.time += dt;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  kick() {
    this.idleFor = 0;
  }

  /** Things that live on the table whatever the chapter (the ladybug). */
  readonly life: { update(dt: number, world: TableWorld): void }[] = [];

  private update(dt: number) {
    const p = this.progress;
    this.hour = hourAt(p);
    const { segment, u } = locate(p);
    if (segment.id !== 'travel') this.current = segment.id;
    else this.current = u < 0.5 ? (SEGMENTS[locate(p).index - 1].id as ChapterId) : (SEGMENTS[locate(p).index + 1].id as ChapterId);
    const focus = this.uke?.focus ?? null;
    if (focus) this.focusView = focus;
    this.focusAmt = damp(this.focusAmt, focus ? 1 : 0, 2.6, dt);
    if (Math.abs(this.focusAmt - (focus ? 1 : 0)) < 0.0005) this.focusAmt = focus ? 1 : 0;
    const v = this.viewAt(p);
    const f = easeInOut(this.focusAmt);
    const fv = this.focusView;
    this.frame(f > 0 ? { x: lerp(v.x, fv.x, f), z: lerp(v.z, fv.z, f), w: lerp(v.w, fv.w, f), h: lerp(v.h, fv.h, f) } : v, dt);
    this.light(dt);
    for (const c of this.chapters) c.update(phase(p, c.id), dt, this);
    for (const l of this.life) l.update(dt, this);
    for (const s of this.shades.children) (s.userData.sheet as { placeShade(): void } | undefined)?.placeShade();
    this.onFrame?.({ hour: this.hour, chapter: this.current, progress: p, u });
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.uke?.dispose();
    this.scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
        mat.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    void this.canvas;
  }
}

/** Unity's SmoothDamp: a critically damped spring towards target. Returns [value, velocity]. */
function smoothDamp(current: number, target: number, velocity: number, time: number, dt: number): [number, number] {
  if (dt <= 0) return [current, velocity];
  const omega = 2 / time;
  const x = omega * dt;
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity + omega * change) * dt;
  return [target + (change + temp) * e, (velocity - omega * temp) * e];
}

function visibleInTree(o: THREE.Object3D) {
  let n: THREE.Object3D | null = o;
  while (n) {
    if (!n.visible) return false;
    n = n.parent;
  }
  return true;
}
