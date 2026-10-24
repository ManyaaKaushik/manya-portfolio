import * as THREE from 'three';
import { withSun } from './light';
import { rng } from './util';

/*
 * Things on the table that aren't paper: a cut sunflower, a glass of cutting chai, pencils,
 * a wax seal. Built from primitives and painted textures; each casts a real shadow, except the
 * glass, which fakes a lighter, tinted one (a glass of tea doesn't throw a black disc).
 */

const std = (o: THREE.MeshStandardMaterialParameters, key: string) => withSun(new THREE.MeshStandardMaterial(o), key);

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const shadowed = <T extends THREE.Object3D>(o: T): T => {
  o.traverse(m => {
    if ((m as THREE.Mesh).isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return o;
};

/* ------------------------------------------------------------------------ */
/*  A cut sunflower                                                          */
/* ------------------------------------------------------------------------ */

export function sunflower(seed = 4) {
  const r = rng(seed);
  const g = new THREE.Group();
  const R = 4.6; // disc radius, cm

  // the disc: florets in Fibonacci spirals, darker toward the centre
  const disc = canvasTex(512, 512, c => {
    const grad = c.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, '#3b5a1c');
    grad.addColorStop(0.16, '#4a3312');
    grad.addColorStop(0.75, '#2c1a0a');
    grad.addColorStop(1, '#5a3a12');
    c.fillStyle = grad;
    c.fillRect(0, 0, 512, 512);
    const n = 1100;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const rad = Math.sqrt(t) * 250;
      const a = i * golden;
      const x = 256 + Math.cos(a) * rad;
      const y = 256 + Math.sin(a) * rad;
      const s = 2.2 + t * 4.2;
      const inner = t < 0.05;
      c.fillStyle = inner ? `hsl(${80 + r() * 20},45%,${30 + r() * 10}%)` : t > 0.85 ? `hsl(${32 + r() * 8},80%,${38 + r() * 14}%)` : `hsl(${22 + r() * 10},${55 + r() * 20}%,${12 + t * 16 + r() * 6}%)`;
      c.beginPath();
      c.arc(x, y, s, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(255,220,150,0.18)';
      c.beginPath();
      c.arc(x - s * 0.3, y - s * 0.3, s * 0.4, 0, Math.PI * 2);
      c.fill();
    }
  });
  const discGeo = new THREE.SphereGeometry(R, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  discGeo.scale(1, 0.28, 1);
  // map the dome from above
  {
    const pos = discGeo.attributes.position as THREE.BufferAttribute;
    const uv = discGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * R), 0.5 - pos.getZ(i) / (2 * R));
  }
  const discMesh = new THREE.Mesh(discGeo, std({ map: disc, roughness: 0.9 }, 'disc'));
  discMesh.position.y = 1.6;
  g.add(discMesh);

  // petals: two rings of curved ray florets
  const petalTex = canvasTex(128, 512, c => {
    const grad = c.createLinearGradient(0, 512, 0, 0);
    grad.addColorStop(0, '#d86a08');
    grad.addColorStop(0.35, '#f4a20c');
    grad.addColorStop(1, '#ffd23a');
    c.fillStyle = grad;
    c.beginPath();
    c.moveTo(64, 512);
    c.bezierCurveTo(130, 400, 122, 120, 64, 0);
    c.bezierCurveTo(6, 120, -2, 400, 64, 512);
    c.fill();
    c.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 9; i++) {
      c.strokeStyle = `rgba(160,70,0,${0.12 + r() * 0.12})`;
      c.lineWidth = 2;
      c.beginPath();
      const x = 30 + i * 8.5;
      c.moveTo(x, 510);
      c.quadraticCurveTo(64 + (x - 64) * 0.6, 260, 64 + (x - 64) * 0.2, 10);
      c.stroke();
    }
  });
  const petalGeo = new THREE.PlaneGeometry(2.6, 7.6, 2, 8);
  petalGeo.translate(0, 3.8, 0);
  petalGeo.rotateX(-Math.PI / 2);
  {
    // cup the petal and curl its tip up off the cloth
    const pos = petalGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = -pos.getZ(i);
      pos.setY(i, Math.pow(x / 1.3, 2) * 0.35 + Math.pow(z / 7.6, 2) * 1.1);
    }
    petalGeo.computeVertexNormals();
  }
  const petalMat = std({ map: petalTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.72 }, 'petal');
  const count = 26;
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(petalGeo, petalMat);
      const a = ((i + ring * 0.5) / count) * Math.PI * 2 + (r() - 0.5) * 0.1;
      p.position.set(Math.sin(a) * (R - 0.6), 0.9 + ring * 0.25, -Math.cos(a) * (R - 0.6));
      p.rotation.y = -a;
      p.rotateX(-0.08 - r() * 0.12 - ring * 0.1);
      p.rotateZ((r() - 0.5) * 0.3);
      const s = 0.85 + r() * 0.3 - ring * 0.08;
      p.scale.set(s, 1, s);
      g.add(p);
    }
  }
  // the green bracts behind the petals
  const bract = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.4, R * 0.6, 1.2, 32), std({ color: '#3d6a1e', roughness: 0.8 }, 'bract'));
  bract.position.y = 0.6;
  g.add(bract);

  // the stem runs off down the table, with a leaf
  const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(-6, 0.65, 10), new THREE.Vector3(-9, 0.6, 22), new THREE.Vector3(-14, 0.6, 40)]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 40, 0.55, 8), std({ color: '#4c7f22', roughness: 0.7 }, 'stem'));
  g.add(stem);
  const leafTex = canvasTex(256, 384, c => {
    c.fillStyle = '#3f7a1f';
    c.beginPath();
    c.moveTo(128, 384);
    c.bezierCurveTo(260, 300, 250, 80, 128, 0);
    c.bezierCurveTo(6, 80, -4, 300, 128, 384);
    c.fill();
    c.globalCompositeOperation = 'source-atop';
    const grad = c.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, 'rgba(20,50,10,0.35)');
    grad.addColorStop(0.5, 'rgba(160,210,90,0.18)');
    grad.addColorStop(1, 'rgba(20,50,10,0.35)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 256, 384);
    c.strokeStyle = 'rgba(200,230,150,0.55)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(128, 384);
    c.lineTo(128, 10);
    c.stroke();
    c.lineWidth = 1.6;
    for (let i = 1; i < 7; i++) {
      const y = 384 - i * 50;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(128, y);
        c.quadraticCurveTo(128 + s * 50, y - 20, 128 + s * 95, y - 60);
        c.stroke();
      }
    }
  });
  const leafGeo = new THREE.PlaneGeometry(8, 12, 4, 6);
  leafGeo.translate(0, 6, 0);
  leafGeo.rotateX(-Math.PI / 2);
  {
    const pos = leafGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, Math.pow(pos.getX(i) / 4, 2) * 0.6 + Math.sin(-pos.getZ(i) / 3) * 0.3);
    leafGeo.computeVertexNormals();
  }
  const leaf = new THREE.Mesh(leafGeo, std({ map: leafTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6 }, 'leaf'));
  leaf.position.set(-8.5, 0.7, 18);
  leaf.rotation.y = -2.0;
  g.add(leaf);
  return shadowed(g);
}

