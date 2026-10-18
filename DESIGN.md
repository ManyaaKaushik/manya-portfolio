---
name: "A Polymath's Garden"
description: "Blue ASCII botanical curiosity on warm editorial paper."
colors:
  paper: "#f6f4eb"
  ink: "#242f3e"
  blue: "#365fba"
  muted: "#566273"
  line: "#d3d7dd"
  navigation-paper: "#f6f4ebf2"
  diary-field: "#e8edf2"
  diary-cover: "#eee7d5"
  greenhouse: "#e8e5ee"
  writing-field: "#f0eddf"
  writing-paper: "#faf6e9"
  pollinators: "#f4f0e7"
  footer-sky: "#edf1f4"
  seed-paper: "#f6f5eb"
  button-text: "#fffef6"
  button-hover: "#264b9b"
  note-lilac: "#e2e2f0"
  note-butter: "#eee2ad"
  note-rose: "#ecddd2"
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
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(48px, 5.4vw, 78px)"
    fontWeight: 400
    lineHeight: 1.025
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(44px, 5.3vw, 78px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "31px"
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
  artwork: "8px"
  experiment: "12px"
  control: "20px"
  plant: "25px"
  navigation: "28px"
  circle: "50%"
spacing:
  link-gap: "30px"
  navigation-gap: "27px"
  plot-gap: "35px"
  specimen-gap: "50px"
  page-inset: "10%"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.plant}"
    padding: "11px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  text-link:
    textColor: "{colors.ink}"
    padding: "6px 0 9px"
    typography: "{typography.label}"
  navigation:
    backgroundColor: "{colors.navigation-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.navigation}"
    padding: "12px 22px"
  collection-filter:
    textColor: "{colors.muted}"
    padding: "6px 0"
  specimen-label:
    textColor: "{colors.ink}"
    padding: "18px 0 0"
    typography: "{typography.title}"
  pressed-note:
    backgroundColor: "{colors.note-lilac}"
    padding: "38px 30px 100px"
    typography: "{typography.quote}"
  seed-experiment:
    backgroundColor: "{colors.seed-paper}"
    rounded: "{rounded.artwork}"
  diary-control:
    backgroundColor: "#f8f6ef"
    rounded: "{rounded.circle}"
    height: "44px"
    width: "44px"
---

# Design System: A Polymath's Garden

## Overview

**Creative North Star: "A Polymath's Garden"**

A Polymath’s Garden is a personal editorial world on warm paper: blue ink, ASCII and dithered botanical imagery, generous serif headlines, and small, precise sans-serif annotations. Botanical curiosity remains the identity; the current world expresses it through illustrated artifacts and paper rather than literal landscape scenery.

The interface pairs a friendly welcome with professional clarity. Spacious sections hold readable copy, tactile diary pages, quiet work labels, pastel collaborator notes, and a participatory flower garden. Motion creates continuity, while direct Work access and complete static reading paths keep the portfolio useful to hiring teams.

**Key Characteristics:**
- Warm paper and blue editorial emphasis.
- Instrument Serif headlines with Instrument Sans reading and labels.
- Sampled ASCII botanicals, supplied photographs, notebook sketches and dithered cloud artwork.
- Paper depth concentrated in the diary, writing card and collaborator notes.
- Direct navigation, keyboard interaction and lighter mobile and motion-off paths.

## Colors

Warm paper supports cool blue ink and subdued pastel section fields. The frontmatter records current source values; project color pairs remain attached to their own previews.

### Primary
- **Editorial Blue:** wordmark, emphasized serif phrases, actions, growing navigation and focus outlines. The legacy olive CSS alias resolves to this same blue.
- **Blue Hover:** the darker planting-button response.

