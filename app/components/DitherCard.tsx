'use client';

import { useEffect, useRef } from 'react';

/*
 * The ground behind a case-study image: slow, warped noise thresholded against an 8×8 Bayer
 * matrix, drawn as small square dots in the project's own ink. Denser towards the edges so
 * the image keeps a clean field, and a soft swell of dots follows the pointer while it is over
 * the card. Same print-screen language as the sky in the hero.
 */

const CELL = 5; // CSS px per dither cell

const vertex = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const fragment = `precision mediump float;
uniform vec2 res;uniform float cellPx;uniform float time;uniform vec2 pointer;uniform float pointerOn;uniform vec3 ink;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float bayer2(vec2 a){a=floor(a);return fract(a.x/2.+a.y*a.y*.75);}
float bayer4(vec2 a){return bayer2(.5*a)*.25+bayer2(a);}
float bayer8(vec2 a){return bayer4(.5*a)*.25+bayer2(a);}
void main(){
 vec2 cell=floor(gl_FragCoord.xy/cellPx);
 vec2 uv=(cell+.5)/(res/cellPx);
 float aspect=res.x/res.y;
 vec2 p=vec2(uv.x*aspect,uv.y)*2.2;
 float t=time*.05;
 vec2 q=p+.6*vec2(fbm(p+vec2(t,0.)),fbm(p+vec2(5.2,1.3-t)));
 float n=fbm(q+vec2(0.,t*.6));
 // a clear field in the middle, weather gathering at the edges
 vec2 c=(uv-.5)*vec2(aspect,1.);
 float edge=smoothstep(.22,.75,length(c*vec2(.8,1.1)));
 float tone=clamp((n-.32)*1.5,0.,1.)*mix(.18,.62,edge);
 vec2 dp=(uv-pointer)*vec2(aspect,1.);
 tone+=.42*pointerOn*exp(-dot(dp,dp)*9.)*(.6+.4*n);
 float on=step(bayer8(cell)+.001,tone);
 vec2 f=fract(gl_FragCoord.xy/cellPx);
 float mark=step(.2,f.x)*step(f.x,.8)*step(.2,f.y)*step(f.y,.8);
 float a=on*mark*.5;
 gl_FragColor=vec4(ink*a,a);
}`;

const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

export default function DitherCard({ ink, className = '' }: { ink: string; className?: string }) {
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
      pointer: gl.getUniformLocation(program, 'pointer'),
      pointerOn: gl.getUniformLocation(program, 'pointerOn'),
      ink: gl.getUniformLocation(program, 'ink'),
    };
    gl.uniform3fv(u.ink, hex(ink));

    let frame = 0;
    let dpr = 1;
    let visible = false;
    let last = 0;
    const target = [0.5, 0.5];
    const ptr = [0.5, 0.5];
    let on = 0;
    let onTarget = 0;
    const start = performance.now();

    const draw = (t: number) => {
      ptr[0] += (target[0] - ptr[0]) * 0.18;
      ptr[1] += (target[1] - ptr[1]) * 0.18;
      on += (onTarget - on) * 0.1;
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.cellPx, Math.round(CELL * dpr));
      gl.uniform1f(u.time, reduced ? 0 : (t - start) / 1000);
      gl.uniform2f(u.pointer, ptr[0], ptr[1]);
      gl.uniform1f(u.pointerOn, on);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const render = (t: number) => {
      frame = 0;
      // ~24fps: the dots step, they don't glide, so more frames buy nothing
      if (t - last > 40) {
        last = t;
        draw(t);
      }
      if (visible && !document.hidden) frame = requestAnimationFrame(render);
    };
    const kick = () => {
      if (!frame && visible && !reduced) frame = requestAnimationFrame(render);
    };
    const resize = () => {
      // layout size, not the bounding box: a card mid-morph is scaled by a transform
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw(performance.now());
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // the canvas sits under the image, so read the pointer from the card around it
    const host = canvas.parentElement!;
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target[0] = (e.clientX - r.left) / r.width;
      target[1] = 1 - (e.clientY - r.top) / r.height;
      onTarget = 1;
      if (reduced) draw(performance.now());
    };
    const leave = () => {
      onTarget = 0;
      if (reduced) draw(performance.now());
    };
    const vis = () => !document.hidden && kick();
    host.addEventListener('pointermove', move, { passive: true });
    host.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', vis);

    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', vis);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // cards mount and unmount with filters and view modes; hand the context back once the canvas
      // has really left the page (a StrictMode re-run keeps the same canvas, and a lost context can't be revived)
      setTimeout(() => !canvas.isConnected && gl.getExtension('WEBGL_lose_context')?.loseContext(), 0);
    };
  }, [ink]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
