import type { ChapterId } from './timeline';

/**
 * Where each chapter sits down the length of the table (z, in cm). Phones lay things out in a
 * column, so their chapters need more table each.
 */
const LANDSCAPE: Record<ChapterId, number> = { hero: 0, work: 112, journey: 205, play: 296, words: 388, contact: 474, outro: 240 };
const PORTRAIT: Record<ChapterId, number> = { hero: 0, work: 112, journey: 268, play: 390, words: 520, contact: 640, outro: 320 };

export const stationZ = (id: ChapterId, portrait: boolean) => (portrait ? PORTRAIT : LANDSCAPE)[id];

