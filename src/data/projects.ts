import type { AssetKey } from '../lib/assets';
import type { ProjectTypeValue } from './site';

export type FilterId = 'all' | 'games' | 'streaming' | 'healthcare' | 'fintech' | 'mobile' | 'hardware' | 'robotics';

export interface Filter {
  id: FilterId;
  label: string;
  icon?: AssetKey;
}

export const FILTERS: Filter[] = [
  { id: 'all', label: 'All Work' },
  { id: 'games', label: 'Games', icon: 'Shared-Icons/portfolio-filters/games' },
  { id: 'streaming', label: 'Streaming', icon: 'Shared-Icons/portfolio-filters/streaming' },
  { id: 'healthcare', label: 'Healthcare', icon: 'Shared-Icons/portfolio-filters/healthcare' },
  { id: 'fintech', label: 'Fintech', icon: 'Shared-Icons/portfolio-filters/fintech' },
  { id: 'mobile', label: 'Mobile', icon: 'Shared-Icons/portfolio-filters/mobile' },
  { id: 'hardware', label: 'Hardware', icon: 'Shared-Icons/portfolio-filters/hardware' },
  { id: 'robotics', label: 'Robotics', icon: 'Shared-Icons/portfolio-filters/robotics' },
];

/**
 * Art direction for a project's media frame.
 *
 * All coordinates are native pixels of the project-art file. The frame has a fixed aspect
 * (MEDIA_ASPECT). The art is scaled to cover the frame, multiplied by `zoom`, and positioned
 * so `focal` lands at `place` (fractions of the frame), clamped so the art always covers.
 * The isolated device (`object`) sits exactly over its baked counterpart and can be enlarged
 * by `objectScale` around `objectOrigin` (object pixels). Scaling a convex device about a point
 * inside or on its silhouette always covers the original, so no second copy shows.
 */
export interface MediaDirection {
  art: AssetKey;
  object: AssetKey;
  focal: [number, number];
  place?: [number, number];
  zoom?: number;
  /** Device is cut by the source card's lower edge: keep that edge on the frame's lower edge. */
  anchorBottom?: boolean;
  objectScale?: number;
  objectOrigin?: [number, number];
  /** Upper bound on the device's total scale relative to native pixels. */
  maxScale: number;
  alt: string;
}

/** Revised portfolio media frame: 371 × 248 at the 1199px reference (was 371 × 225 / 202). */
export const MEDIA_ASPECT = 371 / 248;

export interface Project {
  id: string;
  title: string;
  client?: string;
  /** Category chip text (upper-cased in the UI). */
  category: string;
  badgeIcon: AssetKey;
  /** One concise contribution statement. */
  summary: string;
  tags: string[];
  filters: FilterId[];
  /** Card edge colour. */
  accent: 'lime' | 'violet' | 'teal' | 'indigo' | 'blue';
  caseStudy?: string;
  inquiryType: ProjectTypeValue;
  media: MediaDirection;
}

