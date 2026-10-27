# Product

<!-- impeccable:product-schema 1 -->

> Source: the owner's written brief (26.10.2026) and the Notion guidebook. Items marked *(inferred)* were not confirmed in an interview: the owner asked work to proceed overnight without a question round.

## Platform

web

## Stack

Astro, static site, free hosting (Vercel or GitHub Pages). Content in separate Markdown files. Chosen by the owner in the brief. Lives in `guidebook/`, separate from the unrelated relocation site in the same repository.

## Users

- **Local candidates and new hires** of Hamkorbank, Uzbekistan. They read on a phone, often one-handed, before or during their first days. They need to know what happens on day one, how pay, leave and systems work, and who to ask.
- **Expats**: foreign specialists relocating to Uzbekistan (Andijan head office, Tashkent). In the first 72 hours they face IMEI, SIM, registration, money, housing, schools, medicine. Many read Russian; English and Uzbek versions are planned.
- *(inferred)* HR and the adaptation specialist share links to sections in messengers.

## Product Purpose

A corporate guidebook that turns a scattered Notion knowledge base into a clear, trustworthy, mobile-first site. Success: a newcomer finds the right step in seconds, does it correctly, and feels expected and cared for. Later, a chatbot will answer questions from the same content.

## Positioning

It is the bank's own welcome: written by the adaptation team, checked against current Uzbek rules (with dates and sources), and organized by the newcomer's real timeline ("before arrival → first 24/48/72 hours → first day → first week → living here"), not by department.

## Operating Context

- Entry: one home page, then a choice "I'm a local candidate" / "I'm an expat", then sections.
- Navigation in a slide-out drawer, plus site search and an FAQ with search.
- Languages: Russian first; English and Uzbek structure in place, translations later.
- Facts that expire (fees, deadlines, laws, prices) carry a "checked on" date.
- Content data must be easy to feed to a future chatbot.

## Capabilities and Constraints

- Static site, fast on mid-range Android phones over mobile data. Mobile first, then desktop.
- Content edited as Markdown by a non-programmer.
- No chatbot yet.
- Do not copy other sites; own texts and images.
- Old relocation site in the same repository must not be touched.
- Open: domain/URL, official logo SVG (current mark is a vector redraw from an image), mascot/guide character form.

## Brand Commitments

- Bank name: Hamkorbank. Head office in Andijan.
- Logo and palette supplied by the owner (27.10.2026): a white slanted "H" inside an open ring; ground from deep green-black (#0c201e) to glowing mint (#1de38a) with a corner light. The site's palette is built only from these greens plus white; red is kept solely for warnings.
- Voice: always the polite "вы", warm and clear. Logic first: what to do, when, where to go.
- The adaptation specialist (Sherali) appears as a real human contact.
- Owner references (behaviour, not looks): smooth page transitions, very readable category/button layout, scroll-driven map/route, drawings that "write themselves" on scroll, an on-screen guide character that explains, animated phone screens. See `docs/design-references.md`.

## Evidence on Hand

- Full Notion text (≈16 000 unique words), map in `docs/guidebook-map.md`.
- Fact audit with sources and dates in `docs/audit.md`.
- Owner decisions in `docs/decisions.md`.
- No photography, logo files or brand book provided yet. Do not fabricate bank figures, reviews or testimonials.

## Product Principles

1. The newcomer's timeline is the structure.
2. Every expiring fact shows its source date; uncertain facts say "уточните у HR".
3. One-handed phone use is the baseline, not an adaptation.
4. Motion explains progress; it never hides content.
5. One content source feeds the site, search, FAQ and the future chatbot.

## Accessibility & Inclusion

Readable for non-native Russian speakers; large tap targets; respects reduced-motion; good contrast in sunlight *(inferred)*.
