// Image + colour audit for every route.
//
//   node scripts/audit.mjs <label> [--base http://localhost:4173] [--only about,work]
//
// 1. Image sharpness: for each visible <img> at 1728 × 991 (DPR 1 and 2) — resolved source,
//    native pixels, rendered CSS size, device-pixel upscale factor, and every filter / opacity /
//    blend / mask on the image or its ancestors.
// 2. Colour: at each mockup's native width, mean colour, saturation and highlight luminance of
//    named regions in (a) the mockup, (b) the supplied source asset placed at its manifest
//    position and (c) the rendered page.
//
// Output: test-results/audit/<label>/{images.md,colour.md}
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const LABEL = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'current';
const BASE = arg('base', 'http://localhost:4173');
const ONLY = arg('only', '')?.split(',').filter(Boolean);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = path.join(ROOT, 'test-results/audit', LABEL);
fs.mkdirSync(OUT, { recursive: true });
const SRC = path.join(ROOT, 'asset-source/Vellora-Assets');

// Regions in mockup pixels; `asset` names the supplied file that covers the region (if any).
const PAGES = [
  {
    id: 'home', path: '/', ref: '01_Home.png', w: 1672, h: 941,
    regions: [
      { name: 'V green face', r: [1180, 150, 140, 150], asset: '01-Home/backgrounds/hero-with-v.png', ax: 0, ay: 0 },
      { name: 'V blue edge', r: [850, 140, 90, 120], asset: '01-Home/backgrounds/hero-with-v.png', ax: 0, ay: 0 },
      { name: 'Quiet sky (left)', r: [700, 120, 90, 60], asset: '01-Home/backgrounds/hero-with-v.png', ax: 0, ay: 0 },
      { name: 'Games card art', r: [240, 590, 120, 150] },
      { name: 'Lower ribbon', r: [300, 760, 600, 60] },
    ],
  },
  {
    id: 'work', path: '/work', ref: '02_Our_Work.png', w: 1199, h: 1312,
    regions: [
      { name: 'Hero V', r: [650, 70, 270, 180], asset: '02-Our-Work/backgrounds/portfolio-hero.png', ax: 0, ay: 0 },
      { name: 'Games phone screen', r: [180, 380, 180, 180], asset: '02-Our-Work/project-art/casual-mobile-games.png', ax: 26, ay: 350 },
      { name: 'Streaming TV screen', r: [470, 380, 290, 170], asset: '02-Our-Work/project-art/tv-streaming.png', ax: 418, ay: 350 },
      { name: 'Neo Health screen', r: [880, 380, 270, 170], asset: '02-Our-Work/project-art/healthcare-web.png', ax: 805, ay: 350 },
      { name: 'PCB board', r: [450, 790, 300, 140], asset: '02-Our-Work/project-art/pcb-design.png', ax: 418, ay: 745 },
      { name: 'Robot arm', r: [900, 760, 260, 180], asset: '02-Our-Work/project-art/robotics-automation.png', ax: 805, ay: 745 },
      { name: 'Card body (games)', r: [30, 600, 360, 110] },
      { name: 'Card body (streaming)', r: [420, 600, 360, 110] },
      { name: 'Page background', r: [0, 320, 22, 400] },
    ],
  },
  {
    id: 'case', path: '/work/streaming-platform', ref: '03_Project_Case_Study.png', w: 1199, h: 1312,
    regions: [
      { name: 'TV feature', r: [690, 150, 430, 200], asset: '03-Case-Study/backgrounds/streaming-hero.png', ax: 0, ay: 0 },
      { name: 'Phone screen', r: [560, 200, 120, 220], asset: '03-Case-Study/backgrounds/streaming-hero.png', ax: 0, ay: 0 },
      { name: 'Outcome strip', r: [50, 765, 1100, 75] },
      { name: 'Footer mountains', r: [0, 1150, 1199, 160] },
    ],
  },
  {
    id: 'expertise', path: '/expertise', ref: '04_Expertise.png', w: 1672, h: 941,
    regions: [
      { name: 'Central V', r: [810, 370, 280, 180], asset: '04-Expertise/backgrounds/expertise-diagram.png', ax: 0, ay: 0 },
      { name: 'Full-stack card', r: [452, 138, 320, 130] },
      { name: 'Fitness card', r: [1216, 412, 406, 96] },
      { name: 'Earth', r: [0, 560, 330, 260], asset: '04-Expertise/backgrounds/earth-and-dotted-waves.png', ax: 0, ay: 0 },
    ],
  },
  {
    id: 'studio', path: '/studio', ref: '05_Studio_And_Team.png', w: 1199, h: 1312,
    regions: [
      { name: 'Office sign', r: [840, 110, 140, 130], asset: '05-Studio/backgrounds/studio-hero.png', ax: 0, ay: 0 },
      { name: 'Office lights', r: [600, 60, 400, 60], asset: '05-Studio/backgrounds/studio-hero.png', ax: 0, ay: 0 },
      { name: 'Eryk portrait face', r: [120, 460, 120, 120] },
      { name: 'Culture photo', r: [40, 820, 510, 260] },
    ],
  },
  {
    id: 'about', path: '/about', ref: '06_About.png', w: 1199, h: 711,
    regions: [
      { name: 'Ceiling lights', r: [900, 55, 290, 85], asset: '06-About/backgrounds/about-hero.png', ax: 0, ay: 0 },
      { name: 'V blue edge', r: [500, 150, 110, 150], asset: '06-About/backgrounds/about-hero.png', ax: 0, ay: 0 },
      { name: 'V green face', r: [620, 150, 120, 160], asset: '06-About/backgrounds/about-hero.png', ax: 0, ay: 0 },
      { name: 'Wall logo', r: [963, 180, 171, 73], asset: '06-About/backgrounds/about-hero.png', ax: 0, ay: 0 },
      { name: 'Office floor', r: [800, 330, 390, 110], asset: '06-About/backgrounds/about-hero.png', ax: 0, ay: 0 },
      { name: 'Metrics strip', r: [137, 450, 935, 76] },
      { name: 'Left ribbons', r: [0, 400, 130, 150] },
    ],
  },
  {
    id: 'contact', path: '/contact', ref: '07_Contact.png', w: 1199, h: 613,
    regions: [
      { name: 'Glass panel body', r: [520, 230, 280, 60] },
      { name: 'Panel edge (top)', r: [500, 38, 640, 8] },
      { name: 'Submit button', r: [512, 448, 276, 40] },
      { name: 'Globe', r: [280, 420, 180, 180], asset: '07-Contact/backgrounds/globe-and-ribbons-backdrop.png', ax: 0, ay: 0 },
      { name: 'Field (name)', r: [506, 125, 296, 30] },
    ],
  },
].filter((p) => !ONLY?.length || ONLY.includes(p.id));

