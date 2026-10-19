'use client';

import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { scrollToId, useLenis } from './SmoothScroll';
import { SunflowerGlyph } from './ui';

/* ------------------------------------------------------------------------ */
/*  The sequence                                                            */
/* ------------------------------------------------------------------------ */

const FRAME_COUNT = 120;
const PAPER = '#f6f4eb';
// Square frames rendered by scripts/render-sequence.mjs: 1200px for large screens, 760px for phones.
const frameSrc = (i: number, small: boolean) => `/sequence/${small ? 'sm/' : ''}helianthus_${String(i).padStart(3, '0')}.webp`;

/* Camera keyframes: where the plate sits while each story beat is on screen.
   x / y are fractions of the viewport, zoom is a multiple of the contain-fit. */
const KEYS = [0, 0.12, 0.24, 0.4, 0.52, 0.68, 0.84, 1];
const DESKTOP = {
  zoom: [0.64, 1, 1, 1, 1.02, 1.02, 0.78, 0.7],
  x: [0, 0, 0.15, 0.15, -0.15, -0.15, 0, 0],
  y: [0.21, 0, 0, 0, 0, 0, -0.1, -0.12],
};
const MOBILE = {
  zoom: [0.92, 1.08, 1.08, 1.08, 1.1, 1.1, 0.96, 0.92],
  x: [0, 0, 0, 0, 0, 0, 0, 0],
  y: [0.17, -0.06, -0.12, -0.12, -0.12, -0.12, -0.14, -0.15],
};
const ease = (t: number) => t * t * (3 - 2 * t);
function sample(values: number[], p: number) {
  if (p <= KEYS[0]) return values[0];
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i]) {
      const t = (p - KEYS[i - 1]) / (KEYS[i] - KEYS[i - 1]);
      return values[i - 1] + (values[i] - values[i - 1]) * ease(t);
    }
  }
  return values[values.length - 1];
}

const STATES: [number, string][] = [
  [0.07, 'Assembled'],
  [0.45, 'Separating'],
  [0.7, 'Exploded view'],
  [0.95, 'Reassembling'],
  [1.01, 'Whole again'],
];

/* ------------------------------------------------------------------------ */

