// End-to-end interaction checks against the production preview.
//
//   npm run build && npm run preview        (in another terminal)
//   node scripts/e2e.mjs [--base http://localhost:4173]
//
// Exits non-zero if any check fails.
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const BASE = (() => {
  const i = process.argv.indexOf('--base');
  return i > -1 ? process.argv[i + 1] : 'http://localhost:4173';
})();
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROUTES = ['/', '/work', '/work/streaming-platform', '/expertise', '/studio', '/about', '/contact'];
const WIDTHS = [1672, 1440, 1199, 1024, 768, 390, 360];

let failures = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch(extraArgs = []) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--ignore-gpu-blocklist', ...extraArgs],
  });
}

async function ready(page) {
  await page.evaluate(() => document.fonts.ready);
  await sleep(150);
}
const activeInfo = (page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    return a ? { tag: a.tagName, text: (a.textContent || '').trim().slice(0, 60), key: a.getAttribute('data-focus-key'), id: a.id } : null;
  });

// ---------------------------------------------------------------------------
async function journey(browser) {
  console.log('\nJourney: Home → Work → streaming case study → Contact');
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await ready(page);
  check('Home h1 present', (await page.$eval('h1', (h) => h.textContent)).includes('Technology that'));

  await Promise.all([page.waitForFunction(() => location.pathname === '/work'), page.click('a.home-hero__primary')]);
  check('"Explore our work" opens /work', true);
  await ready(page);
  check('Six project cards shown', (await page.$$('.work-grid .pcard')).length === 6);

  // Scroll a little so scroll restoration is observable.
  await page.evaluate(() => window.scrollTo(0, 420));
  await sleep(100);
  await page.focus('[data-focus-key="tv-streaming"]');
  await Promise.all([
    page.waitForFunction(() => location.pathname === '/work/streaming-platform'),
    page.keyboard.press('Enter'),
  ]);
  await ready(page);
  check('Streaming "View Case Study" opens the case study', (await page.$eval('h1', (h) => h.textContent)).includes('Streaming Platform'));
  const focusAfterNav = await activeInfo(page);
  check('Focus moves to the case study heading', focusAfterNav?.tag === 'H1', JSON.stringify(focusAfterNav));
  check('Technology labels are live text', (await page.$$eval('.cs-chip', (c) => c.map((x) => x.textContent.trim()))).join(',') === 'React,Node.js,Flutter,AWS,FFmpeg,Docker');
  const activeNav = await page.$$eval('.site-nav [aria-current="page"]', (a) => a.map((x) => x.textContent.trim()));
  check('Case-study header marks "Case Studies" as the current page', activeNav.join(',') === 'Case Studies', activeNav.join(','));
  await page.click('.cs-facts__btn');
  await page.waitForSelector('dialog.cs-views[open]');
  const views = await page.evaluate(() => {
    const d = document.querySelector('dialog.cs-views');
    const img = d.querySelector('.cs-views__devices');
    return { focusIn: d.contains(document.activeElement), alt: img.getAttribute('alt').length > 40, native: img.getBoundingClientRect().width <= 614 };
  });
  check('"View project" opens the product views at native resolution', views.focusIn && views.alt && views.native, JSON.stringify(views));
  await page.keyboard.press('Escape');
  await sleep(250);
  check('…and Escape returns focus to "View project"', (await activeInfo(page))?.text === 'View project');
  const rel = await page.$$eval('.cs-related__grid a', (a) => a.map((x) => [x.querySelector('.rcard__title').textContent.replace(/\s+/g, ' ').trim(), x.getAttribute('href')]));
  check('Related cards use the design titles and open matching work', rel.length === 4 && rel[0][0] === 'Casual Mobile Games for RayMobileGames' && rel[3][1] === '/work?filter=hardware', JSON.stringify(rel));

  await page.goBack();
  await page.waitForFunction(() => location.pathname === '/work');
  await sleep(300);
  const back = await activeInfo(page);
  check('Back returns to /work with focus on the opening card', back?.key === 'tv-streaming', JSON.stringify(back));
  const y = await page.evaluate(() => window.scrollY);
  check('Back restores the scroll position', Math.abs(y - 420) < 40, `scrollY=${y}`);

  await page.goForward();
  await page.waitForFunction(() => location.pathname === '/work/streaming-platform');
  await ready(page);
  await Promise.all([page.waitForFunction(() => location.pathname === '/contact'), page.click('a.cs-footer__btn')]);
  await ready(page);
  const type = await page.$eval('#f-type', (s) => s.value);
  check('"Get in touch" opens Contact with Streaming preselected', type === 'streaming', `projectType=${type}`);
  await page.close();
}

