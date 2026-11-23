import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { NAV, NAV_CASE, type NavItem } from '../data/site';
import { ButtonLink } from './primitives';
import { asset } from '../lib/assets';

function isActive(item: NavItem, pathname: string) {
  if (item.to === '/') return pathname === '/';
  return pathname === item.to || (item.match ?? []).some((m) => pathname.startsWith(m));
}

function itemsFor(pathname: string) {
  const caseStudy = pathname.startsWith('/work/');
  return {
    caseStudy,
    desktop: caseStudy ? NAV_CASE : NAV,
    // Phones: the full list, plus Case Studies while reading one.
    mobile: caseStudy ? [...NAV_CASE, NAV[NAV.length - 1]] : NAV,
  };
}

function Label({ item }: { item: NavItem }) {
  return (
    <>
      {item.long?.before && <span className="nav-long">{item.long.before}</span>}
      {item.label}
      {item.long?.after && <span className="nav-long">{item.long.after}</span>}
    </>
  );
}

export function Header() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const nav = itemsFor(pathname);
  // Each design's own lockup variant (the case study uses its narrower "SYSTEMS" wordmark).
  const lockup = asset(nav.caseStudy ? 'Shared-Brand/03-case-study/lockup' : 'Shared-Brand/primary-home/lockup');

  // Close on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes and returns focus; clicks outside close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !toggleRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  // Close if the viewport grows past the collapse point.
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1000px)');
    const onChange = () => m.matches && setOpen(false);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  // Fixed header: transparent over the artwork at the top of a page, solid once the page scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  const cls = [
    'site-header',
    scrolled || open ? 'is-solid' : '',
    nav.caseStudy ? 'site-header--case' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
    <header id="site-header" className={cls}>
      <div className="site-header__bar">
        <Link to="/" className="brand" aria-label="Vellora Systems — home">
          <img
            className="brand__lockup"
            src={lockup.src}
            width={lockup.w}
            height={lockup.h}
            alt=""
            decoding="async"
          />
          <span className="brand__tagline" aria-hidden="true">
            <span>
              A multi-disciplinary
              <br />
              technology company
            </span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main">
          <ul className="site-nav__list">
            {nav.desktop.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className="site-nav__link"
                  aria-current={isActive(item, pathname) ? 'page' : undefined}
                  end
                >
                  <Label item={item} />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <ButtonLink to="/contact" variant="outline" className="header-cta">
          Start a Project
        </ButtonLink>

        <button
          ref={toggleRef}
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="menu-toggle__bars" aria-hidden="true">
            <span />
          </span>
          Menu
        </button>
      </div>

      <div id={menuId} ref={menuRef} className="mobile-menu" hidden={!open}>
        <nav aria-label="Main (mobile)">
          <ul className="mobile-menu__list">
            {nav.mobile.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className="mobile-menu__link"
                  aria-current={isActive(item, pathname) ? 'page' : undefined}
                  end
                >
                  {item.long?.before}
                  {item.label}
                  {item.long?.after}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <ButtonLink to="/contact" variant="primary">
          Start a Project
        </ButtonLink>
      </div>
    </header>
    </>
  );
}
