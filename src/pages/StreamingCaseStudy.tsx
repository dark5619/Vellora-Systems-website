import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plate } from '../components/Plate';
import { RibbonEdge } from '../components/RibbonEdge';
import { ButtonLink, Glyph, Img } from '../components/primitives';
import { usePageTitle } from '../hooks/usePageTitle';
import type { AssetKey } from '../lib/assets';
import './StreamingCaseStudy.css';

const PLATFORMS: { label: string; icon: AssetKey; cls: string }[] = [
  { label: 'TV', icon: 'Shared-Icons/case-study/tv', cls: 'tv' },
  { label: 'Mobile', icon: 'Shared-Icons/case-study/phone', cls: 'mobile' },
  { label: 'Web', icon: 'Shared-Icons/case-study/web-globe', cls: 'web' },
  { label: 'OTT', icon: 'Shared-Icons/case-study/ott-cast', cls: 'ott' },
];

const FACTS: { label: string; value: string; icon: AssetKey; cls: string }[] = [
  { label: 'Industry', value: 'Media & Entertainment', icon: 'Shared-Icons/case-study/industry', cls: 'industry' },
  { label: 'Project Duration', value: '6 Months', icon: 'Shared-Icons/case-study/calendar', cls: 'duration' },
  { label: 'Our Role', value: 'Full-Cycle Development', icon: 'Shared-Icons/case-study/team', cls: 'role' },
  { label: 'Platforms', value: 'iOS\u2009·\u2009Android\u2009·\u2009Web\u2009·\u2009TV', icon: 'Shared-Icons/case-study/platforms', cls: 'platforms' },
];

const STACK: { label: string; icon: AssetKey }[] = [
  { label: 'React', icon: 'Shared-Icons/technology/react' },
  { label: 'Node.js', icon: 'Shared-Icons/technology/nodejs' },
  { label: 'Flutter', icon: 'Shared-Icons/technology/flutter' },
  { label: 'AWS', icon: 'Shared-Icons/technology/aws' },
  { label: 'FFmpeg', icon: 'Shared-Icons/technology/ffmpeg' },
  { label: 'Docker', icon: 'Shared-Icons/technology/docker' },
];

const OUTCOMES = [
  { value: '+180%', label: 'User Engagement' },
  { value: '99.9%', label: 'Platform Uptime' },
  { value: '3×', label: 'Faster Load Time' },
  { value: '+60%', label: 'Content Consumption' },
];

// Titles and badges as printed in the case-study design; each opens the matching work.
const RELATED: { title: [string, string]; badge: string; icon: AssetKey; art: AssetKey; to: string }[] = [
  { title: ['Casual Mobile Games', 'for RayMobileGames'], badge: 'Game Development', icon: 'Shared-Icons/industries/games', art: '03-Case-Study/related-project-art/games', to: '/work?project=casual-mobile-games' },
  { title: ['Patient & Care Platform', 'for Neo Health'], badge: 'Healthcare', icon: 'Shared-Icons/industries/healthcare', art: '03-Case-Study/related-project-art/care-platform', to: '/work?project=healthcare-web' },
  { title: ['Mobile Banking &', 'Payments Solution'], badge: 'Fintech', icon: 'Shared-Icons/industries/fintech', art: '03-Case-Study/related-project-art/mobile-banking', to: '/work?project=fintech-dashboard' },
  { title: ['PCB Design &', 'Robotics Integration'], badge: 'Hardware & Robotics', icon: 'Shared-Icons/industries/hardware', art: '03-Case-Study/related-project-art/pcb-robotics', to: '/work?filter=hardware' },
];

const TRENDING: AssetKey[] = [
  '03-Case-Study/screen-details/trending-01',
  '03-Case-Study/screen-details/trending-02',
  '03-Case-Study/screen-details/trending-03',
  '03-Case-Study/screen-details/trending-04',
];

