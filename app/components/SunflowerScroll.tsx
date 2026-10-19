'use client';

import { AnimatePresence, motion, useMotionTemplate, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Projected, SunflowerScene } from './sunflower/scene';
import { scrollToId, useLenis } from './SmoothScroll';
import { SunflowerGlyph } from './ui';

/* Herbarium callouts pinned to points on the flower; each shows while its range is on screen. */
type Callout = { id: string; range: [number, number]; side: 'left' | 'right'; lift: number; label: string; note: string };
const CALLOUTS: Callout[] = [
  { id: 'rays', range: [0.25, 0.4], side: 'left', lift: -56, label: 'Ray florets', note: 'each “petal” is a flower' },
  { id: 'disc', range: [0.28, 0.4], side: 'left', lift: 64, label: 'Disc florets', note: '1,100, in Fibonacci spirals' },
  { id: 'centre', range: [0.53, 0.68], side: 'left', lift: -60, label: 'Florets in waiting', note: 'they open from the rim inward' },
  { id: 'stem', range: [0.56, 0.68], side: 'right', lift: 56, label: 'Caulis', note: 'bends, never breaks' },
];

const STATES: [number, string][] = [
  [0.06, 'Just opening'],
  [0.24, 'Unfurling'],
  [0.46, 'In full bloom'],
  [0.74, 'Three-quarter'],
  [1.01, 'Facing the sun'],
];

