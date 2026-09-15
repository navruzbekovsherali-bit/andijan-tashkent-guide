/**
 * hero-current.ts — the "Editorial Atlas" WebGL hero current.
 *
 * A slow, wide topographic flow-field rendered on one fullscreen triangle with a
 * single fragment shader (IQ-style domain-warped fbm + thin contour crests). No
 * geometry, no loaders, no textures, no post-FX.
 *
 * Loaded ONLY via a dynamic import from HeroCanvas.astro, after first paint and
 * after the capability gate has already passed. This module assumes it is safe
 * to touch the GPU. Everything here is torn down by the returned `destroy()`.
 *
 * Colours are read from the live computed CSS custom properties on <html> so the
 * field tracks the light/dark token palette (and any future token change). They
 * are re-read on `aw:theme-change` and on a <html> class MutationObserver.
 */
import { Renderer, Program, Mesh, Triangle, Vec2, Color } from 'ogl';

export interface HeroCurrentController {
  destroy(): void;
}

/* --------------------------------------------------------------- shaders -- */

const VERT = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;      // seconds since mount
  uniform vec2  uResolution;// css px
  uniform vec2  uMouse;     // lerped pointer, tiny amplitude (UV-ish units)
  uniform float uSettle;    // 0 -> 1 one-time resolve from dispersed to calm
  uniform vec3  uColorBg;   // --aw-color-bg-page
  uniform vec3  uColorBase; // ink azure  (--aw-color-primary)
  uniform vec3  uColorCeramic;
  uniform vec3  uColorAmber;
  uniform vec3  uColorAccent;

  /* --- value noise + fbm (cheap, no derivatives, WebGL1-safe GLSL) ------- */
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i + vec2(0.0, 0.0));
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.55;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 4; i++) {
      v += amp * vnoise(p);
      p = rot * p * 2.02 + 0.12;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    // aspect-corrected, centred coords
    vec2 uvA = (vUv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);

    // slow left -> right drift (~walking pace) + lerped pointer parallax
    float t = uTime * 0.015;
    vec2 p = uvA * 1.6;
    p.x -= t;
    p += uMouse;

    float disp = 1.0 - uSettle;                 // 1 while dispersed, 0 when calm

    // --- IQ domain warp: p -> q -> r -> field ---------------------------- --
    vec2 q;
    q.x = fbm(p + vec2(0.0, 0.0));
    q.y = fbm(p + vec2(3.4, 1.2));

    float warpAmt = 2.2 + disp * 3.6;           // chaotic while dispersed
    vec2 r;
    r.x = fbm(p + warpAmt * q + vec2(1.7, 9.2) - t * 0.5);
    r.y = fbm(p + warpAmt * q + vec2(8.3, 2.8));

    float f = fbm(p + (2.6 + disp * 2.2) * r);

    // normalised field ~0..1 for banding
    float fn = clamp(f * 1.15 + 0.15, 0.0, 1.0);

    // thin topographic contour crests
    float g = f * 3.0;
    float c = abs(fract(g) - 0.5);
    float lines = smoothstep(0.17, 0.0, c);
    lines *= 0.6 + 0.4 * smoothstep(0.15, 0.6, length(r - q)); // ride the "current"

    // --- compose: mostly ink-azure, whisper highlights ------------------- --
    vec3 col = uColorBg;

    // low-contrast ink wash
    float base = mix(0.045, 0.135, smoothstep(-0.15, 0.85, f));
    col = mix(col, uColorBase, base);

    // broad, barely-there ceramic in the deeper current
    col = mix(col, uColorCeramic, smoothstep(0.55, 1.0, fn) * 0.05 * uSettle);

    // crest highlights — thin, gated by the settle
    float hi = lines * uSettle;
    col = mix(col, uColorCeramic, hi * smoothstep(0.30, 0.62, fn) * 0.34);
    col = mix(col, uColorAmber,   hi * smoothstep(0.66, 0.86, fn) * 0.26);
    col = mix(col, uColorAccent,  hi * smoothstep(0.90, 1.00, fn) * 0.22); // rare peak

    // resolve from a near-flat bg while dispersed
    col = mix(uColorBg, col, smoothstep(0.0, 0.4, uSettle));

    // centre stays calm behind the headline; energy lives toward the edges
    vec2 d = vUv - 0.5;
    float edge = smoothstep(0.95, 0.12, dot(d, d) * 3.0);
    col = mix(uColorBg, col, 0.62 + 0.38 * edge);

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ------------------------------------------------------------ colour I/O -- */

const TOKENS = {
  uColorBg: '--aw-color-bg-page',
  uColorBase: '--aw-color-primary',
  uColorCeramic: '--aw-color-ceramic',
  uColorAmber: '--aw-color-data-fill',
  uColorAccent: '--aw-color-accent',
} as const;

type TokenUniform = keyof typeof TOKENS;

const FALLBACK: Record<TokenUniform, string> = {
  uColorBg: '#fcfbf8',
  uColorBase: '#2450e6',
  uColorCeramic: '#0e8c93',
  uColorAmber: '#f0a93b',
  uColorAccent: '#5a3ce0',
};

function toColor(raw: string, fallback: string): Color {
  const v = raw.trim();
  try {
    if (v) return new Color(v);
  } catch {
    /* fall through to fallback */
  }
  return new Color(fallback);
}

/* ---------------------------------------------------------------- mount -- */

export function mountHeroCurrent(container: HTMLElement): HeroCurrentController {
  const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  const renderer = new Renderer({
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
    dpr: Math.min(1.5, window.devicePixelRatio || 1),
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity 400ms ease';
  container.appendChild(canvas);

  const uniforms: Record<string, { value: unknown }> = {
    uTime: { value: 0 },
    uResolution: { value: new Vec2(1, 1) },
    uMouse: { value: new Vec2(0, 0) },
    uSettle: { value: 0 },
  };
  (Object.keys(TOKENS) as TokenUniform[]).forEach((key) => {
    uniforms[key] = { value: new Color(FALLBACK[key]) };
  });

  const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  /* --- colours from the live token palette ---------------------------- -- */
  function readColors(): void {
    const cs = getComputedStyle(document.documentElement);
    (Object.keys(TOKENS) as TokenUniform[]).forEach((key) => {
      const next = toColor(cs.getPropertyValue(TOKENS[key]), FALLBACK[key]);
      (uniforms[key].value as Color).copy(next);
    });
    render(performance.now());
  }

  /* --- sizing (debounced) -------------------------------------------- -- */
  let resizeTimer = 0;
  function applySize(): void {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    // setSize writes px onto style.width/height; the box is pre-locked by
    // HomeHero, so keep the canvas fluid (100%) — no layout shift either way.
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    (uniforms.uResolution.value as Vec2).set(w, h);
  }
  function onResize(): void {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      applySize();
      render(performance.now());
    }, 150);
  }

  /* --- pointer parallax (skipped on coarse pointers) ---------------- -- */
  const mouseTarget = new Vec2(0, 0);
  const AMP = 0.02; // <= ~10px equivalent in UV space
  function onPointerMove(e: PointerEvent): void {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    mouseTarget.set(nx * AMP, -ny * AMP);
  }

  /* --- loop: ~30fps, one-time settle, lerped pointer ---------------- -- */
  const start = performance.now();
  let raf = 0;
  let last = start;
  let acc = 0;
  let settle = 0;
  let running = false;
  const FRAME = 1 / 30;

  function easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
  }

  function render(now: number): void {
    uniforms.uTime.value = (now - start) / 1000;
    uniforms.uSettle.value = easeOutCubic(settle);
    renderer.render({ scene: mesh });
  }

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    acc += dt;
    if (acc < FRAME) return; // ~30fps: skip this frame
    last = now;
    acc %= FRAME;

    if (settle < 1) settle = Math.min(1, settle + dt / 1.2);
    if (!coarsePointer) {
      const k = 1 - Math.pow(0.0015, dt); // frame-rate-independent lerp
      const uMouse = uniforms.uMouse.value as Vec2;
      uMouse.x += (mouseTarget.x - uMouse.x) * k;
      uMouse.y += (mouseTarget.y - uMouse.y) * k;
    }

    render(now);
  }

  function play(): void {
    if (running || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function pause(): void {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* --- visibility gates -------------------------------------------- -- */
  const io = new IntersectionObserver(
    (entries) => {
      const e = entries[0];
      if (e && e.isIntersecting && e.intersectionRatio >= 0.1) play();
      else pause();
    },
    { threshold: [0, 0.1, 0.5] }
  );
  io.observe(container);

  function onVisibility(): void {
    if (document.hidden) pause();
    else play();
  }

  /* --- theme wiring --------------------------------------------------- -- */
  const mo = new MutationObserver(readColors);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* --- wire up ------------------------------------------------------ -- */
  applySize();
  readColors();
  window.addEventListener('resize', onResize);
  document.addEventListener('aw:theme-change', readColors);
  document.addEventListener('visibilitychange', onVisibility);
  if (!coarsePointer) window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Paint one frame while the CSS poster is still the underlay, THEN fade the
  // canvas in over ~400ms (next frame so the opacity transition actually runs).
  render(performance.now());
  requestAnimationFrame(() => {
    canvas.style.opacity = '0.55';
  });
  play();

  /* --- teardown --------------------------------------------------- -- */
  let destroyed = false;
  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    pause();
    window.clearTimeout(resizeTimer);
    io.disconnect();
    mo.disconnect();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('aw:theme-change', readColors);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pointermove', onPointerMove);
    canvas.remove();
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }

  return { destroy };
}