// ---------------------------------------------------------------------------
async function filters(browser) {
  console.log('\nFilters');
  const page = await browser.newPage();
  await page.setViewport({ width: 1199, height: 900 });
  await page.goto(BASE + '/work', { waitUntil: 'networkidle0' });
  await ready(page);
  const expected = { all: 6, games: 1, streaming: 1, healthcare: 1, fintech: 1, mobile: 3, hardware: 2, robotics: 1 };
  const filterTop = await page.$eval('.filters', (f) => f.getBoundingClientRect().top + scrollY);
  for (const [id, n] of Object.entries(expected)) {
    await page.click(`[data-filter="${id}"]`);
    await sleep(450);
    const count = (await page.$$('.work-grid .pcard')).length;
    const checked = await page.$eval(`[data-filter="${id}"]`, (b) => b.getAttribute('aria-checked'));
    const url = await page.evaluate(() => location.search);
    check(`Filter "${id}" shows ${n} and is marked active`, count === n && checked === 'true', `count=${count} aria-checked=${checked} url=${url}`);
  }
  const top2 = await page.$eval('.filters', (f) => f.getBoundingClientRect().top + scrollY);
  check('Filter controls stay in place', Math.abs(top2 - filterTop) < 1);

  // Keyboard: one Tab stop, arrows move selection and keep focus in the group.
  await page.click('[data-filter="all"]');
  await sleep(300);
  await page.focus('[data-filter="all"]');
  await page.keyboard.press('ArrowRight');
  await sleep(450);
  let a = await page.evaluate(() => document.activeElement?.getAttribute('data-filter'));
  let n = (await page.$$('.work-grid .pcard')).length;
  check('ArrowRight selects "Games" and keeps focus', a === 'games' && n === 1, `focus=${a} count=${n}`);
  await page.keyboard.press('End');
  await sleep(450);
  a = await page.evaluate(() => document.activeElement?.getAttribute('data-filter'));
  check('End selects "Robotics"', a === 'robotics');
  await page.keyboard.press('Home');
  await sleep(450);
  const tabStops = await page.$$eval('.filter', (bs) => bs.filter((b) => b.tabIndex === 0).length);
  check('Filters expose a single Tab stop', tabStops === 1);
  const live = await page.$eval('[aria-live="polite"]', (p) => p.textContent);
  check('Result count is announced', /Showing 6 projects/.test(live), live);

  // Deep link
  await page.goto(BASE + '/work?filter=mobile', { waitUntil: 'networkidle0' });
  check('Deep link ?filter=mobile applies', (await page.$$('.work-grid .pcard')).length === 3);
  await page.close();
}

