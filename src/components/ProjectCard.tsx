import { forwardRef, useMemo, type CSSProperties, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { MEDIA_ASPECT, type Project } from '../data/projects';
import { layoutMedia } from '../lib/artDirection';
import { asset, avifSet } from '../lib/assets';
import { ArrowGlyph, Glyph } from './primitives';

export function ProjectMedia({
  project,
  aspect = MEDIA_ASPECT,
  className = '',
  eager = false,
  decorative = false,
}: {
  project: Project;
  aspect?: number;
  className?: string;
  eager?: boolean;
  decorative?: boolean;
}) {
  const layout = useMemo(() => layoutMedia(project.media, aspect), [project, aspect]);
  const art = asset(project.media.art);
  const obj = asset(project.media.object);
  const loading = eager ? 'eager' : 'lazy';
  // Desktop cards are about a third of the viewport; the dialog and phones draw them wider.
  // The hint favours the 2× derivative wherever the frame is larger than the 1× crop.
  const sizes = '(min-width: 1024px) 36vw, (min-width: 640px) 50vw, 100vw';
  const artAvif = avifSet(project.media.art);
  const objAvif = avifSet(project.media.object);
  return (
    <div className={`pmedia ${className}`} style={{ aspectRatio: String(aspect) }}>
      <div className="pmedia__stage" style={layout.stage}>
        <picture>
          {artAvif && <source type="image/avif" srcSet={artAvif} sizes={sizes} />}
          <img className="pmedia__art" src={art.src} width={art.w} height={art.h} alt="" loading={loading} decoding="async" draggable={false} />
        </picture>
        <picture>
          {objAvif && <source type="image/avif" srcSet={objAvif} sizes={sizes} />}
          <img
            className="pmedia__object"
            src={obj.src}
            width={obj.w}
            height={obj.h}
            alt={decorative ? '' : project.media.alt}
            loading={loading}
            decoding="async"
            draggable={false}
            style={
              {
                left: layout.object.left,
                top: layout.object.top,
                width: layout.object.width,
                '--k': layout.object.scale,
                '--ox': layout.object.ox,
                '--oy': layout.object.oy,
                '--dx': layout.object.dx,
                '--dy': layout.object.dy,
                '--h-hover': layout.object.hover,
              } as CSSProperties
            }
          />
        </picture>
      </div>
    </div>
  );
}

interface CardProps {
  project: Project;
  headingLevel?: 'h2' | 'h3';
  onPreview: (project: Project, opener: HTMLElement) => void;
  onCaseStudy?: (project: Project) => void;
  eager?: boolean;
}

export const ProjectCard = forwardRef<HTMLElement, CardProps>(function ProjectCard(
  { project, headingLevel: H = 'h2', onPreview, onCaseStudy, eager },
  ref,
) {
  const titleId = `project-${project.id}-title`;
  const open = (e: MouseEvent<HTMLButtonElement>) => onPreview(project, e.currentTarget);
  return (
    <article ref={ref} className="pcard" data-accent={project.accent} aria-labelledby={titleId} data-project={project.id}>
      <div className="pcard__top">
        <ProjectMedia project={project} eager={eager} />
        <span className="pbadge">
          <Glyph k={project.badgeIcon} />
          {project.category}
        </span>
      </div>
      <div className="pcard__body">
        <H id={titleId} className="pcard__title">
          {project.title}
        </H>
        <p className="pcard__summary">{project.summary}</p>
        <ul className="pcard__tags" role="list" aria-label="Technologies">
          {project.tags.map((t) => (
            <li key={t} className="tag">
              {t}
            </li>
          ))}
        </ul>
        <div className="pcard__actions">
          {project.caseStudy ? (
            <Link
              to={project.caseStudy}
              className="btn btn--outline pcard__cta"
              data-focus-key={project.id}
              aria-describedby={titleId}
              onClick={() => onCaseStudy?.(project)}
            >
              <span>View Case Study</span>
              <ArrowGlyph />
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn--outline pcard__cta"
              data-focus-key={project.id}
              aria-haspopup="dialog"
              aria-describedby={titleId}
              onClick={open}
            >
              <span>View Details</span>
              <ArrowGlyph />
            </button>
          )}
        </div>
      </div>
    </article>
  );
});
