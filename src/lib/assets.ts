import { ASSETS, type AssetKey, type AssetEntry } from '../data/assets.generated';

export type { AssetKey, AssetEntry };

export function asset(key: AssetKey): AssetEntry {
  return ASSETS[key] as AssetEntry;
}

/** srcset for plates that ship a half-width derivative. */
export function srcSet(key: AssetKey): string | undefined {
  const a = asset(key);
  if (!a.srcHalf || !a.halfW) return undefined;
  return `${a.srcHalf} ${a.halfW}w, ${a.src} ${a.w}w`;
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
