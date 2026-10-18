---
name: "A Polymath's Garden"
description: "A personal botanical world where scroll is time and time is growth."
colors:
  paper: "#f4f2e8"
  ink: "#2c3928"
  olive: "#576642"
  muted: "#5e6856"
  soil: "#343226"
  line: "#cdd1bb"
  focus: "#a65d3a"
  canopy: "#b9c39d"
  specimen-paper: "#f7f3e6"
  pollinators: "#eeeddd"
  greenhouse: "#dce4ca"
  seed-paper: "#eef0df"
  plant-button: "#3c5334"
  plant-button-hover: "#647b47"
  plant-button-text: "#f3f2df"
  note-lilac: "#e2dfeb"
  note-butter: "#eee3ad"
  note-rose: "#edddd0"
  root-text: "#f0ead5"
  hill-sky: "#9fc0ca"
  carey: "#e3dfed"
  carey-ink: "#4d405f"
  solis: "#efe3af"
  solis-ink: "#605224"
  sceneria: "#dce8d3"
  sceneria-ink: "#354d38"
  safety: "#e7e6f0"
  safety-ink: "#3d3755"
  sakhi: "#efe0d3"
  sakhi-ink: "#593a32"
  celebto: "#dce7eb"
  celebto-ink: "#293e49"
  navigation-paper: "#f4f2e8ed"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(44px, 5.8vw, 86px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(44px, 5vw, 76px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  quote:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.01em"
rounded:
  tooltip: "4px"
  artwork: "8px"
  experiment: "12px"
  control: "20px"
  plant: "25px"
  navigation: "30px"
  circle: "50%"
spacing:
  link-gap: "30px"
  navigation-gap: "28px"
  plot-gap: "32px"
  specimen-gap: "65px"
  page-inset: "10%"
components:
  button-primary:
    backgroundColor: "{colors.plant-button}"
    textColor: "{colors.plant-button-text}"
    rounded: "{rounded.plant}"
    padding: "11px 18px"
  button-primary-hover:
    backgroundColor: "{colors.plant-button-hover}"
  text-link:
    textColor: "{colors.ink}"
    padding: "5px 0 8px"
    typography: "{typography.label}"
  navigation:
    backgroundColor: "{colors.navigation-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.navigation}"
    padding: "12px 24px"
  collection-filter:
    textColor: "{colors.muted}"
    padding: "6px 0"
  specimen-label:
    backgroundColor: "{colors.specimen-paper}"
    padding: "18px 20px"
  pressed-note:
    backgroundColor: "{colors.note-lilac}"
    padding: "38px 30px 100px"
    typography: "{typography.quote}"
  seed-experiment:
    backgroundColor: "{colors.seed-paper}"
    rounded: "{rounded.experiment}"
  diary-control:
    rounded: "{rounded.control}"
    padding: "5px 9px"
---

# Design System: A Polymath's Garden

## Overview

**Creative North Star: "A Polymath's Garden"**

A personal botanical world where scroll is time and time is growth. Warm paper, olive ink, family photographs, dithered plants and quiet editorial type make the portfolio feel like a diary discovered inside a garden. Nature provides the setting: leaves overhead, roots below, flowers and grass in the foreground, then a green hill under blue sky and clouds.

The garden moves through seed arrival, canopy diary, underground roots, herbarium work, pressed collaborator notes, an experimental greenhouse and the hills beyond. Continuous dawn-to-noon atmosphere and warm late-afternoon landscape light hold the scenes together. Hiring teams can skip directly to Work; fixed navigation and the growing vine keep the story navigable. The Orto Botanico di Padova inspiration remains explicit. Asset provenance belongs in ASSETS.md and factual claims remain grounded in PRODUCT.md.

**Key Characteristics:**
- Warm personal diary with real family photographs.
- Quiet Instrument Serif and Instrument Sans editorial hierarchy.
- ASCII, sampled pigment, dithered botanical collage, pixel planting and shader light.
- A continuous natural environment with scroll-linked growth.
- Direct Work access, keyboard navigation, lighter mobile scenes and readable motion-off flow.

## Colors

Warm paper and low-saturation botanical greens are the ground; soil introduces depth, small paper pastels carry personal notes, and specimen colors expand into case-study fields. Frontmatter owns the exact values extracted from the implementation.

### Primary
- **Garden Ink:** primary copy and link borders on light surfaces.
- **Olive:** expressive emphasis and botanical identity.
- **Plant Button / Plant Button Hover / Plant Button Text:** the compact planting action and its hover state.

### Secondary
- **CAREY / CAREY Ink, Solis / Solis Ink, SCENERIA / SCENERIA Ink:** paired fields and text for supplied garden studies.
- **Safety / Safety Ink, Sakhi / Sakhi Ink, Celebto / Celebto Ink:** paired fields and text for published case studies.
- **Note Lilac, Note Butter, Note Rose:** quiet collaborator paper slips, distinct from the project palette.

### Neutral
- **Paper, Navigation Paper, Specimen Paper, Seed Paper:** reading ground, translucent fixed navigation, herbarium labels and planting canvas shell.
- **Muted and Line:** supporting descriptions and subtle boundaries; retain the actual context-specific borders rather than forcing every hairline to one color.
- **Soil and Root Text:** underground narrative contrast.
- **Canopy, Pollinators, Greenhouse and Hill Sky:** environmental chapter fields.
- **Terracotta Focus:** the shared keyboard outline.

**The Paper and Plant Rule.** Keep botanical color in the framing and emphasis; preserve quiet reading surfaces around body copy and case-study artwork.

## Typography

**Display Font:** Instrument Serif, with Georgia and serif fallbacks.
**Body Font:** Instrument Sans, with Arial and sans-serif fallbacks.
**Label/Mono Font:** system monospace only for ASCII textures and experimental marks.

**Character:** Restrained editorial serif headings and italic phrases carry warmth. Small practical sans-serif copy, attribution and controls keep the scenic world usable. Avoid making the narrative look like a dashboard.

### Hierarchy
- **Display:** arrival heading. Mobile uses a smaller clamp (41px, 10.5vw, 63px) with tighter composition-specific tracking (-0.025em).
- **Headline:** major chapter headings; individual scenes adjust the size to fit the composition.
- **Title:** the herbarium label name. Diary titles use a larger serif role (34px, 1.05 line height); underground story titles use (42px, 1.05).
- **Body:** page base. Most chapter descriptions use smaller contextual sizes (11–13px) and generous leading (1.8–1.85); overlay descriptions use (15px, 1.9) and a constrained width (430px).
- **Label:** underlined links. Fixed navigation is (12px); metadata is typically (9–11px).
- **Quote:** pressed-note quotations. Mobile increases these to (30px, 1.22).

Instrument Sans declares normal weights (400–700); Instrument Serif declares normal weight (400). Italics are requested in CSS; do not infer an additional installed italic font face.

**The Two Voices Rule.** Use serif for expressive narrative and sans-serif for reading, controls, attribution, and metadata.

## Layout

Compose a continuous vertical landscape rather than a repeated card grid. Wide chapter insets are typically (8–10%); diary width is the smaller of (980px) and (74%). The canopy introduction is constrained to (1050px, 78%). Give imagery and quiet reading columns their own space. Desktop specimens use three columns with a staggered center column; greenhouse plots use two columns; collaborator notes form three loosely rotated slips.

Arrival, canopy and hill scenes pin to a viewport while their parent advances through scroll time. Their desktop scroll lengths are (280svh), (210svh) and (185svh), with minimum scene heights protecting copy. The root journey is an alternating path; project details open into a full-screen native dialog with a two-column hero and independent scrolling.

At the tablet breakpoint (1100px), reduce insets, gaps and imagery. At mobile (760px and below), all three scenes return to normal document flow; the diary, root journey, notes, greenhouse and detail hero become single-column. Specimens retain two columns. Mobile reading insets are usually (8–9%), with generous chapter padding (65–85px). At wide screens (1700px and above), enlarge the diary and adjust arrival placement.

Lenis smooths wheel scrolling and anchor travel with lerp (.085); touch remains native. The shared scroll state drives local scene time, daylight and a vine that remembers the furthest position reached during the visit. The fixed top navigation and opening Work skip preserve a fast route for hiring teams. The vine exposes all seven chapter anchors and reveals labels on hover or keyboard focus.

Mobile uses the original static botanical images and a static shader field. Pausing motion or requesting reduced motion removes spatial scroll effects and pinned scene lengths without hiding the narrative. The pause preference persists locally. Preserve native anchors, dialog keyboard behavior and a visible skip-to-content link on focus.

## Elevation & Depth

Depth comes from natural overlap, layered plant collage, sampled pigment resolving into image, canopy light, paper folds, roots and the final landscape reveal. Shadows belong to tactile paper objects and artwork. The navigation uses translucent paper and a faint border rather than the previous navigation shadow. Multiply blending lets botanical images sit inside their environment.

### Shadow Vocabulary
- **Diary book:** (0 25px 65px #28392130, 0 4px 8px #28392118), lifting the open spread.
- **Diary photograph:** (0 7px 18px #53472a26), separating a physical photo print.
- **Specimen label:** (0 9px 18px #3c4d2710), a restrained herbarium tag shadow.
- **Pressed note:** (0 12px 25px #4e4f3020), separating pinned paper slips.
- **Case artwork:** (0 15px 45px #3c352f18), supporting project images in the overlay.

**The Quiet Depth Rule.** Let collage, overlap, and tonal fields establish hierarchy before adding shadows.

## Shapes

Use rectilinear paper and organic environment silhouettes together. Herbarium tags and pressed notes have square corners; do not restore the previous rounded project panels. The book has asymmetrical binding corners (3px 14px 14px 3px), becoming tighter on mobile. Small experiment panels use softly rounded corners. The shader plot has an arched greenhouse silhouette (140px 140px 12px 12px), reduced on mobile (110px 110px 10px 10px). Pills are reserved for compact controls and fixed navigation. Thin current-color underlines identify text actions; roots, leaf silhouettes, circular pins and curved soil banks carry the organic geometry.

## Components

### Buttons and Text Links

Primary planting actions use the green pill and small sans-serif label. Underlined text actions pair a small label with an arrow that shifts up and right on hover (3px). Quiet reset buttons are text-only underlines. Diary navigation is manual and uses small translucent paper pills. Shared keyboard focus is a terracotta outline (2px) offset from the control (6px).

### Navigation

The serif wordmark sits above the opening; a fixed translucent paper pill holds About, Work and Résumé. Mobile tightens this pill while retaining all three routes. A separate fixed vine places seven leaf anchors along a growing stem; the current leaf darkens and enlarges, with labels shown on hover and focus. Bottom growth status and motion controls stay small and quiet.

### Herbarium Specimens and Filters

Text collection filters use aria-pressed, a small active underline and no pill shell. Each specimen is a button combining a dithered botanical with a square paper tag, serif name, practical category and explicit collection label. Hover lifts the specimen (-8px), straightens the plant and gently enlarges it (1.06). Filterable published case studies remain distinct from garden studies.

Selecting a specimen opens a native modal dialog using that specimen's paired color field and ink. Its reveal expands from the selected plant; motion-off paths open directly. Retain Escape handling, focus return, a visible Back to the garden control and independent overlay scrolling. Published projects link to real case studies; studies invite a conversation.

### Canopy Diary

An open paper spread layers real family photographs, captions, small stickers and italic margin notes over a softly lit canopy. Manual previous/next controls change the spread. The brief page-turn animation uses the garden easing; mobile stacks the two paper pages and suppresses the spatial scene transform.

### Pressed Notes

Collaborator quotations live on lilac, butter and rose paper, gently rotated with a pin or tape and pressed botanical accents. They remain simultaneously readable; there is no automatic testimonial carousel.

### Greenhouse Experiments

The arched color field responds to pointer movement and offers a light-palette change. Desktop WebGL runs only while visible and stops when hidden; mobile, reduced-motion and unavailable-WebGL paths show a static color field. Pixel planting, reset and a keyboard-accessible planting button sit inside a pale panel with a clear original-experiment label. Keep this craft vocabulary connected to the garden rather than presenting it as client work.

## Do's and Don'ts

### Do:
- **Do** preserve the garden world, warm paper, botanical greens and expressive serif/sans pairing.
- **Do** use real family photographs and case-study artwork with provenance recorded in ASSETS.md.
- **Do** retain fixed navigation, direct Work anchors and the published-case-study filter.
- **Do** preserve all reading content and functional controls when motion is paused or reduced.
- **Do** label supplied garden studies and original browser experiments honestly.

### Don't:
- **Don't** turn the garden into unrelated panels with disconnected entrance effects.
- **Don't** obscure copy with plants, textures or animated layers.
- **Don't** carry desktop sticky scenes, botanical canvas resolution or animated shader rendering into the mobile layout.
- **Don't** invent project outcomes, endorsements or process detail.
- **Don't** require animation, hovering or a long scroll to reach the published work.