// ---------------------------------------------------------------------------
async function previews(browser) {
  console.log('\nProject previews');
  const page = await browser.newPage();
  await page.setViewport({ width: 1199, height: 900 });
  await page.goto(BASE + '/work', { waitUntil: 'networkidle0' });
  await ready(page);
  for (const id of ['casual-mobile-games', 'healthcare-web', 'fintech-dashboard', 'pcb-design', 'robotics-automation']) {
    await page.click(`[data-focus-key="${id}"]`);
    await page.waitForSelector('dialog.pdialog[open]');
    await sleep(200);
    const info = await page.evaluate(() => {
      const d = document.querySelector('dialog.pdialog');
      return {
        url: location.search,
        title: d.querySelector('h2')?.textContent,
        focusInside: d.contains(document.activeElement),
        alt: d.querySelector('.pmedia__object')?.getAttribute('alt'),
      };
    });
    check(`Preview opens for ${id}`, info.url.includes(`project=${id}`) && info.focusInside && !!info.alt, JSON.stringify(info));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('dialog.pdialog[open]'));
    await sleep(250);
    const f = await activeInfo(page);
    const url = await page.evaluate(() => location.search);
    check(`Escape closes ${id}, focus returns to its card`, f?.key === id && !url.includes('project='), `${JSON.stringify(f)} url=${url}`);
  }
  // Back closes an open preview.
  await page.click('[data-focus-key="pcb-design"]');
  await page.waitForSelector('dialog.pdialog[open]');
  await page.goBack();
  await page.waitForFunction(() => !document.querySelector('dialog.pdialog[open]'));
  await sleep(250);
  check('Browser Back closes the preview and stays on /work', (await page.evaluate(() => location.pathname)) === '/work');
  check('…and focus returns to the opening card', (await activeInfo(page))?.key === 'pcb-design');
  // Related card on the case study opens the preview on /work.
  await page.goto(BASE + '/work/streaming-platform', { waitUntil: 'networkidle0' });
  await Promise.all([page.waitForSelector('dialog.pdialog[open]'), page.click('.cs-related__grid li:first-child a')]);
  check('Related case-study card opens its project preview', (await page.evaluate(() => location.search)).includes('casual-mobile-games'));
  await page.keyboard.press('Escape');
  await page.close();
}

// ---------------------------------------------------------------------------
async function mobileNav(browser) {
  console.log('\nMobile navigation (390px)');
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(BASE + '/about', { waitUntil: 'networkidle0' });
  await ready(page);
  check('Desktop nav hidden on phones', await page.$eval('.site-nav', (n) => getComputedStyle(n).display === 'none'));
  await page.click('.menu-toggle');
  let st = await page.evaluate(() => ({ exp: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), hidden: document.querySelector('.mobile-menu').hidden }));
  check('Menu opens with aria-expanded="true"', st.exp === 'true' && !st.hidden);
  const current = await page.$eval('.mobile-menu [aria-current="page"]', (a) => a.textContent.trim());
  check('Active page indicated in the menu', current === 'About', current);
  await page.keyboard.press('Escape');
  await sleep(100);
  st = await page.evaluate(() => ({ exp: document.querySelector('.menu-toggle').getAttribute('aria-expanded'), hidden: document.querySelector('.mobile-menu').hidden, focus: document.activeElement?.className }));
  check('Escape closes the menu and returns focus to the toggle', st.exp === 'false' && st.hidden && /menu-toggle/.test(st.focus), JSON.stringify(st));
  await page.click('.menu-toggle');
  await Promise.all([page.waitForFunction(() => location.pathname === '/work'), page.click('.mobile-menu a[href="/work"]')]);
  await sleep(150);
  check('Choosing a link navigates and closes the menu', await page.$eval('.mobile-menu', (m) => m.hidden));
  await page.close();
}

