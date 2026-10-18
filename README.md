# Manya — A Polymath’s Garden

A Next.js 16 App Router portfolio with React 19 and Lenis. Install with `pnpm install`, run `pnpm dev`, and open http://localhost:3001. Build with `pnpm build`; the static export is written to `out/`. `pnpm preview` serves the production export.

## Updated ASCII editorial edition

The updated Figma board sets warm paper, blue ASCII/dither imagery, and quiet editorial typography. The opening morphs from a friendly introduction into Manya’s Blinkit work. Desktop uses Lenis and a sampled ASCII sunflower. Mobile and motion-off views present both introductions in reading order.

The diary opens from a cover into three spreads: family connections; journey and interests; imaginative stories and supplied notebook drawings. Desktop turns use separate front/back faces and perspective. Mobile and reduced-motion page changes are immediate. Resizing or pausing motion commits any pending turn.

Published cases appear first in the filterable work collection; CAREY, Solis, and SCENERIA remain clearly labelled garden studies. Immersive previews reverse on exit; full published case studies remain at manyaa.me. The experiments area includes a desktop WebGL patch, prompt interaction, Sakhi link, and two honest spaces for forthcoming project videos. Writing links to Manya’s supplied Medium profile. Quiet collaborator notes lead to the click-to-plant footer, which also supports a keyboard planting button.

## Source map

- `app/page.jsx`: server-rendered content and section order.
- `app/components/`: focused client interactions plus server-rendered testimonials.
- `app/world.css`: typography, navigation, introductory morph and diary.
- `app/collections.css`: shared specimen, case and experiment mechanics.
- `app/editorial.css`: current collection, writing and footer presentation.
- `app/responsive.css`: responsive and reduced-motion paths.
- `public/assets/`: local image/font assets. No temporary Figma URLs at runtime.

Effects clean up animation frames, observers, media listeners and GL resources. No backend or contact database; contact uses mailto. The original portfolio is preserved in `../site`, and earlier implementations remain in Git history.

PRODUCT.md records content constraints; DESIGN.md and `.impeccable/design.json` capture the current system. ASSETS.md records image origins. REFERENCE-ANALYSIS.md records the ffmpeg review of both supplied videos (946 and 334 frames). `.openai/hosting.json` retains the existing private Sites project identity.

## Visual feedback with Agentation

Agentation is installed as a development dependency. Run `pnpm dev` and use its toolbar to select elements, write notes, and copy structured feedback into your coding agent. Feedback stays in your browser by default; no external endpoint is configured. The toolbar is excluded from production through `NODE_ENV` and loads client-side only. It follows the active specimen dialog so modal content can be annotated.

Setup reference: https://www.agentation.com/install
