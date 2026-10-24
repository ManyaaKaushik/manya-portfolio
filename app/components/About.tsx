'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DiaryBook } from './diary/book';
import { MaskHeading, Reveal, SectionLabel } from './ui';

/*
 * About: a scrapbook diary you can pick up and leaf through. The pages are ordinary markup,
 * laid out off screen and printed onto the paper of a three.js book (./diary/book), whose
 * leaves bend as they turn. Photos that haven't been added yet fall back to a dashed paper
 * slot with their caption, so the diary never shows a broken image.
 */

const D = '/assets/diary';

export default function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative mt-36 overflow-hidden bg-[#e8edf2] md:mt-48">
      <div className="hairline-x" />
      <div className="mx-auto max-w-[1360px] px-5 pb-24 pt-24 md:px-10 md:pb-32 md:pt-32">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <SectionLabel n="03">About</SectionLabel>
            <MaskHeading id="about-title" className="mt-6 text-[clamp(40px,4.6vw,72px)] leading-[0.96]">
              <>A few pages</>
              <em>of being Manya.</em>
            </MaskHeading>
          </div>
          <Reveal delay={0.1} className="md:col-span-4 md:col-start-9">
            <p className="text-[17px] leading-[1.65] text-ink-soft">Open the diary — drag a page across, click either side, or use the arrows.</p>
          </Reveal>
        </div>
        <Diary />
      </div>
      <div className="hairline-x" />
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/*  The book                                                                 */
/* ------------------------------------------------------------------------ */

// one page, in CSS px: the markup is laid out at this size and printed onto the 3D paper
const PAGE_W = 460;
const PAGE_H = 620;
// a leaf is two pages; `spread` counts leaves turned (0 = closed on the cover)
const leafCount = () => Math.ceil(PAGES.length / 2);

function spreadTitle(s: number) {
  if (s === 0) return PAGES[0].title;
  if (s >= leafCount()) return PAGES[PAGES.length - 1].title;
  return PAGES[2 * s]?.title ?? PAGES[2 * s - 1].title;
}

function Diary() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<DiaryBook | null>(null);
  const [spread, setSpread] = useState(0);
  const [armed, setArmed] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // build the book (three.js + the page printer) only once the section is about a screen away
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setArmed(true);
        io.disconnect();
      },
      { rootMargin: '100% 0px' },
    );
    io.observe(wrapRef.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!armed) return;
    let cancelled = false;
    let frame = 0;
    let visible = true;
    let book: DiaryBook | null = null;
    const canvas = canvasRef.current!;

    const loop = () => {
      frame = 0;
      if (!book || !visible || document.hidden) return;
      book.tick();
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!frame && book && visible && !document.hidden) {
        book.resetClock();
        frame = requestAnimationFrame(loop);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
    });
    const ro = new ResizeObserver(() => book?.resize(canvas.clientWidth, canvas.clientHeight));
    const onVis = () => start();

    (async () => {
      try {
        const [{ DiaryBook }, printer] = await Promise.all([import('./diary/book'), import('html-to-image')]);
        if (cancelled) return;
        book = new DiaryBook(canvas, PAGES, PAGE_H / PAGE_W);
        bookRef.current = book;
        book.onChange = setSpread;
        book.resize(canvas.clientWidth, canvas.clientHeight);
        await book.warm();
        if (cancelled) return;
        ro.observe(canvas);
        io.observe(canvas);
        document.addEventListener('visibilitychange', onVis);
        start();
        setReady(true);

        // print the pages onto the paper, cover first, without hogging the main thread
        await document.fonts.ready;
        const host = printRef.current!;
        const nodes = Array.from(host.children) as HTMLElement[];
        await Promise.all(
          Array.from(host.querySelectorAll('img')).map(img => {
            // off screen, so lazy images would never start
            img.loading = 'eager';
            return
            img.decode().catch(() => img.closest('[data-photo]')?.classList.add('is-missing'));
          }),
        );
        const fontEmbedCSS = await printer.getFontEmbedCSS(host);
        const pixelRatio = Math.min(2, Math.max(1.4, devicePixelRatio || 1));
        for (let i = 0; i < nodes.length; i++) {
          if (cancelled) return;
          const sheet = await printer.toCanvas(nodes[i], {
            width: PAGE_W,
            height: PAGE_H,
            pixelRatio,
            fontEmbedCSS,
            cacheBust: false,
            backgroundColor: PAGES[i].hard ? '#2f4c8f' : '#fbf8f0',
          });
          if (cancelled) return;
          book.setPage(i, sheet);
          await new Promise(r => setTimeout(r, 0));
        }
      } catch (err) {
        console.error('Diary failed to start', err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      book?.dispose();
      bookRef.current = null;
    };
  }, [armed]);

  const go = (d: 1 | -1) => {
    if (failed) setSpread(s => Math.min(leafCount(), Math.max(0, s + d)));
    else if (d === 1) bookRef.current?.next();
    else bookRef.current?.prev();
  };
  // keyboard: arrows turn pages while the book is focused
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  };

  const label = spreadTitle(spread);
  const showing = [2 * spread - 1, 2 * spread].filter(i => i >= 0 && i < PAGES.length);

  return (
    <div ref={wrapRef} className="mt-14 md:mt-16">
      <div
        tabIndex={0}
        onKeyDown={onKey}
        role="group"
        aria-roledescription="diary"
        aria-label={`Manya’s diary, ${label}. Use the left and right arrow keys to turn pages.`}
        className="relative mx-auto max-w-[1180px] outline-none focus-visible:rounded-[28px] focus-visible:ring-2 focus-visible:ring-blue/50"
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`block aspect-[4/5] max-h-[80svh] w-full touch-pan-y md:aspect-[16/10] transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'} ${failed ? 'hidden' : ''}`}
        />
        {failed && <FlatSpread pages={showing} />}
        {/* what's on the open pages, for screen readers */}
        <div className="sr-only" aria-live="polite">
          {showing.map(i => (
            <div key={PAGES[i].id}>{PAGES[i].body}</div>
          ))}
        </div>
      </div>

      {/* the page name sits under the book on a fixed-height line, the arrows below it, so a longer
          name never nudges anything */}
      <div className="relative z-10 -mt-6 flex flex-col items-center gap-4 md:-mt-14">
        <p className="h-[26px] max-w-full truncate px-4 text-center font-hand text-[22px] leading-[26px] text-ink-soft" aria-hidden="true">
          {label}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={spread === 0}
            aria-label="Previous page"
            className="flex size-11 items-center justify-center rounded-full bg-[#f8f6ef] text-ink shadow-[0_6px_18px_-8px_rgb(36_58_86/0.4)] transition-[opacity,transform] hover:-translate-x-0.5 disabled:opacity-30"
          >
            <ChevronLeft className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={spread >= leafCount()}
            aria-label="Next page"
            className="flex size-11 items-center justify-center rounded-full bg-[#f8f6ef] text-ink shadow-[0_6px_18px_-8px_rgb(36_58_86/0.4)] transition-[opacity,transform] hover:translate-x-0.5 disabled:opacity-30"
          >
            <ChevronRight className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* the printing plates: every page laid out at full size, off screen, then photographed onto the paper */}
      {armed && !failed && (
        <div ref={printRef} aria-hidden="true" inert className="pointer-events-none fixed left-[-200vw] top-0">
          {PAGES.map(p => (
            <PageFace key={p.id} page={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageFace({ page, className = '' }: { page: Page; className?: string }) {
  return (
    <div className={`diary-page ${page.hard ? 'diary-hard' : ''} ${className}`} style={className ? undefined : { width: PAGE_W, height: PAGE_H }}>
      <div className="diary-sheet">{page.body}</div>
    </div>
  );
}

/** Without WebGL: the open pages, flat, side by side. */
function FlatSpread({ pages }: { pages: number[] }) {
  return (
    <div className="mx-auto flex max-w-[920px] justify-center shadow-[0_30px_60px_-30px_rgb(36_58_86/0.45)]">
      {pages.map(i => (
        <PageFace key={PAGES[i].id} page={PAGES[i]} className="relative aspect-[460/620] w-1/2" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*  Scrapbook pieces                                                         */
/* ------------------------------------------------------------------------ */

function Photo({ src, caption, rotate = 0, className = '', ratio = '4/5' }: { src: string; caption?: string; rotate?: number; className?: string; ratio?: string }) {
  return (
    <figure data-photo className={`polaroid ${className}`} style={{ rotate: `${rotate}deg` }}>
      <div className="polaroid-img" style={{ aspectRatio: ratio }}>
        <img src={src} alt={caption ?? ''} loading="lazy" draggable={false} />
        <span className="polaroid-missing">photo to come</span>
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Sticker({ children, tone = 'butter', rotate = 0, className = '' }: { children: React.ReactNode; tone?: 'butter' | 'lilac' | 'mint' | 'rose' | 'blue'; rotate?: number; className?: string }) {
  return (
    <span className={`sticker sticker-${tone} ${className}`} style={{ rotate: `${rotate}deg` }}>
      {children}
    </span>
  );
}

function Tape({ className = '', rotate = -4 }: { className?: string; rotate?: number }) {
  return <span aria-hidden="true" className={`tape ${className}`} style={{ rotate: `${rotate}deg` }} />;
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="diary-kicker">{children}</p>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <h3 className="diary-title">{children}</h3>;
}

function Note({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`diary-note ${className}`}>{children}</p>;
}

/* ------------------------------------------------------------------------ */
/*  Pages: one idea each                                                     */
/* ------------------------------------------------------------------------ */

const JOURNEY = [
  { when: 'as a kid', what: 'Art Attack, religiously', note: 'where glue and glitter began' },
  { when: '2020', what: 'B.Sc. Electronics', note: 'Sri Venkateswara College, DU' },
  { when: '2021', what: 'Co-founded Boolean', note: 'the college’s first tech club' },
  { when: '2022', what: 'UI/UX intern', note: 'IIT Bombay' },
  { when: '2023', what: 'UX design intern', note: 'IIT Delhi' },
  { when: '2024', what: 'M.Des Interaction Design', note: 'NID Bengaluru' },
  { when: '2025', what: 'Product design intern', note: 'Celebto' },
  { when: 'now', what: 'Product Designer', note: 'Blinkit' },
];

const LOVES = ['Interstellar', 'Fleabag', 'Inside Out', 'Soul', 'Spider-Man', 'Bridgerton', 'Attack on Titan', 'Business Proposal'];

const BRING = [
  'User experience design',
  'Design systems',
  'User research',
  'Data-driven design',
  'Visual design',
  'Strategic thinking',
  'AI thinking',
  'Collaboration & communication',
  'Adaptability',
];

const READS = [
  { title: 'Hooked', by: 'Nir Eyal', tone: '#f2c230', ink: '#1c2333' },
  { title: 'Creative Confidence', by: 'Tom & David Kelley', tone: '#e9f2ec', ink: '#2c7a5a' },
  { title: 'The Lion, the Witch and the Wardrobe', by: 'C. S. Lewis', tone: '#2e3f6e', ink: '#f3e9cf' },
];

type Page = { id: string; title: string; hard?: boolean; body: React.ReactNode };

const PAGES: Page[] = [
  {
    id: 'cover',
    title: 'The cover',
    hard: true,
    body: (
      <div className="diary-cover">
        <p className="diary-cover-label">vol. 01 — notes &amp; keepsakes</p>
        <h3 className="diary-cover-title">
          A few pages
          <br />
          <em>of being Manya</em>
        </h3>
        <figure data-photo className="diary-kid">
          <img src={`${D}/kid.webp`} alt="Manya as a little girl, hands on her hips" loading="lazy" draggable={false} />
          <span className="polaroid-missing">little Manya</span>
        </figure>
        <div className="diary-cover-tag">
          <Sticker tone="butter" rotate={-3}>
            Journey of this <b>sunflower</b>
          </Sticker>
          <span className="diary-hand mt-[1.5cqw] block text-[4.6cqw] text-[#f3ecd8]/85">(who followed Art Attack religiously as a kid)</span>
        </div>
      </div>
    ),
  },
  {
    id: 'endpaper',
    title: 'This diary belongs to…',
    body: (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="diary-hand text-[6.4cqw] text-ink-soft">this diary belongs to</p>
        <p className="mt-[2cqw] font-serif text-[11cqw] leading-none text-ink">Manya Kaushik</p>
        <div className="relative mt-[7cqw] w-[86%]">
          <Tape className="left-[38%] top-[-2.5cqw]" rotate={2} />
          <figure className="polaroid pb-[3%]" style={{ rotate: '-1.5deg' }}>
            <img src={`${D}/snapshots.webp`} alt="Four snapshots: presenting to a room, sketching at a table, showing an app, and talking with a group" className="block w-full" loading="lazy" draggable={false} />
          </figure>
        </div>
        <div className="mt-[6cqw] flex flex-wrap justify-center gap-[2.4cqw]">
          <Sticker tone="rose" rotate={-3}>
            Rooted in empathy
          </Sticker>
          <Sticker tone="mint" rotate={2}>
            Nerd for details
          </Sticker>
          <Sticker tone="lilac" rotate={-1}>
            Eternally curious being
          </Sticker>
        </div>
        <p className="diary-hand mt-[8cqw] text-[5cqw] text-muted">if found, please return to the garden ✿</p>
      </div>
    ),
  },
  {
    id: 'journey',
    title: 'Journey into design',
    body: (
      <>
        <Kicker>p. 01 — how it started</Kicker>
        <Title>
          Journey into <em>design</em>
        </Title>
        <ol className="diary-timeline">
          {JOURNEY.map((j, i) => (
            <li key={j.what} className={i === JOURNEY.length - 1 ? 'is-now' : ''}>
              <span className="diary-hand">{j.when}</span>
              <p>
                <b>{j.what}</b> <span>{j.note}</span>
              </p>
            </li>
          ))}
        </ol>
        <Sticker tone="blue" rotate={4} className="absolute bottom-[7cqw] right-[7cqw]">
          systems + empathy
        </Sticker>
      </>
    ),
  },
  {
    id: 'grandma',
    title: 'The grandma page',
    body: (
      <>
        <Kicker>p. 02 — my favourite kind of connection</Kicker>
        <Title>
          The <em>grandma</em> page
        </Title>
        <div className="relative mx-auto mt-[6cqw] w-[82%]">
          <Tape className="left-[38%] top-[-2.5cqw]" />
          <Photo src="/assets/family-together.webp" caption="bringing worlds together." rotate={-2} ratio="4/3" />
        </div>
        <Note className="mt-[7cqw]">
          Ask my Grandma and she’ll say I taught her to shop on Amazon. Ask my Mom — I unlocked the Smart TV’s magic.
        </Note>
        <Sticker tone="rose" rotate={-5} className="absolute bottom-[7cqw] right-[6cqw]">
          small frictions, human possibilities
        </Sticker>
      </>
    ),
  },
  {
    id: 'community',
    title: 'Community & initiatives',
    body: (
      <>
        <Kicker>p. 03 — giving back</Kicker>
        <Title>
          Community <em>&amp; initiatives</em>
        </Title>
        <ul className="diary-list">
          <li>
            Ran an intro UX &amp; Figma workshop — the file went on to be used by <b>230+ learners</b>.
          </li>
          <li>
            Co-founded my college’s <b>first tech club</b>, to bridge skill and opportunity gaps.
          </li>
        </ul>
        <div className="mt-[9cqw] flex items-end justify-center gap-[6cqw]">
          <div className="text-center" style={{ rotate: '-3deg' }}>
            <p className="font-serif text-[20cqw] leading-none text-blue">230+</p>
            <p className="diary-hand text-[5.2cqw] text-ink-soft">learners used the file</p>
          </div>
          <div className="text-center" style={{ rotate: '2deg' }}>
            <p className="font-serif text-[20cqw] leading-none text-[#c98f27]">1st</p>
            <p className="diary-hand text-[5.2cqw] text-ink-soft">tech club, co-founded</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'travels',
    title: 'Work that travels',
    body: (
      <>
        <Kicker>p. 04 — out in the world</Kicker>
        <Title>
          Work that <em>travels</em>
        </Title>
        <Note>Personal projects I shared found their way to the people behind the products.</Note>
        <blockquote className="diary-post">
          <p className="diary-post-head">
            <span className="diary-post-avatar bg-[#7c5cd6]">F</span>
            <b>Finch</b>
          </p>
          <p>“This is such a sweet review! I’m so glad our app has been able to help you on your journey friend. Thank you so much for sharing! It means the world to our small team 💜”</p>
        </blockquote>
        <div className="mt-[5cqw] flex flex-wrap items-center gap-[2.5cqw]">
          <span className="diary-hand text-[5.4cqw] text-ink-soft">also noticed by</span>
          <Sticker tone="mint" rotate={-2}>
            Chris Hulls
          </Sticker>
        </div>
      </>
    ),
  },
  {
    id: 'reads',
    title: 'Favourite reads',
    body: (
      <>
        <Kicker>p. 05 — on my nightstand</Kicker>
        <Title>
          Favourite <em>reads</em>
        </Title>
        <div className="mt-[6cqw] flex items-end justify-center gap-[3cqw]">
          {READS.map((b, i) => (
            <div key={b.title} className="diary-book" style={{ background: b.tone, color: b.ink, rotate: `${[-5, 2, 6][i]}deg` }}>
              <span className="diary-book-title">{b.title}</span>
              <span className="diary-book-by">{b.by}</span>
            </div>
          ))}
        </div>
        <ul className="diary-list mt-[7cqw]">
          <li>
            <b>Lessons of design</b> — Fabricio Teixeira, UX Collective
          </li>
          <li>
            <b>The Download</b> — MIT Technology Review’s newsletter
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'loves',
    title: 'Who am I without the things I love?',
    body: (
      <>
        <Kicker>p. 06 — off the clock</Kicker>
        <Title>
          Who am I without <em>the things I love?</em>
        </Title>
        <Note>
          Beyond design, I can be found binge-watching <b className="text-[#b3261e]">Stranger Things</b>, or —
        </Note>
        <div className="relative mt-[7cqw]">
          <Tape className="left-[8%] top-[-2.5cqw]" rotate={-6} />
          <Tape className="right-[8%] top-[-2.5cqw]" rotate={5} />
          <img
            src={`${D}/loves-strip.webp`}
            alt="Polaroids of Manya creating content, travelling, dancing and playing the ukulele"
            className="block w-full rounded-[1cqw] shadow-[0_1.4cqw_3cqw_-1.6cqw_rgb(40_36_20/0.4)]"
            style={{ rotate: '-1deg' }}
            loading="lazy"
            draggable={false}
          />
        </div>
        <div className="mt-[6cqw] flex flex-wrap gap-[2.2cqw]">
          <Sticker tone="butter" rotate={-2}>
            creating content
          </Sticker>
          <Sticker tone="mint" rotate={2}>
            travelling
          </Sticker>
          <Sticker tone="rose" rotate={-1}>
            dancing
          </Sticker>
          <Sticker tone="lilac" rotate={3}>
            ukulele
          </Sticker>
        </div>
      </>
    ),
  },
  {
    id: 'games',
    title: 'Films, shows & games',
    body: (
      <>
        <Kicker>p. 07 — the watchlist</Kicker>
        <Title>
          Films, shows <em>&amp; games</em>
        </Title>
        <div className="mt-[5cqw] flex flex-wrap gap-[2.2cqw]">
          {LOVES.map((l, i) => (
            <Sticker key={l} tone={(['butter', 'lilac', 'mint', 'rose', 'blue'] as const)[i % 5]} rotate={[-3, 2, -1, 3, -2][i % 5]}>
              {l}
            </Sticker>
          ))}
        </div>
        <p className="diary-hand mt-[7cqw] text-[5.6cqw] text-ink-soft">games I play &amp; where I drop reviews —</p>
        <div className="mt-[3cqw] flex flex-wrap items-center gap-[4cqw]">
          <img src={`${D}/gravity-falls.webp`} alt="Gravity Falls" className="h-[13cqw] w-auto drop-shadow-[0_1cqw_1.4cqw_rgb(40_36_20/0.35)]" loading="lazy" draggable={false} />
          <img src="/assets/tiny-glade.webp" alt="Tiny Glade" className="diary-app" loading="lazy" draggable={false} />
          <img src="/assets/letterboxd.webp" alt="Letterboxd" className="diary-app" loading="lazy" draggable={false} />
          <Sticker tone="rose" rotate={-4}>
            It Takes Two
          </Sticker>
        </div>
      </>
    ),
  },
  {
    id: 'bring',
    title: 'What I can bring',
    body: (
      <>
        <Kicker>p. 08 — to your team</Kicker>
        <Title>
          What I <em>can bring</em>
        </Title>
        <Note>Designing for small frictions — clicks, pauses, and glances in between.</Note>
        <div className="relative mx-auto mt-[4cqw] w-[56%]">
          <Tape className="left-[34%] top-[-2.5cqw]" rotate={3} />
          <Photo src={`${D}/bring.jpg`} rotate={1.5} ratio="1/1" />
        </div>
        <div className="mt-[4cqw] flex flex-wrap justify-center gap-[1.8cqw]">
          {BRING.map(b => (
            <span key={b} className="diary-chip">
              {b}
            </span>
          ))}
        </div>
      </>
    ),
  },
  {
    // inside of the back cover: keeps the page count even, so the back cover closes the book
    id: 'endpaper-back',
    title: 'To be continued…',
    body: (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="diary-hand text-[7cqw] text-ink-soft">to be continued…</p>
        <p className="mt-[3cqw] text-[6cqw] text-[#c98f27]" aria-hidden="true">
          ✿
        </p>
      </div>
    ),
  },
  {
    id: 'back',
    title: 'So many more miles to cover…',
    hard: true,
    body: (
      <div className="diary-cover items-center justify-center text-center">
        <figure data-photo className="polaroid w-[62%]" style={{ rotate: '-2deg' }}>
          <div className="polaroid-img" style={{ aspectRatio: '1/1' }}>
            <img src={`${D}/back-cover.jpg`} alt="Little Manya at the steering wheel" loading="lazy" draggable={false} />
            <span className="polaroid-missing">photo to come</span>
          </div>
        </figure>
        <p className="mt-[8cqw] font-serif text-[8.6cqw] leading-[1.05] text-[#f3ecd8]">
          So many more <em>miles to cover…</em>
        </p>
      </div>
    ),
  },
];