### Secondary
- **Diary Field / Diary Cover:** cool framing around tactile cream paper.
- **Greenhouse:** a quiet lilac field for experiments.
- **Writing Field / Writing Paper:** warm ground and a lighter folded-paper link.
- **Note Lilac / Note Butter / Note Rose:** individual collaborator papers.
- **CAREY / CAREY Ink, Solis / Solis Ink, SCENERIA / SCENERIA Ink:** paired study preview fields and text.
- **Safety / Safety Ink, Sakhi / Sakhi Ink, Celebto / Celebto Ink:** paired published-case preview fields and text.

### Neutral
- **Paper / Navigation Paper:** the base surface and nearly opaque navigation backing.
- **Ink / Muted:** primary reading and supporting copy.
- **Line:** thin structural rules beneath filters and work labels.
- **Pollinators / Footer Sky / Seed Paper:** testimonial ground, cloud-footer ground and planting canvas container.
- **Button Text:** warm light text on the planting action.

**The Blue Thread Rule.** Use blue for identity, emphasis, navigation and focus; preserve project-specific colors inside their case previews.

## Typography

**Display Font:** Instrument Serif, with Georgia and serif fallbacks.  
**Body Font:** Instrument Sans, with Arial and sans-serif fallbacks.

Local normal-style font files provide the interface typography. Serif italics and em phrases supply a personal voice; compact sans-serif copy carries facts and controls. Monospace appears sparingly in ASCII experiment annotations, not as the body face.

### Hierarchy
- **Display:** the welcome headline uses the frontmatter display role. The professional introduction has its own slightly larger fluid headline (clamp(52px, 5.8vw, 82px)).
- **Headline:** section headings use the fluid headline role, balanced lines and blue em phrases.
- **Title:** work names use the title role; diary page titles are larger (36px with 1.05 line height).
- **Body:** base reading uses the body role; section descriptions generally use compact (12–13px) text with relaxed (1.8–1.85) leading.
- **Label:** navigation and underlined actions use the label role; dates and annotations step down to (9–11px).
- **Quote:** collaborator notes use the serif quote role. Preserve authors and source wording.

## Layout

Read source in cascade order: app/world.css establishes the world, app/collections.css supplies interaction mechanics, app/editorial.css replaces current section presentation, and app/responsive.css resolves viewport and reduced-motion variants. Earlier collection declarations are not independent authority for the current palette or footer.

Desktop uses open editorial compositions, often two columns, with section gutters near the page-inset token. The welcome occupies a sticky viewport inside a longer (250svh; minimum 1700px) scroll section. The sunflower counterbalances copy, and the opening morphs from welcome to professional introduction. A fixed compact top-right navigation gives direct Work access; the right-edge growing marker links the seven actual sections: arrival, about, work, greenhouse, blogs, pollinators and beyond.

The diary is centered at a maximum (1060px) width. Work uses three columns with unboxed labels; experiments use two columns and a two-column forthcoming-film shelf. Writing pairs copy and a rotated paper link. Testimonials use three distinct notes. The footer is an ordinary content section with a two-column planting area, cloud artwork, contact links and signature.

At (1100px) and below, gutters, typography and diary imagery tighten. At (760px) and below, both introductions appear in order, the sticky opening becomes ordinary flow, experiments, films, writing, testimonials and planting become one column, and work retains two columns. Diary pages stack vertically. At (1700px) and above, section gutters widen, generally to (15%). The manual motion-off path and OS reduced-motion path expose both introductions and remove spatial effects; mobile remains readable without desktop canvas animation.

## Elevation & Depth

Depth belongs to paper artifacts. The diary has a creased center, shaded facing pages, separate front/back page faces and perspective; photographs use thin paper borders and slight rotations. Work labels are flat with a thin top rule. Writing paper folds at one corner, while testimonial notes carry restrained shadows, pins and tape.

