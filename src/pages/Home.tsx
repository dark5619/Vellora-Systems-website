import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { HomeHeroArt } from '../hero/HomeHeroArt';
import { ArrowGlyph, ButtonLink, Eyebrow, Glyph, Img } from '../components/primitives';
import { RibbonEdge } from '../components/RibbonEdge';
import { FACTS, HOME_HEADLINE_EMPHASIS, HOME_HEADLINE_LINE_1, PARTNERS } from '../data/site';
import type { AssetKey } from '../lib/assets';
import { usePageTitle } from '../hooks/usePageTitle';
import './Home.css';

interface Discipline {
  id: string;
  title: [string, string];
  desc: [string, string];
  icon: AssetKey;
  art: AssetKey;
  object?: AssetKey;
  filter: string;
  label: string;
}

const DISCIPLINES: Discipline[] = [
  {
    id: 'games',
    title: ['Games', 'Development'],
    desc: ['Casual games, monetization', 'and live operations.'],
    icon: 'Shared-Icons/home/games',
    art: '01-Home/card-art/games',
    object: '01-Home/card-objects/games-character',
    filter: 'games',
    label: 'games',
  },
  {
    id: 'streaming',
    title: ['Streaming', '& OTT'],
    desc: ['TV streaming apps', 'and multi-device platforms.'],
    icon: 'Shared-Icons/home/streaming',
    art: '01-Home/card-art/streaming',
    filter: 'streaming',
    label: 'streaming',
  },
  {
    id: 'healthcare',
    title: ['Healthcare', 'Solutions'],
    desc: ['Patient platforms,', 'care systems and analytics.'],
    icon: 'Shared-Icons/home/healthcare',
    art: '01-Home/card-art/healthcare',
    filter: 'healthcare',
    label: 'healthcare',
  },
  {
    id: 'fintech',
    title: ['Fintech', 'Platforms'],
    desc: ['Secure, scalable and', 'user-friendly financial products.'],
    icon: 'Shared-Icons/home/fintech',
    art: '01-Home/card-art/fintech',
    filter: 'fintech',
    label: 'fintech',
  },
  {
    id: 'hardware',
    title: ['Hardware &', 'Robotics'],
    desc: ['PCB design, embedded', 'systems and robotics solutions.'],
    icon: 'Shared-Icons/home/hardware',
    art: '01-Home/card-art/hardware-robotics',
    object: '01-Home/card-objects/robot-arm',
    filter: 'hardware',
    label: 'hardware and robotics',
  },
];

const STATS: { icon: AssetKey; value: string; label: string; cls: string }[] = [
  { icon: 'Shared-Icons/home/team-layers', value: FACTS.team.value, label: FACTS.team.label, cls: 'team' },
  { icon: 'Shared-Icons/home/projects-layers', value: FACTS.endToEnd.value, label: 'Concept to Launch', cls: 'e2e' },
  { icon: 'Shared-Icons/home/industries-trophy', value: FACTS.industries.value, label: FACTS.industries.label, cls: 'ind' },
];

