# Manya — A Polymath's Garden

This is a Next.js 16 App Router project with React 19. Install with `pnpm install`, then run `pnpm dev` and open http://localhost:3001.

Run `pnpm build` for a production build. Next.js exports the portfolio to `out/` for the existing static hosting. Run `pnpm preview` to serve that production export locally.

`app/page.jsx` contains the server-rendered portfolio content. `app/components/` contains the React client components for scrolling, motion preferences, testimonials, and the pixel garden. Shared styles live in `app/world.css`, `app/collections.css`, and `app/responsive.css`, metadata in `app/layout.jsx`, and local images/fonts in `public/assets/`. Effects disconnect observers, listeners, and animation frames on unmount.

Created from Manya's Figma narrative/moodboard and the real content in the existing portfolio export. Existing case studies open at manyaa.me; the original `../site` is preserved. The earlier hand-authored HTML implementation is retained in Git history.

See PRODUCT.md, DESIGN.md and ASSETS.md for content, design decisions and asset provenance. The Sites project identity is tracked in `.openai/hosting.json`; preserve it on later publication.

## Growing garden experience

Lenis drives wheel smoothing and anchor navigation. The journey moves through seed, canopy diary, roots, project specimens, collaborator notes, experimental greenhouse, and hills. Published cases and garden studies are clearly labelled and filterable. Specimen previews open with a color-field zoom and reverse on close; detailed case studies remain at manyaa.me.

The diary uses supplied family photos. Desktop botanical reveals resolve ASCII into pigment into imagery; mobile uses static source art. The WebGL patch runs only on eligible desktop screens while visible and motion is enabled. Pause and OS reduced-motion preferences retain all content and controls.

`REFERENCE-ANALYSIS.md` records the 946-frame ffmpeg review and motion choices.
