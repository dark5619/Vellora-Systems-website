// Builds optimized web derivatives from the untouched source package.
//
//   node scripts/build-assets.mjs
//
// Source: asset-source/Vellora-Assets (never modified) and design-reference/ (read only)
// Output: public/assets/**            (served files)
//         src/data/assets.generated.ts (typed manifest: url, intrinsic size, source coordinates)
//
// Rules applied:
// - Shared-Brand and Shared-Icons are copied byte-for-byte (small, sharp PNG glyphs), plus a 2×
//   Lanczos derivative so glyphs stay crisp on high-density screens and at the wider layouts.
// - All other artwork ships at native resolution in two encodings:
//     .avif  4:4:4 (full-resolution chroma: thin neon edges and saturated faces keep their peak
//            colour; 4:2:0 WebP averaged them away)
//     .webp  fallback (lossless for the hero layers and project devices, q90 otherwise)
// - Detailed artwork from the 1199px designs (and the small Home/Expertise card art) also ships a
//   2× AVIF: Lanczos-3 enlargement with a light unsharp mask. Every supplied bitmap is a 1× crop
//   of its design, so wide and high-density screens always enlarge it; doing that once offline
//   with a better filter than the browser's keeps edges and screen text firmer. It adds no detail.
// - Plates 1100px or wider also get a half-width variant for narrow viewports.
// - Card references, industry card references, ribbon reference.png and the Guide maps are
//   comparison material only and are not shipped.
// - Two ribbon backings contain baked interface pixels in their upper rows. Clean derivatives
//   are composed from supplied pixels only: the text-free page plate where the light strip is
//   absent, and the supplied ribbon-free backing under (and within 6px of) the strip.
// - About: the package has no artwork between the hero plate (ends y=449) and the lower-edge
//   ribbon (y=676), where the design's ribbons pass behind the metrics strip. That band is
//   derived from 06_About.png itself, with the interface areas (strip, kicker, industry cards)
//   replaced by a harmonic fill from the surrounding pixels, and joined to the plate into one
//   1199 × 676 composite. A matching alpha mask traces the ribbon light for the light pass.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'asset-source/Vellora-Assets');
const REF = path.join(ROOT, 'design-reference');
const OUT = path.join(ROOT, 'public/assets');
const GEN = path.join(ROOT, 'src/data/assets.generated.ts');

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));

const isReference = (f) =>
  f.includes('/card-references/') ||
  f.includes('/industry-card-references/') ||
  f.endsWith('/reference.png');
const isGlyph = (f) => f.startsWith('Shared-Brand/') || f.startsWith('Shared-Icons/');
// Lossless where pixels must match exactly (hero rest pose vs poster) or product screens carry
// small coloured text that 4:2:0 chroma subsampling would fringe.
const isLossless = (f) => f.startsWith('01-Home/motion-home-hero/') || f.startsWith('02-Our-Work/project-objects/');
const isDevice = (f) => f.startsWith('02-Our-Work/project-objects/');
// 2× derivatives: detailed artwork that wide/high-density layouts enlarge. The Home hero layers
// feed WebGL at native size; full-page 1672 plates already sit near 1:1 on desktop.
const wants2x = (f, a) =>
  !isGlyph(f) &&
  !f.startsWith('01-Home/motion-home-hero/') &&
  !f.includes('/motion-ribbons/') &&
  !f.startsWith('01-Home/backgrounds/') &&
  !f.startsWith('04-Expertise/backgrounds/') &&
  a.width >= 60 &&
  a.height >= 40;

const entries = {};
let written = 0;

const AVIF_1X = { quality: 90, chromaSubsampling: '4:4:4', effort: 5 };
const AVIF_DEVICE = { quality: 94, chromaSubsampling: '4:4:4', effort: 5 };
const AVIF_2X = { quality: 80, chromaSubsampling: '4:4:4', effort: 5 };
// Light unsharp mask after a 2× Lanczos enlargement; low enough not to ring on neon edges.
const SHARPEN_2X = { sigma: 0.65, m1: 0.35, m2: 1.1, x1: 2, y2: 6, y3: 12 };

