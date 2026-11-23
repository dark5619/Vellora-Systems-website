import { asset } from './assets';
import type { MediaDirection } from '../data/projects';

export interface MediaLayout {
  stage: { left: string; top: string; width: string; aspectRatio: string };
  object: { left: string; top: string; width: string; transformOrigin: string; scale: number };
  /** Device scale relative to native pixels when the frame is `refWidth` CSS px wide. */
  nativeScale: number;
}

/**
 * Resolve an art direction into percentage-based positions for a frame of the given aspect.
 * `refWidth` is the frame width at the reference layout and is only used to report and cap
 * the device's scale against its native resolution.
 */
export function layoutMedia(dir: MediaDirection, aspect: number, refWidth = 371): MediaLayout {
  const art = asset(dir.art);
  const obj = asset(dir.object);
  const Fw = 1000;
  const Fh = Fw / aspect;
  const cover = Math.max(Fw / art.w, Fh / art.h);
  const S = cover * (dir.zoom ?? 1);
  const place = dir.place ?? [0.5, 0.5];
  const artW = art.w * S;
  const artH = art.h * S;

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const left = clamp(place[0] * Fw - dir.focal[0] * S, Fw - artW, 0);
  const top = dir.anchorBottom ? Fh - artH : clamp(place[1] * Fh - dir.focal[1] * S, Fh - artH, 0);

  const artNative = (artW / Fw) * (refWidth / art.w);
  let k = dir.objectScale ?? 1;
  if (artNative * k > dir.maxScale) k = Math.max(1, dir.maxScale / artNative);
  const origin = dir.objectOrigin ?? [obj.w / 2, obj.h / 2];

  return {
    stage: {
      left: `${(left / Fw) * 100}%`,
      top: `${(top / Fh) * 100}%`,
      width: `${(artW / Fw) * 100}%`,
      aspectRatio: `${art.w} / ${art.h}`,
    },
    object: {
      left: `${((obj.x - art.x) / art.w) * 100}%`,
      top: `${((obj.y - art.y) / art.h) * 100}%`,
      width: `${(obj.w / art.w) * 100}%`,
      transformOrigin: `${(origin[0] / obj.w) * 100}% ${(origin[1] / obj.h) * 100}%`,
      scale: k,
    },
    nativeScale: artNative * k,
  };
}