export default function HelianthusScroll() {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const counterRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<HTMLSpanElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const lenis = useLenis();

  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);

  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  // A light spring on top of Lenis: buttery on touch, imperceptible lag on wheel.
  const progress = useSpring(scrollYProgress, { stiffness: 300, damping: 45, mass: 0.35, restDelta: 0.0002 });

  /* ---- preload every frame before the story starts ---- */
  useEffect(() => {
    let cancelled = false;
    let count = 0;
    const started = performance.now();
    const frames: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
    framesRef.current = frames;
    const small = Math.min(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) <= 900;
    const done = () => {
      if (cancelled) return;
      count += 1;
      setLoaded(count);
      if (count === FRAME_COUNT) {
        // hold the loader for a beat so it never flashes
        const wait = Math.max(0, 900 - (performance.now() - started));
        setTimeout(() => !cancelled && setReady(true), wait);
      }
    };
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = 'async';
      // Count on `load`, not decode(): browsers defer decode() in background tabs,
      // which would leave the loader stuck. Decoding is warmed afterwards instead.
      img.onload = () => {
        frames[i] = img;
        img.decode().catch(() => {});
        done();
      };
      img.onerror = done;
      img.src = frameSrc(i, small);
    }
    return () => {
      cancelled = true;
    };
  }, []);

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

  /* ---- drawing ---- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { w, h, dpr } = sizeRef.current;
    if (!w) return;
    const p = Math.min(1, Math.max(0, progress.get()));
    const mobile = w < 768;
    const cam = mobile ? MOBILE : DESKTOP;

    const exact = p * (FRAME_COUNT - 1);
    const i0 = Math.floor(exact);
    const i1 = Math.min(FRAME_COUNT - 1, i0 + 1);
    const frac = exact - i0;
    const nearest = (i: number) => {
      const frames = framesRef.current;
      for (let d = 0; d < FRAME_COUNT; d++) {
        if (frames[i - d]) return frames[i - d];
        if (frames[i + d]) return frames[i + d];
      }
      return null;
    };
    const a = nearest(i0);
    const b = nearest(i1);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    if (!a) return;

    const fit = Math.min(w, h) * sample(cam.zoom, p);
    const x = (w - fit) / 2 + sample(cam.x, p) * w;
    const y = (h - fit) / 2 + sample(cam.y, p) * h;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 1;
    ctx.drawImage(a, x, y, fit, fit);
    if (b && b !== a && frac > 0.01) {
      ctx.globalAlpha = frac; // cross-dissolve between neighbours: no visible stepping
      ctx.drawImage(b, x, y, fit, fit);
      ctx.globalAlpha = 1;
    }
    // Feather the plate edges into the page so the frame boundary can never show.
    const f = fit * 0.07;
    const edges: [number, number, number, number, number, number, number, number][] = [
      [x, y, x, y + f, x, y, fit, f],
      [x, y + fit, x, y + fit - f, x, y + fit - f, fit, f],
      [x, y, x + f, y, x, y, f, fit],
      [x + fit, y, x + fit - f, y, x + fit - f, y, f, fit],
    ];
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of edges) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, PAPER);
      g.addColorStop(1, 'rgba(246,244,235,0)');
      ctx.fillStyle = g;
      ctx.fillRect(rx, ry, rw, rh);
    }
    // Studio light: a soft falloff behind the specimen, screened so it only ever brightens.
    const cx = x + fit / 2;
    const cy = y + fit * 0.45;
    const light = ctx.createRadialGradient(cx, cy, 0, cx, cy, fit * 0.62);
    light.addColorStop(0, 'rgba(255,253,244,0.2)');
    light.addColorStop(0.55, 'rgba(255,253,244,0.07)');
    light.addColorStop(1, 'rgba(255,253,244,0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    if (counterRef.current) counterRef.current.textContent = String(Math.round(exact) + 1).padStart(3, '0');
    if (stateRef.current) {
      const label = STATES.find(([limit]) => p < limit)?.[1] ?? '';
      if (stateRef.current.textContent !== label) stateRef.current.textContent = label;
    }
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (loaded === FRAME_COUNT || loaded % 12 === 0) draw();
  }, [loaded, draw]);

  const raf = useRef(0);
  useMotionValueEvent(progress, 'change', () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      draw();
    });
  });

  const hudBar = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const cueOpacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);

  return (
    <section ref={containerRef} id="top" aria-label="Introduction" className="relative h-[400vh]">
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="A sunflower drawn as a technical specimen. As you scroll, it separates into florets, disc, petals, bracts, stem and leaves, then reassembles."
        />

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
            kicker="Take it apart"
            title={
              <>
                Every product is <em>a system of parts.</em>
              </>
            }
            body="Research, flows, pixels and people. I like to take things apart to understand how they really work — and who they’re for."
          />
        </Beat>

        <Beat progress={scrollYProgress} range={[0.52, 0.68]} className="bottom-[7svh] left-5 right-5 md:bottom-auto md:left-auto md:right-[6vw] md:top-1/2 md:max-w-[min(30rem,34vw)] md:-translate-y-1/2">
          <BeatCopy
            n="1b"
            kicker="Look closer"
            title={
              <>
                Building for <em>consumer & enterprise.</em>
              </>
            }
            body="At Blinkit today. Before that, 0 → 1 work across quick commerce, supply chain, travel, agentic AI, healthcare, music & entertainment."
          />
        </Beat>

        <Beat progress={scrollYProgress} range={[0.86, 1]} last className="inset-x-0 bottom-[8svh] px-5 text-center md:bottom-[9svh]">
          <p className="eyebrow mb-4"><span className="text-blue">1c</span> — Put it back together</p>
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
            Scroll to take it apart
          </motion.div>
        </motion.div>

        {/* ---- Plate HUD ---- */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 bottom-4 hidden items-end justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted md:flex lg:inset-x-6 lg:bottom-6">
          <div className="space-y-1 pl-5 pb-4">
            <p className="text-ink/70">Fig. 01 — Helianthus annuus</p>
            <p>
              <span ref={stateRef}>Assembled</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 pr-5 pb-4">
            <p>
              <span ref={counterRef} className="tabular-nums text-ink/70">
                001
              </span>{' '}
              / {FRAME_COUNT}
            </p>
            <div className="h-px w-28 bg-ink/15">
              <motion.div style={{ scaleX: hudBar }} className="h-px origin-left bg-ink/70" />
            </div>
          </div>
        </div>
      </div>

      <Preloader loaded={loaded} total={FRAME_COUNT} ready={ready} />
      <style>{`@keyframes cue{0%{transform:translateY(0);opacity:0}30%{opacity:1}80%{transform:translateY(9px);opacity:0}100%{opacity:0}}`}</style>
    </section>
  );
}

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

function Preloader({ loaded, total, ready }: { loaded: number; total: number; ready: boolean }) {
  const pct = Math.round((loaded / total) * 100);
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          key="loader"
          role="status"
          aria-live="polite"
          aria-label={`Preparing the specimen, ${pct} percent`}
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
                  strokeDashoffset={c * (1 - Math.max(0.06, loaded / total))}
                  transform="rotate(-90 32 32)"
                />
              </svg>
              <SunflowerGlyph className="absolute inset-[22px] text-gold" />
            </div>
            <p className="mt-7 font-serif text-[28px] leading-none tracking-[-0.01em] text-ink">
              Preparing the <em className="text-blue">specimen</em>
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted tabular-nums">
              {String(loaded).padStart(3, '0')} / {total} frames · {pct}%
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
