/**
 * peer-highlight.ts — the bi-directional "peer hot" bridge between the inline
 * SVG districts map (DistrictsMap.astro `<script>`) and the `.rayony-card`
 * grid on /rayony.
 *
 * It only ever toggles the `.is-peer-hot` class that rayony.astro already styles.
 * It never touches `initRayonyFilter` or any id / class / data-* it owns.
 */

const grid = (): HTMLElement | null => document.getElementById('rayony-grid');
const mapRoot = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-districts-map]');

const idFromHref = (href: string | null | undefined): string | null => href?.match(/\/rayon\/([^/]+)\/?$/)?.[1] ?? null;

/** The `.rayony-card` anchor for a district id, if rendered. */
export function cardFor(id: string): HTMLElement | null {
  return grid()?.querySelector<HTMLElement>(`a.rayony-card[href$="/rayon/${id}"]`) ?? null;
}

/** The Layer-1 SVG `<a>` for a district id, if rendered. */
export function svgDistrictFor(id: string): HTMLElement | null {
  return mapRoot()?.querySelector<HTMLElement>(`.dm__district[data-district="${id}"]`) ?? null;
}

let current: string | null = null;

/** Move the `.is-peer-hot` marker to `id` (on both the card and the SVG block), or clear it with `null`. */
export function setPeerHot(id: string | null): void {
  if (id === current) return;
  if (current) {
    cardFor(current)?.classList.remove('is-peer-hot');
    svgDistrictFor(current)?.classList.remove('is-peer-hot');
  }
  current = id;
  if (id) {
    cardFor(id)?.classList.add('is-peer-hot');
    svgDistrictFor(id)?.classList.add('is-peer-hot');
  }
}

function fanoutCard(id: string | null): void {
  setPeerHot(id);
}

/**
 * (Re)bind the bridge to the current DOM. Idempotent per element (a `data-pb`
 * marker), safe to call again after `astro:page-load`.
 */
export function initPeerBridge(): void {
  const g = grid();
  if (!g) return;
  current = null;

  const root = mapRoot();
  if (root) {
    for (const a of Array.from(root.querySelectorAll<HTMLElement>('.dm__district'))) {
      if (a.dataset.pb) continue;
      a.dataset.pb = '1';
      const id = a.dataset.district;
      if (!id) continue;
      a.addEventListener('mouseenter', () => setPeerHot(id));
      a.addEventListener('mouseleave', () => setPeerHot(null));
      a.addEventListener('focusin', () => setPeerHot(id));
      a.addEventListener('focusout', () => setPeerHot(null));
    }
  }

  for (const card of Array.from(g.querySelectorAll<HTMLElement>('a.rayony-card'))) {
    if (card.dataset.pb) continue;
    card.dataset.pb = '1';
    const id = idFromHref(card.getAttribute('href'));
    if (!id) continue;
    card.addEventListener('mouseenter', () => fanoutCard(id));
    card.addEventListener('mouseleave', () => fanoutCard(null));
    card.addEventListener('focus', () => fanoutCard(id));
    card.addEventListener('blur', () => fanoutCard(null));
  }
}
