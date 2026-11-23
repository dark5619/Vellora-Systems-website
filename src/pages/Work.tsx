import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router-dom';
import { FilterBar } from '../components/FilterBar';
import { Plate } from '../components/Plate';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectPreview } from '../components/ProjectPreview';
import { ButtonLink, Eyebrow, Glyph } from '../components/primitives';
import { FILTERS, PROJECTS, isFilterId, projectById, type FilterId, type Project } from '../data/projects';
import { FACTS } from '../data/site';
import { usePrefersReducedMotion } from '../hooks/useMedia';
import { usePageTitle } from '../hooks/usePageTitle';
import type { AssetKey } from '../lib/assets';
import './Work.css';

const STATS: { icon: AssetKey; value: string; label: string; cls: string }[] = [
  { icon: 'Shared-Icons/portfolio/projects-rocket', value: FACTS.endToEnd.value, label: 'Concept to Launch', cls: 'e2e' },
  { icon: 'Shared-Icons/portfolio/team', value: FACTS.team.value, label: 'Experts', cls: 'team' },
  { icon: 'Shared-Icons/portfolio/industries-globe', value: FACTS.industries.value, label: 'Industries', cls: 'ind' },
  { icon: 'Shared-Icons/portfolio/focus-star', value: FACTS.clientFocus.value, label: 'Client Focus', cls: 'focus' },
];

export function WorkPage() {
  usePageTitle('Selected Work');
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navType = useNavigationType();
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const gridId = useId();

  const raw = params.get('filter');
  const filter: FilterId = isFilterId(raw) ? raw : 'all';
  const previewProject = projectById(params.get('project')) ?? null;

  // Displayed filter lags the selected one by a short fade.
  const [shown, setShown] = useState<FilterId>(filter);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (filter === shown) return;
    if (reduced) {
      setShown(filter);
      return;
    }
    setFading(true);
    const t = window.setTimeout(() => {
      setShown(filter);
      setFading(false);
    }, 150);
    return () => window.clearTimeout(t);
  }, [filter, shown, reduced]);

  const visible = PROJECTS.filter((p) => shown === 'all' || p.filters.includes(shown));
  const label = FILTERS.find((f) => f.id === shown)?.label ?? 'All Work';

  const setFilter = (id: FilterId) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (id === 'all') next.delete('filter');
        else next.set('filter', id);
        next.delete('project');
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  // ---- Preview dialog (URL-backed so Back closes it) ----
  const openerKey = useRef<string | null>(null);
  const openPreview = (project: Project) => {
    openerKey.current = project.id;
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set('project', project.id);
        return next;
      },
      { preventScrollReset: true, state: { preview: true } },
    );
  };
  const closePreview = useCallback(() => {
    const state = location.state as { preview?: boolean } | null;
    if (!params.get('project')) return;
    if (state?.preview) navigate(-1);
    else
      setParams(
        (p) => {
          const next = new URLSearchParams(p);
          next.delete('project');
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
  }, [location.state, navigate, params, setParams]);

  // Return focus to the card control that opened the preview.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (previewProject) {
      wasOpen.current = true;
      openerKey.current = previewProject.id;
      return;
    }
    if (wasOpen.current && openerKey.current) {
      wasOpen.current = false;
      const key = openerKey.current;
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`[data-focus-key="${key}"]`)?.focus({ preventScroll: true }),
      );
    }
  }, [previewProject]);

  // ---- Case study round trip: remember the opener, restore focus on Back ----
  const rememberCaseStudyOpener = (project: Project) => {
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      preventScrollReset: true,
      state: { returnFocus: project.id },
    });
  };
  useLayoutEffect(() => {
    const state = location.state as { returnFocus?: string } | null;
    if (navType === 'POP' && state?.returnFocus) {
      const key = state.returnFocus;
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`[data-focus-key="${key}"]`)?.focus({ preventScroll: true }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page page--work">
      <section className="work-hero" aria-labelledby="work-title">
        <Plate k="02-Our-Work/backgrounds/portfolio-hero" priority focus="80% 40%" />
        <div className="col work-hero__inner">
          <Eyebrow flash="portfolio" className="work-hero__eyebrow">
            Our Portfolio
          </Eyebrow>
          <h1 id="work-title" className="work-hero__title">
            Selected <span className="t-lime">Work</span>
          </h1>
          <p className="work-hero__lead">
            Real products we’ve built for global clients — from mobile games <br className="br-desktop" />
            and streaming platforms to healthcare, fintech, hardware, and robotics.
          </p>
        </div>
      </section>

      <div className="col work-filters">
        <FilterBar value={filter} onChange={setFilter} controls={gridId} />
      </div>

      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {`Showing ${visible.length} ${visible.length === 1 ? 'project' : 'projects'}${shown === 'all' ? '' : ` in ${label}`}.`}
      </p>

      <div className="col">
        <ul id={gridId} className={`work-grid ${fading ? 'is-fading' : ''}`} role="list" aria-label={`Projects: ${label}`}>
          {visible.map((p, i) => (
            <li key={p.id} className="work-grid__item">
              <ProjectCard project={p} onPreview={openPreview} onCaseStudy={rememberCaseStudyOpener} eager={i < 3} />
            </li>
          ))}
        </ul>
      </div>

      <section className="work-cta" aria-labelledby="work-cta-title">
        <Plate k="02-Our-Work/backgrounds/footer-ribbons" focus="70% 50%" />
        <div className="col work-cta__inner">
          <ul className="work-cta__stats" role="list" aria-label="Vellora at a glance">
            {STATS.map((s) => (
              <li key={s.cls} className={`stat work-stat work-stat--${s.cls}`}>
                <Glyph k={s.icon} className="stat__icon work-stat__icon" />
                <span>
                  <span className="stat__value work-stat__value">{s.value}</span>
                  <span className="stat__label work-stat__label">{s.label}</span>
                </span>
              </li>
            ))}
          </ul>
          <h2 id="work-cta-title" className="work-cta__title">
            Build Something <br />
            <span className="t-lime">Extraordinary.</span>
          </h2>
          <ButtonLink to="/contact" variant="primary" className="work-cta__btn">
            Let’s Talk
          </ButtonLink>
        </div>
      </section>

      <ProjectPreview project={previewProject} onClose={closePreview} />
    </div>
  );
}
