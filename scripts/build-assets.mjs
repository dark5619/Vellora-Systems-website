// Builds optimized web derivatives from the untouched source package.
//
//   node scripts/build-assets.mjs
//
// Source: asset-source/Vellora-Assets (never modified)
// Output: public/assets/**            (served files)
//         src/data/assets.generated.ts (typed manifest: url, intrinsic size, source coordinates)
//
// Rules applied:
// - Shared-Brand and Shared-Icons are copied byte-for-byte (small, sharp PNG glyphs).
// - All other artwork is converted to WebP at native resolution with alpha preserved.
//   Plates 1100px or wider also get a half-width variant for narrow viewports.
// - Card references, industry card references, ribbon reference.png and the Guide maps are
//   comparison material only and are not shipped.
// - Two ribbon backings contain baked interface pixels in their upper rows. Clean derivatives
//   are composed from supplied pixels only: the text-free page plate where the light strip is
//   absent, and the supplied ribbon-free backing under (and within 6px of) the strip.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'asset-source/Vellora-Assets');
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
// The poster (hero-with-v) stays lossy for a fast first paint; the WebGL layers are lossless so
// the resting frame reproduces the source plate.
const isLossless = (f) => f.startsWith('01-Home/motion-home-hero/') || f.startsWith('02-Our-Work/project-objects/');

const entries = {};
let written = 0;

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
  } else {
    const outRel = rel.replace(/\.png$/, '.webp');
    const outPath = path.join(OUT, outRel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const img = sharp(inPath);
    const meta = await img.metadata();
    const hasAlpha = meta.hasAlpha;
    await img
      .webp(
        isLossless(rel)
          ? { lossless: true, effort: 6 }
          : { quality: 90, alphaQuality: 100, smartSubsample: true, effort: 5 },
      )
      .toFile(outPath);
    entry.src = `/assets/${outRel}`;
    entry.alpha = !!hasAlpha;
    if (asset.width >= 1100) {
      const halfW = Math.round(asset.width / 2);
      const halfRel = rel.replace(/\.png$/, `-w${halfW}.webp`);
      await sharp(inPath)
        .resize({ width: halfW, kernel: 'lanczos3' })
        .webp({ quality: 86, alphaQuality: 100, smartSubsample: true, effort: 5 })
        .toFile(path.join(OUT, halfRel));
      entry.srcHalf = `/assets/${halfRel}`;
      entry.halfW = halfW;
    }
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

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const shipped = manifest.assets.filter((a) => !isReference(a.file));
// modest parallelism
for (let i = 0; i < shipped.length; i += 8) {
  await Promise.all(shipped.slice(i, i + 8).map(emit));
}

const find = (f) => manifest.assets.find((a) => a.file === f);
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
  src: string;
  w: number;
  h: number;
  x: number;
  y: number;
  source: string;
  kind: string;
  alpha?: boolean;
  srcHalf?: string;
  halfW?: number;
}

export const ASSETS = ${JSON.stringify(sorted, null, 2)} as const satisfies Record<string, AssetEntry>;

export type AssetKey = keyof typeof ASSETS;
`;
fs.mkdirSync(path.dirname(GEN), { recursive: true });
fs.writeFileSync(GEN, ts);
console.log(`Wrote ${written} assets to public/assets and ${path.relative(ROOT, GEN)}`);
