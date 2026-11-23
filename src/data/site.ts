import type { AssetKey } from '../lib/assets';

export const SITE_NAME = 'Vellora Systems';

/**
 * Home headline. The supplied Home design reads "Technology that moves ideas forward."
 * (the implementation brief quotes it as "…moves us forward."). The design copy is used here;
 * change these two constants to switch.
 */
export const HOME_HEADLINE_LINE_1 = 'Technology that';
export const HOME_HEADLINE_EMPHASIS = { a: 'ideas', b: 'forward.' } as const;

export interface NavItem {
  to: string;
  label: string;
  /** Longer label used where the header has room (≥1500px), as in the Home design. */
  long?: { before?: string; after?: string };
  /** Extra path prefixes that mark this item active. */
  match?: string[];
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/work', label: 'Work', long: { before: 'Our ' }, match: ['/work'] },
  { to: '/expertise', label: 'Expertise' },
  { to: '/studio', label: 'Studio', long: { after: ' & Team' } },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

/**
 * Case-study pages follow their own design's header: a "Case Studies" item (active) between
 * Work and Expertise. The phone menu keeps Contact as well.
 */
export const CASE_STUDY_PATH = '/work/streaming-platform';
export const NAV_CASE: NavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/work', label: 'Work' },
  { to: CASE_STUDY_PATH, label: 'Case Studies', match: ['/work/'] },
  { to: '/expertise', label: 'Expertise' },
  { to: '/studio', label: 'Studio' },
  { to: '/about', label: 'About' },
];

/** Approved contact details, as printed in the Contact design. */
export const CONTACT = {
  email: 'hello@vellorasystems.com',
  slack: 'vellora-systems.slack.com',
  location: 'Global Remote Team',
  response: 'Within 1 business day',
} as const;

/**
 * Company facts used across pages.
 *
 * The designs disagree on two figures: "Projects Delivered" (50+ on Home, Work, Studio;
 * 100+ on Expertise and About) and industries (8+ on Home and Studio; 10+ on Work and
 * Expertise). No approved source resolves the projects figure, so it is omitted. Eight
 * industries are named on About, so 8+ is used. The team size is 15 in the Studio and About
 * body copy, so the Home "15+" is normalised to 15.
 */
export const FACTS = {
  team: { value: '15', label: 'Team Members' },
  industries: { value: '8+', label: 'Industries Served' },
  years: { value: '8+', label: 'Years of Experience' },
  endToEnd: { value: 'End-to-End', label: 'From Concept to Launch' },
  clientFocus: { value: '100%', label: 'Client Focused' },
} as const;

export interface Partner {
  name: string;
  logo: AssetKey;
}

export const PARTNERS: Partner[] = [
  { name: 'RAYMOBILEGAMES', logo: 'Shared-Brand/partners/raymobilegames' },
  { name: 'NEO HEALTH', logo: 'Shared-Brand/partners/neo-health' },
];

export const PROJECT_TYPES = [
  { value: 'games', label: 'Games development' },
  { value: 'streaming', label: 'Streaming & OTT' },
  { value: 'healthcare', label: 'Healthcare platform' },
  { value: 'fintech', label: 'Fintech platform' },
  { value: 'web-mobile', label: 'Web & mobile app' },
  { value: 'fitness', label: 'Fitness & wellness app' },
  { value: 'advertising', label: 'Advertising integration' },
  { value: 'hardware', label: 'Hardware & PCB design' },
  { value: 'robotics', label: 'Robotics & automation' },
  { value: 'cad', label: 'AutoCAD drafting' },
  { value: 'other', label: 'Something else' },
] as const;

/** Placeholder ranges — confirm with Vellora before launch. */
export const BUDGETS = [
  { value: 'under-25k', label: 'Under $25k' },
  { value: '25-50k', label: '$25k – $50k' },
  { value: '50-100k', label: '$50k – $100k' },
  { value: '100k-plus', label: '$100k+' },
  { value: 'not-sure', label: 'Not sure yet' },
] as const;

export type ProjectTypeValue = (typeof PROJECT_TYPES)[number]['value'];