const REST_CSS = `.ribbon__strip{animation:none!important;transform:none!important}*{caret-color:transparent!important}`;

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    [...document.images].forEach((i) => (i.loading = 'eager'));
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    scrollTo(0, 0);
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  });
  await page.addStyleTag({ content: REST_CSS });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-hero-mode]');
    return !el || el.getAttribute('data-hero-mode') !== 'loading';
  }, { timeout: 8000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 600));
}

/** Region statistics on raw sRGB pixels. */
async function stats(input, [x, y, w, h], { offset = [0, 0] } = {}) {
  const left = x - offset[0];
  const top = y - offset[1];
  const img = sharp(input);
  const meta = await img.metadata();
  const L = Math.max(0, left), T = Math.max(0, top);
  const W = Math.min(meta.width - L, w - (L - left)), H = Math.min(meta.height - T, h - (T - top));
  if (W <= 0 || H <= 0) return null;
  const { data, info } = await sharp(input).extract({ left: L, top: T, width: W, height: H }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0, s = 0, n = 0;
  const lum = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 250) continue;
    const R = data[i], G = data[i + 1], B = data[i + 2];
    r += R; g += G; b += B;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    s += mx === 0 ? 0 : (mx - mn) / mx;
    lum.push(0.2126 * R + 0.7152 * G + 0.0722 * B);
    n++;
  }
  if (!n) return null;
  lum.sort((a, z) => a - z);
  const p = (q) => lum[Math.min(lum.length - 1, Math.floor(q * lum.length))];
  const hex = (v) => Math.round(v / n).toString(16).padStart(2, '0');
  return { hex: `#${hex(r)}${hex(g)}${hex(b)}`, L: (lum.reduce((a, z) => a + z, 0) / n).toFixed(1), p95: p(0.95).toFixed(0), p99: p(0.99).toFixed(0), sat: (s / n).toFixed(3), n };
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const imgLines = ['# Image audit (1728 × 991)', '', 'upscale = rendered CSS px × DPR ÷ native px (largest axis). > 1 means the bitmap is enlarged on screen.', ''];
const colLines = ['# Colour audit (mockup native width, DPR 1)', '', 'L = mean luminance (0–255), p95/p99 = highlight luminance, sat = mean HSV saturation.', ''];

