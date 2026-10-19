'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Mail, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { links, sections } from '../lib/content';
import { SunflowerGlyph } from './ui';
import { scrollToId, useLenis } from './SmoothScroll';

const navItems = sections.filter(s => s.id !== 'top');

export default function Nav() {
  const lenis = useLenis();
  const [active, setActive] = useState<string>('top');
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', y => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > 900 && y > prev + 4 && !open);
    if (y < prev - 4) setHidden(false);
  });

  useEffect(() => {
    const els = sections.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (open) lenis?.stop();
    else lenis?.start();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, lenis]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollToId(lenis, id);
  };

  return (
    <>
      <motion.header
        animate={{ y: hidden ? -96 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 pt-4 md:px-6 md:pt-5"
      >
        <a href="#top" onClick={go('top')} aria-label="Manya — back to the beginning" className="group flex h-11 items-center gap-2 rounded-full pl-1 pr-3">
          <SunflowerGlyph className="size-6 text-gold transition-transform duration-700 ease-out-expo group-hover:rotate-90" />
          <span className="font-serif text-[26px] leading-none tracking-[-0.02em] text-ink">manya</span>
        </a>

        <nav aria-label="Main" className="absolute left-1/2 hidden -translate-x-1/2 md:block">
          <ul className="flex items-center gap-1 rounded-full border border-ink/[0.07] bg-paper-light/75 p-1 shadow-[0_8px_30px_-12px_rgb(28_35_51/0.25)] backdrop-blur-xl">
            {navItems.map(item => (
              <li key={item.id} className="relative">
                {active === item.id && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />
                )}
                <a
                  href={`#${item.id}`}
                  onClick={go(item.id)}
                  aria-current={active === item.id ? 'location' : undefined}
                  className={`relative block rounded-full px-4 py-2 text-[14px] font-medium transition-colors duration-300 ${
                    active === item.id ? 'text-paper-light' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={links.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="group hidden h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium text-ink-soft transition-colors hover:text-ink md:flex"
          >
            <span className="link-underline pb-0.5">Résumé</span>
          </a>
          <a
            href={links.email}
            className="group hidden h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-medium text-paper-light transition-colors duration-300 hover:bg-blue md:flex"
          >
            <Mail className="size-4" strokeWidth={1.75} />
            Let’s talk
          </a>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex size-11 items-center justify-center rounded-full border border-ink/10 bg-paper-light/80 backdrop-blur-xl md:hidden"
          >
            {open ? <X className="size-5" strokeWidth={1.75} /> : <Menu className="size-5" strokeWidth={1.75} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-between bg-paper px-6 pb-10 pt-28 md:hidden"
          >
            <ul className="space-y-1">
              {sections.map((item, i) => (
                <motion.li key={item.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06, duration: 0.7 }}>
                  <a href={`#${item.id}`} onClick={go(item.id)} className="flex items-baseline gap-4 py-2 font-serif text-[48px] leading-none tracking-[-0.02em] text-ink">
                    <span className="font-mono text-[11px] tracking-[0.14em] text-muted">0{i + 1}</span>
                    {item.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-3">
              <a href={links.email} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-medium text-paper-light">
                <Mail className="size-4" strokeWidth={1.75} /> Let’s talk
              </a>
              <a href={links.resume} target="_blank" rel="noopener noreferrer" className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full border border-ink/15 text-[15px] font-medium">
                Résumé
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