export default function SunflowerScroll() {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SunflowerScene | null>(null);
  const calloutRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bloomRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<HTMLSpanElement>(null);
  const lenis = useLenis();

  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 260, damping: 42, mass: 0.35, restDelta: 0.0001 });

  /* ---- boot the scene (three.js is loaded on demand, off the critical path) ---- */
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let visible = true;
    let scene: SunflowerScene | null = null;
    let disposePanel: (() => void) | undefined;
    const started = performance.now();
    const canvas = canvasRef.current!;
    const section = containerRef.current!;

    const loop = () => {
      frame = 0;
      if (!scene || !visible || document.hidden) return;
      scene.progress = progress.get();
      scene.tick();
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!frame && scene && visible && !document.hidden) {
        scene.resetClock();
        frame = requestAnimationFrame(loop);
      }
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
    });
    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      scene?.resize(r.width, r.height);
    });
    const onVis = () => start();
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      scene?.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    };

    (async () => {
      try {
        setLoaded(0.2);
        const { SunflowerScene } = await import('./sunflower/scene');
        if (cancelled) return;
        setLoaded(0.7);
        scene = new SunflowerScene(canvas);
        sceneRef.current = scene;
        const r = canvas.getBoundingClientRect();
        scene.resize(r.width, r.height);
        scene.onFrame = (projected, info) => placeCallouts(projected, info);
        scene.progress = progress.get();
        if (process.env.NODE_ENV === 'development') {
          // tweak panel for the flower; stripped from production builds
          const { mountDevPanel } = await import('./sunflower/devPanel');
          if (cancelled) return;
          disposePanel = mountDevPanel(scene);
        }
        scene.warm();
        setLoaded(1);
        io.observe(section);
        ro.observe(canvas);
        start();
        // hold the loader a beat so it never flashes
        const wait = Math.max(0, 900 - (performance.now() - started));
        setTimeout(() => !cancelled && setReady(true), wait);
      } catch (err) {
        console.error('Sunflower failed to start', err);
        if (!cancelled) {
          setFailed(true);
          setReady(true);
        }
      }
    })();

    const placeCallouts = (projected: Projected[], info: { bloom: number }) => {
      const p = progress.get();
      for (const pt of projected) {
        const el = calloutRefs.current[pt.id];
        const c = CALLOUTS.find(x => x.id === pt.id)!;
        if (!el) continue;
        const [a, b] = c.range;
        const o = Math.min(smooth(a - 0.03, a + 0.02, p), 1 - smooth(b, b + 0.04, p)) * pt.visible;
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`;
        el.style.setProperty('--draw', o.toFixed(3));
      }
      if (bloomRef.current) bloomRef.current.textContent = `Bloom ${String(Math.round(Math.min(1, Math.max(0, info.bloom)) * 100)).padStart(3, '0')}%`;
      if (stateRef.current) {
        const label = STATES.find(([limit]) => p < limit)?.[1] ?? '';
        if (stateRef.current.textContent !== label) stateRef.current.textContent = label;
      }
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVis);
      disposePanel?.();
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [progress]);

  /* ---- hold the page still while loading ---- */
  useEffect(() => {
    const root = document.documentElement;
    if (!ready) {
      lenis?.stop();
      root.style.overflow = 'hidden';
    } else {
      root.style.overflow = '';
      lenis?.start();
    }
    return () => {
      root.style.overflow = '';
    };
  }, [ready, lenis]);

  const hudBar = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);
  const reveal = useSpring(0, { stiffness: 60, damping: 20 });
  useEffect(() => {
    if (ready) reveal.set(1);
  }, [ready, reveal]);
  const canvasScale = useTransform(reveal, [0, 1], [1.06, 1]);

  return (
    <section ref={containerRef} id="top" aria-label="Introduction" className="relative h-[460vh]">
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        {/* soft studio light behind the specimen */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_55%,rgb(255_252_240/0.9),transparent_70%)]" />
        <motion.canvas
          ref={canvasRef}
          style={{ opacity: reveal, scale: canvasScale }}
          className={`absolute inset-0 h-full w-full ${failed ? 'hidden' : ''}`}
          role="img"
          aria-label="A 3D sunflower. As you scroll, its bud opens: the green bracts part and the yellow petals unfurl around a spiralled disc, while the flower sways and nods with the motion of the page."
        />

        {/* herbarium callouts */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] hidden lg:block">
          {CALLOUTS.map(c => (
            <div
              key={c.id}
              ref={el => {
                calloutRefs.current[c.id] = el;
              }}
              className="absolute left-0 top-0 opacity-0 will-change-transform"
            >
              <span className="absolute -left-[5px] -top-[5px] size-[10px] rounded-full border border-ink/60 bg-paper-light/70 backdrop-blur-[2px]" />
              <span className="absolute -left-[1.5px] -top-[1.5px] size-[3px] rounded-full bg-ink" />
              <svg
                className="absolute overflow-visible"
                style={{ left: 0, top: 0 }}
                width="1"
                height="1"
              >
                <path
                  d={`M ${c.side === 'left' ? -6 : 6} ${c.lift > 0 ? 6 : -6} L ${c.side === 'left' ? -40 : 40} ${c.lift} L ${c.side === 'left' ? -120 : 120} ${c.lift}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  pathLength={1}
                  className="text-ink/45"
                  style={{ strokeDasharray: 1, strokeDashoffset: 'calc(1 - var(--draw, 0))' }}
                />
              </svg>
              <div
                className={`absolute w-max rounded-md bg-paper/75 px-2 py-1 backdrop-blur-[3px] ${c.side === 'left' ? 'text-right' : 'text-left'}`}
                style={{
                  top: c.lift - 40,
                  ...(c.side === 'left' ? { right: 120 } : { left: 120 }),
                }}
              >
                <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink/70">{c.label}</p>
                <p className="mt-0.5 font-serif text-[19px] italic leading-tight text-blue">{c.note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* corner registration marks — a printed plate */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-4 hidden md:block lg:inset-6">
          {['left-0 top-16 border-l border-t', 'right-0 top-16 border-r border-t', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map(c => (
            <span key={c} className={`absolute size-3 border-ink/25 ${c}`} />
          ))}
        </div>

        {/* ---- Story beats ---- */}
        <Beat progress={scrollYProgress} range={[0, 0.1]} first ready={ready} className="inset-x-0 top-[13svh] px-5 text-center md:top-[14svh]">
          <p className="eyebrow mb-5 flex items-center justify-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-gold" />
            Product Designer at Blinkit
          </p>
          <h1 className="display font-serif text-[clamp(52px,8.4vw,128px)] leading-[0.92] tracking-[-0.03em] text-ink">
            Hey, I’m <em>Manya.</em>
          </h1>
          <p className="mx-auto mt-5 max-w-[34ch] text-[17px] leading-relaxed text-ink-soft md:text-[19px]">
            Your friendly neighbourhood product designer — bringing systems, people and design together.
          </p>
        </Beat>

        <Beat progress={scrollYProgress} range={[0.24, 0.4]} className="bottom-[7svh] left-5 right-5 md:bottom-auto md:left-[6vw] md:right-auto md:top-1/2 md:max-w-[min(30rem,34vw)] md:-translate-y-1/2">
          <BeatCopy
            n="1a"
            kicker="Open up"
            title={
              <>
                Every product is <em>a system of parts.</em>
              </>
            }
            body="Research, flows, pixels and people. I like to open things up to understand how they really work — and who they’re for."
          />
        </Beat>

        <Beat progress={scrollYProgress} range={[0.52, 0.68]} className="bottom-[7svh] left-5 right-5 md:bottom-auto md:left-auto md:right-[6vw] md:top-1/2 md:max-w-[min(30rem,34vw)] md:-translate-y-1/2">
          <BeatCopy
            n="1b"
            kicker="Turn it around"
            title={
              <>
                Building for <em>consumer & enterprise.</em>
              </>
            }
            body="At Blinkit today. Before that, 0 → 1 work across quick commerce, supply chain, travel, agentic AI, healthcare, music & entertainment."
          />
        </Beat>

        <Beat progress={scrollYProgress} range={[0.86, 1]} last className="inset-x-0 bottom-[8svh] px-5 text-center md:bottom-[9svh]">
          <p className="eyebrow mb-4"><span className="text-blue">1c</span> — Face the sun</p>
          <h2 className="display mx-auto max-w-[16ch] font-serif text-[clamp(40px,5vw,76px)] leading-[0.98] tracking-[-0.025em]">
            Simpler. Clearer. <em>More human.</em>
          </h2>
          <a
            href="#work"
            aria-label="Scroll to selected work"
            onClick={e => {
              e.preventDefault();
              scrollToId(lenis, 'work');
            }}
            className="group mx-auto mt-8 flex h-11 w-[26px] justify-center rounded-full border border-ink/30 transition-colors duration-300 hover:border-ink"
          >
            <span className="mt-2 h-2 w-[2px] animate-[cue_1.8s_var(--ease-out-quart)_infinite] rounded-full bg-ink/70" />
          </a>
        </Beat>

        {/* ---- Scroll cue ---- */}
        <motion.div style={{ opacity: cueOpacity }} className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center md:bottom-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={ready ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.1, duration: 0.9 }}
            className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
          >
            <span className="relative flex h-7 w-[18px] justify-center rounded-full border border-ink/25">
              <span className="mt-1.5 h-1.5 w-[2px] animate-[cue_1.8s_var(--ease-out-quart)_infinite] rounded-full bg-ink/60" />
            </span>
            Scroll to let it bloom
          </motion.div>
        </motion.div>

        {/* ---- Plate HUD ---- */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 bottom-4 hidden items-end justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted md:flex lg:inset-x-6 lg:bottom-6">
          <div className="space-y-1 pl-5 pb-4">
            <p className="text-ink/70">Fig. 01 — Helianthus annuus</p>
            <p>
              <span ref={stateRef}>Just opening</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 pr-5 pb-4">
            <p>
              <span ref={bloomRef} className="tabular-nums text-ink/70">
                Bloom 005%
              </span>
            </p>
            <div className="h-px w-28 bg-ink/15">
              <motion.div style={{ scaleX: hudBar }} className="h-px origin-left bg-ink/70" />
            </div>
          </div>
        </div>
      </div>

      <Preloader loaded={loaded} ready={ready} />
      <style>{`@keyframes cue{0%{transform:translateY(0);opacity:0}30%{opacity:1}80%{transform:translateY(9px);opacity:0}100%{opacity:0}}`}</style>
    </section>
  );
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------------ */
/*  Story beat overlay                                                       */
/* ------------------------------------------------------------------------ */

function Beat({
  progress,
  range: [a, b],
  first,
  last,
  ready = true,
  className = '',
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  first?: boolean;
  last?: boolean;
  ready?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const fade = 0.06;
  const input = first ? [0, b, b + fade] : last ? [a - fade, a, 1] : [a - fade, a, b, b + fade];
  const opacity = useTransform(progress, input, first ? [1, 1, 0] : last ? [0, 1, 1] : [0, 1, 1, 0]);
  const y = useTransform(progress, input, first ? [0, 0, -48] : last ? [48, 0, 0] : [48, 0, 0, -48]);
  const blur = useTransform(progress, input, first ? [0, 0, 10] : last ? [10, 0, 0] : [10, 0, 0, 10]);
  const filter = useMotionTemplate`blur(${blur}px)`;
  const pointerEvents = useTransform(opacity, v => (v > 0.6 ? 'auto' : 'none'));

  return (
    <motion.div style={{ opacity, filter, pointerEvents }} className={`absolute z-10 ${className}`}>
      <motion.div style={{ y }}>
        {first ? (
          <motion.div
            initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
            animate={ready ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 1.2, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        ) : (
          children
        )}
      </motion.div>
    </motion.div>
  );
}

function BeatCopy({ n, kicker, title, body }: { n: string; kicker: string; title: React.ReactNode; body: string }) {
  return (
    <div className="rounded-2xl bg-paper/80 p-1 backdrop-blur-[2px] md:bg-transparent md:p-0 md:backdrop-blur-none">
      <p className="eyebrow mb-4 flex items-center gap-3">
        <span className="text-blue">{n}</span>
        <span className="h-px w-8 bg-line-strong" />
        {kicker}
      </p>
      <h2 className="display font-serif text-[clamp(36px,4.4vw,68px)] leading-[0.98] tracking-[-0.025em] text-ink">{title}</h2>
      <p className="mt-5 max-w-[40ch] text-[16px] leading-[1.65] text-ink-soft md:text-[17px]">{body}</p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*  Loader                                                                   */
/* ------------------------------------------------------------------------ */

function Preloader({ loaded, ready }: { loaded: number; ready: boolean }) {
  const pct = Math.round(loaded * 100);
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          key="loader"
          role="status"
          aria-live="polite"
          aria-label={`Growing the sunflower, ${pct} percent`}
          initial={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          transition={{ duration: 1.05, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-paper"
        >
          <motion.div exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.5 }} className="flex flex-col items-center">
            <div className="relative size-[72px]">
              <svg viewBox="0 0 64 64" className="absolute inset-0 animate-[spin_2.4s_linear_infinite]">
                <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="1" className="text-ink/10" />
                <circle
                  cx="32"
                  cy="32"
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-blue transition-[stroke-dashoffset] duration-300"
                  strokeDasharray={c}
                  strokeDashoffset={c * (1 - Math.max(0.06, loaded))}
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <SunflowerGlyph className="absolute inset-[22px] text-gold" />
            </div>
            <p className="mt-7 font-serif text-[28px] leading-none tracking-[-0.01em] text-ink">
              Growing the <em className="text-blue">sunflower</em>
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted tabular-nums">{String(pct).padStart(3, '0')}%</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
