// Renders arrival.html frame by frame and encodes MP4s for the site.
// Run from the guidebook folder: NODE_PATH=$(npm root -g) node video-src/arrival/render.cjs ru [arrival|hotel]
// Needs Playwright (Chromium) and ffmpeg. Output: public/video/<film>-<lang>.mp4 (+ poster) and a 1080p master in /tmp.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const lang = process.argv[2] || 'ru';
  const film = process.argv[3] || 'arrival';
  const fps = 30;
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), `${film}-${lang}-`));
  const page = path.resolve(__dirname, `${film}.html`);
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(`file://${page}?lang=${lang}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => window.ready !== false);
  const dur = await p.evaluate(() => window.DUR);
  const frames = Math.round(dur * fps);
  for (let i = 0; i < frames; i++) {
    await p.evaluate((t) => window.render(t), i / fps);
    await p.screenshot({ path: path.join(dir, `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  }
  await browser.close();
  const master = path.join(require('os').tmpdir(), `${film}-${lang}-1080.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(dir, '%05d.jpg'), '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', master]);
  const out = path.resolve(__dirname, `../../public/video/${film}-${lang}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', master, '-vf', 'scale=720:1280', '-c:v', 'libx264', '-crf', '25', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String({ hotel: 20.4, arrival: 14.8, apartment: 17.8, firstday: 9.0, imei: 12.0 }[film] ?? 10), '-i', master, '-frames:v', '1', '-vf', 'scale=720:1280', '-q:v', '80', out.replace('.mp4', '-poster.webp')]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(lang, 'frames', frames, '→', out, '| master', master);
})();
