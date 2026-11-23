import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigationType } from 'react-router-dom';
import { Header } from './Header';

/**
 * Shared shell: skip link, global header, main landmark and scroll restoration.
 *
 * Scroll positions are keyed by pathname so filter and preview changes on /work keep the
 * reader's place, and Back from a case study returns to the same spot.
 * On a pathname change, focus moves to the new page's <h1> unless the page restores focus
 * itself (for example, returning to the project card that opened a case study).
 */
export function Layout() {
  const location = useLocation();
  const navType = useNavigationType();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const state = location.state as { returnFocus?: string } | null;
    if (navType === 'POP' && state?.returnFocus) return; // page restores focus itself
    if (location.hash) return; // in-page anchor handles its own target
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <ScrollRestoration getKey={(loc) => loc.pathname} />
    </>
  );
}
