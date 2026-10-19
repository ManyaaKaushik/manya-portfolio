'use client';

import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from 'motion/react';
import { ArrowUpRight, MessageCircle, Sprout } from 'lucide-react';
import { useRef, useState } from 'react';
import { caseStudies, domains, links, studies, type CaseStudy } from '../lib/content';
import { MaskHeading, Reveal, SectionLabel } from './ui';

export default function Work() {
  return (
    <section id="work" aria-labelledby="work-title" className="relative scroll-mt-0 pt-10 md:pt-16">
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

        <div className="mt-16 space-y-20 md:mt-24 md:space-y-32">
          {caseStudies.map((study, i) => (
            <CaseCard key={study.id} study={study} flip={i % 2 === 1} />
          ))}
        </div>

        <StudiesIndex />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function Ticker() {
  const items = [...domains, ...domains];
  return (
    <div className="relative overflow-hidden border-y border-line py-5" aria-label="Domains I have designed for">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-paper to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-paper to-transparent" />
      <ul className="flex w-max animate-[ticker_48s_linear_infinite] items-center gap-10 pr-10 hover:[animation-play-state:paused]">
        {items.map((d, i) => (
          <li key={i} aria-hidden={i >= domains.length} className="flex items-center gap-10 whitespace-nowrap font-serif text-[30px] leading-none tracking-[-0.01em] text-ink md:text-[40px]">
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

function CaseCard({ study, flip }: { study: CaseStudy; flip: boolean }) {
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
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -15% 0px' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="grid gap-8 md:grid-cols-12 md:items-center md:gap-10"
    >
      <a
        ref={ref}
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
        style={{ backgroundColor: study.tint }}
        className={`group relative block aspect-[16/11] overflow-hidden rounded-[28px] md:col-span-7 md:cursor-none ${flip ? 'md:order-2 md:col-start-6' : ''}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.55),transparent_60%)]" />
        <motion.div style={{ y: imgY }} className="absolute inset-[7%] md:inset-[8%]">
          <img
            src={study.image}
            alt={`${study.name} project overview`}
            loading="lazy"
            className="size-full rounded-[14px] object-cover shadow-[0_30px_60px_-25px_rgb(28_35_51/0.45),0_0_0_1px_rgb(28_35_51/0.06)] transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.035]"
          />
        </motion.div>
        <span className="absolute left-5 top-5 hidden font-mono md:block text-[11px] tracking-[0.14em] uppercase" style={{ color: study.ink }}>
          {study.index} / 03
        </span>
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
      </a>

      <div className={`md:col-span-5 ${flip ? 'md:order-1 md:col-span-4 md:col-start-1' : 'md:col-start-9 md:col-span-4'}`}>
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
          className="group mt-8 inline-flex items-center gap-2 text-[15px] font-medium text-ink"
        >
          <span className="link-underline pb-0.5">Read the case study</span>
          <span className="flex size-8 items-center justify-center rounded-full border border-ink/15 transition-colors duration-300 group-hover:border-ink group-hover:bg-ink group-hover:text-paper-light">
            <ArrowUpRight className="size-4 transition-transform duration-500 ease-out-expo group-hover:rotate-45" strokeWidth={1.75} />
          </span>
        </a>
      </div>
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
        className="relative mt-10"
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
              className="group relative grid grid-cols-[auto_1fr_auto] items-center gap-4 overflow-hidden px-3 py-7 md:grid-cols-[80px_1.2fr_1fr_auto] md:gap-8 md:px-6 md:py-9"
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
              <span className="relative flex items-center gap-2 text-[14px] font-medium">
                <span className="hidden lg:inline">Ask me about it</span>
                <span className="flex size-10 items-center justify-center rounded-full border border-ink/15 bg-paper-light/60 transition-colors duration-300 group-hover:bg-ink group-hover:text-paper-light">
                  <MessageCircle className="size-4" strokeWidth={1.75} />
                </span>
              </span>
              <img src={s.plant} alt="" className="relative col-span-3 -mb-2 mt-2 h-28 w-auto justify-self-start object-contain mix-blend-multiply md:hidden" loading="lazy" />
            </a>
          </Reveal>
        ))}
        </ul>

        {/* floating specimen that follows the pointer (desktop) */}
        <motion.div
          aria-hidden="true"
          style={{ x, y, rotate }}
          className="pointer-events-none fixed left-0 top-0 z-30 hidden md:block"
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