/* ------------------------------------------------------------------------ */
/*  Cutting chai                                                             */
/* ------------------------------------------------------------------------ */

const STEAM_V = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const STEAM_F = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform float uSeed;
uniform float uAlpha;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a*n(p); p *= 2.1; a *= .5; } return s; }
void main(){
  vec2 p = vUv - .5;
  float r = length(p);
  float t = uTime * .25 + uSeed;
  vec2 q = vec2(atan(p.y, p.x) * 1.2, r * 4. - t);
  float w = fbm(q * 2. + vec2(0., t)) * fbm(p * 5. + t * .4 + uSeed);
  float ring = smoothstep(.5, .12, r) * smoothstep(.0, .12, r);
  float a = smoothstep(.18, .5, w) * ring * uAlpha;
  gl_FragColor = vec4(vec3(1.), a * .5);
}`;

export function chai() {
  const g = new THREE.Group();
  const H = 8.6;
  const R = 3.5;
  // the tea: milky, with a skin of foam at the edge
  const tea = canvasTex(256, 256, c => {
    const grad = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, '#b77a43');
    grad.addColorStop(0.75, '#c08550');
    grad.addColorStop(0.92, '#d9b48a');
    grad.addColorStop(1, '#ead2b2');
    c.fillStyle = grad;
    c.fillRect(0, 0, 256, 256);
    const r = rng(8);
    for (let i = 0; i < 160; i++) {
      const a = r() * Math.PI * 2;
      const d = 100 + r() * 26;
      c.fillStyle = `rgba(245,225,200,${0.2 + r() * 0.3})`;
      c.beginPath();
      c.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 1 + r() * 3, 0, Math.PI * 2);
      c.fill();
    }
  });
  const surface = new THREE.Mesh(new THREE.CircleGeometry(R * 0.93, 48).rotateX(-Math.PI / 2), std({ map: tea, roughness: 0.18, metalness: 0 }, 'tea'));
  surface.position.y = H * 0.78;
  g.add(surface);
  // the glass: faceted, as cutting-chai glasses are, and mostly see-through
  const glassMat = withSun(
    new THREE.MeshPhysicalMaterial({ color: '#f3f6f2', roughness: 0.06, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false }),
    'glass',
  );
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.82, H, 14, 1, true), glassMat);
  wall.position.y = H / 2;
  g.add(wall);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 6, 48).rotateX(Math.PI / 2), withSun(new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.7, clearcoat: 1 }), 'rim'));
  rim.position.y = H;
  g.add(rim);
  // the tea seen through the glass, below the surface
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.92, R * 0.78, H * 0.76, 24), std({ color: '#a8703c', roughness: 0.3, transparent: true, opacity: 0.55 }, 'teabody'));
  body.position.y = H * 0.39;
  g.add(body);

  // the tea, not the clear glass, is what throws a shadow, so it lines up with everything else
  body.castShadow = true;

  const steams: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(9 + i * 3, 9 + i * 3).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        vertexShader: STEAM_V,
        fragmentShader: STEAM_F,
        uniforms: { uTime: { value: 0 }, uSeed: { value: i * 3.7 }, uAlpha: { value: 1 } },
        transparent: true,
        depthWrite: false,
      }),
    );
    m.position.y = H + 2 + i * 3.5;
    m.renderOrder = 5;
    g.add(m);
    steams.push(m);
  }
  surface.castShadow = false;
  const update = (t: number, sunAmount: number) => {
    void sunAmount;
    steams.forEach((m, i) => {
      m.material.uniforms.uTime.value = t;
      m.rotation.y = t * (0.05 + i * 0.03);
      m.position.x = Math.sin(t * 0.3 + i) * 0.8;
    });
  };
  return { group: g, update, steamAlpha: (a: number) => steams.forEach(m => (m.material.uniforms.uAlpha.value = a)) };
}

/* ------------------------------------------------------------------------ */
/*  Pencils                                                                  */
/* ------------------------------------------------------------------------ */

export function pencil(color = '#e8b923', length = 17) {
  const g = new THREE.Group();
  const r = 0.38;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, length, 6), std({ color, roughness: 0.45 }, 'pencil'));
  body.rotation.z = Math.PI / 2;
  g.add(body);
  const wood = new THREE.Mesh(new THREE.ConeGeometry(r, 1.8, 6), std({ color: '#e7c79a', roughness: 0.8 }, 'wood'));
  wood.rotation.z = -Math.PI / 2;
  wood.position.x = length / 2 + 0.9;
  g.add(wood);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), std({ color: '#2a2a2e', roughness: 0.4, metalness: 0.3 }, 'lead'));
  lead.rotation.z = -Math.PI / 2;
  lead.position.x = length / 2 + 1.75;
  g.add(lead);
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 1, 12), std({ color: '#c9c3b5', roughness: 0.3, metalness: 0.8 }, 'ferrule'));
  ferrule.rotation.z = Math.PI / 2;
  ferrule.position.x = -length / 2 - 0.5;
  g.add(ferrule);
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), std({ color: '#e58a8a', roughness: 0.9 }, 'eraser'));
  eraser.rotation.z = Math.PI / 2;
  eraser.position.x = -length / 2 - 1.4;
  g.add(eraser);
  g.position.y = r;
  return shadowed(g);
}

/* ------------------------------------------------------------------------ */
/*  Wax seal                                                                 */
/* ------------------------------------------------------------------------ */

export function waxSeal(color = '#d39a1c') {
  const R = 2.3;
  const tex = canvasTex(256, 256, c => {
    c.fillStyle = color;
    c.fillRect(0, 0, 256, 256);
    c.translate(128, 128);
    // a pressed sunflower: highlights on the upper-left of each ridge, shade on the lower-right
    const ridge = (draw: () => void) => {
      c.save();
      c.translate(-2, -2);
      c.strokeStyle = 'rgba(255,240,190,0.55)';
      draw();
      c.restore();
      c.save();
      c.translate(2, 2);
      c.strokeStyle = 'rgba(90,50,0,0.45)';
      draw();
      c.restore();
    };
    c.lineWidth = 5;
    ridge(() => {
      c.beginPath();
      c.arc(0, 0, 104, 0, Math.PI * 2);
      c.stroke();
    });
    c.lineWidth = 4;
    for (let i = 0; i < 14; i++) {
      ridge(() => {
        c.save();
        c.rotate((i / 14) * Math.PI * 2);
        c.beginPath();
        c.ellipse(0, -52, 11, 28, 0, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      });
    }
    ridge(() => {
      c.beginPath();
      c.arc(0, 0, 22, 0, Math.PI * 2);
      c.stroke();
    });
    c.fillStyle = 'rgba(90,50,0,0.35)';
    for (let i = 0; i < 30; i++) {
      const a = i * 2.4;
      const d = Math.sqrt(i / 30) * 18;
      c.beginPath();
      c.arc(Math.cos(a) * d, Math.sin(a) * d, 2, 0, Math.PI * 2);
      c.fill();
    }
  });
  // a blob, not a coin: the wax spread unevenly before it was pressed
  const shape = new THREE.Shape();
  const r = rng(77);
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rad = R * (1 + (r() - 0.5) * 0.14 + Math.sin(a * 3) * 0.03);
    if (i === 0) shape.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else shape.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.25, bevelSegments: 3, curveSegments: 4 });
  geo.rotateX(-Math.PI / 2);
  {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * R * 0.95), 0.5 - pos.getZ(i) / (2 * R * 0.95));
  }
  const mesh = new THREE.Mesh(geo, std({ map: tex, roughness: 0.32, metalness: 0.05 }, 'wax'));
  return shadowed(mesh);
}
