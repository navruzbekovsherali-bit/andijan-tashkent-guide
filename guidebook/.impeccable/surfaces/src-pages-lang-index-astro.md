---
version: 1
slug: "src-pages-lang-index-astro"
primary_target: "src/pages/[...lang]/index.astro"
related_targets: ["src/pages/[...lang]/[aud]/index.astro","src/pages/[...lang]/guide/[slug].astro","src/pages/[...lang]/faq.astro"]
---

# Guidebook site (all routes)

Scope: home, audience hubs, guide articles, FAQ, 404. Visitor mode: Read (home is the guide's index, also Read).
Audience and job: a newcomer to Hamkorbank on a phone finds the next step of their first days and reads it comfortably.
Owner verdict on the previous version: templated, dated, hard to read, no wow. References: docs/design-references.md, docs/reference-study/.
Chosen direction: "Girih of Registan", chosen by the owner on 27.10.2026.
Unresolved: guide character's final form, logo rights, EN/UZ copy.

## Direction contract
THESIS: The guidebook is built the way Registan tilework is built: on a visible construction grid, with compass lines that become star tiles. It refuses the category default of grey ground, shadowed cards and icon tiles.
OWN-WORLD: Drenched chapter fields in the bank's own glazes (night green-black, deep, pine, teal, emerald, glowing mint, with the logo's corner light), white as the only relief, green-black ink for text. Translation: the owner pinned the Hamkorbank logo and palette after the round, so the Registan glazes became the bank's greens; the world's geometry, topology and motion are unchanged. Faint construction-grid hairlines on fields; girih stars as line work and flat tiles; 45-degree chamfers on every control. Tektur (display, chamfered), Geologica (reading), JetBrains Mono (data).
STORY: The bank welcomes you in its own colours and its country's geometry; you pick local or expat; each chapter is one glaze colour; inside, a calm white page answers the question.
FIRST VIEWPORT: Home on a phone: night field edge to edge; one whole eight-point star-and-cross rosette (the Samarkand khatam, which tiles exactly and shares its geometry with the mark, guide and page cover) constructs itself from compass arcs, then fills with tiles; the headline in white Tektur, lower left; two full-width chamfered buttons at thumb height. Article: chapter-colour masthead with title, a tile band along its lower edge, then the white reading column at 18px.
FORM: candidate 3 of the re-rolled list; seed:32230f7f7d5c9263. Signature interaction: construction lines draw and tiles fill with the scroll; page change covers the screen in girih tiles and lifts them off.
Raises: Crouwel grid: one visible module carries layout and type. Yé-yé sleeve: one flat saturated ground per chapter, no gradients. Coptic binding: the progress rail is generated from the real section count. Curved crease: the active state is one compass line. Exposure record: tones come only from the fixed ramp.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
