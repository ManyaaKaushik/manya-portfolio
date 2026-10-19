'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Dices, Mic, MousePointer2, Play, Sun, Sunset } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { links, whatIfs } from '../lib/content';
import { MaskHeading, Reveal, SectionLabel } from './ui';

export default function Experiments() {
  return (
    <section id="experiments" aria-labelledby="experiments-title" className="relative">
      <div className="mx-auto max-w-[1360px] px-5 py-28 md:px-10 md:py-40">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <SectionLabel n="04">Play</SectionLabel>
            <MaskHeading id="experiments-title" className="mt-6 text-[clamp(46px,6.4vw,104px)] leading-[0.94]">
              <>Serious curiosity.</>
              <em>Playful possibilities.</em>
            </MaskHeading>
          </div>
          <Reveal delay={0.15} className="md:col-span-4 md:col-start-9">
            <p className="text-[17px] leading-[1.65] text-ink-soft">AI, code, and the joy of trying things. Sometimes a “what if” is a good place to start.</p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 md:mt-20 md:grid-cols-12 md:gap-5">
          <Reveal className="md:col-span-7 md:row-span-2">
            <ShaderPatch />
          </Reveal>
          <Reveal delay={0.08} className="md:col-span-5">
            <WhatIf />
          </Reveal>
          <Reveal delay={0.16} className="md:col-span-5">
            <VoiceCard />
          </Reveal>
          <Reveal delay={0.05} className="md:col-span-6">
            <FilmSlot n="01" title="An idea in motion." note="A space for my first project film." tone="bg-blue-mist" code="{ imagination → interaction }" />
          </Reveal>
          <Reveal delay={0.12} className="md:col-span-6">
            <FilmSlot n="02" title="One more “what if”." note="A second experiment, waiting to be shared." tone="bg-lilac" code=".. . / another possibility / . .." />
          </Reveal>
        </div>

        <Reveal className="mt-10 flex justify-center">
          <a href={links.playground} target="_blank" rel="noopener noreferrer" className="group inline-flex h-12 items-center gap-2 rounded-full border border-ink/15 px-6 text-[15px] font-medium transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper-light">
            More playful things
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.75} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function WhatIf() {
  const [i, setI] = useState(0);
  return (
    <div className="flex h-full min-h-[260px] flex-col justify-between rounded-[24px] bg-paper-light p-7 shadow-[0_0_0_1px_rgb(28_35_51/0.06)] md:p-8">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Curiosity is a practice</p>
        <span className="font-mono text-[11px] text-muted tabular-nums">
          {i + 1}/{whatIfs.length}
        </span>
      </div>
      <div className="relative my-6 min-h-[3.4em] font-serif text-[clamp(24px,2.3vw,32px)] leading-[1.12] tracking-[-0.01em]" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={{ duration: 0.45 }}
          >
            {whatIfs[i]}
          </motion.p>
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={() => setI(v => (v + 1) % whatIfs.length)}
        className="group inline-flex h-11 w-fit items-center gap-2 rounded-full bg-ink pl-4 pr-5 text-[14px] font-medium text-paper-light transition-colors duration-300 hover:bg-blue"
      >
        <Dices className="size-4 transition-transform duration-500 ease-out-expo group-hover:rotate-[200deg]" strokeWidth={1.75} />
        Ask another “what if”
      </button>
    </div>
  );
}

function VoiceCard() {
  const bars = [0.35, 0.7, 0.45, 1, 0.6, 0.85, 0.4, 0.95, 0.55, 0.75, 0.3, 0.65, 0.9, 0.5, 0.8, 0.4, 0.7, 0.35];
  return (
    <a
      href="https://manyaa.me/works/sakhi"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-[24px] bg-[#efe0d3] p-7 md:p-8"
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow !text-[#593a32]/70">Sakhi · Agentic AI</p>
        <span className="flex size-10 items-center justify-center rounded-full bg-[#593a32] text-[#efe0d3]">
          <Mic className="size-4" strokeWidth={1.75} />
        </span>
      </div>
      <div className="my-6 flex h-14 items-center gap-[5px]" aria-hidden="true">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-[5px] origin-center rounded-full bg-[#593a32]/70 animate-[voice_1.4s_ease-in-out_infinite] group-hover:bg-[#593a32]"
            style={{ height: `${h * 100}%`, animationDelay: `${i * 0.07}s` }}
          />
        ))}
      </div>
      <div className="flex items-end justify-between gap-4">
        <p className="font-serif text-[clamp(26px,2.4vw,34px)] leading-[1.05] text-[#3d2620]">
          When an idea <em className="text-[#8a4a36]">finds its voice.</em>
        </p>
        <ArrowUpRight className="size-6 shrink-0 text-[#593a32] transition-transform duration-500 ease-out-expo group-hover:-translate-y-1 group-hover:translate-x-1" strokeWidth={1.5} />
      </div>
      <style>{`@keyframes voice{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}`}</style>
    </a>
  );
}

function FilmSlot({ n, title, note, tone, code }: { n: string; title: string; note: string; tone: string; code: string }) {
  return (
    <article>
      <div className={`relative flex aspect-video items-center justify-center overflow-hidden rounded-[24px] ${tone}`}>
        <span className="absolute left-5 top-5 font-mono text-[11px] tracking-[0.1em] text-ink/50">{code}</span>
        <span className="absolute right-5 top-5 rounded-full border border-ink/15 bg-paper-light/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/60 backdrop-blur">
          Coming soon
        </span>
        <span className="relative flex size-16 items-center justify-center rounded-full border border-ink/15 bg-paper-light/70 text-ink/40 backdrop-blur">
          <span className="absolute inset-0 animate-ping rounded-full border border-ink/10 [animation-duration:2.6s]" />
          <Play className="ml-0.5 size-5" strokeWidth={1.5} />
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4 px-1">
        <h3 className="font-serif text-[26px] leading-tight tracking-[-0.01em]">{title}</h3>
        <span className="font-mono text-[11px] tracking-[0.14em] text-muted">FILM {n}</span>
      </div>
      <p className="mt-1 px-1 text-[15px] text-muted">{note} Coming soon.</p>
    </article>
  );
}

/* ------------------------------------------------------------------------ */
/*  WebGL colour field with pollen that scatters from the pointer           */
/* ------------------------------------------------------------------------ */

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

function ShaderPatch() {
  const ref = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef(0);
  const [palette, setPalette] = useState(0);
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
    let mix = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
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
      target[0] = (e.clientX - r.left) / r.width;
      target[1] = 1 - (e.clientY - r.top) / r.height;
    };
    const vis = () => !document.hidden && visible && start();
    canvas.addEventListener('pointermove', move);
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', vis);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div className="group relative h-full min-h-[420px] overflow-hidden rounded-[24px] bg-[#6d7c4a] md:min-h-[540px]">
      <canvas ref={ref} className={`absolute inset-0 size-full ${fallback ? 'hidden' : ''}`} role="img" aria-label="A flowing botanical colour field with pollen that drifts away from your pointer" />
      {fallback && <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#cfc56b,transparent_50%),radial-gradient(circle_at_70%_70%,#e09a66,transparent_45%),#45603f]" />}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
      <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[12px] text-white/90 backdrop-blur-md">
        <MousePointer2 className="size-3.5" strokeWidth={2} />
        Move through the light
      </div>
      <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-end justify-between gap-4 md:inset-x-8 md:bottom-8">
        <div>
          <h3 className="font-serif text-[clamp(34px,3.6vw,54px)] leading-none tracking-[-0.02em] text-white">
            Colour, <em>in the wild.</em>
          </h3>
          <p className="mt-2 text-[15px] text-white/75">A shader study. Scatter a little pollen.</p>
        </div>
        <button
          type="button"
          onClick={() => setPalette(p => 1 - p)}
          aria-pressed={palette === 1}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-white/90 px-4 text-[14px] font-medium text-ink backdrop-blur transition-colors hover:bg-white"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={palette} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.3 }}>
              {palette ? <Sunset className="size-4" strokeWidth={1.75} /> : <Sun className="size-4" strokeWidth={1.75} />}
            </motion.span>
          </AnimatePresence>
          {palette ? 'Dusk light' : 'Noon light'}
        </button>
      </div>
    </div>
  );
}
