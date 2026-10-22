import * as THREE from 'three';
import { links, studies, whatIfs } from '../../../lib/content';
import { INK, Painter, loadImage, paperDensity } from '../paint';
import { Sheet } from '../paper';
import { Ukulele } from '../ukulele';
import { stationZ } from '../stations';
import { clamp, damp, easeInOut, hump, lerp, range, rng } from '../util';
import type { Chapter, TableWorld, View } from '../world';
import { keyed } from './work';

/*
 * 15:00 — Afternoon play. The garden studies come as seed packets that turn over to show their
 * sowing instructions; a stack of "what if" slips to draw from; her sketchbook, in polaroids;
 * a sticker that leads to the playground; and her ukulele, to pick up and play.
 */

const PACKET = { w: 11.5, h: 16.5 };
const SLIP = { w: 13.5, h: 5.2 };

type Packet = { sheet: Sheet; flip: number; manual: boolean; hover: number };
type Slip = { sheet: Sheet; at: THREE.Vector3; rot: number };

export class Play implements Chapter {
  readonly id = 'play' as const;
  readonly group = new THREE.Group();
  private packets: Packet[] = [];
  private slips: Slip[] = [];
  private drawn = 0;
  private sketches: Sheet[] = [];
  private sticker!: Sheet;
  private stickerHover = 0;
  private portrait = false;
  private Z = 296;
  private moving = 0;
  readonly uke = new Ukulele();

  view(u: number, aspect: number): View {
    const portrait = aspect < 0.8;
    const Z = stationZ('play', portrait);
    if (portrait) {
      const z = keyed(u, [
        [0, Z - 14],
        [0.2, Z - 14],
        [0.35, Z + 8],
        [0.75, Z + 42],
        [1, Z + 128],
      ]);
      return { x: 0, z, w: 27, h: 46 };
    }
    const t = easeInOut(range(u, 0.18, 0.34));
    const back = easeInOut(range(u, 0.86, 1));
    const w = lerp(lerp(100, 68, t), 100, back);
    return { x: lerp(lerp(-3, -2, t), -3, back), z: Z + lerp(0, 1, t), w, h: w * 0.6 };
  }

  private packetSlot(i: number) {
    const Z = this.Z;
    return this.portrait ? { x: (i - 1) * 1.2, z: Z + i * 19, r: [0.04, -0.03, 0.02][i] } : { x: -23 + i * 14, z: Z + [1, -1, 1.5][i], r: [-0.06, 0.02, 0.07][i] };
  }

