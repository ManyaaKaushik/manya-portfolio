/*
 * Scroll ranges (0..1 through the intro section) for each stop on the flower tour. Kept apart
 * from scene.ts so the page can use them without pulling three.js into the main bundle.
 * The camera shots in scene.ts are keyed to these.
 */
export const STOPS = {
  hero: [0, 0.08],
  bloom: [0.12, 0.19],
  work: [0.24, 0.34],
  words: [0.44, 0.54],
  about: [0.64, 0.74],
  back: [0.82, 0.9],
  outro: [0.9, 1],
} as const;
