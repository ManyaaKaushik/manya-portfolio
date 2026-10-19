'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import { Clapperboard, Cpu, Gamepad2, GraduationCap, Megaphone, Music2, PenLine, Plane, Search, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { MaskHeading, Reveal, SectionLabel } from './ui';

export default function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="relative mt-36 bg-paper-deep/60 md:mt-48">
      <div className="hairline-x" />
      <div className="mx-auto max-w-[1360px] px-5 pb-28 pt-24 md:px-10 md:pb-40 md:pt-36">
        <div className="grid gap-14 md:grid-cols-12 md:gap-10">
          {/* sticky portrait column */}
          <div className="md:col-span-5">
            <div className="md:sticky md:top-28">
              <SectionLabel n="03">About</SectionLabel>
              <MaskHeading id="about-title" className="mt-6 text-[clamp(40px,4.6vw,72px)] leading-[0.96]">
                <>A few pages</>
                <em>of being Manya.</em>
              </MaskHeading>
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-[38ch] text-[17px] leading-[1.65] text-ink-soft">
                  Designer, daydreamer, collector of little things. There’s a person behind every decision — here are a few of her pages.
                </p>
              </Reveal>
              <Portrait />
            </div>
          </div>

          {/* diary pages */}
          <div className="space-y-10 md:col-span-7 md:space-y-14 md:pt-40">
            <DiaryPage date="Notes on being human" tilt={-1.4}>
              <PageTitle>
                My favourite kind <em>of connection.</em>
              </PageTitle>
              <PageText>
                If you’d asked my Grandma, she’d say I taught her how to shop from Amazon. If you ask my Mom, she’d say I helped her unlock the Smart TV’s magic.
              </PageText>
              <div className="mt-8 grid grid-cols-2 gap-4 md:gap-6">
                <Polaroid src="/assets/family-grandma.webp" alt="Manya’s grandma at a café" caption="little lessons, over a big conversation." rotate={-3} ratio="aspect-[3/4]" />
                <div className="flex flex-col justify-between gap-4">
                  <Polaroid src="/assets/family-together.webp" alt="Manya and her grandma sharing a ride" caption="bringing worlds together." rotate={2.5} ratio="aspect-[4/3]" />
                  <p className="font-serif text-[22px] leading-[1.15] text-ink md:text-[26px]">
                    Small frictions. <em className="text-blue">Human possibilities.</em>
                  </p>
                </div>
              </div>
              <PageText className="mt-8">
                With classmates, you’ll find me talking about designing with AI, or design in everyday life. Human–AI collaboration or cross-generational tech lessons — I love the space in between.
              </PageText>
            </DiaryPage>

            <DiaryPage date="Journey into design" tilt={1.2}>
              <PageTitle>
                It started with <em>a few questions.</em>
              </PageTitle>
              <PageText>
                How do people think, act, and feel around technology? Posters for college clubs and audits for digital platforms led me into this world.
              </PageText>
              <Journey />
              <PageText className="mt-8">Moving from Electronics to design taught me how systems and empathy can coexist.</PageText>
            </DiaryPage>

            <DiaryPage date="Off the clock, still curious" tilt={-0.8}>
              <PageTitle>
                Who am I without <em>the things I love?</em>
              </PageTitle>
              <ul className="mt-6 flex flex-wrap gap-2">
                {[
                  [Music2, 'Dance & singing'],
                  [Plane, 'Travel'],
                  [PenLine, 'Writing'],
                  [Clapperboard, 'Films that stay'],
                ].map(([Icon, label]) => {
                  const I = Icon as typeof Music2;
                  return (
                    <li key={label as string} className="flex items-center gap-2 rounded-full border border-ink/10 bg-paper-light px-3.5 py-2 text-[14px] text-ink-soft">
                      <I className="size-4 text-blue" strokeWidth={1.75} />
                      {label as string}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-8 grid grid-cols-3 gap-3 md:gap-4">
                <Sticker tone="bg-butter" rotate={-4} title="Interstellar" note="big questions." />
                <Sticker tone="bg-rose" rotate={3} title="Inside Out" note="big feelings." />
                <Sticker tone="bg-lilac" rotate={-2} title="meme-reference" note="enthusiast." />
              </div>
              <div className="mt-8 flex items-center gap-4 rounded-2xl border border-ink/[0.07] bg-paper-light/80 p-4">
                <img src="/assets/tiny-glade.webp" alt="Tiny Glade" className="size-14 rounded-xl object-cover" loading="lazy" />
                <img src="/assets/letterboxd.webp" alt="Letterboxd" className="size-12 rounded-xl object-cover" loading="lazy" />
                <p className="text-[15px] leading-snug text-ink-soft">
                  <Gamepad2 className="mr-1.5 inline size-4 -translate-y-px text-blue" strokeWidth={1.75} />A little <em className="font-serif text-[18px] text-ink">It Takes Two</em>, a little Tiny Glade — and movie reviews on Letterboxd.
                </p>
              </div>
            </DiaryPage>

            <DiaryPage date="A place for wild dreams" tilt={1}>
              <PageTitle>
                I turn my dreams <em>into imaginative stories.</em>
              </PageTitle>
              <figure className="mt-7 overflow-hidden rounded-xl">
                <img src="/assets/dreaming.webp" alt="Manya imagining stories behind her laptop" className="w-full object-cover" loading="lazy" />
              </figure>
              <PageText className="mt-6">A notebook. A thought. A world that doesn’t exist yet. Sometimes that’s all it takes to begin.</PageText>
              <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-6">
                <Polaroid src="/assets/sketch-world.webp" alt="Manya’s blue architectural drawing and story notes" rotate={-2.5} ratio="aspect-[3/4]" />
                <p className="text-center font-serif text-[22px] leading-[1.1] md:text-[28px]">
                  What if?
                  <br />
                  <em className="text-blue">what else?</em>
                </p>
                <Polaroid src="/assets/sketch-creature.webp" alt="Manya’s imagined creature with handwritten story notes" rotate={3} ratio="aspect-[3/4]" />
              </div>
            </DiaryPage>
          </div>
        </div>
      </div>
      <div className="hairline-x" />
    </section>
  );
}

/* ------------------------------------------------------------------------ */

function Portrait() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-5, 2]);
  return (
    <Reveal delay={0.2} className="mt-10 hidden md:block">
      <motion.div ref={ref} style={{ rotate }} className="relative w-[min(300px,70%)] rounded-[6px] bg-paper-light p-3 pb-14 shadow-paper">
        <span className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-[-3deg] bg-gold-soft/80 shadow-sm" aria-hidden="true" />
        <img src="/assets/manya.webp" alt="Manya Kaushik" className="aspect-[4/5] w-full rounded-[3px] object-cover object-top" />
        <p className="absolute bottom-4 left-4 font-serif text-[19px] italic text-ink-soft">a work in progress, just like me.</p>
        <span className="absolute -right-10 -top-6 flex size-20 rotate-12 items-center justify-center rounded-full bg-blue text-center text-[11px] font-medium leading-tight text-paper-light shadow-lift">
          <Sparkles className="absolute -right-1 -top-1 size-4 text-gold" strokeWidth={2} />
          so many
          <br />
          little worlds
        </span>
      </motion.div>
    </Reveal>
  );
}

