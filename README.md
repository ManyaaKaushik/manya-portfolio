# Manya — A Polymath’s Garden

A Next.js 16 App Router portfolio with React 19, Tailwind CSS v4, Motion and Lenis. Install with `pnpm install`, run `pnpm dev`, and open http://localhost:3001. Build with `pnpm build`; the static export is written to `out/`. `pnpm preview` serves the production export.

## October 19 redesign — the exploded specimen

The opening is a scroll-linked canvas: a 120-frame sunflower specimen separates into florets, disc, petals, bracts, stem and leaves, then reassembles. Four story beats appear in sync with it. All frames preload behind a progress loader first. Below the fold: the selected work (three published case studies with a cursor badge, plus an index of garden studies), the about section as settling diary pages, experiments (WebGL colour field, “what if” prompts, Sakhi voice card, two forthcoming film slots), writing and kind words, then contact with the pixel garden.

Stack: Next.js 16 App Router (static export) · React 19 · TypeScript · Tailwind CSS v4 · Motion · Lenis · Lucide icons · self-hosted Instrument Serif / Instrument Sans / JetBrains Mono (Fontsource).

The adapted prompt (start frame, exploded end frame, motion, code editor) lives in `docs/scrollytelling-prompt.md`. Regenerate frames with `pnpm sequence` (1200px, `public/sequence/`) and `pnpm sequence:small` (760px, `public/sequence/sm/`).

## Source map

- `app/page.tsx`: section order.
- `app/components/HelianthusScroll.tsx`: sticky canvas, frame preloader, camera path, story beats and plate HUD.
- `app/components/{Nav,Work,About,Experiments,Words,Contact}.tsx`: page sections; `ui.tsx` holds shared reveal and heading primitives; `SmoothScroll.tsx` provides Lenis and Motion config.
- `app/lib/content.ts`: links, projects, studies, testimonials and prompts.
- `app/globals.css`: Tailwind theme tokens and base styles.
- `scripts/render-sequence.mjs`: deterministic procedural renderer for the specimen frames.
- `public/assets/`: local images. `public/sequence/`: rendered frames.

No backend or contact database; contact uses mailto. Reduced motion is honoured: Lenis turns off, and Motion reduces transforms. Earlier implementations remain in Git history.

## Visual feedback with Agentation

Agentation is installed as a development dependency. Run `pnpm dev` and use its toolbar to select elements, write notes, and copy structured feedback into your coding agent. Feedback stays in your browser by default; no external endpoint is configured. The toolbar is excluded from production through `NODE_ENV` and loads client-side only. It follows the active specimen dialog so modal content can be annotated.

Setup reference: https://www.agentation.com/install
