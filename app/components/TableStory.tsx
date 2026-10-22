'use client';

import Lenis from 'lenis';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { caseStudies, links, studies, testimonials, whatIfs } from '../lib/content';
import { Welcome } from './SunflowerScroll';
import { DAY_LENGTH, progressOf, type ChapterId } from './table/timeline';
import type { TableWorld } from './table/world';
import { SunflowerGlyph } from './ui';

/*
 * A day at Manya's table. The page is one long, looping scroll that drives a three.js scene (see
 * ./table); this component owns the scroll and the pointer, and draws what sits over the canvas:
 * the chapter dots, hints and toasts. The same content is in the document as text, for
 * screen readers and keyboards, and the classic site lives at /minimal.
 */

const CHAPTERS: { id: ChapterId; title: string; hint: string }[] = [
  { id: 'hero', title: 'Hello', hint: 'There’s a letter for you' },
  { id: 'work', title: 'Work', hint: 'Click a sheet to read the case study' },
  { id: 'journey', title: 'Journey', hint: 'Every step, stamped as it happened' },
  { id: 'play', title: 'Play', hint: 'Tap a packet to turn it · tap the slips for another “what if”' },
  { id: 'words', title: 'Kind words', hint: 'Notes from people I’ve worked with' },
  { id: 'contact', title: 'Contact', hint: 'Click a line on the postcard · draw on the pad' },
];

const HINT = { ...Object.fromEntries(CHAPTERS.map(c => [c.id, c.hint])), outro: 'Keep scrolling — the day starts again at dawn' } as Record<ChapterId, string>;

