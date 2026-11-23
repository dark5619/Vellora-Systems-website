// Per-route fidelity comparison against the numbered designs.
//
//   npm run build && npm run preview          (in another terminal)
//   node scripts/compare.mjs <label> [--only home,work] [--base http://localhost:4173]
//
// For each route: viewport = design width × design height, fonts loaded, images decoded, WebGL
// settled, pointer and focus off, ribbons at rest. Writes to test-results/compare/<label>/:
//   <id>-viewport.png   first screen at the design size
//   <id>-full.png       full page at the design width (natural height)
//   <id>-side.png       design | capture (full page) side by side
//   <id>-overlay.png    capture over design at 50% (design-sized frame)
//   <id>-diff.png       per-pixel difference (design-sized frame)
//   anchors.md/json     ink-measured anchors: capture minus design, in CSS px
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const label = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'current';
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const BASE = arg('base', 'http://localhost:4173');
const ONLY = (arg('only', '') || '').split(',').filter(Boolean);
const OUT = path.join(ROOT, 'test-results/compare', label);
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Anchor regions are in design pixels; the same region is measured in design and capture.
// mode: white (text), lime (accent), bright (any light), dark (dark ink on light surfaces).
// intent: documented intentional difference (reported, not counted as a miss).
const PAGES = [
  {
    id: 'home', route: '/', ref: '01_Home.png', w: 1672, h: 941, kind: 'complete page (single screen)',
    anchors: [
      ['Logo lockup', [60, 10, 340, 90], 'bright'],
      ['Nav "Home"', [690, 25, 770, 58], 'white'],
      ['H1 line 1 "Technology that"', [70, 170, 840, 240], 'white'],
      ['H1 line 2 "moves"', [70, 252, 310, 305], 'white'],
      ['Lead line 1', [70, 320, 720, 343], 'white'],
      ['Primary CTA', [60, 425, 370, 505], 'lime'],
      ['V right arm (artwork)', [1150, 120, 1420, 300], 'lime'],
      ['Card 1 title "Games"', [85, 632, 240, 660], 'white'],
      ['RAYMOBILEGAMES logo', [230, 845, 490, 900], 'white'],
      ['Stat "15"', [1170, 840, 1235, 870], 'white', 'Design shows 15+; team size normalised to 15'],
    ],
  },
  {
    id: 'work', route: '/work', ref: '02_Our_Work.png', w: 1199, h: 1312, kind: 'complete page',
    anchors: [
      ['Logo lockup', [50, 4, 270, 64], 'bright'],
      ['H1 "Selected"', [60, 120, 350, 185], 'white'],
      ['Lead line 1', [62, 192, 560, 213], 'white'],
      ['Active filter "All Work"', [45, 265, 180, 320], 'lime'],
      ['V right arm (hero artwork)', [790, 70, 900, 200], 'lime'],
      ['Card 1 box (DOM vs card reference 23,347→400)', { sel: '.work-grid .pcard', i: 0, design: [23, 347, 400, null] }, 'dom'],
      ['Card 3 box (DOM vs card reference 802,347→1178)', { sel: '.work-grid .pcard', i: 2, design: [802, 347, 1178, null] }, 'dom'],
      ['Card 1 title', [45, 570, 300, 625], 'white', 'Media frame +23px (portfolio revision)'],
      ['CTA "Let’s Talk"', [1020, 1195, 1170, 1265], 'lime', 'Page longer by the revised media rows'],
    ],
  },
  {
    id: 'case', route: '/work/streaming-platform', ref: '03_Project_Case_Study.png', w: 1199, h: 1312, kind: 'complete page',
    anchors: [
      ['Logo lockup', [45, 3, 245, 62], 'bright'],
      ['Nav "Case Studies" (active)', [470, 18, 580, 42], 'white'],
      ['Nav "About"', [770, 18, 850, 42], 'white'],
      ['Active underline', [460, 40, 600, 52], 'lime'],
      ['Header CTA', [990, 4, 1170, 56], 'lime'],
      ['H1 line 1', [44, 140, 520, 186], 'white'],
      ['Lead', [44, 250, 460, 320], 'white'],
      ['TV title "The Last Horizon"', [695, 228, 860, 262], 'white'],
      ['Phone title (artwork)', [580, 315, 665, 335], 'white'],
      ['Facts value "Media & Entertainment"', [100, 517, 280, 538], 'white'],
      ['Facts value "iOS · Android · Web · TV"', [810, 517, 980, 538], 'white'],
      ['Facts CTA "View project"', [960, 495, 1160, 542], 'lime'],
      ['Challenge title', [92, 584, 240, 610], 'white'],
      ['Chip "React"', [850, 640, 900, 658], 'white'],
      ['Outcome title', [125, 787, 290, 812], 'white'],
      ['Outcome "+180%"', [370, 776, 470, 805], 'lime'],
      ['"More Case Studies"', [85, 880, 280, 905], 'white'],
      ['"View all projects"', [1030, 885, 1160, 902], 'white'],
      ['Related card 1 title', [65, 1040, 240, 1085], 'white'],
      ['Related card 4 title', [900, 1040, 1100, 1085], 'white'],
      ['Footer title', [370, 1200, 840, 1240], 'white'],
      ['Footer CTA "Get in touch"', [930, 1185, 1115, 1245], 'lime'],
    ],
  },
  {
    id: 'expertise', route: '/expertise', ref: '04_Expertise.png', w: 1672, h: 941, kind: 'complete page (single screen)',
    anchors: [
      ['H1 line 1', [55, 190, 440, 240], 'white'],
      ['Lead', [55, 308, 340, 398], 'white'],
      ['"Casual Games" title', [915, 118, 1075, 143], 'white'],
      ['"Robotics" title', [1365, 648, 1470, 672], 'white'],
      ['Central V (artwork)', [930, 370, 1090, 560], 'lime'],
      ['Stat "15"', [600, 835, 645, 862], 'white'],
    ],
  },
  {
    id: 'studio', route: '/studio', ref: '05_Studio_And_Team.png', w: 1199, h: 1312, kind: 'complete page',
    anchors: [
      ['H1 "People behind"', [50, 125, 465, 172], 'white'],
      ['Lead', [52, 240, 410, 300], 'white'],
      ['"Meet the team" CTA', [50, 315, 230, 370], 'lime'],
      ['Wall sign V (artwork)', [880, 120, 950, 190], 'lime'],
      ['Eryk Dobek name', [40, 625, 210, 657], 'white'],
      ['Kenji role (lime)', [1000, 648, 1145, 668], 'lime'],
      ['Culture title', [596, 828, 1172, 872], 'white'],
      ['Join CTA', [875, 1178, 1110, 1230], 'lime'],
    ],
  },
  {
    id: 'about', route: '/about', ref: '06_About.png', w: 1199, h: 711, kind: 'complete page (+ added practice section below)',
    anchors: [
      ['H1 line 1', [55, 125, 470, 162], 'white'],
      ['Paragraph', [55, 222, 480, 300], 'white'],
      ['V artwork', [600, 140, 760, 330], 'lime'],
      ['Office sign "VELLORA"', [1020, 190, 1125, 222], 'white'],
      ['Stat "15"', [236, 462, 300, 492], 'white'],
      ['Industry label 1', [70, 628, 190, 664], 'white'],
    ],
  },
  {
    id: 'contact', route: '/contact', ref: '07_Contact.png', w: 1199, h: 613, kind: 'section below the fixed header (design has no header)',
    // The design is header-free: align it to the contact section, i.e. the header's lower edge.
    origin: '.site-header',
    anchors: [
      ['Eyebrow "CONTACT US"', [96, 52, 200, 70], 'white'],
      ['H1 line 1', [60, 84, 470, 122], 'white'],
      ['Lead', [66, 222, 450, 282], 'white'],
      ['Email label', [136, 294, 320, 310], 'white'],
      ['Panel title', [543, 60, 740, 92], 'white'],
      ['Field label "Your Name"', [503, 104, 600, 120], 'white'],
      ['Submit button', [500, 440, 800, 497], 'lime'],
      ['Lower ribbon (lime sweep)', [700, 560, 1199, 613], 'lime'],
    ],
  },
].filter((p) => !ONLY.length || ONLY.includes(p.id));

