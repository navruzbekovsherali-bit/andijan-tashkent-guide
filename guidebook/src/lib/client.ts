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
  setInert(true);
  document.body.style.overflow = 'hidden';
  if (id === 'search') {
    loadIndex();
    setTimeout(() => (document.getElementById('search-input') as HTMLInputElement | null)?.focus(), 60);
  } else {
    const body = sheet.querySelector<HTMLElement>('.sheet-body');
    if (body) body.scrollTop = 0;
    (sheet.querySelector('.sheet-head [data-close]') as HTMLElement | null)?.focus({ preventScroll: true });
  }
}

/** While a sheet is open everything behind it is out of reach for Tab and screen readers. */
function setInert(on: boolean) {
  document.querySelectorAll<HTMLElement>('body > :not(.sheet):not(script):not(template)').forEach((el) => (el.inert = on));
}

function closeSheets() {
  const wasOpen = document.querySelector('.sheet[data-open]');
  document.querySelectorAll('.sheet[data-open]').forEach((s) => s.removeAttribute('data-open'));
  setInert(false);
  document.body.style.overflow = '';
  if (wasOpen) lastFocus?.focus?.({ preventScroll: true });
  lastFocus = null;
}

/* ---------- Audience ---------- */
type Aud = 'local' | 'expat' | 'all';

/** A first-time visitor hasn't said who they are yet: show everything until they choose. */
function currentAudience(): Aud {
  const fromPage = document.documentElement.dataset.audience;
  if (fromPage === 'local' || fromPage === 'expat') return fromPage;
  const saved = store.get('gb-audience');
  return saved === 'local' || saved === 'expat' ? saved : 'all';
}

function applyAudience(aud: Aud) {
  document.documentElement.dataset.view = aud;
  document.querySelectorAll<HTMLButtonElement>('[data-aud]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.aud === aud));
  });
  document.querySelectorAll<HTMLElement>('[data-aud-list]').forEach((li) => {
    li.hidden = aud !== 'all' && !li.dataset.audList!.split(' ').includes(aud);
  });
  document.querySelectorAll('.nav-group').forEach((g) => {
    const visible = g.querySelectorAll('li:not([hidden])').length > 0;
    (g as HTMLElement).hidden = !visible;
  });
  document.dispatchEvent(new Event('gb:audience'));
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

/** Rough stem: "карту", "карты", "картой" all search as "карт". */
export function stems(q: string) {
  return norm(q)
    .split(/[^\p{L}\p{N}*#]+/u)
    .filter((t) => t.length > 1)
    .map((t) => (t.length >= 5 ? t.slice(0, Math.max(4, t.length - 2)) : t));
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
  const terms = stems(q);
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
      if (aud !== 'all' && d.audience.includes(aud)) score += 0.5;
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
        io!.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
  );
  document.querySelectorAll('.reveal').forEach((el) => io!.observe(el));
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
    if (/важно|внимание|important|muhim|diqqat/.test(lead)) q.classList.add('is-warn');
    else if (/совет|лайфхак|tip|maslahat/.test(lead)) q.classList.add('is-tip');
    else if (/уточните|hr|check|aniqlang/.test(lead)) q.classList.add('is-hr');
  });
}

function markCurrentNav() {
  const here = location.pathname;
  document.querySelectorAll<HTMLAnchorElement>('.nav-list a, .dock a, .tb-nav a').forEach((a) => {
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
      // A quick chip opens search with its question already typed.
      const q = opener.dataset.q;
      const input = document.getElementById('search-input') as HTMLInputElement | null;
      if (q && input) {
        input.value = q;
        loadIndex().then(() => search(q));
      }
      return;
    }
    if (t.closest('[data-close]')) {
      closeSheets();
      return;
    }
    const play = t.closest<HTMLButtonElement>('[data-play]');
    if (play) {
      playVideo(play);
      return;
    }
    const stop = t.closest<HTMLButtonElement>('[data-stop]');
    if (stop) {
      stopVideo(stop);
      return;
    }
    const audBtn = t.closest<HTMLButtonElement>('[data-aud]');
    if (audBtn) {
      const aud = audBtn.dataset.aud as Aud;
      if (aud === 'all') store.set('gb-audience', '');
      else store.set('gb-audience', aud);
      applyAudience(aud);
      return;
    }
    // "Назад" returns to the page you came from; with no history on this site it opens the parent.
    const backLink = t.closest<HTMLAnchorElement>('[data-back]');
    if (backLink && cameFromHere()) {
      e.preventDefault();
      history.back();
      return;
    }
    const door = t.closest<HTMLAnchorElement>('[data-choose]');
    if (door) store.set('gb-audience', door.dataset.choose!);
    const link = t.closest<HTMLAnchorElement>('a[href]');
    if (link && !e.defaultPrevented) coverAndGo(e as MouseEvent, link);
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
  // Enter opens the best match.
  input?.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    await loadIndex();
    search(input.value);
    document.querySelector<HTMLAnchorElement>('#search-results a')?.click();
  });
  input?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(async () => {
      await loadIndex();
      search(input.value);
    }, 90);
  });

}

export function initSite() {
  // The curtain goes first: whatever fails below, the page must never stay covered.
  liftCover();
  try {
    recordVisit();
  } catch (err) {
    console.error(err);
  }
  const aud = document.documentElement.dataset.audience;
  if (aud === 'local' || aud === 'expat') store.set('gb-audience', aud);
  const steps = [
    bindShell,
    () => applyAudience(currentAudience()),
    markCurrentNav,
    callouts,
    dialable,
    tables,
    readingKit,
    glossary,
    decorate,
    reveal,
    () => (cleanupProgress = progress()),
    journeyRail,
    phoneDemos,
    reels,
    followingGuide,
    headerOnScroll,
    heroFold,
    headFold,
    cityDepth,
    checklists,
    countdown,
    expatPath,
    heroSearch,
    textSize,
    installCard,
    todayWidgets,
    taxCalc,
    stories,
    offline,
    dockLens,
    illustrationsOnScroll,
  ];
  for (const step of steps) {
    try {
      step();
    } catch (err) {
      console.error(err);
    }
  }
}

/** Phone numbers in articles become tap-to-call links (1050, 102, +998 71 200-00-00…). */
function dialable() {
  const roots = document.querySelectorAll('.prose, .summary, .faq-a');
  const re = /(\+998[\s\d()-]{9,16}\d|\b(?:101|102|103|104|112|1050|1144|1170)\b)/g;
  roots.forEach((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement?.closest('a, code, pre, h1, h2, h3, script') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const text = node.data;
      re.lastIndex = 0;
      if (!re.test(text)) continue;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let at = 0;
      for (const m of text.matchAll(re)) {
        const i = m.index ?? 0;
        // A short code is only a number to dial when it stands alone, not inside "102 000 сум".
        const short = !m[0].startsWith('+');
        if (short && /\d\s?$/.test(text.slice(0, i))) continue;
        if (short && /^\s?\d/.test(text.slice(i + m[0].length))) continue;
        frag.append(text.slice(at, i));
        const a = document.createElement('a');
        a.href = `tel:${m[0].replace(/[^\d+]/g, '')}`;
        a.className = 'tel';
        a.textContent = m[0];
        frag.append(a);
        at = i + m[0].length;
      }
      if (!at) continue;
      frag.append(text.slice(at));
      node.replaceWith(frag);
    }
  });
}

/** Wide tables scroll inside their own frame instead of squeezing the words. */
function tables() {
  document.querySelectorAll<HTMLTableElement>('.prose table').forEach((t) => {
    if (t.parentElement?.classList.contains('table-scroll')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', t.querySelector('th')?.textContent || { ru: 'Таблица', en: 'Table', uz: 'Jadval' }[pageLang()]);
    t.replaceWith(wrap);
    wrap.append(t);
  });
}

/* ---------- Trail: the pages you opened in this tab, so "Назад" is one real step back ----------
   The referrer can't be trusted for this (previews and some hosts hide it), so the site keeps its own list. */
const TRAIL = 'gb-trail';

function readTrail(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(TRAIL) || '[]');
  } catch {
    return [];
  }
}

function recordVisit() {
  const prerendering = (document as Document & { prerendering?: boolean }).prerendering;
  if (prerendering) {
    // A page prepared in advance only counts once it is actually opened.
    document.addEventListener('prerenderingchange', recordVisit, { once: true });
    return;
  }
  const here = location.pathname;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  let trail = readTrail();
  if (nav?.type === 'back_forward') {
    // Stepped back (or forward): drop everything after this page.
    const at = trail.lastIndexOf(here);
    trail = at >= 0 ? trail.slice(0, at + 1) : [here];
  } else if (trail[trail.length - 1] !== here) {
    trail.push(here);
  }
  try {
    sessionStorage.setItem(TRAIL, JSON.stringify(trail.slice(-50)));
  } catch {
    /* without storage, "Назад" falls back to the parent page */
  }
}

/** True when the previous step in this tab was a page of this site. */
function cameFromHere() {
  const trail = readTrail();
  return history.length > 1 && trail.length > 1 && trail[trail.length - 1] === location.pathname;
}

/* ---------- City films: the photo is the poster, the film plays in its place ---------- */
function playVideo(btn: HTMLButtonElement) {
  const frame = btn.closest<HTMLElement>('.photo-frame');
  if (!frame || frame.classList.contains('is-playing')) return;
  const lang = pageLang();
  const name = `video/city-${btn.dataset.play}-${lang}`;
  const video = document.createElement('video');
  video.src = `${base() || '/'}${name}.mp4`;
  video.poster = `${base() || '/'}${name}-poster.webp`;
  video.controls = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-label', btn.getAttribute('aria-label') || 'Video');
  video.addEventListener('playing', () => frame.classList.add('is-loaded'), { once: true });
  video.addEventListener('ended', () => close.click(), { once: true });
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'video-close';
  close.dataset.stop = '';
  close.setAttribute('aria-label', { ru: 'Закрыть видео', en: 'Close the video', uz: 'Videoni yopish' }[lang]);
  close.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  frame.append(video, close);
  frame.classList.add('is-playing');
  // started by the tap itself, so phones allow sound
  video.play().catch(() => {});
}

function stopVideo(btn: HTMLButtonElement) {
  const frame = btn.closest<HTMLElement>('.photo-frame');
  if (!frame) return;
  frame.querySelector('video')?.remove();
  btn.remove();
  frame.classList.remove('is-playing', 'is-loaded');
  frame.querySelector<HTMLElement>('[data-play]')?.focus({ preventScroll: true });
}

/* ---------- Bank reels: a vertical film that plays silently while on screen; sound on request ---------- */
const REELS: Record<
  string,
  {
    src: string;
    poster: string;
    srcEn?: string;
    posterEn?: string;
    srcUz?: string;
    posterUz?: string;
    silent?: boolean;
    ru: [string, string, string];
    en: [string, string, string];
    uz: [string, string, string];
  }
