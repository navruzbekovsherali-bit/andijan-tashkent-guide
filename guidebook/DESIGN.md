---
name: Hamkorbank Guidebook
description: The bank's welcome for newcomers, built the way Registan tilework is built, in Hamkorbank's own greens.
colors:
  g-night: "#0c201e"
  g-deep: "#103a40"
  g-pine: "#14403a"
  g-teal: "#0b6b5b"
  g-teal-hi: "#2fc4a4"
  g-emerald: "#087a50"
  g-mint: "#1de38a"
  dock-tile: "#12302c"
  white: "#ffffff"
  ink: "#0b1f1d"
  ink-2: "#33504b"
  ink-3: "#4f6964"
  rule: "#d3e0dd"
  tint: "#edf4f2"
  warn: "#c2283f"
  warn-soft: "#f9e6e9"
typography:
  display:
    fontFamily: "Tektur Variable, Geologica Variable, system-ui, sans-serif"
    fontSize: "clamp(2.3rem, 1.6rem + 5.2vw, 5.6rem)"
    fontWeight: 750
    lineHeight: 1.02
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 88"
  headline:
    fontFamily: "Tektur Variable, Geologica Variable, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 1.4rem + 2.6vw, 3.4rem)"
    fontWeight: 750
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  statement:
    fontFamily: "Tektur Variable, Geologica Variable, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 1.4rem + 2.6vw, 3.4rem)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 92"
  title:
    fontFamily: "Tektur Variable, Geologica Variable, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.3rem + 1vw, 2.1rem)"
    fontWeight: 700
    lineHeight: 1.12
  subtitle:
    fontFamily: "Geologica Variable, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)"
    fontWeight: 650
    lineHeight: 1.12
  lead:
    fontFamily: "Geologica Variable, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Geologica Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "Geologica Variable, system-ui, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Tektur Variable, Geologica Variable, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.2
  data:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    fontSize: "0.78rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.01em"
rounded:
  none: "0px"
spacing:
  m1: "8px"
  m2: "16px"
  m3: "24px"
  m4: "32px"
  m6: "48px"
  m8: "64px"
  m9: "72px"
  gutter: "16px"
  tap: "48px"
  header: "60px"
  dock: "64px"
  measure: "66ch"
  wrap: "1160px"
components:
  button-primary:
    backgroundColor: "{colors.g-night}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "52px"
  button-ghost:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "12px 22px"
    height: "52px"
  door:
    backgroundColor: "{colors.g-emerald}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "16px 18px"
    height: "84px"
  door-mint:
    backgroundColor: "{colors.g-mint}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "16px 18px"
    height: "84px"
  chip:
    textColor: "{colors.white}"
    typography: "{typography.data}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
    height: "30px"
  chip-stamp:
    backgroundColor: "{colors.white}"
    textColor: "{colors.g-night}"
    typography: "{typography.data}"
    rounded: "{rounded.none}"
    padding: "4px 12px"
    height: "30px"
  dock:
    backgroundColor: "{colors.dock-tile}"
    textColor: "{colors.white}"
    rounded: "{rounded.none}"
    padding: "6px"
    height: "64px"
  segmented:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.none}"
    padding: "4px"
    height: "46px"
  segmented-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
  search-field:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "56px"
  guide-bubble:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px 18px"
  note-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px 18px"
  chapter-head:
    backgroundColor: "{colors.g-teal}"
    textColor: "{colors.white}"
    typography: "{typography.subtitle}"
    height: "56px"
---

# Design System: Hamkorbank Guidebook

## Overview

**Creative North Star: "Girih of Registan"**

The guidebook is built the way Samarkand and Registan tilework is built: first a construction grid, then compass arcs, then the eight-point star-and-cross (khatam) tiles that fill the plane exactly. That one geometry is the whole system. It draws the masthead rosettes, the tile bands along every masthead edge, the guide character's body, the bullet of every list and table of contents, the rule in prose, and the cover that closes over the screen when you change page. The owner pinned the Hamkorbank logo and its greens on 27.10.2026, so the Registan glazes are the bank's greens: night green-black through deep, pine, teal and emerald to glowing mint, with the logo's corner light. White is the only relief colour; green-black ink carries the words.

