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
    if (/важно|внимание|important/.test(lead)) q.classList.add('is-warn');
    else if (/совет|лайфхак|tip/.test(lead)) q.classList.add('is-tip');
    else if (/уточните|hr/.test(lead)) q.classList.add('is-hr');
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
  markCurrentNav();
  callouts();
  reveal();
  cleanupProgress = progress();
  journeyRail();
  phoneDemos();
  followingGuide();
  headerOnScroll();
  illustrationsOnScroll();
  liftCover();
}

function cameFromHere() {
  try {
    return history.length > 1 && !!document.referrer && new URL(document.referrer).origin === location.origin;
  } catch {
    return false;
  }
}

/* ---------- Animated phone demos (illustrative screens, marked as examples) ---------- */
type Screen = { kind: 'dial' | 'result'; text: string; lines?: string[]; step: number };
const DEMOS: Record<string, { title: string; steps: string[]; screens: Screen[] }> = {
  imei: {
    title: 'Пример: как проверить IMEI',
    steps: ['Наберите *#06# — телефон покажет IMEI', 'Перепишите все IMEI (их может быть два)', 'Наберите *1170# — придёт статус регистрации'],
    screens: [
      { kind: 'dial', text: '*#06#', step: 0 },
      { kind: 'result', text: 'IMEI', lines: ['IMEI 1: 35 1234 •••• 4821', 'IMEI 2: 35 1234 •••• 4839'], step: 1 },
      { kind: 'dial', text: '*1170#', step: 2 },
      { kind: 'result', text: 'UzIMEI', lines: ['IMEI 35 1234 •••• 4821', 'Статус: зарегистрирован'], step: 2 },
    ],
  },
};

function phoneDemos() {
  document.querySelectorAll<HTMLElement>('.phone-demo:not([data-ready])').forEach((host) => {
    const demo = DEMOS[host.dataset.demo || ''];
    if (!demo) return;
    host.dataset.ready = '';
    host.innerHTML = `
      <figure class="pd">
        <div class="pd-phone" aria-hidden="true"><div class="pd-notch"></div><div class="pd-screen"></div>
          <div class="pd-bar">${demo.screens.map(() => '<span></span>').join('')}</div></div>
        <figcaption>
          <strong>${escapeHtml(demo.title)}</strong>
          <ol class="pd-steps">${demo.steps.map((s, n) => `<li><button type="button" data-step="${n}">${escapeHtml(s)}</button></li>`).join('')}</ol>
          <small>Экран условный, цифры вымышлены.</small>
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
      const dur = sc.kind === 'dial' ? 2600 : 2400;
      bars.forEach((b, n) => {
        b.className = n < at ? 'is-done' : n === at ? 'is-on' : '';
        b.style.setProperty('--dur', `${dur}ms`);
      });
      if (sc.kind === 'dial' && !reduce) {
        let n = 0;
        render(sc, '');
        typing = window.setInterval(() => {
          n++;
          render(sc, sc.text.slice(0, n));
          if (n >= sc.text.length) clearInterval(typing);
        }, 260);
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
  let lastY = window.scrollY;
  onScrollFrame(() => {
    const y = window.scrollY;
    const past = hero ? y > hero.offsetHeight - 80 : true;
    if (past !== bar.classList.contains('is-scrolled')) {
      bar.classList.toggle('is-scrolled', past);
      if (hero) meta?.setAttribute('content', past ? '#f5f4f0' : '#0b1f1d');
    }
    if (Math.abs(y - lastY) < 8) return;
    const busy = document.querySelector('.sheet[data-open]') || bar.matches(':focus-within');
    bar.classList.toggle('is-hidden', !busy && y > lastY && y > 200);
    lastY = y;
  });
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
        if (mode === 'closed' || mode === 'note') say('note', 3500);
      }
    },
    { rootMargin: '-35% 0px -35% 0px' },
  );
  article.querySelectorAll('.prose blockquote.is-warn').forEach((q) => warnIo.observe(q));

  const pager = next.closest('.pager') as HTMLElement;
  let nudged = false;
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

    if (!nudged && read > 0.6 && !pagerInView) {
      nudged = true;
      say('next', 6000);
    }
  });
}

/* ---------- Page change: the bank's curtain rises over the page, the next page lifts it away ---------- */
const CURTAIN_IN = 480;

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

// Back from the bfcache: the page we left was still covered.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  document.documentElement.classList.remove('is-covering', 'is-covered', 'is-lifting');
});
