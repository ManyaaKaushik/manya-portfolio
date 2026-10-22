import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { withSun } from './light';
import { clamp, damp, hump, lerp } from './util';
import type { UkeSound } from './uke-sound';
import { CHORDS, type ChordName } from './uke-song';
import type { ChapterId } from './timeline';
import type { Hotspot, TableWorld, View } from './world';

/*
 * Manya's ukulele, stickers and all, lying on the table by the morning's letter. Pick it up and it plays
 * a little of Sailor Song; then it's yours: swipe across the strings to strum, choose a chord, or
 * have it play again. While it's in your hands the page holds still, and putting it down (or
 * trying to scroll) stops the music.
 */

// the model's own units: a 34.6 cm soprano scale from the nut to the saddle
const NUT = 1515;
const SADDLE = -504;
const SCALE = NUT - SADDLE;
const S = 34.6 / SCALE;
const CENTRE = 605; // middle of its length
const BACK = -211; // the back of the body
const STRING_Z = 30; // height of the strings over the top
const STRUM_Y = 430; // where the neck meets the body, where you'd strum

export type Pose = { x: number; z: number; r: number };

export type JamState = {
  open: boolean;
  loading: boolean;
  chord: ChordName;
  playing: boolean;
  /** Autoplay's place: bar and sixteenth, −1 when it isn't playing. */
  bar: number;
  step: number;
  /** Has the song been heard once (so the hint can hand over to you). */
  played: boolean;
};

type Str = { uniforms: { uAmp: { value: number }; uT: { value: number }; uSpan: { value: THREE.Vector2 } }; x0: number; x1: number; reach: number };

let soundModule: Promise<typeof import('./uke-sound')> | null = null;
const loadSound = () => (soundModule ??= import('./uke-sound'));

export class Ukulele {
  readonly group = new THREE.Group();
  private model = new THREE.Group();
  private strings: Str[] = [];
  private amps = [0, 0, 0, 0];
  private dots: THREE.Mesh[] = [];
  private dotAt: THREE.Vector3[] = [];
  private pick!: THREE.Mesh;
  private pad!: THREE.Mesh;
  private pickAt = new THREE.Vector3(0, STRUM_Y, 60);
  private pickTo = new THREE.Vector3(0, STRUM_Y, 60);
  private sweep = { t: 1, dir: 1 as 1 | -1 };
  private sound: UkeSound | null = null;
  private audio: AudioContext | null = null;
  private world!: TableWorld;
  private spot!: Hotspot;
  private openAmt = 0;
  private hoverAmt = 0;
  private hovered = false;
  private rest: Pose = { x: 0, z: 0, r: 0 };
  private jam: Pose = { x: 0, z: 0, r: 0 };
  private portrait = false;
  private press: { last: THREE.Vector3 | null; at: number; plucked: boolean } | null = null;
  private plane = new THREE.Plane();
  private hit = new THREE.Vector3();
  private ready = false;
  /** Scroll progress when it was picked up. */
  openedAt = 0;
  constructor(private chapter: ChapterId) {}

  state: JamState = { open: false, loading: false, chord: 'Emaj7', playing: false, bar: -1, step: -1, played: false };
  onState?: (s: JamState) => void;