/** Write .webp (+ .avif, + @2x.avif) derivatives of a source image or buffer. */
async function emitArtwork(input, outRel, { lossless = false, device = false, twoX = false, half = false, width }) {
  const webpRel = outRel.replace(/\.png$/, '.webp');
  const avifRel = outRel.replace(/\.png$/, '.avif');
  fs.mkdirSync(path.dirname(path.join(OUT, webpRel)), { recursive: true });
  await sharp(input)
    .webp(lossless ? { lossless: true, effort: 6 } : { quality: 90, alphaQuality: 100, smartSubsample: true, effort: 5 })
    .toFile(path.join(OUT, webpRel));
  await sharp(input).avif(device ? AVIF_DEVICE : AVIF_1X).toFile(path.join(OUT, avifRel));
  const out = { src: `/assets/${webpRel}`, avif: `/assets/${avifRel}` };
  if (twoX) {
    const rel2 = outRel.replace(/\.png$/, '@2x.avif');
    await sharp(input)
      .resize({ width: width * 2, kernel: 'lanczos3' })
      .sharpen(SHARPEN_2X)
      .avif(AVIF_2X)
      .toFile(path.join(OUT, rel2));
    out.avif2x = `/assets/${rel2}`;
  }
  if (half) {
    const halfW = Math.round(width / 2);
    const halfRel = outRel.replace(/\.png$/, `-w${halfW}.webp`);
    const halfAvif = outRel.replace(/\.png$/, `-w${halfW}.avif`);
    await sharp(input)
      .resize({ width: halfW, kernel: 'lanczos3' })
      .webp({ quality: 86, alphaQuality: 100, smartSubsample: true, effort: 5 })
      .toFile(path.join(OUT, halfRel));
    await sharp(input).resize({ width: halfW, kernel: 'lanczos3' }).avif(AVIF_1X).toFile(path.join(OUT, halfAvif));
    out.srcHalf = `/assets/${halfRel}`;
    out.avifHalf = `/assets/${halfAvif}`;
    out.halfW = halfW;
  }
  return out;
}

async function emit(asset) {
  const rel = asset.file;
  const key = rel.replace(/\.png$/, '');
  const inPath = path.join(SRC, rel);
  const entry = {
    w: asset.width,
    h: asset.height,
    x: asset.x,
    y: asset.y,
    source: asset.source.replace(/\.png$/, ''),
    kind: asset.kind,
  };
  if (isGlyph(rel)) {
    const outPath = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.copyFileSync(inPath, outPath);
    entry.src = `/assets/${rel}`;
    // 2× glyph: Lanczos enlargement, alpha kept, lossless PNG.
    const rel2 = rel.replace(/\.png$/, '@2x.png');
    await sharp(inPath)
      .resize({ width: asset.width * 2, kernel: 'lanczos3' })
      .sharpen({ sigma: 0.5, m1: 0.3, m2: 0.9 })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, rel2));
    entry.src2x = `/assets/${rel2}`;
  } else {
    const meta = await sharp(inPath).metadata();
    Object.assign(
      entry,
      await emitArtwork(inPath, rel, {
        lossless: isLossless(rel),
        device: isDevice(rel),
        twoX: wants2x(rel, asset),
        half: asset.width >= 1100,
        width: asset.width,
      }),
    );
    entry.alpha = !!meta.hasAlpha;
  }
  entries[key] = entry;
  written++;
}