function inkBox(raw, width, height, region, mode) {
  const [x0, y0, x1, y1] = region;
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = Math.max(0, y0); y < Math.min(height, y1); y++) {
    for (let x = Math.max(0, x0); x < Math.min(width, x1); x++) {
      const i = (y * width + x) * 3;
      const r = raw[i], g = raw[i + 1], b = raw[i + 2];
      let on;
      if (mode === 'white') on = r > 190 && g > 190 && b > 190;
      else if (mode === 'lime') on = g > 180 && r > 120 && b < 120;
      else if (mode === 'bright') on = r + g + b > 480;
      else on = r + g + b < 150;
      if (on) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : [minX, minY, maxX + 1, maxY + 1];
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = [...document.images];
    imgs.forEach((i) => (i.loading = 'eager'));
    const all = Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }))));
    await Promise.race([all, new Promise((r) => setTimeout(r, 5000))]);
  });
  await page.addStyleTag({ content: '.ribbon__strip{animation:none!important;transform:none!important}*{caret-color:transparent!important}' });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-hero-mode]');
    return !el || el.getAttribute('data-hero-mode') !== 'loading';
  }, { timeout: 8000 }).catch(() => {});
  // Park the pointer away from the hero and from the top-edge header reveal zone.
  const vp = page.viewport();
  await page.mouse.move(2, vp.height - 2);
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  await new Promise((r) => setTimeout(r, 600));
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--force-color-profile=srgb', '--ignore-gpu-blocklist'] });
const report = [];
try {
  for (const p of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: p.w, height: p.h, deviceScaleFactor: 1 });
    await page.goto(BASE + p.route, { waitUntil: 'networkidle0' });
    await settle(page);
    const vpPath = path.join(OUT, `${p.id}-viewport.png`);
    const fullPath = path.join(OUT, `${p.id}-full.png`);
    await page.screenshot({ path: vpPath, captureBeyondViewport: false });
    const docH = await page.evaluate(() => document.documentElement.scrollHeight);
    // Full page: resize the viewport to the document height (keeps fixed elements at the top).
    await page.setViewport({ width: p.w, height: docH, deviceScaleFactor: 1 });
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: fullPath, captureBeyondViewport: false });
    await page.setViewport({ width: p.w, height: p.h, deviceScaleFactor: 1 });

    const refPath = path.join(ROOT, 'design-reference', p.ref);
    // Design-sized frame from the full-page capture: top of page, or the page's alignment origin.
    const originY = p.origin ? await page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().bottom), p.origin) : 0;
    const frame = await sharp(fullPath).extract({ left: 0, top: originY, width: p.w, height: Math.min(p.h, docH - originY) }).resize(p.w, p.h, { fit: 'contain', position: 'top', background: '#000' }).removeAlpha().toBuffer();
    await sharp(refPath).composite([{ input: await sharp(frame).ensureAlpha(0.5).toBuffer(), blend: 'over' }]).png().toFile(path.join(OUT, `${p.id}-overlay.png`));
    await sharp(refPath).composite([{ input: frame, blend: 'difference' }]).png().toFile(path.join(OUT, `${p.id}-diff.png`));
    const sideH = Math.max(p.h, docH);
    await sharp({ create: { width: p.w * 2 + 16, height: sideH, channels: 3, background: '#ffffff' } })
      .composite([{ input: refPath, left: 0, top: 0 }, { input: fullPath, left: p.w + 16, top: 0 }])
      .png()
      .toFile(path.join(OUT, `${p.id}-side.png`));

    const R = await sharp(refPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const C = await sharp(frame).raw().toBuffer({ resolveWithObject: true });
    const rows = [];
    for (const [name, region, mode, intent] of p.anchors) {
      let a, b;
      if (mode === 'dom') {
        // Element box in CSS px vs a reference rectangle (null = not compared).
        const r = await page.evaluate(({ sel, i }) => {
          const e = document.querySelectorAll(sel)[i];
          if (!e) return null;
          const q = e.getBoundingClientRect();
          return [q.left, q.top + scrollY, q.right, q.bottom + scrollY].map((v) => Math.round(v));
        }, region);
        a = region.design.map((v, i) => (v === null && r ? r[i] : v));
        b = r;
      } else {
        a = inkBox(R.data, R.info.width, R.info.height, region, mode);
        b = inkBox(C.data, C.info.width, C.info.height, region, mode);
      }
      const d = a && b ? b.map((v, i) => v - a[i]) : null;
      const max = d ? Math.max(...d.map(Math.abs)) : null;
      rows.push({ name, mode, design: a, capture: b, delta: d, max, intent: intent || '' });
    }
    report.push({ id: p.id, route: p.route, ref: p.ref, size: `${p.w}×${p.h}`, kind: p.kind, docH, rows });
    console.log(`${p.id}: ${p.w}×${p.h} docH=${docH}`);
    for (const r of rows) {
      const flag = r.max === null ? '??' : r.max <= 4 ? 'ok' : r.intent ? 'intent' : 'MISS';
      console.log(`   ${flag.padEnd(6)} ${r.name.padEnd(34)} Δ(l,t,r,b)=${r.delta ? r.delta.join(',') : 'n/a'}${r.intent ? `  — ${r.intent}` : ''}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(OUT, 'anchors.json'), JSON.stringify(report, null, 2));
const md = report
  .map((p) => `### ${p.id} (${p.route}) — ${p.ref} ${p.size}, ${p.kind}; document height ${p.docH}\n\n| Anchor | Δ left, top, right, bottom (px) | Result |\n| --- | --- | --- |\n` +
    p.rows.map((r) => `| ${r.name} | ${r.delta ? r.delta.join(', ') : 'n/a'} | ${r.max === null ? 'not found' : r.max <= 4 ? 'within 4px' : r.intent ? `intentional: ${r.intent}` : `off by ${r.max}px`} |`).join('\n'))
  .join('\n\n');
fs.writeFileSync(path.join(OUT, 'anchors.md'), md + '\n');
