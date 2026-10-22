import * as THREE from 'three';
import { caseStudies } from '../../../lib/content';
import { INK, Painter, loadImage, paperDensity } from '../paint';
import { Sheet } from '../paper';
import { clamp, damp, easeInOut, lerp, range, rng } from '../util';
import type { Chapter, TableWorld, View } from '../world';

/*
 * 10:00 — Work hours. The case studies, pressed and catalogued like herbarium sheets: the work
 * mounted with gummed strips, a pressed leaf, and a collector's label filled in by hand. The
 * camera walks along the row; each sheet lifts as it comes up, and opens its case study when
 * clicked.
 */

export const WORK_Z = 112;
const SHEET = { w: 30, h: 40 };
const GAP = 38;

/** Keyframed value with eased holds between keys. */
/**
 * A camera path through keyframes [u, value]. It flows through the keys rather than stopping at
 * each (a monotone cubic, so it never overshoots a key), and starts and ends at rest, where the
 * journeys between chapters pick it up.
 */
export function keyed(u: number, keys: [number, number][]) {
  const n = keys.length;
  if (u <= keys[0][0]) return keys[0][1];
  if (u >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (i < n - 2 && u > keys[i + 1][0]) i++;
  const slope = (k: number) => {
    if (k <= 0 || k >= n - 1) return 0;
    const a = (keys[k][1] - keys[k - 1][1]) / (keys[k][0] - keys[k - 1][0]);
    const b = (keys[k + 1][1] - keys[k][1]) / (keys[k + 1][0] - keys[k][0]);
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  };
  const [x0, y0] = keys[i];
  const [x1, y1] = keys[i + 1];
  const h = x1 - x0;
  const t = (u - x0) / h;
  const m0 = slope(i) * h;
  const m1 = slope(i + 1) * h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
}

export function pressedLeaf(p: Painter, x: number, y: number, s: number, seed: number, color = '#7d8748') {
  const c = p.ctx;
  const r = rng(seed);
  const K = p.k;
  c.save();
  c.translate(x * K, y * K);
  c.rotate(-0.5 + r() * 0.3);
  c.globalAlpha = 0.86;
  const stem = (len: number) => {
    c.strokeStyle = '#6b6a3a';
    c.lineWidth = 0.08 * s * K;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(0.6 * s * K, -len * 0.5 * K, 0.2 * s * K, -len * K);
    c.stroke();
  };
  const leaf = (lx: number, ly: number, len: number, a: number) => {
    c.save();
    c.translate(lx * K, ly * K);
    c.rotate(a);
    const L = len * K;
    const W = len * 0.36 * K;
    const grad = c.createLinearGradient(0, 0, 0, -L);
    grad.addColorStop(0, color);
    grad.addColorStop(1, '#a8955a');
    c.fillStyle = grad;
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(W, -L * 0.25, W * 0.7, -L * 0.8, 0, -L);
    c.bezierCurveTo(-W * 0.7, -L * 0.8, -W, -L * 0.25, 0, 0);
    c.fill();
    c.strokeStyle = 'rgba(240,235,200,0.45)';
    c.lineWidth = 0.025 * K;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -L * 0.96);
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      c.moveTo(0, -L * t);
      c.lineTo(W * 0.6 * (1 - t * 0.5), -L * (t + 0.08));
      c.moveTo(0, -L * t);
      c.lineTo(-W * 0.6 * (1 - t * 0.5), -L * (t + 0.08));
    }
    c.stroke();
    c.restore();
  };
  const len = 7 * s;
  stem(len);
  for (let i = 0; i < 6; i++) {
    const t = 0.18 + i * 0.14;
    const side = i % 2 ? 1 : -1;
    leaf(0.35 * s * Math.sin(t * 3), -len * t, (1.9 - t) * s * 1.3, side * (0.9 + r() * 0.3));
  }
  leaf(0.2 * s, -len, 1.6 * s, 0.1);
  c.restore();
}

type Plate = { sheet: Sheet; lift: number; hover: boolean; url: string };

export class Work implements Chapter {
  readonly id = 'work' as const;
  readonly group = new THREE.Group();
  private plates: Plate[] = [];
  private title!: Sheet;
  private portrait = false;
  private settling = 0;

  private slot(i: number) {
    return this.portrait ? { x: 0, z: WORK_Z + i * 45 } : { x: (i - 1) * GAP, z: WORK_Z };
  }

  view(u: number, aspect: number): View {
    const portrait = aspect < 0.8;
    const keys = (a: number, b: number, c: number, off = 0): [number, number][] => [
      [0, a + off],
      [0.16, a],
      [0.36, b],
      [0.6, b],
      [0.8, c],
      [1, c],
    ];
    if (portrait) {
      const z = keyed(u, keys(WORK_Z, WORK_Z + 45, WORK_Z + 90, -10));
      return { x: 0, z, w: 33, h: 50 };
    }
    const x = keyed(u, keys(-GAP, 0, GAP));
    const z = keyed(u, [
      [0, WORK_Z - 5],
      [0.16, WORK_Z - 1],
      [1, WORK_Z - 1],
    ]);
    const h = keyed(u, [
      [0, 60],
      [0.16, 49],
    ]);
    return { x, z, w: h * 1.06, h };
  }