// ---------------------------------------------------------------------------
async function contactForm(browser) {
  console.log('\nContact form');
  const page = await browser.newPage();
  await page.setViewport({ width: 1199, height: 900 });
  await page.goto(BASE + '/contact', { waitUntil: 'networkidle0' });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await ready(page);
  // Labels are persistent and associated.
  const labels = await page.$$eval('.inquiry .field__label', (ls) => ls.map((l) => [l.htmlFor, !!document.getElementById(l.htmlFor)]));
  check('Every field has an associated <label>', labels.length === 6 && labels.every(([, ok]) => ok), JSON.stringify(labels.map((l) => l[0])));
  check('Email field uses type=email', (await page.$eval('#f-email', (i) => i.type)) === 'email');

  await page.click('.inquiry__submit');
  await sleep(150);
  const errs = await page.$$eval('[aria-invalid="true"]', (els) => els.map((e) => e.id));
  check('Empty submit flags the four required fields', ['f-name', 'f-email', 'f-type', 'f-details'].every((id) => errs.includes(id)), errs.join(','));
  check('Focus moves to the first invalid field', (await activeInfo(page))?.id === 'f-name');
  check('Error messages are tied to fields', await page.$eval('#f-name', (i) => (i.getAttribute('aria-describedby') || '').includes('f-name-error')));
  check('A summary alert is shown', /Please fix 4 fields/.test(await page.$eval('.inquiry__summary', (p) => p.textContent)));

  await page.type('#f-name', 'Ada Lovelace');
  await page.type('#f-email', 'ada@analytical');
  await page.click('#f-company');
  await sleep(80);
  check('Invalid email explained on blur', /email address like/.test(await page.$eval('#f-email-error', (p) => p.textContent).catch(() => '')));
  await page.click('#f-email', { clickCount: 3 });
  await page.type('#f-email', 'ada@example.com');
  // Keyboard select: focus and use arrow keys.
  await page.focus('#f-type');
  await page.select('#f-type', 'streaming');
  await page.select('#f-budget', '50-100k');
  await page.type('#f-details', 'We need a TV and mobile streaming app with live channels and DRM.');
  const counter = await page.$eval('.inquiry__counter', (c) => c.textContent);
  check('Character counter updates', /^6\d \/ 1,000/.test(counter), counter);
  await page.click('.inquiry__submit');
  await page.waitForSelector('.inquiry__result--handoff', { timeout: 3000 }).catch(() => {});
  const res = await page.evaluate(() => ({
    shown: !!document.querySelector('.inquiry__result--handoff'),
    href: document.querySelector('.inquiry__result--handoff a')?.getAttribute('href') || '',
    nameKept: document.querySelector('#f-name').value,
    invalid: document.querySelectorAll('[aria-invalid="true"]').length,
  }));
  check('Valid submit shows the email-draft result', res.shown && res.invalid === 0);
  check('Draft is addressed to the approved inquiry address', res.href.startsWith('mailto:hello@vellorasystems.com?subject=Project%20inquiry'), res.href.slice(0, 80));
  check('Draft includes the entered details', decodeURIComponent(res.href).includes('Budget: $50k – $100k') && decodeURIComponent(res.href).includes('Ada Lovelace'));
  check('Entered values are preserved after hand-off', res.nameKept === 'Ada Lovelace');
  check('Button describes the email hand-off to assistive tech', /Opens an email draft to hello@vellorasystems\.com/.test(await page.$eval('#inquiry-handoff', (p) => p.textContent)));
  check('After activation the hand-off is explained on screen', /opened your mail app/.test(await page.$eval('.inquiry__result--handoff', (p) => p.textContent)));
  await page.close();
}


