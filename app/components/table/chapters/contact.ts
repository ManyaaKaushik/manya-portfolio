import * as THREE from 'three';
import { links } from '../../../lib/content';
import { INK, Painter, loadImage, paperDensity } from '../paint';
import { Sheet } from '../paper';
import { pencil } from '../props';
import { stationZ } from '../stations';
import { clamp, damp, rng } from '../util';
import type { Chapter, TableWorld, View } from '../world';
import { keyed } from './work';

/*
 * 20:00 — Lamp on. The sun's gone and the desk lamp clicks on over a postcard addressed to
 * Manya: every line of the address is a way to reach her. Beside it, a pad to leave a doodle on
 * (it's kept for your next visit), and a few fireflies that came in through the window.
 */

const CARD = { w: 27, h: 17.5 };
const PAD = { w: 19, h: 19 };
const DOODLE_KEY = 'manya-table-doodle';

type Line = { y: number; label: string; href: string; action?: 'copy' };

const LINES: Line[] = [
  { y: 9.6, label: '✉  ' + links.emailAddress, href: links.email, action: 'copy' },
  { y: 11.3, label: 'in  LinkedIn  ↗', href: links.linkedin },
  { y: 13.0, label: '▤  Résumé  ↗', href: links.resume },
  { y: 14.7, label: 'M  Medium  ↗', href: links.medium },
];

