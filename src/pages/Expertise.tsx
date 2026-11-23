import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Plate, PlateMirror } from '../components/Plate';
import { ButtonLink, Eyebrow, Glyph, Img } from '../components/primitives';
import { FACTS } from '../data/site';
import { usePageTitle } from '../hooks/usePageTitle';
import { asset, type AssetKey } from '../lib/assets';
import './Expertise.css';

interface Capability {
  id: string;
  title: string[];
  desc: string[];
  illus: AssetKey;
  card: { x: number; y: number; w: number; h: number };
  /** Text block origin (left, first title cap-top) in source pixels. */
  text: { x: number; capTop: number; descCapTop: number };
  tone: 'cyan' | 'violet' | 'green' | 'blue';
  to: string;
  linkLabel: string;
  /** Connector: dot on the card edge → end point under the central V (source pixels). */
  link: { from: [number, number]; c1: [number, number]; c2: [number, number]; to: [number, number] };
}

// Card rectangles are the visible glass panels (card references inset by their glow).
const CAPS: Capability[] = [
  {
    id: 'full-stack', title: ['Full-Stack', 'Development'], desc: ['End-to-end web and cloud', 'solutions, from product design', 'to scalable deployment.'],
    illus: '04-Expertise/illustrations/full-stack-laptop', card: { x: 451, y: 137, w: 322, h: 136 }, text: { x: 588, capTop: 151, descCapTop: 206 },
    tone: 'cyan', to: '/work', linkLabel: 'See full-stack work',
    link: { from: [773, 222], c1: [815, 240], c2: [818, 300], to: [858, 372] },
  },
  {
    id: 'games', title: ['Casual Games'], desc: ['Design and development of', 'engaging, high-retention', 'casual games for mobile.'],
    illus: '04-Expertise/illustrations/games-controller', card: { x: 803, y: 109, w: 286, h: 108 }, text: { x: 920, capTop: 123, descCapTop: 153 },
    tone: 'violet', to: '/work?filter=games', linkLabel: 'See games work',
    link: { from: [945, 225], c1: [945, 260], c2: [945, 300], to: [945, 345] },
  },
  {
    id: 'advertising', title: ['Advertising', 'Integration'], desc: ['Seamless ad integration', '(AdMob, Unity Ads, etc.) with', 'optimization for higher revenue.'],
    illus: '04-Expertise/illustrations/advertising-dashboard', card: { x: 1120, y: 137, w: 354, h: 131 }, text: { x: 1287, capTop: 149, descCapTop: 206 },
    tone: 'violet', to: '/work?filter=games', linkLabel: 'See ad-integrated games',
    link: { from: [1135, 268], c1: [1090, 282], c2: [1060, 320], to: [1036, 372] },
  },
  {
    id: 'mobile-apps', title: ['Mobile Apps'], desc: ['High-quality Android and iOS', 'apps with great UX, performance', 'and long-term maintainability.'],
    illus: '04-Expertise/illustrations/mobile-app-phones', card: { x: 386, y: 307, w: 340, h: 110 }, text: { x: 538, capTop: 321, descCapTop: 352 },
    tone: 'cyan', to: '/work?filter=mobile', linkLabel: 'See mobile work',
    link: { from: [736, 362], c1: [790, 362], c2: [810, 420], to: [858, 470] },
  },
  {
    id: 'tv-streaming', title: ['TV Streaming Apps'], desc: ['OTT and live streaming', 'platforms for TV, web', 'and mobile devices.'],
    illus: '04-Expertise/illustrations/streaming-television', card: { x: 1191, y: 292, w: 411, h: 103 }, text: { x: 1356, capTop: 307, descCapTop: 336 },
    tone: 'blue', to: '/work/streaming-platform', linkLabel: 'Read the streaming case study',
    link: { from: [1181, 341], c1: [1120, 345], c2: [1090, 400], to: [1040, 445] },
  },
  {
    id: 'healthcare', title: ['Healthcare'], desc: ['Digital health platforms,', 'patient apps, and care', 'management solutions.'],
    illus: '04-Expertise/illustrations/healthcare-clipboard', card: { x: 349, y: 443, w: 334, h: 107 }, text: { x: 516, capTop: 459, descCapTop: 488 },
    tone: 'green', to: '/work?filter=healthcare', linkLabel: 'See healthcare work',
    link: { from: [692, 490], c1: [740, 490], c2: [770, 520], to: [818, 560] },
  },
  {
    id: 'fitness', title: ['Fitness'], desc: ['Fitness and wellness apps', 'with tracking, coaching and', 'personalized experiences.'],
    illus: '04-Expertise/illustrations/fitness-watch', card: { x: 1217, y: 411, w: 406, h: 97 }, text: { x: 1397, capTop: 421, descCapTop: 451 },
    tone: 'violet', to: '/contact?type=fitness', linkLabel: 'Discuss a fitness project',
    link: { from: [1209, 458], c1: [1150, 460], c2: [1110, 490], to: [1070, 520] },
  },
  {
    id: 'pcb', title: ['PCB Design'], desc: ['Custom hardware and PCB', 'layout design, from concept', 'to production-ready files.'],
    illus: '04-Expertise/illustrations/pcb-board', card: { x: 318, y: 572, w: 390, h: 115 }, text: { x: 524, capTop: 589, descCapTop: 621 },
    tone: 'green', to: '/work?filter=hardware', linkLabel: 'See hardware work',
    link: { from: [716, 625], c1: [760, 625], c2: [775, 600], to: [812, 588] },
  },
  {
    id: 'fintech', title: ['Fintech'], desc: ['Secure and reliable financial', 'platforms, including payments,', 'wallets and digital banking.'],
    illus: '04-Expertise/illustrations/fintech-card-and-coins', card: { x: 1185, y: 524, w: 424, h: 98 }, text: { x: 1385, capTop: 534, descCapTop: 565 },
    tone: 'cyan', to: '/work?filter=fintech', linkLabel: 'See fintech work',
    link: { from: [1177, 572], c1: [1140, 572], c2: [1120, 580], to: [1080, 590] },
  },
  {
    id: 'cad', title: ['AutoCAD'], desc: ['Accurate 2D/3D drafting, technical', 'drawings and production documentation', 'for various industries.'],
    illus: '04-Expertise/illustrations/cad-monitor', card: { x: 750, y: 679, w: 389, h: 113 }, text: { x: 912, capTop: 694, descCapTop: 723 },
    tone: 'blue', to: '/contact?type=cad', linkLabel: 'Discuss a drafting project',
    link: { from: [948, 670], c1: [948, 660], c2: [948, 650], to: [948, 636] },
  },
  {
    id: 'robotics', title: ['Robotics'], desc: ['Software, control systems', 'and integration for robotics', 'and automation projects.'],
    illus: '04-Expertise/illustrations/robotics-arm', card: { x: 1183, y: 641, w: 403, h: 112 }, text: { x: 1371, capTop: 652, descCapTop: 684 },
    tone: 'green', to: '/work?filter=robotics', linkLabel: 'See robotics work',
    link: { from: [1174, 687], c1: [1130, 680], c2: [1110, 640], to: [1068, 606] },
  },
];

