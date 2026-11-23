import { Plate } from '../components/Plate';
import { RibbonEdge } from '../components/RibbonEdge';
import { ButtonLink, Eyebrow, Glyph, Img, JumpLink } from '../components/primitives';
import { FACTS } from '../data/site';
import { usePageTitle } from '../hooks/usePageTitle';
import type { AssetKey } from '../lib/assets';
import './Studio.css';

interface Member {
  id: string;
  name: string;
  role: string;
  bio: string[];
  portrait: AssetKey;
  featured?: boolean;
}

// Names, roles and bios as supplied. No profile URLs were provided, so no profile links are shown.
const TEAM: Member[] = [
  {
    id: 'eryk-dobek',
    name: 'Eryk Dobek',
    role: 'CEO & Founder',
    bio: ['Leads Vellora’s vision, partnerships and', 'delivery, with a focus on building products', 'that create real value across industries.'],
    portrait: '05-Studio/portraits/eryk-dobek',
    featured: true,
  },
  {
    id: 'lara-mercado',
    name: 'Lara Mercado',
    role: 'COO',
    bio: ['Keeps our projects, people', 'and operations running', 'smoothly from idea to', 'launch.'],
    portrait: '05-Studio/portraits/lara-mercado',
  },
  {
    id: 'marco-villanueva',
    name: 'Marco Villanueva',
    role: 'CTO',
    bio: ['Drives our technical strategy', 'and architecture, turning', 'complex ideas into stable,', 'scalable products.'],
    portrait: '05-Studio/portraits/marco-villanueva',
  },
  {
    id: 'iris-santos',
    name: 'Iris Santos',
    role: 'Head of Design',
    bio: ['Shapes product experiences', 'that are intuitive, modern', 'and genuinely enjoyable', 'to use.'],
    portrait: '05-Studio/portraits/iris-santos',
  },
  {
    id: 'kenji-ramos',
    name: 'Kenji Ramos',
    role: 'Head of Engineering',
    bio: ['Leads our development', 'teams, ensuring high-quality', 'delivery and a great', 'engineering culture.'],
    portrait: '05-Studio/portraits/kenji-ramos',
  },
];

const STATS: { icon: AssetKey; value: string; label: string; cls: string }[] = [
  { icon: 'Shared-Icons/studio/team', value: FACTS.team.value, label: FACTS.team.label, cls: 'team' },
  { icon: 'Shared-Icons/studio/projects', value: FACTS.endToEnd.value, label: 'Concept to Launch', cls: 'e2e' },
  { icon: 'Shared-Icons/studio/industries', value: FACTS.industries.value, label: FACTS.industries.label, cls: 'ind' },
  { icon: 'Shared-Icons/studio/client-shield', value: FACTS.clientFocus.value, label: FACTS.clientFocus.label, cls: 'focus' },
];

const VALUES: { icon: AssetKey; title: string; desc: [string, string]; cls: string }[] = [
  { icon: 'Shared-Icons/studio/create-bolt', title: 'Build & Create', desc: ['Turn ideas into', 'real products.'], cls: 'build' },
  { icon: 'Shared-Icons/studio/collaborate', title: 'Work Together', desc: ['A supportive and', 'open team culture.'], cls: 'together' },
  { icon: 'Shared-Icons/studio/growth', title: 'Keep Growing', desc: ['Learn, explore', 'and level up.'], cls: 'growing' },
  { icon: 'Shared-Icons/studio/impact-heart', title: 'Make an Impact', desc: ['Deliver technology', 'that truly helps people.'], cls: 'impact' },
];