### Shadow Vocabulary
- **Diary cover:** (15px 22px 45px #26354e2a, inset 8px 0 10px #d6c9ac).
- **Open diary:** (0 20px 55px #243a5622).
- **Writing paper:** (5px 15px 35px #564b3220).
- **Collaborator note:** (0 12px 25px #4e4f3020).

**The Paper Artifact Rule.** Concentrate shadows, small rotations and folds on meaningful paper artifacts; keep work labels and section backgrounds quiet.

## Shapes

Use rectangular editorial surfaces and thin rules as the default. Rounded forms are functional exceptions: compact pill navigation, circular diary arrows, the planting action and lightly rounded interactive panels. The diary cover and spread have asymmetric book corners; its pages retain a center binding. Photographs, stickers and writing paper can rotate slightly without rotating reading copy wholesale. The shader uses a gently rounded rectangle in the current edition, rather than the older arched greenhouse silhouette.

## Components

### Buttons and links
The planting action is a blue pill with warm light text, the frontmatter padding and a desktop minimum target height (44px). Hover darkens it. Underlined actions use thin current-color rules and a small diagonal arrow that shifts on hover. Text controls remain quiet. Keyboard focus is a blue outline (2px) offset (6px); disabled buttons reduce opacity to (.3).

### Navigation
The fixed paper pill groups Work, About and Résumé. It uses the navigation gap and radius tokens, small sans-serif labels and blue hover text. The separate growing marker reveals labels on hover or keyboard focus. Mobile labels appear on focus, avoiding persistent hover tooltips. Growth and motion controls sit quietly at the lower viewport edges.

### Work collection and case previews
Filters are text buttons with an active underline, followed by three desktop specimen columns. Each specimen combines local botanical imagery with a transparent ruled label; hover lifts the item (8px) and settles/enlarges its botanical. Selecting it opens a full-viewport native dialog using the appropriate project field/ink pair. Preview imagery expands and reverses on exit; published-case links retain their external destinations. Studies remain clearly identified as studies.

### Personal diary
A cream rotated cover opens into three spreads, six authored pages: family; journey and interests; imagination and supplied drawings. Desktop uses a stable book position, perspective, paper stacks, distinct front/back faces and a left-bound (180deg) turn. Previous/next arrows and direct contents tabs are available. Mobile, reduced-motion and paused paths switch immediately; resizing or pausing commits any pending turn. Family photographs and artwork remain source assets, not reference-site imagery.

### Experiments and writing
The lilac experiment field contains a desktop WebGL patch, prompt interaction and Sakhi link. Two rectangular film spaces explicitly reserve future footage. The Medium link is a warm folded paper artifact with a restrained hover tilt. No article feed or playable film is implied.

### Collaborator notes and planting
Three pastel papers combine genuine quotes, small source labels, botanical cutouts and pins/tape. The footer uses faint blue dithered cloud artwork above a light planting panel. Canvas planting has a keyboard button equivalent; the reset action is a quiet underlined control. Contact and résumé links remain conventional text actions.

**The Complete Reading Rule.** Both introductions and all diary content remain available when motion is paused, reduced or simplified for mobile.

## Do's and Don'ts

### Do:
- **Do** use the current stylesheet cascade as authority: world, collections, editorial, then responsive.
- **Do** keep blue emphasis, warm paper, local typefaces and generous editorial whitespace.
- **Do** preserve real family photographs, supplied sketches and original project identity colors.
- **Do** keep direct Work navigation, visible focus and keyboard equivalents for planting and diary controls.
- **Do** show forthcoming films as honest placeholders and link writing to the supplied Medium profile.
- **Do** commit pending diary turns when motion pauses or the viewport changes.

### Don't:
- **Don’t** reintroduce the earlier literal canopy, underground roots or hill panorama as the current visual world.
- **Don’t** turn every work item into a raised, rounded dashboard card.
- **Don’t** hide either introduction or diary content behind animation in the static reading path.
- **Don’t** reuse reference website screenshots or posters as portfolio artwork.
- **Don’t** invent case outcomes, endorsements, article titles or unavailable video footage.