> = {
  hotel: {
    src: 'video/hotel-ru.mp4',
    poster: 'video/hotel-ru-poster.webp',
    srcEn: 'video/hotel-en.mp4',
    posterEn: 'video/hotel-en-poster.webp',
    srcUz: 'video/hotel-uz.mp4',
    posterUz: 'video/hotel-uz-poster.webp',
    ru: ['Отель и регистрация', 'Из аэропорта в отель, регистрация на ресепшене и талон — за 30 секунд.', ''],
    en: ['Hotel and registration', 'From the airport to the hotel, registration at reception and the slip — in 30 seconds.', ''],
    uz: ['Mehmonxona va roʻyxatdan oʻtish', 'Aeroportdan mehmonxonaga, resepshnda roʻyxatdan oʻtish va talon — 30 soniyada.', ''],
  },
  arrival: {
    src: 'video/arrival-ru.mp4',
    poster: 'video/arrival-ru-poster.webp',
    srcEn: 'video/arrival-en.mp4',
    posterEn: 'video/arrival-en-poster.webp',
    srcUz: 'video/arrival-uz.mp4',
    posterUz: 'video/arrival-uz-poster.webp',
    ru: ['Прилёт: первые 15 минут', 'Таможня и SIM-карта — что делать сразу после посадки, за 30 секунд.', ''],
    en: ['Arrival: the first 15 minutes', 'Customs and a SIM card — what to do right after landing, in 30 seconds.', ''],
    uz: ['Yetib kelish: dastlabki 15 daqiqa', 'Bojxona va SIM-karta — qoʻngandan keyin darhol nima qilish kerak, 30 soniyada.', ''],
  },
  history: {
    src: 'video/history-reel.mp4',
    poster: 'video/history-reel-poster.webp',
    ru: ['35 лет Hamkor Bank', 'Всё началось в Андижане в 1991 году. История банка — за 30 секунд.', 'Видео Hamkor Bank'],
    en: ['35 years of Hamkor Bank', 'It all began in Andijan in 1991. The bank’s story in 30 seconds.', 'Video by Hamkor Bank'],
    uz: ['Hamkor Bankga 35 yil', 'Hammasi 1991-yilda Andijonda boshlangan. Bank tarixi — 30 soniyada.', 'Hamkor Bank videosi'],
  },
  cards: {
    src: 'video/cards-reel.mp4',
    poster: 'video/cards-reel-poster.webp',
    ru: ['Карты Hamkor Bank', 'VISA в сумах, HUMO и кредитная карта — коротко, за 20 секунд.', 'Видео Hamkor Bank'],
    en: ['Hamkor Bank cards', 'VISA in sums, HUMO and the credit card — in 20 seconds.', 'Video by Hamkor Bank'],
    uz: ['Hamkor Bank kartalari', 'Soʻmdagi VISA, HUMO va kredit karta — qisqacha, 20 soniyada.', 'Hamkor Bank videosi'],
  },
};

/** Guidebook animations (video-src/arrival): RU, EN and UZ files, with original music (music.py). */
const FILMS: Record<string, [[string, string], [string, string], [string, string]]> = {
  apartment: [['Квартира: регистрация', 'Документы и заявка на emehmon.uz — за 25 секунд.'], ['Flat: registration', 'Documents and an application on emehmon.uz — in 25 seconds.'], ['Kvartira: roʻyxatdan oʻtish', 'Hujjatlar va emehmon.uz’dagi ariza — 25 soniyada.']],
  imei: [['Регистрация IMEI', '*#06#, заявка на uzimei.uz и проверка статуса — за 30 секунд.'], ['IMEI registration', '*#06#, an application on uzimei.uz and the status check — in 30 seconds.'], ['IMEI roʻyxatdan oʻtkazish', '*#06#, uzimei.uz’dagi ariza va holatni tekshirish — 30 soniyada.']],
  firstday: [['Первый день в офисе', 'От 08:30 до вечера: пропуск, документы, рабочее место.'], ['Your first day at the office', 'From 08:30 to the evening: pass, paperwork, your desk.'], ['Ofisdagi birinchi kun', '08:30 dan kechgacha: ruxsatnoma, hujjatlar, ish joyi.']],
  card: [['Карта для зарплаты', 'Документы, визит в отделение на 10–15 минут и карта.'], ['Your salary card', 'Documents, a 10–15 minute branch visit, and the card.'], ['Maosh kartasi', 'Hujjatlar, filialga 10–15 daqiqalik tashrif va karta.']],
  sickleave: [['Если заболели', 'Кому сообщить, электронный больничный и кто платит.'], ['If you fall ill', 'Who to tell, the electronic sick note and who pays.'], ['Agar kasal boʻlsangiz', 'Kimga xabar berish, elektron kasallik varaqasi va kim toʻlaydi.']],
  metro: [['Метро Ташкента', 'Карта Atto, турникет и поезд — за 25 секунд.'], ['Tashkent metro', 'The Atto card, the turnstile and the train — in 25 seconds.'], ['Toshkent metrosi', 'Atto kartasi, turniket va poyezd — 25 soniyada.']],
  permit: [['Разрешение на работу', 'Что делает HR, что нужно от вас и зачем ПИНФЛ.'], ['Work permit', 'What HR does, what you need to do, and why PINFL matters.'], ['Ishlash uchun ruxsatnoma', 'HR nima qiladi, sizdan nima kerak va JShShIR nima uchun kerak.']],
  salary: [['Когда приходит зарплата', 'Даты выплат для экспатов и местных сотрудников.'], ['When salary arrives', 'Pay dates for expats and local hires.'], ['Maosh qachon tushadi', 'Ekspatlar va mahalliy xodimlar uchun toʻlov sanalari.']],
  packing: [['Что взять с собой', 'Ручная кладь, аптечка, одежда и таможня — за 25 секунд.'], ['What to pack', 'Hand luggage, medicines, clothes and customs — in 25 seconds.'], ['Oʻzingiz bilan nima olish kerak', 'Qoʻl yuki, dori qutisi, kiyim va bojxona — 25 soniyada.']],
  emergency: [['Экстренная ситуация', '112, что сказать оператору и прямые номера служб.'], ['In an emergency', '112, what to tell the operator, and the direct numbers.'], ['Favqulodda vaziyat', '112, operatorga nima deyish va xizmatlarning toʻgʻridan-toʻgʻri raqamlari.']],
  phrases: [['Пара слов по-узбекски', 'Приветствие, рынок и такси — с переводом.'], ['A few words in Uzbek', 'A greeting, the market and a taxi — with translations.'], ['Bir necha oʻzbekcha soʻz', 'Salomlashish, bozor va taksi — tarjimasi bilan.']],
  worktime: [['Рабочий день и отпуск', 'График 08:30–17:30, праздники и 28 дней отпуска.'], ['Working day and leave', 'Hours 08:30–17:30, public holidays and 28 days of leave.'], ['Ish kuni va taʼtil', '08:30–17:30 jadvali, bayramlar va 28 kunlik taʼtil.']],
  trips: [['Командировка в 3 шага', 'Заявка в ЭДО, чеки в поездке и отчёт за 3 дня.'], ['A business trip in 3 steps', 'An EDMS request, receipts on the way and a report within 3 days.'], ['Xizmat safari 3 qadamda', 'EHAda ariza, safarda cheklar va 3 kunda hisobot.']],
  tax: [['Справка о доходах', 'Онлайн за минуту или через ЭДО за 15–30 дней.'], ['Income certificate', 'Online in a minute, or through the EDMS in 15–30 days.'], ['Daromad maʼlumotnomasi', 'Onlayn bir daqiqada yoki EHA orqali 15–30 kunda.']],
  culture: [['Культурный код', 'Чай, хлеб и приветствие — три правила гостеприимства.'], ['The cultural code', 'Tea, bread and a greeting — three rules of hospitality.'], ['Madaniy kod', 'Choy, non va salomlashish — mehmondoʻstlikning uch qoidasi.']],
  medicine: [['Если нужен врач', '103, клиники и страховка, антибиотики по рецепту.'], ['If you need a doctor', '103, clinics and insurance, antibiotics on prescription.'], ['Shifokor kerak boʻlsa', '103, klinikalar va sugʻurta, antibiotiklar retsept bilan.']],
  visa: [['Виза в Узбекистан', 'Анкета на visa.mfa.uz, подача через банк и консульство.'], ['Your visa for Uzbekistan', 'The form on visa.mfa.uz, filing through the bank, and the consulate.'], ['Oʻzbekistonga viza', 'visa.mfa.uz’dagi anketa, bank orqali topshirish va konsullik.']],
  stay: [['Правило 3 дней', 'Регистрация после прилёта и после каждого переезда.'], ['The 3-day rule', 'Registration after you arrive and after every move.'], ['3 kun qoidasi', 'Kelgandan keyin va har bir koʻchishdan keyin roʻyxat.']],
  cities: [['Путешествие по Узбекистану', 'Ташкент, Самарканд, Бухара, Хива и Андижан на одной карте.'], ['Travelling around Uzbekistan', 'Tashkent, Samarkand, Bukhara, Khiva and Andijan on one map.'], ['Oʻzbekiston boʻylab sayohat', 'Toshkent, Samarqand, Buxoro, Xiva va Andijon bitta xaritada.']],
};
for (const [name, [ru, en, uz]] of Object.entries(FILMS)) {
  REELS[name] = {
    src: `video/${name}-ru.mp4`,
    poster: `video/${name}-ru-poster.webp`,
    srcEn: `video/${name}-en.mp4`,
    posterEn: `video/${name}-en-poster.webp`,
    srcUz: `video/${name}-uz.mp4`,
    posterUz: `video/${name}-uz-poster.webp`,
    ru: [ru[0], ru[1], ''],
    en: [en[0], en[1], ''],
    uz: [uz[0], uz[1], ''],
  };
}

/** The page language, for client-side strings. */
function pageLang(): 'ru' | 'en' | 'uz' {
  const l = document.documentElement.lang;
  return l === 'en' || l === 'uz' ? l : 'ru';
}

function reels() {
  const lang = pageLang();
  const L = {
    ru: { on: 'Включить звук', off: 'Выключить звук', play: 'Смотреть', pause: 'Пауза' },
    en: { on: 'Turn sound on', off: 'Turn sound off', play: 'Play', pause: 'Pause' },
    uz: { on: 'Ovozni yoqish', off: 'Ovozni oʻchirish', play: 'Koʻrish', pause: 'Pauza' },
  }[lang];
  document.querySelectorAll<HTMLElement>('.video-reel:not([data-ready])').forEach((host) => {
    const r = REELS[host.dataset.reel || ''];
    if (!r) return;
    host.dataset.ready = '';
    const [title, lead, credit] = r[lang];
    const root = base() || '/';
    const src = (lang === 'en' ? r.srcEn : lang === 'uz' ? r.srcUz : undefined) ?? r.src;
    let poster = (lang === 'en' ? r.posterEn : lang === 'uz' ? r.posterUz : undefined) ?? r.poster;
    // a page may ask for another still of the same film (the local salary page shows the local part)
    if (host.dataset.poster) poster = poster.replace('-poster.webp', `-poster-${host.dataset.poster}.webp`);
    host.innerHTML = `
      <figure class="reel">
        <div class="reel-screen">
          <video src="${root}${src}" poster="${root}${poster}" muted playsinline loop preload="none" aria-label="${escapeHtml(title)}"></video>
          <button type="button" class="reel-toggle" aria-label="${L.play}"><span class="reel-play"></span></button>
          <button type="button" class="reel-sound" aria-pressed="false" aria-label="${L.on}">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path class="wave" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path class="mute" d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
          <span class="reel-bar"><i></i></span>
        </div>
        <figcaption><strong>${escapeHtml(title)}</strong><span>${escapeHtml(lead)}</span>${credit ? `<small>${escapeHtml(credit)}</small>` : ''}</figcaption>
      </figure>`;
    const fig = host.querySelector<HTMLElement>('.reel')!;
    if (r.silent) host.querySelector('.reel-sound')?.remove();
    const video = host.querySelector('video')!;
    const sound = host.querySelector<HTMLButtonElement>('.reel-sound');
    const toggle = host.querySelector<HTMLButtonElement>('.reel-toggle')!;
    const bar = host.querySelector<HTMLElement>('.reel-bar i')!;
    let userPaused = false;
    const setPlaying = () => {
      fig.classList.toggle('is-playing', !video.paused);
      toggle.setAttribute('aria-label', video.paused ? L.play : L.pause);
    };
    video.addEventListener('play', setPlaying);
    video.addEventListener('pause', setPlaying);
    video.addEventListener('timeupdate', () => bar.style.setProperty('--t', String(video.currentTime / (video.duration || 1))));
    toggle.addEventListener('click', () => {
      if (video.paused) {
        userPaused = false;
        video.play().catch(() => {});
      } else {
        userPaused = true;
        video.pause();
      }
    });
    sound?.addEventListener('click', () => {
      video.muted = !video.muted;
      sound!.setAttribute('aria-pressed', String(!video.muted));
      sound!.setAttribute('aria-label', video.muted ? L.on : L.off);
      fig.classList.toggle('has-sound', !video.muted);
      if (video.paused) video.play().catch(() => {});
    });
    // Plays on its own only while you can see it, and never for people who asked for less motion.
    new IntersectionObserver(
      (es) => {
        const e = es[0];
        if (e.isIntersecting && video.preload === 'none') video.preload = 'auto';
        if (e.intersectionRatio >= 0.6 && !userPaused && !reduceMotion()) video.play().catch(() => {});
        else if (e.intersectionRatio < 0.25 && !video.paused) video.pause();
      },
      { threshold: [0, 0.25, 0.6] },
    ).observe(fig);
  });
}


