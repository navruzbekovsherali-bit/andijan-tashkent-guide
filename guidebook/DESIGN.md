# Design: Hamkor Bank guidebook

Rebuilt 27.10.2026 after the owner rejected ornament ("no Samarkand pattern; a beautiful logo and the bank's name; calm, premium, like my reference sites"). Calm and premium in the manner of vantra-studio and eezyinn: one type family, one accent, colour used as whole dark sections.

## Colour
| Token | Value | Use |
|---|---|---|
| `--paper` | `#F5F4F0` | page ground |
| `--paper-2` | `#ECEBE6` | cards, chips, quiet fills |
| `--ink` | `#0E1A18` | text, dark buttons |
| `--ink-2` / `--ink-3` | `#4A524F` / `#636B68` | secondary text (7.6:1 / 5.2:1 on paper) |
| `--night` | `#0A2E2A` | the bank's deep green: first screen, footer, dock, "Коротко", page curtain |
| `--brand` | `#1AA752` | logo green: the only accent (primary button, bullets, progress, active states) |
| `--brand-ink` | `#0B4A43` | logo wordmark green: links and text accents |
| `--warn` | `#B3261E` | only for "уточните" notes |

Rule: one accent. No colour per section; topics are told apart by their illustration, not by colour.

## Type
Manrope Variable for everything. Display 750–800, letter-spacing −0.045…−0.055em, line-height 0.92–0.98. Body 17px (18px desktop) / 1.6, weight 450. Labels: 12px, 650, uppercase, +0.08em (`( 01 )`, topic names).

## Shape
Pills (999px) for every button, with a round arrow; cards 20px radius; no shadows on content, thin `--line` rules instead; floating frosted top bar and dock.

## Navigation
- Top bar on every page: **Назад** (inner pages), the mark + "Hamkor Bank", Темы / Локальным / Экспатам / Частые вопросы, search, menu.
- Phone dock: **Назад** first (or Вопросы on home), Главная, Поиск, Меню.
- "Назад" goes back in history when you came from the site, otherwise to the parent (article → its topic → topics).
- Article end: two equal buttons, previous and next.
- Topics: home grid of 9 topics → `/topic/<id>/` lists its pages.

## Illustrations
`src/components/illus/*.astro` (plane, car, card, money, house, docs, family, mountains, phone, map), CSS in `src/styles/illus-a.css`, `illus-b.css`. Line art in `--ink` with small `--brand` highlights. Driven by `--p` (0→1 scroll progress set in `lib/client.ts`), final state without JS and with reduced motion. Mapping in `lib/content.ts` (`illusOf`): by topic, with page overrides (car import → car, bank card → card, salary → money…).

## Motion
- Home: the mark draws itself (ring sweep, H settles), text rises in sequence.
- Page change: the bank's dark curtain with the mark rises from the bottom, the next page lifts it away (links prerender on hover/touch).
- Illustrations play with the scroll; top bar hides while reading down, returns on the way up.
- Reduced motion: everything in its final state.

## Logo
`src/components/BrandMark.astro`: vector traced from the official 1920px logo (ring 685/548 around one slanted H, two parallel cuts). Replace with the bank's SVG when available.