  async load(world: TableWorld) {
    this.world = world;
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync('/assets/ukulele.glb');
    const root = gltf.scene;
    root.updateMatrixWorld(true);

    const found: { mesh: THREE.Mesh; x0: number; x1: number }[] = [];
    root.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const mat = m.material as THREE.MeshStandardMaterial;
      // the four strings are their own meshes; the rest of what shares their material is the frets' ends and ties
      // (three drops the dots from node names: ukulele.001_chords_0 arrives as ukulele001_chords_0)
      if (/^ukulele\.?00\d_chords/.test(m.name)) {
        const x = (y: number) => {
          const pos = m.geometry.attributes.position as THREE.BufferAttribute;
          const v = new THREE.Vector3();
          let sum = 0;
          let n = 0;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
            if (Math.abs(v.y - y) < 60) (sum += v.x), n++;
          }
          return n ? sum / n : 0;
        };
        found.push({ mesh: m, x0: x(SADDLE), x1: x(NUT) });
        return;
      }
      m.material = withSun(mat, 'uke');
    });

    // low to high across the neck: G, C, E, A
    found.sort((a, b) => a.x0 - b.x0);
    for (const [i, f] of found.entries()) {
      const m = f.mesh;
      const uniforms = { uAmp: { value: 0 }, uT: { value: i * 1.7 }, uSpan: { value: new THREE.Vector2((SADDLE - m.position.y) / m.scale.y, (NUT - m.position.y) / m.scale.y) } };
      // a plucked string blurs along its length, most in the middle
      m.material = withSun((m.material as THREE.Material).clone(), 'uke-string', shader => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = 'uniform float uAmp;\nuniform float uT;\nuniform vec2 uSpan;\n' + shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          {
            float sv = clamp((position.y - uSpan.x) / (uSpan.y - uSpan.x), 0., 1.);
            transformed.x += uAmp * sin(3.14159 * sv) * sin(uT);
          }`,
        );
      });
      this.strings.push({ uniforms, x0: f.x0, x1: f.x1, reach: 15 / m.scale.x });
    }

    /* ---- where the fingers go: a dot behind each fret of the chord ---- */
    const dot = new THREE.CircleGeometry(30, 20);
    const ink = new THREE.MeshBasicMaterial({ color: '#2f4f9a', transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const d = new THREE.Mesh(dot, ink.clone());
      d.position.z = STRING_Z + 4;
      d.renderOrder = 2;
      this.dots.push(d);
      this.dotAt.push(new THREE.Vector3(0, NUT, STRING_Z + 4));
      this.model.add(d);
    }

    /* ---- a pick ---- */
    const shape = new THREE.Shape();
    shape.moveTo(0, -70);
    shape.quadraticCurveTo(70, -10, 62, 40);
    shape.quadraticCurveTo(0, 85, -62, 40);
    shape.quadraticCurveTo(-70, -10, 0, -70);
    const pickGeo = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: true, bevelSize: 3, bevelThickness: 2, bevelSegments: 2, curveSegments: 10 });
    this.pick = new THREE.Mesh(pickGeo, withSun(new THREE.MeshStandardMaterial({ color: '#e0a92e', roughness: 0.35 }), 'uke-pick'));
    this.pick.castShadow = true;
    this.pick.visible = false;
    this.model.add(this.pick);

    // in hand, a press anywhere near it is on it, so a swipe can start just off the edge
    this.pad = new THREE.Mesh(new THREE.PlaneGeometry(1500, 3600).translate(0, 600, 0), new THREE.MeshBasicMaterial({ visible: false }));
    this.pad.position.z = STRING_Z + 10;
    this.pad.raycast = () => {};
    this.model.add(this.pad);

    // lying on its back: the front faces up, the headstock points away up the table
    this.model.add(root);
    this.model.rotation.x = -Math.PI / 2;
    this.model.scale.setScalar(S);
    this.model.position.set(0, -BACK * S + 0.05, CENTRE * S);
    this.group.add(this.model);
    this.ready = true;

    this.spot = {
      object: this.group,
      cursor: 'pointer',
      chapter: this.chapter,
      onEnter: () => (this.hovered = true),
      onLeave: () => (this.hovered = false),
      onClick: () => {
        if (!this.state.open) this.open();
      },
      onDown: () => {
        if (!this.state.open) return false;
        this.press = { last: null, at: performance.now(), plucked: false };
        return true;
      },
      onMove: (_hit, ray) => this.track(ray),
      onUp: () => {
        // a tap on the strings is a strum down
        if (this.press && !this.press.plucked) this.strum(1, 0.8);
        this.press = null;
      },
    };
    world.hotspots.push(this.spot);
    world.uke = this;
    // upload its textures now, not the first time it scrolls into view
    root.traverse(o => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!mat) return;
      for (const t of [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap, mat.aoMap]) if (t) world.renderer.initTexture(t);
    });
  }

  place(rest: Pose, jam: Pose, portrait: boolean) {
    this.rest = rest;
    this.jam = jam;
    this.portrait = portrait;
  }

  private emit(patch: Partial<JamState>) {
    this.state = { ...this.state, ...patch };
    this.onState?.(this.state);
  }

  /** Pick it up. */
  async open() {
    if (this.state.open || !this.ready) return;
    const w = this.world;
    this.openedAt = w.progress;
    // browsers (iOS above all) only let a page make sound from inside a tap, and the sound engine
    // arrives a moment later; so the audio context is made here, now, and handed over
    if (!this.audio && !this.sound) {
      try {
        this.audio = new AudioContext({ latencyHint: 'interactive' });
        void this.audio.resume();
      } catch {
        this.audio = null;
      }
    }
    w.exclusive = this.spot;
    w.onOutside = () => this.close();
    this.pad.raycast = THREE.Mesh.prototype.raycast;
    this.emit({ open: true, loading: !this.sound });
    w.onJam?.(true);
    try {
      if (!this.sound) {
        const { UkeSound, adoptContext } = await loadSound();
        if (this.audio) adoptContext(this.audio);
        this.sound ??= new UkeSound();
        this.sound.listener = {
          onPluck: (s, v) => (this.amps[s] = Math.max(this.amps[s], v)),
          onStrum: dir => (this.sweep = { t: 0, dir }),
          onStep: (bar, step, chord) => this.emit({ bar, step, chord }),
          onEnd: () => this.emit({ playing: false, bar: -1, step: -1, played: true }),
        };
      }
      await this.sound.wake();
    } catch (err) {
      console.error(err);
    }
    if (!this.state.open) return;
    this.emit({ loading: false });
    // the first time, it plays for you
    if (!this.state.played) this.play();
  }

  /** Put it down: the music stops, and the page scrolls again. */
  close() {
    if (!this.state.open) return;
    this.sound?.stop(true);
    this.press = null;
    this.pad.raycast = () => {};
    const w = this.world;
    w.exclusive = null;
    w.onOutside = undefined;
    this.emit({ open: false, playing: false, bar: -1, step: -1 });
    w.onJam?.(false);
  }

  play() {
    if (!this.sound || !this.state.open) return;
    this.sound.play();
    this.emit({ playing: true, bar: 0, step: 0 });
  }

  stop() {
    this.sound?.stop();
  }

  setChord(chord: ChordName) {
    // choosing a chord takes over from the song
    if (this.state.playing) this.sound?.stop();
    this.emit({ chord });
  }

  strum(dir: 1 | -1, velocity = 0.85) {
    if (!this.sound || !this.state.open) return;
    this.sound.strum(this.state.chord, dir, velocity);
  }

  /** The strings' x (model units) at a point along the neck. */
  private stringX(s: Str, y: number) {
    return lerp(s.x0, s.x1, (y - SADDLE) / SCALE);
  }

  /** Follow the pointer over the strings; pressed, every string it crosses sounds. */
  private track(ray: THREE.Ray) {
    if (!this.state.open) return;
    const n = new THREE.Vector3(0, 0, 1).transformDirection(this.model.matrixWorld);
    const o = this.model.localToWorld(new THREE.Vector3(0, 0, STRING_Z));
    this.plane.setFromNormalAndCoplanarPoint(n, o);
    if (!ray.intersectPlane(this.plane, this.hit)) return;
    const p = this.model.worldToLocal(this.hit.clone());
    const over = p.y > SADDLE - 260 && p.y < NUT + 40 && Math.abs(p.x) < 420;
    if (over) this.pickTo.set(p.x, clamp(p.y, SADDLE + 60, NUT - 200), 70);
    const press = this.press;
    if (!press || !this.sound) return;
    const now = performance.now();
    const last = press.last;
    press.last = p;
    if (!last || !over) return;
    const elapsed = Math.max(1, now - press.at);
    press.at = now;
    const crossed: { s: number; f: number }[] = [];
    this.strings.forEach((s, i) => {
      const a = last.x - this.stringX(s, last.y);
      const b = p.x - this.stringX(s, p.y);
      if (a * b < 0) crossed.push({ s: i, f: a / (a - b) });
    });
    if (!crossed.length) return;
    crossed.sort((x, y) => x.f - y.f);
    const speed = Math.hypot(p.x - last.x, p.y - last.y) / elapsed;
    const v = clamp(0.55 + speed * 0.012, 0.55, 1);
    // in the order it crossed them, spread over the time the move took
    const span = Math.min(0.03, elapsed / 1000);
    for (const c of crossed) this.sound.pluck(c.s, this.fret(c.s), v, this.sound.soon(c.f * span));
    press.plucked = true;
  }

  private fret(s: number) {
    return CHORDS[this.state.chord][s];
  }

  get busy() {
    return this.state.open || this.openAmt > 0.001 || this.amps.some(a => a > 0.01) || Math.abs(this.hoverAmt - (this.hovered ? 1 : 0)) > 0.01;
  }

  get focus(): View | null {
    if (!this.state.open) return null;
    const j = this.jam;
    return this.portrait ? { x: j.x, z: j.z + 5, w: 30, h: 70 } : { x: j.x - 1, z: j.z + 5, w: 74, h: 44 };
  }

  update(dt: number, visible: boolean) {
    if (!this.ready) return;
    // the page has moved while it was in hand: put it down
    if (this.state.open && Math.abs(this.world.progress - this.openedAt) > 0.002) this.close();
    this.group.visible = visible;
    if (!visible) return;
    const open = this.state.open ? 1 : 0;
    this.openAmt = damp(this.openAmt, open, 3.6, dt);
    this.hoverAmt = damp(this.hoverAmt, this.hovered && !open ? 1 : 0, 10, dt);
    const t = this.openAmt;
    const r = this.rest;
    const j = this.jam;
    // lifted off the table, turned to lie across the view, a little bob as it comes up
    this.group.position.set(lerp(r.x, j.x, t), t * 7 + hump(t, 0, 1) * 3 + this.hoverAmt * 0.6, lerp(r.z, j.z, t));
    this.group.rotation.set(0, lerp(r.r, j.r, t), this.hoverAmt * 0.02);

    // strings
    this.strings.forEach((s, i) => {
      this.amps[i] *= Math.exp(-dt * 3.2);
      s.uniforms.uAmp.value = this.amps[i] * s.reach;
      s.uniforms.uT.value += dt * (55 + i * 7);
    });

    // finger dots for the chord in hand
    const frets = CHORDS[this.state.chord];
    this.dots.forEach((d, i) => {
      const f = frets[i];
      const s = this.strings[i];
      if (!s) return;
      if (f > 0) {
        // just behind the fret, where a fingertip sits
        const from = SCALE * (1 - Math.pow(2, -(f - 0.4) / 12));
        const y = NUT - from;
        this.dotAt[i].set(this.stringX(s, y), y, STRING_Z + 4);
      }
      d.position.lerp(this.dotAt[i], 1 - Math.exp(-14 * dt));
      const m = d.material as THREE.MeshBasicMaterial;
      m.opacity = damp(m.opacity, f > 0 ? 0.85 * t : 0, 10, dt);
      d.visible = m.opacity > 0.01;
    });

    // the pick: it sweeps across on each of the song's strums, and otherwise follows your hand
    this.pick.visible = t > 0.05;
    if (this.sweep.t < 1) {
      this.sweep.t = Math.min(1, this.sweep.t + dt / 0.085);
      const g = this.strings[0];
      const a = this.strings[3];
      if (g && a) {
        const lo = this.stringX(g, STRUM_Y) - 90;
        const hi = this.stringX(a, STRUM_Y) + 90;
        const k = this.sweep.dir > 0 ? this.sweep.t : 1 - this.sweep.t;
        this.pickTo.set(lerp(lo, hi, k), STRUM_Y, 70);
        this.pickAt.copy(this.pickTo);
      }
    } else this.pickAt.lerp(this.pickTo, 1 - Math.exp(-22 * dt));
    this.pick.position.copy(this.pickAt);
    this.pick.rotation.set(0, 0, Math.PI / 2 + (this.sweep.t < 1 ? -this.sweep.dir * 0.3 : 0));
    this.pick.scale.setScalar(0.4 + 0.6 * t);
  }

  dispose() {
    this.sound?.dispose();
    this.sound = null;
    void this.audio?.close();
    this.audio = null;
  }
}
