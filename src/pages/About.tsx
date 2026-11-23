import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { RibbonEdge } from '../components/RibbonEdge';
import { ButtonLink, Glyph, Img } from '../components/primitives';
import { asset } from '../lib/assets';
import { FACTS } from '../data/site';
import { useInView } from '../hooks/useInView';
import { usePageTitle } from '../hooks/usePageTitle';
import type { AssetKey } from '../lib/assets';
import './About.css';

const PILLARS: { icon: AssetKey; title: string; desc: [string, string]; cls: string }[] = [
  { icon: 'Shared-Icons/about/build-rocket', title: 'Build', desc: ['End-to-end product', 'delivery'], cls: 'build' },
  { icon: 'Shared-Icons/about/integrate-layers', title: 'Integrate', desc: ['Systems, services', 'and devices'], cls: 'integrate' },
  { icon: 'Shared-Icons/about/partnerships', title: 'Grow', desc: ['Long-term, trusted', 'partnerships'], cls: 'grow' },
];

const STATS: { icon: AssetKey; value: string; label: string; cls: string }[] = [
  { icon: 'Shared-Icons/about/core-team', value: FACTS.team.value, label: 'Core Team', cls: 'team' },
  { icon: 'Shared-Icons/about/delivery-trophy', value: FACTS.endToEnd.value, label: 'Concept to Launch', cls: 'e2e' },
  { icon: 'Shared-Icons/about/experience-calendar', value: FACTS.years.value, label: FACTS.years.label, cls: 'years' },
  { icon: 'Shared-Icons/about/global-clients', value: 'Multiple Industries', label: 'Global Clients', cls: 'global' },
];

const INDUSTRIES: { label: [string, string]; icon: AssetKey; to: string; tone: string; cls: string }[] = [
  { label: ['Games &', 'Entertainment'], icon: 'Shared-Icons/industries/games', to: '/work?filter=games', tone: 'violet', cls: 'games' },
  { label: ['Streaming', '& Media'], icon: 'Shared-Icons/industries/streaming', to: '/work/streaming-platform', tone: 'pink', cls: 'streaming' },
  { label: ['Healthcare', '& Wellness'], icon: 'Shared-Icons/industries/healthcare', to: '/work?filter=healthcare', tone: 'cyan', cls: 'healthcare' },
  { label: ['Fitness', '& Sports'], icon: 'Shared-Icons/industries/fitness', to: '/contact?type=fitness', tone: 'green', cls: 'fitness' },
  { label: ['Fintech', '& Finance'], icon: 'Shared-Icons/industries/fintech', to: '/work?filter=fintech', tone: 'amber', cls: 'fintech' },
  { label: ['Web &', 'Mobile Apps'], icon: 'Shared-Icons/industries/web-mobile', to: '/work?filter=mobile', tone: 'blue', cls: 'web' },
  { label: ['Hardware', '& PCB Design'], icon: 'Shared-Icons/industries/hardware', to: '/work?filter=hardware', tone: 'purple', cls: 'hardware' },
  { label: ['Robotics', '& Automation'], icon: 'Shared-Icons/industries/robotics', to: '/work?filter=robotics', tone: 'lime', cls: 'robotics' },
];

/** The multidisciplinary approach, told through delivered work (facts from the project copy). */
const PRACTICE = [
  {
    kicker: 'Streaming',
    title: 'One platform, three screens.',
    body: 'We built an OTT platform for TV, mobile and web. One video pipeline and one content system serve every screen.',
    to: '/work/streaming-platform',
    cta: 'Read the case study',
  },
  {
    kicker: 'Games',
    title: 'From build to live ops.',
    body: 'For RAYMOBILEGAMES we build casual games, integrate ads and run live operations.',
    to: '/work?filter=games',
    cta: 'See games work',
  },
  {
    kicker: 'Hardware & robotics',
    title: 'Boards and the software on top.',
    body: 'We take PCBs from schematic to prototype. We also build control, integration and UI for robotics systems.',
    to: '/work?filter=hardware',
    cta: 'See hardware work',
  },
];

