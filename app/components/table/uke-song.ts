/*
 * What the ukulele knows: three chords and a strum, from Gigi Perez's Sailor Song as tabbed for
 * ukulele (G C E A, no capo, 95 bpm). Kept apart from the sound engine so the page can show the
 * chords without loading any audio code.
 */

export const STRINGS = ['G4', 'C4', 'E4', 'A4'] as const;

/** Frets on G C E A. */
export const CHORDS = {
  Emaj7: [1, 3, 0, 2],
  'G#m': [1, 3, 4, 2],
  B6: [1, 3, 2, 2],
} as const;
export type ChordName = keyof typeof CHORDS;
export const CHORD_NAMES = Object.keys(CHORDS) as ChordName[];

/** The intro, then the first two lines of the chorus, a bar of sixteenths per chord, and a last strum to ring out. */
export const SONG = {
  title: 'Sailor Song',
  artist: 'Gigi Perez',
  bpm: 95,
  bars: ['Emaj7', 'Emaj7', 'G#m', 'G#m', 'Emaj7', 'G#m', 'B6', 'B6'] as ChordName[],
  end: 'Emaj7' as ChordName,
  // D an accented down, d down, u up, - a rest
  pattern: 'D-duduD-duduD-du',
};

export type Strum = { dir: 1 | -1; accent: boolean } | null;
export const PATTERN: Strum[] = [...SONG.pattern].map(c => (c === '-' ? null : { dir: c === 'u' ? -1 : 1, accent: c === 'D' }));
