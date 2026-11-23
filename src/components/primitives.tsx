import type { CSSProperties, ImgHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { asset, srcSet, type AssetKey } from '../lib/assets';

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'alt'> & {
  k: AssetKey;
  alt: string;
  priority?: boolean;
  sizes?: string;
};

/** Manifest-backed image with intrinsic size, responsive source and sensible loading. */
export function Img({ k, alt, priority, sizes, loading, ...rest }: ImgProps) {
  const a = asset(k);
  const set = srcSet(k);
  return (
    <img
      src={a.src}
      srcSet={set}
      sizes={set ? (sizes ?? '100vw') : undefined}
      width={a.w}
      height={a.h}
      alt={alt}
      loading={priority ? 'eager' : (loading ?? 'lazy')}
      decoding={priority ? 'sync' : 'async'}
      // React 18 warns on camelCase fetchPriority; pass the DOM attribute directly.
      {...(priority ? { fetchpriority: 'high' } : {})}
      draggable={false}
      {...rest}
    />
  );
}

/** Decorative supplied glyph. */
export function Glyph({ k, className, style }: { k: AssetKey; className?: string; style?: CSSProperties }) {
  const a = asset(k);
  return (
    <img
      src={a.src}
      width={a.w}
      height={a.h}
      alt=""
      aria-hidden="true"
      className={className}
      style={style}
      decoding="async"
      draggable={false}
    />
  );
}

type EyebrowFlash = 'home' | 'portfolio' | 'case-study' | 'expertise' | 'studio' | 'contact';

export function Eyebrow({ children, flash = 'home', className = '' }: { children: ReactNode; flash?: EyebrowFlash; className?: string }) {
  return (
    <p className={`eyebrow ${className}`}>
      <Glyph k={`Shared-Icons/${flash}/section-flash` as AssetKey} className="eyebrow__flash" />
      <span>{children}</span>
    </p>
  );
}

const ARROW_DARK: AssetKey = 'Shared-Icons/home/explore-arrow';
const ARROW_LIGHT: AssetKey = 'Shared-Icons/case-study/footer-link-arrow';

interface BtnProps extends Omit<LinkProps, 'className'> {
  variant?: 'primary' | 'outline' | 'ghost';
  arrow?: boolean;
  icon?: AssetKey;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({ variant = 'primary', arrow = true, icon, className = '', children, ...rest }: BtnProps) {
  return (
    <Link className={`btn btn--${variant} ${className}`} {...rest}>
      {icon && <Glyph k={icon} className="btn__icon" />}
      <span>{children}</span>
      {arrow && <Glyph k={variant === 'primary' ? ARROW_DARK : ARROW_LIGHT} className="btn__arrow" />}
    </Link>
  );
}

export function ArrowGlyph({ dark = false, className = 'btn__arrow' }: { dark?: boolean; className?: string }) {
  return <Glyph k={dark ? ARROW_DARK : ARROW_LIGHT} className={className} />;
}

/** In-page jump that scrolls to and focuses its target without touching router history. */
export function JumpLink({ target, className, children }: { target: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={`#${target}`}
      className={className}
      onClick={(e) => {
        const el = document.getElementById(target);
        if (!el) return;
        e.preventDefault();
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        el.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}