  async build(world: TableWorld) {
    const k = paperDensity();
    const r = world.renderer;

    // the label pinned above the row
    const t = new Painter(30, 7, k * 0.8);
    t.paper('#efe6cf', { seed: 40 });
    t.text('SELECTED WORK · 2023 — 25', 1.4, 2.0, { family: 'mono', size: 0.42, weight: 600 }, INK.muted, { spacing: 0.16 });
    t.text('Pressed &', 1.3, 5.2, { family: 'serif', size: 2.6 }, INK.ink);
    t.text('catalogued.', 1.3 + t.measure('Pressed & ', { family: 'serif', size: 2.6 }), 5.2, { family: 'serif', size: 2.6, italic: true }, INK.blue);
    t.grain(0.05);
    t.edge(0.12, 41);
    this.title = new Sheet({ w: 30, h: 7, front: t.texture(r) });
    this.group.add(this.title.group);
    world.shades.add(this.title.shade!);

    const leafColours = ['#7d8748', '#8d6b3c', '#5e7a52'];
    for (const [i, s] of caseStudies.entries()) {
      const img = await loadImage(s.image);
      const p = new Painter(SHEET.w, SHEET.h, k);
      p.paper('#f6f1e4', { seed: 50 + i, fibres: 1.1, flecks: 1.2 });
      const M = 2;
      p.text('HERBARIUM OF A POLYMATH', M, 2.1, { family: 'mono', size: 0.4, weight: 600 }, INK.muted, { spacing: 0.16 });
      p.text(`No. ${s.index}`, SHEET.w - M, 2.1, { family: 'mono', size: 0.4, weight: 600 }, INK.muted, { align: 'right', spacing: 0.16 });
      p.line(M, 2.7, SHEET.w - M, 2.7, 'rgba(28,35,51,0.25)', 0.03);
      // the work, mounted
      const iw = SHEET.w - M * 2;
      const ih = iw * 0.5625;
      p.ctx.save();
      p.ctx.shadowColor = 'rgba(60,40,10,0.25)';
      p.ctx.shadowBlur = 0.35 * p.k;
      p.ctx.shadowOffsetY = 0.1 * p.k;
      p.rect(M, 3.6, iw, ih, s.tint);
      p.ctx.restore();
      p.image(img, M, 3.6, iw, ih, { cover: true });
      const rr = rng(60 + i);
      for (const [cx, cy] of [
        [M + 1.2, 3.8],
        [M + iw - 1.2, 3.8],
        [M + 1.2, 3.6 + ih - 0.2],
        [M + iw - 1.2, 3.6 + ih - 0.2],
      ])
        p.tape(cx, cy, 3.2, 1.1, (cx < SHEET.w / 2 ? -1 : 1) * (0.7 + rr() * 0.2) * (cy < 10 ? 1 : -1), 'rgba(232,222,190,0.86)', 70 + i);

      let y = 3.6 + ih + 2.6;
      p.text(s.name, M, y, { family: 'serif', size: 2.1 }, INK.ink);
      y += 1.4;
      p.text(s.type, M, y, { family: 'serif', size: 1.0, italic: true }, s.ink);
      y = p.para([{ family: 'sans', size: 0.6, text: s.description, color: INK.soft }], M, y + 1.3, 15, 0.92);

      // the collector's label
      const lx = SHEET.w - M - 13.2;
      const ly = SHEET.h - M - 10.6;
      p.rect(lx, ly, 13.2, 10.6, '#fbf8ef', 0.1);
      p.strokeRect(lx + 0.25, ly + 0.25, 12.7, 10.1, 'rgba(28,35,51,0.55)', 0.035);
      p.strokeRect(lx + 0.4, ly + 0.4, 12.4, 9.8, 'rgba(28,35,51,0.3)', 0.02);
      p.text('MANYA’S GARDEN', lx + 6.6, ly + 1.45, { family: 'mono', size: 0.36, weight: 600 }, INK.ink, { align: 'center', spacing: 0.2 });
      p.text('herbarium of work', lx + 6.6, ly + 2.25, { family: 'serif', size: 0.6, italic: true }, INK.muted, { align: 'center' });
      const rows: [string, string][] = [
        ['Family', s.facets.domain],
        ['Habitat', s.facets.interface],
        ['Distribution', s.facets.distribution],
        ['Notes', s.tags.join(' · ')],
      ];
      rows.forEach(([k2, v], j) => {
        const ry = ly + 3.7 + j * 1.55;
        p.text(k2.toUpperCase(), lx + 0.9, ry, { family: 'mono', size: 0.3, weight: 600 }, INK.muted, { spacing: 0.14 });
        p.line(lx + 3.9, ry + 0.12, lx + 12.4, ry + 0.12, 'rgba(28,35,51,0.25)', 0.02, [0.08, 0.1]);
        const hand = { family: 'hand' as const, size: v.length > 26 ? 0.62 : 0.85 };
        p.text(v, lx + 4.0, ry - 0.02, hand, INK.indigo, { rotate: -0.01 });
      });
      p.text('det. M. Kaushik', lx + 0.9, ly + 9.9, { family: 'hand', size: 0.75 }, INK.soft);
      p.text(`${s.year ?? '2025'}`, lx + 12.3, ly + 9.9, { family: 'mono', size: 0.32 }, INK.muted, { align: 'right' });

      pressedLeaf(p, M + 4.4, SHEET.h - 4.6, 1.05, 80 + i, leafColours[i % 3]);
      p.tape(M + 4.6, SHEET.h - 6.6, 2.4, 0.8, 0.4, 'rgba(232,222,190,0.86)', 90 + i);

      // the stamp you press to open it
      p.ctx.save();
      const sx = M + 6.6;
      const sy = SHEET.h - 2.6;
      p.ctx.translate(sx * p.k, sy * p.k);
      p.ctx.rotate(-0.05);
      p.ctx.translate(-sx * p.k, -sy * p.k);
      p.strokeRect(sx - 5.6, sy - 1.05, 11.2, 2.0, INK.red, 0.09, 0.2);
      p.text('READ THE CASE STUDY  ↗', sx, sy + 0.25, { family: 'mono', size: 0.5, weight: 700 }, INK.red, { align: 'center', spacing: 0.08 });
      p.ctx.restore();
      p.distress(sx - 5.8, sy - 1.3, 11.6, 2.6, 0.7, 100 + i);
      p.grain(0.04, 110 + i);
      p.edge(0.08, 120 + i);

      const sheet = new Sheet({ w: SHEET.w, h: SHEET.h, front: p.texture(r), segments: 14 });
      sheet.uniforms.uCurl.value = 0.18;
      this.group.add(sheet.group);
      world.shades.add(sheet.shade!);
      const plate: Plate = { sheet, lift: 0, hover: false, url: s.url };
      this.plates.push(plate);
      world.hotspots.push({
        object: sheet.mesh,
        cursor: 'pointer',
        chapter: 'work',
        label: `Open the case study: ${s.name}`,
        onEnter: () => (plate.hover = true),
        onLeave: () => (plate.hover = false),
        onClick: () => world.open?.(s.url),
      });
    }
    this.layout(world.aspect < 0.8);
  }

