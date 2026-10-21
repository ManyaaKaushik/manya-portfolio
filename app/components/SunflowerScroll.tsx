'use client';

import { AnimatePresence, motion, useMotionTemplate, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import { ArrowDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { caseStudies, testimonials } from '../lib/content';
import AsciiVideo from './AsciiVideo';
import DitherSky from './DitherSky';
import type { SunflowerScene } from './sunflower/scene';
import { STOPS } from './sunflower/stops';
import { scrollToId, useLenis } from './SmoothScroll';

const STATES: [number, string][] = [
  [0.1, 'Just opening'],
  [0.21, 'In full bloom'],
  [0.39, 'Bud I — the work'],
  [0.59, 'Bud II — kind words'],
  [0.78, 'A single ray — about'],
  [0.9, 'Facing the sun'],
  [1.01, 'Into the garden'],
];

/** If the intro clip can't play or stalls, the welcome screen still lifts after this long. */
const INTRO_MAX_MS = 11000;

export default function SunflowerScroll() {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SunflowerScene | null>(null);
  const bloomRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<HTMLSpanElement>(null);
  const lenis = useLenis();

  const [loaded, setLoaded] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const ready = sceneReady && introDone;
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
    const minWait = 600;

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
    const finish = () => {
      const wait = Math.max(0, minWait - (performance.now() - started));
      setTimeout(() => !cancelled && setSceneReady(true), wait);
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
        scene.onFrame = info => updateHud(info);
        scene.progress = progress.get();
        if (process.env.NODE_ENV === 'development') {
          // tweak panel for the flower; stripped from production builds
          const { mountDevPanel } = await import('./sunflower/devPanel');
          if (cancelled) return;
          disposePanel = mountDevPanel(scene);
        }
        await scene.warm();
        if (cancelled) return;
        setLoaded(1);
        io.observe(section);
        ro.observe(canvas);
        start();
        finish();
      } catch (err) {
        console.error('Sunflower failed to start', err);
        if (!cancelled) {
          setFailed(true);
          finish();
        }
      }
    })();

    const updateHud = (info: { bloom: number }) => {
      const p = progress.get();
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
  const cueOpacity = useTransform(scrollYProgress, [0, 0.04], [1, 0]);
  const reveal = useSpring(0, { stiffness: 60, damping: 20 });
  useEffect(() => {
    if (ready) reveal.set(1);
  }, [ready, reveal]);
  const canvasScale = useTransform(reveal, [0, 1], [1.06, 1]);

  // The outro: the whole plate dissolves while the Work section rises over it.
  const [o0, o1] = STOPS.outro;
  const plateOpacity = useTransform(scrollYProgress, [o0, o1 - 0.02], [1, 0]);
  const plateBlur = useTransform(scrollYProgress, [o0 + 0.02, o1], [0, 8]);
  const plateFilter = useMotionTemplate`blur(${plateBlur}px)`;

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToId(lenis, id);
  };

  return (
    <section ref={containerRef} id="top" aria-label="Introduction" className="relative h-[640vh]">
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <motion.div style={{ opacity: plateOpacity, filter: plateFilter }} className="absolute inset-0 bg-white">
          {/* a faint dithered sky over plain white */}
          <DitherSky className="pointer-events-none absolute inset-x-0 top-0 h-[70svh] w-full opacity-[0.16] [mask-image:linear-gradient(to_bottom,black_30%,transparent)]" />
          <motion.canvas
            ref={canvasRef}
            style={{ opacity: reveal, scale: canvasScale }}
            className={`absolute inset-0 h-full w-full ${failed ? 'hidden' : ''}`}
            role="img"
            aria-label="A 3D sunflower. As you scroll, its head opens, then the camera travels to a bud low on the stem, a second bud on the left, a single petal, and finally round to the back of the flower."
          />

          {/* corner registration marks — a printed plate */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-4 hidden md:block lg:inset-6">
            {['left-0 top-16 border-l border-t', 'right-0 top-16 border-r border-t', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map(c => (
              <span key={c} className={`absolute size-3 border-ink/25 ${c}`} />
            ))}
          </div>

          {/* ---- Arrival: the centre of the flower ---- */}
          <Beat progress={scrollYProgress} range={STOPS.hero} first ready={ready} className="inset-x-0 top-[12svh] px-5 text-center md:top-[13svh]">
            <RoleBadge />
            <h1 className="display font-serif text-[clamp(52px,8.4vw,128px)] leading-[0.92] tracking-[-0.03em] text-ink">
              Hey, I’m <em>Manya.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft md:text-[19px]">
              Building for <em className="font-serif text-[1.18em] text-blue">consumer &amp; enterprise.</em>
              <br />
              Before that, 0 → 1 work across quick commerce, supply chain, travel, agentic AI, healthcare, music &amp; entertainment.
            </p>
          </Beat>

          {/* ---- Bud I: work ---- */}
          <Beat progress={scrollYProgress} range={STOPS.work} className={PANEL_LEFT}>
            <StopPanel
              n="02"
              kicker="Selected work"
              title={
                <>
                  A practice <em>in full bloom.</em>
                </>
              }
              body="Three published case studies — and a few garden studies still growing."
              cta="See the work"
              onGo={go('work')}
              href="#work"
            >
              <ul className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
                {caseStudies.map(s => (
                  <li key={s.id} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="font-serif text-[22px] leading-tight text-ink">{s.name}</span>
                    <span className="text-right text-[12.5px] text-muted">{s.type}</span>
                  </li>
                ))}
              </ul>
            </StopPanel>
          </Beat>

          {/* ---- Bud II: kind words ---- */}
          <Beat progress={scrollYProgress} range={STOPS.words} className={PANEL_RIGHT}>
            <StopPanel
              n="05"
              kicker="Kind words"
              title={
                <>
                  Some seeds were <em>planted by others.</em>
                </>
              }
              cta="Read the notes"
              onGo={go('kind-words')}
              href="#kind-words"
            >
              <blockquote className="mt-5 border-l-2 border-gold pl-4 font-serif text-[21px] italic leading-[1.3] text-ink-soft">
                “{testimonials[1].quote}”
                <cite className="mt-2 block font-sans text-[13px] not-italic text-muted">
                  — {testimonials[1].name}, {testimonials[1].role}
                </cite>
              </blockquote>
            </StopPanel>
          </Beat>

          {/* ---- A single petal: about ---- */}
          <Beat progress={scrollYProgress} range={STOPS.about} className={PANEL_LEFT}>
            <StopPanel
              n="03"
              kicker="About"
              title={
                <>
                  A few pages <em>of being Manya.</em>
                </>
              }
              body="Designer, daydreamer, collector of little things. From Electronics to Interaction Design at NID — family stories, films that stay, and a notebook full of what-ifs."
              cta="Open the diary"
              onGo={go('about')}
              href="#about"
            />
          </Beat>

          {/* ---- The back of the flower ---- */}
          <Beat progress={scrollYProgress} range={STOPS.back} className={`${PANEL_LEFT} rounded-[22px] bg-paper/90 p-5 backdrop-blur-md md:bg-transparent md:p-0 md:backdrop-blur-none`}>
            <p className="eyebrow mb-4">
              <span className="text-blue">01</span> — Face the sun
            </p>
            <h2 className="display max-w-[16ch] font-serif text-[clamp(40px,5vw,76px)] leading-[0.98] tracking-[-0.025em]">
              Simpler. Clearer. <em>More human.</em>
            </h2>
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
              Scroll to wander the flower
            </motion.div>
          </motion.div>

          {/* ---- Plate HUD ---- */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 bottom-4 hidden items-end justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted md:flex lg:inset-x-6 lg:bottom-6">
            <div className="space-y-1 pb-4 pl-5">
              <p className="text-ink/70">Fig. 01 — Helianthus annuus</p>
              <p>
                <span ref={stateRef}>Just opening</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 pb-4 pr-5">
              <p>
                <span ref={bloomRef} className="tabular-nums text-ink/70">
                  Bloom 028%
                </span>
              </p>
              <div className="h-px w-28 bg-ink/15">
                <motion.div style={{ scaleX: hudBar }} className="h-px origin-left bg-ink/70" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <Welcome loaded={loaded} ready={ready} onDone={() => setIntroDone(true)} />
      <style>{`@keyframes cue{0%{transform:translateY(0);opacity:0}30%{opacity:1}80%{transform:translateY(9px);opacity:0}100%{opacity:0}}`}</style>
    </section>
  );
}

// Panels sit opposite the subject: the scene pushes the bud/petal to the other side of the frame.
const PANEL_LEFT = 'bottom-[5svh] left-4 right-4 md:bottom-auto md:left-[6vw] md:right-auto md:top-1/2 md:w-[min(30rem,36vw)] md:-translate-y-1/2';
const PANEL_RIGHT = 'bottom-[5svh] left-4 right-4 md:bottom-auto md:left-auto md:right-[6vw] md:top-1/2 md:w-[min(30rem,36vw)] md:-translate-y-1/2';

/* ------------------------------------------------------------------------ */
/*  Role badge: a live green status dot, after Framer's Activity Badge       */
/* ------------------------------------------------------------------------ */

function RoleBadge() {
  return (
    <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-paper-light/80 py-1.5 pl-3 pr-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft shadow-[0_6px_20px_-12px_rgb(28_35_51/0.3)] backdrop-blur">
      <ActivityDot />
      <span>Product Designer at</span>
      {/* the wordmark is yellow and green, so it sits on a dark chip to stay legible on the cream badge */}
      <span className="flex h-[22px] items-center rounded-full bg-ink px-2.5">
        <img src="/assets/blinkit.svg" alt="Blinkit" width={46} height={12} className="h-3 w-auto" />
      </span>
    </p>
  );
}

function ActivityDot() {
  return (
    <span className="relative inline-flex size-2" role="img" aria-label="Currently working here">
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[#31EE33]"
        animate={{ opacity: [0, 0.75, 0, 0], scale: [1, 1, 2.6, 1] }}
        transition={{ duration: 0.9, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4, times: [0, 0.02, 0.8, 1] }}
      />
      <span className="absolute inset-0 rounded-full bg-[#31EE33] shadow-[0_0_0_1px_rgb(20_120_30/0.25)]" />
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/*  Story beat overlay                                                       */
/* ------------------------------------------------------------------------ */

function Beat({
  progress,
  range: [a, b],
  first,
  ready = true,
  className = '',
  children,
}: {
  progress: MotionValue<number>;
  range: readonly [number, number];
  first?: boolean;
  ready?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const fade = 0.04;
  const input = first ? [0, b, b + fade] : [a - fade, a, b, b + fade];
  const opacity = useTransform(progress, input, first ? [1, 1, 0] : [0, 1, 1, 0]);
  const y = useTransform(progress, input, first ? [0, 0, -40] : [40, 0, 0, -40]);
  const blur = useTransform(progress, input, first ? [0, 0, 10] : [10, 0, 0, 10]);
  const filter = useMotionTemplate`blur(${blur}px)`;
  const pointerEvents = useTransform(opacity, v => (v > 0.6 ? 'auto' : 'none'));
  const visibility = useTransform(opacity, v => (v < 0.01 ? 'hidden' : 'visible'));

  return (
    <motion.div style={{ opacity, filter, pointerEvents, visibility }} className={`absolute z-10 ${className}`}>
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

function StopPanel({
  n,
  kicker,
  title,
  body,
  cta,
  href,
  onGo,
  children,
}: {
  n: string;
  kicker: string;
  title: React.ReactNode;
  body?: string;
  cta: string;
  href: string;
  onGo: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] bg-paper/95 p-5 shadow-[0_20px_50px_-30px_rgb(28_35_51/0.35)] backdrop-blur-md md:bg-paper/90 md:p-7">
      <p className="eyebrow mb-4 flex items-center gap-3">
        <span className="text-blue">{n}</span>
        <span className="h-px w-8 bg-line-strong" />
        {kicker}
      </p>
      <h2 className="display font-serif text-[clamp(32px,3.6vw,56px)] leading-[0.98] tracking-[-0.025em] text-ink">{title}</h2>
      {body && <p className="mt-4 max-w-[42ch] text-[15.5px] leading-[1.65] text-ink-soft md:text-[16.5px]">{body}</p>}
      {children}
      <a href={href} onClick={onGo} className="group mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-ink pl-5 pr-4 text-[14px] font-medium text-paper-light transition-colors duration-300 hover:bg-blue">
        {cta}
        <ArrowDown className="size-4 transition-transform duration-500 ease-out-expo group-hover:translate-y-0.5" strokeWidth={1.75} />
      </a>
    </div>
  );
}

/*  Welcome: the first screen, while the flower grows behind it             */
/* ------------------------------------------------------------------------ */

const ROLES = ['Designer,', 'Problem Solver,', 'Systems Thinker'];

function Welcome({ loaded, ready, onDone }: { loaded: number; ready: boolean; onDone: () => void }) {
  const pct = Math.round(loaded * 100);
  const doneRef = useRef(false);
  const done = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  // the clip sets the pace; a key or click skips it, and a timeout covers a stalled video
  useEffect(() => {
    const t = setTimeout(done, INTRO_MAX_MS);
    const skip = (e: KeyboardEvent) => ['Enter', ' ', 'Escape'].includes(e.key) && done();
    window.addEventListener('keydown', skip);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const word = (delay: number) => ({
    initial: { opacity: 0, y: '70%', filter: 'blur(10px)' },
    animate: { opacity: 1, y: '0%', filter: 'blur(0px)' },
    transition: { duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] as const },
  });
  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          key="welcome"
          role="status"
          aria-live="polite"
          aria-label={`Welcome to Manya’s Garden. Your friendly neighbourhood designer, problem solver, systems thinker. Loading, ${pct} percent.`}
          initial={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
          onClick={done}
          className="fixed inset-0 z-[70] overflow-hidden bg-white"
        >
          <motion.div
            exit={{ opacity: 0, y: -28 }}
            transition={{ duration: 0.5 }}
            className="relative h-full overflow-hidden"
          >
            {/* Manya, cut out of her video and redrawn in characters, floor to ceiling */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="absolute bottom-0 left-1/2 aspect-[3/2] h-[64svh] -translate-x-[60%] md:inset-y-0 md:left-auto md:right-0 md:h-full md:translate-x-0"
            >
              <AsciiVideo
                src="/assets/video/manya-ascii.mp4"
                label="Manya, drawn in blue ASCII characters, leans into frame, waves hello and gives two thumbs up."
                rows={92}
                endLead={0.4}
                onEnd={done}
                className="size-full"
              />
            </motion.div>
            {/* on phones the words sit over the top of the figure, so give them a little white */}
            <div
              className="relative z-10 flex h-full flex-col items-center justify-start bg-[linear-gradient(to_bottom,white_36%,transparent_48%)] px-6 pt-[13svh] text-center md:items-start md:justify-center md:bg-none md:px-[6vw] md:pt-0 md:text-left"
              aria-hidden="true"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                <span className="inline-block overflow-hidden align-bottom">
                  <motion.span {...word(0.2)} className="inline-block">
                    Welcome to
                  </motion.span>
                </span>
              </p>
              <h2 className="display mt-4 font-serif text-[clamp(52px,7.6vw,128px)] leading-[0.95] tracking-[-0.03em] text-ink">
                {['Manya’s', 'Garden'].map((w, i) => (
                  <span key={w} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
                    <motion.span {...word(0.45 + i * 0.16)} className="inline-block">
                      {i ? <em>&nbsp;{w}</em> : w}
                    </motion.span>
                  </span>
                ))}
              </h2>
              <p className="mt-6 max-w-[34ch] text-[16px] leading-relaxed text-ink-soft md:text-[19px]">
                <span className="inline-block overflow-hidden align-bottom">
                  <motion.span {...word(1.2)} className="inline-block">
                    Your Friendly Neighborhood
                  </motion.span>
                </span>{' '}
                {ROLES.map((r, i) => (
                  <span key={r} className="inline-block overflow-hidden align-bottom">
                    <motion.span {...word(1.6 + i * 0.3)} className="inline-block font-serif text-[1.2em] italic text-blue">
                      {r}&nbsp;
                    </motion.span>
                  </span>
                ))}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