/* ---------- Home: "today for you" — payday, the next day off, my steps, exchange rates ---------- */
const TODAY_TX = {
  ru: { hol: 'Государственные праздники', steps: 'Мои шаги', stepsOf: 'из', stepsNone: 'Начните с чек-листа', rate: 'Курс ЦБ', rateSrc: 'cbu.uz', locale: 'ru-RU' },
  en: { hol: 'Public holidays', steps: 'My steps', stepsOf: 'of', stepsNone: 'Start with the checklist', rate: 'Central Bank rate', rateSrc: 'cbu.uz', locale: 'en-GB' },
  uz: { hol: 'Davlat bayramlari', steps: 'Mening qadamlarim', stepsOf: '/', stepsNone: 'Chek-listdan boshlang', rate: 'MB kursi', rateSrc: 'cbu.uz', locale: 'uz-UZ' },
};
// Fixed public holidays, in calendar order: [month, day, ru, en, uz]. No countdowns — a list does not go stale.
const HOLIDAYS: [number, number, string, string, string][] = [
  [1, 1, 'Новый год', 'New Year', 'Yangi yil'],
  [3, 8, 'Международный женский день', 'International Women’s Day', 'Xalqaro xotin-qizlar kuni'],
  [3, 21, 'Навруз', 'Navruz', 'Navroʻz'],
  [5, 9, 'День памяти и почестей', 'Day of Remembrance', 'Xotira va qadrlash kuni'],
  [9, 1, 'День независимости', 'Independence Day', 'Mustaqillik kuni'],
  [10, 1, 'День учителей и наставников', 'Teachers’ Day', 'Oʻqituvchi va murabbiylar kuni'],
  [12, 8, 'День Конституции', 'Constitution Day', 'Konstitutsiya kuni'],
];

function todayWidgets() {
  const row = document.querySelector<HTMLElement>('[data-widgets]');
  if (!row) return;
  const lang = pageLang();
  const T = TODAY_TX[lang];
  const aud = store.get('gb-audience') === 'expat' ? 'expat' : 'local';
  const cards: string[] = [];

  // which days are public holidays — dates only, nothing counted from today
  const hols = HOLIDAYS.map(([m, d, ...names]) => {
    const date = new Date(2001, m - 1, d).toLocaleDateString(T.locale, { day: 'numeric', month: 'long' });
    return `<span class="w-hl"><b>${date}</b><span>${escapeHtml(names[lang === 'en' ? 1 : lang === 'uz' ? 2 : 0])}</span></span>`;
  });
  cards.push(`<a class="w-card w-hol" href="${href('/guide/work-time/')}"><span class="w-k">${T.hol}</span>${hols.join('')}</a>`);

  const list = aud === 'expat' ? ['arrival-72h', 'packing', 'relocation-budget', 'first-day-week'] : ['first-day-week'];
  let done = 0, total = 0;
  for (const slug of list) {
    try {
      done += (JSON.parse(store.get(`gb-check:${slug}`) || '[]') as number[]).length;
    } catch {
      /* nothing saved yet */
    }
    total += Number(store.get(`gb-check-n:${slug}`) || 0);
  }
  let stepsHref = href('/guide/first-day-week/');
  if (aud === 'expat') {
    // expats follow the route on their hub page: its ticks are the steps
    try {
      done = (JSON.parse(store.get('gb-path') || '[]') as string[]).length;
    } catch {
      done = 0;
    }
    total = Number(store.get('gb-path-n') || 16);
    stepsHref = href('/expat/');
  }
  cards.push(`<a class="w-card w-steps" href="${stepsHref}">
    <span class="w-k">${T.steps}</span>
    <b class="w-big">${total ? `${done} <small>${T.stepsOf} ${total}</small>` : '0%'}</b>
    <span class="w-s">${total ? '' : T.stepsNone}</span>
    <span class="w-meter"><i style="--p:${total ? done / total : 0}"></i></span></a>`);

  row.innerHTML = cards.join('');
  rates(row, T);
}

/** Today's official rates from the Central Bank; the card stays away if the bank's site does not answer. */
function rates(row: HTMLElement, T: (typeof TODAY_TX)['ru']) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  fetch('https://cbu.uz/ru/arkhiv-kursov-valyut/json/', { signal: ctl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((list: { Ccy: string; Rate: string; Diff: string; Date: string }[]) => {
      const pick = ['USD', 'EUR', 'RUB'].map((c) => list.find((x) => x.Ccy === c)).filter(Boolean) as typeof list;
      if (!pick.length) return;
      const n = (v: string) => Number(v).toLocaleString(T.locale, { maximumFractionDigits: 2 });
      const card = document.createElement('a');
      card.className = 'w-card w-rate';
      card.href = 'https://cbu.uz/';
      card.target = '_blank';
      card.rel = 'noopener';
      card.innerHTML = `<span class="w-k">${T.rate} · ${escapeHtml(pick[0].Date)}</span>${pick
        .map((x) => `<span class="w-fx"><b>${x.Ccy}</b><span>${n(x.Rate)}</span><em class="${Number(x.Diff) >= 0 ? 'up' : 'down'}">${Number(x.Diff) >= 0 ? '▲' : '▼'} ${n(String(Math.abs(Number(x.Diff))))}</em></span>`)
        .join('')}`;
      row.append(card);
    })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}


/* ---------- Salary pages: gross → on your card, after the flat 12% income tax ---------- */
const CALC_TX = {
  ru: { k: 'Калькулятор', h: 'Сколько придёт на карту', gross: 'Начислено, сум', net: 'На карту', tax: 'НДФЛ 12%', note: 'Если сумма в вашем оффере указана «на руки» (net), налог платит банк.', locale: 'ru-RU' },
  en: { k: 'Calculator', h: 'What reaches your card', gross: 'Gross, soums', net: 'To your card', tax: 'Income tax 12%', note: 'If the amount in your offer is net, the bank pays the tax.', locale: 'en-GB' },
  uz: { k: 'Kalkulyator', h: 'Kartaga qancha tushadi', gross: 'Hisoblangan, soʻm', net: 'Kartaga', tax: 'JShDS 12%', note: 'Agar offeringizdagi summa «qoʻlga» (net) koʻrsatilgan boʻlsa, soliqni bank toʻlaydi.', locale: 'uz-UZ' },
};
function taxCalc() {
  document.querySelectorAll<HTMLElement>('[data-calc="tax"]').forEach((box) => {
    const T = CALC_TX[pageLang()];
    const fmt = (n: number) => Math.round(n).toLocaleString(T.locale);
    box.innerHTML = `<p class="calc-k">${T.k}</p><h3>${T.h}</h3>
      <label class="calc-in"><span>${T.gross}</span><input inputmode="numeric" autocomplete="off" value="10 000 000" aria-label="${T.gross}"></label>
      <div class="calc-out"><div><span>${T.tax}</span><b data-k="tax"></b></div><div class="calc-net"><span>${T.net}</span><b data-k="net"></b></div></div>
      <div class="calc-bar"><i data-k="bar"></i></div><p class="calc-note">${T.note}</p>`;
    const input = box.querySelector('input')!;
    const out = (k: string) => box.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
    const paint = () => {
      const g = Number(input.value.replace(/\D/g, '')) || 0;
      input.value = g ? fmt(g) : '';
      out('tax').textContent = fmt(g * 0.12);
      out('net').textContent = fmt(g * 0.88);
      out('bar').style.transform = `scaleX(${g ? 0.88 : 0})`;
    };
    input.addEventListener('input', paint);
    paint();
  });
}

/* ---------- Home: "videos of the week" — stories you tap through, like on a phone ---------- */
const STORY_ORDER: [string, string][] = [
  ['history', 'about-bank'], ['cards', 'bank-card'], ['visa', 'visa'], ['arrival', 'arrival-72h'], ['stay', 'registration'], ['hotel', 'arrival-72h'], ['firstday', 'first-day-week'], ['card', 'bank-card'], ['salary', 'salary-local'],
  ['metro', 'transport'], ['imei', 'arrival-72h'], ['apartment', 'arrival-72h'], ['sickleave', 'sick-leave'], ['permit', 'work-permit'],
  ['worktime', 'work-time'], ['trips', 'business-trips'], ['tax', 'tax-certificate'], ['medicine', 'medicine'], ['culture', 'culture'],
  ['packing', 'packing'], ['emergency', 'emergency'], ['phrases', 'phrases'], ['cities', 'uzbekistan'],
];
const STORY_TX = { ru: { open: 'Статья', close: 'Закрыть', next: 'Дальше' }, en: { open: 'Article', close: 'Close', next: 'Next' }, uz: { open: 'Maqola', close: 'Yopish', next: 'Keyingi' } };

function stories() {
  const strip = document.querySelector<HTMLElement>('[data-stories]');
  if (!strip) return;
  const lang = pageLang();
  const root = base() || '/';
  const pick = (r: (typeof REELS)[string], k: 'src' | 'poster') =>
    (lang === 'en' ? r[k === 'src' ? 'srcEn' : 'posterEn'] : lang === 'uz' ? r[k === 'src' ? 'srcUz' : 'posterUz'] : undefined) ?? r[k];
  // local staff do not need the arrival stories (customs, hotel, IMEI, flat, permit, packing)
  const ARRIVAL = ['visa', 'stay', 'arrival', 'hotel', 'imei', 'apartment', 'permit', 'packing', 'metro'];
  const only = strip.dataset.stories;
  const items = STORY_ORDER.filter(([k]) => REELS[k] && !(only === 'local' && ARRIVAL.includes(k))).map(([k, slug]) => {
    const r = REELS[k];
    const aud = store.get('gb-audience');
    return { key: k, title: r[lang][0], lead: r[lang][1], src: root + pick(r, 'src'), poster: root + pick(r, 'poster'), slug: k === 'salary' && (only || aud) === 'expat' ? 'salary-expat' : slug };
  });
  const seen = new Set<string>((() => {
    try {
      return JSON.parse(store.get('gb-stories-seen') || '[]') as string[];
    } catch {
      return [];
    }
  })());
  strip.innerHTML = `<div class="stories-track">${items
    .map((it, i) => `<button type="button" class="story${seen.has(it.key) ? ' is-seen' : ''}" data-i="${i}">
      <span class="story-thumb"><img src="${it.poster}" alt="" loading="lazy" decoding="async"><span class="story-play" aria-hidden="true"></span></span>
      <span class="story-title">${escapeHtml(it.title)}</span></button>`)
    .join('')}</div>`;
  strip.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('.story');
    if (b) openStories(items, Number(b.dataset.i), seen);
  });
}