// ---------------------------------------------------------------------------
async function contactLayout(browser) {
  console.log('\nContact composition (fixed header visible; design aligned to the section top)');
  const page = await browser.newPage();
  const measure = () =>
    page.evaluate(() => {
      const r = (s) => document.querySelector(s)?.getBoundingClientRect();
      const box = (s) => [r(s).left, r(s).top, r(s).right, r(s).bottom].map(Math.round);
      return {
        header: box('.site-header'),
        eyebrow: box('.ct__eyebrow'),
        panel: box('.inquiry'),
        submit: box('.inquiry__submit'),
        art: box('.ct-art'),
        docH: document.documentElement.scrollHeight,
        intro: +((r('.ct__title').left / innerWidth) * 100).toFixed(1),
        panelL: +((r('.inquiry').left / innerWidth) * 100).toFixed(1),
        panelR: +((r('.inquiry').right / innerWidth) * 100).toFixed(1),
        handoffVisible: document.getElementById('inquiry-handoff').getBoundingClientRect().width > 1,
      };
    });
  for (const [w, h] of [[1199, 613], [1624, 908], [1024, 640], [1440, 650], [1920, 1080]]) {
    await page.setViewport({ width: w, height: h });
    await page.goto(BASE + '/contact', { waitUntil: 'networkidle0' });
    await ready(page);
    await page.mouse.move(2, h - 2);
    const m = await measure();
    const hb = m.header[3];
    check(`${w}×${h}: header visible; eyebrow and panel clear it`, m.header[1] === 0 && m.eyebrow[1] >= hb && m.panel[1] >= hb, `header bottom ${hb}, eyebrow ${m.eyebrow[1]}, panel ${m.panel[1]}`);
    check(`${w}×${h}: scene starts at the header edge, covers the width and reaches the bottom`, m.art[1] <= hb + 1 && m.art[0] <= 0 && m.art[2] >= w && m.art[3] === m.docH, `art ${m.art.join(',')} docH ${m.docH}`);
    if (w === 1199) {
      const o = hb; // section origin
      const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 4);
      check('1199: panel at 465,40 → 1160,521 from the section top (±4px)', near([m.panel[0], m.panel[1] - o, m.panel[2], m.panel[3] - o], [465, 40, 1160, 521]), `${m.panel.join(',')} (origin ${o})`);
      check('1199: button at 508,445 → 793,492 from the section top (±4px)', near([m.submit[0], m.submit[1] - o, m.submit[2], m.submit[3] - o], [508, 445, 793, 492]), m.submit.join(','));
      check('Email-draft note is not part of the resting layout', !m.handoffVisible);
    }
    if (w === 1624) {
      // Wider than the design: the form keeps a comfortable size (--t) while the art takes the width.
      check('1624×908: intro ≈6%, panel ends ≈97% and spans 50–58% of the width', Math.abs(m.intro - 6) < 1 && Math.abs(m.panelR - 97) < 1 && m.panelR - m.panelL >= 50 && m.panelR - m.panelL <= 58, `${m.intro}% / ${m.panelL}% – ${m.panelR}%`);
    }
  }
  // Validation messages grow the form; the lower ribbon stays on the bottom edge.
  await page.setViewport({ width: 1199, height: 613 });
  await page.goto(BASE + '/contact', { waitUntil: 'networkidle0' });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await ready(page);
  await page.click('.inquiry__submit');
  await sleep(150);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(100);
  const g = await measure();
  check('With errors shown the scene still ends at the bottom edge', g.art[3] === g.docH, `art bottom ${g.art[3]}, docH ${g.docH}`);
  await page.close();
}

// ---------------------------------------------------------------------------
async function aboutWide(browser) {
  console.log('\nAbout: reference size, wide desktop, phone');
  const page = await browser.newPage();
  const m = async () =>
    page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const vw = innerWidth;
      const dp = vw / 1199;
      return {
        sw: document.documentElement.scrollWidth - vw,
        heading: Math.round(r('.ab-title').left),
        headingPct: +((r('.ab-title').left / vw) * 100).toFixed(1),
        stats: [Math.round(r('.ab-stats').left), Math.round(r('.ab-stats').right)],
        statsPct: Math.round((r('.ab-stats').width / vw) * 100),
        grid: [Math.round(r('.ab-ind__grid').left), Math.round(r('.ab-ind__grid').right)],
        gridPct: Math.round((r('.ab-ind__grid').width / vw) * 100),
        plate: [Math.round(r('.ab-art__img').left), Math.round(r('.ab-art__img').right)],
        artH: Math.round(r('.ab-art__img').height),
        // gap between the copy's right edge and the V's left tip (x = 490 on the art)
        copyToV: Math.round(490 * dp - Math.max(...[...document.querySelectorAll('.ab-copy p')].map((p) => { const g = document.createRange(); g.selectNodeContents(p); return g.getBoundingClientRect().right; }))),
      };
    });
  await page.setViewport({ width: 1199, height: 711 });
  await page.goto(BASE + '/about', { waitUntil: 'networkidle0' });
  await ready(page);
  let a = await m();
  check('1199×711: heading at x≈56, strip 135–1072, tiles 68–1158 (±4px)', Math.abs(a.heading - 56) <= 4 && Math.abs(a.stats[0] - 135) <= 4 && Math.abs(a.stats[1] - 1072) <= 4 && Math.abs(a.grid[0] - 68) <= 4 && Math.abs(a.grid[1] - 1158) <= 4, JSON.stringify(a));
  await page.setViewport({ width: 1728, height: 991 });
  await page.goto(BASE + '/about', { waitUntil: 'networkidle0' });
  await ready(page);
  a = await m();
  check('1728×991: heading near the left gutter (≈5%)', a.headingPct < 6, `${a.heading}px (${a.headingPct}%)`);
  check('1728×991: metrics strip ≈78% and industry grid ≈91% of the width', a.statsPct >= 75 && a.gridPct >= 88, `strip ${a.statsPct}%, grid ${a.gridPct}%`);
  check('1728×991: office art reaches both edges, one layer through the ribbon band (no cut)', a.plate[0] <= 0 && a.plate[1] >= 1728 && a.artH >= Math.round(676 * 1728 / 1199) - 1 && a.sw <= 0, JSON.stringify(a));
  check('1728×991: the V meets the copy (copy ends within 60px of the V)', a.copyToV >= -12 && a.copyToV <= 60, `${a.copyToV}px`);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(BASE + '/about', { waitUntil: 'networkidle0' });
  a = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth - innerWidth, clipped: [...document.querySelectorAll('.ab-stat, .icard')].filter((e) => { const b = e.getBoundingClientRect(); return b.right > innerWidth + 1 || b.left < -1; }).length }));
  check('390×844: metrics and tiles reflow without clipping or horizontal scroll', a.sw <= 0 && a.clipped === 0, JSON.stringify(a));
  await page.close();
}

