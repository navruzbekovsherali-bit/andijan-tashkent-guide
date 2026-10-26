// Builds preview/ from dist/: every absolute link becomes relative so the site can be
// opened from any sub-path (used for the shareable preview). Not needed for real hosting.
import { readdir, readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { join, dirname, relative, posix } from 'node:path';

const SRC = 'dist';
const OUT = 'preview';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

/** dist path → preview path (the root index becomes home.html; index.html is the launcher). */
function outPath(rel) {
  if (rel === 'index.html') return 'home.html';
  // Folders starting with "_" are reserved by the preview host.
  return rel.replace(/^_astro\//, 'assets/');
}

function rewrite(html, fileRel) {
  const depth = fileRel.split('/').length - 1;
  const up = depth ? '../'.repeat(depth) : './';
  html = html.replace(/(\s(?:href|src))="\/(?!\/)([^"#?]*)([^"]*)"/g, (_, attr, path, tail) => {
    let target = path === '' ? 'home.html' : path.endsWith('/') ? `${path}index.html` : path;
    if (target === 'index.html') target = 'home.html';
    return `${attr}="${up}${target}${tail}"`;
  });
  html = html.replace(/_astro\//g, 'assets/');
  return html.replace(/<html([^>]*)>/, `<html$1 data-base="${up}">`);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const file of await walk(SRC)) {
  const rel = relative(SRC, file).split('\\').join('/');
  const dest = join(OUT, outPath(rel));
  await mkdir(dirname(dest), { recursive: true });
  if (rel.endsWith('.html')) await writeFile(dest, rewrite(await readFile(file, 'utf8'), rel));
  else if (rel.endsWith('.css')) {
    // CSS sits next to its fonts.
    const css = (await readFile(file, 'utf8')).replace(/url\(\/_astro\//g, 'url(./');
    await writeFile(dest, css);
  } else if (rel.endsWith('.js')) {
    await writeFile(dest, (await readFile(file, 'utf8')).replace(/\/_astro\//g, './'));
  } else if (rel.endsWith('.woff')) {
    // woff2 covers every browser that can run the site.
  } else await cp(file, dest);
}
await writeFile(
  join(OUT, 'index.html'),
  `<title>Гайдбук Hamkorbank</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Предпросмотр сайта-гайдбука">
<style>body{font:16px system-ui,sans-serif;background:#edf1ec;color:#16202b;display:grid;place-items:center;min-height:100%;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}a{color:#4e36a0}</style>
<p>Открываем гайдбук… <a href="home.html">Открыть</a></p>
<script>location.replace('home.html');</script>
`,
);
console.log('preview ready');
