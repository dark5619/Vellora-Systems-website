// Desktop review captures: every route at its reference width, 1440 × 900 and 1728 × 991
// (viewport + full page), after fonts, images and the Home scene have settled.
//
//   node scripts/shots.mjs <label> [--base http://localhost:4173] [--only about,work] [--dpr 1]
//
// Output: test-results/shots/<label>/<route>-<w>x<h>[-full][@2x].png
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const LABEL = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'current';
const BASE = arg('base', 'http://localhost:4173');
const ONLY = arg('only', '')?.split(',').filter(Boolean);
const DPR = Number(arg('dpr', '1'));
const SIZES = arg('sizes', '')?.split(',').filter(Boolean);
const FULL = !process.argv.includes('--no-full');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(ROOT, 'test-results/shots', LABEL);
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { id: 'home', path: '/', w: 1672, h: 941 },
  { id: 'work', path: '/work', w: 1199, h: 1312 },
  { id: 'case', path: '/work/streaming-platform', w: 1199, h: 1312 },
  { id: 'expertise', path: '/expertise', w: 1672, h: 941 },
  { id: 'studio', path: '/studio', w: 1199, h: 1312 },
  { id: 'about', path: '/about', w: 1199, h: 711 },
  { id: 'contact', path: '/contact', w: 1199, h: 613 },
].filter((p) => !ONLY?.length || ONLY.includes(p.id));

const REST_CSS = `*{caret-color:transparent!important}`;

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = [...document.images];
    imgs.forEach((i) => (i.loading = 'eager'));
    // Scroll through once so lazy content and in-view reveals resolve.
    const step = innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
    await Promise.all(
      [...document.images].map((i) => (i.complete ? (i.decode?.().catch(() => {}) ?? null) : new Promise((r) => { i.onload = i.onerror = r; }))),
    );
  });
  await page.addStyleTag({ content: REST_CSS });
  await page
    .waitForFunction(() => {
      const el = document.querySelector('[data-hero-mode]');
      return !el || el.getAttribute('data-hero-mode') !== 'loading';
    }, { timeout: 8000 })
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 900));
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  for (const p of PAGES) {
    const sizes = [[p.w, p.h], [1440, 900], [1728, 991]].filter(([w, h]) => !SIZES?.length || SIZES.includes(`${w}x${h}`) || SIZES.includes('native') && w === p.w);
    for (const [w, h] of sizes) {
      const page = await browser.newPage();
      await page.setViewport({ width: w, height: h, deviceScaleFactor: DPR });
      await page.goto(BASE + p.path, { waitUntil: 'networkidle0' });
      await settle(page);
      const mode = await page.evaluate(() => document.querySelector('[data-hero-mode]')?.getAttribute('data-hero-mode') ?? '');
      const suffix = DPR !== 1 ? `@${DPR}x` : '';
      await page.screenshot({ path: path.join(OUT, `${p.id}-${w}x${h}${suffix}.png`) });
      if (FULL && w !== 1440) await page.screenshot({ path: path.join(OUT, `${p.id}-${w}x${h}-full${suffix}.png`), fullPage: true });
      console.log(`${p.id} ${w}x${h}${suffix}${mode ? ` hero=${mode}` : ''}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
