# Scrollytelling prompt — adapted for Manya’s portfolio

The generic “exploding product” prompt, filled in for this site. The product is a **sunflower
specimen (Helianthus annuus)**: Manya’s Polymath’s Garden identity, and a metaphor for product
design as a system of parts. Dark mode became the brand’s warm paper, because the page and
the frames must share one exact background colour.

How it was run: no image or video model was available in this environment, so the sequence is
rendered procedurally from real 3D geometry by `scripts/render-sequence.mjs` (`pnpm sequence`,
`pnpm sequence:small`). The start frame, the exploded end frame and the motion between them
follow the prompts below. The frames are exact, deterministic and edge-matched to the page.
If you later want photoreal frames, run the image and motion prompts in a generator, split the
clip into 120 WebP frames named `helianthus_000.webp … helianthus_119.webp`, and drop them into
`public/sequence/` (1200px) and `public/sequence/sm/` (760px). No code changes are needed.

---

## Start frame prompt

Ultra-premium botanical specimen photography of a sunflower (Helianthus annuus) called
“Helianthus”, standing upright and floating just above a warm paper surface (#f6f4eb),
minimalistic studio shoot.

Warm ivory paper background with a subtle gradient falloff. Soft rim lighting outlines the ray
petals, the domed disc and the stem’s curve. Controlled sheen on the waxy petals, the matte
velvet disc and the fibrous green stem.

Cinematic lighting, gentle contrast, a luxury editorial-botanical aesthetic. Sharp focus,
shallow depth of field. Ochre-gold petals and an ink-blue disc of Fibonacci florets.

No clutter, no text, no logos.

Shot on a medium-format digital camera, 100mm macro lens, f/8, ultra-high resolution,
photorealistic. A museum-catalogue specimen shoot: calm, modern and elegant.

## End frame prompt

Exploded technical diagram view of the same sunflower. Every component is precisely separated
and floating in perfect vertical alignment against the same warm paper (#f6f4eb) studio
background.

Visible internal structure, top to bottom: a dome-shaped cloud of individual disc florets lifted
off the head, the disc plate with its Fibonacci floret sockets, the inner ring of ray petals,
the outer ring of ray petals, the ring of green bracts (phyllaries), the receptacle cup, the stem
cut into three segments, and two leaves drifting outward. Together they show clearly how the
flower is assembled.

Hyper-realistic botanical visualisation, ultra-sharp focus. Studio rim lighting matches the hero
image. Soft highlights trace each component. Controlled reflections on waxy petal, velvet disc
and matte stem surfaces. Gentle contrast, a luxury scientific-illustration aesthetic. A faint
dashed assembly axis is allowed; no labels, no annotations, no text.

Photorealistic, ultra-high resolution, a natural-history-museum industrial design render.
Calm, clean and precise.

## Motion prompt

The head slowly rotates about 90° while the specimen smoothly transitions from assembled to
exploded. It holds the exploded view, then reassembles, in slow motion. Locked-off camera with
a gentle dolly-out while parts separate. 120 frames.

---

## AI code editor prompt (as implemented)

**ACT AS:** a world-class creative developer (Awwwards level) specialising in Next.js, Framer
Motion (`motion`) and high-performance scrollytelling.

**THE TASK:** build a high-end scrollytelling landing page for **Manya Kaushik, a product
designer at Blinkit**. The core mechanic is a scroll-linked animation: an image sequence of a
**sunflower specimen** disassembling into its parts and reassembling as the user scrolls.

**TECH STACK:** Next.js 16 App Router (static export) · Tailwind CSS v4 · Motion
(`motion/react`) · HTML5 Canvas · Lenis smooth scroll · Lucide icons · TypeScript.

**VISUAL DIRECTION & COLOUR**
- Seamless blending: the page background is exactly the frame background, `#f6f4eb`. The
  canvas also feathers the plate edges, so a frame boundary can never show.
- Palette: warm paper, ink `#1c2333`, editorial blue `#365fba`, sunflower gold `#c98f27`.
- Typography: Instrument Serif for display (italic blue emphasis), Instrument Sans for reading,
  JetBrains Mono for figure annotations.
- Text colours: headings in ink, body in `ink-soft` (`#3d4658`).

**IMPLEMENTATION DETAILS**

1. **Sticky canvas.** `HelianthusScroll.tsx`: an outer `h-[400vh]` section, and inside it a
   `sticky top-0 h-svh w-full` canvas that fills the viewport. Rendering is DPR-aware.
2. **Scroll logic.** Load 120 frames named `helianthus_[i].webp` (`i` zero-padded).
   `useScroll` maps progress 0 → 1 to frame 0 → 119, smoothed by a light `useSpring`. Every
   update draws the current frame and cross-dissolves into the next by the fractional index,
   so there is no visible stepping. A camera path moves the plate so it gives way to each
   story beat.
3. **Text overlays.** Fade, rise and un-blur in sync with scroll:
   - 0%, centred: “Hey, I’m *Manya.*” — your friendly neighbourhood product designer.
   - 30%, left: “Every product is *a system of parts.*” The specimen begins separating.
   - 60%, right: “Building for *consumer & enterprise.*” Fully exploded, internals visible.
   - 90%, centred: “Simpler. Clearer. *More human.*” Reassembled. Calls to action: selected
     work and résumé.
4. **Polish & UX.** A loader with a progress spinner while every frame preloads. Scroll stays
   locked until all frames have loaded. The canvas uses a contain fit, with a lighter 760px
   frame set on phones and a fixed square aspect everywhere. There is also a plate HUD (figure
   label, state, frame counter, progress) and corner registration marks.

**OUTPUT:** `app/page.tsx`, `app/components/HelianthusScroll.tsx`, `app/globals.css`, plus the
rest of the redesigned portfolio below the fold.
