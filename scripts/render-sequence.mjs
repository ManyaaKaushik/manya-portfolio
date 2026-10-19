// Renders the hero's exploded sunflower specimen as a WebP image sequence.
// A procedural stand-in for the "start frame → exploded end frame → motion" generation
// pipeline: every part is real 3D geometry, so the explosion is exact and the background
// is exactly the page paper colour.
//
// usage: node scripts/render-sequence.mjs [outDir] [frames] [size] [quality]
//   pnpm sequence        → public/sequence      (1200px)
//   pnpm sequence:small  → public/sequence/sm   (760px, phones)
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2] ?? 'public/sequence';
const FRAMES = Number(process.argv[3] ?? 120);
const SIZE = Number(process.argv[4] ?? 1200);
const QUALITY = Number(process.argv[5] ?? 80);
mkdirSync(OUT, { recursive: true });

const BG = '#f6f4eb';
const TAU = Math.PI * 2;

/* ---------- helpers ---------- */
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgba = (c, a = 1) => `rgba(${c.map(v => Math.round(clamp(v, 0, 255))).join(',')},${a})`;

const v3 = (x, y, z) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const rotX = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
const rotZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };

/* ---------- palette ---------- */
const C = {
  petalLight: hex('#f4cf6a'), petalMid: hex('#e3a93a'), petalDark: hex('#a8691c'), petalVein: hex('#9a5f17'),
  discLight: hex('#4f74c8'), discMid: hex('#2c4790'), discDark: hex('#16234a'),
  seedLight: hex('#7c9be0'), seedDark: hex('#1b2a57'),
  greenLight: hex('#a9b77c'), greenMid: hex('#73864c'), greenDark: hex('#3c4a28'),
  ink: hex('#24314f'), blue: hex('#365fba'), paper: hex(BG),
};
const LIGHT = norm([-0.45, 0.75, 0.6]);

/* ---------- static geometry (built once, deterministic) ---------- */
const R = 1; // disc radius
const GOLD = Math.PI * (3 - Math.sqrt(5));
const florets = [];
for (let i = 0; i < 620; i++) {
  const r = Math.sqrt(i / 620) * R * 0.94;
  const a = i * GOLD;
  florets.push({ r, a, j: rand(), j2: rand(), size: 0.028 + 0.022 * (r / R) });
}
const petals = [];
for (let ring = 0; ring < 2; ring++) {
  const n = ring ? 21 : 18;
  for (let i = 0; i < n; i++) {
    petals.push({
      ring, a: (i + ring * 0.5) / n * TAU + rand() * 0.08,
      len: (ring ? 1.18 : 1.02) * (0.9 + rand() * 0.18),
      wid: (ring ? 0.25 : 0.22) * (0.9 + rand() * 0.2),
      lift: ring ? 0.22 : 0.42, curl: (rand() - 0.3) * 0.35, twist: (rand() - .5) * 0.25, j: rand(),
    });
  }
}
const bracts = [];
for (let i = 0; i < 26; i++) bracts.push({ a: i / 26 * TAU + rand() * 0.1, len: 0.42 + rand() * 0.12, wid: 0.12 + rand() * 0.03, ring: i % 2, j: rand() });

/* ---------- scene build ---------- */
function petalPoints(len, wid, lift, curl, steps = 14) {
  // returns outline (left edge then right edge reversed) + midrib, in local petal space (x = outward)
  const left = [], right = [], mid = [];
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const w = wid * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85) * (1 - 0.25 * u);
    const x = u * len;
    const y = lift * u * u + curl * Math.pow(u, 3) * len; // rises toward tip
    const cup = 0.35 * w; // cupped across the width
    left.push([x, y + cup, -w]); right.push([x, y + cup, w]); mid.push([x, y - cup * 0.1, 0]);
  }
  return { left, right, mid };
}

