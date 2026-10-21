'use client';

import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from 'motion/react';
import { ArrowUpRight, ChevronDown, LayoutGrid, Rows3, Sprout } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { caseStudies, facets, links, skills, studies, type CaseStudy, type FacetKey } from '../lib/content';
import DitherCard from './DitherCard';
import { MaskHeading, Reveal, SectionLabel } from './ui';

type Filters = Partial<Record<FacetKey, string>>;
type View = 'default' | 'compact';

const EASE = [0.16, 1, 0.3, 1] as const;
const LAYOUT_SPRING = { type: 'spring', stiffness: 170, damping: 26, mass: 1 } as const;
/** Copy that isn't shared between the two views settles in once the tiles have mostly moved. */
const copyIn = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.18, ease: EASE } };

export default function Work() {
  const [filters, setFilters] = useState<Filters>({});
  const [view, setView] = useState<View>('default');
  // the slow scroll-in reveal is for first arrival; after a filter or view change, cards morph instead
  const [touched, setTouched] = useState(false);
  const changeView = (v: View) => {
    setTouched(true);
    setView(v);
  };
  const changeFilters = (f: Filters) => {
    setTouched(true);
    setFilters(f);
  };
  const shown = caseStudies.filter(s => facets.every(f => !filters[f.key] || s.facets[f.key] === filters[f.key]));

  return (
    <section id="work" aria-labelledby="work-title" className="relative z-10 -mt-[55svh] scroll-mt-0 pt-10 md:pt-16">
      <Ticker />

      <div className="mx-auto max-w-[1360px] px-5 pt-24 md:px-10 md:pt-36">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <SectionLabel n="02">Selected work</SectionLabel>
            <MaskHeading id="work-title" className="mt-6 text-[clamp(48px,7vw,112px)] leading-[0.92]">
              <>A practice</>
              <em>in full bloom.</em>
            </MaskHeading>
          </div>
          <Reveal delay={0.15} className="md:col-span-4 md:col-start-9">
            <p className="text-[17px] leading-[1.65] text-ink-soft">
              Different questions, thoughtful outcomes. Three published case studies — and a few garden studies still growing.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 md:mt-24">
          <FilterBar filters={filters} onChange={changeFilters} />
          <ViewToggle view={view} onChange={changeView} />
        </div>

        <div aria-live="polite">
          {/* One wrapper per project across both views: the plate and image share a layoutId, so
              switching views morphs each tile into place, and filtered-out cards pop out while
              the rest slide over. */}
          <div className={`relative ${view === 'compact' ? 'mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 md:mt-12 lg:grid-cols-3' : 'mt-12 space-y-20 md:mt-16 md:space-y-32'}`}>
            <AnimatePresence mode="popLayout" initial={false}>
              {shown.map((study, i) => (
                <motion.div
                  key={study.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
                  transition={{ layout: LAYOUT_SPRING, duration: 0.45, ease: EASE }}
                >
                  {view === 'compact' ? <CompactCard study={study} /> : <CaseCard study={study} flip={i % 2 === 1} reveal={!touched} />}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {shown.length === 0 && (
            <p className="py-16 text-center text-[17px] text-ink-soft">
              Nothing growing in this patch yet.{' '}
              <button type="button" onClick={() => changeFilters({})} className="link-underline pb-0.5 font-medium text-ink">
                Clear filters
              </button>
            </p>
          )}
        </div>

        <StudiesIndex />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function Ticker() {
  const items = [...skills, ...skills];
  return (
    <div className="relative overflow-hidden border-y border-line py-5" aria-label="Skills I bring">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-paper to-transparent" />
      <ul className="flex w-max animate-[ticker_48s_linear_infinite] items-center gap-10 pr-10 hover:[animation-play-state:paused]">
        {items.map((d, i) => (
          <li key={i} aria-hidden={i >= skills.length} className="flex items-center gap-10 whitespace-nowrap font-serif text-[30px] leading-none tracking-[-0.01em] text-ink md:text-[40px]">
            {i % 2 ? <em className="text-blue">{d}</em> : d}
            <Sprout className="size-5 text-gold" strokeWidth={1.5} />
          </li>
        ))}
      </ul>
      <style>{`@keyframes ticker{to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function FilterBar({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const [open, setOpen] = useState<FacetKey | null>(null);
  const active = Object.values(filters).some(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-3 md:gap-4" role="group" aria-label="Filter projects">
      {facets.map(f => (
        <FilterMenu
          key={f.key}
          label={f.label}
          options={[...new Set(caseStudies.map(s => s.facets[f.key]))].sort()}
          value={filters[f.key]}
          open={open === f.key}
          onOpenChange={o => setOpen(o ? f.key : null)}
          onSelect={v => onChange({ ...filters, [f.key]: v })}
        />
      ))}
      <AnimatePresence>
        {active && (
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onChange({})}
            className="link-underline ml-1 pb-0.5 text-[15px] font-medium text-ink"
          >
            Clear filters
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterMenu({
  label,
  options,
  value,
  open,
  onOpenChange,
  onSelect,
}: {
  label: string;
  options: string[];
  value?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string | undefined) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = ['All', ...options];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', onDown);
    // move focus to the selected option once the menu mounts
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const choose = (v: string) => {
    onSelect(v === 'All' ? undefined : v);
    onOpenChange(false);
    trigger.current?.focus();
  };

  const onMenuKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const opts = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')];
    const i = opts.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') opts[(i + 1) % opts.length]?.focus();
    else if (e.key === 'ArrowUp') opts[(i - 1 + opts.length) % opts.length]?.focus();
    else if (e.key === 'Home') opts[0]?.focus();
    else if (e.key === 'End') opts[opts.length - 1]?.focus();
    else if (e.key === 'Escape') {
      onOpenChange(false);
      trigger.current?.focus();
    } else if (e.key === 'Tab') onOpenChange(false);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            onOpenChange(true);
          }
        }}
        className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-[15px] transition-colors duration-300 ${
          value
            ? 'border-ink bg-ink text-paper-light hover:bg-ink-soft'
            : 'border-line-strong text-ink-soft hover:border-ink/40 hover:text-ink'
        }`}
      >
        <span>
          {label} <span aria-hidden="true">:</span> <span className={value ? '' : 'text-ink'}>{value ?? 'All'}</span>
        </span>
        <ChevronDown
          className={`size-4 transition-transform duration-500 ease-out-expo ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={label}
            onKeyDown={onMenuKey}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-[calc(100%+8px)] z-40 min-w-[240px] origin-top-left rounded-[18px] border border-ink/[0.06] bg-paper-light p-1.5 shadow-[var(--shadow-lift)]"
          >
            {items.map(o => {
              const selected = (value ?? 'All') === o;
              return (
                <li
                  key={o}
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onClick={() => choose(o)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      choose(o);
                    }
                  }}
                  className={`cursor-pointer rounded-[12px] px-3.5 py-2.5 text-[15px] outline-none transition-colors duration-200 hover:bg-paper-deep focus-visible:bg-paper-deep ${
                    selected ? 'font-medium text-ink' : 'text-ink-soft'
                  }`}
                >
                  {o}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

const VIEWS = [
  { id: 'default', label: 'Default', Icon: Rows3 },
  { id: 'compact', label: 'Compact', Icon: LayoutGrid },
] as const;

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div role="radiogroup" aria-label="View" className="relative inline-flex h-11 items-center rounded-full border border-line-strong p-1">
      {VIEWS.map(({ id, label, Icon }) => {
        const on = view === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(id)}
            onKeyDown={e => {
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                const next = id === 'default' ? 'compact' : 'default';
                onChange(next);
                (e.currentTarget.parentElement?.querySelector(`[data-view="${next}"]`) as HTMLElement | null)?.focus();
              }
            }}
            tabIndex={on ? 0 : -1}
            data-view={id}
            className={`relative flex h-full items-center gap-2 rounded-full px-4 text-[14px] transition-colors duration-300 ${on ? 'text-paper-light' : 'text-ink-soft hover:text-ink'}`}
          >
            {on && (
              <motion.span
                layoutId="work-view-thumb"
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                aria-hidden="true"
              />
            )}
            <Icon className="relative size-4" strokeWidth={1.75} aria-hidden="true" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function CompactCard({ study }: { study: CaseStudy }) {
  return (
    <article>
      <a
        href={study.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${study.name} — read the case study (opens in a new tab)`}
        className="group block"
      >
        <motion.div
          layoutId={`plate-${study.id}`}
          transition={{ layout: LAYOUT_SPRING }}
          style={{ backgroundColor: study.tint, borderRadius: 22 }}
          className="relative aspect-[4/3] overflow-hidden"
        >
          <DitherCard ink={study.ink} className="absolute inset-0 size-full" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.55),transparent_60%)]" />
          <motion.div layoutId={`image-${study.id}`} transition={{ layout: LAYOUT_SPRING }} className="absolute inset-[9%]">
            <img
              src={study.image}
              alt=""
              loading="lazy"
              className="size-full rounded-[10px] object-cover shadow-[0_20px_40px_-20px_rgb(28_35_51/0.45),0_0_0_1px_rgb(28_35_51/0.06)] transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.04]"
            />
          </motion.div>
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26, delay: 0.25 }}
            className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full bg-ink text-paper-light transition-colors duration-300 group-hover:bg-blue"
          >
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-out-expo group-hover:rotate-45" strokeWidth={1.75} />
          </motion.span>
        </motion.div>
        <motion.div {...copyIn}>
          <p className="eyebrow mt-5">{study.type}</p>
          <h3 className="mt-2 font-serif text-[30px] leading-[1.02] tracking-[-0.015em] text-ink">{study.name}</h3>
          <p className="mt-2 text-[14px] text-muted">{facets.map(f => study.facets[f.key]).join(' · ')}</p>
        </motion.div>
      </a>
    </article>
  );
}

/* ------------------------------------------------------------------------ */

function CaseCard({ study, flip, reveal }: { study: CaseStudy; flip: boolean; reveal: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['6%', '-6%']);

  // cursor-following badge
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const bx = useSpring(mx, { stiffness: 350, damping: 32, mass: 0.6 });
  const by = useSpring(my, { stiffness: 350, damping: 32, mass: 0.6 });
  const [hover, setHover] = useState(false);

  return (
    <motion.article
      initial={reveal ? { opacity: 0, y: 60 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -15% 0px' }}
      transition={{ duration: 1.2, ease: EASE }}
      className="grid gap-8 md:grid-cols-12 md:items-center md:gap-10"
    >
      <motion.a
        ref={ref}
        layoutId={`plate-${study.id}`}
        transition={{ layout: LAYOUT_SPRING }}
        href={study.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${study.name} — read the case study (opens in a new tab)`}
        onPointerMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set(e.clientX - r.left);
          my.set(e.clientY - r.top);
        }}
        onPointerEnter={e => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.jump(e.clientX - r.left);
          my.jump(e.clientY - r.top);
          bx.jump(e.clientX - r.left);
          by.jump(e.clientY - r.top);
          setHover(true);
        }}
        onPointerLeave={() => setHover(false)}
        style={{ backgroundColor: study.tint, borderRadius: 28 }}
        className={`group relative block aspect-[16/11] overflow-hidden md:col-span-7 md:cursor-none ${flip ? 'md:order-2 md:col-start-6' : ''}`}
      >
        <DitherCard ink={study.ink} className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.55),transparent_60%)]" />
        <motion.div layoutId={`image-${study.id}`} transition={{ layout: LAYOUT_SPRING }} className="absolute inset-[7%] md:inset-[8%]">
          <motion.img
            style={{ y: imgY }}
            src={study.image}
            alt={`${study.name} project overview`}
            loading="lazy"
            className="size-full rounded-[14px] object-cover shadow-[0_30px_60px_-25px_rgb(28_35_51/0.45),0_0_0_1px_rgb(28_35_51/0.06)] transition-[scale] duration-[1.2s] ease-out-expo group-hover:scale-[1.035]"
          />
        </motion.div>
        <AnimatePresence>
          {hover && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              style={{ x: bx, y: by }}
              className="pointer-events-none absolute left-0 top-0 z-10 -ml-[52px] -mt-[52px] hidden size-[104px] items-center justify-center rounded-full bg-ink text-center text-[13px] font-medium leading-tight text-paper-light md:flex"
            >
              Read the
              <br />
              case study
            </motion.span>
          )}
        </AnimatePresence>
      </motion.a>

      <motion.div {...copyIn} className={`md:col-span-5 ${flip ? 'md:order-1 md:col-span-4 md:col-start-1' : 'md:col-start-9 md:col-span-4'}`}>
        <p className="eyebrow">{study.type}</p>
        <h3 className="mt-4 font-serif text-[clamp(38px,4vw,60px)] leading-[0.98] tracking-[-0.02em] text-ink">{study.name}</h3>
        <p className="mt-5 text-[17px] leading-[1.65] text-ink-soft">{study.description}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {study.tags.map(t => (
            <li key={t} className="rounded-full border border-ink/10 bg-paper-light px-3 py-1.5 text-[13px] text-ink-soft">
              {t}
            </li>
          ))}
        </ul>
        <a
          href={study.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-8 inline-flex h-11 items-center gap-3 rounded-full bg-ink pl-5 pr-1.5 text-[15px] font-medium text-paper-light transition-colors duration-300 hover:bg-blue"
        >
          Read the case study
          <span className="flex size-8 items-center justify-center rounded-full bg-paper-light text-ink transition-colors duration-300 group-hover:text-blue">
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-out-expo group-hover:rotate-45" strokeWidth={1.75} />
          </span>
        </a>
      </motion.div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------------ */

function StudiesIndex() {
  const [active, setActive] = useState<number | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 180, damping: 22, mass: 0.6 });
  const y = useSpring(my, { stiffness: 180, damping: 22, mass: 0.6 });
  const velocity = useVelocity(x);
  const rotate = useSpring(useTransform(velocity, [-1500, 0, 1500], [-12, 0, 12], { clamp: true }), { stiffness: 200, damping: 20 });
  const listRef = useRef<HTMLDivElement>(null);

  // fetch and decode the specimens before the first hover, so the first one doesn't stall in
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        for (const s of studies) {
          const img = new Image();
          img.src = s.plant;
          img.decode().catch(() => {});
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(listRef.current!);
    return () => io.disconnect();
  }, []);

  return (
    <div className="mt-28 md:mt-40">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionLabel n="02.b">Garden studies</SectionLabel>
          <Reveal>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-[1.65] text-ink-soft">
              Explorations without published write-ups yet — the process lives in conversation. Pick one and ask me about it.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <a href={links.works} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 text-[15px] font-medium">
            <span className="link-underline pb-0.5">The complete work collection</span>
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.75} />
          </a>
        </Reveal>
      </div>

      <div
        ref={listRef}
        className="relative mt-10"
        onPointerEnter={e => {
          // start the specimen under the pointer, rather than flying in from the corner of the screen
          mx.jump(e.clientX);
          my.jump(e.clientY);
          x.jump(e.clientX);
          y.jump(e.clientY);
          rotate.jump(0);
        }}
        onPointerMove={e => {
          mx.set(e.clientX);
          my.set(e.clientY);
        }}
        onPointerLeave={() => setActive(null)}
      >
        <ul className="border-t border-line">
        {studies.map((s, i) => (
          <Reveal as="li" key={s.id} delay={i * 0.06} className="border-b border-line">
            <a
              href={`${links.email}?subject=${encodeURIComponent(`Let’s talk about ${s.name}`)}`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(null)}
              className="group relative grid grid-cols-[auto_1fr] items-center gap-4 overflow-hidden px-3 py-7 md:grid-cols-[80px_1.2fr_1fr] md:gap-8 md:px-6 md:py-9"
            >
              <span
                className="absolute inset-0 origin-bottom scale-y-0 transition-transform duration-700 ease-out-expo group-hover:scale-y-100"
                style={{ backgroundColor: s.tint }}
                aria-hidden="true"
              />
              <span className="relative font-mono text-[12px] tracking-[0.14em] text-muted">0{i + 1}</span>
              <span className="relative font-serif text-[clamp(34px,4.6vw,64px)] leading-none tracking-[-0.02em] transition-transform duration-700 ease-out-expo group-hover:translate-x-3">
                {s.name}
              </span>
              <span className="relative hidden text-[15px] text-ink-soft md:block">
                {s.type}
                <span className="mt-1 block text-[13px] text-muted">{s.description}</span>
              </span>
              <img src={s.plant} alt="" className="relative col-span-2 -mb-2 mt-2 h-28 w-auto justify-self-start object-contain mix-blend-multiply md:hidden" loading="lazy" />
            </a>
          </Reveal>
        ))}
        </ul>

        {/* floating specimen that follows the pointer (desktop) */}
        <motion.div
          aria-hidden="true"
          style={{ x, y, rotate }}
          className="pointer-events-none fixed left-0 top-0 z-30 hidden will-change-transform md:block"
        >
          <AnimatePresence mode="popLayout">
            {active !== null && (
              <motion.img
                key={active}
                src={studies[active].plant}
                alt=""
                initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="-ml-[140px] -mt-[200px] h-[400px] w-[280px] object-contain mix-blend-multiply"
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
