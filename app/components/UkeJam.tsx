'use client';

import { motion } from 'motion/react';
import { Pause, Play, X } from 'lucide-react';
import type { JamState, Ukulele } from './table/ukulele';
import { CHORDS, CHORD_NAMES, PATTERN, SONG, type ChordName } from './table/uke-song';

/*
 * What sits under the ukulele while it's in your hands: the three chords of the song, its strum
 * (lit in time as it plays), play and put-it-down. Frosted glass, like the rest of the HUD.
 */

export function UkeJam({ state, uke, night }: { state: JamState; uke: Ukulele; night: boolean }) {
  const glass = night
    ? 'bg-ink/30 text-paper-light shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12),0_12px_32px_-18px_rgb(0_0_0/0.5)]'
    : 'bg-white/40 text-ink shadow-[inset_0_0_0_1px_rgb(255_255_255/0.6),0_12px_32px_-18px_rgb(28_35_51/0.3)]';
  const soft = night ? 'text-paper-light/60' : 'text-ink/50';
  const chip = (on: boolean) => (on ? (night ? 'bg-white/20' : 'bg-white/80 shadow-[0_1px_3px_rgb(28_35_51/0.1)]') : night ? 'hover:bg-white/10' : 'hover:bg-white/45');
  const playing = state.playing;

  return (
    <motion.div
      role="group"
      aria-label="Ukulele"
      initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-auto absolute inset-x-3 bottom-3 mx-auto flex max-w-[540px] flex-col gap-3 rounded-[26px] p-3 backdrop-blur-2xl backdrop-saturate-150 sm:inset-x-6 sm:bottom-6 sm:p-4 ${glass}`}
    >
      <div className="flex items-center gap-3">
        <p className={`min-w-0 flex-1 truncate pl-1 font-mono text-[10.5px] uppercase tracking-[0.13em] ${soft}`}>
          ♪ {SONG.title} <span className="max-sm:hidden">— {SONG.artist}</span>
        </p>
        <button
          type="button"
          onClick={() => (playing ? uke.stop() : uke.play())}
          disabled={state.loading}
          className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${night ? 'bg-white/15 hover:bg-white/25' : 'bg-white/70 hover:bg-white'}`}
        >
          {playing ? <Pause className="size-3.5" strokeWidth={2} /> : <Play className="size-3.5" strokeWidth={2} />}
          {state.loading ? 'Tuning…' : playing ? 'Stop' : state.played ? 'Play again' : 'Play it'}
        </button>
        <button
          type="button"
          onClick={() => uke.close()}
          aria-label="Put the ukulele down"
          className={`flex size-9 items-center justify-center rounded-full transition-colors ${night ? 'hover:bg-white/15' : 'hover:bg-white/60'}`}
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex gap-1 max-sm:justify-between">
          {CHORD_NAMES.map((name, i) => {
            const on = state.chord === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => uke.setChord(name)}
                className={`flex items-center gap-2 rounded-2xl py-1.5 pl-1.5 pr-2.5 transition-colors duration-200 ${chip(on)}`}
              >
                <ChordDiagram chord={name} on={on} />
                <span className="flex flex-col items-start leading-none">
                  <span className="font-serif text-[17px]">{name}</span>
                  <span className={`mt-1 font-mono text-[9.5px] max-sm:hidden ${soft}`}>{i + 1}</span>
                </span>
              </button>
            );
          })}
        </div>
        <Strum step={playing ? state.step : -1} night={night} />
      </div>

      <p className={`pl-1 text-[12.5px] leading-snug ${soft}`}>
        {state.loading
          ? 'Tuning up…'
          : playing
            ? 'Strum along: swipe across the strings.'
            : 'Your turn: swipe across the strings to strum, and pick a chord.'}
        <span className="max-sm:hidden"> Keys: 1 2 3 chords · ↓ ↑ strum · Esc to put it down.</span>
      </p>
    </motion.div>
  );
}

/** Where the fingers go, as on the tab: strings G C E A left to right, frets downwards. */
function ChordDiagram({ chord, on }: { chord: ChordName; on: boolean }) {
  const frets = CHORDS[chord];
  const x = (s: number) => 4 + s * 6;
  const y = (f: number) => 4 + f * 6;
  return (
    <svg viewBox="0 0 26 32" className={`h-8 w-[26px] shrink-0 transition-opacity ${on ? 'opacity-100' : 'opacity-60'}`} aria-hidden="true">
      <line x1="4" y1="4" x2="22" y2="4" stroke="currentColor" strokeWidth="1.6" />
      {[1, 2, 3, 4].map(f => (
        <line key={f} x1="4" y1={y(f)} x2="22" y2={y(f)} stroke="currentColor" strokeOpacity="0.35" strokeWidth="0.8" />
      ))}
      {[0, 1, 2, 3].map(s => (
        <line key={s} x1={x(s)} y1="4" x2={x(s)} y2="28" stroke="currentColor" strokeOpacity="0.55" strokeWidth="0.8" />
      ))}
      {frets.map((f, s) => (f > 0 ? <circle key={s} cx={x(s)} cy={y(f) - 3} r="2.2" className="fill-blue" /> : <circle key={s} cx={x(s)} cy="1.6" r="1.3" fill="none" stroke="currentColor" strokeWidth="0.7" />))}
    </svg>
  );
}

/** The strum, a bar of sixteenths; the one sounding lights up. */
function Strum({ step, night }: { step: number; night: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-end justify-between gap-px px-1 max-sm:px-2" aria-label={`Strum: ${SONG.pattern}`}>
      {PATTERN.map((s, i) => {
        const on = i === step;
        const tone = on ? 'text-blue scale-125' : s ? (night ? 'text-paper-light/55' : 'text-ink/40') : night ? 'text-paper-light/20' : 'text-ink/15';
        return (
          <span key={i} className="flex flex-col items-center gap-1">
            <span className={`text-[13px] leading-none transition-transform duration-100 sm:text-[15px] ${tone} ${s?.accent ? 'font-bold' : ''}`}>{s ? (s.dir > 0 ? '↓' : '↑') : '·'}</span>
            <span className={`font-mono text-[8px] leading-none ${i % 4 === 0 ? (night ? 'text-paper-light/45' : 'text-ink/35') : 'opacity-0'}`}>{i % 4 === 0 ? i / 4 + 1 : '·'}</span>
          </span>
        );
      })}
    </div>
  );
}