function buildScene(f) {
  // explosion envelope: assembled → exploded (hold) → reassembled
  const e = smooth((f - 0.06) / 0.5) * (1 - smooth((f - 0.66) / 0.28));
  const yaw = lerp(-0.55, 1.05, easeInOut(f));
  const headTilt = lerp(1.0, 0.3, e); // radians from vertical toward viewer
  const items = [];

  // head transform: local (axis +Y) → world
  const headOrigin = v3(0, 0.95 + e * 0.55, 0);
  const H = p => add(rotX(p, headTilt), headOrigin);
  const headAxis = rotX([0, 1, 0], headTilt);

  // florets: lifted into a dome-shaped cloud along the head axis
  for (const fl of florets) {
    const rr = fl.r * (1 + e * (0.25 + 0.25 * fl.j));
    const h = e * (1.75 + 1.5 * Math.pow(1 - fl.r / R, 1.4) + 0.4 * fl.j2) + 0.06 * (1 - fl.r / R);
    const p = H([Math.cos(fl.a) * rr, 0.05 + h, Math.sin(fl.a) * rr]);
    items.push({ kind: 'seed', p, size: fl.size * (1 + e * 0.25), shade: fl.j, r: fl.r });
  }

  // disc plate (stack of rings for thickness)
  const discY = e * 1.05;
  items.push({ kind: 'disc', center: H([0, discY, 0]), axis: headAxis, tilt: headTilt, radius: R, y: discY, H });

  // petals
  for (const pt of petals) {
    const ringLift = pt.ring ? -e * 0.75 : e * 0.05;
    const out = pt.ring ? e * 0.55 : e * 0.22;
    const g = petalPoints(pt.len, pt.wid, pt.lift + e * 0.15, pt.curl);
    const place = q => {
      let p = rotX(q, pt.twist * (1 + e));
      p = [p[0] + R * 0.9 + out, p[1] + ringLift - 0.02 * pt.ring, p[2]];
      p = rotY(p, -pt.a);
      return H(p);
    };
    items.push({ kind: 'petal', left: g.left.map(place), right: g.right.map(place), mid: g.mid.map(place), j: pt.j, ring: pt.ring });
  }

  // bracts (green, underneath)
  for (const b of bracts) {
    const g = petalPoints(b.len, b.wid, -0.18 - b.ring * 0.08, -0.25);
    const place = q => {
      let p = [q[0] + R * 0.62 + e * 0.38, q[1] - 0.16 - e * 1.5 - b.ring * 0.05, q[2]];
      p = rotY(p, -b.a);
      return H(p);
    };
    items.push({ kind: 'bract', left: g.left.map(place), right: g.right.map(place), mid: g.mid.map(place), j: b.j });
  }

  // receptacle cup (back of head)
  const cupY = -0.28 - e * 2.15;
  items.push({ kind: 'cup', H, y: cupY, radius: 0.78 });

  // stem: three segments that separate downward
  const stemTop = rotX([0, -0.45 + cupY * 0.3, 0], 0);
  const segs = [[0.0, 1.1], [1.1, 2.3], [2.3, 3.5]];
  segs.forEach(([a, b], i) => {
    const gap = e * (0.35 + i * 0.32);
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const u = lerp(a, b, k / 10);
      const bend = Math.sin(u * 0.9) * 0.12;
      pts.push(add(headOrigin, [bend, -0.55 - u - gap - e * 1.6, -0.05 * u]));
    }
    items.push({ kind: 'stem', pts, r0: 0.085 - a * 0.008, r1: 0.085 - b * 0.008 });
  });

  // leaves
  [-1, 1].forEach((side, i) => {
    const attachY = -1.75 - i * 0.55;
    const len = 1.25 - i * 0.12, wid = 0.42;
    const pts = [];
    const steps = 18;
    const left = [], right = [], mid = [];
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      const w = wid * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 1.1);
      const droop = -0.35 * u * u + 0.25 * u;
      left.push([u * len, droop + 0.06 * w, -w]); right.push([u * len, droop + 0.06 * w, w]); mid.push([u * len, droop, 0]);
    }
    const place = q => {
      let p = rotX(q, 0.55 * side + e * 0.4 * side);
      p = rotY(p, side > 0 ? 0.35 : Math.PI - 0.35);
      p = rotZ(p, side * (0.25 + e * 0.3) * (side > 0 ? 1 : -1));
      const gap = e * (0.85 + i * 0.3);
      return add(add(headOrigin, [0.06 * side + gap * side, attachY - e * (2.0 + i * 0.45), 0]), p);
    };
    items.push({ kind: 'leaf', left: left.map(place), right: right.map(place), mid: mid.map(place), side });
  });

  return { items, yaw, e };
}

/* ---------- camera ---------- */
const elevOf = e => lerp(0.18, 0.5, e);
function makeCamera(yaw, e) {
  const elev = elevOf(e);
  const dist = 13.5;
  const target = [0, -0.3 + e * 0.2, 0];
  const s = SIZE / (7.0 + e * 3.9);
  return p => {
    let q = sub(p, target);
    q = rotY(q, yaw);
    q = rotX(q, elev);
    const z = dist - q[2];
    const k = dist / z;
    return { x: SIZE / 2 + q[0] * s * k, y: SIZE * 0.5 - q[1] * s * k, z: q[2], k };
  };
}

/* ---------- drawing ---------- */
function shadeOf(normal) { return clamp(dot(normal, LIGHT) * 0.5 + 0.5); }

