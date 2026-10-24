import * as THREE from 'three';
import { rng } from './util';

/*
 * Everything printed, written or stuck onto paper is painted here with Canvas 2D, then handed to
 * three.js as a texture. A Painter works in centimetres (the table's unit) so layouts read like
 * the physical object they describe; it converts to pixels underneath.
 */

export const FAMILY = {
  serif: '"Instrument Serif", Georgia, serif',
  sans: '"Instrument Sans Variable", "Instrument Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, monospace',
  hand: 'Caveat, "Segoe Print", cursive',
} as const;

export type Font = { family: keyof typeof FAMILY; size: number; weight?: number; italic?: boolean };
export type Run = Font & { text: string; color?: string };

export const INK = {
  ink: '#1c2333',
  soft: '#3d4658',
  muted: '#6b7080',
  blue: '#365fba',
  indigo: '#22346d',
  gold: '#c98f27',
  red: '#b23a2a',
  sage: '#5e7140',
  pencil: '#4a4a52',
};

export async function fontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(
    [
      `400 40px ${FAMILY.serif}`,
      `italic 400 40px ${FAMILY.serif}`,
      `400 40px ${FAMILY.sans}`,
      `600 40px ${FAMILY.sans}`,
      `500 40px ${FAMILY.mono}`,
      `500 40px ${FAMILY.hand}`,
    ].map(f => document.fonts.load(f).catch(() => undefined)),
  );
}

