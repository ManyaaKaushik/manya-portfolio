import * as THREE from 'three';
import { testimonials } from '../../../lib/content';
import { withSun } from '../light';
import { INK, Painter, loadImage, paperDensity } from '../paint';
import { Sheet } from '../paper';
import { stationZ } from '../stations';
import { clamp, easeOut, lerp, range } from '../util';
import type { Chapter, TableWorld, View } from '../world';
import { keyed } from './work';

/*
 * 17:30 — Golden hour. Kind words, as the notes people left: each arrives in turn, slid across
 * the table, while the sun gets low and the shadows long. Grandma is here too.
 */

const NOTE = { w: 17, h: 14 };
const TONES: Record<string, string> = { lilac: '#e7e2f1', butter: '#f2e5b2', rose: '#f1dfd3' };

function paperclip() {
  // a gem clip: one wire, three bends
  const pts = [
    [0, -3.2],
    [0, 1.6],
    [0.55, 2.1],
    [1.1, 1.6],
    [1.1, -2.6],
    [0.55, -3.1],
    [-0.2, -2.6],
    [-0.2, 0.9],
    [0.35, 1.3],
    [0.85, 0.9],
    [0.85, -1.9],
  ].map(([x, z]) => new THREE.Vector3(x * 1.1, 0.15, z * 1.1));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.07, 6), withSun(new THREE.MeshStandardMaterial({ color: '#c8ccd2', roughness: 0.25, metalness: 0.9 }), 'clip'));
  m.castShadow = true;
  return m;
}

export class Words implements Chapter {
  readonly id = 'words' as const;
  readonly group = new THREE.Group();
  private notes: Sheet[] = [];
  private title!: Sheet;
  private polaroid!: Sheet;
  private chit!: Sheet;
  private clip!: THREE.Mesh;
  private portrait = false;
  private Z = 388;

  view(u: number, aspect: number): View {
    const portrait = aspect < 0.8;
    const Z = stationZ('words', portrait);
    if (portrait) {
      const z = keyed(u, [
        [0, Z - 12],
        [0.2, Z - 6],
        [0.45, Z + 14],
        [0.7, Z + 34],
        [1, Z + 58],
      ]);
      return { x: 0, z, w: 24, h: 40 };
    }
    const z = keyed(u, [
      [0, Z - 4],
      [0.6, Z - 1],
    ]);
    return { x: 2, z, w: 84, h: 50 };
  }

  private slot(i: number) {
    const Z = this.Z;
    return this.portrait
      ? [
          { x: 0.5, z: Z, r: -0.03 },
          { x: -0.5, z: Z + 17, r: 0.025 },
          { x: 0.5, z: Z + 34, r: -0.02 },
        ][i]
      : [
          { x: -28, z: Z + 2, r: -0.05 },
          { x: -8, z: Z - 5, r: 0.03 },
          { x: 12, z: Z + 4, r: -0.025 },
        ][i];
  }

