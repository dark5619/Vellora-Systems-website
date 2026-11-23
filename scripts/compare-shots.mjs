// Before/after comparison sheets.
//
//   node scripts/compare-shots.mjs [--before http://localhost:4174] [--after http://localhost:4173]
//
// 1. Side-by-side sheets of the captures made by scripts/shots.mjs (labels "before"/"after") for
//    every route at its reference width, 1440 × 900 and 1728 × 991.
// 2. Detail crops at device-pixel ratio 2 (1728 × 991 layout), located from the DOM of each build:
//    About office + V, wall logo; Work product interfaces; a button and heading edge.
// Output: test-results/compare-final/
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const BEFORE = arg('before', 'http://localhost:4174');
const AFTER = arg('after', 'http://localhost:4173');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOTS = path.join(ROOT, 'test-results/shots');
const OUT = path.join(ROOT, 'test-results/compare-final');
fs.mkdirSync(OUT, { recursive: true });

const label = (text, w) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="34"><rect width="100%" height="100%" fill="#0b1020"/><text x="12" y="23" font-family="Helvetica, Arial" font-size="17" font-weight="700" fill="#e8eefc">${text}</text></svg>`,
  );

async function sideBySide(a, b, outFile, titles = ['Before', 'After'], maxW = 1400) {
  const ma = await sharp(a).metadata();
  const mb = await sharp(b).metadata();
  const w = Math.min(maxW, Math.max(ma.width, mb.width));
  const A = await sharp(a).resize({ width: w }).png().toBuffer();
  const B = await sharp(b).resize({ width: w }).png().toBuffer();
  const ha = (await sharp(A).metadata()).height;
  const hb = (await sharp(B).metadata()).height;
  const gap = 12;
  const H = 34 + Math.max(ha, hb);
  await sharp({ create: { width: w * 2 + gap, height: H, channels: 3, background: '#05070f' } })
    .composite([
      { input: label(titles[0], w), left: 0, top: 0 },
      { input: label(titles[1], w), left: w + gap, top: 0 },
      { input: A, left: 0, top: 34 },
      { input: B, left: w + gap, top: 34 },
    ])
    .png()
    .toFile(outFile);
}

// ---------- 1. viewport sheets ----------
const ROUTES = { home: [1672, 941], work: [1199, 1312], case: [1199, 1312], expertise: [1672, 941], studio: [1199, 1312], about: [1199, 711], contact: [1199, 613] };
for (const [id, [w, h]] of Object.entries(ROUTES)) {
  for (const size of [`${w}x${h}`, '1440x900', '1728x991']) {
    const a = path.join(SHOTS, 'before', `${id}-${size}.png`);
    const b = path.join(SHOTS, 'after', `${id}-${size}.png`);
    if (fs.existsSync(a) && fs.existsSync(b)) await sideBySide(a, b, path.join(OUT, `${id}-${size}.png`), [`Before — ${id} ${size}`, `After — ${id} ${size}`], 1100);
  }
}
// mockup vs after at the reference size
const REFS = { home: '01_Home.png', work: '02_Our_Work.png', case: '03_Project_Case_Study.png', expertise: '04_Expertise.png', studio: '05_Studio_And_Team.png', about: '06_About.png', contact: '07_Contact.png' };
for (const [id, ref] of Object.entries(REFS)) {
  const [w, h] = ROUTES[id];
  const b = path.join(SHOTS, 'after', `${id}-${w}x${h}.png`);
  if (fs.existsSync(b)) await sideBySide(path.join(ROOT, 'design-reference', ref), b, path.join(OUT, `${id}-mockup-vs-after.png`), [`Mockup — ${ref}`, `After — ${w}×${h}`], 1100);
}
console.log('viewport sheets written');

// ---------- 2. detail crops at DPR 2 ----------
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb'] });
async function crops(base, tag) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1728, height: 991, deviceScaleFactor: 2 });
  const out = {};
  const grab = async (name, rect) => {
    out[name] = await page.screenshot({ clip: rect, captureBeyondViewport: true });
  };
  const ready = async () => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      [...document.images].forEach((i) => (i.loading = 'eager'));
      await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    });
    await page.addStyleTag({ content: '*{animation-play-state:paused!important;transition:none!important}.ab-art__light,.cs-handoff{display:none!important}' });
    await new Promise((r) => setTimeout(r, 500));
  };
  // About: the V + office edge and the wall logo, measured on the art (06_About coordinates).
  await page.goto(`${base}/about`, { waitUntil: 'networkidle0' });
  await ready();
  const k = 1728 / 1199;
  await grab('about-v', { x: 470 * k, y: 120 * k, width: 330 * k, height: 250 * k });
  await grab('about-logo', { x: 955 * k, y: 172 * k, width: 190 * k, height: 92 * k });
  await grab('about-office', { x: 780 * k, y: 240 * k, width: 419 * k, height: 200 * k });
  const head = await page.$eval('.ab-title', (e) => { const r = e.getBoundingClientRect(); return { x: r.left - 6, y: r.top - 6, width: Math.min(420, r.width + 12), height: r.height + 12 }; });
  await grab('about-heading', head);
  // Work: product interfaces and a control edge.
  await page.goto(`${base}/work`, { waitUntil: 'networkidle0' });
  await ready();
  for (const id of ['healthcare-web', 'tv-streaming', 'casual-mobile-games', 'pcb-design']) {
    const r = await page.$eval(`.pcard[data-project="${id}"] .pmedia`, (e) => { const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; });
    await grab(`work-${id}`, r);
  }
  const cta = await page.$eval('.pcard[data-project="tv-streaming"] .pcard__cta', (e) => { const b = e.getBoundingClientRect(); return { x: b.left + scrollX - 14, y: b.top + scrollY - 14, width: b.width + 28, height: b.height + 28 }; });
  await grab('work-button', cta);
  await page.close();
  for (const [name, buf] of Object.entries(out)) fs.writeFileSync(path.join(OUT, `detail-${name}-${tag}@2x.png`), buf);
  return Object.keys(out);
}
try {
  const names = await crops(BEFORE, 'before');
  await crops(AFTER, 'after');
  for (const n of names) {
    await sideBySide(path.join(OUT, `detail-${n}-before@2x.png`), path.join(OUT, `detail-${n}-after@2x.png`), path.join(OUT, `detail-${n}.png`), [`Before — ${n} (2×, 1728 layout)`, `After — ${n} (2×, 1728 layout)`], 1000);
  }
  console.log('detail crops written:', names.join(', '));
} finally {
  await browser.close();
}
