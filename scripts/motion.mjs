// Desktop interaction recordings (animated WebP + filmstrip) for the signature moments.
//
//   node scripts/motion.mjs [--base http://localhost:4173] [--only home,work]
//
// Uses Chrome's screencast (real frame timing) with SwiftShader WebGL, a fine mouse pointer and
// fonts/images loaded. Output: test-results/motion/<id>.webp, <id>-strip.png
// Requires img2webp (libwebp) on PATH.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const BASE = arg('base', 'http://localhost:4173');
const ONLY = arg('only', '')?.split(',').filter(Boolean);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(ROOT, 'test-results/motion');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter((i) => !i.loading || i.loading === 'eager').map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  });
}

/** Record the page while `script` runs; returns frames [{buf, t}] cropped to `clip`. */
async function record(page, clip, script, maxWidth) {
  const client = await page.target().createCDPSession();
  const frames = [];
  client.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    frames.push({ buf: Buffer.from(data, 'base64'), t: metadata.timestamp });
    try { await client.send('Page.screencastFrameAck', { sessionId }); } catch {}
  });
  const vp = page.viewport();
  await client.send('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: vp.width, maxHeight: vp.height });
  await script();
  await client.send('Page.stopScreencast');
  await client.detach();
  const out = [];
  for (const f of frames) {
    let img = sharp(f.buf);
    if (clip) img = img.extract(clip);
    if (maxWidth) img = img.resize({ width: maxWidth, kernel: 'lanczos3' });
    out.push({ buf: await img.png().toBuffer(), t: f.t });
  }
  return out;
}