try {
  for (const p of PAGES) {
    // ---------- 1. image audit ----------
    for (const dpr of [1, 2]) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1728, height: 991, deviceScaleFactor: dpr });
      await page.goto(BASE + p.path, { waitUntil: 'networkidle0' });
      await settle(page);
      const rows = await page.evaluate((dpr) => {
        const out = [];
        const docH = document.documentElement.scrollHeight;
        for (const img of document.images) {
          const r = img.getBoundingClientRect();
          if (r.width < 40 || r.height < 24) continue;
          const cs = getComputedStyle(img);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const effects = [];
          let el = img;
          while (el && el !== document.body) {
            const s = getComputedStyle(el);
            const tag = el === img ? 'img' : `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')}`;
            if (s.filter !== 'none') effects.push(`${tag} filter:${s.filter}`);
            if (s.opacity !== '1') effects.push(`${tag} opacity:${s.opacity}`);
            if (s.mixBlendMode !== 'normal') effects.push(`${tag} blend:${s.mixBlendMode}`);
            const m = s.maskImage || s.webkitMaskImage;
            if (m && m !== 'none') effects.push(`${tag} mask`);
            el = el.parentElement;
          }
          const src = (img.currentSrc || img.src).replace(location.origin, '');
          const nat = Math.max(img.naturalWidth / Math.max(1, r.width), img.naturalHeight / Math.max(1, r.height));
          out.push({
            src,
            cls: img.className,
            native: `${img.naturalWidth}×${img.naturalHeight}`,
            css: `${Math.round(r.width)}×${Math.round(r.height)}`,
            upscale: (dpr / nat).toFixed(2),
            y: Math.round(r.top + scrollY),
            effects,
          });
        }
        return out.sort((a, b) => b.upscale - a.upscale);
      }, dpr);
      imgLines.push(`## ${p.id} @${dpr}x`, '', '| upscale | native | css | src | effects |', '| --- | --- | --- | --- | --- |');
      for (const r of rows) imgLines.push(`| ${r.upscale} | ${r.native} | ${r.css} | ${r.src.replace('/assets/', '')} | ${r.effects.join('; ')} |`);
      imgLines.push('');
      await page.close();
    }

    // ---------- 2. colour audit ----------
    const page = await browser.newPage();
    await page.setViewport({ width: p.w, height: p.h, deviceScaleFactor: 1 });
    await page.goto(BASE + p.path, { waitUntil: 'networkidle0' });
    await settle(page);
    const shot = await page.screenshot({ fullPage: true });
    await page.close();
    const ref = path.join(ROOT, 'design-reference', p.ref);
    colLines.push(`## ${p.id}`, '', '| region | mockup | source asset | rendered | ΔL rendered−mockup | Δsat |', '| --- | --- | --- | --- | --- | --- |');
    for (const reg of p.regions) {
      const m = await stats(ref, reg.r);
      const a = reg.asset ? await stats(path.join(SRC, reg.asset), reg.r, { offset: [reg.ax, reg.ay] }) : null;
      const s = await stats(shot, reg.r);
      const fmt = (o) => (o ? `${o.hex} L${o.L} p95 ${o.p95} p99 ${o.p99} s${o.sat}` : '—');
      const dL = m && s ? (s.L - m.L).toFixed(1) : '';
      const dS = m && s ? (s.sat - m.sat).toFixed(3) : '';
      colLines.push(`| ${reg.name} | ${fmt(m)} | ${fmt(a)} | ${fmt(s)} | ${dL} | ${dS} |`);
    }
    colLines.push('');
    console.log(`audited ${p.id}`);
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(OUT, 'images.md'), imgLines.join('\n'));
fs.writeFileSync(path.join(OUT, 'colour.md'), colLines.join('\n'));
console.log(`wrote ${path.relative(ROOT, OUT)}/images.md, colour.md`);