export default function TableStory() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<TableWorld | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [chapter, setChapter] = useState<ChapterId>('hero');
  const [night, setNight] = useState(false);
  const [moved, setMoved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ready = sceneReady && introDone;

  useEffect(() => {
    const canvas = canvasRef.current!;
    let world: TableWorld | null = null;
    let cancelled = false;
    let toastTimer = 0;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const lenis = new Lenis({ infinite: true, syncTouch: true, lerp: 0.085, wheelMultiplier: 0.85, touchMultiplier: 1.4, autoRaf: true });
    lenisRef.current = lenis;
    lenis.stop();
    const sync = () => {
      if (world) world.progress = lenis.limit > 0 ? lenis.scroll / lenis.limit : 0;
    };
    lenis.on('scroll', sync);

    (async () => {
      try {
        const [{ TableWorld }, { Hero }, { Work }, { Journey }, { Play }, { Words }, { Contact }, { Outro }, { fontsReady }, { Ladybug }] = await Promise.all([
          import('./table/world'),
          import('./table/chapters/hero'),
          import('./table/chapters/work'),
          import('./table/chapters/journey'),
          import('./table/chapters/play'),
          import('./table/chapters/words'),
          import('./table/chapters/contact'),
          import('./table/chapters/outro'),
          import('./table/paint'),
          import('./table/ladybug'),
        ]);
        if (cancelled) return;
        await fontsReady();
        if (cancelled) return;
        world = new TableWorld(canvas);
        worldRef.current = world;
        world.resize(window.innerWidth, window.innerHeight);
        for (const C of [Hero, Work, Journey, Play, Words, Contact, Outro]) world.add(new C());
        await world.build(f => setLoaded(f * 0.9));
        if (cancelled) return;
        world.life.push(new Ladybug(world));
        await world.warm();
        if (cancelled) return;
        setLoaded(1);
        sync();

        let lastChapter: ChapterId = 'hero';
        let lastNight = false;
        let lastMoved = false;
        // an unhurried glide, longer the further it goes, so the day visibly passes on the way
        world.goTo = (id, into = 0) => {
          const to = progressOf(id, into);
          const from = (((lenis.scroll / lenis.limit) % 1) + 1) % 1;
          const duration = Math.min(6.5, 2.6 + Math.abs(to - from) * 9);
          lenis.scrollTo(to * lenis.limit, { duration, easing: t => (1 - Math.cos(Math.PI * t)) / 2 });
        };
        world.open = href => {
          if (href.startsWith('mailto:')) window.location.href = href;
          else window.open(href, '_blank', 'noopener,noreferrer');
        };
        world.onToast = message => {
          setToast(message);
          clearTimeout(toastTimer);
          toastTimer = window.setTimeout(() => setToast(null), 2200);
        };
        world.onCursor = c => (canvas.style.cursor = c);
        world.onFrame = ({ hour, chapter: ch, progress }) => {
          const h = ((hour % 24) + 24) % 24;
          const isNight = h >= 19.6 || h < 6;
          if (ch !== lastChapter) setChapter((lastChapter = ch));
          if (isNight !== lastNight) setNight((lastNight = isNight));
          const m = progress > 0.004 && progress < 0.996;
          if (m !== lastMoved) setMoved((lastMoved = m));
        };
        world.start();
        if (process.env.NODE_ENV === 'development') (window as unknown as { __table: TableWorld }).__table = world;
        setSceneReady(true);
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed(true);
      }
    })();

    const resize = () => world?.resize(window.innerWidth, window.innerHeight);
    const move = (e: PointerEvent) => world?.pointerMove(e.clientX, e.clientY);
    let dragging = false;
    const down = (e: PointerEvent) => {
      if (world?.pointerDown(e.clientX, e.clientY) === 'drag') {
        // drawing: hold the page still and keep the pointer
        dragging = true;
        lenis.stop();
        canvas.setPointerCapture(e.pointerId);
      }
    };
    const up = (e: PointerEvent) => {
      if (e.type === 'pointercancel') world?.pointerCancel();
      else world?.pointerUp(e.clientX, e.clientY);
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      if (dragging) lenis.start();
      dragging = false;
    };
    // pointerdown comes first, so a finger that starts drawing doesn't also scroll the page
    const touch = (e: TouchEvent) => dragging && e.cancelable && e.preventDefault();
    const leave = () => world?.pointerLeave();
    const visibility = () => (document.hidden ? world?.stop() : world?.start());
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('touchstart', touch, { passive: false });
    canvas.addEventListener('touchmove', touch, { passive: false });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelled = true;
      clearTimeout(toastTimer);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('touchstart', touch);
      canvas.removeEventListener('touchmove', touch);
      document.removeEventListener('visibilitychange', visibility);
      lenis.destroy();
      lenisRef.current = null;
      world?.dispose();
      worldRef.current = null;
    };
  }, []);

  // the welcome screen holds the page still until both it and the table are ready
  useEffect(() => {
    if (ready) lenisRef.current?.start();
  }, [ready]);

  const go = (id: ChapterId) => worldRef.current?.goTo?.(id, id === 'hero' ? 0 : 0.02);
  // frosted glass: mostly the table showing through, softly blurred, with a hairline of light on top
  const glass = `pointer-events-auto rounded-full backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-700 ${
    night
      ? 'bg-ink/25 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12),0_8px_24px_-16px_rgb(0_0_0/0.5)]'
      : 'bg-white/35 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.55),0_8px_24px_-16px_rgb(28_35_51/0.25)]'
  }`;

  return (
    <>
      <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 z-0 block h-svh w-full touch-pan-y select-none" />
      <div aria-hidden="true" style={{ height: `${DAY_LENGTH * 100}svh` }} className="pointer-events-none relative" />

      <TextVersion />

      {failed ? (
        <Fallback />
      ) : (
        <div className="pointer-events-none fixed inset-0 z-20">
          <header className="flex items-start justify-between gap-3 p-4 md:p-6">
            <button type="button" onClick={() => go('hero')} aria-label="Manya — back to the morning" className={`${glass} group flex h-11 items-center gap-2 pl-2.5 pr-4`}>
              <SunflowerGlyph className="size-6 text-gold transition-transform duration-700 ease-out-expo group-hover:rotate-90" />
              <span className={`font-serif text-[24px] leading-none tracking-[-0.02em] transition-colors duration-700 ${night ? 'text-paper-light' : 'text-ink'}`}>manya</span>
            </button>
          </header>

          {/* chapters */}
          <nav aria-label="Chapters" className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
            <ul className={`${glass} flex h-11 items-center gap-0.5 px-1 max-sm:gap-0`}>
              {CHAPTERS.map((c, i) => {
                const on = chapter === c.id;
                return (
                  <li key={c.id}>
                    <button type="button" onClick={() => go(c.id)} aria-label={c.title} aria-current={on ? 'step' : undefined} className="group relative flex size-9 items-center justify-center rounded-full max-sm:size-[30px]">
                      {on && (
                        <motion.span
                          layoutId="table-chapter"
                          className={`absolute inset-1 rounded-full ${night ? 'bg-white/15' : 'bg-white/70 shadow-[0_1px_3px_rgb(28_35_51/0.08)]'}`}
                          transition={{ type: 'spring', stiffness: 260, damping: 32 }}
                        />
                      )}
                      <span
                        className={`relative font-mono text-[11px] tabular-nums transition-colors duration-300 ${
                          night ? (on ? 'text-paper-light' : 'text-paper-light/55 group-hover:text-paper-light') : on ? 'text-ink' : 'text-ink/45 group-hover:text-ink/80'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`pointer-events-none absolute bottom-full right-1/2 mb-3 translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] opacity-0 backdrop-blur-xl transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:hidden ${
                          night ? 'bg-ink/40 text-paper-light' : 'bg-white/60 text-ink-soft shadow-[inset_0_0_0_1px_rgb(255_255_255/0.6)]'
                        }`}
                      >
                        {c.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* a hint for whatever is on the table */}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-[76px] flex justify-center px-4 md:bottom-[30px]">
            <AnimatePresence mode="wait">
              {ready && (
                <motion.p
                  key={!moved ? 'start' : chapter}
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
                  transition={{ duration: 0.45 }}
                  className={`flex max-w-[calc(100vw-32px)] items-center gap-2.5 rounded-full px-4 py-2 text-center font-mono text-[10.5px] uppercase leading-snug tracking-[0.13em] backdrop-blur-2xl backdrop-saturate-150 transition-colors duration-700 md:max-w-[min(520px,calc(100vw-560px))] ${night ? 'bg-ink/25 text-paper-light' : 'bg-white/35 text-ink-soft shadow-[inset_0_0_0_1px_rgb(255_255_255/0.55)]'}`}
                >
                  {!moved && (
                    <span className="relative flex h-6 w-[15px] shrink-0 justify-center rounded-full border border-current opacity-70">
                      <span className="mt-1 h-1.5 w-[2px] animate-[cue_1.8s_ease-out_infinite] rounded-full bg-current" />
                    </span>
                  )}
                  {!moved ? 'Scroll to start the day' : HINT[chapter]}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute inset-x-0 top-20 flex justify-center px-4" role="status" aria-live="polite">
            <AnimatePresence>
              {toast && (
                <motion.p
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`rounded-full px-4 py-2 text-[14px] font-medium backdrop-blur-2xl backdrop-saturate-150 ${night ? 'bg-ink/30 text-paper-light' : 'bg-white/45 text-ink shadow-[inset_0_0_0_1px_rgb(255_255_255/0.6),0_8px_24px_-16px_rgb(28_35_51/0.25)]'}`}
                >
                  {toast}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {!failed && <Welcome loaded={loaded} ready={ready} onDone={() => setIntroDone(true)} />}
    </>
  );
}

/* ------------------------------------------------------------------------ */

/** Everything on the table as a document, for screen readers, search engines and keyboards. */
function TextVersion() {
  const focusable = 'focus:not-sr-only focus:fixed focus:left-4 focus:top-20 focus:z-[90] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper-light';
  return (
    <div className="sr-only">
      <a href="/minimal/" className={focusable}>
        Skip to the minimal portfolio
      </a>
      <h1>Manya Kaushik — product designer at Blinkit</h1>
      <p>A day at Manya’s table: a sealed letter, pressed case studies, a library card, seed packets, notes from friends and a postcard, laid out from morning chai to lamplight.</p>
      <section aria-labelledby="t-hello">
        <h2 id="t-hello">Hey, I’m Manya.</h2>
        <p>
          Product designer at Blinkit, building for consumer &amp; enterprise. Before that, 0 → 1 work across quick commerce, supply chain, travel, agentic AI, healthcare, music &amp;
          entertainment.
        </p>
        <p>I design for the small frictions — the clicks, pauses and glances in between — and I’d like technology to feel as familiar as a conversation with Grandma.</p>
      </section>
      <section aria-labelledby="t-work">
        <h2 id="t-work">Selected work</h2>
        <ul>
          {caseStudies.map(s => (
            <li key={s.id}>
              <h3>{s.name}</h3>
              <p>
                {s.type}. {s.description}
              </p>
              <a href={s.url} className={focusable}>
                Read the case study: {s.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="t-play">
        <h2 id="t-play">Play</h2>
        <ul>
          {studies.map(s => (
            <li key={s.id}>
              {s.name} — {s.type}. {s.description}
            </li>
          ))}
        </ul>
        <ul>
          {whatIfs.map(q => (
            <li key={q}>{q}</li>
          ))}
        </ul>
        <a href={links.playground} className={focusable}>
          More playful things
        </a>
      </section>
      <section aria-labelledby="t-words">
        <h2 id="t-words">Kind words</h2>
        {testimonials.map(t => (
          <figure key={t.name}>
            <blockquote>{t.quote}</blockquote>
            <figcaption>
              {t.name}, {t.role}
            </figcaption>
          </figure>
        ))}
      </section>
      <section aria-labelledby="t-contact">
        <h2 id="t-contact">Let’s grow something good.</h2>
        <ul>
          <li>
            <a href={links.email} className={focusable}>
              Email {links.emailAddress}
            </a>
          </li>
          <li>
            <a href={links.linkedin} className={focusable}>
              LinkedIn
            </a>
          </li>
          <li>
            <a href={links.resume} className={focusable}>
              Résumé
            </a>
          </li>
          <li>
            <a href={links.medium} className={focusable}>
              Medium
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}

function Fallback() {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-paper p-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">The table couldn’t be laid</p>
        <h2 className="mt-4 font-serif text-[44px] leading-[1] tracking-[-0.02em]">
          Hey, I’m <em className="text-blue">Manya.</em>
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">This page draws a 3D table, and your browser couldn’t start it. Everything is in the minimal version too.</p>
        <a href="/minimal/" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-paper-light">
          Open the minimal portfolio <ArrowUpRight className="size-4" strokeWidth={1.75} />
        </a>
      </div>
    </div>
  );
}