function openStories(items: { key: string; title: string; lead: string; src: string; poster: string; slug: string }[], start: number, seen: Set<string>) {
  const lang = pageLang();
  const T = STORY_TX[lang];
  const box = document.createElement('div');
  box.className = 'story-viewer';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `<div class="sv-scrim" data-close></div>
    <div class="sv-frame">
      <div class="sv-head">
        <div class="sv-bars">${items.map(() => '<i><b></b></i>').join('')}</div>
        <button type="button" class="sv-close" data-close aria-label="${T.close}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
      </div>
      <div class="sv-stage">
        <video playsinline preload="auto"></video>
        <button type="button" class="sv-prev" aria-label="←"></button>
        <button type="button" class="sv-next" aria-label="${T.next}"></button>
      </div>
      <div class="sv-foot">
        <button type="button" class="sv-more" aria-expanded="false"><b></b><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <a class="sv-open"></a>
        <span class="sv-lead"></span>
      </div>
    </div>`;
  document.body.append(box);
  document.documentElement.classList.add('has-story');
  const video = box.querySelector('video')!;
  const bars = Array.from(box.querySelectorAll<HTMLElement>('.sv-bars b'));
  let i = start;
  const show = (n: number) => {
    if (n < 0) n = 0;
    if (n >= items.length) return close();
    i = n;
    const it = items[i];
    seen.add(it.key);
    store.set('gb-stories-seen', JSON.stringify([...seen]));
    document.querySelector(`.story[data-i="${i}"]`)?.classList.add('is-seen');
    bars.forEach((b, k) => b.style.setProperty('--p', k < i ? '1' : '0'));
    video.src = it.src;
    video.poster = it.poster;
    video.play().catch(() => {});
    box.querySelector('.sv-more b')!.textContent = it.title;
    box.querySelector('.sv-lead')!.textContent = it.lead;
    const open = box.querySelector<HTMLAnchorElement>('.sv-open')!;
    open.href = href(`/guide/${it.slug}/`);
    open.textContent = `${T.open} →`;
  };
  // the caption stays one small line; tapping the title unfolds the summary
  const more = box.querySelector<HTMLButtonElement>('.sv-more')!;
  more.addEventListener('click', () => {
    const on = !box.classList.contains('is-more');
    box.classList.toggle('is-more', on);
    more.setAttribute('aria-expanded', String(on));
  });
  video.addEventListener('timeupdate', () => bars[i]?.style.setProperty('--p', String(video.currentTime / (video.duration || 1))));
  video.addEventListener('ended', () => show(i + 1));
  box.querySelector('.sv-next')!.addEventListener('click', () => show(i + 1));
  box.querySelector('.sv-prev')!.addEventListener('click', () => show(i - 1));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(i + 1);
    if (e.key === 'ArrowLeft') show(i - 1);
  };
  let y0 = 0;
  box.addEventListener('touchstart', (e) => (y0 = e.touches[0].clientY), { passive: true });
  box.addEventListener('touchend', (e) => {
    if (e.changedTouches[0].clientY - y0 > 90) close();
  });
  function close() {
    video.pause();
    document.removeEventListener('keydown', onKey);
    box.classList.add('is-closing');
    document.documentElement.classList.remove('has-story');
    setTimeout(() => box.remove(), reduceMotion() ? 0 : 260);
  }
  box.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
  show(i);
  box.querySelector<HTMLElement>('.sv-close')!.focus({ preventScroll: true });
}

/* ---------- Animated phone demos (illustrative screens, marked as examples) ---------- */
type Screen = {
  kind: 'dial' | 'result' | 'app';
  text: string;
  lines?: string[];
  step: number;
  /** App screens: markup for the screen, given what has been typed so far. */
  view?: (typed: string) => string;
  /** App screens: type `text` letter by letter. */
  type?: boolean;
  ms?: number;
};
type Demo = { title: string; steps: string[]; note: string; screens: Screen[] };

const MARK =
  '<svg viewBox="270 270 1390 1390" aria-hidden="true"><circle cx="965" cy="965" r="616.5" fill="none" stroke="#1aa752" stroke-width="137" stroke-dasharray="1500 300 1500 572" /><polygon points="1215,476 1440,466 1125,1307 902,1307 1007,1023 880,1023 720,1480 495,1465 812,622 1033,622 928,908 1052,908" fill="#1aa752"/></svg>';
const MAP =
  '<svg class="pd-streets" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M-10 60 L210 40 M-10 150 L210 170 M-10 240 L210 225 M40 -10 L60 310 M130 -10 L120 310 M175 -10 L190 310" /><path class="pd-park" d="M70 70 h40 v50 h-40z" /></svg>';
const caret = '<span class="pd-caret"></span>';

const DEMO_TEXT = {
  ru: {
    note: 'Экран условный, цифры вымышлены.',
    imei: { title: 'Пример: как проверить IMEI', steps: ['Наберите *#06# — телефон покажет IMEI', 'Перепишите все IMEI (их может быть два)', 'Наберите *1170# — придёт статус регистрации'], status: 'Статус: зарегистрирован' },
    taxi: { title: 'Пример: как вызвать такси', steps: ['Откройте Yandex Go и укажите, куда ехать', 'Выберите тариф — цена видна сразу', 'Нажмите «Заказать» и ждите машину'], from: 'Откуда', here: 'Вы здесь', to: 'Куда', dest: 'Работа', eco: 'Эконом', comf: 'Комфорт', order: 'Заказать', coming: 'Машина едет', min: 'мин', car: 'Белый Cobalt · 01 A 123 BC' },
    bank: { title: 'Пример: как настроить приложение банка', steps: ['Скачайте приложение Hamkorbank', 'Зарегистрируйтесь с помощью карты', 'Установите ПИН-код и вход по отпечатку'], get: 'Установить', open: 'Открыть', card: 'Номер карты', next: 'Далее', pin: 'Придумайте ПИН-код', touch: 'Вход по отпечатку', done: 'Готово', added: 'Карта добавлена' },
  },
  en: {
    note: 'Illustrative screen, made-up numbers.',
    imei: { title: 'Example: checking your IMEI', steps: ['Dial *#06# — the phone shows its IMEI', 'Write down every IMEI (there may be two)', 'Dial *1170# — you get the registration status'], status: 'Status: registered' },
    taxi: { title: 'Example: ordering a taxi', steps: ['Open Yandex Go and say where you are going', 'Pick a tariff — the price shows straight away', 'Tap “Order” and wait for the car'], from: 'From', here: 'You are here', to: 'To', dest: 'Work', eco: 'Economy', comf: 'Comfort', order: 'Order', coming: 'Car on the way', min: 'min', car: 'White Cobalt · 01 A 123 BC' },
    bank: { title: 'Example: setting up the bank app', steps: ['Download the Hamkorbank app', 'Sign up with your card', 'Set a PIN and fingerprint login'], get: 'Get', open: 'Open', card: 'Card number', next: 'Next', pin: 'Choose a PIN', touch: 'Fingerprint login', done: 'Done', added: 'Card added' },
  },
  uz: {
    note: 'Ekran shartli, raqamlar oʻylab topilgan.',
    imei: { title: 'Misol: IMEI’ni qanday tekshirish', steps: ['*#06# ni tering — telefon IMEI’ni koʻrsatadi', 'Barcha IMEI’larni yozib oling (ular ikkita boʻlishi mumkin)', '*1170# ni tering — roʻyxat holati keladi'], status: 'Holat: roʻyxatdan oʻtgan' },
    taxi: { title: 'Misol: taksini qanday chaqirish', steps: ['Yandex Go’ni oching va qayerga borishni koʻrsating', 'Tarifni tanlang — narx darhol koʻrinadi', '«Buyurtma berish»ni bosing va mashinani kuting'], from: 'Qayerdan', here: 'Siz shu yerdasiz', to: 'Qayerga', dest: 'Ish', eco: 'Ekonom', comf: 'Komfort', order: 'Buyurtma berish', coming: 'Mashina kelmoqda', min: 'daq', car: 'Oq Cobalt · 01 A 123 BC' },
    bank: { title: 'Misol: bank ilovasini sozlash', steps: ['Hamkorbank ilovasini yuklab oling', 'Karta orqali roʻyxatdan oʻting', 'PIN-kod va barmoq izi bilan kirishni oʻrnating'], get: 'Oʻrnatish', open: 'Ochish', card: 'Karta raqami', next: 'Keyingi', pin: 'PIN-kod oʻylab toping', touch: 'Barmoq izi bilan kirish', done: 'Tayyor', added: 'Karta qoʻshildi' },
  },
};

function demoFor(name: string): Demo | undefined {
  const T = DEMO_TEXT[pageLang()];
  if (name === 'imei') {
    return {
      ...T.imei,
      note: T.note,
      screens: [
        { kind: 'dial', text: '*#06#', step: 0 },
        { kind: 'result', text: 'IMEI', lines: ['IMEI 1: 35 1234 •• 4821', 'IMEI 2: 35 1234 •• 4839'], step: 1 },
        { kind: 'dial', text: '*1170#', step: 2 },
        { kind: 'result', text: 'UzIMEI', lines: ['35 1234 •• 4821', T.imei.status], step: 2 },
      ],
    };
  }
  if (name === 'taxi') {
    const X = T.taxi;
    const sheet = (inner: string) => `<div class="pd-app pd-map">${MAP}<span class="pd-pin"></span><div class="pd-panel">${inner}</div></div>`;
    return {
      ...X,
      note: T.note,
      screens: [
        {
          kind: 'app', text: X.dest, type: true, step: 0, ms: 2800,
          view: (t) => sheet(`<div class="pd-field"><small>${X.from}</small>${X.here}</div><div class="pd-field is-focus"><small>${X.to}</small>${escapeHtml(t)}${caret}</div>`),
        },
        {
          kind: 'app', text: '', step: 1, ms: 2600,
          view: () => sheet(`<div class="pd-tiles"><span class="is-pick"><b>${X.eco}</b>≈ 18 000</span><span><b>${X.comf}</b>≈ 26 000</span></div><span class="pd-btn is-press">${X.order}</span>`),
        },
        {
          kind: 'app', text: '', step: 2, ms: 3200,
          view: () =>
            `<div class="pd-app pd-map">${MAP}<svg class="pd-route" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path pathLength="1" d="M40 250 C 60 200, 130 190, 125 140 S 160 70, 170 50" /></svg><span class="pd-car"></span><div class="pd-panel"><p class="pd-eta"><b>${X.coming}</b><span>4 ${X.min}</span></p><small>${X.car}</small></div></div>`,
        },
      ],
    };
  }
  if (name === 'bank') {
    const X = T.bank;
    return {
      ...X,
      note: T.note,
      screens: [
        {
          kind: 'app', text: '', step: 0, ms: 2600,
          view: () => `<div class="pd-app pd-store"><span class="pd-icon">${MARK}</span><b>Hamkorbank</b><span class="pd-get"><i></i>${X.get}</span></div>`,
        },
        {
          kind: 'app', text: '8600 •••• 9012', type: true, step: 1, ms: 3000,
          view: (t) => `<div class="pd-app pd-form"><span class="pd-icon is-small">${MARK}</span><div class="pd-field is-focus"><small>${X.card}</small><span class="pd-num">${escapeHtml(t)}${caret}</span></div><span class="pd-btn${t.length > 13 ? ' is-press' : ''}">${X.next}</span></div>`,
        },
        {
          kind: 'app', text: '', step: 2, ms: 2800,
          view: () => `<div class="pd-app pd-form"><p class="pd-ask">${X.pin}</p><div class="pd-dots"><i></i><i></i><i></i><i></i></div><span class="pd-finger"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a7 7 0 0 0-7 7v2M19 11a7 7 0 0 0-3.5-6M8.5 20c1-2 1.5-4.5 1.5-7a2 2 0 0 1 4 0c0 3-.5 5.5-1.5 7.5M16 18c.6-1.6 1-3.5 1-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span><small>${X.touch}</small></div>`,
        },
        {
          kind: 'app', text: '', step: 2, ms: 2400,
          view: () => `<div class="pd-app pd-form pd-done"><span class="pd-tick"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg></span><b>${X.done}</b><small>${X.added}</small><span class="pd-mini-card">${MARK}<i>•••• 9012</i></span></div>`,
        },
      ],
    };
  }
  return undefined;
}

