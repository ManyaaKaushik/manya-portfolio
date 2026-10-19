'use client';

import { motion, type Variants } from 'motion/react';
import { Children, isValidElement } from 'react';

const EASE = [0.16, 1, 0.3, 1] as const;

export function SunflowerGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse key={i} cx="14" cy="5.2" rx="2.1" ry="4.6" fill="currentColor" opacity="0.92" transform={`rotate(${i * 30} 14 14)`} />
      ))}
      <circle cx="14" cy="14" r="4.6" fill="#24438a" />
    </svg>
  );
}

/** Brand marks are not in Lucide; a single-path LinkedIn glyph drawn to match its 1.75 stroke weight. */
export function LinkedInGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 10.5V16M8 7.75v.01M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6 1.4 0 2.1.9 2.1 2.6V16" />
    </svg>
  );
}

/** Fade-and-rise once the element enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className = '',
  as = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li' | 'p' | 'span' | 'article';
}) {
  const Tag = motion[as];
  return (
    <Tag
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1.1, delay, ease: EASE }}
      className={className}
    >
      {children}
    </Tag>
  );
}

const lineParent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const lineChild: Variants = {
  hidden: { y: '105%' },
  show: { y: '0%', transition: { duration: 1.15, ease: EASE } },
};

/**
 * Headline whose lines rise from behind a mask. Pass each line as a child
 * (strings or elements); <em> children get the italic blue treatment.
 */
export function MaskHeading({
  children,
  as = 'h2',
  className = '',
  id,
}: {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  id?: string;
}) {
  const Tag = motion[as];
  const lines = Children.toArray(children).filter(c => (typeof c === 'string' ? c.trim() : isValidElement(c)));
  return (
    <Tag
      id={id}
      variants={lineParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      className={`display font-serif tracking-[-0.025em] ${className}`}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span variants={lineChild} className="block will-change-transform">
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

export function SectionLabel({ n, children, className = '' }: { n: string; children: React.ReactNode; className?: string }) {
  return (
    <Reveal className={`eyebrow flex items-center gap-3 ${className}`}>
      <span className="text-blue">{n}</span>
      <span className="h-px w-10 bg-line-strong" />
      {children}
    </Reveal>
  );
}