export function AboutPage() {
  usePageTitle('About');
  const sceneRef = useRef<HTMLDivElement>(null);
  const live = useInView(sceneRef);
  const light = asset('06-About/derived/ribbon-light');

  return (
    <div className="page page--about">
      {/* One art layer for the whole composition: the supplied hero plate joined to the design's
          own ribbon band (derived in scripts/build-assets.mjs), so the office stays sharp to the
          right edge and the ribbons run behind the metrics strip into the industries. */}
      <div ref={sceneRef} className="ab-scene" data-live={live ? 'true' : 'false'}>
        <div className="ab-art decor" aria-hidden="true">
          <Img k="06-About/derived/hero-band" alt="" priority className="ab-art__img" sizes="(min-width: 1024px) 100vw, 180vw" />
          <span className="ab-art__light" style={{ '--light-mask': `url(${light.src})` } as CSSProperties}>
            <span className="ab-art__beam" />
          </span>
        </div>
      <section className="ab-hero" aria-labelledby="ab-title">
        <div className="ab-hero__text">
          <p className="ab-eyebrow">
            <span className="ab-eyebrow__flash" aria-hidden="true" />
            About Vellora Systems
          </p>
          <h1 id="ab-title" className="ab-title">
            A Proven IT Partner <br />
            Across <span className="ab-title__accent">Industries</span>{' '}
          </h1>
          <div className="ab-copy">
            <p>
              Vellora Systems is a multi-disciplinary technology company with <br className="br-desktop" />
              extensive experience delivering real-world products across a wide <br className="br-desktop" />
              range of industries — from mobile games and streaming platforms <br className="br-desktop" />
              to healthcare, fitness, fintech, hardware design, and robotics.
            </p>
            <p>
              With a skilled team of 15, we combine product thinking, engineering <br className="br-desktop" />
              expertise, and a passion for innovation to turn ideas into reliable, <br className="br-desktop" />
              scalable, and high-impact solutions.
            </p>
          </div>
          <ul className="ab-pillars" role="list">
            {PILLARS.map((p) => (
              <li key={p.cls} className={`ab-pillar ab-pillar--${p.cls}`}>
                <Glyph k={p.icon} className="ab-pillar__icon" />
                <span className="ab-pillar__title">{p.title}</span>
                <span className="ab-pillar__desc">
                  {p.desc[0]} <br className="br-desktop" />
                  {p.desc[1]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="col ab-stats-wrap" aria-label="Vellora at a glance">
        <ul className="ab-stats" role="list">
          {STATS.map((s) => (
            <li key={s.cls} className={`stat ab-stat ab-stat--${s.cls}`}>
              <Glyph k={s.icon} className="stat__icon ab-stat__icon" />
              <span>
                <span className="stat__value ab-stat__value">{s.value}</span>
                <span className="stat__label ab-stat__label">{s.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="col ab-industries" aria-labelledby="ab-ind-title">
        <h2 id="ab-ind-title" className="ab-kicker">
          <span className="ab-eyebrow__flash" aria-hidden="true" />
          Industries We Serve
        </h2>
        <ul className="ab-ind__grid" role="list">
          {INDUSTRIES.map((i) => (
            <li key={i.cls}>
              <Link to={i.to} className={`icard icard--${i.tone} icard--${i.cls}`}>
                <Glyph k={i.icon} className="icard__icon" />
                <span className="icard__label">
                  {i.label[0]}{' '}
                  <br />
                  {i.label[1]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      </div>

      <RibbonEdge base="06-About/motion-ribbons/lower-edge/01-base" strip="06-About/motion-ribbons/lower-edge/02-ribbon" className="ab-ribbon" />

      <section className="col ab-practice" aria-labelledby="ab-practice-title">
        <p className="ab-kicker">
          <span className="ab-eyebrow__flash" aria-hidden="true" />
          How we work
        </p>
        <h2 id="ab-practice-title" className="ab-practice__title">
          One team, <span className="t-lime t-italic">every layer</span> of the product.
        </h2>
        <p className="ab-practice__lead">
          Most products cross disciplines. Our designers, software engineers and hardware engineers work as one team, so
          each decision is made with the whole product in view.
        </p>
        <ul className="ab-practice__grid" role="list">
          {PRACTICE.map((p) => (
            <li key={p.kicker} className="practice glass">
              <p className="practice__kicker">{p.kicker}</p>
              <h3 className="practice__title">{p.title}</h3>
              <p className="practice__body">{p.body}</p>
              <Link to={p.to} className="practice__link">
                {p.cta}
                <Glyph k="Shared-Icons/case-study/footer-link-arrow" className="practice__arrow" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="ab-close glass">
          <div>
            <h2 className="ab-close__title">Planning a product that spans disciplines?</h2>
            <p className="ab-close__text">Tell us what you’re building. We reply within one business day.</p>
          </div>
          <div className="ab-close__actions">
            <ButtonLink to="/contact" variant="primary">
              Start a Project
            </ButtonLink>
            <ButtonLink to="/work" variant="outline">
              See our work
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