function phoneDemos() {
  document.querySelectorAll<HTMLElement>('.phone-demo:not([data-ready])').forEach((host) => {
    const demo = demoFor(host.dataset.demo || '');
    if (!demo) return;
    host.dataset.ready = '';
    host.innerHTML = `
      <figure class="pd">
        <div class="pd-phone" aria-hidden="true"><div class="pd-notch"></div><div class="pd-screen"></div>
          <div class="pd-bar">${demo.screens.map(() => '<span></span>').join('')}</div></div>
        <figcaption>
          <strong>${escapeHtml(demo.title)}</strong>
          <ol class="pd-steps">${demo.steps.map((s, n) => `<li><button type="button" data-step="${n}">${escapeHtml(s)}</button></li>`).join('')}</ol>
          <small>${escapeHtml(demo.note)}</small>
        </figcaption>
      </figure>`;
    const screen = host.querySelector<HTMLElement>('.pd-screen')!;
    const steps = Array.from(host.querySelectorAll<HTMLElement>('.pd-steps li'));
    const bars = Array.from(host.querySelectorAll<HTMLElement>('.pd-bar span'));
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0;
    let timer = 0;
    let typing = 0;
    let visible = false;

    const render = (sc: Screen, typed: string) => {
      steps.forEach((li, n) => li.classList.toggle('is-on', n === sc.step));
      if (sc.kind === 'dial') {
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
        screen.innerHTML = `<div class="pd-dial"><div class="pd-typed">${escapeHtml(typed)}<span class="pd-caret"></span></div>
          <div class="pd-keys">${keys.map((k) => `<span class="${typed.endsWith(k) ? 'is-hit' : ''}">${k}</span>`).join('')}</div>
          <div class="pd-call"></div></div>`;
      } else if (sc.kind === 'app' && sc.view) {
        screen.innerHTML = sc.view(typed);
      } else {
        screen.innerHTML = `<div class="pd-result"><div class="pd-sheet"><b>${escapeHtml(sc.text)}</b>${(sc.lines || [])
          .map((l) => `<span>${escapeHtml(l)}</span>`)
          .join('')}<em>OK</em></div></div>`;
      }
    };

    const play = () => {
      clearTimeout(timer);
      clearInterval(typing);
      if (!visible) return;
      const at = i % demo.screens.length;
      const sc = demo.screens[at];
      const dur = sc.ms ?? (sc.kind === 'dial' ? 2600 : 2400);
      bars.forEach((b, n) => {
        b.className = n < at ? 'is-done' : n === at ? 'is-on' : '';
        b.style.setProperty('--dur', `${dur}ms`);
      });
      if ((sc.kind === 'dial' || sc.type) && !reduce) {
        let n = 0;
        render(sc, '');
        const pace = sc.kind === 'dial' ? 260 : Math.min(160, 1700 / Math.max(sc.text.length, 1));
        typing = window.setInterval(() => {
          n++;
          render(sc, sc.text.slice(0, n));
          if (n >= sc.text.length) clearInterval(typing);
        }, pace);
      } else render(sc, sc.text);
      timer = window.setTimeout(() => {
        i++;
        play();
      }, dur);
    };

    // A step can be tapped: the phone jumps to its first screen and carries on from there.
    host.querySelector('.pd-steps')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-step]');
      if (!b) return;
      i = demo.screens.findIndex((sc) => sc.step === Number(b.dataset.step));
      if (reduce || !visible) {
        const sc = demo.screens[i];
        render(sc, sc.text);
      } else play();
    });

    render(demo.screens[0], reduce ? demo.screens[0].text : '');
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible && !reduce) play();
      else {
        clearTimeout(timer);
        clearInterval(typing);
      }
      if (visible && reduce) {
        i = 1;
        render(demo.screens[1], demo.screens[1].text);
      }
    }, { threshold: 0.35 }).observe(host);
  });
}

/* ---------- Journey rail: the article's own route, filled as you read ---------- */
function journeyRail() {
  const prose = document.querySelector<HTMLElement>('.prose');
  if (!prose) return () => {};
  const heads = Array.from(prose.querySelectorAll<HTMLElement>(':scope > h2'));
  if (heads.length < 3) return () => {};
  prose.classList.add('has-rail');
  const rail = document.createElement('div');
  rail.className = 'journey';
  rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML = '<span class="journey-fill"></span>' + heads.map(() => '<span class="journey-stop"></span>').join('');
  prose.prepend(rail);
  const fill = rail.querySelector<HTMLElement>('.journey-fill')!;
  const stops = Array.from(rail.querySelectorAll<HTMLElement>('.journey-stop'));

  const layout = () => {
    const top0 = heads[0].offsetTop + heads[0].offsetHeight / 2;
    heads.forEach((h, n) => (stops[n].style.top = `${h.offsetTop + h.offsetHeight / 2}px`));
    rail.style.top = `${top0}px`;
    rail.style.height = `${prose.scrollHeight - top0}px`;
    stops.forEach((s) => (s.style.top = `${parseFloat(s.style.top) - top0}px`));
  };
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = rail.getBoundingClientRect();
    const reach = Math.min(Math.max(window.innerHeight * 0.45 - r.top, 0), r.height);
    fill.style.height = `${reach}px`;
    stops.forEach((s) => s.classList.toggle('is-done', parseFloat(s.style.top) <= reach));
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  layout();
  update();
  document.fonts?.ready.then(() => {
    layout();
    update();
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    layout();
    update();
  });
  return () => window.removeEventListener('scroll', onScroll);
}

/* ---------- Shared helpers for scroll-linked effects ---------- */
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Runs fn at most once per frame while the page scrolls, and on resize. */
function onScrollFrame(fn: () => void) {
  let ticking = false;
  const run = () => {
    ticking = false;
    fn();
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(run);
      }
    },
    { passive: true },
  );
  window.addEventListener('resize', fn);
  fn();
}

/* ---------- Top bar: turns light once you leave the dark first screen; hides while reading down ---------- */
function headerOnScroll() {
  const bar = document.querySelector<HTMLElement>('.topbar');
  if (!bar) return;
  const hero = document.querySelector<HTMLElement>('.hero');
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const glassTop = bar.querySelector<HTMLElement>('.glass');
  const dock = document.querySelector<HTMLElement>('.dock');
  let lastY = window.scrollY;
  onScrollFrame(() => {
    const y = window.scrollY;
    const past = hero ? y > hero.offsetHeight - 80 : true;
    if (past !== bar.classList.contains('is-scrolled')) {
      bar.classList.toggle('is-scrolled', past);
      if (hero) meta?.setAttribute('content', past ? '#f5f4f0' : '#0b1f1d');
    }
    // Glass takes the tone of what is under it: dark over the first screen, light over paper.
    const heroBottom = hero ? hero.offsetTop + hero.offsetHeight - y : -1;
    glassTop?.classList.toggle('is-dark', heroBottom > 40);
    dock?.classList.toggle('is-dark', heroBottom > window.innerHeight - 40);
    if (Math.abs(y - lastY) < 8) return;
    const busy = document.querySelector('.sheet[data-open]') || bar.matches(':focus-within');
    bar.classList.toggle('is-hidden', !busy && y > lastY && y > 200);
    lastY = y;
  });
}



/* ---------- Glossary: the first mention of a term in an article explains itself on tap ---------- */
const GLOSSARY: Record<'ru' | 'en' | 'uz', [RegExp, string][]> = {
  ru: [
    [/ПИНФЛ/, 'ПИНФЛ — персональный идентификационный номер физического лица, 14 цифр. Нужен для OneID, налоговой и банковских сервисов.'],
    [/ЭДО/, 'ЭДО — система электронного документооборота банка: служебные записки, заявки, согласования.'],
    [/БРВ/, 'БРВ — базовая расчётная величина. Из неё считают штрафы и сборы; с 01.09.2026 — 440 000 сум.'],
    [/OneID/, 'OneID — единый вход в государственные онлайн-сервисы Узбекистана (id.egov.uz).'],
    [/MyID/, 'MyID — биометрическая проверка личности по лицу. Нужна для банковских приложений и госуслуг.'],
    [/IMEI/, 'IMEI — номер телефона как устройства. С местной SIM-картой его нужно зарегистрировать за 30 дней.'],
    [/ДМС/, 'ДМС — добровольное медицинское страхование: полис, по которому лечат в частных клиниках.'],
    [/НДФЛ/, 'НДФЛ — налог на доходы физических лиц. В Узбекистане — 12%.'],
    [/HRBP|HR Business Partner/, 'HR Business Partner — ваш HR-партнёр: документы, медицина, страховка и переезд.'],
    [/Buddy/, 'Buddy — коллега-наставник, который помогает освоиться в первые недели.'],
    [/KPI/, 'KPI — ключевые показатели эффективности: по ним считают премию.'],
    [/E-mehmon|emehmon/, 'E-mehmon — система регистрации иностранцев по месту пребывания (emehmon.uz).'],
  ],
  en: [
    [/PINFL/, 'PINFL — your personal identification number, 14 digits. You need it for OneID, tax and banking services.'],
    [/EDMS|EDM\b/, 'EDMS — the bank’s electronic document system: memos, requests and approvals.'],
    [/BCA/, 'BCA (BRV) — the base calculation amount used for fines and fees; 440,000 soums from 01.09.2026.'],
    [/OneID/, 'OneID — single sign-in for Uzbekistan’s government online services (id.egov.uz).'],
    [/MyID/, 'MyID — face-based identity check used by banking apps and government services.'],
    [/IMEI/, 'IMEI — your phone’s device number. With a local SIM card it must be registered within 30 days.'],
    [/HR Business Partner|HRBP/, 'HR Business Partner — your HR partner for documents, healthcare, insurance and relocation.'],
    [/Buddy/, 'Buddy — a colleague who helps you settle in during the first weeks.'],
    [/KPI/, 'KPI — key performance indicators; your bonus is based on them.'],
    [/E-mehmon|emehmon/, 'E-mehmon — the system for registering foreigners at their place of stay (emehmon.uz).'],
  ],
  uz: [
    [/JShShIR/, 'JShShIR — jismoniy shaxsning shaxsiy identifikatsiya raqami, 14 ta raqam. OneID, soliq va bank xizmatlari uchun kerak.'],
    [/EHA/, 'EHA — bankning elektron hujjat aylanishi tizimi: xizmat xatlari, arizalar, kelishuvlar.'],
    [/BHM/, 'BHM — bazaviy hisoblash miqdori. Jarima va yigʻimlar undan hisoblanadi; 01.09.2026 dan — 440 000 soʻm.'],
    [/OneID/, 'OneID — Oʻzbekiston davlat onlayn xizmatlariga yagona kirish (id.egov.uz).'],
    [/MyID/, 'MyID — yuz boʻyicha biometrik tekshiruv. Bank ilovalari va davlat xizmatlari uchun kerak.'],
    [/IMEI/, 'IMEI — telefonning qurilma raqami. Mahalliy SIM-karta bilan uni 30 kun ichida roʻyxatdan oʻtkazish kerak.'],
    [/ITS/, 'ITS — ixtiyoriy tibbiy sugʻurta: xususiy klinikalarda davolanish uchun polis.'],
    [/JShDS/, 'JShDS — jismoniy shaxslardan olinadigan daromad soligʻi. Oʻzbekistonda — 12%.'],
    [/HR Business Partner|HRBP/, 'HR Business Partner — hujjatlar, tibbiyot, sugʻurta va koʻchish boʻyicha HR-hamkoringiz.'],
    [/Buddy/, 'Buddy — dastlabki haftalarda moslashishga yordam beradigan hamkasb-murabbiy.'],
    [/KPI/, 'KPI — samaradorlikning asosiy koʻrsatkichlari: mukofot ular boʻyicha hisoblanadi.'],
    [/E-mehmon|emehmon/, 'E-mehmon — xorijliklarni turgan joyi boʻyicha roʻyxatga olish tizimi (emehmon.uz).'],
  ],
};

