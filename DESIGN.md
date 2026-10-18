---
name: A Polymath's Garden
description: A botanical portfolio connecting curiosity, systems, and empathy.
colors:
  paper: "#f5f4ec"
  ink: "#273426"
  olive: "#59643b"
  muted: "#606657"
  line: "#d8dacb"
  story: "#eceddf"
  collaboration: "#f0eddf"
  reflection: "#e8ebdf"
  experiment: "#e5e9d9"
  footer: "#293c2d"
  footer-text: "#f0f0df"
  footer-accent: "#c6d5a3"
  lavender: "#e7e6f0"
  lavender-ink: "#3d3755"
  sand: "#f0e3d2"
  sand-ink: "#593a32"
  blue: "#e0e7e9"
  blue-ink: "#293e49"
  focus: "#8d542c"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(58px, 7.2vw, 104px)"
    fontWeight: 400
    lineHeight: 0.99
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(45px, 5.1vw, 76px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(40px, 4.2vw, 60px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Instrument Sans, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
rounded:
  image: "9px"
  experiment: "12px"
  project: "16px"
  tag: "25px"
  control: "30px"
  navigation: "50px"
  circle: "50%"
spacing:
  tag-gap: "8px"
  control-gap: "20px"
  navigation-gap: "30px"
  project-gap: "48px"
  section-intro-gap: "70px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.olive}"
  text-link:
    textColor: "{colors.ink}"
    padding: "4px 0 7px"
    typography: "{typography.label}"
  button-round:
    rounded: "{rounded.circle}"
    width: "40px"
    height: "40px"
  project-tag:
    rounded: "{rounded.tag}"
    padding: "4px 10px"
  project-lavender:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.lavender-ink}"
    rounded: "{rounded.project}"
    padding: "55px 4.5%"
  project-sand:
    backgroundColor: "{colors.sand}"
    textColor: "{colors.sand-ink}"
    rounded: "{rounded.project}"
  project-blue:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.blue-ink}"
    rounded: "{rounded.project}"
---

# Design System: A Polymath's Garden

## Overview

**Creative North Star: "A Polymath's Garden"**

Curiosity connects systems and empathy. The visual world feels like an open botanical notebook: warm paper, olive ink, generous serif lettering, real portraiture, and layered plant illustrations. It is personal and exploratory while keeping real design work legible to hiring teams and collaborators.

The Figma brief establishes this world rather than a screen to trace. Botanical collage frames the opening; restrained controls leave room for a native scrolling story. The implemented sequence moves from introduction and journey to real projects, collaborator voices, play, reflection, and contact. Artwork provenance belongs in ASSETS.md; factual claims remain grounded in PRODUCT.md and source material.

**Key Characteristics:**
- Cream paper and muted botanical greens.
- Instrument Serif display lettering paired with Instrument Sans utility text.
- Real portrait and botanical collage with playful pixel experimentation.
- Spacious editorial sections and distinct pastel project surfaces.
- Native scrolling, restrained parallax, and an explicit motion opt-out.

## Colors

The palette is warm, botanical, and low in saturation; project pastels distinguish work without competing with the imagery. Frontmatter owns exact color values.

### Primary
- **Olive:** emphasis within serif headings, progress, and active story markers.
- **Garden Ink:** primary text, solid controls, and underlined links on paper.

### Secondary
- **Lavender / Lavender Ink:** the scam-prevention project surface and text.
- **Sand / Sand Ink:** the Sakhi project surface and text.
- **Pale Blue / Blue Ink:** the Celebto project surface and text.

### Neutral
- **Paper:** page background and light text on solid controls.
- **Muted:** supporting descriptions and metadata.
- **Line:** subtle separators and control boundaries.
- **Story, Collaboration, Reflection, Experiment:** softly differentiated reading and canvas surfaces.
- **Footer, Footer Text, Footer Accent:** deep green contact close with pale text and italic emphasis.
- **Terracotta Focus:** keyboard outlines and small warm navigation accents.

**The Paper and Plant Rule.** Keep botanical color in the framing and emphasis; preserve quiet reading surfaces around body copy and case-study artwork.

## Typography

**Display Font:** Instrument Serif, with Georgia and serif fallbacks.
**Body Font:** Instrument Sans, with Arial and sans-serif fallbacks.

**Character:** Expressive, lightly tracked serif headlines pair with small practical sans-serif descriptions. Italic serif phrases carry curiosity and warmth inside readable headings.

### Hierarchy
- **Display:** opening curiosity heading; frontmatter describes the desktop role. Mobile uses a smaller clamp (49px to 76px with an 11.3vw preferred size), line height (1.02), and tracking (-0.025em).
- **Headline:** major section titles, with composition-specific overrides.
- **Title:** project headlines. Story titles are smaller (38px desktop, 33px mobile).
- **Body:** root reading role. Project descriptions use smaller sizes (14px desktop, 13px mobile); paragraphs generally use generous line heights (1.75–1.9) and constrained column widths.
- **Label:** underlined links and navigation. Metadata and tags are smaller (10–12px desktop); testimonial quotations remain serif (32px desktop, 30px mobile).

