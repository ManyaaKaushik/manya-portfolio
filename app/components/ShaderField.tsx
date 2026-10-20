'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * WebGL colour field with pollen that scatters from the pointer. The canvas usually sits
 * behind other content, so it listens on the window and maps the pointer into its own box.
 */

const vertex = 'attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
const fragment = `precision mediump float;varying vec2 uv;uniform float time;uniform float palette;uniform vec2 pointer;
float field(vec2 p){return sin(p.x*7.+sin(p.y*4.+time*.3))*sin(p.y*6.-time*.2);}
void main(){vec2 p=uv;float f=field(p);float g=field(p*1.5+vec2(time*.025,0.));
vec3 a=vec3(.27,.38,.25);vec3 b=vec3(.80,.78,.42);vec3 c=vec3(.88,.60,.40);
if(palette>0.5){a=vec3(.17,.24,.46);b=vec3(.55,.50,.72);c=vec3(.95,.70,.38);}
vec3 color=mix(a,b,smoothstep(-.9,.9,f));color=mix(color,c,smoothstep(.35,.9,g)*.6);
float pollen=0.;for(int i=0;i<22;i++){float n=float(i);vec2 seed=vec2(fract(sin(n*43.3)*45.1),fract(sin(n*17.7)*62.7));
vec2 drift=vec2(sin(time*.4+n)*.025,cos(time*.3+n)*.03);drift+=normalize(seed-pointer+vec2(.001))*exp(-length(seed-pointer)*9.)*.12;
float d=length(p-seed-drift);pollen+=smoothstep(.007,.002,d)*.55;}
color+=pollen;color+=vec3(.22,.18,.06)*exp(-length(p-pointer)*9.);
float vig=smoothstep(1.15,.35,length(p-.5));color*=mix(.82,1.,vig);
gl_FragColor=vec4(color,1.);}`;

export default function ShaderField({ palette = 0, className = '' }: { palette?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef(palette);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);

  useEffect(() => {
    const canvas = ref.current!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!gl) {
      setFallback(true);
      return;
    }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) {
      setFallback(true);
      return;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(program, 'time');
    const uPalette = gl.getUniformLocation(program, 'palette');
    const uPointer = gl.getUniformLocation(program, 'pointer');

    let frame = 0;
    let visible = false;
    const target = [0.5, 0.5];
    const pointer = [0.5, 0.5];
    let mix = paletteRef.current;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const draw = (t: number) => {
      frame = 0;
      pointer[0] += (target[0] - pointer[0]) * 0.08;
      pointer[1] += (target[1] - pointer[1]) * 0.08;
      mix += (paletteRef.current - mix) * 0.06;
      gl.uniform1f(uTime, reduced ? 0 : t * 0.001);
      gl.uniform1f(uPalette, mix);
      gl.uniform2f(uPointer, pointer[0], pointer[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const start = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      target[0] = x;
      target[1] = y;
    };
    const vis = () => !document.hidden && visible && start();
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

  return (
    <>
      <canvas ref={ref} aria-hidden="true" className={`${className} ${fallback ? 'hidden' : ''}`} />
      {fallback && <div aria-hidden="true" className={`${className} bg-[radial-gradient(circle_at_30%_30%,#cfc56b,transparent_50%),radial-gradient(circle_at_70%_70%,#e09a66,transparent_45%),#45603f]`} />}
    </>
  );
}