function glossary() {
  const prose = document.querySelector<HTMLElement>('article .prose');
  if (!prose) return;
  const terms = GLOSSARY[pageLang()];
  const used = new Set<number>();
  const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      (n.parentElement?.closest('a, h1, h2, h3, button, code, .video-reel, .phone-demo, .calc, table, .term') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    for (let i = 0; i < terms.length; i++) {
      if (used.has(i)) continue;
      const m = node.data.match(terms[i][0]);
      if (!m || m.index === undefined) continue;
      used.add(i);
      const after = node.splitText(m.index);
      after.splitText(m[0].length);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'term';
      b.dataset.def = terms[i][1];
      b.textContent = m[0];
      after.replaceWith(b);
      break;
    }
  }
  let tip: HTMLElement | null = null;
  const hide = () => {
    tip?.remove();
    tip = null;
  };
  prose.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.term');
    if (!b) return;
    e.stopPropagation();
    const same = tip?.dataset.for === b.textContent;
    hide();
    if (same) return;
    tip = document.createElement('div');
    tip.className = 'term-tip glass';
    tip.setAttribute('role', 'tooltip');
    tip.dataset.for = b.textContent || '';
    tip.textContent = b.dataset.def || '';
    document.body.append(tip);
    const r = b.getBoundingClientRect();
    const w = Math.min(320, window.innerWidth - 24);
    tip.style.width = `${w}px`;
    tip.style.left = `${Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12)}px`;
    const below = r.bottom + 10 + tip.offsetHeight < window.innerHeight - 90;
    tip.style.top = `${below ? r.bottom + 10 : r.top - tip.offsetHeight - 10}px`;
  });
  document.addEventListener('click', hide);
  window.addEventListener('scroll', hide, { passive: true });
}

/* ---------- Reading kit: long articles become chapters, steps, fact cards and a chapter bar ---------- */
const CHAPTERS = { ru: 'Разделы статьи', en: 'Sections of the article', uz: 'Maqola boʻlimlari' };

function readingKit() {
  const prose = document.querySelector<HTMLElement>('article .prose');
  if (!prose) return;
  const checklist = !!prose.closest('article[data-checklist]');
  const heads = Array.from(prose.querySelectorAll<HTMLElement>(':scope > h2'));

  // chapter numbers: 01, 02… above each section heading
  heads.forEach((h, i) => {
    const n = document.createElement('span');
    n.className = 'ch-no';
    n.setAttribute('aria-hidden', 'true');
    n.textContent = String(i + 1).padStart(2, '0');
    h.prepend(n);
  });

  if (!checklist) {
    // numbered lists read as a route of steps
    prose.querySelectorAll<HTMLOListElement>(':scope > ol').forEach((ol) => ol.classList.add('route-steps'));
    // bullet lists whose items open with a bold lead become cards
    prose.querySelectorAll<HTMLUListElement>(':scope > ul').forEach((ul) => {
      const items = Array.from(ul.children);
      const led = items.filter((li) => li.firstElementChild?.tagName === 'STRONG' && li.firstChild === li.firstElementChild);
      if (items.length < 2 || led.length / items.length < 0.6) return;
      ul.classList.add('facts');
      led.forEach((li) => {
        li.classList.add('lead');
        // the bold lead becomes the card title, so the dash or colon after it goes
        const after = li.firstElementChild!.nextSibling;
        if (after?.nodeType === 3) after.textContent = (after.textContent || '').replace(/^\s*[—–:-]\s*/, ' ').replace(/^\s+/, '');
        const lead = li.firstElementChild as HTMLElement;
        lead.textContent = (lead.textContent || '').replace(/[.:]\s*$/, '');
      });
    });
    prose.querySelectorAll<HTMLOListElement>(':scope > ol.route-steps > li').forEach((li) => {
      if (li.firstElementChild?.tagName === 'STRONG' && li.firstChild === li.firstElementChild) li.classList.add('lead');
    });
  }

  // wide tables turn into cards on phones: each cell carries its column name
  prose.querySelectorAll<HTMLTableElement>('table').forEach((t) => {
    const names = Array.from(t.querySelectorAll('thead th')).map((th) => (th.textContent || '').trim());
    if (names.length < 3) return;
    t.classList.add('cards-on-phone');
    t.querySelectorAll('tbody tr').forEach((tr) => Array.from(tr.children).forEach((td, i) => td.setAttribute('data-label', names[i] || '')));
  });

  // articles with a film get a "watch" chip under the title
  const reel = prose.querySelector<HTMLElement>('.video-reel');
  const meta = document.querySelector<HTMLElement>('.page-head .meta-row');
  if (reel && meta) {
    reel.id ||= 'film';
    const chip = document.createElement('a');
    chip.className = 'chip chip-video';
    chip.href = `#${reel.id}`;
    chip.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.5v13a.6.6 0 0 0 .9.5l10.4-6.5a.6.6 0 0 0 0-1L8.9 5a.6.6 0 0 0-.9.5Z" fill="currentColor"/></svg>${{ ru: 'Смотреть видео · 30 сек', en: 'Watch the film · 30 s', uz: 'Videoni koʻrish · 30 s' }[pageLang()]}`;
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      reel.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' });
    });
    meta.prepend(chip);
  }

  countUp(prose);
  stepsFill(prose);
  if (heads.length >= 3) chapterBar(heads);
}

/** Bold numbers ("12%", "30 дней", "440 000 сум") count up the first time they come into view. */
function countUp(root: HTMLElement) {
  if (reduceMotion()) return;
  const nums = Array.from(root.querySelectorAll<HTMLElement>('strong')).filter((el) => {
    const t = (el.textContent || '').trim();
    return t.length <= 24 && /^[≈~]?\s?\d/.test(t) && !/[–—:\-/]/.test(t) && !/\d[.,]\d+[.,]\d/.test(t) && !el.closest('a, table');
  });
  if (!nums.length) return;
  const run = (el: HTMLElement) => {
    const text = el.textContent || '';
    const m = text.match(/\d(?:[\d\s ]*\d)?(?:[.,]\d+)?/); // keep the space before the unit out of the number
    if (!m) return;
    const raw = m[0];
    const target = parseFloat(raw.replace(/[\s ]/g, '').replace(',', '.'));
    if (!isFinite(target) || target === 0) return;
    const dec = (raw.split(/[.,]/)[1] || '').length;
    const sep = raw.includes(',') ? ',' : '.';
    const group = /\d[\s ]\d/.test(raw);
    const fmt = (v: number) => {
      let out = v.toFixed(dec).replace('.', sep);
      if (group) out = out.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return out;
    };
    const t0 = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = text.replace(raw, k < 1 ? fmt(target * e) : raw);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const seen = new IntersectionObserver(
    (es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      seen.unobserve(e.target);
      run(e.target as HTMLElement);
    }),
    { threshold: 1 },
  );
  nums.forEach((el) => {
    el.classList.add('num');
    seen.observe(el);
  });
}

/** The line of a steps list fills as you read down it. */
function stepsFill(root: HTMLElement) {
  const lists = Array.from(root.querySelectorAll<HTMLElement>('.route-steps'));
  if (!lists.length) return;
  onScrollFrame(() => {
    const at = window.innerHeight * 0.62;
    for (const ol of lists) {
      const r = ol.getBoundingClientRect();
      ol.style.setProperty('--fill', String(clamp01((at - r.top) / Math.max(r.height, 1))));
      Array.from(ol.children).forEach((li) => li.classList.toggle('is-passed', (li as HTMLElement).getBoundingClientRect().top < at));
    }
  });
}