// ---------------------------------------------------------------------------
async function fixedHeader(browser) {
  console.log('\nFixed header');
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: 'networkidle0' });
    await ready(page);
    const top0 = await page.$eval('.site-header', (h) => ({ pos: getComputedStyle(h).position, solid: h.classList.contains('is-solid') }));
    await page.evaluate(() => window.scrollTo(0, Math.min(700, document.documentElement.scrollHeight - innerHeight)));
    await sleep(250);
    const st = await page.evaluate(() => {
      const h = document.querySelector('.site-header');
      return { top: Math.round(h.getBoundingClientRect().top), solid: h.classList.contains('is-solid'), bg: getComputedStyle(h).backgroundColor, scrolled: scrollY };
    });
    const scrolls = st.scrolled > 8;
    check(`${r}: header is fixed${scrolls ? ', stays at the top and turns solid when scrolled' : ''}`, top0.pos === 'fixed' && !top0.solid && st.top === 0 && (!scrolls || (st.solid && st.bg !== 'rgba(0, 0, 0, 0)')), JSON.stringify({ ...top0, ...st }));
  }
  // In-page jump lands below the header (scroll-padding).
  await page.goto(BASE + '/studio', { waitUntil: 'networkidle0' });
  await ready(page);
  await page.click('.st-actions__primary');
  await sleep(900);
  const jump = await page.evaluate(() => ({ team: Math.round(document.getElementById('team').getBoundingClientRect().top), hb: Math.round(document.querySelector('.site-header').getBoundingClientRect().bottom) }));
  check('In-page jump target is not hidden under the header', jump.team >= jump.hb, JSON.stringify(jump));
  // Keyboard focus is not obscured: tab to a field low on the page at phone size.
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(BASE + '/contact', { waitUntil: 'networkidle0' });
  await ready(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(200);
  await page.focus('#f-name');
  await sleep(300);
  const f = await page.evaluate(() => ({ field: Math.round(document.getElementById('f-name').getBoundingClientRect().top), hb: Math.round(document.querySelector('.site-header').getBoundingClientRect().bottom) }));
  check('Focused field scrolls into view below the fixed header (phone)', f.field >= f.hb, JSON.stringify(f));
  await page.close();
}