const images = new Map<string, Promise<HTMLImageElement | null>>();
export function loadImage(src: string) {
  let p = images.get(src);
  if (!p) {
    p = new Promise(resolve => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => img.decode().then(() => resolve(img), () => resolve(img));
      img.onerror = () => resolve(null);
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

export class Painter {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly k: number;
  readonly w: number;
  readonly h: number;

  /** w × h centimetres at k pixels per centimetre. */
  constructor(w: number, h: number, k: number) {
    this.w = w;
    this.h = h;
    this.k = k;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(w * k);
    this.canvas.height = Math.round(h * k);
    this.ctx = this.canvas.getContext('2d')!;
  }

  font(f: Font) {
    return `${f.italic ? 'italic ' : ''}${f.weight ?? 400} ${f.size * this.k}px ${FAMILY[f.family]}`;
  }

  fill(color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  rect(x: number, y: number, w: number, h: number, color: string, r = 0) {
    const c = this.ctx;
    c.fillStyle = color;
    c.beginPath();
    c.roundRect(x * this.k, y * this.k, w * this.k, h * this.k, r * this.k);
    c.fill();
  }

  strokeRect(x: number, y: number, w: number, h: number, color: string, lw: number, r = 0, dash?: number[]) {
    const c = this.ctx;
    c.strokeStyle = color;
    c.lineWidth = lw * this.k;
    c.setLineDash(dash ? dash.map(d => d * this.k) : []);
    c.beginPath();
    c.roundRect(x * this.k, y * this.k, w * this.k, h * this.k, r * this.k);
    c.stroke();
    c.setLineDash([]);
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, lw: number, dash?: number[]) {
    const c = this.ctx;
    c.strokeStyle = color;
    c.lineWidth = lw * this.k;
    c.setLineDash(dash ? dash.map(d => d * this.k) : []);
    c.beginPath();
    c.moveTo(x0 * this.k, y0 * this.k);
    c.lineTo(x1 * this.k, y1 * this.k);
    c.stroke();
    c.setLineDash([]);
  }

  /** A line drawn by hand: wobbles a little and tapers at both ends. */
  handLine(pts: [number, number][], color: string, lw: number, seed = 1) {
    const c = this.ctx;
    const r = rng(seed);
    c.strokeStyle = color;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      c.lineWidth = lw * this.k * (pass ? 0.55 : 1);
      c.globalAlpha = pass ? 0.5 : 0.92;
      c.beginPath();
      pts.forEach(([x, y], i) => {
        const jx = (r() - 0.5) * lw * 0.6;
        const jy = (r() - 0.5) * lw * 0.6;
        if (i === 0) c.moveTo((x + jx) * this.k, (y + jy) * this.k);
        else c.lineTo((x + jx) * this.k, (y + jy) * this.k);
      });
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  text(
    str: string,
    x: number,
    y: number,
    f: Font,
    color: string,
    opts: { align?: CanvasTextAlign; baseline?: CanvasTextBaseline; spacing?: number; rotate?: number; alpha?: number } = {},
  ) {
    const c = this.ctx;
    c.save();
    c.font = this.font(f);
    c.fillStyle = color;
    c.textAlign = opts.align ?? 'left';
    c.textBaseline = opts.baseline ?? 'alphabetic';
    c.globalAlpha = opts.alpha ?? 1;
    if ('letterSpacing' in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${(opts.spacing ?? 0) * f.size * this.k}px`;
    c.translate(x * this.k, y * this.k);
    if (opts.rotate) c.rotate(opts.rotate);
    c.fillText(str, 0, 0);
    c.restore();
  }

  measure(str: string, f: Font) {
    this.ctx.font = this.font(f);
    return this.ctx.measureText(str).width / this.k;
  }

  /** Wraps mixed runs (say, sans with a serif-italic phrase) into lines. Returns the baseline after the last line. */
  para(runs: Run[], x: number, y: number, maxW: number, lineH: number, opts: { align?: 'left' | 'center'; color?: string } = {}) {
    type Word = { text: string; run: Run; w: number; space: number };
    const words: (Word | 'br')[] = [];
    for (const run of runs) {
      const parts = run.text.split(/(\n| )/);
      for (const part of parts) {
        if (part === '\n') words.push('br');
        else if (part === ' ') {
          const last = words[words.length - 1];
          if (last && last !== 'br') last.space = this.measure(' ', run);
        } else if (part) words.push({ text: part, run, w: this.measure(part, run), space: 0 });
      }
    }
    const lines: Word[][] = [[]];
    let lw = 0;
    for (const word of words) {
      if (word === 'br') {
        lines.push([]);
        lw = 0;
        continue;
      }
      const line = lines[lines.length - 1];
      const prev = line[line.length - 1];
      const add = (prev ? prev.space : 0) + word.w;
      if (line.length && lw + add > maxW) {
        lines.push([word]);
        lw = word.w;
      } else {
        line.push(word);
        lw += add;
      }
    }
    let by = y;
    for (const line of lines) {
      const width = line.reduce((s, w, i) => s + w.w + (i < line.length - 1 ? w.space : 0), 0);
      let cx = opts.align === 'center' ? x - width / 2 : x;
      for (const w of line) {
        this.text(w.text, cx, by, w.run, w.run.color ?? opts.color ?? INK.ink);
        cx += w.w + w.space;
      }
      by += lineH;
    }
    return by - lineH;
  }

  image(img: CanvasImageSource | null, x: number, y: number, w: number, h: number, opts: { cover?: boolean; rotate?: number; alpha?: number; filter?: string; focus?: [number, number] } = {}) {
    if (!img) return;
    const c = this.ctx;
    const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
    const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
    c.save();
    c.globalAlpha = opts.alpha ?? 1;
    if (opts.filter) c.filter = opts.filter;
    c.translate((x + w / 2) * this.k, (y + h / 2) * this.k);
    if (opts.rotate) c.rotate(opts.rotate);
    const W = w * this.k;
    const H = h * this.k;
    if (opts.cover) {
      const s = Math.max(W / iw, H / ih);
      const sw = W / s;
      const sh = H / s;
      const [fx, fy] = opts.focus ?? [0.5, 0.5];
      c.drawImage(img, (iw - sw) * fx, (ih - sh) * fy, sw, sh, -W / 2, -H / 2, W, H);
    } else {
      const s = Math.min(W / iw, H / ih);
      c.drawImage(img, (-iw * s) / 2, (-ih * s) / 2, iw * s, ih * s);
    }
    c.restore();
  }

  /** Paper: a base tone, soft mottling, fibres and the odd inclusion. */
  paper(tone: string, opts: { seed?: number; fibres?: number; mottle?: number; flecks?: number } = {}) {
    const c = this.ctx;
    const r = rng(opts.seed ?? 7);
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.fill(tone);
    const mottle = opts.mottle ?? 1;
    for (let i = 0; i < 40 * mottle; i++) {
      const x = r() * W;
      const y = r() * H;
      const rad = (0.15 + r() * 0.35) * Math.max(W, H);
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      const dark = r() < 0.5;
      g.addColorStop(0, dark ? 'rgba(120,90,40,0.035)' : 'rgba(255,255,250,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
    const fibres = Math.round((opts.fibres ?? 1) * (W * H) / 2600);
    c.lineCap = 'round';
    for (let i = 0; i < fibres; i++) {
      const x = r() * W;
      const y = r() * H;
      const len = (0.08 + r() * 0.35) * this.k;
      const a = r() * Math.PI * 2;
      const bend = (r() - 0.5) * len;
      const light = r() < 0.55;
      c.strokeStyle = light ? `rgba(255,253,245,${0.25 + r() * 0.3})` : `rgba(110,85,45,${0.05 + r() * 0.08})`;
      c.lineWidth = Math.max(0.6, this.k * (0.006 + r() * 0.012));
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(a) * len * 0.5 - Math.sin(a) * bend, y + Math.sin(a) * len * 0.5 + Math.cos(a) * bend, x + Math.cos(a) * len, y + Math.sin(a) * len);
      c.stroke();
    }
    const flecks = Math.round((opts.flecks ?? 1) * (W * H) / 90000);
    for (let i = 0; i < flecks; i++) {
      c.fillStyle = `rgba(${r() < 0.7 ? '90,70,40' : '60,90,50'},${0.12 + r() * 0.25})`;
      c.beginPath();
      c.ellipse(r() * W, r() * H, this.k * (0.01 + r() * 0.03), this.k * (0.008 + r() * 0.015), r() * 3, 0, Math.PI * 2);
      c.fill();
    }
  }

  /** Fine grain over everything already drawn, so ink sits in the paper rather than on it. */
  grain(amount = 0.06, seed = 3) {
    const c = this.ctx;
    const r = rng(seed);
    const n = Math.round((this.canvas.width * this.canvas.height) / 180);
    for (let i = 0; i < n; i++) {
      c.fillStyle = r() < 0.5 ? `rgba(0,0,0,${amount * r()})` : `rgba(255,255,255,${amount * 1.4 * r()})`;
      c.fillRect(r() * this.canvas.width, r() * this.canvas.height, 1.2, 1.2);
    }
  }

  /** Knocks small holes out of ink in a region, the way a rubber stamp or block print misses. */
  distress(x: number, y: number, w: number, h: number, amount = 0.5, seed = 11) {
    const c = this.ctx;
    const r = rng(seed);
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000';
    const n = Math.round(w * h * 60 * amount);
    for (let i = 0; i < n; i++) {
      c.globalAlpha = 0.15 + r() * 0.6;
      c.beginPath();
      c.arc((x + r() * w) * this.k, (y + r() * h) * this.k, this.k * (0.01 + r() * 0.04), 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  /** A strip of paper tape. Slightly see-through, with torn ends. */
  tape(cx: number, cy: number, w: number, h: number, angle: number, color = 'rgba(236,226,196,0.82)', seed = 5) {
    const c = this.ctx;
    const r = rng(seed);
    c.save();
    c.translate(cx * this.k, cy * this.k);
    c.rotate(angle);
    const W = w * this.k;
    const H = h * this.k;
    c.beginPath();
    const teeth = 9;
    c.moveTo(-W / 2, -H / 2);
    c.lineTo(W / 2, -H / 2);
    for (let i = 1; i <= teeth; i++) c.lineTo(W / 2 + (r() - 0.5) * H * 0.18, -H / 2 + (H * i) / teeth);
    c.lineTo(-W / 2, H / 2);
    for (let i = teeth - 1; i >= 0; i--) c.lineTo(-W / 2 + (r() - 0.5) * H * 0.18, -H / 2 + (H * i) / teeth);
    c.closePath();
    c.fillStyle = color;
    c.shadowColor = 'rgba(60,45,20,0.18)';
    c.shadowBlur = this.k * 0.08;
    c.shadowOffsetY = this.k * 0.03;
    c.fill();
    c.shadowColor = 'transparent';
    c.globalAlpha = 0.25;
    for (let i = 0; i < 40; i++) {
      c.fillStyle = r() < 0.5 ? '#fff' : '#cbbf9a';
      c.fillRect((r() - 0.5) * W, (r() - 0.5) * H, W * 0.05 * r(), 1.5);
    }
    c.restore();
  }

  /** A round rubber-stamp postmark. */
  postmark(cx: number, cy: number, rad: number, top: string, mid: string, bottom: string, color: string, angle = 0, seed = 21) {
    const c = this.ctx;
    c.save();
    c.translate(cx * this.k, cy * this.k);
    c.rotate(angle);
    c.globalAlpha = 0.82;
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = rad * 0.05 * this.k;
    c.beginPath();
    c.arc(0, 0, rad * this.k, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = rad * 0.025 * this.k;
    c.beginPath();
    c.arc(0, 0, rad * 0.7 * this.k, 0, Math.PI * 2);
    c.stroke();
    const ring = (str: string, r0: number, start: number, dir: 1 | -1) => {
      c.font = this.font({ family: 'mono', size: rad * 0.2, weight: 600 });
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const chars = [...str];
      const step = (0.95 * Math.PI) / chars.length;
      chars.forEach((ch, i) => {
        const a = start + dir * (i - (chars.length - 1) / 2) * step;
        c.save();
        c.rotate(a);
        c.translate(0, -r0 * this.k * dir);
        if (dir < 0) c.rotate(Math.PI);
        c.fillText(ch, 0, 0);
        c.restore();
      });
    };
    ring(top, rad * 0.85, 0, 1);
    ring(bottom, rad * 0.85, 0, -1);
    c.font = this.font({ family: 'mono', size: rad * 0.26, weight: 700 });
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(mid, 0, 0);
    c.restore();
    this.distress(cx - rad, cy - rad, rad * 2, rad * 2, 0.9, seed);
  }

  /**
   * Gives the sheet a deckled (torn, handmade) or slightly soft machine-cut edge by masking
   * its outline. `amp` is how far the edge wanders, in centimetres.
   */
  edge(amp: number, seed = 9, inset = 0) {
    const c = this.ctx;
    const r = rng(seed);
    const W = this.canvas.width;
    const H = this.canvas.height;
    const a = amp * this.k;
    const i0 = inset * this.k;
    const noise = (n: number) => {
      // two octaves of smooth value noise along the edge
      const coarse = Array.from({ length: Math.ceil(n / 30) + 2 }, () => r());
      const fine = Array.from({ length: Math.ceil(n / 6) + 2 }, () => r());
      return (t: number) => {
        const s = (arr: number[], step: number) => {
          const x = t / step;
          const i = Math.floor(x);
          const f = x - i;
          const u = f * f * (3 - 2 * f);
          return arr[i] * (1 - u) + arr[i + 1] * u;
        };
        return s(coarse, 30) * 0.7 + s(fine, 6) * 0.3;
      };
    };
    const top = noise(W);
    const right = noise(H);
    const bottom = noise(W);
    const left = noise(H);
    c.save();
    c.globalCompositeOperation = 'destination-in';
    c.fillStyle = '#000';
    c.beginPath();
    const step = 3;
    c.moveTo(i0 + left(0) * a, i0 + top(0) * a);
    for (let x = 0; x <= W; x += step) c.lineTo(x, i0 + top(x) * a);
    for (let y = 0; y <= H; y += step) c.lineTo(W - i0 - right(y) * a, y);
    for (let x = W; x >= 0; x -= step) c.lineTo(x, H - i0 - bottom(x) * a);
    for (let y = H; y >= 0; y -= step) c.lineTo(i0 + left(y) * a, y);
    c.closePath();
    c.fill();
    c.restore();
  }

  /** Perforated stamp edge: scallops all round. */
  perforate(holeR: number, pitch: number) {
    const c = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const r = holeR * this.k;
    const p = pitch * this.k;
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000';
    for (let x = p / 2; x < W; x += p) {
      c.beginPath();
      c.arc(x, 0, r, 0, Math.PI * 2);
      c.arc(x, H, r, 0, Math.PI * 2);
      c.fill();
    }
    for (let y = p / 2; y < H; y += p) {
      c.beginPath();
      c.arc(0, y, r, 0, Math.PI * 2);
      c.arc(W, y, r, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  texture(renderer: THREE.WebGLRenderer) {
    const t = new THREE.CanvasTexture(this.canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }
}

/** Pixels per centimetre for paper textures: crisp on big screens, lighter on small ones. */
export function paperDensity() {
  if (typeof window === 'undefined') return 40;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const short = Math.min(window.innerWidth, window.innerHeight);
  // a sheet filling the screen needs about 24 css px per cm; more is memory for nothing
  return short < 560 ? 30 : Math.min(48, 24 * dpr);
}