export function HomePage() {
  usePageTitle('');
  const heroRef = useRef<HTMLElement>(null);

  return (
    <div className="page page--home">
      <section ref={heroRef} className="home-hero" aria-labelledby="home-title">
        <HomeHeroArt pointerTarget={heroRef} />
        <div className="home-hero__content">
          <Eyebrow flash="home" className="home-hero__eyebrow">
            Software <span className="sep">/</span> Games <span className="sep">/</span> Hardware{' '}
            <span className="sep">/</span> Robotics
          </Eyebrow>
          <h1 id="home-title" className="home-hero__title">
            {HOME_HEADLINE_LINE_1}{' '}
            <br />
            moves <span className="t-cyan-lime home-hero__ideas">{HOME_HEADLINE_EMPHASIS.a}</span>{' '}
            <span className="t-lime">{HOME_HEADLINE_EMPHASIS.b}</span>
          </h1>
          <p className="home-hero__lead">
            Vellora Systems is a multi-disciplinary IT company that <br className="br-desktop" />
            designs, engineers and delivers real products across industries — <br className="br-desktop" />
            from mobile games and streaming platforms to healthcare, fintech, <br className="br-desktop" />
            hardware and robotics.
          </p>
          <div className="home-hero__actions">
            <ButtonLink to="/work" variant="primary" icon="Shared-Icons/home/explore-play" className="home-hero__primary">
              Explore our work
            </ButtonLink>
            <Link to="/studio" className="btn-circle home-hero__secondary">
              <span className="btn-circle__ring" aria-hidden="true">
                <ArrowGlyph className="home-hero__ring-arrow" />
              </span>
              <span className="btn-circle__text">Meet the studio</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="home-services" aria-labelledby="services-title">
        {/* The design's own band between hero and divider (cards filled from their surroundings):
            the hero's ribbons and floor light carry on behind the cards. */}
        <Img k="01-Home/derived/services-band" alt="" className="home-services__band decor" sizes="100vw" />
        <h2 id="services-title" className="visually-hidden">
          What we build
        </h2>
        <ul className="home-services__grid" role="list">
          {DISCIPLINES.map((d) => (
            <li key={d.id} className={`dcard-item dcard-item--${d.id}`}>
              <Link to={`/work?filter=${d.filter}`} className={`dcard dcard--${d.id}`}>
                <span className="dcard__media decor" aria-hidden="true">
                  <Img k={d.art} alt="" className="dcard__art" />
                  {d.object && <Img k={d.object} alt="" className="dcard__object" style={objectStyle(d)} />}
                </span>
                <span className="dcard__text">
                  <Glyph k={d.icon} className="dcard__icon" />
                  <h3 className="dcard__title">
                    {d.title[0]}{' '}
                    <br />
                    {d.title[1]}
                  </h3>
                  <p className="dcard__desc">
                    {d.desc[0]} <br className="dcard__br" />
                    {d.desc[1]}
                  </p>
                  <span className="visually-hidden">View {d.label} work</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <RibbonEdge
        base="01-Home/motion-ribbons/services-divider/01-base"
        strip="01-Home/motion-ribbons/services-divider/02-ribbon"
        className="home-divider"
      />

      <section className="home-proof" aria-label="Clients and company facts">
        <div className="home-proof__partners">
          <p className="home-proof__kicker">Trusted by</p>
          <ul className="home-proof__logos" role="list">
            {PARTNERS.map((p) => (
              <li key={p.name}>
                <Img k={p.logo} alt={p.name} className={`home-proof__logo home-proof__logo--${p.name === 'NEO HEALTH' ? 'neo' : 'ray'}`} />
              </li>
            ))}
          </ul>
          <p className="home-proof__more">And other global partners</p>
        </div>
        <ul className="home-proof__stats" role="list">
          {STATS.map((s) => (
            <li key={s.cls} className={`stat home-stat home-stat--${s.cls}`}>
              <Glyph k={s.icon} className="stat__icon home-stat__icon" />
              <span>
                <span className="stat__value home-stat__value">{s.value}</span>
                <span className="stat__label home-stat__label">{s.label}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="home-proof__cta">
          <ButtonLink to="/contact" variant="primary">
            Start a Project
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

/** Place a card's isolated object exactly over its art (both from the same source design). */
function objectStyle(d: Discipline) {
  if (!d.object) return undefined;
  const pos: Record<string, { left: string; top: string; width: string }> = {
    games: pct(222 - 64, 582 - 585, 147, 303, 163),
    hardware: pct(1474 - 1323, 592 - 584, 156, 308, 161),
  };
  return pos[d.id];
}
function pct(dx: number, dy: number, w: number, pw: number, ph: number) {
  return { left: `${(dx / pw) * 100}%`, top: `${(dy / ph) * 100}%`, width: `${(w / pw) * 100}%` };
}