  private layout(portrait: boolean) {
    this.portrait = portrait;
    const a = this.slot(0);
    this.title.group.position.set(a.x - (portrait ? 0 : 0.5), 0.1, a.z - SHEET.h / 2 - 5.5);
    this.title.group.rotation.y = 0.02;
    this.title.syncShade(0.1);
  }

  update(ph: number, dt: number, world: TableWorld) {
    if (!this.plates.length) return;
    const portrait = world.aspect < 0.8;
    if (portrait !== this.portrait) this.layout(portrait);
    this.group.visible = ph > -1 && ph < 2 ? true : world.current === 'outro';
    const u = clamp(ph, 0, 1);
    const focus = this.portrait ? (world.view.z - WORK_Z) / 45 : world.view.x / GAP + 1;
    let moving = false;
    this.plates.forEach((pl, i) => {
      const s = this.slot(i);
      const near = clamp(1 - Math.abs(focus - i) * 1.4);
      const target = (ph >= 0 && ph <= 1 ? near * 0.9 : 0) + (pl.hover ? 1.4 : 0);
      pl.lift = damp(pl.lift, target, 7, dt);
      if (Math.abs(pl.lift - target) > 0.01) moving = true;
      const g = pl.sheet.group;
      // they arrive dealt onto the table, one after another
      const deal = easeInOut(range(ph, -0.75 + i * 0.12, -0.15 + i * 0.12));
      g.position.set(s.x + (1 - deal) * 12, 0.1 + pl.lift + (1 - deal) * 10, s.z - (1 - deal) * 26);
      g.rotation.y = [-0.035, 0.02, -0.015][i] + (1 - deal) * 0.35 - near * 0.02;
      pl.sheet.uniforms.uBow.value = pl.lift * 0.08 + (1 - deal) * 0.25;
      pl.sheet.uniforms.uCurl.value = 0.18 + pl.lift * 0.15;
      pl.sheet.syncShade(g.position.y, deal);
      g.visible = deal > 0.001;
    });
    void u;
    this.settling = moving ? 0.3 : Math.max(0, this.settling - dt);
  }

  busy() {
    return this.settling > 0;
  }
}