function drawFrame(f) {
  seed = 99;
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BG; ctx.fillRect(0, 0, SIZE, SIZE);
  // flat paper: the page supplies the studio light, so frame edges stay invisible

  const { items, yaw, e } = buildScene(f);
  const cam = makeCamera(yaw, e);
  const view = p => { let q = rotY(p, yaw); q = rotX(q, elevOf(e)); return q; }; // for normals/depth

  // contact shadow far below, spreading as the specimen floats apart
  const sh = cam([0, -3.55 - e * 3.0, 0]);
  ctx.save(); ctx.translate(sh.x, sh.y); ctx.scale(1, 0.16);
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, SIZE * (0.16 + e * 0.08));
  sg.addColorStop(0, `rgba(36,49,79,${0.16 - e * 0.07})`); sg.addColorStop(1, 'rgba(36,49,79,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, SIZE * (0.16 + e * 0.08), 0, TAU); ctx.fill(); ctx.restore();

  // assembly axis — a faint dashed guide that appears as parts separate
  if (e > 0.02) {
    const a = cam([0, 3.2, 0]), b = cam([0, -3.6 - e * 2.9, 0]);
    ctx.save(); ctx.setLineDash([SIZE * 0.004, SIZE * 0.008]); ctx.lineWidth = SIZE * 0.0009;
    ctx.strokeStyle = rgba(C.blue, 0.35 * e);
    // follow the head axis for the upper portion
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(cam([0, 0.6, 0]).x, cam([0, 0.6, 0]).y); ctx.stroke();
    ctx.restore();
  }

  // build draw list with depth
  const list = [];
  for (const it of items) {
    if (it.kind === 'seed') list.push({ z: view(it.p)[2], it });
    else if (it.kind === 'petal' || it.kind === 'bract' || it.kind === 'leaf') {
      const c = it.mid[Math.floor(it.mid.length / 2)];
      list.push({ z: view(c)[2], it });
    } else if (it.kind === 'disc') list.push({ z: view(it.center)[2] - 0.05, it });
    else if (it.kind === 'cup') list.push({ z: view(it.H([0, it.y, 0]))[2], it });
    else if (it.kind === 'stem') list.push({ z: view(it.pts[5])[2] - 0.6, it });
  }
  const LAYER = { stem: 0, leaf: 0, cup: 1, bract: 2, disc: 5, seed: 6 };
  for (const d of list) d.layer = d.it.kind === 'petal' ? (d.it.ring ? 3 : 4) : LAYER[d.it.kind];
  list.sort((a, b) => a.layer - b.layer || a.z - b.z);

  const lw = SIZE / 1280;
  for (const { it } of list) {
    if (it.kind === 'seed') drawSeed(ctx, it, cam, view, lw);
    else if (it.kind === 'petal') drawBlade(ctx, it, cam, view, lw, 'petal');
    else if (it.kind === 'bract') drawBlade(ctx, it, cam, view, lw, 'bract');
    else if (it.kind === 'leaf') drawBlade(ctx, it, cam, view, lw, 'leaf');
    else if (it.kind === 'disc') drawDisc(ctx, it, cam, view, lw);
    else if (it.kind === 'cup') drawCup(ctx, it, cam, view, lw);
    else if (it.kind === 'stem') drawStem(ctx, it, cam, view, lw);
  }
  return canvas;
}

function polyPath(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); }