// ---------------------------------------------------------------------------
async function heroAndMotion(browser) {
  console.log('\nHome hero: WebGL rest pose, pointer parallax, reduced motion');
  const page = await browser.newPage();
  await page.setViewport({ width: 1672, height: 941 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => document.querySelector('[data-hero-mode]')?.getAttribute('data-hero-mode') !== 'loading', { timeout: 10000 });
  const mode = await page.$eval('[data-hero-mode]', (e) => e.getAttribute('data-hero-mode'));
  check('WebGL scene swaps in on a fine pointer', mode === 'webgl', mode);
  // The orbit light passes periodically; measure the resting pose between passes.
  await page.waitForFunction(() => +(document.querySelector('[data-hero-mode]')?.dataset.heroLightRuns ?? 0) >= 1, { timeout: 15000 }).catch(() => {});
  // Artwork-only region: right of the headline, below the header, above the cards' glow.
  const clip = { x: 830, y: 95, width: 770, height: 440 };
  await page.mouse.move(5, 900);
  await sleep(400);
  const rest1 = await page.screenshot({ clip, captureBeyondViewport: false });
  await page.mouse.move(1400, 140, { steps: 8 });
  await sleep(700);
  const moved = await page.screenshot({ clip, captureBeyondViewport: false });
  await page.mouse.move(5, 900, { steps: 4 }); // leave the hero
  await sleep(2200);
  const rest2 = await page.screenshot({ clip, captureBeyondViewport: false });
  const diff = async (a, b) => {
    const A = await sharp(a).raw().toBuffer();
    const B = await sharp(b).raw().toBuffer();
    let max = 0;
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
      const d = Math.abs(A[i] - B[i]);
      sum += d;
      if (d > max) max = d;
    }
    return { max, mean: sum / A.length };
  };
  const dm = await diff(rest1, moved);
  const dr = await diff(rest1, rest2);
  check('Pointer moves the V and orbit', dm.mean > 0.5, `mean Δ=${dm.mean.toFixed(2)}`);
  check('V settles exactly back into its resting reflection', dr.max === 0, `max Δ=${dr.max}`);

  // Poster vs WebGL resting frame.
  const rm = await browser.newPage();
  await rm.setViewport({ width: 1672, height: 941 });
  await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rm.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  const rmMode = await rm.$eval('[data-hero-mode]', (e) => e.getAttribute('data-hero-mode'));
  check('Reduced motion keeps the finished hero plate', rmMode === 'poster', rmMode);
  const anim = await rm.$eval('.ribbon__strip', (s) => getComputedStyle(s).animationName);
  check('Reduced motion stops the ribbon drift', anim === 'none', anim);
  const poster = await rm.screenshot({ clip, captureBeyondViewport: false });
  const dp = await diff(poster, rest1);
  // The poster is lossy WebP (fast first paint); the layers are lossless. Mean Δ under 4/255 is
  // encoding noise and invisible across the 240 ms crossfade.
  check('Poster and WebGL resting frame differ only by poster encoding noise', dp.mean < 4, `mean Δ=${dp.mean.toFixed(2)}/255`);
  // The resting frame must reproduce the supplied finished plate (01-Home/backgrounds/hero-with-v.png).
  const src = await sharp(new URL('../asset-source/Vellora-Assets/01-Home/backgrounds/hero-with-v.png', import.meta.url).pathname)
    .extract({ left: clip.x, top: clip.y, width: clip.width, height: clip.height })
    .removeAlpha()
    .png()
    .toBuffer();
  const glRaw = await sharp(rest1).removeAlpha().png().toBuffer();
  const ds = await diff(src, glRaw);
  check('WebGL resting frame matches the source hero-with-v.png', ds.max <= 2, `max Δ=${ds.max} mean Δ=${ds.mean.toFixed(3)}`);
  await rm.close();

  // Card hover keeps captions still.
  await page.goto(BASE + '/work', { waitUntil: 'networkidle0' });
  await ready(page);
  // Measure the caption relative to its card so page scrolling during hover doesn't count.
  const capY = () => page.$eval('.pcard', (c) => c.querySelector('.pcard__title').getBoundingClientRect().top - c.getBoundingClientRect().top);
  await page.$eval('.pcard', (c) => c.scrollIntoView({ block: 'center' }));
  await sleep(200);
  const before = await capY();
  await page.hover('.pcard');
  await sleep(500);
  const after = await capY();
  const objT = await page.$eval('.pcard .pmedia__object', (o) => getComputedStyle(o).transform);
  check('Card hover draws attention to the device without moving the caption', before === after && objT !== 'none', `Δtitle=${after - before}`);
  await page.close();
}

