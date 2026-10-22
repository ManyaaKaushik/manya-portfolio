import { clamp, lerp } from './util';

/*
 * The page is one long day at the table. Scroll runs the clock: each chapter holds the camera
 * over a part of the table for a while (its "station"), and between them the camera travels
 * while the sun keeps moving, from morning to late afternoon. The last stretch pulls up over the
 * whole table while the light winds back to the morning, and comes down exactly where the page
 * began, so the scroll can loop without ever getting dark.
 */

export type ChapterId = 'hero' | 'work' | 'journey' | 'pond' | 'words' | 'contact' | 'outro';

type Segment = { id: ChapterId | 'travel'; len: number; hours: [number, number] };

export const SEGMENTS: Segment[] = [
  { id: 'hero', len: 2.6, hours: [7.2, 8.6] },
  { id: 'travel', len: 1.05, hours: [8.6, 9.4] },
  { id: 'work', len: 3.4, hours: [9.4, 11.6] },
  { id: 'travel', len: 1.05, hours: [11.6, 12.2] },
  { id: 'journey', len: 2.4, hours: [12.2, 13.4] },
  { id: 'travel', len: 1.05, hours: [13.4, 13.9] },
  { id: 'pond', len: 2.6, hours: [13.9, 15.0] },
  { id: 'travel', len: 1.05, hours: [15.0, 15.5] },
  { id: 'words', len: 2.2, hours: [15.5, 16.3] },
  { id: 'travel', len: 1.05, hours: [16.3, 16.8] },
  { id: 'contact', len: 2.2, hours: [16.8, 17.3] },
  // the light eases back to the morning while the camera floats over the table: it stays day
  { id: 'outro', len: 2.6, hours: [17.3, 7.2] },
];

/** Scroll length of the whole day, in viewport heights. */
export const DAY_LENGTH = SEGMENTS.reduce((s, x) => s + x.len, 0);

const starts: number[] = [];
{
  let acc = 0;
  for (const s of SEGMENTS) {
    starts.push(acc / DAY_LENGTH);
    acc += s.len;
  }
}

export function locate(p: number) {
  const x = ((p % 1) + 1) % 1;
  let i = SEGMENTS.length - 1;
  while (i > 0 && starts[i] > x) i--;
  const u = clamp((x - starts[i]) / (SEGMENTS[i].len / DAY_LENGTH));
  return { index: i, segment: SEGMENTS[i], u };
}

/** Hour of the day, 0–24 (wraps past midnight). */
export function hourAt(p: number) {
  const { segment, u } = locate(p);
  return lerp(segment.hours[0], segment.hours[1], u) % 24;
}

/**
 * Where a chapter is in its life: −1 → 0 while the camera travels in, 0 → 1 while it holds,
 * 1 → 2 while it travels away. Clamped outside that.
 */
export function phase(p: number, id: ChapterId) {
  const i = SEGMENTS.findIndex(s => s.id === id);
  const x = ((p % 1) + 1) % 1;
  const a = starts[i];
  const b = a + SEGMENTS[i].len / DAY_LENGTH;
  const before = SEGMENTS[i - 1];
  const after = SEGMENTS[i + 1];
  if (x < a) {
    if (!before || before.id !== 'travel') return -1;
    const t0 = a - before.len / DAY_LENGTH;
    return clamp((x - t0) / (a - t0)) - 1;
  }
  if (x <= b) return (x - a) / (b - a);
  if (!after || after.id !== 'travel') return 2;
  const t1 = b + after.len / DAY_LENGTH;
  return 1 + clamp((x - b) / (t1 - b));
}

/** Scroll progress at which a chapter's hold begins (plus an optional fraction into it). */
export function progressOf(id: ChapterId, into = 0) {
  const i = SEGMENTS.findIndex(s => s.id === id);
  return starts[i] + (SEGMENTS[i].len / DAY_LENGTH) * into;
}

export const CHAPTER_LABELS: Record<ChapterId, string> = {
  hero: 'Morning chai',
  work: 'Work hours',
  journey: 'Lunch break',
  pond: 'By the pond',
  words: 'Golden hour',
  contact: 'Late afternoon',
  outro: 'Back to the morning',
};

export function clockLabel(h: number) {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  const am = hh < 12;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${am ? 'am' : 'pm'}`;
}