const STATS: { icon: AssetKey; value: string; label: string; cls: string }[] = [
  { icon: 'Shared-Icons/expertise/domains', value: FACTS.industries.value, label: 'Industries Served', cls: 'ind' },
  { icon: 'Shared-Icons/expertise/code', value: FACTS.years.value, label: 'Years of Experience', cls: 'years' },
  { icon: 'Shared-Icons/expertise/team', value: FACTS.team.value, label: 'Experienced Team', cls: 'team' },
  { icon: 'Shared-Icons/expertise/end-to-end', value: FACTS.endToEnd.value, label: 'From Concept to Launch', cls: 'e2e' },
];


export function ExpertisePage() {
  usePageTitle('Expertise');
  const core = asset('04-Expertise/artwork/central-v-and-platform');
  const coreV = asset('04-Expertise/artwork/central-v');
  // One connection at a time: the capability under the pointer or holding focus lights its path to
  // the central V; the others step back so the eye can follow it across the composition.
  const [active, setActive] = useState<string | null>(null);
  const path = (c: Capability) => `M${c.link.from.join(' ')} C${c.link.c1.join(' ')} ${c.link.c2.join(' ')} ${c.link.to.join(' ')}`;

  return (
    <div className="page page--expertise">
      <section className="exp" aria-labelledby="exp-title">
        <Plate k="04-Expertise/backgrounds/earth-and-dotted-waves" priority focus="10% 70%" />
        <div className="exp__below decor" aria-hidden="true">
          <PlateMirror k="04-Expertise/backgrounds/earth-and-dotted-waves" />
        </div>

        <div className="exp__intro">
          <Eyebrow flash="expertise" className="exp__eyebrow">
            Our Expertise
          </Eyebrow>
          <h1 id="exp-title" className="exp__title">
            <span className="exp__title-l1">
              Broad Expertise<span className="exp__dot exp__dot--cyan">.</span>
            </span>{' '}
            <span className="exp__title-l2">
              <span className="t-lime t-italic">Real-World</span> Impact<span className="exp__dot exp__dot--violet">.</span>
            </span>
          </h1>
          <p className="exp__lead">
            A multi-disciplinary team with proven <br className="br-desktop" />
            experience across software, mobile, <br className="br-desktop" />
            games, media, healthcare, fintech, <br className="br-desktop" />
            hardware and robotics.
          </p>
          <ButtonLink to="/work" variant="ghost" className="exp__cta">
            See Our Work
          </ButtonLink>
        </div>

        <div className="exp__diagram" data-active={active ?? undefined}>
          <svg className="exp__links decor" viewBox="0 0 1672 941" aria-hidden="true" preserveAspectRatio="none">
            <defs>
              <linearGradient id="exp-link-l" x1="0" x2="1">
                <stop offset="0" stopColor="#38e0ff" />
                <stop offset="1" stopColor="#5d7bff" />
              </linearGradient>
              <linearGradient id="exp-link-r" x1="1" x2="0">
                <stop offset="0" stopColor="#3ad1ff" />
                <stop offset="1" stopColor="#7b62ff" />
              </linearGradient>
              <filter id="exp-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g filter="url(#exp-glow)" fill="none" strokeWidth="1.6" strokeLinecap="round">
              {CAPS.map((c) => (
                <path
                  key={c.id}
                  className={`exp__path exp__path--${c.tone}${active === c.id ? ' is-active' : ''}`}
                  stroke={c.link.from[0] < 945 ? 'url(#exp-link-l)' : 'url(#exp-link-r)'}
                  d={path(c)}
                />
              ))}
            </g>
            {/* The lit connection: a bright line, one pulse from the card to the V, and a point of
                light where it meets the platform. Re-keyed so each activation replays once. */}
            {CAPS.filter((c) => c.id === active).map((c) => (
              <g key={c.id} className={`exp__lit exp__lit--${c.tone}`}>
                <path className="exp__lit-glow" d={path(c)} pathLength={100} filter="url(#exp-glow)" />
                <path className="exp__lit-line" d={path(c)} pathLength={100} />
                <path className="exp__lit-pulse" d={path(c)} pathLength={100} />
                <circle className="exp__lit-end" cx={c.link.to[0]} cy={c.link.to[1]} r="5" />
              </g>
            ))}
            <g>
              {CAPS.map((c) => (
                <circle
                  key={c.id}
                  className={`exp__node exp__node--${c.tone}${active === c.id ? ' is-active' : ''}`}
                  cx={c.link.from[0]}
                  cy={c.link.from[1]}
                  r="4.2"
                />
              ))}
            </g>
          </svg>

          {/* Exact crop (platform, light rings, wordmark) feathered into the backdrop at its outer
              edge only, with the clean V cutout on top so the arms stay at full strength. */}
          <div className="exp__core decor" aria-hidden="true">
            <img className="exp__core-crop" src={core.src} width={core.w} height={core.h} alt="" decoding="async" />
            <img className="exp__core-v" src={coreV.src} width={coreV.w} height={coreV.h} alt="" decoding="async" />
          </div>

          <ul className="exp__cards" role="list">
            {CAPS.map((c) => {
              const il = asset(c.illus);
              return (
                <li
                  key={c.id}
                  className={`ecard ecard--${c.tone} ecard--${c.id}${active === c.id ? ' is-active' : ''}`}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(c.id)}
                  onPointerLeave={(e) => e.pointerType === 'mouse' && setActive((a) => (a === c.id ? null : a))}
                  onFocus={() => setActive(c.id)}
                  onBlur={() => setActive((a) => (a === c.id ? null : a))}
                  style={
                    {
                      '--x': c.card.x,
                      '--y': c.card.y,
                      '--w': c.card.w,
                      '--h': c.card.h,
                    } as CSSProperties
                  }
                >
                  <Img
                    k={c.illus}
                    alt=""
                    className="ecard__illus"
                    style={{ '--il': il.x - c.card.x, '--it': il.y - c.card.y, '--iw': il.w } as CSSProperties}
                  />
                  <div
                    className="ecard__text"
                    style={
                      {
                        '--tx': c.text.x - c.card.x,
                        '--ty': c.text.capTop - c.card.y,
                        '--dy': c.text.descCapTop - c.text.capTop,
                        '--tl': c.title.length,
                      } as CSSProperties
                    }
                  >
                    <h2 className="ecard__title">
                      {c.title.map((t, i) => (
                        <span key={t}>
                          {i > 0 && ' '}
                          {i > 0 && <br />}
                          {t}
                        </span>
                      ))}
                    </h2>
                    <p className="ecard__desc">
                      {c.desc.map((t, i) => (
                        <span key={t}>
                          {i > 0 && <br className="br-desktop" />}
                          {i > 0 && ' '}
                          {t}
                        </span>
                      ))}
                    </p>
                  </div>
                  <Link to={c.to} className="ecard__go" aria-label={`${c.linkLabel}: ${c.title.join(' ')}`}>
                    <Glyph k="Shared-Icons/case-study/project-card-arrow" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <ul className="exp__stats" role="list" aria-label="Vellora at a glance">
          {STATS.map((s) => (
            <li key={s.cls} className={`stat exp-stat exp-stat--${s.cls}`}>
              <Glyph k={s.icon} className="stat__icon exp-stat__icon" />
              <span>
                <span className="stat__value exp-stat__value">{s.value}</span>
                <span className="stat__label exp-stat__label">{s.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