function drawBlade(ctx, it, cam, view, lw, type) {
  const L = it.left.map(cam), Rt = it.right.map(cam), M = it.mid.map(cam);
  const pal = type === 'petal' ? [C.petalDark, C.petalMid, C.petalLight] : [C.greenDark, C.greenMid, C.greenLight];
  // two halves with their own normals for a creased, sculpted look
  for (const [edge, sign] of [[it.left, -1], [it.right, 1]]) {
    const mid = it.mid;
    const n = Math.floor(mid.length * 0.5);
    let normal = norm(cross(sub(mid[n + 1] ?? mid[n], mid[1]), sub(edge[n], mid[n])));
    normal = view(normal); if (normal[2] < 0) normal = scale(normal, -1);
    const s = shadeOf(normal) * (sign < 0 ? 1 : 0.86);
    const sp = edge.map(cam), mp = mid.map(cam);
    const pts = [...sp, ...mp.slice().reverse()];
    const base = mp[0], tip = mp[mp.length - 1];
    const g = ctx.createLinearGradient(base.x, base.y, tip.x, tip.y);
    const lo = mix(pal[0], pal[1], 0.35 + s * 0.4), hi = mix(pal[1], pal[2], s);
    g.addColorStop(0, rgba(lo)); g.addColorStop(0.45, rgba(hi)); g.addColorStop(1, rgba(mix(hi, pal[2], 0.35)));
    ctx.fillStyle = g; polyPath(ctx, pts); ctx.fill();
  }
  // veins
  ctx.lineCap = 'round';
  ctx.strokeStyle = type === 'petal' ? rgba(C.petalVein, 0.38) : rgba(C.greenDark, 0.45);
  ctx.lineWidth = lw * 0.8;
  const veins = type === 'leaf' ? 7 : 3;
  for (let v = 1; v <= veins; v++) {
    const t = v / (veins + 1);
    for (const edge of [L, Rt]) {
      ctx.beginPath();
      const steps = M.length - 1;
      for (let k = 0; k <= steps; k++) {
        const a = M[k], b = edge[k];
        const x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      if (type !== 'leaf') ctx.stroke();
    }
    if (type === 'leaf') {
      const k0 = Math.floor(t * (M.length - 1));
      for (const edge of [L, Rt]) {
        const a = M[k0], b = edge[Math.min(M.length - 1, k0 + 3)];
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(lerp(a.x, b.x, .6), lerp(a.y, b.y, .3), lerp(a.x, b.x, .85), lerp(a.y, b.y, .85)); ctx.stroke();
      }
    }
  }
  // midrib
  ctx.strokeStyle = type === 'petal' ? rgba(C.petalVein, 0.55) : rgba(C.greenDark, 0.6);
  ctx.lineWidth = lw * 1.1; ctx.beginPath(); M.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
  // ink outline + rim light
  const outline = [...L, ...Rt.slice().reverse()];
  ctx.strokeStyle = rgba(type === 'petal' ? C.petalDark : C.greenDark, 0.7); ctx.lineWidth = lw * 1.05;
  polyPath(ctx, outline); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,250,232,0.55)'; ctx.lineWidth = lw * 0.9;
  ctx.beginPath(); L.forEach((p, i) => (i ? ctx.lineTo(p.x - lw * 0.6, p.y - lw * 0.6) : ctx.moveTo(p.x, p.y))); ctx.stroke();
}

function ringPoints(H, y, r, n = 64) { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push(H([Math.cos(a) * r, y, Math.sin(a) * r])); } return pts; }

