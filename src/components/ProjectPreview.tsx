import { useEffect, useRef } from 'react';
import type { Project } from '../data/projects';
import { PARTNERS } from '../data/site';
import { asset } from '../lib/assets';
import { ProjectMedia } from './ProjectCard';
import { ButtonLink, Glyph } from './primitives';

/**
 * Accessible enlarged preview for projects that only have summary material.
 * Native <dialog> provides the focus trap, Escape handling and inert background.
 * The device is shown at up to ~1.35× native in a taller frame — the limit of the
 * supplied resolution — rather than upscaled further.
 */
export function ProjectPreview({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (project && !d.open) d.showModal();
    if (!project && d.open) d.close();
  }, [project]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const handleClose = () => onClose();
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close(); // backdrop click
    };
    d.addEventListener('close', handleClose);
    d.addEventListener('click', onClick);
    return () => {
      d.removeEventListener('close', handleClose);
      d.removeEventListener('click', onClick);
    };
  }, [onClose]);

  const partner = project?.client ? PARTNERS.find((p) => p.name === project.client) : undefined;
  const titleId = 'preview-title';

  return (
    <dialog ref={ref} className="pdialog" aria-labelledby={project ? titleId : undefined}>
      {project && (
        <div className="pdialog__panel pcard" data-accent={project.accent}>
          <button type="button" className="pdialog__close" onClick={() => ref.current?.close()}>
            Close preview
          </button>
          <div className="pcard__top">
            <ProjectMedia project={project} aspect={371 / 300} className="pdialog__media" eager />
            <span className="pbadge">
              <Glyph k={project.badgeIcon} />
              {project.category}
            </span>
          </div>
          <div className="pdialog__content">
            <h2 id={titleId} className="pdialog__title">
              {project.title}
            </h2>
            {partner && (
              <p className="pdialog__client">
                <span>Client</span>
                <img
                  src={asset(partner.logo).src}
                  width={asset(partner.logo).w}
                  height={asset(partner.logo).h}
                  alt={partner.name}
                />
              </p>
            )}
            <p className="pdialog__summary">{project.summary}</p>
            <ul className="pcard__tags" role="list" aria-label="Technologies">
              {project.tags.map((t) => (
                <li key={t} className="tag">
                  {t}
                </li>
              ))}
            </ul>
            <p className="pdialog__note">
              A full case study for this project isn't published yet. We're happy to walk you through the work on a call.
            </p>
            <div className="pdialog__actions">
              <ButtonLink to={`/contact?type=${project.inquiryType}`} variant="primary">
                Start a similar project
              </ButtonLink>
              <button type="button" className="btn btn--ghost" onClick={() => ref.current?.close()}>
                Back to all work
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
