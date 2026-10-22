import * as THREE from 'three';
import { withSun } from '../light';
import { INK, Painter, paperDensity } from '../paint';
import { Sheet } from '../paper';
import { stationZ } from '../stations';
import { clamp, easeInOut, easeOut, lerp, range, rng, smooth } from '../util';
import type { Chapter, TableWorld, View } from '../world';
import { keyed } from './work';

/*
 * 13:00 — Lunch break. Over lunch, where she comes from and what she brings: a library card
 * slides out of its pocket and a rubber stamp dates each step of the journey into design, while a
 * till receipt unrolls with the order for your team.
 */

const JOURNEY = [
  { when: 'as a kid', what: 'Art Attack, religiously', note: 'where glue and glitter began' },
  { when: '2020', what: 'B.Sc. Electronics', note: 'Sri Venkateswara College, DU' },
  { when: '2021', what: 'Co-founded Boolean', note: 'the college’s first tech club' },
  { when: '2022', what: 'UI/UX intern', note: 'IIT Bombay' },
  { when: '2023', what: 'UX design intern', note: 'IIT Delhi' },
  { when: '2024', what: 'M.Des Interaction Design', note: 'NID Bengaluru' },
  { when: '2025', what: 'Product design intern', note: 'Celebto' },
  { when: 'now', what: 'Product Designer', note: 'Blinkit' },
];

const BRING = ['User experience design', 'Design systems', 'User research', 'Data-driven design', 'Visual design', 'Strategic thinking', 'AI thinking', 'Collaboration & comms'];

const CARD = { w: 13.5, h: 21.5 };
const POCKET = { w: 14.6, h: 9.6 };
const RECEIPT = { w: 8.6, h: 28 };
const ROW0 = 5.6;
const ROW_H = 1.9;
const STAMP_T0 = 0.22;
const STAMP_DT = 0.072;
const STAMP_INK = '#5b3f8f';

export class Journey implements Chapter {
  readonly id = 'journey' as const;
  readonly group = new THREE.Group();
  private card!: Sheet;
  private cardPainter!: Painter;
  private cardBase!: ImageData;
  private cardTex!: THREE.CanvasTexture;
  private stamped = 0;
  private pocket!: Sheet;
  private pocketBack!: Sheet;
  private stamp = new THREE.Group();
  private receipt!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private receiptTex!: THREE.Texture;
  private roll!: THREE.Mesh;
  private portrait = false;
  private Z = 205;

  view(u: number, aspect: number): View {
    const portrait = aspect < 0.8;
    const Z = stationZ('journey', portrait);
    if (portrait) {
      const z = keyed(u, [
        [0, Z - 6],
        [0.45, Z - 5],
        [0.72, Z + 16],
        [1, Z + 27],
      ]);
      return { x: 0, z, w: 30, h: 50 };
    }
    const z = keyed(u, [
      [0, Z - 1],
      [0.6, Z + 1],
    ]);
    return { x: 0.5, z, w: 50, h: 46 };
  }