/** Phones: a slim glass bar with the article's sections, so the reader always knows where they are. */
function chapterBar(heads: HTMLElement[]) {
  const lang = pageLang();
  const bar = document.createElement('nav');
  bar.className = 'chapter-bar glass';
  bar.setAttribute('aria-label', CHAPTERS[lang]);
  bar.innerHTML = `<div class="chapter-track">${heads
    .map((h, i) => {
      const label = Array.from(h.childNodes).filter((n) => !(n as HTMLElement).classList?.contains('ch-no')).map((n) => n.textContent).join('').trim();
      return `<a href="#${h.id}" data-i="${i}"><b>${String(i + 1).padStart(2, '0')}</b>${escapeHtml(label)}</a>`;
    })
    .join('')}</div>`;
  document.body.append(bar);
  const track = bar.querySelector<HTMLElement>('.chapter-track')!;
  const links = Array.from(track.querySelectorAll<HTMLAnchorElement>('a'));
  const end = document.querySelector<HTMLElement>('.pager') || document.querySelector<HTMLElement>('.site-footer');
  let active = -2;
  onScrollFrame(() => {
    const top = 140;
    const shown = heads[0].getBoundingClientRect().top < top && (!end || end.getBoundingClientRect().top > window.innerHeight * 0.6);
    bar.classList.toggle('is-shown', shown);
    let a = -1;
    heads.forEach((h, i) => {
      if (h.getBoundingClientRect().top < top + 40) a = i;
    });
    if (a !== active) {
      active = a;
      links.forEach((l, i) => {
        l.classList.toggle('is-active', i === a);
        l.classList.toggle('is-done', i < a);
      });
      const cur = links[a];
      if (cur) track.scrollTo({ left: cur.offsetLeft - 16, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
  });
}

/* ---------- Checklists: tick what is done; remembered on this device ---------- */
const UI = {
  ru: { done: 'Сделано', of: 'из', reset: 'Сбросить', mark: 'Отметить' },
  en: { done: 'Done', of: 'of', reset: 'Reset', mark: 'Mark as done' },
  uz: { done: 'Bajarildi', of: '/', reset: 'Tozalash', mark: 'Belgilash' },
};
function uiText() {
  const l = document.documentElement.lang as keyof typeof UI;
  return UI[l] ?? UI.ru;
}

function checklists() {
  const article = document.querySelector<HTMLElement>('article[data-checklist]');
  if (!article) return;
  const key = `gb-check:${article.dataset.checklist}`;
  store.set(`gb-check-n:${article.dataset.checklist}`, String(article.querySelectorAll('.prose > ul > li, .prose > ol > li').length));
  const items = Array.from(article.querySelectorAll<HTMLLIElement>('.prose > ul > li, .prose > ol > li'));
  if (!items.length) return;
  const tx = uiText();
  let done = new Set<number>((() => {
    try {
      return JSON.parse(store.get(key) || '[]') as number[];
    } catch {
      return [];
    }
  })());

  const bar = document.createElement('div');
  bar.className = 'check-bar';
  bar.innerHTML = `<div class="check-meter"><span></span></div><p><b data-k="n"></b> <span data-k="t"></span></p><button type="button" class="check-reset">${tx.reset}</button>`;
  article.querySelector('.prose')?.prepend(bar);
  const meter = bar.querySelector<HTMLElement>('.check-meter span')!;

  const paint = () => {
    items.forEach((li, i) => {
      const on = done.has(i);
      li.classList.toggle('is-done', on);
      li.querySelector('.check-btn')?.setAttribute('aria-checked', String(on));
    });
    bar.querySelector('[data-k="n"]')!.textContent = `${tx.done} ${done.size}`;
    bar.querySelector('[data-k="t"]')!.textContent = `${tx.of} ${items.length}`;
    meter.style.transform = `scaleX(${done.size / items.length})`;
    bar.classList.toggle('is-complete', done.size === items.length);
    store.set(key, JSON.stringify([...done]));
  };

  items.forEach((li, i) => {
    li.classList.add('check-item');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'check-btn';
    btn.setAttribute('role', 'checkbox');
    btn.setAttribute('aria-label', `${tx.mark}: ${(li.textContent || '').trim().slice(0, 60)}`);
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btn.addEventListener('click', () => {
      if (done.has(i)) done.delete(i);
      else done.add(i);
      paint();
    });
    li.prepend(btn);
  });
  bar.querySelector('.check-reset')!.addEventListener('click', () => {
    done = new Set();
    paint();
  });
  paint();
}

/* ---------- Days until the first working day ---------- */
function countdown() {
  const box = document.querySelector<HTMLElement>('[data-countdown]');
  if (!box) return;
  const input = box.querySelector<HTMLInputElement>('input[type="date"]')!;
  const out = box.querySelector<HTMLElement>('.countdown-out')!;
  const show = () => {
    const v = input.value;
    if (!v) {
      out.hidden = true;
      return;
    }
    store.set('gb-start', v);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((new Date(`${v}T00:00:00`).getTime() - today.getTime()) / 86400000);
    out.hidden = false;
    const b = out.querySelector('b')!;
    const s = out.querySelector('span')!;
    s.hidden = days <= 0;
    b.textContent = days > 0 ? `${days} ${box.dataset.days}` : days === 0 ? box.dataset.today! : box.dataset.past!;
  };
  input.value = store.get('gb-start') || '';
  input.addEventListener('change', show);
  show();
}

/* ---------- Home: the search field suggests what people look for; a tap searches for the word on show ---------- */
function heroSearch() {
  const btn = document.querySelector<HTMLButtonElement>('.hero-search[data-hints]');
  if (!btn) return;
  const tx = btn.querySelector<HTMLElement>('.hero-search-tx')!;
  const rest = tx.dataset.rest || '';
  const words = (btn.dataset.hints || '').split('|').filter(Boolean);
  if (!words.length || reduceMotion()) return;
  let i = -1;
  const show = () => {
    i = (i + 1) % (words.length + 1);
    const word = i === words.length ? '' : words[i];
    tx.classList.add('is-swap');
    setTimeout(() => {
      if (word) {
        tx.innerHTML = `<b>${escapeHtml(word)}</b>`;
        btn.dataset.q = word;
      } else {
        tx.textContent = rest;
        delete btn.dataset.q;
      }
      tx.classList.remove('is-swap');
    }, 240);
  };
  setTimeout(() => {
    show();
    setInterval(() => !document.hidden && show(), 2400);
  }, 2600);
}

/* ---------- Articles: text size the reader picks, kept on the device ---------- */
const TS_STEPS = [0.9, 1, 1.15, 1.3];
function textSize() {
  const box = document.querySelector<HTMLElement>('[data-textsize]');
  if (!box) return;
  const L = { ru: ['Уменьшить текст', 'Увеличить текст'], en: ['Smaller text', 'Larger text'], uz: ['Matnni kichraytirish', 'Matnni kattalashtirish'] }[pageLang()];
  const [less, more] = Array.from(box.querySelectorAll<HTMLButtonElement>('button'));
  less.setAttribute('aria-label', L[0]);
  more.setAttribute('aria-label', L[1]);
  const saved = Number(store.get('gb-ts'));
  let i = Number.isInteger(saved) && saved >= 0 && saved < TS_STEPS.length && store.get('gb-ts') !== null && store.get('gb-ts') !== '' ? saved : 1;
  const paint = () => {
    if (TS_STEPS[i] === 1) document.documentElement.style.removeProperty('--ts');
    else document.documentElement.style.setProperty('--ts', String(TS_STEPS[i]));
    less.disabled = i === 0;
    more.disabled = i === TS_STEPS.length - 1;
  };
  for (const b of [less, more])
    b.addEventListener('click', () => {
      i = Math.min(TS_STEPS.length - 1, Math.max(0, i + Number(b.dataset.ts)));
      store.set('gb-ts', String(i));
      paint();
    });
  box.hidden = false;
  paint();
}

/* ---------- Expat hub: the route as one line; ticks are kept on this device ---------- */
function expatPath() {
  const box = document.querySelector<HTMLElement>('[data-path]');
  if (!box) return;
  let done: string[] = [];
  try {
    done = JSON.parse(store.get('gb-path') || '[]');
  } catch {
    /* nothing saved yet */
  }
  const ticks = Array.from(box.querySelectorAll<HTMLButtonElement>('.path-tick'));
  const stages = Array.from(box.querySelectorAll<HTMLElement>('.path-stage'));
  const count = box.querySelector<HTMLElement>('[data-path-done]')!;
  const bar = box.querySelector<HTMLElement>('[data-path-bar]')!;
  const all = box.querySelector<HTMLElement>('.path-all')!;
  store.set('gb-path-n', String(ticks.length));
  const paint = () => {
    ticks.forEach((b) => {
      const on = done.includes(b.dataset.step!);
      b.setAttribute('aria-pressed', String(on));
      b.closest('li')!.classList.toggle('is-done', on);
    });
    let current = false;
    stages.forEach((st) => {
      const full = Array.from(st.querySelectorAll<HTMLButtonElement>('.path-tick')).every((b) => done.includes(b.dataset.step!));
      st.classList.toggle('is-done', full);
      st.classList.toggle('is-current', !full && !current);
      if (!full) current = true;
    });
    const n = ticks.filter((b) => done.includes(b.dataset.step!)).length;
    count.textContent = String(n);
    bar.style.setProperty('--p', String(n / ticks.length));
    all.hidden = n < ticks.length;
  };
  ticks.forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.step!;
      done = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
      store.set('gb-path', JSON.stringify(done));
      paint();
    }),
  );
  paint();
}

/* ---------- Home: "put the guidebook on your phone" — the browser's own install prompt where there is one,
   plain steps where there is not (iPhone) ---------- */
const INSTALL_TX = {
  ru: {
    title: 'Гайдбук на экране телефона',
    lead: 'Открывается как приложение. Важные страницы работают и без интернета.',
    btn: 'Установить',
    hide: 'Скрыть',
    ios: ['Откройте эту страницу в Safari', 'Нажмите «Поделиться» — квадрат со стрелкой вверх', 'Выберите «На экран „Домой“» и нажмите «Добавить»'],
    android: ['Откройте меню браузера — три точки', 'Выберите «Установить приложение» или «Добавить на главный экран»'],
    desktop: ['Нажмите значок установки в адресной строке', 'Или откройте меню браузера и выберите «Установить»'],
  },
  en: {
    title: 'The guidebook on your home screen',
    lead: 'Opens like an app. The key pages work without a connection, too.',
    btn: 'Install',
    hide: 'Hide',
    ios: ['Open this page in Safari', 'Tap Share — the square with an arrow', 'Choose “Add to Home Screen”, then “Add”'],
    android: ['Open the browser menu — three dots', 'Choose “Install app” or “Add to Home screen”'],
    desktop: ['Click the install icon in the address bar', 'Or open the browser menu and choose “Install”'],
  },
  uz: {
    title: 'Qoʻllanma telefon ekranida',
    lead: 'Ilova kabi ochiladi. Muhim sahifalar internetsiz ham ishlaydi.',
    btn: 'Oʻrnatish',
    hide: 'Yashirish',
    ios: ['Bu sahifani Safari’da oching', '«Ulashish» tugmasini bosing — yuqoriga strelkali kvadrat', '«Bosh ekranga qoʻshish»ni tanlang va «Qoʻshish»ni bosing'],
    android: ['Brauzer menyusini oching — uch nuqta', '«Ilovani oʻrnatish» yoki «Bosh ekranga qoʻshish»ni tanlang'],
    desktop: ['Manzil satridagi oʻrnatish belgisini bosing', 'Yoki brauzer menyusidan «Oʻrnatish»ni tanlang'],
  },
};
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
function installCard() {
  const host = document.querySelector<HTMLElement>('[data-install]');
  if (!host) return;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (matchMedia('(display-mode: standalone)').matches || nav.standalone === true || store.get('gb-install-hide') === '1') return;
  const T = INSTALL_TX[pageLang()];
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const steps = ios ? T.ios : /Android/.test(ua) ? T.android : T.desktop;
  host.innerHTML = `<div class="install">
    <span class="install-ic" aria-hidden="true"><svg viewBox="0 0 48 48" width="30" height="30"><rect x="12" y="4" width="24" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 14v12m0 0-5-5m5 5 5-5M19 33h10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <div class="install-tx"><b>${T.title}</b><span>${T.lead}</span></div>
    <button type="button" class="install-btn" aria-expanded="false">${T.btn}</button>
    <button type="button" class="install-x" aria-label="${T.hide}"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
    <ol class="install-how" hidden>${steps.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ol>
  </div>`;
  const w = window as Window & { __gbInstall?: InstallEvent };
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    w.__gbInstall = e as InstallEvent;
  });
  window.addEventListener('appinstalled', () => host.replaceChildren());
  const btn = host.querySelector<HTMLButtonElement>('.install-btn')!;
  const how = host.querySelector<HTMLElement>('.install-how')!;
  btn.addEventListener('click', async () => {
    const ev = w.__gbInstall;
    if (ev) {
      await ev.prompt();
      const choice = await ev.userChoice.catch(() => ({ outcome: 'dismissed' }));
      w.__gbInstall = undefined;
      if (choice.outcome === 'accepted') host.replaceChildren();
      return;
    }
    how.hidden = !how.hidden;
    btn.setAttribute('aria-expanded', String(!how.hidden));
  });
  host.querySelector('.install-x')!.addEventListener('click', () => {
    store.set('gb-install-hide', '1');
    host.replaceChildren();
  });
}

/* ---------- Offline: emergency numbers and the pages you opened work without a connection ---------- */
function offline() {
  if (!('serviceWorker' in navigator) || base() || location.protocol !== 'https:') return;
  navigator.serviceWorker.register('/sw.js').catch(() => {
    /* the site simply works online only */
  });
}

/* ---------- First screen folds away as you scroll: the bank greets you, then makes room ---------- */
function heroFold() {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero || reduceMotion()) return;
  onScrollFrame(() => {
    const p = clamp01(window.scrollY / (hero.offsetHeight * 0.7));
    if (p >= 1 && hero.style.getPropertyValue('--hp') === '1') return;
    hero.style.setProperty('--hp', p.toFixed(3));
  });
}

/* ---------- Article heads fold away the same way as you read on ---------- */
function headFold() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('.page-head > .wrap, .city-hero'));
  if (!els.length || reduceMotion()) return;
  els.forEach((el) => (el.dataset.fold = ''));
  onScrollFrame(() => {
    for (const el of els) {
      const r = el.getBoundingClientRect();
      // 0 while the head is on screen, 1 once it has gone up under the top bar.
      const p = clamp01((90 - r.top) / Math.max(r.height, 1));
      el.style.setProperty('--fp', p.toFixed(3));
    }
  });
}

