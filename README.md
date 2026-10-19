# Manya — A Polymath’s Garden

A Next.js 16 App Router portfolio with React 19, Tailwind CSS v4, Motion and Lenis. Install with `pnpm install`, run `pnpm dev`, and open http://localhost:3001. Build with `pnpm build`; the static export is written to `out/`. `pnpm preview` serves the production export.

## October 19 redesign — the living sunflower

The opening is a real-time three.js sunflower (*Helianthus annuus*), generated entirely in code with no model files. It starts as a closed green bud. As you scroll, the phyllaries peel back and the ray petals unfurl, while 1,100 disc florets fill the head in Fibonacci spirals (golden angle). The camera travels keyframed shots in step with the four story beats: bud, full-bloom close-up, a turn round the back, then a front-on view facing the sun. Herbarium callouts are pinned to points on the flower.

The motion is spring physics. The head and stem behave like a double pendulum, so a fast scroll makes the flower nod, overshoot and dangle back. Each petal and leaf has its own spring and flutters in the scroll “wind”. The pointer tilts the head slightly. The flower casts a soft shadow onto the page, and pollen drifts through the light. three.js is loaded on demand behind a short loader.

Below the fold:
- the selected work: three published case studies with a cursor badge, plus an index of garden studies;
- the about section, as settling diary pages;
- experiments: a WebGL colour field, “what if” prompts, the Sakhi voice card and two forthcoming film slots;
- writing and kind words;
- contact, with the pixel garden.

Stack: Next.js 16 App Router (static export) · React 19 · TypeScript · Tailwind CSS v4 · three.js · Motion · Lenis · Lucide icons · self-hosted Instrument Serif / Instrument Sans / JetBrains Mono (Fontsource).

## Tuning the sunflower

Under `pnpm dev`, a collapsible **Sunflower · dev** panel (lil-gui) sits at the top right. It is never loaded in production builds. It has sliders for:
- bloom timing;
- scroll and pointer sensitivity, wind, flutter and spring stiffness and damping for the head, stem and petals;
- petal shape and colours;
- lighting and camera.

Also in the panel:
- **Pin scroll position** freezes the flower at any point in the bloom.
- **Flick** fakes a fast scroll, so you can test the dangle.

Edits persist in localStorage. **Copy changed values** copies a JSON diff to the clipboard, ready to paste into `DEFAULT_PARAMS` in `app/components/sunflower/scene.ts`.

## Source map

- `app/page.tsx`: section order.
- `app/components/SunflowerScroll.tsx`: sticky hero, loader, story beats, callouts and plate HUD.
- `app/components/sunflower/devPanel.ts`: the development-only tweak panel.
- `app/components/sunflower/scene.ts`: the procedural sunflower (tunables in `DEFAULT_PARAMS`). It holds geometry (petals, florets, bracts, stem, leaves), springs and scroll physics, camera shots, lighting and shadow, and pollen.
- `app/components/{Nav,Work,About,Experiments,Words,Contact}.tsx`: page sections. `ui.tsx` holds shared reveal and heading primitives. `SmoothScroll.tsx` provides the Lenis and Motion config.
- `app/lib/content.ts`: links, projects, studies, testimonials and prompts.
- `app/globals.css`: Tailwind theme tokens and base styles.
- `public/assets/`: local images.

No backend or contact database; contact uses mailto. Reduced motion is honoured: Lenis turns off, and Motion reduces transforms. Earlier implementations remain in Git history.

## Visual feedback with Agentation

Agentation is installed as a development dependency. Run `pnpm dev` and use its toolbar to select elements, write notes, and copy structured feedback into your coding agent. Feedback stays in your browser by default; no external endpoint is configured. The toolbar is excluded from production through `NODE_ENV` and loads client-side only. It follows the active specimen dialog so modal content can be annotated.

Setup reference: https://www.agentation.com/install