function drawDisc(ctx, it, cam, view, lw) {
  const { H, y, radius } = it;
  // thickness: side band
  const top = ringPoints(H, y, radius).map(cam), bot = ringPoints(H, y - 0.12, radius * 0.97).map(cam);
  ctx.fillStyle = rgba(C.discDark); polyPath(ctx, bot); ctx.fill();
  for (let i = 0; i < top.length; i++) {
    const j = (i + 1) % top.length;
    ctx.beginPath(); ctx.moveTo(top[i].x, top[i].y); ctx.lineTo(top[j].x, top[j].y); ctx.lineTo(bot[j].x, bot[j].y); ctx.lineTo(bot[i].x, bot[i].y); ctx.closePath();
    const s = 0.4 + 0.6 * (0.5 + 0.5 * Math.cos(i / top.length * TAU + 2.2));
    ctx.fillStyle = rgba(mix(C.discDark, C.discMid, s * 0.8)); ctx.fill();
  }
  // top face with radial gradient
  const c = cam(H([0, y, 0]));
  const edge = cam(H([radius, y, 0]));
  const rad = Math.hypot(edge.x - c.x, edge.y - c.y);
  const g = ctx.createRadialGradient(c.x - rad * 0.25, c.y - rad * 0.3, rad * 0.05, c.x, c.y, rad * 1.3);
  g.addColorStop(0, rgba(C.discMid)); g.addColorStop(0.6, rgba(mix(C.discMid, C.discDark, 0.55))); g.addColorStop(1, rgba(C.discDark));
  ctx.fillStyle = g; polyPath(ctx, top); ctx.fill();
  // pits where the florets sit — a fibonacci lattice engraved into the plate
  ctx.fillStyle = rgba(C.discDark, 0.55);
  for (const fl of florets) {
    const p = cam(H([Math.cos(fl.a) * fl.r, y + 0.002, Math.sin(fl.a) * fl.r]));
    ctx.beginPath(); ctx.arc(p.x, p.y, fl.size * SIZE * 0.045 * p.k, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = rgba(C.ink, 0.65); ctx.lineWidth = lw * 1.1; polyPath(ctx, top); ctx.stroke();
  ctx.strokeStyle = 'rgba(190,210,255,0.35)'; ctx.lineWidth = lw * 1.4; ctx.beginPath();
  top.slice(36, 60).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
}

function drawSeed(ctx, it, cam, view, lw) {
  const p = cam(it.p);
  const r = it.size * SIZE * 0.05 * p.k;
  const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
  const centre = 1 - it.r; // inner florets are darker, younger
  g.addColorStop(0, rgba(mix(C.seedLight, [255, 236, 170], centre * 0.35)));
  g.addColorStop(1, rgba(mix(C.discMid, C.seedDark, 0.4 + it.shade * 0.4)));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.92, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(C.discDark, 0.55); ctx.lineWidth = lw * 0.6; ctx.stroke();
}

function drawCup(ctx, it, cam, view, lw) {
  const { H, y, radius } = it;
  const rings = [];
  for (let k = 0; k <= 6; k++) { const u = k / 6; rings.push(ringPoints(H, y - u * 0.32, radius * Math.cos(u * 1.2) * (1 - u * 0.2) + 0.02, 48).map(cam)); }
  for (let k = rings.length - 1; k > 0; k--) {
    const s = 1 - k / rings.length;
    ctx.fillStyle = rgba(mix(C.greenDark, C.greenMid, 0.3 + s * 0.6)); polyPath(ctx, rings[k - 1]); ctx.fill();
    ctx.strokeStyle = rgba(C.greenDark, 0.25); ctx.lineWidth = lw * 0.7; polyPath(ctx, rings[k - 1]); ctx.stroke();
  }
  // ribs
  ctx.strokeStyle = rgba(C.greenDark, 0.35); ctx.lineWidth = lw * 0.7;
  for (let i = 0; i < 48; i += 3) { ctx.beginPath(); rings.forEach((r, k) => (k ? ctx.lineTo(r[i].x, r[i].y) : ctx.moveTo(r[i].x, r[i].y))); ctx.stroke(); }
  ctx.strokeStyle = rgba(C.greenDark, 0.7); ctx.lineWidth = lw; polyPath(ctx, rings[0]); ctx.stroke();
}

function drawStem(ctx, it, cam, view, lw) {
  const P = it.pts.map(cam);
  const n = P.length;
  const left = [], right = [];
  for (let k = 0; k < n; k++) {
    const a = P[Math.max(0, k - 1)], b = P[Math.min(n - 1, k + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const r = lerp(it.r0, it.r1, k / (n - 1)) * SIZE / 7.2 * P[k].k;
    left.push({ x: P[k].x - dy / l * r, y: P[k].y + dx / l * r }); right.push({ x: P[k].x + dy / l * r, y: P[k].y - dx / l * r });
  }
  const g = ctx.createLinearGradient(left[0].x, left[0].y, right[0].x, right[0].y);
  g.addColorStop(0, rgba(C.greenLight)); g.addColorStop(0.45, rgba(C.greenMid)); g.addColorStop(1, rgba(C.greenDark));
  ctx.fillStyle = g; polyPath(ctx, [...left, ...right.reverse()]); ctx.fill();
  ctx.strokeStyle = rgba(C.greenDark, 0.7); ctx.lineWidth = lw; ctx.stroke();
  // cut faces (ellipses) at both ends
  for (const k of [0, n - 1]) {
    const r = lerp(it.r0, it.r1, k / (n - 1)) * SIZE / 7.2 * P[k].k;
    ctx.beginPath(); ctx.ellipse(P[k].x, P[k].y, r, r * 0.35, 0, 0, TAU);
    ctx.fillStyle = rgba(mix(C.greenLight, [240, 238, 210], 0.5)); ctx.fill();
    ctx.strokeStyle = rgba(C.greenDark, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(P[k].x, P[k].y, r * 0.45, r * 0.16, 0, 0, TAU); ctx.fillStyle = rgba(C.greenMid, 0.5); ctx.fill();
  }
  // fine fibres
  ctx.strokeStyle = rgba(C.greenDark, 0.25); ctx.lineWidth = lw * 0.6;
  for (const t of [0.3, 0.55, 0.75]) { ctx.beginPath(); P.forEach((p, k) => { const x = lerp(left[k]?.x ?? p.x, p.x, t * 2 - 0.2); k ? ctx.lineTo(x, p.y) : ctx.moveTo(x, p.y); }); ctx.stroke(); }
}

/* ---------- run ---------- */
for (let i = 0; i < FRAMES; i++) {
  const f = FRAMES === 1 ? 0 : i / (FRAMES - 1);
  const canvas = drawFrame(f);
  writeFileSync(`${OUT}/helianthus_${String(i).padStart(3, '0')}.webp`, await canvas.encode('webp', QUALITY));
}
console.log(`rendered ${FRAMES} frames at ${SIZE}px → ${OUT}`);
