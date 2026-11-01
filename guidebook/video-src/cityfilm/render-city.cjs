// Renders the city films (city.html, 1920×1080) frame by frame and encodes MP4s for the site.
// Run from the guidebook folder: NODE_PATH=$(npm root -g) node video-src/cityfilm/render-city.cjs <city> [ru,en,uz]
// Output: public/video/city-<city>-<lang>.mp4 (1280×720) + poster, and a 1080p master in /tmp.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const KEYS = { tashkent: [0, 21], andijan: [2, 22], samarkand: [-2, 23], bukhara: [3, 24], khiva: [-3, 25], mountains: [1, 26] };

(async () => {
  const city = process.argv[2];
  const langs = (process.argv[3] || 'ru,en,uz').split(',');
  const photos = fs
    .readdirSync(__dirname)
    .filter((f) => /^credits-.*\.json$/.test(f))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')))
    .filter((ph) => ph.city === city && fs.existsSync(path.join(__dirname, 'photos', ph.file)))
    .sort((a, b) => a.file.localeCompare(b.file, 'en', { numeric: true }));
  if (!photos.length) throw new Error(`no photos for ${city}`);
  const fps = 30;
  const browser = await chromium.launch();
  for (const lang of langs) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `city-${city}-${lang}-`));
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await p.goto(`file://${path.join(__dirname, 'city.html')}`);
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate((d) => window.setup(d), { city, lang, photos });
    const dur = await p.evaluate(() => window.DUR);
    for (let i = 0; i < Math.round(dur * fps); i++) {
      await p.evaluate((t) => window.render(t), i / fps);
      await p.screenshot({ path: path.join(dir, `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
    await p.close();
    const master = path.join(os.tmpdir(), `city-${city}-${lang}-1080.mp4`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(dir, '%05d.jpg'), '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', master]);
    // Original music (../arrival/music.py), the closing card lands on the final chord.
    const [key, seed] = KEYS[city] || [0, 20];
    const wav = path.join(os.tmpdir(), `city-${city}-music.wav`);
    execFileSync('python3', ['-I', path.join(__dirname, '../arrival/music.py'), wav, '--dur', String(dur), '--final', String(photos.length * 4.2), '--key', String(key), '--seed', String(seed)]);
    const mixed = master.replace('.mp4', '-m.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', master, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', mixed]);
    fs.renameSync(mixed, master);
    const out = path.resolve(__dirname, `../../public/video/city-${city}-${lang}.mp4`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', master, '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '112k', out]);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '2', '-i', master, '-frames:v', '1', '-vf', 'scale=1280:720', '-q:v', '80', out.replace('.mp4', '-poster.webp')]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('done', city, lang, dur.toFixed(1) + 's');
  }
  await browser.close();
})();
