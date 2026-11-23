// Full-viewport captures of /contact (no cropping) plus a 50% overlay at reference size.
//   node scripts/contact-shots.mjs <label> [--base http://localhost:4173]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'test-results/contact');
fs.mkdirSync(OUT, { recursive: true });
const label = process.argv[2] || 'shot';
const bi = process.argv.indexOf('--base');
const BASE = bi > -1 ? process.argv[bi + 1] : 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const REF = path.join(ROOT, 'design-reference/07_Contact.png');

const sizes = [
  { name: '1199x613', w: 1199, h: 613, mobile: false },
  { name: '1624x908', w: 1624, h: 908, mobile: false },
  { name: '390x844', w: 390, h: 844, mobile: true },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb'],
});
try {
  for (const s of sizes) {
    const page = await browser.newPage();
    await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1, isMobile: s.mobile, hasTouch: s.mobile });
    await page.goto(BASE + '/contact', { waitUntil: 'networkidle0' });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    // Wait for fonts and every image (lazy ones forced eager), bounded so a stalled image can't hang the run.
    await page.evaluate(async () => {
      await document.fonts.ready;
      const imgs = [...document.images];
      imgs.forEach((i) => (i.loading = 'eager'));
      const loaded = Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => i.addEventListener('load', r, { once: true }) || i.addEventListener('error', r, { once: true })))));
      await Promise.race([loaded, new Promise((r) => setTimeout(r, 4000))]);
    });
    // Resting state: ribbons at their source position, pointer and focus off the form.
    await page.addStyleTag({ content: '.ribbon__strip{animation:none!important;transform:none!important}' });
    await page.mouse.move(2, s.h - 2);
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
    await new Promise((r) => setTimeout(r, 400));
    const file = path.join(OUT, `${label}-${s.name}.png`);
    await page.screenshot({ path: file, captureBeyondViewport: false });
    const full = path.join(OUT, `${label}-${s.name}-full.png`);
    await page.screenshot({ path: full, fullPage: true });
    const m = await page.evaluate(() => ({
      docH: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      header: (() => {
        const h = document.querySelector('.site-header');
        return h ? getComputedStyle(h).display + ' ' + h.getBoundingClientRect().height : 'none';
      })(),
    }));
    console.log(`${label} ${s.name}: ${path.relative(ROOT, file)}  docH=${m.docH} overflowX=${m.overflowX} header=${m.header}`);
    if (s.name === '1199x613') {
      const top = await sharp(file).removeAlpha().ensureAlpha(0.5).toBuffer();
      await sharp(REF).composite([{ input: top, blend: 'over' }]).png().toFile(path.join(OUT, `${label}-overlay-50.png`));
      await sharp(REF).composite([{ input: await sharp(file).removeAlpha().toBuffer(), blend: 'difference' }]).png().toFile(path.join(OUT, `${label}-diff.png`));
    }
    await page.close();
  }
} finally {
  await browser.close();
}
