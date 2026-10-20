'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Dices, Play } from 'lucide-react';
import { useState } from 'react';
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
          <Reveal className="md:col-span-12">
            <WhatIf />
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
      <div className="relative my-8 min-h-[2.4em] max-w-[30ch] font-serif text-[clamp(28px,3.4vw,50px)] leading-[1.08] tracking-[-0.01em]" aria-live="polite">
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
