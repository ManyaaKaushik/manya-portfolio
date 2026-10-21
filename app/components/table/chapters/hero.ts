import * as THREE from 'three';
import { INK, Painter, loadImage, paperDensity } from '../paint';
import { Sheet } from '../paper';
import { chai, pencil, sunflower, waxSeal } from '../props';
import { phase } from '../timeline';
import { clamp, easeBack, easeInOut, easeOut, hump, lerp, range, smooth } from '../util';
import type { Chapter, TableWorld, View } from '../world';

/*
 * 07:00 — Morning chai. A sealed envelope from Manya waits by a glass of chai. Scroll and it
 * opens: the seal pops, the flap lifts, the letter slides out and unfolds into her hello.
 * On the way back round (the end of the night) it all folds up again.
 */

const ENV = { w: 26, h: 17 };
const LETTER = { w: 23, h: 31 };
const ENV_TONE = '#e2cfa8';

export class Hero implements Chapter {
  readonly id = 'hero' as const;
  readonly group = new THREE.Group();

  private envelope = new THREE.Group();
  private body!: Sheet;
  private inner!: Sheet;
  private flap!: Sheet;
  private letter = new THREE.Group();
  private top!: Sheet;
  private bottom!: Sheet;
  private seal!: THREE.Mesh;
  private note!: Sheet;
  private polaroid!: Sheet;
  private flower!: THREE.Group;
  private tea!: ReturnType<typeof chai>;
  private pencils: THREE.Group[] = [];
  private portrait = false;
  private t = 0;

  view(u: number, aspect: number): View {
    const portrait = aspect < 0.8;
    const wide = portrait ? { x: 0, z: 0, w: 40, h: 66 } : { x: 0, z: 0, w: 104, h: 64 };
    const close = portrait ? { x: 0, z: -2.5, w: 26.5, h: 36 } : { x: 0, z: -2.5, w: 46, h: 37 };
    const t = easeInOut(range(u, 0.34, 0.7));
    return { x: lerp(wide.x, close.x, t), z: lerp(wide.z, close.z, t), w: lerp(wide.w, close.w, t), h: lerp(wide.h, close.h, t) };
  }