  async build(world: TableWorld) {
    const k = paperDensity();
    const r = world.renderer;

    /* ---- seed packets ---- */
    const tones = ['#e2d3ef', '#f2dd8a', '#d3e6c5'];
    for (const [i, s] of studies.entries()) {
      const img = await loadImage(s.plant);
      const f = new Painter(PACKET.w, PACKET.h, k);
      f.paper('#dcc69b', { seed: 400 + i, fibres: 1.3 });
      // the printed front: a coloured field, the plant, the name
      f.rect(0.7, 0.7, PACKET.w - 1.4, PACKET.h - 1.4, tones[i], 0.25);
      f.strokeRect(0.95, 0.95, PACKET.w - 1.9, PACKET.h - 1.9, 'rgba(28,35,51,0.5)', 0.03, 0.15);
      f.text(`GARDEN STUDY No. ${i + 1}`, PACKET.w / 2, 2.0, { family: 'mono', size: 0.34, weight: 600 }, INK.ink, { align: 'center', spacing: 0.18 });
      f.ctx.save();
      f.ctx.globalCompositeOperation = 'multiply';
      f.image(img, 1.4, 2.6, PACKET.w - 2.8, 8.8, { filter: 'contrast(1.15)' });
      f.ctx.restore();
      f.text(s.name, PACKET.w / 2, 12.9, { family: 'serif', size: 1.75 }, INK.ink, { align: 'center' });
      f.text(s.type, PACKET.w / 2, 13.95, { family: 'serif', size: 0.72, italic: true }, INK.soft, { align: 'center' });
      f.line(2.4, 14.6, PACKET.w - 2.4, 14.6, 'rgba(28,35,51,0.3)', 0.02);
      f.text('NET WT. ONE CURIOUS IDEA', PACKET.w / 2, 15.2, { family: 'mono', size: 0.24, weight: 600 }, INK.muted, { align: 'center', spacing: 0.14 });
      f.distress(0.7, 0.7, PACKET.w - 1.4, PACKET.h - 1.4, 0.12, 410 + i);
      f.grain(0.05);
      f.edge(0.03, 420 + i);

      const b = new Painter(PACKET.w, PACKET.h, k);
      b.paper('#e4d1a8', { seed: 430 + i, fibres: 1.3 });
      b.line(0.4, 2.2, PACKET.w - 0.4, 2.2, 'rgba(60,40,20,0.35)', 0.025, [0.15, 0.12]);
      b.text('✂  tear here', PACKET.w - 0.8, 1.5, { family: 'mono', size: 0.26 }, 'rgba(60,40,20,0.6)', { align: 'right' });
      b.text('SOWING INSTRUCTIONS', 0.9, 3.6, { family: 'mono', size: 0.34, weight: 700 }, INK.ink, { spacing: 0.16 });
      let y = b.para([{ family: 'serif', size: 0.82, italic: true, text: s.description, color: INK.ink }], 0.9, 5.0, PACKET.w - 1.8, 0.92);
      y += 1.2;
      const facts: [string, string][] = [
        ['SOW', 'wherever people meet systems'],
        ['LIGHT', 'plenty of curiosity'],
        ['WATER', 'questions, daily'],
        ['BLOOMS', 'still growing'],
      ];
      for (const [a, v] of facts) {
        b.text(a, 0.9, y, { family: 'mono', size: 0.28, weight: 700 }, INK.muted, { spacing: 0.12 });
        b.text(v, 3.6, y, { family: 'hand', size: 0.62 }, INK.indigo);
        y += 0.85;
      }
      b.text('seeds of an idea · not for eating', PACKET.w / 2, PACKET.h - 0.9, { family: 'mono', size: 0.24 }, INK.muted, { align: 'center' });
      b.grain(0.05);

      const sheet = new Sheet({ w: PACKET.w, h: PACKET.h, front: f.texture(r), back: b.texture(r), turn: 'side', segments: 10 });
      sheet.uniforms.uCurl.value = 0.1;
      this.group.add(sheet.group);
      world.shades.add(sheet.shade!);
      const packet: Packet = { sheet, flip: 0, manual: false, hover: 0 };
      this.packets.push(packet);
      world.hotspots.push({
        object: sheet.mesh,
        cursor: 'pointer',
        chapter: 'play',
        label: `Turn over the ${s.name} seed packet`,
        onEnter: () => (packet.hover = 1),
        onLeave: () => (packet.hover = 0),
        onClick: () => {
          packet.manual = !packet.manual;
          world.kick();
        },
      });
    }

    /* ---- what-if slips ---- */
    const rr = rng(450);
    whatIfs.forEach((q, i) => {
      const p = new Painter(SLIP.w, SLIP.h, k * 0.85);
      p.paper(['#fbf6e8', '#f6efdc', '#fbf6e8', '#f3ecd9'][i % 4], { seed: 460 + i, fibres: 0.8 });
      p.text(`WHAT IF · ${String(i + 1).padStart(2, '0')}/${String(whatIfs.length).padStart(2, '0')}`, 0.8, 1.15, { family: 'mono', size: 0.28, weight: 600 }, INK.muted, { spacing: 0.14 });
      p.para([{ family: 'hand', size: 0.86, text: q.replace(/^What if /, '…'), color: INK.indigo }], 0.8, 2.3, SLIP.w - 1.6, 0.86);
      p.text('tap for another ↻', SLIP.w - 0.6, SLIP.h - 0.45, { family: 'mono', size: 0.24 }, INK.muted, { align: 'right' });
      p.grain(0.04);
      p.edge(0.08, 470 + i);
      const sheet = new Sheet({ w: SLIP.w, h: SLIP.h, front: p.texture(r), segments: 8 });
      sheet.uniforms.uCurl.value = 0.12;
      this.group.add(sheet.group);
      world.shades.add(sheet.shade!);
      this.slips.push({ sheet, at: new THREE.Vector3(), rot: (rr() - 0.5) * 0.12 });
      world.hotspots.push({
        object: sheet.mesh,
        cursor: 'pointer',
        chapter: 'play',
        label: 'Draw another what-if',
        onClick: () => {
          this.drawn = (this.drawn + 1) % this.slips.length;
          world.kick();
        },
      });
    });

    /* ---- her sketchbook, in polaroids ---- */
    const sk = await Promise.all([loadImage('/assets/sketch-world.webp'), loadImage('/assets/sketch-creature.webp')]);
    const captions = ['a whole world, in pencil', 'a creature I made up'];
    sk.forEach((img, i) => {
      const p = new Painter(10.2, 12.8, k * 0.8);
      p.paper('#fbfaf5', { seed: 480 + i, fibres: 0.3, mottle: 0.3 });
      p.image(img, 0.6, 0.6, 9, 9.6, { cover: true, focus: [0.5, 0.4] });
      p.text(captions[i], 5.1, 11.6, { family: 'hand', size: 0.9 }, INK.soft, { align: 'center', rotate: -0.02 });
      p.grain(0.05);
      const sheet = new Sheet({ w: 10.2, h: 12.8, front: p.texture(r), roughness: 0.45 });
      sheet.uniforms.uCurl.value = 0.1;
      this.group.add(sheet.group);
      world.shades.add(sheet.shade!);
      this.sketches.push(sheet);
    });

    /* ---- the sticker ---- */
    const st = new Painter(8, 8, k * 0.8);
    const c = st.ctx;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(4 * st.k, 4 * st.k, 4 * st.k, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f4c021';
    c.beginPath();
    c.arc(4 * st.k, 4 * st.k, 3.6 * st.k, 0, Math.PI * 2);
    c.fill();
    st.text('more', 4, 3.0, { family: 'hand', size: 1.0 }, INK.ink, { align: 'center' });
    st.text('playful', 4, 4.4, { family: 'serif', size: 1.35, italic: true }, INK.ink, { align: 'center' });
    st.text('things ↗', 4, 5.7, { family: 'hand', size: 1.0 }, INK.ink, { align: 'center' });
    this.sticker = new Sheet({ w: 8, h: 8, front: st.texture(r), roughness: 0.35, segments: 6 });
    this.sticker.uniforms.uCurl.value = 0.05;
    this.group.add(this.sticker.group);
    world.shades.add(this.sticker.shade!);
    world.hotspots.push({
      object: this.sticker.mesh,
      cursor: 'pointer',
      chapter: 'play',
      label: 'More playful things',
      onEnter: () => (this.stickerHover = 1),
      onLeave: () => (this.stickerHover = 0),
      onClick: () => world.open?.(links.playground),
    });

    this.layout(world.aspect < 0.8);
    // the ukulele is the heaviest thing on the table: it comes in behind the page's first view, and
    // its shaders are ready before it's shown
    void this.uke
      .load(world)
      .then(() => world.renderer.compileAsync(this.uke.group, world.camera, world.scene))
      .then(() => this.group.add(this.uke.group))
      .catch(err => console.error(err));
  }

  private layout(portrait: boolean) {
    this.portrait = portrait;
    this.Z = stationZ('play', portrait);
    const Z = this.Z;
    const P = portrait;
    this.sketches[0].group.position.set(P ? -5 : -44, 0.1, P ? Z + 66 : Z - 9);
    this.sketches[0].group.rotation.y = 0.12;
    this.sketches[1].group.position.set(P ? 5 : -38, 0.14, P ? Z + 78 : Z + 13);
    this.sketches[1].group.rotation.y = -0.1;
    this.sticker.group.position.set(P ? -7 : -15, 0.08, P ? Z + 90 : Z + 21);
    // the ukulele lies across the corner of the table, its neck running off towards the top; picked
    // up, it turns to lie across the view (upright on a phone, where the view is tall)
    this.uke.place(P ? { x: 1, z: Z + 124, r: -0.1 } : { x: 31, z: Z - 3, r: -0.5 }, P ? { x: 0, z: Z + 124, r: 0 } : { x: 30, z: Z + 4, r: -Math.PI / 2 }, P);
    this.sticker.group.rotation.y = 0.2;
    for (const s of [...this.sketches, this.sticker]) s.syncShade(s.group.position.y);
  }

  update(ph: number, dt: number, world: TableWorld) {
    if (!this.packets.length) return;
    const portrait = world.aspect < 0.8;
    if (portrait !== this.portrait) this.layout(portrait);
    this.group.visible = (ph > -1 && ph < 2) || world.current === 'outro';
    if (!this.group.visible) return;
    const u = clamp(ph, 0, 1);
    let moving = false;

    this.packets.forEach((pk, i) => {
      const s = this.packetSlot(i);
      // each turns over in turn as the afternoon goes on; a click turns it back (or over)
      const auto = ph >= 0 && ph <= 1 && u > (portrait ? 0.3 + i * 0.2 : 0.38 + i * 0.14) ? 1 : 0;
      const target = (auto ? 1 : 0) ^ (pk.manual ? 1 : 0);
      pk.flip = damp(pk.flip, target, 6, dt);
      if (Math.abs(pk.flip - target) > 0.002) moving = true;
      const deal = easeInOut(range(ph, -0.7 + i * 0.1, -0.1 + i * 0.1));
      const g = pk.sheet.group;
      const turning = hump(pk.flip, 0, 1);
      g.position.set(s.x - (1 - deal) * 18, 0.12 + turning * PACKET.w * 0.4 + pk.hover * 0.6 + (1 - deal) * 8, s.z + (1 - deal) * 20);
      g.rotation.set(0, s.r + (1 - deal) * 0.6, Math.PI * pk.flip, 'YXZ');
      pk.sheet.uniforms.uBow.value = turning * 0.2 + pk.hover * 0.04;
      pk.sheet.syncShade(g.position.y, deal);
      g.visible = deal > 0.001;
    });

    // the slips: a neat stack, with drawn ones laid off to the side
    const Z = this.Z;
    const stack = portrait ? new THREE.Vector3(0, 0, Z - 20) : new THREE.Vector3(21, 0, Z - 6);
    const pile = portrait ? new THREE.Vector3(1, 0, Z - 14) : new THREE.Vector3(22, 0, Z + 2.5);
    const n = this.slips.length;
    this.slips.forEach((sl, i) => {
      // position in the cycle: 0 is on top of the stack
      const order = (i - this.drawn + n) % n;
      const target = order === 0 ? stack.clone().setY(0.1 + n * 0.06) : order === n - 1 && this.drawn > 0 ? pile.clone().setY(0.1) : stack.clone().setY(0.1 + (n - order) * 0.06);
      const offset = order === 0 ? 0 : 0.35 * order;
      target.x += offset * 0.6;
      target.z += offset * 0.3;
      sl.at.lerp(target, 1 - Math.exp(-9 * dt));
      if (sl.at.distanceTo(target) > 0.01) moving = true;
      const g = sl.sheet.group;
      g.position.copy(sl.at);
      g.position.y += hump(clamp(sl.at.distanceTo(target) / 6), 0, 1) * 2;
      g.rotation.y = sl.rot + (order === n - 1 && this.drawn > 0 ? 0.25 : 0);
      sl.sheet.syncShade(g.position.y);
      // only the top three are worth drawing
      g.visible = order < 3 || order === n - 1;
    });

    this.sticker.group.position.y = 0.08 + damp(this.sticker.group.position.y - 0.08, this.stickerHover * 0.8, 10, dt);
    this.sticker.uniforms.uCurl.value = 0.05 + this.stickerHover * 0.5;
    this.moving = moving ? 0.3 : Math.max(0, this.moving - dt);

    // the page has moved while it was in hand: put it down
    if (this.uke.state.open && Math.abs(world.progress - this.uke.openedAt) > 0.002) this.uke.close();
    this.uke.update(dt, this.group.visible);
  }

  busy() {
    return this.moving > 0;
  }
}