  async build(world: TableWorld) {
    const k = paperDensity();
    const r = world.renderer;

    const t = new Painter(27, 6, k * 0.8);
    t.paper('#efe6cf', { seed: 500 });
    t.text('KIND WORDS', 1.2, 1.9, { family: 'mono', size: 0.42, weight: 600 }, INK.muted, { spacing: 0.16 });
    t.text('Some seeds were', 1.1, 4.6, { family: 'serif', size: 2.0 }, INK.ink);
    t.text('planted by others.', 1.1 + t.measure('Some seeds were ', { family: 'serif', size: 2.0 }), 4.6, { family: 'serif', size: 2.0, italic: true }, INK.blue);
    t.grain(0.05);
    t.edge(0.12, 501);
    this.title = new Sheet({ w: 27, h: 6, front: t.texture(r) });
    this.group.add(this.title.group);
    world.shades.add(this.title.shade!);

    testimonials.forEach((tm, i) => {
      const p = new Painter(NOTE.w, NOTE.h, k);
      p.paper(TONES[tm.tone], { seed: 510 + i, fibres: 1, mottle: 0.8 });
      // faint ruling, like a page from a pad
      for (let y = 3.2; y < NOTE.h - 2.6; y += 1.05) p.line(0.8, y, NOTE.w - 0.8, y, 'rgba(54,95,186,0.13)', 0.02);
      p.text('“', 0.9, 2.9, { family: 'serif', size: 3.0 }, 'rgba(201,143,39,0.85)');
      const size = tm.quote.length > 110 ? 0.92 : 1.12;
      p.para([{ family: 'hand', size, text: tm.quote, color: INK.indigo }], 1.1, 3.0, NOTE.w - 2.2, 1.05);
      p.line(1.1, NOTE.h - 2.5, 5.5, NOTE.h - 2.5, 'rgba(28,35,51,0.35)', 0.025);
      p.text(tm.name, 1.1, NOTE.h - 1.55, { family: 'sans', size: 0.5, weight: 600 }, INK.ink);
      p.text(tm.role, 1.1, NOTE.h - 0.85, { family: 'sans', size: 0.38 }, INK.muted);
      if (i !== 1) p.tape(NOTE.w / 2 + (i ? 3 : -2), 0.2, 5, 1.4, i ? 0.06 : -0.05, 'rgba(240,232,205,0.85)', 520 + i);
      p.grain(0.04);
      p.edge(0.05, 530 + i);
      const sheet = new Sheet({ w: NOTE.w, h: NOTE.h, front: p.texture(r), segments: 10 });
      sheet.uniforms.uCurl.value = 0.16;
      this.group.add(sheet.group);
      world.shades.add(sheet.shade!);
      this.notes.push(sheet);
    });
    this.clip = paperclip();
    this.group.add(this.clip);

    const img = await loadImage('/assets/family-together.webp');
    const pol = new Painter(13, 12.2, k * 0.8);
    pol.paper('#fbfaf5', { seed: 540, fibres: 0.3, mottle: 0.3 });
    pol.image(img, 0.6, 0.6, 11.8, 8.9, { cover: true });
    pol.text('bringing worlds together.', 6.5, 11.1, { family: 'hand', size: 0.95 }, INK.soft, { align: 'center', rotate: -0.02 });
    pol.grain(0.05);
    this.polaroid = new Sheet({ w: 13, h: 12.2, front: pol.texture(r), roughness: 0.45 });
    this.polaroid.uniforms.uCurl.value = 0.1;

    const chit = new Painter(12, 7, k * 0.8);
    chit.paper('#fbf6e8', { seed: 550 });
    chit.para([{ family: 'hand', size: 0.85, text: 'Ask my Grandma and she’ll say I taught her to shop on Amazon. Ask my Mom — I unlocked the Smart TV’s magic.', color: INK.ink }], 0.8, 1.6, 10.4, 0.9);
    chit.grain(0.05);
    chit.edge(0.1, 551);
    this.chit = new Sheet({ w: 12, h: 7, front: chit.texture(r) });
    this.chit.uniforms.uCurl.value = 0.14;
    this.group.add(this.polaroid.group, this.chit.group);
    world.shades.add(this.polaroid.shade!, this.chit.shade!);
    this.layout(world.aspect < 0.8);
  }

  private layout(portrait: boolean) {
    this.portrait = portrait;
    this.Z = stationZ('words', portrait);
    const Z = this.Z;
    const P = portrait;
    this.title.group.position.set(P ? 0 : -22, 0.1, P ? Z - 15 : Z - 19.5);
    this.title.group.rotation.y = 0.015;
    this.title.group.scale.setScalar(P ? 0.8 : 1);
    this.polaroid.group.position.set(P ? -2 : 32, 0.12, P ? Z + 52 : Z - 9);
    this.polaroid.group.rotation.y = P ? 0.05 : 0.09;
    this.chit.group.position.set(P ? 3 : 31, 0.16, P ? Z + 64 : Z + 9);
    this.chit.group.rotation.y = -0.07;
    for (const s of [this.title, this.polaroid, this.chit]) s.syncShade(s.group.position.y);
  }

  update(ph: number, dt: number, world: TableWorld) {
    if (!this.notes.length) return;
    const portrait = world.aspect < 0.8;
    if (portrait !== this.portrait) this.layout(portrait);
    this.group.visible = (ph > -1 && ph < 2) || world.current === 'outro';
    if (!this.group.visible) return;
    this.notes.forEach((n, i) => {
      const s = this.slot(i);
      // slid across the table to you, one after another
      const a = easeOut(range(ph, portrait ? -0.5 + i * 0.25 : -0.45 + i * 0.16, portrait ? -0.05 + i * 0.25 : 0.05 + i * 0.16));
      const from = portrait ? { x: s.x + (i % 2 ? -30 : 30), z: s.z + 6 } : { x: s.x + (i - 1) * 16, z: s.z + 40 };
      const g = n.group;
      g.position.set(lerp(from.x, s.x, a), 0.12 + i * 0.03 + Math.sin(a * Math.PI) * 0.6, lerp(from.z, s.z, a));
      g.rotation.y = s.r + (1 - a) * (i % 2 ? -0.5 : 0.4);
      n.uniforms.uBow.value = Math.sin(a * Math.PI) * 0.08;
      n.syncShade(g.position.y, a);
      g.visible = a > 0.001;
      if (i === 1) {
        // the clip holds the middle note's top edge
        const lp = new THREE.Vector3(NOTE.w / 2 - 3.5, 0, -NOTE.h / 2 + 1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
        this.clip.position.copy(g.position).add(lp).setY(g.position.y + 0.05);
        this.clip.rotation.y = g.rotation.y;
        this.clip.visible = g.visible;
      }
    });
    void dt;
    void clamp;
  }
}