async function writeAnimation(id, frames) {
  const dir = path.join(OUT, `${id}-frames`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const args = ['-loop', '0', '-lossy', '-q', '82', '-m', '4'];
  frames.forEach((f, i) => {
    const file = path.join(dir, `${String(i).padStart(4, '0')}.png`);
    fs.writeFileSync(file, f.buf);
    const next = frames[i + 1];
    const d = next ? Math.max(16, Math.round((next.t - f.t) * 1000)) : 600;
    args.push('-d', String(d), file);
  });
  const webp = path.join(OUT, `${id}.webp`);
  args.push('-o', webp);
  execFileSync('img2webp', args, { stdio: 'pipe' });
  // filmstrip: 8 evenly spaced frames
  const pick = Array.from({ length: 8 }, (_, k) => frames[Math.round((k * (frames.length - 1)) / 7)]);
  const meta = await sharp(pick[0].buf).metadata();
  const w = Math.round(meta.width / 2);
  const h = Math.round(meta.height / 2);
  const tiles = await Promise.all(pick.map((f) => sharp(f.buf).resize({ width: w }).png().toBuffer()));
  await sharp({ create: { width: w * 2, height: h * 4, channels: 3, background: '#000' } })
    .composite(tiles.map((input, k) => ({ input, left: (k % 2) * w, top: Math.floor(k / 2) * h })))
    .png()
    .toFile(path.join(OUT, `${id}-strip.png`));
  if (!process.env.KEEP_FRAMES) fs.rmSync(dir, { recursive: true, force: true });
  const dur = frames.length ? (frames[frames.length - 1].t - frames[0].t).toFixed(1) : 0;
  console.log(`${id}: ${frames.length} frames over ${dur}s → ${path.relative(ROOT, webp)}`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const JOBS = {
  // Home hero: the orbit light pass and bevel glint, then pointer depth and the exact settle.
  async home() {
    const page = await browser.newPage();
    await page.setViewport({ width: 1728, height: 991 });
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    await settle(page);
    await page.waitForFunction(() => document.querySelector('[data-hero-mode]')?.getAttribute('data-hero-mode') === 'webgl', { timeout: 15000 });
    const clip = { left: 0, top: 0, width: 1728, height: 600 };
    const frames = await record(page, clip, async () => {
      await sleep(5200); // first pass starts 0.9s after the scene appears
      await page.mouse.move(1200, 300);
      for (let i = 0; i <= 24; i++) {
        await page.mouse.move(1200 + Math.sin(i / 4) * 380, 300 + Math.cos(i / 5) * 140);
        await sleep(45);
      }
      await page.mouse.move(1720, 980); // leave: V and orbit settle back into the reflection
      await sleep(1400);
    }, 1200);
    await writeAnimation('home-hero', frames);
    await page.close();
  },
  // Work: hover and keyboard focus bring each product detail closer; captions stay put.
  async work() {
    const page = await browser.newPage();
    await page.setViewport({ width: 1728, height: 991 });
    await page.goto(`${BASE}/work`, { waitUntil: 'networkidle0' });
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, 430));
    await sleep(600);
    const boxes = await page.$$eval('.work-grid .pcard', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.3 }; }));
    const frames = await record(page, { left: 0, top: 0, width: 1728, height: 991 }, async () => {
      await sleep(300);
      for (const i of [1, 0, 2]) {
        await page.mouse.move(boxes[i].x, boxes[i].y, { steps: 6 });
        await sleep(950);
      }
      await page.mouse.move(860, 960, { steps: 4 });
      await sleep(500);
      // keyboard: focus the first card's action
      await page.focus('.work-grid .pcard .pcard__cta');
      await sleep(900);
    }, 1200);
    await writeAnimation('work-cards', frames);
    await page.close();
  },
  // Case study: TV → phone hand-off on first view.
  async case() {
    const page = await browser.newPage();
    await page.setViewport({ width: 1728, height: 991 });
    await page.goto(`${BASE}/work/streaming-platform`, { waitUntil: 'networkidle0' });
    await settle(page);
    await page.mouse.move(300, 900);
    await sleep(4200); // the first-view run has finished and its cool-down has passed
    const frames = await record(page, { left: 700, top: 80, width: 1028, height: 620 }, async () => {
      await sleep(250);
      await page.mouse.move(1200, 400, { steps: 4 }); // a fine pointer reaches the devices
      await sleep(3300);
    }, 1028);
    await writeAnimation('case-handoff', frames);
    await page.close();
  },
  // Expertise: one connection lit at a time.
  async expertise() {
    const page = await browser.newPage();
    await page.setViewport({ width: 1728, height: 991 });
    await page.goto(`${BASE}/expertise`, { waitUntil: 'networkidle0' });
    await settle(page);
    const ids = ['pcb', 'tv-streaming', 'full-stack'];
    const boxes = await page.$$eval('.ecard', (els) => Object.fromEntries(els.map((e) => { const r = e.getBoundingClientRect(); return [[...e.classList].find((c) => c.startsWith('ecard--') && !['ecard--cyan', 'ecard--violet', 'ecard--green', 'ecard--blue'].includes(c)).slice(7), { x: r.x + r.width * 0.45, y: r.y + r.height / 2 }]; })));
    const frames = await record(page, { left: 300, top: 90, width: 1428, height: 760 }, async () => {
      for (const id of ids) {
        await page.mouse.move(boxes[id].x, boxes[id].y, { steps: 5 });
        await sleep(1100);
      }
      await page.mouse.move(150, 700, { steps: 4 });
      await sleep(500);
    }, 1100);
    await writeAnimation('expertise-links', frames);
    await page.close();
  },
  // About: the light pass along the ribbon behind the metrics strip.
  async about() {
    const page = await browser.newPage();
    await page.setViewport({ width: 1728, height: 991 });
    await page.goto(`${BASE}/about`, { waitUntil: 'networkidle0' });
    await settle(page);
    const frames = await record(page, { left: 0, top: 480, width: 1728, height: 480 }, async () => {
      await sleep(6200);
    }, 1200);
    await writeAnimation('about-ribbon', frames);
    await page.close();
  },
};

try {
  for (const [id, job] of Object.entries(JOBS)) {
    if (ONLY?.length && !ONLY.includes(id)) continue;
    await job();
  }
} finally {
  await browser.close();
}
