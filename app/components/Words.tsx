'use client';

import { motion } from 'motion/react';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { links, testimonials } from '../lib/content';
import { MaskHeading, Reveal, SectionLabel } from './ui';

const tones = { lilac: 'bg-lilac', butter: 'bg-butter', rose: 'bg-rose' } as const;
const tilts = [-2.2, 1.4, -1];

/** Writing + collaborator notes: the words section. */
export default function Words() {
  return (
    <section aria-labelledby="words-title" className="section-texture relative bg-paper-deep/60">
      <div className="hairline-x" />
      <div className="mx-auto max-w-[1360px] px-5 py-28 md:px-10 md:py-40">
        {/* writing */}
        <div className="grid items-center gap-12 md:grid-cols-12">
          <div className="md:col-span-6">
            <SectionLabel n="05">Words</SectionLabel>
            <MaskHeading id="words-title" className="mt-6 text-[clamp(44px,5.6vw,92px)] leading-[0.95]">
              <>Thoughts I can’t</>
              <em>keep to myself.</em>
            </MaskHeading>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-[40ch] text-[17px] leading-[1.65] text-ink-soft">On designing, noticing, and making sense of the in-between.</p>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="md:col-span-5 md:col-start-8">
            <motion.a
              href={links.medium}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ rotate: 2.5 }}
              whileHover={{ rotate: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="group relative block [filter:drop-shadow(0_10px_24px_rgb(40_36_20/0.12))_drop-shadow(0_1px_1px_rgb(40_36_20/0.06))]"
            >
              <div className="paper-fold-card relative rounded-[6px] bg-paper-light p-8 md:p-10">
              {/* dog-eared corner: the cut shows the real section behind; it unfolds on hover */}
              <span className="paper-fold-flap" aria-hidden="true" />
              <BookOpen className="size-6 text-blue" strokeWidth={1.5} />
              <p className="mt-6 font-serif text-[clamp(30px,2.8vw,42px)] leading-[1.04] tracking-[-0.015em]">
                Some ideas need a little more <em className="text-blue">room to grow.</em>
              </p>
              <p className="mt-4 text-[15px] text-muted">Notes from a curious mind, collected on Medium.</p>
              <span className="mt-8 flex items-center justify-between border-t border-line pt-5 text-[15px] font-medium">
                Read on Medium
                <span className="flex size-9 items-center justify-center rounded-full bg-ink text-paper-light transition-colors duration-300 group-hover:bg-blue">
                  <ArrowUpRight className="size-4 transition-transform duration-500 ease-out-expo group-hover:rotate-45" strokeWidth={1.75} />
                </span>
              </span>
              </div>
            </motion.a>
          </Reveal>
        </div>

        {/* testimonials */}
        <div id="kind-words" className="mt-32 md:mt-44">
          <div className="text-center">
            <Reveal className="eyebrow">Kind words</Reveal>
            <MaskHeading className="mt-5 text-[clamp(40px,5vw,80px)] leading-[0.98]">
              <>Some seeds were</>
              <em>planted by others.</em>
            </MaskHeading>
          </div>
          <ul className="mt-16 grid gap-8 md:mt-20 md:grid-cols-3 md:gap-6">
            {testimonials.map((t, i) => (
              <motion.li
                key={t.name}
                initial={{ opacity: 0, y: 70, rotate: tilts[i] * 3 }}
                whileInView={{ opacity: 1, y: 0, rotate: tilts[i] }}
                whileHover={{ rotate: 0, y: -8 }}
                viewport={{ once: true, margin: '0px 0px -12% 0px' }}
                transition={{ type: 'spring', stiffness: 120, damping: 18, delay: i * 0.08 }}
                // the shadow lives out here: the sheet inside is masked to its torn edge, and a mask would clip it
                className="relative flex [filter:drop-shadow(0_14px_18px_rgb(60_52_30/0.2))_drop-shadow(0_1px_1px_rgb(60_52_30/0.12))]"
              >
                <div className={`${tones[t.tone]} paper-texture relative flex w-full flex-col justify-between p-9 pb-8 md:min-h-[380px]`}>
                  <div>
                    <blockquote className="mt-3 font-serif text-[24px] leading-[1.22] tracking-[-0.005em] text-ink md:text-[26px]">“{t.quote}”</blockquote>
                  </div>
                  <p className="mt-8 border-t border-ink/10 pt-5 text-[14px] leading-tight">
                    <span className="block font-medium text-ink">{t.name}</span>
                    <span className="text-ink-soft">{t.role}</span>
                  </p>
                </div>
                <span className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[2deg] bg-white/55 shadow-sm backdrop-blur-sm" aria-hidden="true" />
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
      <div className="hairline-x" />
    </section>
  );
}