Every chapter of the newcomer's route owns one glaze and shows it as a flat, saturated field: the masthead, the header while you are on that masthead, the sticky chapter heading, the next-step pager and the page cover all take the same field. Reading never happens on colour: under the masthead the page turns to a calm white column at 18px with a 66ch measure. Controls are cut, not rounded: every button, chip, tile, sheet and dock carries 45-degree chamfered corners. Motion explains construction (lines draw, then tiles set) and progress (rails fill, stars turn); with reduced motion everything lands in its final state.

The system rejects the category default it was chosen against: grey ground, shadowed cards, rounded icon tiles, gradient heroes. Depth comes from field against white, never from shadow.

**Key Characteristics:**
- One geometry (8-point star-and-cross khatam) for art, markers, guide, cover and progress.
- Six chapter glazes as flat fields; white reading column; green-black ink.
- 45-degree chamfers on every control; no rounded corners in the site's own UI.
- Tektur for voice, Geologica for reading, JetBrains Mono for data.
- Phone first: dock under the thumb, header that steps aside while reading, 48px taps.
- Motion constructs and reports progress; reduced motion lands every element in its final state.

## Colors

Hamkorbank's green ramp from night to mint, white, and green-black ink; red exists only for warnings.

### Primary
- **Night Glaze** (g-night): the bank's ground and the home field. Home masthead, home FAQ field, footer-adjacent dark, theme-color meta, guide's heart. White on it reads at 16.9:1.
- **Glowing Mint** (g-mint): the logo's light. Star tiles on dark fields, the expat door and expat hub field, the reading-progress bar, focus ring, text selection, active dock item, journey markers on dark. Never used as text on white (1.7:1).

### Secondary
- **Deep Glaze** (g-deep): FAQ field and the "help" chapter route line.
- **Pine Glaze** (g-pine): the 404 field and the fifth route line.
- **Teal Glaze** (g-teal): second route line; also the field-ink (links, step numbers, markers) of deep, pine and teal fields on white.
- **Emerald Glaze** (g-emerald): local-candidate door and hub, third route line; the field-ink of night, emerald and mint fields on white; guide name, caret, tip callout marker.
- **Teal Light** (g-teal-hi): tile colour only (star tiles on deep, heart tiles), never a field and never text.

### Tertiary
- **Warning Red** (warn) on **Warning Blush** (warn-soft): only for "Важно" callouts, error states and the guide's warning bubble. Never decorative.

### Neutral
- **White** (white): the reading ground, sheets, prev-pager, guide bubble on phones, and the header once you scroll past the masthead.
- **Green-black Ink** (ink): body text, active segment, skip link, phone-demo frame.
- **Ink 2** (ink-2): secondary text on white (FAQ answers, leads under the masthead), 8.8:1.
- **Ink 3** (ink-3): tertiary text (step leads, search snippets, TOC idle), 5.9:1. The floor for text on white.
- **Rule** (rule): 1px hairlines between list rows, FAQ items, idle journey and TOC stars.
- **Tint** (tint): quiet fills on white: segmented controls, search field.
- **Dock Tile** (dock-tile): the phone dock only.

### Glaze fields

Each `data-glaze` value resolves a full field kit, so a component never picks colours itself; it reads `--field`, `--on-field`, `--on-field-2`, `--field-ink`, `--field-soft` and the tile set. Route lines map to glazes in this order: night, teal, emerald, mint, pine, deep.

| glaze | field | on-field | on-field-2 | field-ink (on white) | field-soft | star tile | alt tile | heart tile | cross tile | line |
|---|---|---|---|---|---|---|---|---|---|---|
| night | g-night | #fff | #c3dbd5 | g-emerald | #e3efec | g-mint | #fff | g-teal-hi | #081614 | mint 50% |
| deep | g-deep | #fff | #c6e0e2 | g-teal | #e2eff0 | g-teal-hi | g-mint | #fff | #0a2a2f | teal-hi 55% |
| pine | g-pine | #fff | #c9e0da | g-teal | #e3efeb | g-mint | #fff | g-teal-hi | #0c2d28 | mint 45% |
| teal | g-teal | #fff | #d2efe8 | g-teal | #e0f1ed | g-mint | #fff | g-night | #08544a | white 45% |
| emerald | g-emerald | #fff | #d3f1e3 | g-emerald | #e0f3ea | g-mint | #fff | g-night | #066140 | white 45% |
| mint | g-mint | ink | #12382c | g-emerald | #ddf9ec | g-night | #fff | g-teal | #17c87a | ink 35% |

