'use client';

import { useEffect, useRef } from 'react';

/*
 * A live, ordered-dither sky. Clouds are domain-warped fbm noise; the tonal image is
 * thresholded per cell against an 8×8 Bayer matrix, so each cell is either an ink dot or
 * bare paper. That is real 1-bit ordered dithering, not a texture. Each cell samples the
 * tone once and draws a square dot with a gap, like a print screen. Clouds drift slowly,
 * shift with scroll, and part around the pointer.
 */

const CELL = 6; // CSS px per dither cell; each cell holds one square dot with a gap

const vertex = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const fragment = `precision highp float;
uniform vec2 res;uniform float cellPx;uniform float time;uniform float scroll;uniform vec2 pointer;uniform float pointerOn;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
float bayer8(vec2 a){return bayer4(.5*a)*.25+bayer2(a);}
void main(){
 vec2 cell=floor(gl_FragCoord.xy/cellPx);
 vec2 grid=res/cellPx;
 vec2 uv=(cell+.5)/grid;                       // one tone sample per cell
 float aspect=res.x/res.y;
 vec2 p=vec2(uv.x*aspect,uv.y);
 float drift=time*.015;
 // billowing top edge of a cumulus bank: big swells plus small cauliflower bumps
 float edge=.7+.32*(fbm(vec2(p.x*1.1+drift,1.3))-.5)+.14*(fbm(vec2(p.x*3.6+drift*1.6,7.7))-.5)-scroll*.06;
 vec2 q=p*vec2(2.,2.8)+vec2(drift*1.4,0.);
 q+=.45*vec2(fbm(q+3.1),fbm(q+8.3));
 float puff=fbm(q);
 float depth=edge-uv.y+(puff-.5)*.42;           // >0 inside the bank
 // a few loose cloudlets drifting in the open sky above
 float lets=smoothstep(.6,.68,fbm(p*vec2(1.8,3.6)+vec2(drift*2.2,3.)))*smoothstep(edge+.02,edge+.12,uv.y);
 float cloud=max(smoothstep(-.012,.02,depth),lets);
 // lit, nearly bare tops; shaded bellies deeper down, broken up into billows
 float billow=fbm(q*1.6+5.);
 float body=smoothstep(.03,.38,depth)*clamp(.25+1.6*(billow-.42),0.,1.);
 float cloudTone=clamp(.02+.62*body,0.,.75);
 float skyTone=.6+.16*(fbm(p*vec2(3.,6.)+vec2(drift*2.,0.))-.5);
 float tone=mix(skyTone,cloudTone,cloud);
 // the pointer opens a little gap in the weather
 vec2 dp=(uv-pointer)*vec2(aspect,1.);
 tone*=1.-.55*pointerOn*exp(-dot(dp,dp)*60.);
 // dissolve into paper at the bottom, ease in at the top
 tone*=smoothstep(.0,.5,uv.y)*smoothstep(1.,.93,uv.y);
 float on=step(bayer8(cell)+.001,tone);
 vec2 f=fract(gl_FragCoord.xy/cellPx);
 float mark=step(.16,f.x)*step(f.x,.84)*step(.16,f.y)*step(f.y,.84);
 float a=on*mark;
 gl_FragColor=vec4(vec3(.212,.373,.729)*a,a);
}`;

export default function DitherSky({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {
      res: gl.getUniformLocation(program, 'res'),
      cellPx: gl.getUniformLocation(program, 'cellPx'),
      time: gl.getUniformLocation(program, 'time'),
      scroll: gl.getUniformLocation(program, 'scroll'),
      pointer: gl.getUniformLocation(program, 'pointer'),
      pointerOn: gl.getUniformLocation(program, 'pointerOn'),
    };

    let frame = 0;
    let dpr = 1;
    let visible = false;
    let last = 0;
    const target = [0.5, 0.5];
    const ptr = [0.5, 0.5];
    let on = 0;
    let onTarget = 0;
    const start = performance.now();

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (!frame) render(performance.now(), true);
    };
    const render = (t: number, force = false) => {
      frame = 0;
      // ~30fps is plenty for drifting clouds and halves the GPU work
      if (force || t - last > 32) {
        last = t;
        ptr[0] += (target[0] - ptr[0]) * 0.12;
        ptr[1] += (target[1] - ptr[1]) * 0.12;
        on += (onTarget - on) * 0.08;
        const rect = canvas.getBoundingClientRect();
        gl.uniform2f(u.res, canvas.width, canvas.height);
        gl.uniform1f(u.cellPx, Math.round(CELL * dpr));
        gl.uniform1f(u.time, reduced ? 0 : (t - start) / 1000);
        gl.uniform1f(u.scroll, -rect.top / Math.max(1, innerHeight));
        gl.uniform2f(u.pointer, ptr[0], ptr[1]);
        gl.uniform1f(u.pointerOn, on);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      if (visible && !reduced && !document.hidden) frame = requestAnimationFrame(t2 => render(t2));
    };
    const kick = () => {
      if (!frame && visible) frame = requestAnimationFrame(t => render(t));
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        if (reduced) render(performance.now(), true);
        else kick();
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // The canvas sits behind content, so listen on the window and map into its box.
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      onTarget = inside ? 1 : 0;
      if (inside) {
        target[0] = x;
        target[1] = y;
      }
      if (reduced && inside) render(performance.now(), true);
    };
    const vis = () => !document.hidden && kick();
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('visibilitychange', vis);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', vis);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