export const PROJECTS: Project[] = [
  {
    id: 'casual-mobile-games',
    title: 'Casual Mobile Games',
    client: 'RAYMOBILEGAMES',
    category: 'Games',
    badgeIcon: 'Shared-Icons/portfolio-badges/casual-mobile-games',
    summary: 'A series of casual games for RAYMOBILEGAMES with ad integration and live operations.',
    tags: ['Unity', 'Mobile', 'Ads (AdMob)', 'LiveOps'],
    filters: ['games', 'mobile'],
    accent: 'lime',
    inquiryType: 'games',
    media: {
      art: '02-Our-Work/project-art/casual-mobile-games',
      object: '02-Our-Work/project-objects/ray-adventure-phone',
      focal: [236, 120],
      place: [0.56, 0.5],
      anchorBottom: true,
      objectScale: 1.1,
      objectOrigin: [140, 220],
      maxScale: 1.25,
      alt: 'Ray Adventure running on a smartphone: the game title and its young explorer hero fill the screen.',
    },
  },
  {
    id: 'tv-streaming',
    title: 'TV Streaming Platform',
    category: 'Streaming',
    badgeIcon: 'Shared-Icons/portfolio-badges/tv-streaming',
    summary: 'A full-featured streaming app for TV, mobile and web with a scalable content platform.',
    tags: ['React', 'Node.js', 'OTT', 'DRM'],
    filters: ['streaming', 'mobile'],
    accent: 'violet',
    caseStudy: '/work/streaming-platform',
    inquiryType: 'streaming',
    media: {
      art: '02-Our-Work/project-art/tv-streaming',
      object: '02-Our-Work/project-objects/streaming-tv',
      focal: [196, 118],
      place: [0.5, 0.5],
      anchorBottom: true,
      objectScale: 1.0,
      objectOrigin: [160, 220],
      maxScale: 1.15,
      alt: 'The VelloraTV app on a television: side menu, an astronaut feature banner and a row of title artwork.',
    },
  },
  {
    id: 'healthcare-web',
    title: 'Healthcare Web Platform',
    client: 'NEO HEALTH',
    category: 'Healthcare',
    badgeIcon: 'Shared-Icons/portfolio-badges/healthcare-web',
    summary: 'Key websites and digital platforms for NEO HEALTH, including patient, clinic and analytics systems.',
    tags: ['Next.js', 'Node.js', 'PostgreSQL', 'HIPAA-Ready'],
    filters: ['healthcare'],
    accent: 'teal',
    inquiryType: 'healthcare',
    media: {
      art: '02-Our-Work/project-art/healthcare-web',
      object: '02-Our-Work/project-objects/neo-health-laptop',
      focal: [196, 112],
      place: [0.5, 0.5],
      objectScale: 1.0,
      objectOrigin: [178, 140],
      maxScale: 1.15,
      alt: 'The Neo Health dashboard on a laptop: patient overview chart and a count of 1,248 active patients.',
    },
  },
  {
    id: 'fintech-dashboard',
    title: 'Fintech Dashboard',
    category: 'Fintech',
    badgeIcon: 'Shared-Icons/portfolio-badges/fintech-dashboard',
    summary: 'A secure and scalable fintech platform for digital payments, wallets and financial management.',
    tags: ['React', 'NestJS', 'AWS', 'Payment API'],
    filters: ['fintech', 'mobile'],
    accent: 'indigo',
    inquiryType: 'fintech',
    media: {
      art: '02-Our-Work/project-art/fintech-dashboard',
      object: '02-Our-Work/project-objects/banking-phone',
      focal: [242, 104],
      place: [0.58, 0.5],
      anchorBottom: true,
      objectScale: 1.0,
      objectOrigin: [126, 196],
      maxScale: 1.25,
      alt: 'A mobile wallet app showing a $4,860.50 balance, send and pay actions, and recent transactions.',
    },
  },
  {
    id: 'pcb-design',
    title: 'PCB Design & Prototyping',
    category: 'Hardware',
    badgeIcon: 'Shared-Icons/portfolio-badges/pcb-design',
    summary: 'Custom PCB design, schematic to prototype, for embedded and IoT applications.',
    tags: ['Altium', 'PCB Layout', 'Prototyping', 'IoT'],
    filters: ['hardware'],
    accent: 'lime',
    inquiryType: 'hardware',
    media: {
      art: '02-Our-Work/project-art/pcb-design',
      object: '02-Our-Work/project-objects/embedded-pcb',
      focal: [192, 110],
      place: [0.5, 0.5],
      objectScale: 1.0,
      objectOrigin: [175, 95],
      maxScale: 1.25,
      alt: 'A green embedded circuit board with copper traces, surface-mount chips and a Vellora-marked processor.',
    },
  },
  {
    id: 'robotics-automation',
    title: 'Robotics & Automation',
    category: 'Robotics',
    badgeIcon: 'Shared-Icons/portfolio-badges/robotics-automation',
    summary: 'Robotics systems for industrial and research use, including control, integration and UI.',
    tags: ['ROS', 'C++ / Python', 'Embedded', 'Control'],
    filters: ['robotics', 'hardware'],
    accent: 'blue',
    inquiryType: 'robotics',
    media: {
      art: '02-Our-Work/project-art/robotics-automation',
      object: '02-Our-Work/project-objects/industrial-robot-arm',
      focal: [224, 100],
      place: [0.55, 0.5],
      objectScale: 1.0,
      objectOrigin: [190, 187],
      maxScale: 1.25,
      alt: 'A white industrial robot arm with articulated joints, lowering its gripper over a holographic work surface.',
    },
  },
];

export const projectById = (id: string | null | undefined) => PROJECTS.find((p) => p.id === id);

export function isFilterId(v: string | null): v is FilterId {
  return !!v && FILTERS.some((f) => f.id === v);
}