// ---------------------------------------------------------------------------
async function sweep(browser) {
  console.log('\nAll routes × widths: overflow, failed requests, alt text');
  const failed = new Set();
  for (const w of WIDTHS) {
    const page = await browser.newPage();
    page.on('response', (r) => {
      if (r.status() >= 400) failed.add(`${r.status()} ${r.url()}`);
    });
    page.on('requestfailed', (r) => {
      if (!r.url().startsWith('mailto:')) failed.add(`failed ${r.url()}`);
    });
    page.on('pageerror', (e) => failed.add(`pageerror ${e.message}`));
    await page.setViewport({ width: w, height: 900 });
    for (const r of ROUTES) {
      await page.goto(BASE + r, { waitUntil: 'networkidle0' });
      await page.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager'));
        await document.fonts.ready;
      });
      await sleep(150);
      const o = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth - window.innerWidth;
        const clipped = [...document.querySelectorAll('a, button, input, select, textarea')]
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return b.width > 0 && (b.right > window.innerWidth + 1 || b.left < -1);
          })
          .map((el) => (el.textContent || el.id || el.tagName).trim().slice(0, 30));
        const noAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src);
        return { sw, clipped, noAlt };
      });
      if (o.sw > 0 || o.clipped.length || o.noAlt.length) check(`${r} @${w}px`, false, JSON.stringify(o));
    }
    await page.close();
  }
  check('No horizontal overflow, clipped controls or missing alt at any width', !results.some((x) => /@\d+px/.test(x.name) && !x.ok));
  check('No failed requests or page errors', failed.size === 0, [...failed].slice(0, 5).join(' | '));
}

// ---------------------------------------------------------------------------
async function zoom200(browser) {
  console.log('\n200% zoom (1440 window ⇒ 720 CSS px at 2×)');
  const page = await browser.newPage();
  await page.setViewport({ width: 720, height: 450, deviceScaleFactor: 2 });
  for (const r of ROUTES) {
    await page.goto(BASE + r, { waitUntil: 'networkidle0' });
    const o = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth - innerWidth,
      h1: !!document.querySelector('h1')?.getBoundingClientRect().height,
    }));
    check(`${r} reflows at 200%`, o.sw <= 0 && o.h1, JSON.stringify(o));
  }
  await page.close();
}

// ---------------------------------------------------------------------------
async function noWebGL() {
  console.log('\nWebGL unavailable');
  const browser = await launch(['--disable-webgl', '--disable-3d-apis']);
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(2500);
  const mode = await page.$eval('[data-hero-mode]', (e) => e.getAttribute('data-hero-mode'));
  const posterVisible = await page.$eval('.home-hero__poster', (i) => i.complete && i.naturalWidth > 0);
  check('Falls back to the finished poster', mode === 'poster' && posterVisible, mode);
  check('No uncaught errors without WebGL', errors.length === 0, errors.join(' | '));
  await Promise.all([page.waitForFunction(() => location.pathname === '/work'), page.click('a.home-hero__primary')]);
  check('Primary journey still works', true);
  await browser.close();
}

// ---------------------------------------------------------------------------
const browser = await launch();
try {
  await journey(browser);
  await filters(browser);
  await previews(browser);
  await mobileNav(browser);
  await contactForm(browser);
  await contactLayout(browser);
  await aboutWide(browser);
  await fixedHeader(browser);
  await heroAndMotion(browser);
  await zoom200(browser);
  await sweep(browser);
} finally {
  await browser.close();
}
await noWebGL();

console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