  async build(world: TableWorld) {
    const k = paperDensity();
    const r = world.renderer;
    const [manya, blinkit] = await Promise.all([loadImage('/assets/manya.webp'), loadImage('/assets/blinkit.svg')]);

    /* ---- the envelope ---- */
    const body = new Painter(ENV.w, ENV.h, k * 0.8);
    body.paper(ENV_TONE, { seed: 2, fibres: 1.2 });
    const c = body.ctx;
    const K = body.k;
    // the folded flaps on the back: left, right and bottom, with a shadow line under each edge
    const seam = (pts: [number, number][], shade: number) => {
      c.save();
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x * K, y * K) : c.moveTo(x * K, y * K)));
      c.closePath();
      c.fillStyle = `rgba(255,250,235,${0.12 * shade})`;
      c.fill();
      c.shadowColor = 'rgba(70,45,10,0.35)';
      c.shadowBlur = 0.25 * K;
      c.shadowOffsetY = -0.05 * K;
      c.strokeStyle = 'rgba(120,90,45,0.35)';
      c.lineWidth = 0.035 * K;
      c.stroke();
      c.restore();
    };
    seam([[0, 0.2], [11.2, 9.4], [0, 17]], 1);
    seam([[26, 0.2], [14.8, 9.4], [26, 17]], 1);
    seam([[0, 17], [10.6, 8.6], [15.4, 8.6], [26, 17]], 2);
    body.grain(0.05);
    // the open pocket under the flap
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000';
    c.beginPath();
    c.moveTo(0.25 * K, 0);
    c.lineTo(25.75 * K, 0);
    c.lineTo(13 * K, 8.3 * K);
    c.closePath();
    c.fill();
    c.restore();
    body.edge(0.05, 3);

    const inside = new Painter(ENV.w - 0.4, ENV.h - 0.4, k * 0.5);
    inside.fill('#bfa57a');
    // a printed lining, the way good envelopes have
    for (let y = 0; y < inside.h; y += 0.9)
      for (let x = (y / 0.9) % 2 ? 0.45 : 0; x < inside.w; x += 0.9) inside.text('✿', x, y + 0.6, { family: 'sans', size: 0.42 }, 'rgba(34,52,109,0.42)');
    inside.grain(0.08);

    const flap = new Painter(ENV.w, 11, k * 0.8);
    flap.paper(ENV_TONE, { seed: 5, fibres: 1.2 });
    flap.text('from —', 4.4, 3.0, { family: 'hand', size: 1.05 }, INK.soft, { rotate: -0.03 });
    flap.text('Manya Kaushik', 4.2, 4.6, { family: 'hand', size: 1.7 }, INK.indigo, { rotate: -0.03 });
    flap.text('product designer', 15.6, 3.0, { family: 'hand', size: 1.05 }, INK.soft, { rotate: -0.02 });
    flap.text('to — whoever’s visiting', 15.6, 4.6, { family: 'hand', size: 1.05 }, INK.soft, { rotate: -0.02 });
    flap.grain(0.05);
    flap.ctx.save();
    flap.ctx.globalCompositeOperation = 'destination-in';
    flap.ctx.fillStyle = '#000';
    flap.ctx.beginPath();
    flap.ctx.moveTo(0, 0);
    flap.ctx.lineTo(flap.canvas.width, 0);
    flap.ctx.lineTo(14.2 * flap.k, 10.2 * flap.k);
    flap.ctx.quadraticCurveTo(13 * flap.k, 11 * flap.k, 11.8 * flap.k, 10.2 * flap.k);
    flap.ctx.closePath();
    flap.ctx.fill();
    flap.ctx.restore();
    const flapBack = new Painter(ENV.w, 11, k * 0.4);
    flapBack.fill('#c3a97e');
    flapBack.grain(0.08);

    this.inner = new Sheet({ w: ENV.w - 0.4, h: ENV.h - 0.4, front: inside.texture(r), shade: false, segments: 2 });
    this.inner.uniforms.uCurl.value = 0;
    this.body = new Sheet({ w: ENV.w, h: ENV.h, front: body.texture(r) });
    this.body.uniforms.uCurl.value = 0.06;
    this.flap = new Sheet({ w: ENV.w, h: 11, front: flap.texture(r), back: flapBack.texture(r), turn: 'end', pivot: 'top', shade: false, segments: 8 });
    this.flap.uniforms.uCurl.value = 0;
    this.inner.group.position.y = 0.04;
    this.body.group.position.y = 0.3;
    this.flap.group.position.set(0, 0.36, -ENV.h / 2);
    this.envelope.add(this.inner.group, this.body.group, this.flap.group);

    this.seal = waxSeal();
    this.seal.position.set(0, 0.5, -ENV.h / 2 + 10.2);
    this.envelope.add(this.seal);

    /* ---- the letter ---- */
    const front = new Painter(LETTER.w, LETTER.h, k);
    front.paper('#f7f1e2', { seed: 12, fibres: 1.4, flecks: 1.4 });
    const L = 2.2;
    const W = LETTER.w - L * 2;
    front.text('Good morning,', L, 3.6, { family: 'hand', size: 1.9 }, INK.blue, { rotate: -0.02 });
    front.text('Hey, I’m', L, 7.6, { family: 'serif', size: 3.3 }, INK.ink);
    front.text('Manya.', L + front.measure('Hey, I’m ', { family: 'serif', size: 3.3 }), 7.6, { family: 'serif', size: 3.3, italic: true }, INK.blue);
    // currently at
    front.rect(L, 9.0, 7.4, 1.25, '#1c2333', 0.62);
    front.text('PRODUCT DESIGNER AT', L + 0.45, 9.83, { family: 'mono', size: 0.36, weight: 600 }, '#f6f4eb', { spacing: 0.12 });
    if (blinkit) front.image(blinkit, L + 4.95, 9.22, 2.1, 0.8);
    let y = front.para(
      [
        { family: 'sans', size: 0.68, text: 'Building for ', color: INK.soft },
        { family: 'serif', size: 0.86, italic: true, text: 'consumer & enterprise.', color: INK.blue },
        { family: 'sans', size: 0.68, text: ' Before that, 0 → 1 work across quick commerce, supply chain, travel, agentic AI, healthcare, music & entertainment.', color: INK.soft },
      ],
      L,
      12.0,
      W,
      1.08,
    );
    y = front.para(
      [
        { family: 'sans', size: 0.68, text: 'I design for the small frictions — the clicks, pauses and glances in between — and I’d like technology to feel as familiar as ', color: INK.soft },
        { family: 'serif', size: 0.86, italic: true, text: 'a conversation with Grandma.', color: INK.ink },
      ],
      L,
      y + 1.7,
      W,
      1.08,
    );
    front.para([{ family: 'hand', size: 1.2, text: 'The whole day is laid out on this table. Pull up a chair, scroll, and I’ll show you around —', color: INK.indigo }], L, y + 2.3, W, 1.3);
    front.text('Manya', L + 0.2, LETTER.h - 3.6, { family: 'hand', size: 2.2 }, INK.indigo, { rotate: -0.05 });
    front.handLine(
      [
        [L, LETTER.h - 3.0],
        [L + 3.5, LETTER.h - 3.2],
        [L + 6.4, LETTER.h - 3.05],
      ],
      INK.indigo,
      0.06,
      4,
    );
    // a sunflower doodle in the corner
    const fx = LETTER.w - 4.4;
    const fy = LETTER.h - 4.6;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      front.handLine(
        [
          [fx + Math.cos(a) * 0.9, fy + Math.sin(a) * 0.9],
          [fx + Math.cos(a + 0.18) * 1.9, fy + Math.sin(a + 0.18) * 1.9],
          [fx + Math.cos(a + 0.36) * 0.95, fy + Math.sin(a + 0.36) * 0.95],
        ],
        INK.gold,
        0.07,
        i + 9,
      );
    }
    front.ctx.fillStyle = 'rgba(90,60,20,0.75)';
    front.ctx.beginPath();
    front.ctx.arc(fx * front.k, fy * front.k, 0.75 * front.k, 0, Math.PI * 2);
    front.ctx.fill();
    front.handLine(
      [
        [fx + 0.3, fy + 1.9],
        [fx + 0.8, fy + 3.2],
        [fx + 0.6, fy + 4.2],
      ],
      INK.sage,
      0.08,
      31,
    );
    front.text('SIMPLER · CLEARER · MORE HUMAN', LETTER.w / 2, LETTER.h - 1.3, { family: 'mono', size: 0.32, weight: 500 }, INK.muted, { align: 'center', spacing: 0.18 });
    // where it was folded
    const g = front.ctx.createLinearGradient(0, (LETTER.h / 2 - 0.5) * front.k, 0, (LETTER.h / 2 + 0.5) * front.k);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(80,60,30,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    front.ctx.fillStyle = g;
    front.ctx.fillRect(0, (LETTER.h / 2 - 0.5) * front.k, front.canvas.width, front.k);
    front.grain(0.04);
    front.edge(0.18, 21);

    const back = new Painter(LETTER.w, LETTER.h, k * 0.6);
    back.paper('#f3ecdb', { seed: 13, fibres: 1.4 });
    // seen on the outside of the folded letter
    back.text('psst…', LETTER.w / 2, 6.6, { family: 'hand', size: 2.6 }, INK.indigo, { align: 'center', rotate: -0.03 });
    back.text('this one’s for you', LETTER.w / 2, 9.4, { family: 'hand', size: 1.8 }, INK.indigo, { align: 'center', rotate: -0.03 });
    back.grain(0.04);

    const ft = front.texture(r);
    const bt = back.texture(r);
    this.top = new Sheet({ w: LETTER.w, h: LETTER.h / 2, front: ft, uv: [0, 0.5, 1, 1], pivot: 'bottom', shade: false, segments: 10 });
    this.bottom = new Sheet({ w: LETTER.w, h: LETTER.h / 2, front: ft, back: bt, turn: 'end', uv: [0, 0, 1, 0.5], pivot: 'top', shade: false, segments: 10 });
    this.top.uniforms.uCurl.value = 0.05;
    this.bottom.uniforms.uCurl.value = 0.05;
    this.bottom.group.position.y = 0.06;
    this.letter.add(this.top.group, this.bottom.group);

    /* ---- around it ---- */
    const note = new Painter(7.6, 7.6, k * 0.8);
    note.fill('#f6d354');
    const ng = note.ctx.createLinearGradient(0, 0, 0, note.canvas.height);
    ng.addColorStop(0, 'rgba(180,120,0,0.18)');
    ng.addColorStop(0.25, 'rgba(0,0,0,0)');
    note.ctx.fillStyle = ng;
    note.ctx.fillRect(0, 0, note.canvas.width, note.canvas.height);
    note.text('psst —', 1.0, 3.0, { family: 'hand', size: 1.45 }, INK.ink, { rotate: -0.06 });
    note.text('open it ↓', 1.0, 5.2, { family: 'hand', size: 1.45 }, INK.ink, { rotate: -0.06 });
    note.grain(0.05);
    this.note = new Sheet({ w: 7.6, h: 7.6, front: note.texture(r), roughness: 0.6 });
    this.note.uniforms.uCurl.value = 0.25;

    const pol = new Painter(9.4, 11.6, k * 0.8);
    pol.paper('#fbfaf5', { seed: 31, fibres: 0.4, mottle: 0.4 });
    const pg = pol.ctx.createLinearGradient(0, 0, 0, 8.4 * pol.k);
    pg.addColorStop(0, '#c9d6ee');
    pg.addColorStop(1, '#efe6d2');
    pol.ctx.fillStyle = pg;
    pol.ctx.fillRect(0.6 * pol.k, 0.6 * pol.k, 8.2 * pol.k, 8.4 * pol.k);
    pol.image(manya, 0.6, 0.6, 8.2, 8.4, { cover: true, focus: [0.5, 0.12] });
    pol.text('me, mid-thought', 4.7, 10.5, { family: 'hand', size: 1.0 }, INK.soft, { align: 'center', rotate: -0.02 });
    pol.grain(0.05);
    this.polaroid = new Sheet({ w: 9.4, h: 11.6, front: pol.texture(r), roughness: 0.45 });
    this.polaroid.uniforms.uCurl.value = 0.08;

    this.flower = sunflower();
    this.tea = chai();
    this.pencils = [pencil('#2f4f9a', 17.5), pencil('#e2b33a', 14)];

    this.group.add(this.envelope, this.letter, this.note.group, this.polaroid.group, this.flower, this.tea.group, ...this.pencils);
    for (const s of [this.body, this.note, this.polaroid]) if (s.shade) world.shades.add(s.shade);
    this.layout(world.aspect < 0.8);

    world.hotspots.push({
      object: this.envelope,
      cursor: 'pointer',
      chapter: 'hero',
      onClick: () => world.goTo?.('hero', 0.78),
    });
  }

  private layout(portrait: boolean) {
    this.portrait = portrait;
    const P = portrait;
    this.polaroid.group.position.set(P ? -8 : -37, 0.12, P ? -23 : -12);
    this.polaroid.group.rotation.y = 0.16;
    this.flower.position.set(P ? 9 : -33, 0, P ? 22 : 17);
    this.flower.rotation.y = P ? -0.5 : 0.3;
    this.tea.group.position.set(P ? 10 : 37, 0, P ? -26 : -16);
    this.polaroid.syncShade(0.12);
    this.pencils[0].position.set(P ? -4 : 33, 0.38, P ? 30 : 16);
    this.pencils[0].rotation.y = 0.5;
    this.pencils[1].position.set(P ? 4 : 30, 0.38, P ? 33 : 21);
    this.pencils[1].rotation.y = 0.35;
  }

  update(ph: number, dt: number, world: TableWorld) {
    if (!this.top) return;
    this.t += dt;
    const portrait = world.aspect < 0.8;
    if (portrait !== this.portrait) this.layout(portrait);
    // on the way back round, the envelope closes up again before dawn reaches it
    const outro = phase(world.progress, 'outro');
    let u = clamp(ph, 0, 1);
    if (outro > 0 && outro <= 1) u = 1 - smooth(range(outro, 0.45, 0.85));
    else if (ph > 1 && outro <= 0) u = 1;
    this.group.visible = ph < 1.95 || outro > 0;

    const envRot = -0.05;
    const away = easeInOut(range(u, 0.4, 0.62));
    this.envelope.position.set(lerp(0, this.portrait ? 3 : 15, away), 0, lerp(0, this.portrait ? 27 : 23, away));
    this.envelope.rotation.y = envRot + away * 0.18;
    this.body.syncShade(0.3);
    if (this.body.shade) this.body.shade.position.copy(this.envelope.position).setY(0.02);

    // the note flies off first
    const n = easeOut(range(u, 0.02, 0.14));
    this.note.group.position.set(lerp(this.portrait ? 9 : 12.5, 70, n), 0.42 + hump(n, 0, 1) * 18, lerp(this.portrait ? -9 : -9.5, -50, n));
    this.note.group.rotation.set(0, 0.12 + n * 2.2, n * 0.6);
    this.note.group.visible = n < 0.999;
    this.note.uniforms.uCurl.value = 0.25 + n * 1.5;
    this.note.syncShade(this.note.group.position.y, 1 - n);

    // the seal pops and rolls aside
    const s = range(u, 0.06, 0.2);
    const sp = easeBack(s);
    this.seal.position.set(lerp(0, -11, sp), 0.5 + hump(s, 0, 1) * 6, lerp(-ENV.h / 2 + 10.2, -ENV.h / 2 + 15, sp));
    this.seal.rotation.set(hump(s, 0, 1) * 1.2, s * 2.6, -s * 0.4);

    // the flap swings up and over
    // and closes again once the letter is out, as the envelope is pushed aside
    const f = easeInOut(range(u, 0.14, 0.32)) * (1 - easeInOut(range(u, 0.5, 0.64)));
    this.flap.group.rotation.x = -Math.PI * f * 0.985;
    this.flap.uniforms.uBow.value = hump(f, 0, 1) * 0.12;
    this.flap.group.position.y = 0.36 + f * 0.02;

    // the letter slides out of the pocket, lifts, and unfolds
    const out = easeInOut(range(u, 0.28, 0.5));
    const land = easeInOut(range(u, 0.44, 0.62));
    const open = easeInOut(range(u, 0.5, 0.72));
    // the letter's origin is its fold line; folded, it fills the envelope
    const inEnv = new THREE.Vector3(0, 0, LETTER.h / 4 + 0.2);
    const pulled = new THREE.Vector3(0, 0, LETTER.h / 4 - 17.5);
    const rest = new THREE.Vector3(0, 0, -2.5);
    const p = inEnv.clone().lerp(pulled, out).lerp(rest, land);
    // it stays under the envelope's back until it's clear of the pocket
    p.y = lerp(0.15, 0.9, range(out, 0.8, 1)) + hump(out, 0.8, 1) * 2.5 - land * 0.45;
    // while it's in the envelope it moves with the envelope
    const envFollow = 1 - land;
    p.x += this.envelope.position.x * envFollow;
    p.z += this.envelope.position.z * envFollow;
    this.letter.position.copy(p);
    this.letter.rotation.y = lerp(envRot, -0.012, land) + hump(out, 0, 1) * 0.04;
    // folded: the bottom half lies over the top half, face down
    this.bottom.group.rotation.x = -Math.PI * (1 - open);
    this.bottom.uniforms.uBow.value = hump(open, 0, 1) * 0.1;
    this.top.uniforms.uBow.value = hump(out, 0.3, 1) * 0.04;
    // the top half's pivot is its lower edge, i.e. the fold
    this.top.group.position.set(0, 0, 0);
    this.bottom.group.position.set(0, 0.06 + (1 - open) * 0.05, 0);

    this.tea.update(this.t, world.daylight);
    this.tea.steamAlpha(clamp(1 - (world.hour - 9) / 1.5));
  }

  busy() {
    return false;
  }
}