const FIREFLY_V = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uSize;
varying float vGlow;
void main(){
  vec3 p = position;
  float t = uTime * .35 + aSeed * 6.28;
  p.x += sin(t * 1.3 + aSeed * 9.) * 4. + sin(t * .37) * 9.;
  p.z += cos(t * 1.1 + aSeed * 4.) * 3. + cos(t * .29 + 2.) * 7.;
  p.y += sin(t * 2.1) * 1.5;
  vGlow = smoothstep(.15, 1., .5 + .5 * sin(uTime * (1.4 + aSeed) + aSeed * 30.));
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.5 + vGlow) / -mv.z;
}`;
const FIREFLY_F = /* glsl */ `
uniform float uAlpha;
varying float vGlow;
void main(){
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, 0., d);
  a = a * a * (0.25 + vGlow * .75) * uAlpha;
  gl_FragColor = vec4(vec3(1., .86, .45) * (1. + vGlow), a);
}`;

export class Contact implements Chapter {
  readonly id = 'contact' as const;
  readonly group = new THREE.Group();
  private card!: Sheet;
  private cardPainter!: Painter;
  private cardBase!: ImageData;
  private cardTex!: THREE.CanvasTexture;
  private hoverLine = -1;
  private pad!: Sheet;
  private padPainter!: Painter;
  private padBase!: ImageData;
  private padTex!: THREE.CanvasTexture;
  private drawing = false;
  private last: [number, number] | null = null;
  private dirty = false;
  private pen = pencil('#2b2b30', 15);
  private penAt = new THREE.Vector3();
  private penTarget = new THREE.Vector3();
  private penRest = new THREE.Vector3();
  private penLift = 0;
  private chit!: Sheet;
  private flies!: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private portrait = false;
  private Z = 474;
  private t = 0;

  view(u: number, aspect: number): View {
    const portrait = aspect < 0.8;
    const Z = stationZ('contact', portrait);
    if (portrait) {
      const z = keyed(u, [
        [0, Z - 2],
        [0.35, Z],
        [0.6, Z + 24],
        [1, Z + 30],
      ]);
      return { x: 0, z, w: 29, h: 44 };
    }
    return { x: 4, z: keyed(u, [[0, Z - 3], [0.6, Z + 1]]), w: 76, h: 50 };
  }

  async build(world: TableWorld) {
    const k = paperDensity();
    const r = world.renderer;
    const flower = await loadImage('/assets/sunflower.webp');

    /* ---- the postcard ---- */
    const p = new Painter(CARD.w, CARD.h, k);
    p.paper('#f5efdf', { seed: 600, fibres: 1, flecks: 1 });
    p.text('P O S T   C A R D', CARD.w / 2, 1.6, { family: 'mono', size: 0.5, weight: 700 }, INK.ink, { align: 'center' });
    p.line(13.9, 2.6, 13.9, CARD.h - 1.6, 'rgba(28,35,51,0.35)', 0.03);
    p.text('Let’s grow', 1.4, 5.0, { family: 'serif', size: 2.2 }, INK.ink);
    p.text('something good.', 1.4, 7.1, { family: 'serif', size: 2.2, italic: true }, INK.blue);
    let y = p.para(
      [{ family: 'sans', size: 0.52, text: 'Open to product design roles, collaborations, and conversations about systems, people and the spaces in between.', color: INK.soft }],
      1.4,
      8.9,
      11.6,
      0.82,
    );
    y = p.para([{ family: 'serif', size: 0.6, italic: true, text: '“What is there to lose? Every second you’re there, you’re gaining something.”', color: INK.soft }], 1.4, y + 1.4, 11.2, 0.78);
    p.text('— Alysa Liu', 1.4, y + 0.75, { family: 'sans', size: 0.36 }, INK.muted);
    p.text('write back any time ✿', 1.4, CARD.h - 1.5, { family: 'hand', size: 0.95 }, INK.indigo, { rotate: -0.02 });

    // the stamp: a sunflower, perforated
    const sx = CARD.w - 6.6;
    const sy = 2.4;
    p.rect(sx - 0.25, sy - 0.25, 5.3, 6.3, '#fbf8ef');
    p.rect(sx + 0.15, sy + 0.15, 4.5, 5.5, '#f3c43a');
    p.ctx.save();
    p.ctx.globalCompositeOperation = 'multiply';
    p.image(flower, sx + 0.35, sy + 0.4, 4.1, 4.1);
    p.ctx.restore();
    p.text('MANYA’S GARDEN', sx + 2.4, sy + 5.1, { family: 'mono', size: 0.26, weight: 700 }, INK.ink, { align: 'center' });
    p.text('₹25', sx + 0.4, sy + 0.95, { family: 'serif', size: 0.6 }, INK.ink);
    for (let i = 0; i <= 13; i++) {
      for (const [x, yy] of [
        [sx - 0.25 + (i * 5.3) / 13, sy - 0.25],
        [sx - 0.25 + (i * 5.3) / 13, sy + 6.05],
      ])
        p.rect(x - 0.12, yy - 0.12, 0.24, 0.24, '#f5efdf', 0.12);
    }
    for (let i = 0; i <= 15; i++) {
      for (const [x, yy] of [
        [sx - 0.25, sy - 0.25 + (i * 6.3) / 15],
        [sx + 5.05, sy - 0.25 + (i * 6.3) / 15],
      ])
        p.rect(x - 0.12, yy - 0.12, 0.24, 0.24, '#f5efdf', 0.12);
    }
    p.postmark(sx - 1.2, sy + 3.6, 2.0, 'OPEN TO WORK', '2025', 'MANYA’S GARDEN', 'rgba(54,95,186,0.9)', -0.25, 610);
    for (let i = 0; i < 4; i++) p.handLine([[sx - 5.2, sy + 2.2 + i * 0.5], [sx - 3.6, sy + 2.0 + i * 0.5], [sx - 2.2, sy + 2.25 + i * 0.5]], 'rgba(54,95,186,0.6)', 0.05, 620 + i);

    p.text('To —', 14.6, 8.2, { family: 'hand', size: 0.9 }, INK.soft);
    p.text('Manya Kaushik', 16.6, 8.2, { family: 'hand', size: 1.3 }, INK.indigo);
    for (const l of LINES) p.line(14.6, l.y + 0.3, CARD.w - 1.2, l.y + 0.3, 'rgba(28,35,51,0.3)', 0.025);
    p.text('© 2025 MANYA KAUSHIK · ROOTED IN EMPATHY, ALWAYS GROWING', CARD.w - 1.2, CARD.h - 0.7, { family: 'mono', size: 0.24 }, INK.muted, { align: 'right' });
    p.grain(0.04);
    p.edge(0.04, 630);
    this.cardPainter = p;
    this.cardBase = p.ctx.getImageData(0, 0, p.canvas.width, p.canvas.height);
    this.cardTex = p.texture(r);
    this.paintCard();
    this.card = new Sheet({ w: CARD.w, h: CARD.h, front: this.cardTex, segments: 12 });
    this.card.uniforms.uCurl.value = 0.1;
    this.group.add(this.card.group);
    world.shades.add(this.card.shade!);
    world.hotspots.push({
      object: this.card.mesh,
      chapter: 'contact',
      cursor: 'default',
      onMove: hit => {
        const i = this.lineAt(hit);
        if (i !== this.hoverLine) {
          this.hoverLine = i;
          this.paintCard();
          world.onCursor?.(i >= 0 ? 'pointer' : 'default');
          world.kick();
        }
      },
      onLeave: () => {
        if (this.hoverLine !== -1) {
          this.hoverLine = -1;
          this.paintCard();
        }
      },
      onClick: hit => {
        const i = this.lineAt(hit);
        if (i < 0) return;
        const l = LINES[i];
        if (l.action === 'copy') {
          navigator.clipboard?.writeText(links.emailAddress).then(
            () => world.onToast?.('Email copied — talk soon!'),
            () => undefined,
          );
          window.location.href = l.href;
        } else world.open?.(l.href);
      },
    });

    /* ---- the doodle pad ---- */
    const d = new Painter(PAD.w, PAD.h, Math.min(k, 36));
    d.paper('#fbf9f2', { seed: 640, fibres: 0.7, mottle: 0.5 });
    d.text('Leave a little', 1.3, 2.6, { family: 'serif', size: 1.35 }, INK.ink);
    d.text('of yourself here.', 1.3 + d.measure('Leave a little ', { family: 'serif', size: 1.35 }), 2.6, { family: 'serif', size: 1.35, italic: true }, INK.blue);
    d.text('draw anything — a flower, a face, a what-if', 1.3, 3.7, { family: 'hand', size: 0.75 }, INK.muted);
    d.strokeRect(1.2, 4.5, PAD.w - 2.4, PAD.h - 6.4, 'rgba(28,35,51,0.25)', 0.03, 0.3, [0.2, 0.18]);
    d.text('start over ↺', PAD.w - 1.3, PAD.h - 0.8, { family: 'mono', size: 0.34, weight: 600 }, INK.muted, { align: 'right' });
    d.grain(0.04);
    d.edge(0.05, 641);
    this.padPainter = d;
    this.padBase = d.ctx.getImageData(0, 0, d.canvas.width, d.canvas.height);
    this.padTex = d.texture(r);
    this.restoreDoodle();
    this.pad = new Sheet({ w: PAD.w, h: PAD.h, front: this.padTex, segments: 8 });
    this.pad.uniforms.uCurl.value = 0.06;
    this.group.add(this.pad.group, this.pen);
    world.shades.add(this.pad.shade!);
    const toPad = (hit: THREE.Intersection) => (hit.uv ? [hit.uv.x * PAD.w, (1 - hit.uv.y) * PAD.h] : null) as [number, number] | null;
    world.hotspots.push({
      object: this.pad.mesh,
      chapter: 'contact',
      cursor: 'crosshair',
      onDown: hit => {
        const at = toPad(hit);
        if (!at) return false;
        if (at[0] > PAD.w - 4.6 && at[1] > PAD.h - 1.7) {
          this.clearDoodle();
          return false;
        }
        this.drawing = true;
        this.last = at;
        this.penTo(hit.point);
        return true;
      },
      onMove: hit => {
        if (!hit) return;
        this.penTo(hit.point);
        if (!this.drawing) return;
        const at = toPad(hit);
        if (at && this.last) this.stroke(this.last, at);
        this.last = at;
      },
      onUp: () => {
        this.drawing = false;
        this.last = null;
        this.saveDoodle();
      },
      onLeave: () => {
        this.penLift = 0;
      },
    });

    /* ---- a goodnight note ---- */
    const c = new Painter(13, 6, k * 0.8);
    c.paper('#f6d354', { seed: 650, fibres: 0.2, mottle: 0.3 });
    c.text('goodnight ✿', 1.0, 2.2, { family: 'hand', size: 1.2 }, INK.ink, { rotate: -0.03 });
    c.text('keep scrolling — the day starts', 1.0, 3.75, { family: 'hand', size: 0.8 }, INK.ink, { rotate: -0.03 });
    c.text('again at dawn ↺', 1.0, 4.85, { family: 'hand', size: 0.8 }, INK.ink, { rotate: -0.03 });
    this.chit = new Sheet({ w: 13, h: 6, front: c.texture(r), roughness: 0.6 });
    this.chit.uniforms.uCurl.value = 0.2;
    this.group.add(this.chit.group);
    world.shades.add(this.chit.shade!);

    /* ---- fireflies ---- */
    const N = 22;
    const pos = new Float32Array(N * 3);
    const seed = new Float32Array(N);
    const rr = rng(660);
    for (let i = 0; i < N; i++) {
      pos.set([(rr() - 0.5) * 80, 3 + rr() * 20, (rr() - 0.5) * 50], i * 3);
      seed[i] = rr();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.flies = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        vertexShader: FIREFLY_V,
        fragmentShader: FIREFLY_F,
        uniforms: { uTime: { value: 0 }, uSize: { value: 900 }, uAlpha: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.flies.frustumCulled = false;
    this.group.add(this.flies);

    this.layout(world.aspect < 0.8, world);
  }

  private lineAt(hit: THREE.Intersection) {
    if (!hit.uv) return -1;
    const x = hit.uv.x * CARD.w;
    const y = (1 - hit.uv.y) * CARD.h;
    if (x < 14.4) return -1;
    return LINES.findIndex(l => y > l.y - 1.05 && y < l.y + 0.55);
  }

  private paintCard() {
    const p = this.cardPainter;
    p.ctx.putImageData(this.cardBase, 0, 0);
    LINES.forEach((l, i) => {
      const hot = i === this.hoverLine;
      if (hot) {
        // a swipe of highlighter
        p.ctx.save();
        p.ctx.globalCompositeOperation = 'multiply';
        p.rect(14.4, l.y - 0.75, p.measure(l.label, { family: 'hand', size: 1.0 }) + 0.8, 1.0, 'rgba(246,212,72,0.75)', 0.3);
        p.ctx.restore();
      }
      p.text(l.label, 14.8, l.y, { family: 'hand', size: 1.0 }, hot ? INK.ink : INK.indigo);
    });
    this.cardTex.needsUpdate = true;
  }

  private stroke(a: [number, number], b: [number, number]) {
    const d = this.padPainter;
    const c = d.ctx;
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = 'rgba(52,52,62,0.85)';
    c.lineWidth = 0.09 * d.k;
    c.beginPath();
    c.moveTo(a[0] * d.k, a[1] * d.k);
    c.lineTo(b[0] * d.k, b[1] * d.k);
    c.stroke();
    // graphite catches the paper's tooth
    c.strokeStyle = 'rgba(52,52,62,0.25)';
    c.lineWidth = 0.16 * d.k;
    c.stroke();
    c.restore();
    this.padTex.needsUpdate = true;
    this.dirty = true;
  }

  private clearDoodle() {
    this.padPainter.ctx.putImageData(this.padBase, 0, 0);
    this.padTex.needsUpdate = true;
    try {
      localStorage.removeItem(DOODLE_KEY);
    } catch {}
  }

  private saveDoodle() {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      localStorage.setItem(DOODLE_KEY, this.padPainter.canvas.toDataURL('image/webp', 0.8));
    } catch {}
  }

  private restoreDoodle() {
    let src: string | null = null;
    try {
      src = localStorage.getItem(DOODLE_KEY);
    } catch {}
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      this.padPainter.ctx.drawImage(img, 0, 0, this.padPainter.canvas.width, this.padPainter.canvas.height);
      this.padTex.needsUpdate = true;
    };
    img.src = src;
  }

  private penTo(point: THREE.Vector3) {
    this.penTarget.copy(point);
    this.penLift = 1;
  }

  private layout(portrait: boolean, world?: TableWorld) {
    this.portrait = portrait;
    this.Z = stationZ('contact', portrait);
    const Z = this.Z;
    const P = portrait;
    this.card.group.position.set(P ? 0 : -10, 0.12, P ? Z : Z);
    this.card.group.rotation.y = -0.03;
    this.pad.group.position.set(P ? 0.5 : 22, 0.12, P ? Z + 23 : Z + 2);
    this.pad.group.rotation.y = P ? 0.02 : 0.05;
    this.chit.group.position.set(P ? 1 : 26, 0.16, P ? Z + 39 : Z - 15.5);
    this.chit.group.rotation.y = 0.08;
    for (const s of [this.card, this.pad, this.chit]) s.syncShade(s.group.position.y);
    this.penRest.set(P ? 9 : 34, 0.38, P ? Z + 34 : Z + 9);
    this.penAt.copy(this.penRest);
    this.flies.position.set(P ? 0 : 4, 0, Z);
    world?.placeLamp(P ? 0 : 3, Z + 2);
  }

  update(ph: number, dt: number, world: TableWorld) {
    if (!this.card) return;
    this.t += dt;
    const portrait = world.aspect < 0.8;
    if (portrait !== this.portrait) this.layout(portrait, world);
    this.group.visible = (ph > -1 && ph < 2) || world.current === 'outro';
    if (!this.group.visible) return;

    // the pencil: resting by the pad, or following your hand over it
    const drawing = this.penLift > 0.5;
    const target = drawing ? this.penTarget : this.penRest;
    this.penAt.x = damp(this.penAt.x, target.x, drawing ? 30 : 6, dt);
    this.penAt.z = damp(this.penAt.z, target.z, drawing ? 30 : 6, dt);
    const tilt = drawing ? 0.42 : 0;
    const len = 15 / 2 + 1.75;
    // tip at the point, body leaning back towards the bottom right
    const rotY = -0.6;
    const back = new THREE.Vector3(-Math.cos(tilt) * len, Math.sin(tilt) * len, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    this.pen.position.set(this.penAt.x + (drawing ? back.x : 0), drawing ? 0.15 + back.y + (this.drawing ? 0 : 0.6) : 0.38, this.penAt.z + (drawing ? back.z : 0));
    this.pen.rotation.set(0, rotY, drawing ? -tilt : 0, 'YXZ');

    const on = world.lampOn;
    this.flies.material.uniforms.uTime.value = this.t;
    this.flies.material.uniforms.uAlpha.value = clamp(on * (1 - world.daylight * 2));
    this.flies.material.uniforms.uSize.value = 9 * world.renderer.getPixelRatio() * world.camera.position.y;
  }

  busy() {
    return this.drawing;
  }
}