  private row(i: number, out = new THREE.Vector3()) {
    // centre of the date column of row i, in the card's frame, then the world's
    if (i < 0 || i >= JOURNEY.length) return out.set(this.card.group.position.x + 10.5, 0, this.card.group.position.z - 2 + (i < 0 ? -6 : 6));
    const local = new THREE.Vector3(-CARD.w / 2 + 2.55, 0, -CARD.h / 2 + ROW0 + i * ROW_H - 0.55);
    local.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.card.group.rotation.y);
    return out.copy(this.card.group.position).add(local).setY(0);
  }

  async build(world: TableWorld) {
    const k = paperDensity();
    const r = world.renderer;

    /* ---- the library card ---- */
    const p = new Painter(CARD.w, CARD.h, k);
    p.paper('#ecdcb4', { seed: 200, fibres: 1.2, flecks: 0.8 });
    p.text('THE POLYMATH’S LIBRARY', CARD.w / 2, 1.35, { family: 'mono', size: 0.36, weight: 600 }, INK.ink, { align: 'center', spacing: 0.2 });
    p.text('Journey into', 0.8, 3.15, { family: 'serif', size: 1.3 }, INK.ink);
    p.text('design', 0.8 + p.measure('Journey into ', { family: 'serif', size: 1.3 }), 3.15, { family: 'serif', size: 1.3, italic: true }, INK.blue);
    p.text('DATE DUE', 0.85, 4.55, { family: 'mono', size: 0.3, weight: 700 }, INK.red, { spacing: 0.14 });
    p.text('BORROWED', 4.7, 4.55, { family: 'mono', size: 0.3, weight: 700 }, INK.red, { spacing: 0.14 });
    p.line(0.6, 4.85, CARD.w - 0.6, 4.85, 'rgba(178,58,42,0.7)', 0.04);
    p.line(4.3, 3.9, 4.3, CARD.h - 1.0, 'rgba(178,58,42,0.6)', 0.035);
    for (let i = 0; i <= JOURNEY.length; i++) p.line(0.6, 4.85 + i * ROW_H, CARD.w - 0.6, 4.85 + i * ROW_H, 'rgba(54,95,186,0.28)', 0.025);
    JOURNEY.forEach((j, i) => {
      const y = ROW0 + i * ROW_H;
      p.text(j.what, 4.7, y + 0.15, { family: 'hand', size: 0.78 }, INK.indigo, { rotate: -0.008 });
      p.text(j.note, 4.72, y + 0.75, { family: 'sans', size: 0.34 }, INK.muted);
    });
    // the last line, circled in pencil
    const last = ROW0 + (JOURNEY.length - 1) * ROW_H;
    p.ctx.save();
    p.ctx.strokeStyle = 'rgba(70,70,80,0.65)';
    p.ctx.lineWidth = 0.04 * p.k;
    p.ctx.beginPath();
    p.ctx.ellipse(8.7 * p.k, (last + 0.05) * p.k, 4.6 * p.k, 0.95 * p.k, -0.03, 0.2, Math.PI * 2.1);
    p.ctx.stroke();
    p.ctx.restore();
    // just under the circle, so it shows above the pocket
    p.text('↑ still borrowing', CARD.w - 0.7, last + 1.3, { family: 'hand', size: 0.6 }, INK.pencil, { align: 'right' });
    p.grain(0.04);
    p.edge(0.04, 201);
    this.cardPainter = p;
    this.cardBase = p.ctx.getImageData(0, 0, p.canvas.width, p.canvas.height);
    this.cardTex = p.texture(r);
    this.card = new Sheet({ w: CARD.w, h: CARD.h, front: this.cardTex, roughness: 0.82 });
    // a stiff card, so its corners stay inside the pocket while it slides
    this.card.uniforms.uCurl.value = 0.04;

    /* ---- the pocket it lives in ---- */
    const q = new Painter(POCKET.w, POCKET.h, k * 0.7);
    q.paper('#cdab74', { seed: 210, fibres: 1.4 });
    q.text('PLEASE RETURN TO', POCKET.w / 2, 4.2, { family: 'mono', size: 0.42, weight: 600 }, 'rgba(40,30,20,0.75)', { align: 'center', spacing: 0.2 });
    q.text('Manya’s Garden', POCKET.w / 2, 6.1, { family: 'serif', size: 1.5, italic: true }, 'rgba(40,30,20,0.85)', { align: 'center' });
    q.text('✿  ✿  ✿', POCKET.w / 2, 7.7, { family: 'sans', size: 0.5 }, 'rgba(40,30,20,0.5)', { align: 'center' });
    q.grain(0.06);
    // the thumb notch
    q.ctx.save();
    q.ctx.globalCompositeOperation = 'destination-out';
    q.ctx.fillStyle = '#000';
    q.ctx.beginPath();
    q.ctx.arc((POCKET.w / 2) * q.k, 0, 1.6 * q.k, 0, Math.PI);
    q.ctx.fill();
    q.ctx.restore();
    q.edge(0.04, 211);
    this.pocket = new Sheet({ w: POCKET.w, h: POCKET.h, front: q.texture(r) });
    this.pocket.uniforms.uCurl.value = 0.04;
    // and its back, under the card, which is what shows through the thumb notch
    const qb = new Painter(POCKET.w, POCKET.h, k * 0.3);
    qb.paper('#c09c66', { seed: 212, fibres: 1.4 });
    qb.grain(0.06);
    this.pocketBack = new Sheet({ w: POCKET.w - 0.2, h: POCKET.h - 0.2, front: qb.texture(r), shade: false, segments: 2 });
    this.pocketBack.uniforms.uCurl.value = 0;

    /* ---- the rubber stamp ---- */
    const wood = withSun(new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: 0.55 }), 'stamp-wood');
    const knob = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 16), wood);
    knob.position.y = 5.2;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 3.4, 16), wood);
    neck.position.y = 3.2;
    const block = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.2, 1.7), withSun(new THREE.MeshStandardMaterial({ color: '#6e4426', roughness: 0.6 }), 'stamp-block'));
    block.position.y = 1.0;
    const rubber = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 1.5), withSun(new THREE.MeshStandardMaterial({ color: STAMP_INK, roughness: 0.8 }), 'stamp-rubber'));
    rubber.position.y = 0.2;
    this.stamp.add(knob, neck, block, rubber);
    this.stamp.traverse(o => (o.castShadow = true));

    /* ---- the receipt ---- */
    const rc = new Painter(RECEIPT.w, RECEIPT.h, k);
    rc.paper('#f9f8f3', { seed: 220, fibres: 0.3, mottle: 0.3, flecks: 0.2 });
    const mono = (size = 0.4, weight = 500) => ({ family: 'mono' as const, size, weight });
    const W = RECEIPT.w;
    const L = 0.55;
    const R = W - 0.55;
    let y = 2.2;
    const center = (t: string, size = 0.4, weight = 500, gap = 0.62) => {
      rc.text(t, W / 2, y, mono(size, weight), '#2a2a30', { align: 'center' });
      y += gap;
    };
    const pair = (a: string, b: string, size = 0.36, weight = 500) => {
      rc.text(a, L, y, mono(size, weight), '#2a2a30');
      rc.text(b, R, y, mono(size, weight), '#2a2a30', { align: 'right' });
      y += 0.62;
    };
    const rule = () => {
      rc.line(L, y - 0.2, R, y - 0.2, 'rgba(40,40,48,0.6)', 0.025, [0.12, 0.1]);
      y += 0.5;
    };
    center('✿', 0.8, 500, 0.9);
    center('THE POLYMATH’S GARDEN', 0.44, 700, 0.55);
    center('general store · est. 2020', 0.32, 500, 0.9);
    rule();
    pair('ORDER #MK-0525', '13:04');
    pair('FOR', 'your team');
    pair('SERVED BY', 'Manya');
    rule();
    pair('QTY  ITEM', 'STATUS', 0.32, 700);
    for (const b of BRING) pair(`1    ${b}`, 'in stock', 0.32);
    rule();
    pair('SUBTOTAL', '8 skills');
    pair('CURIOSITY', 'unlimited');
    pair('EMPATHY', 'included');
    pair('FRICTION', '−100%');
    rule();
    y += 0.2;
    pair('TOTAL', '1 product designer', 0.42, 700);
    y += 0.3;
    rule();
    y += 0.3;
    center('DELIVERED IN 10 MINUTES*', 0.4, 700, 0.6);
    center('*give or take a design review', 0.3, 500, 1.2);
    // a barcode
    const br = rng(230);
    let bx = L + 0.5;
    while (bx < R - 0.5) {
      const bw = 0.04 + br() * 0.14;
      rc.rect(bx, y, bw, 2.2, '#2a2a30');
      bx += bw + 0.05 + br() * 0.12;
    }
    y += 3.1;
    center('thank you, come again ✿', 0.36, 500, 0.8);
    center('— keep this receipt —', 0.28, 500, 0.8);
    // thermal print is never quite even
    rc.distress(0, 0, RECEIPT.w, y, 0.18, 231);
    rc.grain(0.03);
    rc.edge(0.035, 232);
    this.receiptTex = rc.texture(r);
    const geo = new THREE.PlaneGeometry(RECEIPT.w, RECEIPT.h).rotateX(-Math.PI / 2).translate(0, 0, RECEIPT.h / 2);
    this.receipt = new THREE.Mesh(geo, withSun(new THREE.MeshStandardMaterial({ map: this.receiptTex, roughness: 0.55, alphaTest: 0.5, side: THREE.DoubleSide }), 'receipt'));
    this.receipt.castShadow = true;
    this.receipt.receiveShadow = true;
    const rollMat = withSun(new THREE.MeshStandardMaterial({ color: '#f4f2ea', roughness: 0.6 }), 'roll');
    this.roll = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, RECEIPT.w - 0.1, 32).rotateZ(Math.PI / 2), rollMat);
    this.roll.castShadow = true;
    this.roll.receiveShadow = true;

    this.group.add(this.pocketBack.group, this.card.group, this.pocket.group, this.stamp, this.receipt, this.roll);
    world.shades.add(this.card.shade!, this.pocket.shade!);
    this.layout(world.aspect < 0.8);
  }

  private layout(portrait: boolean) {
    this.portrait = portrait;
    this.Z = stationZ('journey', portrait);
    const Z = this.Z;
    const cx = portrait ? 0 : -11;
    const cz = portrait ? Z - 6 : Z + 1;
    // the pocket sits well above the card, which never rises past it while it's inside
    this.pocket.group.position.set(cx + 0.1, 0.6, cz + CARD.h / 2 - POCKET.h / 2 + 0.6);
    this.pocket.group.rotation.y = -0.03;
    this.pocket.syncShade(0.3);
    this.pocketBack.group.position.copy(this.pocket.group.position).setY(0.08);
    this.pocketBack.group.rotation.y = -0.03;
    this.card.group.rotation.y = -0.025;
    this.receipt.position.set(portrait ? 0.5 : 12, 0.12, portrait ? Z + 14 : Z - 14);
    this.receipt.rotation.y = 0.03;
  }

  private paintStamps(n: number) {
    const p = this.cardPainter;
    p.ctx.putImageData(this.cardBase, 0, 0);
    for (let i = 0; i < n; i++) {
      const j = JOURNEY[i];
      const y = ROW0 + i * ROW_H;
      const rr = rng(300 + i);
      p.text(j.when.toUpperCase(), 2.5, y + 0.35, { family: 'mono', size: j.when.length > 5 ? 0.42 : 0.62, weight: 700 }, STAMP_INK, {
        align: 'center',
        rotate: (rr() - 0.5) * 0.12,
        alpha: 0.78 + rr() * 0.15,
      });
      p.distress(0.7, y - 0.6, 3.6, 1.3, 0.55, 310 + i);
    }
    this.cardTex.needsUpdate = true;
  }

  update(ph: number, dt: number, world: TableWorld) {
    if (!this.card) return;
    const portrait = world.aspect < 0.8;
    if (portrait !== this.portrait) this.layout(portrait);
    this.group.visible = (ph > -1 && ph < 2) || world.current === 'outro';
    if (!this.group.visible) return;
    const u = clamp(ph, 0, 1);
    const Z = this.Z;
    const cx = portrait ? 0 : -11;
    const cz = portrait ? Z - 6 : Z + 1;

    // the card slides up out of its pocket: seated, it fills it; out, just its foot is left inside
    const out = easeOut(range(ph, -0.2, 0.16));
    const seated = cz;
    const drawn = cz + CARD.h / 2 - POCKET.h + 0.6 + 1.2 - CARD.h / 2;
    this.card.group.position.set(cx, 0.16 + Math.sin(out * Math.PI) * 0.22, lerp(seated, drawn, out));
    this.card.syncShade(0.16);

    // the stamp works down the rows
    const c = (u - STAMP_T0) / STAMP_DT;
    const n = ph < 0 ? 0 : clamp(Math.floor(c + 0.98), 0, JOURNEY.length);
    if (n !== this.stamped) {
      this.stamped = n;
      this.paintStamps(n);
    }
    const kk = clamp(Math.floor(c), -1, JOURNEY.length);
    const f = clamp(c - kk, 0, 1);
    const a = this.row(kk);
    const b = this.row(kk + 1);
    const travel = easeInOut(range(f, 0.35, 0.9));
    const lift = smooth(range(f, 0.1, 0.32)) * (1 - smooth(range(f, 0.72, 1)));
    const atRest = kk < 0 ? 1 - travel : kk >= JOURNEY.length - 1 ? travel : 0;
    this.stamp.position.set(lerp(a.x, b.x, travel), 0.16 + lift * 4 + atRest * 0.0, lerp(a.z, b.z, travel));
    this.stamp.rotation.set(lift * 0.12, this.card.group.rotation.y + Math.PI / 2 + (kk < 0 || kk >= JOURNEY.length - 1 ? atRest * 0.5 : 0), lift * 0.06);
    this.stamp.visible = ph > -0.6;

    // the receipt unrolls
    const tr = easeInOut(portrait ? range(u, 0.5, 0.96) : range(u, 0.24, 0.88));
    const len = Math.max(0.01, 0.12 * (ph < 0 ? 1 + ph : 1) + tr * 0.88);
    const L = RECEIPT.h * len;
    this.receipt.scale.z = len;
    this.receiptTex.repeat.y = len;
    this.receiptTex.offset.y = 1 - len;
    this.receipt.visible = ph > -0.9;
    const rp = this.receipt.position;
    const dir = new THREE.Vector3(Math.sin(this.receipt.rotation.y), 0, Math.cos(this.receipt.rotation.y));
    this.roll.position.set(rp.x + dir.x * L, 1.3, rp.z + dir.z * L);
    this.roll.rotation.set(-L / 1.3, this.receipt.rotation.y, 0, 'YXZ');
    this.roll.visible = this.receipt.visible;
    void dt;
  }
}