The stylesheet requests normal and italic serif text and body weight 400; fonts.css declares only a normal serif face and sans faces at 500/700. These are implementation declarations, not verification of font binaries or complete available weights.

**The Two Voices Rule.** Use serif for expressive narrative and sans-serif for reading, controls, attribution, and metadata.

## Layout

Use full-width color fields with generous percentage insets. Desktop reading inset is approximately 10%; project sections use a wider outer inset (5.3%) and inset their introduction further. Major sections use approximately 110–155px vertical spacing. Story is a two-column composition with a sticky heading; projects pair copy and imagery. Play combines a larger interactive garden and a smaller stack of side projects.

The opening is a sticky viewport within a taller scroll section (150svh desktop, 135svh mobile), containing the serif curiosity heading, real portrait, canopy, flowers, and botanical drawing. At wide screens (1600px and above), portrait and copy shift inward. Tablet (1100px) tightens gaps and padding. At 760px and below, story, projects, testimonials, and play become single-column; typical reading insets are 7–8% with major vertical spacing around 70–85px. The opening retains portrait and botanical framing.

Desktop projects stack at a sticky top offset (100px); mobile projects remain in normal flow with no top offset. The opening keeps a minimum content height (730px desktop, 760px mobile); when motion is paused or reduced, the story overlap is removed to protect reading content. Fixed navigation keeps work and contact accessible. Use native document scrolling, anchor navigation, a passive scroll listener, and requestAnimationFrame updates. A fixed progress rule (3px) tracks reading. Text is present without waiting for entrance animation.

## Elevation & Depth

Depth comes mainly from overlapping botanical assets, tonal section changes, and the sticky project sequence. Shadows give quiet ambient separation. The story field has broad rounded upper corners and overlaps the opening; the portrait sits above a circular paper-toned sun. Plant artwork uses multiply blending; the footer botanical reverses into the dark field.

### Shadow Vocabulary
- **Navigation:** `0 4px 25px #27342606`, almost imperceptible lift behind the fixed pill.
- **Project stack:** `0 -12px 40px #27342608`, separating overlapping surfaces.
- **Project image:** `0 16px 40px #2734260f`, lifting case-study artwork.
- **Active story marker:** `0 0 0 6px #59643b12`, a quiet reading-position halo.

**The Quiet Depth Rule.** Let collage, overlap, and tonal fields establish hierarchy before adding shadows.

## Shapes

Project panels and experiment panels use gently rounded rectangles. Tags and solid controls use compact pills; testimonial controls and story markers are circles. Project images have tighter corners than their containing panels. Links use thin underlines or bottom borders. Story surfaces have broad upper curves (80px desktop, 40px mobile); these are section geometry rather than a universal card radius.

## Components

### Buttons

Solid pills use garden ink with paper text, changing to olive on hover. Navigation contact uses tighter padding. Testimonial controls are transparent circular buttons with a muted hairline and pale green hover fill. Reset actions are quiet underlined text. Shared keyboard focus is a terracotta outline (2px) with generous offset (6px).

### Text Links

Compact sans-serif labels pair with arrows above a thin bottom border. Hover moves arrows slightly upward and right. Case-study links inherit project ink; external destinations and mail links remain actual anchors.

### Chips

Project tags are small transparent pills with a current-color hairline. They describe work and are not interactive filters. Mobile tags reduce padding and type size.

### Cards / Containers

Project panels use paired background and ink colors, a copy-and-image grid, compact tags, serif titles, clear case-study links, and category metadata. Imagery preserves its original aspect ratio and gently enlarges on hover. The pale green pixel garden contains a title, reset action, canvas, live status, and solid planting button; it is explicitly labelled as an original browser experiment.

### Navigation

A small floral brand anchors the upper left; the fixed navigation pill sits at upper right. Links warm on hover and underline when current. Mobile hides the first story link while retaining work, play, and contact. The skip link appears on keyboard focus.

### Story and Testimonials

Story chapters sit beside a thin vertical stem with circular markers; current markers fill and gain a halo. Testimonials use serif quotations, sans-serif attribution, manual previous/next controls, and a polite live region. They do not auto-advance.

### Motion Control

The lower-left pause pill reveals text on hover or keyboard focus and communicates state with aria-pressed. Preference persists locally. Pausing or requesting reduced motion removes opening parallax and desktop project stacking. Brief UI transitions and slower image motion use the garden easing. Keep motion subordinate to reading and do not intercept wheel input.

## Do's and Don'ts

### Do:
- **Do** preserve cream, olive, botanical imagery, and the expressive serif/sans pairing.
- **Do** use real portraiture, real case-study artwork, and provenance recorded in ASSETS.md.
- **Do** keep work and contact accessible through fixed navigation and native anchors.
- **Do** retain readable normal-flow content when motion is paused or reduced.
- **Do** preserve factual biography, project claims, testimonials, and real destinations.

### Don't:
- **Don't** present inspiration posters or the original pixel demo as commissioned client work.
- **Don't** replace native scrolling with intercepted wheel or touch navigation.
- **Don't** hide reading content behind entrance effects.
- **Don't** carry the desktop sticky project stack into the mobile layout.