export function StudioPage() {
  usePageTitle('Studio & Team');

  return (
    <div className="page page--studio">
      <section className="st-hero" aria-labelledby="st-title">
        <Plate k="05-Studio/backgrounds/studio-hero" priority focus="72% 40%" />
        <RibbonEdge
          base="05-Studio/motion-ribbons/studio-hero-wave/01-base-clean"
          strip="05-Studio/motion-ribbons/studio-hero-wave/02-ribbon"
          className="st-hero__ribbon"
        />
        <div className="col st-hero__inner">
          <Eyebrow flash="studio" className="st-eyebrow">
            Our Studio
          </Eyebrow>
          <h1 id="st-title" className="st-title">
            People behind <br />
            the <span className="t-lime t-italic">signal.</span>
          </h1>
          <p className="st-lead">
            A close-knit team of 15 engineers, designers and <br className="br-desktop" />
            creators who turn ambitious ideas into reliable, <br className="br-desktop" />
            real-world products across industries.
          </p>
          <div className="st-actions">
            <JumpLink target="team" className="btn btn--primary st-actions__primary">
              <span>Meet the team</span>
              <Glyph k="Shared-Icons/home/explore-arrow" className="btn__arrow" />
            </JumpLink>
            <JumpLink target="culture" className="btn-circle st-actions__secondary">
              <span className="btn-circle__ring" aria-hidden="true">
                <Glyph k="Shared-Icons/case-study/footer-link-arrow" className="st-actions__down" />
              </span>
              <span className="btn-circle__text">See our culture</span>
            </JumpLink>
          </div>
          <ul className="st-stats glass" role="list" aria-label="Studio at a glance">
            {STATS.map((s) => (
              <li key={s.cls} className={`stat st-stat st-stat--${s.cls}`}>
                <Glyph k={s.icon} className="stat__icon st-stat__icon" />
                <span>
                  <span className="stat__value st-stat__value">{s.value}</span>
                  <span className="stat__label st-stat__label">{s.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="team" className="col st-team" aria-labelledby="st-team-title" tabIndex={-1}>
        <h2 id="st-team-title" className="st-kicker">
          <Glyph k="Shared-Icons/studio/section-flash" className="st-kicker__flash" />
          Key Members
        </h2>
        <ul className="st-team__grid" role="list">
          {TEAM.map((m) => (
            <li key={m.id} className={`member ${m.featured ? 'member--featured' : ''}`}>
              <article className="member__card" aria-labelledby={`${m.id}-name`}>
                <div className="member__photo">
                  <Img k={m.portrait} alt={`Portrait of ${m.name}`} />
                </div>
                <div className="member__body">
                  <h3 id={`${m.id}-name`} className="member__name">
                    {m.name}
                  </h3>
                  <p className="member__role">{m.role}</p>
                  <p className="member__bio">
                    {m.bio.map((t, i) => (
                      <span key={t}>
                        {i > 0 && <br className="br-desktop" />}
                        {i > 0 && ' '}
                        {t}
                      </span>
                    ))}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section id="culture" className="col st-culture" aria-labelledby="st-culture-title" tabIndex={-1}>
        <figure className="st-culture__photo">
          <Img
            k="05-Studio/artwork/studio-culture-team"
            alt="Four Vellora team members gathered around a laptop, smiling as they review work together in the studio."
          />
        </figure>
        <div className="st-culture__text">
          <p className="st-culture__kicker">
            <Glyph k="Shared-Icons/studio/culture-section-marker" className="st-culture__marker" />
            Our Culture
          </p>
          <h2 id="st-culture-title" className="st-culture__title">
            A creative, <span className="t-lime t-italic">collaborative</span> studio.
          </h2>
          <p className="st-culture__lead">
            We believe great products come from a team that enjoys the process — <br className="br-desktop" />
            sharing ideas, solving tough problems together, and constantly learning.
          </p>
          <ul className="st-values" role="list">
            {VALUES.map((v) => (
              <li key={v.cls} className={`st-value st-value--${v.cls}`}>
                <Glyph k={v.icon} className="st-value__icon" />
                <h3 className="st-value__title">{v.title}</h3>
                <p className="st-value__desc">
                  {v.desc[0]} <br className="br-desktop" />
                  {v.desc[1]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="st-join" aria-labelledby="st-join-title">
        <Plate k="05-Studio/backgrounds/join-the-studio" focus="88% 50%" />
        <div className="col st-join__inner">
          <h2 id="st-join-title" className="st-join__title">
            Join the <span className="t-lime">Vellora</span> journey.
          </h2>
          <p className="st-join__lead">
            Work with a team that loves building, exploring and <br className="br-desktop" />
            bringing ideas to life across industries.
          </p>
          <ButtonLink to="/contact" variant="outline" className="st-join__btn">
            Let’s build together
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