Each field also carries a `--glow` (the logo's corner light, 25-45% alpha) used only by the masthead's corner light.

### Named Rules

**The Bank Greens Rule.** The palette is the Hamkorbank ramp plus white and ink. A new colour must come from a glaze field's kit; there are no greys, blues or purples.

**The One Field Rule.** A surface is either one flat glaze field or white. Fields do not mix, stripe or gradient into each other; the only light on a field is the corner light in its top-right corner.

**The Red Means Danger Rule.** Warning Red appears only where the reader must not miss something. Never as an accent, never on a field.

## Typography

**Display Font:** Tektur Variable (with Geologica Variable, system-ui)
**Body Font:** Geologica Variable (with system-ui)
**Label/Mono Font:** JetBrains Mono Variable (with ui-monospace)

**Character:** Tektur's chamfered letterforms are the same cut as the controls, so headlines read as tilework; Geologica is a calm, open reading face that holds Cyrillic and Uzbek Latin well; JetBrains Mono marks facts that are data (dates, counts, step numbers).

### Hierarchy
- **Display** (750, clamp 2.3rem to 5.6rem, line-height 1.02, width 88%): the home greeting only, white on night, lower left, max 11ch on phones and 15ch on wide screens.
- **Headline** (750, step-3 clamp 1.9rem to 3.4rem, 1.02): hub, FAQ, 404 and article titles in the masthead (max 16-20ch); the next-step pager title (700, 1.05).
- **Statement** (600, step-3, 1.12, width 92%): the home manifesto that reads itself word by word.
- **Title** (700, step-2 clamp 1.5rem to 2.1rem, 1.12): block titles and prose h2.
- **Subtitle** (Geologica 650 or Tektur 700, step-1 clamp 1.25rem to 1.5rem): prose h3, sticky chapter headings (Tektur), sheet titles (Tektur).
- **Lead** (400, step-1, 1.4): masthead leads in on-field-2, max 34ch (46ch in articles).
- **Body** (400, 1.125rem / 18px, 1.6): all reading, max 66ch.
- **Body small** (400, 0.95-0.98rem, 1.45): tile leads, step leads, snippets, door leads.
- **Label** (Tektur 700, 1.2-1.3rem): door titles, tile titles, nav group titles, drawer FAQ link, brand.
- **Data** (JetBrains Mono 500-600, 0.78-0.9rem): chips (date checked, reading time), chapter counts, step numbers, ordered-list markers, phone-demo digits.

### Named Rules

**The Eighteen Rule.** Reading text is 18px Geologica at 1.6 line-height, never smaller than 0.95rem for any sentence a reader must act on, and never wider than 66ch.

**The Three Voices Rule.** Tektur speaks, Geologica explains, Mono states facts. Do not set paragraphs in Tektur or headings in Mono.

## Layout

- **Module:** 8px (`--m`). Vertical rhythm between blocks uses 24, 32, 48, 64, 72 and 88px; inner padding uses 16-28px.
- **Container:** `min(100% - 32px, 1160px)`, a 16px gutter on phones.
- **Breakpoints:** 560px (phone demo goes two-column), 720px (doors side by side, masthead art moves right behind a fade), 900px (popular tiles become three columns), 960px (header nav and actions appear, dock disappears, sheets become side panels), 1040px (article gets a 260px sticky table of contents, article masthead art shows).
- **Phone home:** the rosette fills the top of the night field, the display greeting sits lower left, the two doors wait full width at thumb height above the dock. Masthead height is `100svh - header`.
- **Article:** chapter-colour masthead with crumbs, title, lead and chips, a tile band along its lower edge, then the white reading column; a journey rail runs down the left of the prose when the article has three or more h2 sections.
- **Fixed chrome:** header 60px (sticky), dock 64px (fixed, 12px from the edges, above the safe area); body reserves dock height plus 24px at the bottom on phones.
- **Taps:** 48px minimum; doors 84px, buttons 52px, segments 46px, crumbs 36px.

## Elevation & Depth

The system is flat. Depth is a glaze field against white, never a shadow. There are three exceptions, each tied to something floating over the page:

- **Header hairline** (`box-shadow: 0 1px 0 rule`): once the header turns white past the masthead.
- **Dock edge** (`inset 0 0 0 1px` mint at 28%): the dock's own glaze outline.
- **Floating guide** (`drop-shadow`, 10-18px blur): the floating guide button and its bubble, which sit over reading text.

Sheets sit over a 55% dark scrim; they do not cast shadows.

**The Flat Field Rule.** Cards, tiles, doors and notes never carry shadows. If something needs to stand out, give it a field.

## Shapes

- **Chamfer:** every control is cut at 45 degrees with a `clip-path` octagon. The size scales with the object: 6px (chips, header links), 7px (segments), 8px (dock items, nav group titles), 10px (default: buttons, search field, drawer link, blockquotes), 12px (guide bubble), 14px (doors, dock), 16px (phone demo), 18px (sheets and the popular-pages column).
- **Top-only chamfer:** bottom sheets on phones cut only their top corners.
- **Speech chamfer:** guide bubbles cut two opposite corners (top right, bottom left), so the bubble reads as speech without a tail.
- **Star:** the eight-point star is the system's dot. It replaces bullets in the TOC, journey stops, popular tile markers, chapter-heading markers, FAQ group markers, callout icons, the current nav item and the prose divider (a repeating row of stars).
- **No radius** in the site's own UI. The only rounded shapes are inside the illustrative phone demo, which imitates a real phone.

**The Cut Corner Rule.** If it can be pressed, it is chamfered. If it is chamfered, it can be pressed or it holds content (sheet, quote, guide bubble).

## Components

### Buttons
- **Shape:** chamfered (10px), 52px tall, padding 12px 22px, weight 600.
- **Primary:** takes the field of its `data-glaze` (night by default) with on-field text; arrow icon nudges 3px right on hover.
- **Ghost:** field-soft (tint) with ink text, for secondary actions such as search on the 404.
- **Focus:** 3px mint outline at 3px offset, everywhere.

### Doors (audience choice)
Two full-width chamfered (14px) fields on the home masthead: emerald for local candidates, mint for expats. Tektur title, lead in on-field-2, arrow on the right. Hover brightens 6% and moves the arrow 4px; press scales to 0.985. Side by side from 720px.

### Chips
Mono 0.78rem in a 6px chamfer on the masthead: on-field at 14% for reading time and section; the **stamp** variant inverts (on-field ground, field text) for the "checked on" date. On the mint field the stamp is white with ink.

### Popular tiles
One continuous chamfered (18px) column of chapter fields in route order, each row its own glaze, a star marker at the left that turns 45 degrees on hover, Tektur title, lead in on-field-2. Three columns (title, lead, arrow) from 900px.

### Hub chapters and steps
Each chapter is a sticky full-width field heading (Tektur, step-1, star marker, mono count) followed by a numbered list on white: mono step numbers and arrows in field-ink, 1px rule between rows, title turns field-ink on hover.

### Navigation
- **Header:** takes the page's field while you are on the masthead, turns white with an ink hairline once you scroll past it (the `theme-color` meta follows). On phones it slides up while you read down (after 160px) and returns when you scroll up; it stays while a sheet is open or it has focus. Brand mark rotates 45 degrees on hover. Desktop links get a 14% current-colour fill on hover and for the current page.
- **Dock (phones):** a dark chamfered tile with home, FAQ, search and menu; 0.72rem labels; current item in mint; press fills white at 10%.
- **Drawer:** bottom sheet on phones (top chamfer, grip, 88dvh), right panel from 960px. Audience segmented control, then nav groups headed by their chapter field, rows 48px with rule dividers, current page in field-ink with a star.
- **Search:** same sheet on phones, a centred chamfered panel from 960px; tint field with a 2px night inset on focus; results show section, title, snippet; matches highlighted in pale mint.

### Notes and callouts
On white, chamfered blockquotes in field-soft with a star icon in field-ink. Warning ("Важно") uses warn-soft and a red star; tip uses emerald; "уточните у HR" uses teal.

### Girih (signature)
- **Rosette:** one whole star at the centre of a 400 by 400 box, lattice 104px. Construction first: an outer compass circle and eight rays draw (1600ms), each star's compass circle and strapwork outline draw from the centre outward (900ms, delayed by distance), then tiles set from scale 0.3 and minus 45 degrees (900ms). Glazed tiles stay inside radius 150; strapwork stops at 215. Lines are the field's `--line`; grid hairlines at 35% opacity. The rosette drifts at 0.35 times scroll speed. From 720px it moves to the right half behind a left-edge fade.
- **Band:** a 36px row of star and cross tiles along the masthead's lower edge and above the home FAQ. Scroll-linked: strapwork draws first, then each tile scales up and turns from minus 45 degrees as the band crosses the lower 45% of the viewport.

### Page-change cover (signature)
A same-origin link tap covers the screen in khatam tiles of the destination's glaze (84px lattice), radiating from the tap point (420ms per tile, spread over 220ms), then navigates. The next page starts covered in its field and lifts the tiles off from the top centre, each scaling to zero while turning 45 degrees (520ms). History navigation uses the browser's cross-document view transition instead: the old page recedes to 0.97 (320ms), the new one rises 16px (420ms). Reduced motion skips the cover entirely.

### Guide
The guide is an eight-point star in mint with a night heart and two eyes; its final form is still the owner's choice. Inline, it sits beside a speech-chamfered field-soft bubble with its name in emerald Tektur. On articles a floating guide appears after 12% of the article: its heart fills as you read, its eyes look the way you scroll, it hops at each new section, shakes once at a "Важно" note (with a red bubble), and at 60% offers the next step. It hides when the pager is on screen. It blinks every 5.2s.

### Progress
A 4px mint bar under the header scales with page scroll. The journey rail (2px, rule colour) fills with the field as you read and turns each section's star 45 degrees when reached; the TOC marks done sections with field stars and the active one with a larger, turned star.

### Motion vocabulary
`ease-out` cubic-bezier(0.16, 1, 0.3, 1) for arrival and state; `ease-in-out` cubic-bezier(0.65, 0, 0.35, 1) for construction lines and lift-off. Hover and state: 160-320ms. Reveals: 600ms fade with 16px rise. Signature rotations are always 45 degrees.

**The Final State Rule.** Under `prefers-reduced-motion` every animation and transition collapses to 1ms, the cover and parallax and band scroll-linking are off, the statement shows fully, reveals are visible, the guide stops blinking and the phone demo shows its result screen. Nothing is hidden behind motion.

## Do's and Don'ts

### Do:
- **Do** give every chapter-scoped element a `data-glaze` and read the field kit (`--field`, `--on-field`, `--field-ink`, `--field-soft`, tiles) instead of naming colours.
- **Do** read on white: 18px Geologica, 1.6 line-height, 66ch measure, ink to ink-3 only.
- **Do** chamfer every control at 45 degrees, scaling the cut from 6px (chips) to 18px (sheets).
- **Do** use the eight-point star as the marker for lists, progress, current state and dividers.
- **Do** keep taps at 48px or more and primary actions within thumb reach on phones.
- **Do** let construction lines draw before tiles set, and let rotations land on 45 degrees.

### Don't:
- **Don't** use colours outside the Hamkorbank green ramp, white and ink; red only for warnings.
- **Don't** put shadows on cards, tiles, doors or notes; stand out with a field.
- **Don't** round corners in the site's own UI.
- **Don't** set reading text on a glaze field or below 0.95rem.
- **Don't** use mint as text on white.
- **Don't** blend fields into each other with gradients; the corner light is the only light on a field.