export function StreamingCaseStudyPage() {
  usePageTitle('Streaming Platform for Global Audiences — Case Study');
  const viewsRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="page page--case">
      <section className="cs-hero" aria-labelledby="cs-title">
        <Plate k="03-Case-Study/backgrounds/streaming-hero" priority focus="78% 50%" />
        <div className="col cs-hero__inner">
          <p className="cs-eyebrow">
            <span className="cs-eyebrow__dash" aria-hidden="true" />
            Case Study
          </p>
          <h1 id="cs-title" className="cs-title">
            Streaming Platform <br />
            <span className="cs-title__l2">
              for <span className="t-lime">Global Audiences</span>
            </span>
          </h1>
          <p className="cs-lead">
            A scalable, multi-device streaming platform delivering <br className="br-desktop" />
            high-quality video, live TV and on-demand content <br className="br-desktop" />
            with a seamless user experience.
          </p>
          <ul className="cs-platforms" role="list" aria-label="Delivered for">
            {PLATFORMS.map((p) => (
              <li key={p.cls} className={`cs-platform cs-platform--${p.cls}`}>
                <Glyph k={p.icon} className="cs-platform__icon" />
                <span>{p.label}</span>
              </li>
            ))}
          </ul>

          {/* Small screens: the TV and phone together, then close views of the catalogue. */}
          <figure className="cs-devices">
            <Img
              k="03-Case-Study/artwork/tv-and-smartphone"
              alt="The VelloraStream experience on a television and a smartphone: the same featured title, The Last Horizon, with Continue Watching on the phone and Trending Now on the TV."
              className="cs-devices__img"
              priority
            />
            <figcaption className="cs-closeups">
              <span className="cs-closeups__label">Close-up: featured title and Trending Now row</span>
              <span className="cs-closeups__row">
                <Img k="03-Case-Study/screen-details/featured-astronaut" alt="Featured hero artwork for The Last Horizon" className="cs-closeups__feature" />
                <span className="cs-closeups__trend">
                  {TRENDING.map((k, i) => (
                    <Img key={k} k={k} alt={`Trending Now tile ${i + 1}`} />
                  ))}
                </span>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="col cs-facts" aria-label="Project overview">
        <dl className="cs-facts__list">
          {FACTS.map((f) => (
            <div key={f.cls} className={`cs-fact cs-fact--${f.cls}`}>
              <Glyph k={f.icon} className="cs-fact__icon" />
              <dt className="cs-fact__label">{f.label}</dt>
              <dd className="cs-fact__value">{f.value}</dd>
            </div>
          ))}
        </dl>
        <button
          type="button"
          className="btn btn--primary cs-facts__btn"
          aria-haspopup="dialog"
          onClick={() => viewsRef.current?.showModal()}
        >
          <span>View project</span>
          <Glyph k="Shared-Icons/home/explore-arrow" className="btn__arrow" />
        </button>
      </section>

      <div className="col cs-columns">
        <section className="cs-col cs-col--challenge" aria-labelledby="cs-challenge">
          <h2 id="cs-challenge" className="cs-col__title">
            <Glyph k="Shared-Icons/case-study/challenge-target" className="cs-col__icon" />
            The Challenge
          </h2>
          <p className="cs-col__text">
            The client needed a modern, cross-platform streaming solution that could handle large user traffic, deliver
            high-quality video, and support both on-demand and live content with a smooth, reliable experience.
          </p>
        </section>
        <section className="cs-col cs-col--solution" aria-labelledby="cs-solution">
          <h2 id="cs-solution" className="cs-col__title">
            <Glyph k="Shared-Icons/case-study/solution-bolt" className="cs-col__icon" />
            Our Solution
          </h2>
          <p className="cs-col__text">
            We built a scalable OTT platform with a robust video pipeline, multi-device apps, a flexible content
            management system, and real-time analytics, all optimized for performance and user engagement.
          </p>
        </section>
        <section className="cs-col cs-col--stack" aria-labelledby="cs-stack">
          <h2 id="cs-stack" className="cs-col__title">
            <Glyph k="Shared-Icons/case-study/tech-stack" className="cs-col__icon" />
            Technology Stack
          </h2>
          <ul className="cs-stack" role="list">
            {STACK.map((t) => (
              <li key={t.label} className="cs-chip">
                <Glyph k={t.icon} className="cs-chip__icon" />
                <span>{t.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="col cs-outcome-wrap" aria-labelledby="cs-outcome">
        <div className="cs-outcome">
          <h2 id="cs-outcome" className="cs-outcome__title">
            <Glyph k="Shared-Icons/case-study/outcome-bars" className="cs-outcome__icon" />
            The Outcome
          </h2>
          <dl className="cs-outcome__list">
            {OUTCOMES.map((o) => (
              <div key={o.label} className="cs-metric">
                <dt className="cs-metric__label">{o.label}</dt>
                <dd className="cs-metric__value">{o.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="col cs-related" aria-labelledby="cs-related">
        <div className="cs-related__head">
          <h2 id="cs-related" className="cs-related__title">
            <Glyph k="Shared-Icons/case-study/section-flash" className="cs-related__flash" />
            More Case Studies
          </h2>
          <Link to="/work" className="cs-related__all">
            View all projects
            <Glyph k="Shared-Icons/case-study/footer-link-arrow" className="cs-related__all-arrow" />
          </Link>
        </div>
        <ul className="cs-related__grid" role="list">
          {RELATED.map((r) => (
            <li key={r.badge}>
              <Link to={r.to} className="rcard">
                {/* The supplied art is the unobstructed 81px strip above the caption. A soft,
                    darkened cover copy of the same strip continues it behind the caption. */}
                <span className="rcard__art decor" aria-hidden="true">
                  <Img k={r.art} alt="" className="rcard__soft" />
                  <Img k={r.art} alt="" className="rcard__img" />
                </span>
                <span className="rcard__caption">
                  <span className="rcard__badge">
                    <Glyph k={r.icon} className="rcard__badge-icon" />
                    {r.badge}
                  </span>
                  <span className="rcard__title">
                    {r.title[0]}{' '}
                    <br />
                    {r.title[1]}
                  </span>
                </span>
                <span className="rcard__go" aria-hidden="true">
                  <Glyph k="Shared-Icons/case-study/project-card-arrow" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="cs-footer" aria-labelledby="cs-footer-title">
        <Plate k="03-Case-Study/backgrounds/mountain-footer" focus="50% 60%" />
        <RibbonEdge
          base="03-Case-Study/motion-ribbons/footer-blue-crest/01-base"
          strip="03-Case-Study/motion-ribbons/footer-blue-crest/02-ribbon"
          className="cs-footer__ribbon"
        />
        <div className="col cs-footer__inner">
          <p className="cs-footer__kicker">Have a project in mind?</p>
          <h2 id="cs-footer-title" className="cs-footer__title">
            Let’s build it <span className="t-lime">together.</span>
          </h2>
          <ButtonLink to="/contact?type=streaming" variant="primary" className="cs-footer__btn">
            Get in touch
          </ButtonLink>
        </div>
      </section>

      {/* "View project": the delivered product at its native resolution, with close views. */}
      <dialog ref={viewsRef} className="cs-views" aria-labelledby="cs-views-title">
        <div className="cs-views__panel">
          <button type="button" className="pdialog__close" onClick={() => viewsRef.current?.close()}>
            Close project views
          </button>
          <p className="cs-views__kicker">Streaming Platform · TV, mobile and web</p>
          <h2 id="cs-views-title" className="cs-views__title">
            VelloraStream on TV and mobile
          </h2>
          <Img
            k="03-Case-Study/artwork/tv-and-smartphone"
            alt="VelloraStream on a television and a smartphone: the TV shows the featured title The Last Horizon with Watch Now and My List, above a Trending Now row; the phone shows the same title with Continue Watching."
            className="cs-views__devices"
          />
          <div className="cs-views__details">
            <figure className="cs-views__fig">
              <Img k="03-Case-Study/screen-details/featured-astronaut" alt="Featured hero artwork for The Last Horizon on the TV home screen" />
              <figcaption>Featured title</figcaption>
            </figure>
            <figure className="cs-views__fig cs-views__fig--row">
              <span className="cs-views__trend">
                {TRENDING.map((k, i) => (
                  <Img key={k} k={k} alt={`Trending Now tile ${i + 1}`} />
                ))}
              </span>
              <figcaption>Trending Now row</figcaption>
            </figure>
          </div>
          <div className="cs-views__actions">
            <ButtonLink to="/contact?type=streaming" variant="primary">
              Start a similar project
            </ButtonLink>
            <button type="button" className="btn btn--ghost" onClick={() => viewsRef.current?.close()}>
              Back to the case study
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

