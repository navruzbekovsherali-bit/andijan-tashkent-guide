/* Shared parts of the guidebook films (see arrival.html / hotel.html for the first two).
   A film page includes film.css + film.js, puts its own scene inside #stage, calls Film.init()
   with its texts, and defines render(t). Every frame is a pure function of time. */
(function () {
  const MARK =
    '<svg viewBox="270 270 1390 1390"><circle cx="965" cy="965" r="616.5" fill="none" stroke="#1aa752" stroke-width="137" stroke-dasharray="1500 300 1500 572"/><polygon points="1215,476 1440,466 1125,1307 902,1307 1007,1023 880,1023 720,1480 495,1465 812,622 1033,622 928,908 1052,908" fill="#1aa752"/></svg>';
  const TICK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const NEXT = '<svg viewBox="0 0 24 24"><path d="M6 12h12M13 7l5 5-5 5" fill="none" stroke="#f2f5f3" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const back = (x) => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const p = (t, t0, t1, e = easeInOut) => e(clamp((t - t0) / (t1 - t0)));
  function key(t, keys, e = easeInOut) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i]; const [t0, v0] = keys[i - 1];
      if (t <= t1) return v0 + (v1 - v0) * e((t - t0) / (t1 - t0 || 1));
    }
    return keys[keys.length - 1][1];
  }
  const fade = (t, a, b, c, d) => Math.min(p(t, a, b, easeOut), 1 - p(t, c, d, easeInOut));
  const $ = (id) => document.getElementById(id);
  const set = (el, css) => Object.assign((typeof el === 'string' ? $(el) : el).style, css);
  const typ = (t, s, a, b) => s.slice(0, Math.round(clamp((t - a) / (b - a)) * s.length));
  const caret = (t, a, b) => (t > a && t < b + 0.1 ? '<i class="caret"></i>' : '');
  /** An overlay card that springs up from below and leaves upwards. */
  const card = (id, t, a, b) => {
    const i = p(t, a, a + 0.8, back); const o = p(t, b - 0.5, b);
    set(id, { transform: `translateY(${(1 - i) * 1300 + o * -1400}px)`, opacity: t < a || t > b ? 0 : 1 });
  };
  /** A stamp that slams down (and shakes the stage once). */
  const stamp = (id, t, a, rot = -8) => {
    const s = p(t, a, a + 0.35, easeOut);
    set(id, { opacity: t < a ? 0 : 1, transform: `rotate(${rot}deg) scale(${1.9 - s * 0.9})` });
    if (t > a + 0.3 && t < a + 0.5) set('stage', { transform: `translateY(${Math.sin((t - a - 0.3) * 90) * 6}px)` });
  };

  /** The traveller (or any person): suitcase optional, colour of the jacket optional. */
  function person(id, { bag = true, jacket = '#0b4a43', hair = '#0e1a18', z = 6, world = false } = {}) {
    return `<svg class="abs" id="${id}" width="240" height="330" viewBox="0 0 240 330" style="z-index:${z}">
      ${bag ? `<g id="${id}-bag"><rect x="10" y="150" width="78" height="118" rx="14" fill="#fff" stroke="#0e1a18" stroke-width="6"/><path class="line" d="M30 150 V112 H68 V150"/><path d="M24 186 H74 M24 214 H74" stroke="#1aa752" stroke-width="6" stroke-linecap="round"/><circle cx="28" cy="278" r="9" fill="#0e1a18"/><circle cx="70" cy="278" r="9" fill="#0e1a18"/></g>` : ''}
      <path id="${id}-lL" class="line" d="M150 230 L150 318" style="stroke-width:12;transform-origin:150px 230px"/>
      <path id="${id}-lR" class="line" d="M166 230 L166 318" style="stroke-width:12;transform-origin:166px 230px"/>
      <path d="M118 236 Q118 134 158 134 Q198 134 198 236 Z" fill="${jacket}" stroke="#0e1a18" stroke-width="6" stroke-linejoin="round"/>
      <path id="${id}-arm" class="line" d="M178 160 L206 196" style="stroke-width:12;transform-origin:178px 160px"/>
      <circle cx="158" cy="92" r="38" fill="#fff" stroke="#0e1a18" stroke-width="6"/>
      <path d="M122 84 Q130 46 162 50 Q194 52 196 86 Q178 70 150 74 Z" fill="${hair}"/>
      <circle cx="172" cy="96" r="5" fill="#0e1a18"/>
      <path class="line" d="M166 112 Q174 116 182 110" style="stroke-width:4"/>
    </svg>`;
  }
  /** Places a person standing on the floor (y = 1180) at x; walks while it moves. */
  function walk(id, t, keys, { floor = 1180, cam = 0, face = 1, arm = 0, show = 1 } = {}) {
    const x = key(t, keys);
    const dx = key(t + 0.05, keys) - key(t - 0.05, keys);
    const walking = Math.abs(dx) > 0.5;
    const sw = walking ? Math.sin(t * 13) : 0;
    set(id, { transform: `translate(${x - cam - 150}px, ${floor - 322 + (walking ? -Math.abs(sw) * 7 : 0)}px) scaleX(${face})`, opacity: show, transformOrigin: '158px 0' });
    set(`${id}-lL`, { transform: `rotate(${sw * 20}deg)` });
    set(`${id}-lR`, { transform: `rotate(${-sw * 20}deg)` });
    set(`${id}-arm`, { transform: `rotate(${walking ? sw * 10 : arm}deg)` });
    const bag = $(`${id}-bag`);
    if (bag) set(bag, { transform: `rotate(${walking ? -6 : 0}deg)`, transformOrigin: '50px 278px' });
    return x;
  }

  let T = {};
  /** Builds the header, progress, caption and final screen from the film's texts. */
  function init(texts, { segs = 3 } = {}) {
    const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ru';
    T = texts[lang];
    document.documentElement.lang = lang;
    const stage = $('stage');
    stage.insertAdjacentHTML('afterbegin', `
      <div class="head">${MARK}<b>Hamkor Bank</b><span>${lang === 'en' ? 'GUIDEBOOK' : 'ГАЙДБУК'}</span></div>
      <div class="segs" id="segs">${'<i><b></b></i>'.repeat(segs)}</div>`);
    stage.insertAdjacentHTML('beforeend', `
      <div class="cap" id="cap"><span class="k" id="capK"></span><h2 id="capH"></h2><p id="capP"></p></div>
      <div class="final" id="final">
        <h2 id="fH">${T.final.title}</h2>
        ${T.final.items.map((it, i) => `<div class="done${it.next ? ' next' : ''}" id="f${i}"><span class="c">${it.next ? NEXT : TICK}</span><span>${it.text}${it.small ? `<small>${it.small}</small>` : ''}</span></div>`).join('')}
        <div class="brand" id="fBrand">${MARK}<div><b>Hamkor Bank</b><span>${lang === 'en' ? 'Employee guidebook' : 'Гайдбук сотрудника'}</span></div></div>
      </div>`);
    return T;
  }
  /** Captions: [[ [kicker, title, text], from, to, cls ], ...]; numbered by order. */
  function captions(t, caps) {
    let shown = null;
    for (const c of caps) if (t >= c[1] - 0.4 && t <= c[2] + 0.4) shown = c;
    if (!shown) return set('cap', { opacity: 0 });
    const [c, a, b, cls = ''] = shown;
    const n = caps.indexOf(shown) + 1;
    $('capK').innerHTML = `<i>${n}</i>${c[0]}`;
    $('capH').textContent = c[1];
    $('capP').textContent = c[2];
    $('cap').className = `cap ${cls}`;
    const v = fade(t, a - 0.4, a + 0.2, b - 0.2, b + 0.4);
    set('cap', { opacity: v, transform: `translateY(${(1 - v) * 60}px)` });
  }
  function progress(t, ranges) {
    [...$('segs').children].forEach((s, i) => (s.firstElementChild.style.transform = `scaleX(${clamp((t - ranges[i][0]) / (ranges[i][1] - ranges[i][0]))})`));
  }
  /** The closing screen: slides up at t0, then the items tick in one by one. */
  function final(t, t0) {
    const fin = p(t, t0, t0 + 0.8);
    set('final', { transform: `translateY(${(1 - fin) * 100}%)`, borderRadius: `${(1 - fin) * 80}px ${(1 - fin) * 80}px 0 0` });
    const h = p(t, t0 + 0.6, t0 + 1.1, easeOut);
    set('fH', { opacity: h, transform: `translateY(${(1 - h) * 30}px)` });
    T.final.items.forEach((_, i) => {
      const a = t0 + 1.2 + i * 0.65;
      const v = p(t, a, a + 0.5, easeOut);
      set(`f${i}`, { opacity: v, transform: `translateX(${(1 - v) * -40}px)` });
      set($(`f${i}`).querySelector('.c'), { transform: `scale(${back(clamp((t - a - 0.1) / 0.45))})` });
    });
    const br = p(t, t0 + 1.4 + T.final.items.length * 0.65, t0 + 2.1 + T.final.items.length * 0.65, easeOut);
    set('fBrand', { opacity: br, transform: `translateY(${(1 - br) * 40}px)` });
  }
  function play(render, dur) {
    window.render = render;
    window.DUR = dur;
    render(0);
    if (new URLSearchParams(location.search).has('play')) {
      const t0 = performance.now();
      const loop = () => { render(((performance.now() - t0) / 1000) % dur); requestAnimationFrame(loop); };
      loop();
    }
  }

  window.Film = { clamp, easeOut, easeInOut, back, p, key, fade, $, set, typ, caret, card, stamp, person, walk, init, captions, progress, final, play, MARK, TICK };
})();
