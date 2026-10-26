/* Client behaviour: sheets, audience filter, search, style preview, motion.
   Runs once per page load; page-to-page motion is native cross-document view transitions. */

type Doc = {
  slug: string;
  url: string;
  title: string;
  description: string;
  section: string;
  audience: string[];
  text: string;
  faq: { q: string; a: string }[];
};

const store = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode: preference just isn't remembered */
    }
  },
};


let lastFocus: HTMLElement | null = null;
let shellBound = false;

/* ---------- Sheets ---------- */
function openSheet(id: string) {
  const sheet = document.getElementById(id);
  if (!sheet) return;
  closeSheets();
  lastFocus = document.activeElement as HTMLElement;
  sheet.setAttribute('data-open', '');
  document.body.style.overflow = 'hidden';
  if (id === 'search') {
    loadIndex();
    setTimeout(() => (document.getElementById('search-input') as HTMLInputElement | null)?.focus(), 60);
  } else {
    (sheet.querySelector('[aria-current="page"]') as HTMLElement | null)?.scrollIntoView({ block: 'center' });
    (sheet.querySelector('[data-close].icon-btn') as HTMLElement | null)?.focus({ preventScroll: true });
  }
}

function closeSheets() {
  document.querySelectorAll('.sheet[data-open]').forEach((s) => s.removeAttribute('data-open'));
  document.body.style.overflow = '';
  lastFocus?.focus?.({ preventScroll: true });
  lastFocus = null;
}

/* ---------- Audience ---------- */
function currentAudience(): 'local' | 'expat' {
  const fromPage = document.documentElement.dataset.audience;
  if (fromPage === 'local' || fromPage === 'expat') return fromPage;
  return (store.get('gb-audience') as 'local' | 'expat') || 'expat';
}

function applyAudience(aud: 'local' | 'expat') {
  document.querySelectorAll<HTMLButtonElement>('[data-aud]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.aud === aud));
  });
  document.querySelectorAll<HTMLElement>('[data-aud-list]').forEach((li) => {
    li.hidden = !li.dataset.audList!.split(' ').includes(aud);
  });
  document.querySelectorAll('.nav-group').forEach((g) => {
    const visible = g.querySelectorAll('li:not([hidden])').length > 0;
    (g as HTMLElement).hidden = !visible;
  });
}

/* ---------- Style preview ---------- */
function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
  store.set('gb-theme', theme);
  document.querySelectorAll<HTMLButtonElement>('[data-theme-set]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.themeSet === theme));
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--ground').trim());
  drawStrokes();
}

/* ---------- Search ---------- */
let index: Doc[] | null = null;
let indexPromise: Promise<void> | null = null;

/** Preview builds live under a sub-path: links there are relative and need an explicit base. */
function base() {
  return document.documentElement.dataset.base || '';
}

