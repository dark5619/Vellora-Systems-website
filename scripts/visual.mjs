// Visual review: capture each route at its reference width (resting state, fonts loaded) and
// produce a 50% overlay against the supplied design, plus captures at the review widths.
//
//   npm run build && npm run preview   (in another terminal)
//   node scripts/visual.mjs [--base http://localhost:4173] [--only home,work] [--widths 1440,390]
//
// Output: test-results/visual/*.png
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'test-results/visual');
fs.mkdirSync(OUT, { recursive: true });

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const BASE = arg('base', 'http://localhost:4173');
const ONLY = arg('only', '')?.split(',').filter(Boolean);
const WIDTHS = arg('widths', '')?.split(',').filter(Boolean).map(Number);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PAGES = [
  { id: 'home', path: '/', ref: '01_Home.png', w: 1672, h: 941 },
  { id: 'work', path: '/work', ref: '02_Our_Work.png', w: 1199, h: 1312 },
  { id: 'case', path: '/work/streaming-platform', ref: '03_Project_Case_Study.png', w: 1199, h: 1312 },
  { id: 'expertise', path: '/expertise', ref: '04_Expertise.png', w: 1672, h: 941 },
  { id: 'studio', path: '/studio', ref: '05_Studio_And_Team.png', w: 1199, h: 1312 },
  { id: 'about', path: '/about', ref: '06_About.png', w: 1199, h: 711 },
  { id: 'contact', path: '/contact', ref: '07_Contact.png', w: 1199, h: 613 },
].filter((p) => !ONLY?.length || ONLY.includes(p.id));

const REST_CSS = `.ribbon__strip{animation:none!important;transform:none!important}
*{caret-color:transparent!important}`;

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = [...document.images];
    imgs.forEach((i) => (i.loading = 'eager'));
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  });
  await page.addStyleTag({ content: REST_CSS });
  // Home: give the WebGL scene time to swap in (or stay on the poster).
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-hero-mode]');
      return !el || el.getAttribute('data-hero-mode') !== 'loading';
    },
    { timeout: 8000 },
  ).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--enable-webgl', '--ignore-gpu-blocklist'],
});

try {
  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: p.w, height: p.h, deviceScaleFactor: 1 });
    await page.goto(BASE + p.path, { waitUntil: 'networkidle0' });
    await settle(page);
    const mode = await page.evaluate(() => document.querySelector('[data-hero-mode]')?.getAttribute('data-hero-mode') ?? null);
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: p.w, height: p.h }, captureBeyondViewport: false });
    const shotPath = path.join(OUT, `${p.id}-ref-${p.w}.png`);
    fs.writeFileSync(shotPath, shot);

    const refPath = path.join(ROOT, 'design-reference', p.ref);
    const top = await sharp(shot).removeAlpha().ensureAlpha(0.5).toBuffer();
    await sharp(refPath).composite([{ input: top, blend: 'over' }]).png().toFile(path.join(OUT, `${p.id}-overlay-50.png`));
    await sharp(refPath)
      .composite([{ input: await sharp(shot).removeAlpha().toBuffer(), blend: 'difference' }])
      .png()
      .toFile(path.join(OUT, `${p.id}-diff.png`));
    console.log(`${p.id}: captured ${p.w}×${p.h}${mode ? ` (hero: ${mode})` : ''}`);

    for (const w of WIDTHS ?? []) {
      await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
      await page.goto(BASE + p.path, { waitUntil: 'networkidle0' });
      await settle(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      await page.screenshot({ path: path.join(OUT, `${p.id}-${w}.png`), fullPage: true });
      console.log(`  ${w}px${overflow > 0 ? `  ⚠ horizontal overflow ${overflow}px` : ''}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