async function rawRGBA(file, crop) {
  let img = sharp(path.join(SRC, file)).ensureAlpha();
  if (crop) img = img.extract(crop);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

// Build a clean ribbon backing: plate where the strip is absent, supplied backing under the strip.
async function cleanBacking({ base, strip, plate, stripX, outRel, key, srcAsset }) {
  const B = await rawRGBA(base);
  const S = await rawRGBA(strip);
  const P = await rawRGBA(plate, { left: 0, top: srcAsset.y, width: B.w, height: B.h });
  const R = 6; // maximum strip translation in source pixels
  const mask = new Uint8Array(B.w * B.h);
  for (let y = 0; y < S.h; y++)
    for (let x = 0; x < S.w; x++) if (S.data[(y * S.w + x) * 4 + 3] > 2) mask[y * B.w + x + stripX] = 1;
  // separable dilation
  const tmp = new Uint8Array(B.w * B.h);
  for (let y = 0; y < B.h; y++)
    for (let x = 0; x < B.w; x++) {
      let v = 0;
      for (let k = -R; k <= R && !v; k++) {
        const xx = x + k;
        if (xx >= 0 && xx < B.w && mask[y * B.w + xx]) v = 1;
      }
      tmp[y * B.w + x] = v;
    }
  const dil = new Uint8Array(B.w * B.h);
  for (let y = 0; y < B.h; y++)
    for (let x = 0; x < B.w; x++) {
      let v = 0;
      for (let k = -R; k <= R && !v; k++) {
        const yy = y + k;
        if (yy >= 0 && yy < B.h && tmp[yy * B.w + x]) v = 1;
      }
      dil[y * B.w + x] = v;
    }
  const out = Buffer.alloc(B.w * B.h * 3);
  for (let i = 0; i < B.w * B.h; i++) {
    const src = dil[i] ? B.data : P.data;
    out[i * 3] = src[i * 4];
    out[i * 3 + 1] = src[i * 4 + 1];
    out[i * 3 + 2] = src[i * 4 + 2];
  }
  const outPath = path.join(OUT, outRel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(out, { raw: { width: B.w, height: B.h, channels: 3 } })
    .webp({ quality: 90, smartSubsample: true, effort: 5 })
    .toFile(outPath);
  entries[key] = {
    w: B.w,
    h: B.h,
    x: srcAsset.x,
    y: srcAsset.y,
    source: srcAsset.source.replace(/\.png$/, ''),
    kind: 'Derived backing',
    src: `/assets/${outRel}`,
    alpha: false,
  };
  written++;
}

/**
 * Harmonic fill: replace the pixels of each rectangle with the smooth surface that meets every
 * surrounding pixel (Laplace equation, Jacobi relaxation seeded by vertical interpolation).
 */
function harmonicFill(buf, W, H, rects, iterations = 900) {
  const mask = new Uint8Array(W * H);
  for (const [x0, y0, x1, y1] of rects) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mask[y * W + x] = 1;
  const f = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H * 3; i++) f[i] = buf[i];
  // seed: vertical interpolation inside each rectangle
  for (const [x0, y0, x1, y1] of rects)
    for (let x = x0; x <= x1; x++)
      for (let c = 0; c < 3; c++) {
        const top = f[((y0 - 1) * W + x) * 3 + c];
        const bot = f[((y1 + 1) * W + x) * 3 + c];
        for (let y = y0; y <= y1; y++) f[(y * W + x) * 3 + c] = top + ((bot - top) * (y - y0 + 1)) / (y1 - y0 + 2);
      }
  const idx = [];
  for (let i = 0; i < W * H; i++) if (mask[i]) idx.push(i);
  for (let it = 0; it < iterations; it++)
    for (const i of idx) {
      const x = i % W;
      const y = (i / W) | 0;
      const l = x > 0 ? i - 1 : i, r = x < W - 1 ? i + 1 : i, u = y > 0 ? i - W : i, d = y < H - 1 ? i + W : i;
      for (let c = 0; c < 3; c++) f[i * 3 + c] = (f[l * 3 + c] + f[r * 3 + c] + f[u * 3 + c] + f[d * 3 + c]) * 0.25;
    }
  for (const i of idx) for (let c = 0; c < 3; c++) buf[i * 3 + c] = Math.max(0, Math.min(255, Math.round(f[i * 3 + c])));
}

/** About hero + ribbon band composite (1199 × 676) and its ribbon-light mask. */
async function deriveAboutComposite() {
  const W = 1199;
  const H = 676;
  const plate = await sharp(path.join(SRC, '06-About/backgrounds/about-hero.png')).removeAlpha().raw().toBuffer();
  const ref = await sharp(path.join(REF, '06_About.png')).removeAlpha().raw().toBuffer();
  const buf = Buffer.alloc(W * H * 3);
  plate.copy(buf, 0, 0, W * 449 * 3); // rows 0–448: supplied plate
  ref.copy(buf, W * 449 * 3, W * 449 * 3, W * H * 3); // rows 449–675: design pixels
  // Interface areas → harmonic fill. Measured in 06_About.png: metrics strip x 134–1072,
  // y 448–525 (plus its outer glow to y≈534); kicker x 65–246, y 549–559; industry cards
  // x 67–1159, y 573–672.
  harmonicFill(buf, W, H, [
    [128, 444, 1079, 535],
    [58, 543, 254, 566],
    [62, 568, 1164, 674],
  ]);
  const outRel = '06-About/derived/hero-band.png';
  const comp = await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  Object.assign(
    (entries['06-About/derived/hero-band'] = {
      w: W,
      h: H,
      x: 0,
      y: 0,
      source: '06_About',
      kind: 'Derived composite',
      alpha: false,
    }),
    await emitArtwork(comp, outRel, { twoX: true, half: true, width: W }),
  );
  written++;

  // Ribbon-light mask: saturated, bright ribbon pixels below the pillars (y ≥ 372), the office
  // and V excluded, plus a soft path where the ribbon runs behind the metrics strip.
  const alpha = Buffer.alloc(W * H);
  for (let y = 372; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (x > 470 && x < 1000 && y < 446) continue; // V orbit + office floor
      const i = (y * W + x) * 3;
      const R = buf[i], G = buf[i + 1], B = buf[i + 2];
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      const sat = mx ? (mx - mn) / mx : 0;
      const lum = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      const s = Math.min(1, Math.max(0, (sat - 0.55) / 0.3));
      const l = Math.min(1, Math.max(0, (lum - 55) / 110));
      alpha[y * W + x] = Math.round(255 * s * l);
    }
  const pathSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <path d="M 40 452 C 150 520, 330 512, 600 498 S 980 470, 1199 440" fill="none" stroke="#fff" stroke-opacity="1" stroke-width="24" stroke-linecap="round"/>
    </svg>`,
  );
  // Single-channel raw buffers throughout (sharp otherwise widens greyscale output to sRGB).
  const one = async (img) => {
    const { data, info } = await img.extractChannel(0).raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 1 || data.length !== W * H) throw new Error('mask: expected one channel');
    return data;
  };
  const pathA = await one(sharp(await sharp(pathSvg).blur(7).extractChannel('alpha').png().toBuffer()));
  for (let i = 0; i < W * H; i++) alpha[i] = Math.max(alpha[i], pathA[i]);
  const soft = await one(sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(1.2));
  const rgba = Buffer.alloc(W * H * 4, 255);
  for (let i = 0; i < W * H; i++) rgba[i * 4 + 3] = soft[i];
  const maskRel = '06-About/derived/ribbon-light.png';
  fs.mkdirSync(path.dirname(path.join(OUT, maskRel)), { recursive: true });
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, maskRel));
  entries['06-About/derived/ribbon-light'] = {
    w: W,
    h: H,
    x: 0,
    y: 0,
    source: '06_About',
    kind: 'Derived mask',
    src: `/assets/${maskRel}`,
    alpha: true,
  };
  written++;
}

/**
 * Home: the band behind the discipline cards (rows 581–753 of 01_Home.png) between the hero plate
 * and the divider ribbon. The cards are replaced by a harmonic fill from the hero's last row and
 * the divider's first row; the margins keep the design's ribbons, so the hero's light continues
 * past its lower edge instead of stopping on a line.
 */
async function deriveHomeServicesBand() {
  const W = 1672;
  const y0 = 576; // a few rows of context above the band (hero plate) and below (divider)
  const H = 760 - y0;
  const ref = await sharp(path.join(REF, '01_Home.png')).removeAlpha().extract({ left: 0, top: y0, width: W, height: H }).raw().toBuffer();
  // Measured in 01_Home.png: cards x 60–1635, y 582–752, with their outer glow.
  harmonicFill(ref, W, H, [[52, 581 - y0, 1643, 753 - y0]], 1200);
  const band = await sharp(ref, { raw: { width: W, height: H, channels: 3 } })
    .extract({ left: 0, top: 581 - y0, width: W, height: 173 })
    .png()
    .toBuffer();
  entries['01-Home/derived/services-band'] = {
    w: W,
    h: 173,
    x: 0,
    y: 581,
    source: '01_Home',
    kind: 'Derived backing',
    alpha: false,
    ...(await emitArtwork(band, '01-Home/derived/services-band.png', { twoX: false, half: false, width: W })),
  };
  written++;
}

const derivedOnly = process.argv.includes('--derived-only');
if (derivedOnly) {
  // Keep every generated file; reload the manifest entries and rebuild only the derivations.
  const prev = fs.readFileSync(GEN, 'utf8');
  const json = prev.slice(prev.indexOf('export const ASSETS = ') + 'export const ASSETS = '.length, prev.lastIndexOf(' as const'));
  Object.assign(entries, JSON.parse(json));
} else {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const shipped = manifest.assets.filter((a) => !isReference(a.file));
  // modest parallelism
  for (let i = 0; i < shipped.length; i += 8) {
    await Promise.all(shipped.slice(i, i + 8).map(emit));
  }
}

const find = (f) => manifest.assets.find((a) => a.file === f);
await deriveHomeServicesBand();
await cleanBacking({
  base: '05-Studio/motion-ribbons/studio-hero-wave/01-base.png',
  strip: '05-Studio/motion-ribbons/studio-hero-wave/02-ribbon.png',
  plate: '05-Studio/backgrounds/studio-hero.png',
  stripX: 0,
  outRel: '05-Studio/motion-ribbons/studio-hero-wave/01-base-clean.webp',
  key: '05-Studio/motion-ribbons/studio-hero-wave/01-base-clean',
  srcAsset: find('05-Studio/motion-ribbons/studio-hero-wave/01-base.png'),
});
// The Contact backdrop already contains both ribbons. Its top-edge backing differs from the
// backdrop outside the strip (up to 112 levels), which would show as a seam at y = 40.
await cleanBacking({
  base: '07-Contact/motion-ribbons/top-edge/01-base.png',
  strip: '07-Contact/motion-ribbons/top-edge/02-ribbon.png',
  plate: '07-Contact/backgrounds/globe-and-ribbons-backdrop.png',
  stripX: 0,
  outRel: '07-Contact/motion-ribbons/top-edge/01-base-clean.webp',
  key: '07-Contact/motion-ribbons/top-edge/01-base-clean',
  srcAsset: find('07-Contact/motion-ribbons/top-edge/01-base.png'),
});
await cleanBacking({
  base: '07-Contact/motion-ribbons/lower-edge/01-base.png',
  strip: '07-Contact/motion-ribbons/lower-edge/02-ribbon.png',
  plate: '07-Contact/backgrounds/globe-and-ribbons-backdrop.png',
  stripX: 0,
  outRel: '07-Contact/motion-ribbons/lower-edge/01-base-clean.webp',
  key: '07-Contact/motion-ribbons/lower-edge/01-base-clean',
  srcAsset: find('07-Contact/motion-ribbons/lower-edge/01-base.png'),
});
await deriveAboutComposite();

// Self-hosted Plus Jakarta Sans (OFL), copied from the version-locked npm package so it can be preloaded.
const FONT_SRC = path.join(ROOT, 'node_modules/@fontsource-variable/plus-jakarta-sans/files');
const FONT_OUT = path.join(ROOT, 'public/fonts');
fs.mkdirSync(FONT_OUT, { recursive: true });
for (const f of ['plus-jakarta-sans-latin-wght-normal.woff2', 'plus-jakarta-sans-latin-wght-italic.woff2']) {
  fs.copyFileSync(path.join(FONT_SRC, f), path.join(FONT_OUT, f));
}

const sorted = Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b)));
const ts = `// Generated by scripts/build-assets.mjs — do not edit by hand.
// Coordinates are native pixels in the named source design (top-left, including transparent padding).
export interface AssetEntry {
  /** WebP (artwork) or PNG (glyphs) at native size — the universal fallback. */
  src: string;
  /** Native-size AVIF, 4:4:4. */
  avif?: string;
  /** 2× AVIF (Lanczos-3 + light unsharp mask) for wide and high-density layouts. */
  avif2x?: string;
  /** 2× PNG glyph. */
  src2x?: string;
  w: number;
  h: number;
  x: number;
  y: number;
  source: string;
  kind: string;
  alpha?: boolean;
  srcHalf?: string;
  avifHalf?: string;
  halfW?: number;
}

export const ASSETS = ${JSON.stringify(sorted, null, 2)} as const satisfies Record<string, AssetEntry>;

export type AssetKey = keyof typeof ASSETS;
`;
fs.mkdirSync(path.dirname(GEN), { recursive: true });
fs.writeFileSync(GEN, ts);
console.log(`Wrote ${written} assets to public/assets and ${path.relative(ROOT, GEN)}`);