function href(path: string) {
  const b = base();
  if (!b) return path;
  const rel = path.replace(/^\//, '');
  return b + (rel === '' ? 'home.html' : rel.endsWith('/') ? `${rel}index.html` : rel);
}

function norm(s: string) {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/[ʻʼ‘’']/g, '');
}

function loadIndex() {
  if (indexPromise) return indexPromise;
  const lang = document.getElementById('search')?.dataset.lang || 'ru';
  indexPromise = fetch(`${base() || '/'}search-index.${lang}.json`)
    .then((r) => r.json())
    .then((d: Doc[]) => {
      index = d;
    })
    .catch(() => {
      index = [];
    });
  return indexPromise;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function snippet(text: string, terms: string[]) {
  const n = norm(text);
  let pos = -1;
  for (const t of terms) {
    pos = n.indexOf(t);
    if (pos >= 0) break;
  }
  const start = Math.max(0, pos - 50);
  let s = (start > 0 ? '…' : '') + text.slice(start, start + 150) + '…';
  s = escapeHtml(s);
  for (const t of terms) {
    if (t.length < 2) continue;
    const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    s = s.replace(re, '<mark>$1</mark>');
  }
  return s;
}

function search(q: string) {
  const out = document.getElementById('search-results');
  const hint = document.getElementById('search-hint');
  if (!out || !hint) return;
  const terms = norm(q).split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length || !index) {
    out.innerHTML = '';
    hint.textContent = hint.dataset.hint || '';
    hint.hidden = false;
    return;
  }
  const aud = currentAudience();
  const scored = index
    .map((d) => {
      const title = norm(d.title);
      const desc = norm(d.description);
      const faq = norm(d.faq.map((f) => f.q + ' ' + f.a).join(' '));
      const body = norm(d.text);
      let score = 0;
      for (const t of terms) {
        const s = (title.includes(t) ? 8 : 0) + (desc.includes(t) ? 3 : 0) + (faq.includes(t) ? 3 : 0) + (body.includes(t) ? 1 : 0);
        if (!s) return { d, score: 0 };
        score += s;
      }
      if (d.audience.includes(aud)) score += 0.5;
      return { d, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  hint.hidden = scored.length > 0;
  hint.textContent = hint.dataset.empty || '';
  out.innerHTML = scored
    .map(({ d }) => {
      const hitFaq = d.faq.find((f) => terms.some((t) => norm(f.q).includes(t)));
      const snip = hitFaq ? escapeHtml(hitFaq.q) : snippet(d.text || d.description, terms);
      return `<li><a href="${href(d.url)}"><span class="r-meta">${escapeHtml(d.section)}</span><span class="r-title">${escapeHtml(d.title)}</span><span class="r-snip">${snip}</span></a></li>`;
    })
    .join('');
}

/* ---------- Motion ---------- */
let io: IntersectionObserver | null = null;

function reveal() {
  io?.disconnect();
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.classList.add('is-in');
        if (el.classList.contains('stamp')) el.classList.add('is-landing');
        if (el.classList.contains('draw')) el.classList.add('is-drawn');
        io!.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
  );
  document.querySelectorAll('.reveal, .stamp, .draw').forEach((el) => io!.observe(el));
}

function drawStrokes() {
  document.querySelectorAll<SVGPathElement>('.draw path').forEach((p) => {
    try {
      p.style.setProperty('--len', String(Math.ceil(p.getTotalLength()) + 2));
    } catch {
      /* hidden svg */
    }
  });
}

/** Route rail on hub pages and the table of contents fill as the reader moves down. */
function progress() {
  const rails = Array.from(document.querySelectorAll<HTMLElement>('.route'));
  const bar = document.querySelector<HTMLElement>('.read-progress');
  const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc a'));
  const heads = tocLinks.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  if (!rails.length && !bar && !tocLinks.length) return () => {};

  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    for (const r of rails) {
      const box = r.getBoundingClientRect();
      const filled = Math.min(Math.max(vh * 0.6 - box.top, 0), box.height - 30);
      r.style.setProperty('--progress', `${filled}px`);
    }
    if (bar) {
      const max = document.documentElement.scrollHeight - vh;
      bar.style.setProperty('--p', String(max > 0 ? Math.min(window.scrollY / max, 1) : 0));
    }
    if (tocLinks.length) {
      let active = -1;
      heads.forEach((h, i) => {
        if (h && h.getBoundingClientRect().top < vh * 0.3) active = i;
      });
      tocLinks.forEach((a, i) => {
        a.classList.toggle('is-active', i === active);
        a.classList.toggle('is-done', i < active);
      });
    }
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
  return () => window.removeEventListener('scroll', onScroll);
}

/** Markdown callouts: "> **Важно.** …" becomes a styled note. */
function callouts() {
  document.querySelectorAll('.prose blockquote').forEach((q) => {
    const lead = (q.querySelector('p > strong:first-child')?.textContent || '').toLowerCase();
    if (/важно|внимание|important/.test(lead)) q.classList.add('is-warn');
    else if (/совет|лайфхак|tip/.test(lead)) q.classList.add('is-tip');
    else if (/уточните|hr/.test(lead)) q.classList.add('is-hr');
  });
}

function markCurrentNav() {
  const here = location.pathname;
  document.querySelectorAll<HTMLAnchorElement>('.nav-list a, .bottom-bar a, .header-nav a').forEach((a) => {
    const href = new URL(a.href).pathname;
    const isHome = href === '/' || /^\/(en|uz)\/$/.test(href);
    const match = isHome ? here === href : here.startsWith(href);
    if (match) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* ---------- Boot ---------- */
let cleanupProgress = () => {};

function bindShell() {
  if (shellBound) return;
  shellBound = true;

  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const opener = t.closest<HTMLElement>('[data-sheet]');
    if (opener) {
      openSheet(opener.dataset.sheet!);
      return;
    }
    if (t.closest('[data-close]')) {
      closeSheets();
      return;
    }
    const audBtn = t.closest<HTMLButtonElement>('[data-aud]');
    if (audBtn) {
      const aud = audBtn.dataset.aud as 'local' | 'expat';
      store.set('gb-audience', aud);
      applyAudience(aud);
      return;
    }
    const themeBtn = t.closest<HTMLButtonElement>('[data-theme-set]');
    if (themeBtn) {
      applyTheme(themeBtn.dataset.themeSet!);
      return;
    }
    const door = t.closest<HTMLAnchorElement>('[data-choose]');
    if (door) store.set('gb-audience', door.dataset.choose!);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheets();
    if (e.key === '/' && !(e.target as HTMLElement).closest('input, textarea')) {
      e.preventDefault();
      openSheet('search');
    }
  });

  const input = document.getElementById('search-input') as HTMLInputElement | null;
  let timer = 0;
  input?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(async () => {
      await loadIndex();
      search(input.value);
    }, 90);
  });

}

export function initSite() {
  bindShell();
  const aud = document.documentElement.dataset.audience;
  if (aud === 'local' || aud === 'expat') store.set('gb-audience', aud);
  applyAudience(currentAudience());
  applyTheme(store.get('gb-theme') || 'document');
  markCurrentNav();
  callouts();
  drawStrokes();
  reveal();
  cleanupProgress = progress();
}