/** Marks the parts of an article that rise in as you reach them. */
function decorate() {
  if (reduceMotion()) return;
  const mark = (sel: string, stagger = false) =>
    document.querySelectorAll<HTMLElement>(sel).forEach((el, i) => {
      el.classList.add('reveal');
      if (stagger) el.style.setProperty('--i', String(i % 8));
    });
  mark('.summary li', true);
  mark('.prose > h2');
  mark('.prose > blockquote');
  mark('.prose > .phone-demo');
  mark('.prose > .video-reel');
  mark('.prose > p');
  mark('.route-steps > li', true);
  mark('.facts > li', true);
  mark('.prose > h2 .ch-no');
  document.querySelectorAll<HTMLElement>('.table-scroll').forEach((t) =>
    t.querySelectorAll<HTMLElement>('tbody tr').forEach((tr, i) => {
      tr.classList.add('reveal');
      tr.style.setProperty('--i', String(i % 10));
    }),
  );
  mark('.pager a');
  mark('.faq-group > .section-title');
}

/* ---------- City strip: photos drift against their cards as the strip moves, names drift the other way ---------- */
function cityDepth() {
  const strip = document.querySelector<HTMLElement>('.cities');
  if (!strip || reduceMotion()) return;
  const cards = Array.from(strip.querySelectorAll<HTMLElement>('.city'));
  let ticking = false;
  const update = () => {
    ticking = false;
    const box = strip.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (r.right < box.left - 50 || r.left > box.right + 50) continue;
      const d = Math.max(-1, Math.min(1, (r.left + r.width / 2 - mid) / box.width));
      c.style.setProperty('--d', d.toFixed(3));
    }
  };
  const on = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  strip.addEventListener('scroll', on, { passive: true });
  window.addEventListener('resize', on);
  update();
}

/* ---------- Topic illustrations play with the scroll (--p from 0 entering to 1 leaving) ---------- */
function illustrationsOnScroll() {
  const items = Array.from(document.querySelectorAll<SVGElement>('.illus'));
  if (!items.length || reduceMotion()) return;
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('is-on', e.isIntersecting)));
  items.forEach((el) => io.observe(el));
  onScrollFrame(() => {
    const vh = window.innerHeight;
    for (const el of items) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) continue;
      // Reaches the finished picture a little above the centre of the screen, and stays there.
      const p = clamp01((vh - r.top) / (vh * 0.75 + r.height * 0.5));
      el.style.setProperty('--p', p.toFixed(3));
    }
  });
}

/* ---------- Guide that follows the reader ----------
   Its heart fills with glaze as you read, it knows which section you are in, looks the way you
   scroll, nudges you at "Важно" notes and offers the next step near the end. */
const GUIDE_TEXT = {
  ru: { name: 'Гид', next: 'Следующий шаг', now: 'Сейчас', of: 'из', important: 'Здесь важное — прочитайте внимательно.', open: 'Подсказка гида' },
  en: { name: 'Guide', next: 'Next step', now: 'Now', of: 'of', important: 'Something important here — read it carefully.', open: 'Guide tip' },
  uz: { name: 'Yoʻlboshchi', next: 'Keyingi qadam', now: 'Hozir', of: '/', important: 'Bu yerda muhim maʼlumot bor.', open: 'Yoʻlboshchi' },
};


function followingGuide() {
  const next = document.querySelector<HTMLAnchorElement>('.pager .next');
  const article = document.querySelector<HTMLElement>('article');
  if (!next || !article || document.querySelector('.guide-fab')) return;
  const lang = (document.documentElement.lang as keyof typeof GUIDE_TEXT) in GUIDE_TEXT ? (document.documentElement.lang as keyof typeof GUIDE_TEXT) : 'ru';
  const tx = GUIDE_TEXT[lang];
  const title = next.querySelector('strong')?.textContent || '';
  const heads = Array.from(article.querySelectorAll<HTMLElement>('.prose > h2'));

  const fab = document.createElement('div');
  fab.className = 'guide-fab';
  fab.innerHTML = `
    <div class="guide-fab-bubble" id="guide-fab-bubble">
      <small data-k="label"></small>
      <span data-k="text"></span>
      <a data-k="next" href="${next.getAttribute('href')}"><small>${tx.next}</small>${escapeHtml(title)}</a>
    </div>
    <button type="button" class="guide-fab-btn" aria-expanded="false" aria-controls="guide-fab-bubble" aria-label="${tx.open}">
    </button>`;
  const face = (document.getElementById('guide-face-tpl') as HTMLTemplateElement | null)?.content.cloneNode(true);
  if (face) fab.querySelector('.guide-fab-btn')!.append(face);
  document.body.append(fab);
  const btn = fab.querySelector<HTMLButtonElement>('.guide-fab-btn')!;
  const label = fab.querySelector<HTMLElement>('[data-k="label"]')!;
  const text = fab.querySelector<HTMLElement>('[data-k="text"]')!;

  let mode: 'closed' | 'section' | 'note' | 'next' = 'closed';
  let closeTimer = 0;
  let active = -1;
  const sectionLine = () =>
    active >= 0 ? [`${tx.now} · ${active + 1} ${tx.of} ${heads.length}`, heads[active].textContent || ''] : [tx.next, ''];

  /** Opens the bubble in a mode; timed bubbles close themselves. */
  const say = (m: typeof mode, ms = 0) => {
    clearTimeout(closeTimer);
    mode = m;
    const [l, t] = m === 'note' ? [tx.name, tx.important] : sectionLine();
    label.textContent = m === 'next' ? '' : l;
    text.textContent = m === 'next' ? '' : t;
    fab.dataset.mode = m;
    fab.classList.toggle('is-open', m !== 'closed');
    btn.setAttribute('aria-expanded', String(m !== 'closed'));
    if (ms) closeTimer = window.setTimeout(() => say('closed'), ms);
  };
  const hop = (cls: string) => {
    if (reduceMotion()) return;
    btn.classList.remove(cls);
    void btn.offsetWidth;
    btn.classList.add(cls);
  };

  btn.addEventListener('click', () => say(mode === 'closed' ? 'section' : 'closed'));

  // Notes marked "Важно": the guide points at them once.
  const seen = new WeakSet<Element>();
  const warnIo = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting || seen.has(e.target) || !fab.classList.contains('is-visible')) continue;
        seen.add(e.target);
        hop('is-alert');
      }
    },
    { rootMargin: '-35% 0px -35% 0px' },
  );
  article.querySelectorAll('.prose blockquote.is-warn').forEach((q) => warnIo.observe(q));

  const pager = next.closest('.pager') as HTMLElement;
  let lastY = window.scrollY;
  let lookTimer = 0;
  onScrollFrame(() => {
    const vh = window.innerHeight;
    const r = article.getBoundingClientRect();
    const read = clamp01((vh - r.top) / r.height);
    fab.style.setProperty('--read', read.toFixed(3));
    // The pager itself takes over once it is on screen.
    const pagerInView = pager.getBoundingClientRect().top < vh - 40;
    fab.classList.toggle('is-visible', read > 0.12 && !pagerInView);
    if (pagerInView && mode !== 'closed') say('closed');

    let now = -1;
    heads.forEach((h, n) => {
      if (h.getBoundingClientRect().top < vh * 0.35) now = n;
    });
    if (now > active && active >= 0) hop('is-hop');
    active = now;
    if (mode === 'section') say('section');

    // Eyes follow the direction of reading, then settle.
    const dy = window.scrollY - lastY;
    lastY = window.scrollY;
    if (Math.abs(dy) > 2) {
      fab.style.setProperty('--look', dy > 0 ? '1.3px' : '-1.3px');
      clearTimeout(lookTimer);
      lookTimer = window.setTimeout(() => fab.style.setProperty('--look', '0px'), 450);
    }

    // On a phone the guide steps aside while you read on, and comes back when you pause or scroll up.
    fab.classList.toggle('is-tucked', dy > 0 && window.scrollY > 200);
  });
}

/* ---------- Page change: the bank's curtain rises over the page, the next page lifts it away ---------- */
const CURTAIN_IN = 220;

function coverAndGo(e: MouseEvent, link: HTMLAnchorElement) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
  if (link.origin !== location.origin) return;
  const to = new URL(link.href);
  if (to.pathname === location.pathname && to.search === location.search) return; // anchor on this page
  if (reduceMotion()) return;
  e.preventDefault();
  closeSheets();
  try {
    sessionStorage.setItem('gb-cover', '1');
  } catch {
    /* the next page simply appears without the curtain */
  }
  document.documentElement.classList.add('is-covering');
  window.setTimeout(() => (location.href = link.href), CURTAIN_IN);
  // The navigation may not happen (offline, a download): never leave the page covered.
  window.setTimeout(() => document.documentElement.classList.remove('is-covering'), CURTAIN_IN + 4000);
}

/** On arrival behind the curtain (set by the head script), lift it away. */
function liftCover() {
  const root = document.documentElement;
  if ((document as Document & { prerendering?: boolean }).prerendering) {
    document.addEventListener('prerenderingchange', liftCover, { once: true });
    return;
  }
  if (!root.classList.contains('is-covered')) return;
  requestAnimationFrame(() => {
    root.classList.remove('is-covered');
    root.classList.add('is-lifting');
    window.setTimeout(() => root.classList.remove('is-lifting'), 620);
  });
}

// Remember where you were on each page, so "Назад" brings you back to that exact place.
window.addEventListener('pagehide', () => {
  try {
    const all = JSON.parse(sessionStorage.getItem('gb-y') || '{}');
    all[location.pathname] = Math.round(window.scrollY);
    sessionStorage.setItem('gb-y', JSON.stringify(all));
  } catch {
    /* without storage, Back opens the page at its top */
  }
});

// Back from the bfcache: the page we left was still covered.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  document.documentElement.classList.remove('is-covering', 'is-covered', 'is-lifting');
  const trail = readTrail();
  const at = trail.lastIndexOf(location.pathname);
  try {
    sessionStorage.setItem(TRAIL, JSON.stringify(at >= 0 ? trail.slice(0, at + 1) : [...trail, location.pathname]));
  } catch {
    /* ignore */
  }
});

/* ---------- Dock lens: a drop of glass under the current tab that flows to the one you press ---------- */
function dockLens() {
  const dock = document.querySelector<HTMLElement>('.dock');
  const lens = dock?.querySelector<HTMLElement>('.dock-lens');
  if (!dock || !lens) return;
  const items = Array.from(dock.querySelectorAll<HTMLElement>(':scope > a, :scope > button'));
  const moveTo = (el: HTMLElement | undefined) => {
    items.forEach((i) => i.classList.toggle('is-lensed', i === el));
    if (!el) {
      dock.classList.remove('has-lens');
      return;
    }
    dock.style.setProperty('--lx', `${el.offsetLeft}px`);
    dock.style.setProperty('--lw', `${el.offsetWidth}px`);
    lens.style.setProperty('--lx', `${el.offsetLeft}px`);
    lens.style.setProperty('--lw', `${el.offsetWidth}px`);
    dock.classList.add('has-lens');
  };
  const current = () => items.find((i) => i.getAttribute('aria-current') === 'page');
  moveTo(current());
  dock.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('a, button');
    if (!el || !items.includes(el)) return;
    dock.classList.add('is-pressing');
    moveTo(el);
  });
  const settle = () => dock.classList.remove('is-pressing');
  dock.addEventListener('pointerup', settle);
  dock.addEventListener('pointercancel', () => {
    settle();
    moveTo(current());
  });
  // Sheets opened from the dock hand the lens back when they close.
  new MutationObserver(() => {
    if (!document.querySelector('.sheet[data-open]')) moveTo(current());
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-open'] });
  window.addEventListener('resize', () => moveTo(dock.querySelector<HTMLElement>('.is-lensed') ?? current()));
}
