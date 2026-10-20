'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MaskHeading, Reveal, SectionLabel } from './ui';

/*
 * About: a scrapbook diary whose pages turn like paper. The pages are ordinary markup
 * rendered once into a hidden template; page-flip works on clones of them, so it can move
 * and fold the DOM freely without fighting React. Photos that haven't been added yet fall
 * back to a dashed paper slot with their caption, so the diary never shows a broken image.
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
            <p className="text-[17px] leading-[1.65] text-ink-soft">Open the diary — drag a page corner, click a page, or use the arrows.</p>
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

type Flip = import('page-flip/dist/js/page-flip.module.js').PageFlip;

function Diary() {
  const templateRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<Flip | null>(null);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(PAGES.length);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let host: HTMLDivElement | null = null;
    (async () => {
      const { PageFlip } = await import('page-flip/dist/js/page-flip.module.js');
      if (cancelled || !stageRef.current || !templateRef.current) return;
      // page-flip removes its root on destroy, so give it one React doesn't own
      host = document.createElement('div');
      stageRef.current.appendChild(host);
      const pages = Array.from(templateRef.current.children).map(n => n.cloneNode(true) as HTMLElement);
      pages.forEach(p => {
        host!.appendChild(p);
        p.querySelectorAll('img').forEach(img => {
          // load every page up front so a turning page never flashes an empty frame
          img.loading = 'eager';
          const miss = () => img.closest('[data-photo]')?.classList.add('is-missing');
          if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) miss();
          img.addEventListener('error', miss, { once: true });
        });
      });
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      // the whole spread should fit on screen with the arrows below it
      const maxHeight = Math.round(Math.min(720, Math.max(420, innerHeight - 190)));
      const maxWidth = Math.round((maxHeight * 460) / 620);
      stageRef.current.style.maxWidth = `${maxWidth * 2}px`;
      const flip = new PageFlip(host, {
        width: 460,
        height: 620,
        size: 'stretch',
        minWidth: 280,
        maxWidth,
        minHeight: 380,
        maxHeight,
        showCover: true,
        usePortrait: true,
        autoSize: true,
        drawShadow: true,
        maxShadowOpacity: 0.45,
        flippingTime: reduced ? 1 : 1000,
        mobileScrollSupport: true,
        clickEventForward: true,
        showPageCorners: true,
        swipeDistance: 30,
      });
      flip.loadFromHTML(pages);
      flipRef.current = flip;
      setCount(flip.getPageCount());
      setPortrait(flip.getOrientation() === 'portrait');
      flip.on('flip', e => setPage(e.data as number));
      flip.on('changeOrientation', e => setPortrait(e.data === 'portrait'));
    })();
    return () => {
      cancelled = true;
      flipRef.current?.destroy();
      flipRef.current = null;
      host?.remove();
    };
  }, []);

  // keyboard: arrows turn pages while the book is focused
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') flipRef.current?.flipNext();
    if (e.key === 'ArrowLeft') flipRef.current?.flipPrev();
  };

  const atStart = page === 0;
  const atEnd = portrait ? page >= count - 1 : page >= count - 2;
  const label = PAGES[page]?.title ?? '';

  return (
    <div className="mt-14 md:mt-16">
      <div
        tabIndex={0}
        onKeyDown={onKey}
        role="group"
        aria-roledescription="diary"
        aria-label={`Manya’s diary, ${label}. Use the left and right arrow keys to turn pages.`}
        className="relative mx-auto max-w-[1120px] outline-none"
      >
        {/* soft desk shadow under the book */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8%] bottom-[-3%] h-[10%] rounded-[50%] bg-[#243a56]/20 blur-2xl" />
        <div ref={stageRef} className="diary-stage relative mx-auto" />
      </div>

      <div className="mt-8 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => flipRef.current?.flipPrev()}
          disabled={atStart}
          aria-label="Previous page"
          className="flex size-11 items-center justify-center rounded-full bg-[#f8f6ef] text-ink shadow-[0_6px_18px_-8px_rgb(36_58_86/0.4)] transition-[opacity,transform] hover:-translate-x-0.5 disabled:opacity-30"
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} />
        </button>
        <p className="min-w-[13ch] text-center font-hand text-[22px] leading-none text-ink-soft" aria-live="polite">
          {label}
        </p>
        <button
          type="button"
          onClick={() => flipRef.current?.flipNext()}
          disabled={atEnd}
          aria-label="Next page"
          className="flex size-11 items-center justify-center rounded-full bg-[#f8f6ef] text-ink shadow-[0_6px_18px_-8px_rgb(36_58_86/0.4)] transition-[opacity,transform] hover:translate-x-0.5 disabled:opacity-30"
        >
          <ChevronRight className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* the pages, rendered once; page-flip turns clones of these */}
      <div ref={templateRef} hidden>
        {PAGES.map(p => (
          <div key={p.id} className={`diary-page ${p.hard ? 'diary-hard' : ''}`} data-density={p.hard ? 'hard' : 'soft'}>
            <div className="diary-sheet">{p.body}</div>
          </div>
        ))}
      </div>
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
          <img src={`${D}/kid.png`} alt="Manya as a little girl, hands on her hips" loading="lazy" draggable={false} />
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
            <img src={`${D}/snapshots.png`} alt="Four snapshots: presenting to a room, sketching at a table, showing an app, and talking with a group" className="block w-full" loading="lazy" draggable={false} />
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
            src={`${D}/loves-strip.png`}
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
          <img src={`${D}/gravity-falls.png`} alt="Gravity Falls" className="h-[13cqw] w-auto drop-shadow-[0_1cqw_1.4cqw_rgb(40_36_20/0.35)]" loading="lazy" draggable={false} />
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