function DiaryPage({ date, tilt, children }: { date: string; tilt: number; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.35'] });
  const rotate = useTransform(scrollYProgress, [0, 1], [tilt * 3, tilt * 0.35]);
  const y = useTransform(scrollYProgress, [0, 1], [90, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.35], [0, 1]);
  return (
    <motion.article
      ref={ref}
      style={{ rotate, y, opacity }}
      className="relative rounded-[6px] bg-paper-light px-6 py-9 shadow-paper md:px-12 md:py-12"
    >
      {/* ruled-paper margin line */}
      <span className="absolute inset-y-0 left-3 w-px bg-rose md:left-6" aria-hidden="true" />
      <p className="eyebrow">{date}</p>
      {children}
    </motion.article>
  );
}

function PageTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="serif-em mt-4 font-serif text-[clamp(32px,3.4vw,48px)] leading-[1.02] tracking-[-0.02em] text-ink">{children}</h3>;
}

function PageText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`mt-5 max-w-[56ch] text-[16.5px] leading-[1.7] text-ink-soft ${className}`}>{children}</p>;
}

function Polaroid({ src, alt, caption, rotate, ratio }: { src: string; alt: string; caption?: string; rotate: number; ratio: string }) {
  return (
    <motion.figure
      whileHover={{ rotate: 0, scale: 1.03, y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{ rotate }}
      className="rounded-[4px] bg-white p-2 pb-3 shadow-[0_14px_30px_-14px_rgb(40_36_20/0.35),0_0_0_1px_rgb(40_36_20/0.05)]"
    >
      <img src={src} alt={alt} className={`${ratio} w-full rounded-[2px] object-cover`} loading="lazy" />
      {caption && <figcaption className="mt-2 px-1 font-serif text-[15px] italic leading-snug text-muted">{caption}</figcaption>}
    </motion.figure>
  );
}

function Sticker({ tone, rotate, title, note }: { tone: string; rotate: number; title: string; note: string }) {
  return (
    <motion.div
      whileHover={{ rotate: 0, y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      style={{ rotate }}
      className={`${tone} rounded-[4px] px-3 py-4 shadow-[0_10px_20px_-12px_rgb(40_36_20/0.35)] md:px-4 md:py-5`}
    >
      <p className="font-serif text-[19px] leading-none text-ink md:text-[24px]">{title}</p>
      <p className="mt-1.5 font-serif text-[15px] italic text-ink-soft md:text-[17px]">{note}</p>
    </motion.div>
  );
}

const steps = [
  { icon: Cpu, label: 'Electronics', note: 'where it began' },
  { icon: Megaphone, label: 'Posters & audits', note: 'college clubs, platforms' },
  { icon: Search, label: 'Curiosity', note: 'people around technology' },
  { icon: GraduationCap, label: 'Interaction Design', note: 'NID, Bengaluru' },
];

function Journey() {
  return (
    <ol className="relative mt-9 grid gap-6 sm:grid-cols-4 sm:gap-3">
      <motion.span
        aria-hidden="true"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '0px 0px -20% 0px' }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-5 right-5 top-5 hidden h-px origin-left bg-[repeating-linear-gradient(90deg,var(--color-blue)_0_6px,transparent_6px_11px)] sm:block"
      />
      {steps.map(({ icon: Icon, label, note }, i) => (
        <motion.li
          key={label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -20% 0px' }}
          transition={{ delay: 0.25 + i * 0.18, duration: 0.8 }}
          className="relative flex items-center gap-4 sm:block"
        >
          <span
            className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border ${
              i === steps.length - 1 ? 'border-blue bg-blue text-paper-light' : 'border-ink/15 bg-paper-light text-blue'
            }`}
          >
            <Icon className="size-[18px]" strokeWidth={1.6} />
          </span>
          <div className="sm:mt-4">
            <p className={`text-[15px] font-medium leading-tight ${i === steps.length - 1 ? 'text-blue' : 'text-ink'}`}>{label}</p>
            <p className="mt-1 text-[13px] text-muted">{note}</p>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
