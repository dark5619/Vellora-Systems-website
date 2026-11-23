import { ASSETS, type AssetKey, type AssetEntry } from '../data/assets.generated';

export type { AssetKey, AssetEntry };

export function asset(key: AssetKey): AssetEntry {
  return ASSETS[key] as AssetEntry;
}

/** WebP srcset for plates that ship a half-width derivative (fallback format). */
export function srcSet(key: AssetKey): string | undefined {
  const a = asset(key);
  if (!a.srcHalf || !a.halfW) return undefined;
  return `${a.srcHalf} ${a.halfW}w, ${a.src} ${a.w}w`;
}

/**
 * AVIF (4:4:4) candidates by width: half (phones), native, and the 2× enlargement used on wide
 * and high-density layouts. Undefined for glyphs and masks.
 */
export function avifSet(key: AssetKey): string | undefined {
  const a = asset(key);
  if (!a.avif) return undefined;
  const out: string[] = [];
  if (a.avifHalf && a.halfW) out.push(`${a.avifHalf} ${a.halfW}w`);
  out.push(`${a.avif} ${a.w}w`);
  if (a.avif2x) out.push(`${a.avif2x} ${a.w * 2}w`);
  return out.join(', ');
}

/** Density srcset for glyphs (native PNG + 2× Lanczos PNG). */
export function glyphSet(key: AssetKey): string | undefined {
  const a = asset(key);
  return a.src2x ? `${a.src} 1x, ${a.src2x} 2x` : undefined;
}

/**
 * Position of a manifest asset inside a parent rectangle (both in the same source design),
 * expressed as percentages of the parent so it scales with the parent's rendered size.
 */
export function placeIn(
  key: AssetKey,
  parent: { x: number; y: number; w: number; h: number },
): { left: string; top: string; width: string } {
  const a = asset(key);
  return {
    left: `${((a.x - parent.x) / parent.w) * 100}%`,
    top: `${((a.y - parent.y) / parent.h) * 100}%`,
    width: `${(a.w / parent.w) * 100}%`,
  };
}
