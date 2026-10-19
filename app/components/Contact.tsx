'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, ArrowUpRight, BookOpen, Check, Copy, FileText, Mail, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { links } from '../lib/content';
import DitherSky from './DitherSky';
import { scrollToId, useLenis } from './SmoothScroll';
import { LinkedInGlyph, MaskHeading, Reveal, SectionLabel, SunflowerGlyph } from './ui';

export default function Contact() {
  const lenis = useLenis();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(links.emailAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = links.email;
    }
  };

  const channels = [
    { href: links.email, label: 'Email', icon: Mail },
    { href: links.linkedin, label: 'LinkedIn', icon: LinkedInGlyph },
    { href: links.resume, label: 'Résumé', icon: FileText },
    { href: links.medium, label: 'Medium', icon: BookOpen },
  ];

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative overflow-hidden">
      <DitherSky className="pointer-events-none absolute inset-x-0 top-0 h-[78vh] w-full opacity-[0.32] [mask-image:linear-gradient(to_bottom,black_35%,transparent)]" />

      <div className="relative mx-auto max-w-[1360px] px-5 pb-10 pt-32 md:px-10 md:pt-48">
        <div className="text-center">
          <SectionLabel n="06" className="justify-center">
            Contact
          </SectionLabel>
          <MaskHeading id="contact-title" className="mx-auto mt-8 text-[clamp(56px,10.5vw,176px)] leading-[0.88]">
            <>Let’s grow</>
            <em>something good.</em>
          </MaskHeading>
          <Reveal delay={0.15}>
            <p className="mx-auto mt-8 max-w-[44ch] text-[17px] leading-[1.65] text-ink-soft md:text-[19px]">
              Open to product design roles, collaborations, and conversations about systems, people and the spaces in between.
            </p>
          </Reveal>

          <Reveal delay={0.25} className="mt-10 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-paper-light/80 p-1.5 shadow-[0_12px_40px_-18px_rgb(28_35_51/0.35)] backdrop-blur">
              <a href={links.email} className="group flex h-12 items-center gap-2.5 rounded-full bg-ink pl-5 pr-6 text-[15px] font-medium text-paper-light transition-colors duration-300 hover:bg-blue md:text-[16px]">
                <Mail className="size-4" strokeWidth={1.75} />
                {links.emailAddress}
              </a>
              <button type="button" onClick={copy} aria-label={copied ? 'Email copied' : 'Copy email address'} className="relative flex size-12 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={copied ? 'y' : 'n'} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.18 }}>
                    {copied ? <Check className="size-4 text-sage" strokeWidth={2} /> : <Copy className="size-4" strokeWidth={1.75} />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
            <span className="h-4 text-[13px] text-sage" aria-live="polite">
              {copied ? 'Copied — talk soon!' : ''}
            </span>
          </Reveal>

          <ul className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-2">
            {channels.map(({ href, label, icon: Icon }, i) => (
              <Reveal as="li" key={label} delay={0.3 + i * 0.05}>
                <a
                  href={href}
                  target={href.startsWith('mailto') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className="group flex h-11 items-center gap-2 rounded-full border border-ink/10 px-4 text-[14px] font-medium text-ink-soft transition-colors duration-300 hover:border-ink/30 hover:text-ink"
                >
                  <Icon className="size-4" />
                  {label}
                  <ArrowUpRight className="size-3.5 opacity-50 transition-all duration-500 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" strokeWidth={1.75} />
                </a>
              </Reveal>
            ))}
          </ul>
        </div>

        {/* plant-a-flower */}
        <div className="mt-28 grid items-center gap-10 md:mt-40 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow">Before you go</p>
            <h3 className="serif-em mt-4 font-serif text-[clamp(36px,3.6vw,56px)] leading-[1] tracking-[-0.02em]">
              Leave a little
              <br />
              <em>of yourself here.</em>
            </h3>
            <p className="mt-5 max-w-[34ch] text-[16px] leading-[1.65] text-ink-soft">Click the soil to plant a flower. Good things grow together.</p>
            <blockquote className="mt-10 border-l-2 border-gold pl-5 font-serif text-[22px] italic leading-[1.3] text-ink-soft">
              “What is there to lose? Every second you’re there, you’re gaining something.”
              <cite className="mt-2 block font-sans text-[13px] not-italic text-muted">— Alysa Liu</cite>
            </blockquote>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            <PixelGarden />
          </div>
        </div>

        <footer className="mt-28 flex flex-col items-center justify-between gap-6 border-t border-line pt-8 text-[14px] text-muted md:mt-36 md:flex-row">
          <div className="flex items-center gap-2.5">
            <SunflowerGlyph className="size-5 text-gold" />
            <span>
              © {new Date().getFullYear()} Manya Kaushik · <em className="font-serif text-[16px] text-ink-soft">rooted in empathy, always growing.</em>
            </span>
          </div>
          <a
            href="#top"
            onClick={e => {
              e.preventDefault();
              scrollToId(lenis, 'top');
            }}
            className="group flex items-center gap-2 font-medium text-ink"
          >
            Back to the beginning
            <span className="flex size-9 items-center justify-center rounded-full border border-ink/15 transition-colors duration-300 group-hover:bg-ink group-hover:text-paper-light">
              <ArrowUp className="size-4 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5" strokeWidth={1.75} />
            </span>
          </a>
        </footer>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */
/*  Pixel garden: an original canvas toy                                     */
/* ------------------------------------------------------------------------ */

type Plant = { x: number; height: number; size: number; color: string; born: number; petals: number };
const COLORS = ['#e3a93a', '#365fba', '#c47a64', '#9a8fc4', '#e5b6ba', '#6f8248'];

function PixelGarden() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<{ plant: (x: number) => void; clear: () => void } | null>(null);
  const [count, setCount] = useState(0);
  const max = 28;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const plants: Plant[] = [];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 1;
    let h = 1;
    let frame = 0;
    let visible = false;
    const P = 3;
    const px = (x: number, y: number, s: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x / P) * P, Math.round(y / P) * P, s, s);
    };
    const draw = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      ctx.clearRect(0, 0, w, h);
      const ground = h - 26;
      // soil
      for (let x = 0; x < w; x += P) {
        const n = Math.sin(x * 0.37) * Math.sin(x * 0.11);
        px(x, ground + 6 + (n > 0.3 ? P : 0), P, n > 0 ? '#cfc6ac' : '#d9d1b8');
        if (x % 9 === 0) px(x, ground + 14, P, '#c3b99c');
      }
      // grass
      for (let i = 0; i < w; i += 6) {
        const gh = 6 + (Math.sin(i * 4.7) * 0.5 + 0.5) * 16;
        ctx.fillStyle = gh > 15 ? '#7f9258' : '#a3b27f';
        ctx.fillRect(i, ground - gh + 6, 2, gh);
      }
      let growing = false;
      const now = performance.now();
      for (const p of plants) {
        const t = reduced ? 1 : Math.min(1, (now - p.born) / 1100);
        const e = 1 - Math.pow(1 - t, 3);
        if (t < 1) growing = true;
        const x = p.x * w;
        const sh = p.height * e;
        const top = ground - sh;
        for (let j = 0; j < sh; j += P) px(x + Math.sin(j * 0.03) * 4, ground - j, P, '#5f7543');
        if (e > 0.4) {
          for (let j = 0; j < 15; j += P) {
            px(x - j * 0.7, ground - sh * 0.42 - j * 0.6, 5, '#7d9350');
            px(x + j * 0.7, ground - sh * 0.62 - j * 0.6, 4, '#6d8447');
          }
        }
        if (e > 0.68) {
          const s = p.size * ((e - 0.68) / 0.32);
          for (let a = 0; a < p.petals; a++) {
            const ang = (a / p.petals) * Math.PI * 2;
            px(x + Math.cos(ang) * s - 4, top + Math.sin(ang) * s - 4, 8, p.color);
          }
          px(x - 4, top - 4, 9, '#24438a');
          px(x - 1, top - 2, 3, '#f4cf6a');
        }
      }
      if (growing && visible) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      w = r.width;
      h = r.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const plant = (x: number, initial = false) => {
      if (plants.length >= max) return;
      plants.push({
        x: Math.max(0.05, Math.min(0.95, x)),
        height: 60 + Math.random() * Math.max(60, h * 0.5),
        size: 10 + Math.random() * 9,
        color: COLORS[plants.length % COLORS.length],
        born: initial ? -2000 : performance.now(),
        petals: Math.random() > 0.5 ? 8 : 6,
      });
      setCount(plants.length);
      draw();
    };
    api.current = {
      plant,
      clear: () => {
        plants.length = 0;
        setCount(0);
        draw();
      },
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) draw();
    });
    io.observe(canvas);
    resize();
    [0.12, 0.3, 0.47, 0.66, 0.84].forEach(x => plant(x, true));
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      api.current = null;
    };
  }, []);

  const status =
    count >= max ? 'Your garden is in full bloom. Start afresh to grow another.' : count === 0 ? 'A fresh start. What will you grow?' : `${count} little ${count === 1 ? 'possibility' : 'possibilities'}, and room for more.`;

  return (
    <div className="overflow-hidden rounded-[24px] bg-paper-light shadow-[0_0_0_1px_rgb(28_35_51/0.06),0_30px_60px_-30px_rgb(28_35_51/0.25)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <p className="font-serif text-[22px] leading-none">A small space to grow.</p>
        <button type="button" onClick={() => api.current?.clear()} className="group flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink">
          <RotateCcw className="size-3.5 transition-transform duration-500 ease-out-expo group-hover:-rotate-180" strokeWidth={1.75} />
          Start afresh
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onClick={e => {
          const r = e.currentTarget.getBoundingClientRect();
          api.current?.plant((e.clientX - r.left) / r.width);
        }}
        role="img"
        aria-label="An interactive pixel garden. Use the Plant a seed button or tap the soil to add flowers."
        className="block h-[300px] w-full cursor-crosshair bg-[linear-gradient(to_bottom,#f3f1e6,#fbfaf4)] md:h-[340px]"
      />
      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
        <p className="text-[14px] text-muted" aria-live="polite">
          {status}
        </p>
        <button
          type="button"
          onClick={() => api.current?.plant(0.06 + Math.random() * 0.88)}
          disabled={count >= max}
          className="group flex h-11 shrink-0 items-center gap-2 rounded-full bg-blue pl-4 pr-5 text-[14px] font-medium text-paper-light transition-colors duration-300 hover:bg-blue-deep disabled:opacity-40"
        >
          <Plus className="size-4 transition-transform duration-500 ease-out-expo group-hover:rotate-90" strokeWidth={2} />
          Plant a seed
        </button>
      </div>
    </div>
  );
}
