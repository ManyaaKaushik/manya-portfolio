import * as THREE from 'three';
import { withSun } from './light';
import { rng } from './util';

/*
 * The tablecloth: hand-block-printed cotton, indigo phool flowers with madder-red hearts in a
 * half-drop repeat. Each block lands a little off, and the ink is patchy where the block was
 * light on dye. In the shader the cloth keeps the creases from being folded in a drawer.
 */

export const TILE_CM = 21;
const TILE_PX = 1024;

const INDIGO = '#2a3f7e';
const MADDER = '#ae3f2c';
const COTTON = '#f1eadb';

export function paintTile() {
  const c = document.createElement('canvas');
  c.width = c.height = TILE_PX;
  const ctx = c.getContext('2d')!;
  const r = rng(1931);
  const k = TILE_PX / TILE_CM;

  ctx.fillStyle = COTTON;
  ctx.fillRect(0, 0, TILE_PX, TILE_PX);
  // slubs: thicker threads in the weave, both ways
  for (let i = 0; i < 900; i++) {
    const vertical = r() < 0.5;
    const p = r() * TILE_PX;
    const s = r() * TILE_PX;
    const len = 20 + r() * 160;
    ctx.strokeStyle = r() < 0.6 ? `rgba(120,100,70,${0.025 + r() * 0.05})` : `rgba(255,255,250,${0.12 + r() * 0.2})`;
    ctx.lineWidth = 0.8 + r() * 1.6;
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(p, s);
      ctx.lineTo(p + (r() - 0.5) * 2, s + len);
    } else {
      ctx.moveTo(s, p);
      ctx.lineTo(s + len, p + (r() - 0.5) * 2);
    }
    ctx.stroke();
  }

  // Each colour is printed on its own layer, then worn and laid on the cotton.
  const layer = () => {
    const l = document.createElement('canvas');
    l.width = l.height = TILE_PX;
    return l.getContext('2d')!;
  };
  const blue = layer();
  const red = layer();

  // draw a motif at (x, y) and at its wrap-around twins so the tile repeats cleanly
  const wrap = (x: number, y: number, draw: (g: CanvasRenderingContext2D, x: number, y: number) => void, g: CanvasRenderingContext2D) => {
    for (const dx of [-TILE_PX, 0, TILE_PX]) for (const dy of [-TILE_PX, 0, TILE_PX]) draw(g, x + dx, y + dy);
  };

  const petal = (g: CanvasRenderingContext2D, len: number, wid: number) => {
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(wid, -len * 0.3, wid * 0.8, -len * 0.85, 0, -len);
    g.bezierCurveTo(-wid * 0.8, -len * 0.85, -wid, -len * 0.3, 0, 0);
    g.fill();
  };

  const phool = (g: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.fillStyle = INDIGO;
    for (let i = 0; i < 8; i++) {
      g.save();
      g.rotate((i / 8) * Math.PI * 2);
      g.translate(0, -size * 0.18);
      petal(g, size * 0.82, size * 0.3);
      g.restore();
    }
    // a ring of seeds between the petals
    for (let i = 0; i < 8; i++) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      g.beginPath();
      g.arc(Math.sin(a) * size * 0.78, -Math.cos(a) * size * 0.78, size * 0.055, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  };

  const heart = (g: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    g.fillStyle = MADDER;
    g.beginPath();
    g.arc(x, y, size * 0.24, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.ellipse(x + Math.sin(a) * size * 0.48, y - Math.cos(a) * size * 0.48, size * 0.07, size * 0.16, -a, 0, Math.PI * 2);
      g.fill();
    }
  };

  const sprig = (g: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.strokeStyle = INDIGO;
    g.fillStyle = INDIGO;
    g.lineWidth = size * 0.06;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, size * 0.6);
    g.quadraticCurveTo(size * 0.15, 0, 0, -size * 0.6);
    g.stroke();
    for (let i = 0; i < 3; i++) {
      const t = -0.35 + i * 0.35;
      for (const side of [-1, 1]) {
        g.save();
        g.translate(size * 0.08, t * size);
        g.rotate(side * 1.0);
        petal(g, size * 0.36, size * 0.13);
        g.restore();
      }
    }
    g.beginPath();
    g.arc(0, -size * 0.66, size * 0.08, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };

  const dots = (g: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    g.fillStyle = MADDER;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      g.beginPath();
      g.arc(x + Math.cos(a) * size, y + Math.sin(a) * size, size * 0.55, 0, Math.PI * 2);
      g.fill();
    }
  };

  const flower = 2.9 * k;
  const centres: [number, number][] = [
    [0, 0],
    [TILE_PX / 2, TILE_PX / 2],
  ];
  for (const [x, y] of centres) {
    const rot = (r() - 0.5) * 0.12;
    const jx = (r() - 0.5) * 4;
    const jy = (r() - 0.5) * 4;
    const size = flower * (0.97 + r() * 0.06);
    wrap(x + jx, y + jy, (g, X, Y) => phool(g, X, Y, size, rot), blue);
    // the red block lands a touch off the blue one
    wrap(x + jx + 5, y + jy - 3, (g, X, Y) => heart(g, X, Y, flower * 0.62), red);
  }
  const sprigs: [number, number, number][] = [
    [TILE_PX / 2, 0, 0.5],
    [0, TILE_PX / 2, -0.5],
    [TILE_PX / 4, TILE_PX / 4, 2.2],
    [(TILE_PX * 3) / 4, (TILE_PX * 3) / 4, -0.9],
    [(TILE_PX * 3) / 4, TILE_PX / 4, 0.9],
    [TILE_PX / 4, (TILE_PX * 3) / 4, -2.3],
  ];
  for (const [x, y, rot] of sprigs) {
    const a = rot + (r() - 0.5) * 0.2;
    wrap(x + (r() - 0.5) * 6, y + (r() - 0.5) * 6, (g, X, Y) => sprig(g, X, Y, 2.0 * k, a), blue);
  }
  const fillers: [number, number][] = [
    [TILE_PX / 2, TILE_PX / 4],
    [TILE_PX / 4, TILE_PX / 2],
    [(TILE_PX * 3) / 4, TILE_PX / 2],
    [TILE_PX / 2, (TILE_PX * 3) / 4],
    [0, TILE_PX / 4],
    [TILE_PX / 4, 0],
    [(TILE_PX * 3) / 4, 0],
    [0, (TILE_PX * 3) / 4],
  ];
  for (const [x, y] of fillers) wrap(x + (r() - 0.5) * 8, y + (r() - 0.5) * 8, (g, X, Y) => dots(g, X, Y, 0.2 * k), red);

  // wear: blocks that were light on dye, and specks where the cotton didn't take it
  for (const g of [blue, red]) {
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = '#000';
    for (let i = 0; i < 30000; i++) {
      g.globalAlpha = 0.08 + r() * 0.45;
      g.beginPath();
      g.arc(r() * TILE_PX, r() * TILE_PX, 0.4 + r() * 1.6, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 70; i++) {
      const x = r() * TILE_PX;
      const y = r() * TILE_PX;
      const rad = 30 + r() * 120;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(0,0,0,${0.12 + r() * 0.2})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 1;
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }

  ctx.filter = 'blur(0.7px)';
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.86;
  ctx.drawImage(blue.canvas, 0, 0);
  ctx.globalAlpha = 0.86;
  ctx.drawImage(red.canvas, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

const CREASE = /* glsl */ `
float clothH(vec2 p){
  // ironed folds: the cloth lived folded in a drawer
  vec2 c = p / vec2(76., 68.);
  vec2 d = abs(fract(c + .5) - .5) * vec2(76., 68.);
  vec2 s = mod(floor(c + .5), 2.) * 2. - 1.;
  float h = s.x * exp(-d.x * d.x / 1.6) * .16 + s.y * exp(-d.y * d.y / 1.6) * .16;
  h += s.x * exp(-d.x * d.x / 30.) * .2 + s.y * exp(-d.y * d.y / 30.) * .2;
  // and it lies a little loose on the table
  h += (gNoise(p * .045) - .5) * .9 + (gNoise(p * .11 + 3.) - .5) * .22;
  return h;
}
`;

export function makeCloth(renderer: THREE.WebGLRenderer, size: { w: number; h: number; cx: number; cz: number }) {
  const tex = new THREE.CanvasTexture(paintTile());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.repeat.set(size.w / TILE_CM, size.h / TILE_CM);

  const material = withSun(
    new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.94, metalness: 0, sheen: 0.55, sheenRoughness: 0.7, sheenColor: new THREE.Color('#ffffff') }),
    'cloth',
    shader => {
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', `${CREASE}\nvoid main() {`)
        .replace(
          '#include <normal_fragment_maps>',
          /* glsl */ `#include <normal_fragment_maps>
          {
            vec2 p = vTWorld.xz;
            float e = .22;
            float hx = clothH(p + vec2(e, 0.)) - clothH(p - vec2(e, 0.));
            float hz = clothH(p + vec2(0., e)) - clothH(p - vec2(0., e));
            vec3 nW = normalize(vec3(-hx / (2. * e), 1., -hz / (2. * e)));
            normal = normalize((viewMatrix * vec4(nW, 0.)).xyz);
          }`,
        );
    },
  );
  const geo = new THREE.PlaneGeometry(size.w, size.h);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(size.cx, 0, size.cz);
  mesh.receiveShadow = true;
  return mesh;
}
